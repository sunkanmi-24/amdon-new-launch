const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../services/supabase');
const {
  sendConfirmationEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../services/emailService');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ─── Helper: generate 6-digit OTP ───────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Helper: store code in DB ────────────────────────────────────
async function storeCode(email, code, type) {
  // Invalidate any existing unused codes for this email+type
  await supabaseAdmin
    .from('verification_codes')
    .update({ used: true })
    .eq('email', email.toLowerCase())
    .eq('type', type)
    .eq('used', false);

  // Insert new code (expires in 10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from('verification_codes').insert({
    email: email.toLowerCase(),
    code,
    type,
    expires_at: expiresAt,
    used: false,
  });

  if (error) throw new Error(`Failed to store code: ${error.message}`);
}

// ─── Helper: verify code from DB ────────────────────────────────
async function verifyCode(email, code, type) {
  const { data, error } = await supabaseAdmin
    .from('verification_codes')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('code', code)
    .eq('type', type)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { valid: false };
  }

  return { valid: true, record: data };
}

// ─── Helper: mark code as used ───────────────────────────────────
async function markCodeUsed(id) {
  await supabaseAdmin
    .from('verification_codes')
    .update({ used: true })
    .eq('id', id);
}

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/register-user
// Create Supabase Auth account + send verification email
// ═══════════════════════════════════════════════════════════════
// POST /api/auth/register-user
// ═══════════════════════════════════════════════════════════════
router.post(
  '/register-user',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('memberId').notEmpty().withMessage('Member ID is required'),
    body('fullName').notEmpty().withMessage('Full name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, memberId, fullName } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    try {
      let authUserId = null;

      // ── Step 1: Try creating a fresh Supabase Auth user ───────
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
        });

      if (!authError) {
        // Fresh user — happy path
        authUserId = authData.user.id;

      } else {
        // ── Auth user already exists from a previous attempt ───
        const msg = authError.message.toLowerCase();
        const isAlreadyExists =
          msg.includes('already registered') ||
          msg.includes('already been registered') ||
          msg.includes('user already exists');

        if (!isAlreadyExists) {
          // Genuinely unexpected error
          throw authError;
        }

        // ── Look up the existing auth_user_id from our own DB ──
        // Strategy: find any OTHER member record that is already
        // linked to this email via member_contact, and get their
        // auth_user_id from the members table.

        const { data: contactRows } = await supabaseAdmin
          .from('member_contact')
          .select('member_id')
          .eq('email', cleanEmail);

        if (contactRows && contactRows.length > 0) {
          // Try each contact row until we find one with an auth_user_id
          for (const row of contactRows) {
            const { data: memberRow } = await supabaseAdmin
              .from('members')
              .select('auth_user_id')
              .eq('member_id', row.member_id)
              .maybeSingle();

            if (memberRow?.auth_user_id) {
              authUserId = memberRow.auth_user_id;
              break;
            }
          }
        }

        if (!authUserId) {
          // Last resort — sign in with a dummy attempt just to
          // trigger Supabase to return the user object on next call.
          // We sign in using supabase directly to extract the uid.
          const { data: signInData } =
            await supabaseAdmin.auth.signInWithPassword({
              email: cleanEmail,
              password: 'PROBE_WILL_FAIL_intentionally',
            });

          // signInData will be null but we handle below
          // If none of the above worked, we truly cannot resolve it
          if (!authUserId) {
            return res.status(409).json({
              error:
                'This email is already registered. Please go to login or use forgot password to recover your account.',
            });
          }
        }

        // ── Update the existing user's password ────────────────
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            password,
          });

        if (updateError) throw updateError;
      }

      // ── Step 2: Link auth_user_id to THIS member record ───────
      const { error: linkError } = await supabaseAdmin
        .from('members')
        .update({ auth_user_id: authUserId, email_verified: false })
        .eq('member_id', memberId);

      if (linkError) throw linkError;

      // ── Step 3: Generate + store OTP ──────────────────────────
      const code = generateOTP();
      await storeCode(cleanEmail, code, 'email_verification');

      // ── Step 4: Send verification email (non-blocking) ────────
      sendVerificationEmail({ to: cleanEmail, fullName, code }).catch((err) =>
        console.error('Verification email failed (non-fatal):', err.message)
      );

      res.status(201).json({
        success: true,
        message: 'Account ready. Check your email for the verification code.',
        userId: authUserId,
      });
    } catch (err) {
      console.error('Register-user error:', err.message);
      res.status(500).json({
        error: 'Failed to create account. Please try again.',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);


// ═══════════════════════════════════════════════════════════════
// POST /api/auth/verify-email
// Verify the 6-digit OTP sent after registration
// ═══════════════════════════════════════════════════════════════
router.post(
  '/verify-email',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('Code must be 6 digits'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;

    try {
      const { valid, record } = await verifyCode(email, code, 'email_verification');

      if (!valid) {
        return res.status(400).json({
          error: 'Invalid or expired code. Please request a new one.',
        });
      }

      const {data:contactRecord, error:contactError} = await supabaseAdmin
      .from('member_contact')
      .select('member_id')
      .eq('email', email.toLowerCase().trim())
      .single()

      if (contactError || !contactRecord) {
        return res.status(404).json({error:'Account not found'});
      }

     const {error:updateError} = await supabaseAdmin
      .from('members')
      .update({ email_verified: true })
      .eq('member_id', contactRecord.member_id)

      if (updateError) throw updateError;


      res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
    } catch (err) {
      console.error('Verify email error:', err.message);
      res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/resend-verification
// Resend a new OTP for email verification
// ═══════════════════════════════════════════════════════════════
router.post(
  '/resend-verification',
  [body('email').isEmail(), body('fullName').notEmpty()],
  async (req, res) => {
    const { email, fullName } = req.body;

    try {
      const code = generateOTP();
      await storeCode(email, code, 'email_verification');

      await sendVerificationEmail({
        to: email.toLowerCase().trim(),
        fullName,
        code,
      });

      res.json({ success: true, message: 'A new verification code has been sent.' });
    } catch (err) {
      console.error('Resend verification error:', err.message);
      res.status(500).json({ error: 'Failed to resend code. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════════
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check if email is verified
      const { data: member } = await supabaseAdmin
        .from('members')
        .select('email_verified, member_id')
        .eq('auth_user_id', data.user.id)
        .single();

      if (member && !member.email_verified) {
        return res.status(403).json({
          error: 'Email not verified.',
          code: 'EMAIL_NOT_VERIFIED',
          email: email.toLowerCase().trim(),
        });
      }

      res.json({
        success: true,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: { id: data.user.id, email: data.user.email },
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// Send a password reset OTP
// ═══════════════════════════════════════════════════════════════
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

const safeRespone = {
  success: true,
  message: 'If an account with that email exists, a reset code has been sent.'
}
    try {
      // Check 
      // if the email exists in Supabase Auth
       //{ data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(
      const {data:contactRecord} = await supabaseAdmin
      .from('member_contact')
      .select('member_id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

      // Always return 200 — never reveal if email exists (security best practice)
    if (!contactRecord) {
      return res.json(safeRespone);
    }
      
      const code = generateOTP();
      await storeCode(email, code, 'password_reset');

      await sendPasswordResetEmail({
        to: email.toLowerCase().trim(),
        code,
      });

      res.json({
       safeRespone
      });
    } catch (err) {
      console.error('Forgot password error:', err.message);
      res.status(500).json({ error: 'Failed to process request. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// Verify OTP and set new password
// ═══════════════════════════════════════════════════════════════
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Invalid code'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code, newPassword } = req.body;

    try {
      // Verify the OTP
      const { valid, record } = await verifyCode(email, code, 'password_reset');

      if (!valid) {
        return res.status(400).json({
          error: 'Invalid or expired code. Please request a new one.',
        });
      }

      // Get the Supabase Auth user
       const {data:contactRecord, error:contactError} = await supabaseAdmin
      .from('member_contact')
      .select('member_id')
      .eq('email', email.toLowerCase().trim())
      .single()

      // Always return 200 — never reveal if email exists (security best practice)
    if (contactError || !contactRecord) {
      return res.status(404).json({error:'Account not found'});
    }
     const {data:memberRecord, error:memberError} = await supabaseAdmin
      .from('members')
      .select('auth_user_id')
      .eq('member_id', contactRecord.member_id)
      .single()

      // Always return 200 — never reveal if email exists (security best practice)
    if (memberError || !memberRecord?.auth_user_id) {
      return res.status(404).json({error:'Account not found'});
    }

      // Update password via Supabase Admin
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(memberRecord.auth_user_id, {
          password: newPassword,
        });

      if (updateError) throw updateError;

      // Mark code as used
      await markCodeUsed(record.id);

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.',
      });
    } catch (err) {
      console.error('Reset password error:', err.message);
      res.status(500).json({ error: 'Password reset failed. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/admin/create  (unchanged)
// ═══════════════════════════════════════════════════════════════
router.post('/admin/create', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { error } = await supabaseAdmin.from('admins').insert({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'admin',
    });

    if (error) {
      if (error.message.includes('unique')) {
        return res.status(409).json({ error: 'Admin already exists' });
      }
      throw error;
    }

    res.status(201).json({ success: true, message: 'Admin account created' });
  } catch (err) {
    console.error('Create admin error:', err.message);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

module.exports = router;