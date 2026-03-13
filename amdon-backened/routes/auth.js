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
  await supabaseAdmin
    .from('verification_codes')
    .update({ used: true })
    .eq('email', email.toLowerCase())
    .eq('type', type)
    .eq('used', false);

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

// ─── Helper: verify code ─────────────────────────────────────────
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

  if (error || !data) return { valid: false };
  return { valid: true, record: data };
}

// ─── Helper: mark code used ──────────────────────────────────────
async function markCodeUsed(id) {
  await supabaseAdmin
    .from('verification_codes')
    .update({ used: true })
    .eq('id', id);
}

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

      // ── Step 1: Check if this member already has an auth account
      const { data: existingMember, error: existingError } = await supabaseAdmin
        .from('members')
        .select('auth_user_id')
        .eq('member_id', memberId)
        .single();

      console.log('[register-user] Existing member lookup:', existingMember, existingError?.message);

      if (existingMember?.auth_user_id) {
        // Already linked — just update password
        authUserId = existingMember.auth_user_id;
        console.log('[register-user] Reusing existing auth_user_id:', authUserId);

        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
        if (updateError) throw new Error(`Password update failed: ${updateError.message}`);

      } else {
        // ── Step 2: Try to create fresh auth user ───────────────
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
          });

        if (!authError) {
          authUserId = authData.user.id;
          console.log('[register-user] Fresh auth user created:', authUserId);

        } else {
          const msg = authError.message.toLowerCase();
          const isAlreadyExists =
            msg.includes('already registered') ||
            msg.includes('already been registered') ||
            msg.includes('user already exists');

          if (!isAlreadyExists) throw authError;

          console.log('[register-user] Auth user already exists, searching DB...');

          // ── Search other member records linked to this email ──
          const { data: contactRows } = await supabaseAdmin
            .from('member_contact')
            .select('member_id')
            .eq('email', cleanEmail);

          if (contactRows && contactRows.length > 0) {
            for (const row of contactRows) {
              if (row.member_id === memberId) continue;

              const { data: linkedMember } = await supabaseAdmin
                .from('members')
                .select('auth_user_id')
                .eq('member_id', row.member_id)
                .maybeSingle();

              if (linkedMember?.auth_user_id) {
                authUserId = linkedMember.auth_user_id;
                console.log('[register-user] Found auth_user_id via linked member:', authUserId);
                break;
              }
            }
          }

          if (!authUserId) {
            // Auth user orphaned in Supabase — delete + recreate
            console.log('[register-user] Auth user orphaned, deleting and recreating...');

            const { data: listData } =
              await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

            const orphan = listData?.users?.find((u) => u.email === cleanEmail);

            if (orphan) {
              console.log('[register-user] Found orphan, deleting:', orphan.id);
              await supabaseAdmin.auth.admin.deleteUser(orphan.id);
            }

            const { data: freshData, error: freshError } =
              await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                password,
                email_confirm: true,
              });

            if (freshError) throw new Error(`Recreate failed: ${freshError.message}`);
            authUserId = freshData.user.id;
            console.log('[register-user] Recreated auth user:', authUserId);

          } else {
            // Update password for found existing user
            const { error: updateError } =
              await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
            if (updateError) throw new Error(`Password update failed: ${updateError.message}`);
          }
        }
      }

      // ── Step 3: Link auth_user_id to this member record ────────
      console.log('[register-user] Linking auth_user_id', authUserId, 'to member', memberId);

      const { data: updateData, error: linkError } = await supabaseAdmin
        .from('members')
        .update({ auth_user_id: authUserId, email_verified: false })
        .eq('member_id', memberId)
        .select(); // .select() confirms the row was actually updated

      if (linkError) throw new Error(`Link failed: ${linkError.message}`);

      if (!updateData || updateData.length === 0) {
        throw new Error(`Member record ${memberId} not found in DB — update affected 0 rows`);
      }

      console.log('[register-user] Link successful:', updateData);

      // ── Step 4: Store OTP ────────────────────────────────────────
      const code = generateOTP();
      await storeCode(cleanEmail, code, 'email_verification');
      console.log('[register-user] OTP stored for:', cleanEmail);

      // ── Step 5: Send verification email (AWAITED — not fire+forget)
      try {
        await sendVerificationEmail({ to: cleanEmail, fullName, code });
        console.log('[register-user] Verification email sent to:', cleanEmail);
      } catch (emailErr) {
        // Email failed but account is created — don't fail the whole request
        console.error('[register-user] Email send failed (non-fatal):', emailErr.message);
      }

      res.status(201).json({
        success: true,
        message: 'Account ready. Check your email for the verification code.',
        userId: authUserId,
      });

    } catch (err) {
      console.error('[register-user] Error:', err.message);
      res.status(500).json({
        error: 'Failed to create account. Please try again.',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/verify-email
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

      // Mark code used
      await markCodeUsed(record.id);

      // Find member via member_contact
      const { data: contactRecord, error: contactError } = await supabaseAdmin
        .from('member_contact')
        .select('member_id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (contactError || !contactRecord) {
        return res.status(404).json({ error: 'Member account not found.' });
      }

      // Mark email_verified = true
      const { error: updateError } = await supabaseAdmin
        .from('members')
        .update({ email_verified: true })
        .eq('member_id', contactRecord.member_id);

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
// ═══════════════════════════════════════════════════════════════
router.post(
  '/resend-verification',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('fullName').notEmpty().withMessage('Full name required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, fullName } = req.body;

    try {
      const code = generateOTP();
      await storeCode(email.toLowerCase().trim(), code, 'email_verification');
      await sendVerificationEmail({ to: email.toLowerCase().trim(), fullName, code });

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
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check email_verified flag
      const { data: member } = await supabaseAdmin
        .from('members')
        .select('email_verified, member_id')
        .eq('auth_user_id', data.user.id)
        .single();

      if (member && !member.email_verified) {
        // Sign out the session we just created — they shouldn't be logged in yet
        await supabaseAdmin.auth.admin.signOut(data.session.access_token).catch(() => {});

        return res.status(403).json({
          error: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: cleanEmail,
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
    const cleanEmail = email.toLowerCase().trim();

    const safeResponse = {
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
    };

    try {
      const { data: contactRecord } = await supabaseAdmin
        .from('member_contact')
        .select('member_id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!contactRecord) {
        return res.json(safeResponse);
      }

      const code = generateOTP();
      await storeCode(cleanEmail, code, 'password_reset');
      await sendPasswordResetEmail({ to: cleanEmail, code });

      res.json(safeResponse);
    } catch (err) {
      console.error('Forgot password error:', err.message);
      res.status(500).json({ error: 'Failed to process request. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════════
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Invalid code'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code, newPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { valid, record } = await verifyCode(cleanEmail, code, 'password_reset');

      if (!valid) {
        return res.status(400).json({
          error: 'Invalid or expired code. Please request a new one.',
        });
      }

      const { data: contactRecord, error: contactError } = await supabaseAdmin
        .from('member_contact')
        .select('member_id')
        .eq('email', cleanEmail)
        .single();

      if (contactError || !contactRecord) {
        return res.status(404).json({ error: 'Account not found.' });
      }

      const { data: memberRecord, error: memberError } = await supabaseAdmin
        .from('members')
        .select('auth_user_id')
        .eq('member_id', contactRecord.member_id)
        .single();

      if (memberError || !memberRecord?.auth_user_id) {
        return res.status(404).json({ error: 'Auth account not found.' });
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        memberRecord.auth_user_id,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      await markCodeUsed(record.id);

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in.',
      });
    } catch (err) {
      console.error('Reset password error:', err.message);
      res.status(500).json({ error: 'Password reset failed. Please try again.' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/admin/create
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