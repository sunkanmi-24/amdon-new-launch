const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../services/supabase');
const {
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
  const cleanEmail = email.toLowerCase().trim();

  // Invalidate any existing unused codes for this email+type
  const { error: invalidateError } = await supabaseAdmin
    .from('verification_codes')
    .update({ used: true })
    .eq('email', cleanEmail)
    .eq('type', type)
    .eq('used', false);

  if (invalidateError) {
    console.error('[storeCode] Invalidate error:', invalidateError.message);
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const record = { email: cleanEmail, code, type, expires_at: expiresAt, used: false };

  console.log('[storeCode] Inserting:', { email: cleanEmail, type, expires_at: expiresAt });

  const { data: inserted, error } = await supabaseAdmin
    .from('verification_codes')
    .insert(record)
    .select();

  if (error) {
    console.error('[storeCode] INSERT failed:', error.message);
    throw new Error(`Failed to store verification code: ${error.message}`);
  }

  console.log('[storeCode] Inserted successfully. ID:', inserted?.[0]?.id);
}

// ─── Helper: verify code ─────────────────────────────────────────
async function verifyCode(email, code, type) {
  const cleanEmail = email.toLowerCase().trim();
  console.log('[verifyCode] Checking:', { email: cleanEmail, code, type });
  console.log('[verifyCode] Current time:', new Date().toISOString());

  // Diagnostic: show all codes for this email+type regardless of filters
  const { data: allCodes } = await supabaseAdmin
    .from('verification_codes')
    .select('id, code, used, expires_at, created_at')
    .eq('email', cleanEmail)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('[verifyCode] All stored codes:', JSON.stringify(allCodes));

  // Real filtered query
  const { data, error } = await supabaseAdmin
    .from('verification_codes')
    .select('*')
    .eq('email', cleanEmail)
    .eq('code', code)
    .eq('type', type)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // never throws on 0 rows

  console.log('[verifyCode] Match result:', data ? 'FOUND' : 'NOT FOUND', error?.message || '');

  if (error || !data) return { valid: false };
  return { valid: true, record: data };
}

// ─── Helper: mark code used ──────────────────────────────────────
async function markCodeUsed(id) {
  const { error } = await supabaseAdmin
    .from('verification_codes')
    .update({ used: true })
    .eq('id', id);

  if (error) {
    console.error('[markCodeUsed] Failed:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/register-user
// ═══════════════════════════════════════════════════════════════
router.post(
  '/register-user',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
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
      // BUG FIX: was .select('member_id', 'auth_user_id') — two args, second ignored
      const { data: existingMember, error: existingError } = await supabaseAdmin
        .from('members')
        .select('member_id, auth_user_id') // ← single comma-separated string
        .eq('member_id', memberId)
        .maybeSingle();

      console.log('[register-user] Member lookup:', JSON.stringify(existingMember), existingError?.message);

      if (existingMember?.auth_user_id) {
        // Member already has an auth account — just update the password
        authUserId = existingMember.auth_user_id;
        console.log('[register-user] Reusing existing auth_user_id:', authUserId);

        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });

        if (updateError) throw new Error(`Password update failed: ${updateError.message}`);

      } else {
        // ── Step 2: Try to create a fresh Supabase Auth user ────
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

          console.log('[register-user] Supabase Auth user already exists for this email');

          // Search other member records linked to this same email
          const { data: contactRows } = await supabaseAdmin
            .from('member_contact')
            .select('member_id')
            .eq('email', cleanEmail);

          console.log('[register-user] Contact rows for email:', JSON.stringify(contactRows));

          if (contactRows && contactRows.length > 0) {
            for (const row of contactRows) {
              if (row.member_id === memberId) continue; // skip current member

              const { data: linkedMember } = await supabaseAdmin
                .from('members')
                .select('auth_user_id')
                .eq('member_id', row.member_id)
                .maybeSingle();

              if (linkedMember?.auth_user_id) {
                authUserId = linkedMember.auth_user_id;
                console.log('[register-user] Found auth_user_id from linked member:', authUserId);
                break;
              }
            }
          }

          if (!authUserId) {
            // Auth user exists in Supabase but is completely orphaned in our DB
            // Delete and recreate cleanly
            console.log('[register-user] Orphaned auth user — deleting and recreating');

            const { data: listData } =
              await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

            const orphan = listData?.users?.find((u) => u.email === cleanEmail);

            if (orphan) {
              console.log('[register-user] Deleting orphan auth user:', orphan.id);
              await supabaseAdmin.auth.admin.deleteUser(orphan.id);
            }

            const { data: freshData, error: freshError } =
              await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                password,
                email_confirm: true,
              });

            if (freshError) throw new Error(`Recreate auth user failed: ${freshError.message}`);
            authUserId = freshData.user.id;
            console.log('[register-user] Recreated auth user:', authUserId);

          } else {
            // Found existing linked auth user — update their password
            const { error: updateError } =
              await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });

            if (updateError) throw new Error(`Password update failed: ${updateError.message}`);
            console.log('[register-user] Updated password for existing auth user:', authUserId);
          }
        }
      }

      // ── Step 3: Link auth_user_id to this member record ────────
      console.log('[register-user] Linking', authUserId, '→ member', memberId);

      const { data: updateResult, error: linkError } = await supabaseAdmin
        .from('members')
        .update({ auth_user_id: authUserId, email_verified: false })
        .eq('member_id', memberId)
        .select('member_id, auth_user_id, email_verified');

      if (linkError) {
        throw new Error(`Link auth_user_id failed: ${linkError.message}`);
      }

      if (!updateResult || updateResult.length === 0) {
        throw new Error(`UPDATE affected 0 rows for member_id: ${memberId}`);
      }

      console.log('[register-user] Link result:', JSON.stringify(updateResult));

      // ── Step 4: Generate + store OTP ────────────────────────────
      const code = generateOTP();
      await storeCode(cleanEmail, code, 'email_verification');

      // ── Step 5: Send verification email (fully awaited) ─────────
      try {
        await sendVerificationEmail({ to: cleanEmail, fullName, code });
        console.log('[register-user] Verification email sent to:', cleanEmail);
      } catch (emailErr) {
        console.error('[register-user] Email failed (non-fatal):', emailErr.message);
        // Account is set up — don't fail the request over email
      }

      res.status(201).json({
        success: true,
        message: 'Account ready. Check your email for the verification code.',
        userId: authUserId,
      });

    } catch (err) {
      console.error('[register-user] Fatal error:', err.message);
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
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { valid, record } = await verifyCode(cleanEmail, code, 'email_verification');

      if (!valid) {
        return res.status(400).json({
          error: 'Invalid or expired code. Please request a new one.',
        });
      }

      // Mark code as used first
      await markCodeUsed(record.id);

      // Find member_id via member_contact
      // BUG FIX: was .single() which throws if 0 rows — use .maybeSingle()
      const { data: contactRecord, error: contactError } = await supabaseAdmin
        .from('member_contact')
        .select('member_id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (contactError || !contactRecord) {
        console.error('[verify-email] Contact record not found for:', cleanEmail, contactError?.message);
        return res.status(404).json({ error: 'Member account not found.' });
      }

      // Mark email as verified
      const { error: updateError } = await supabaseAdmin
        .from('members')
        .update({ email_verified: true })
        .eq('member_id', contactRecord.member_id);

      if (updateError) {
        console.error('[verify-email] Update email_verified failed:', updateError.message);
        throw updateError;
      }

      console.log('[verify-email] Email verified for member:', contactRecord.member_id);

      res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });

    } catch (err) {
      console.error('[verify-email] Error:', err.message);
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
    const cleanEmail = email.toLowerCase().trim();

    try {
      const code = generateOTP();
      await storeCode(cleanEmail, code, 'email_verification');
      await sendVerificationEmail({ to: cleanEmail, fullName, code });

      console.log('[resend-verification] Code resent to:', cleanEmail);
      res.json({ success: true, message: 'A new verification code has been sent.' });

    } catch (err) {
      console.error('[resend-verification] Error:', err.message);
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
        console.error('[login] Supabase sign-in error:', error.message);
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check email_verified flag in our members table
      const { data: member, error: memberError } = await supabaseAdmin
        .from('members')
        .select('email_verified, member_id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      console.log('[login] Member lookup:', JSON.stringify(member), memberError?.message);

      if (member && !member.email_verified) {
        // BUG FIX: supabaseAdmin.auth.admin.signOut does not exist in v2
        // Just return 403 — no need to explicitly sign out
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
      console.error('[login] Error:', err.message);
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

    // Always return this — never reveal whether email exists
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
        console.log('[forgot-password] Email not found (safe response):', cleanEmail);
        return res.json(safeResponse);
      }

      const code = generateOTP();
      await storeCode(cleanEmail, code, 'password_reset');
      await sendPasswordResetEmail({ to: cleanEmail, code });

      console.log('[forgot-password] Reset code sent to:', cleanEmail);
      res.json(safeResponse);

    } catch (err) {
      console.error('[forgot-password] Error:', err.message);
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
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('Invalid code'),
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
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { valid, record } = await verifyCode(cleanEmail, code, 'password_reset');

      if (!valid) {
        return res.status(400).json({
          error: 'Invalid or expired code. Please request a new one.',
        });
      }

      // Get member_id from contact table
      const { data: contactRecord, error: contactError } = await supabaseAdmin
        .from('member_contact')
        .select('member_id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (contactError || !contactRecord) {
        return res.status(404).json({ error: 'Account not found.' });
      }

      // Get auth_user_id from members table
      const { data: memberRecord, error: memberError } = await supabaseAdmin
        .from('members')
        .select('auth_user_id')
        .eq('member_id', contactRecord.member_id)
        .maybeSingle();

      if (memberError || !memberRecord?.auth_user_id) {
        console.error('[reset-password] auth_user_id not found for member:', contactRecord.member_id);
        return res.status(404).json({ error: 'Auth account not found.' });
      }

      // Update password via Supabase Admin
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        memberRecord.auth_user_id,
        { password: newPassword }
      );

      if (updateError) throw new Error(`Supabase password update failed: ${updateError.message}`);

      // Mark code as used
      await markCodeUsed(record.id);

      console.log('[reset-password] Password reset for:', cleanEmail);

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in.',
      });

    } catch (err) {
      console.error('[reset-password] Error:', err.message);
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
    console.error('[admin/create] Error:', err.message);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

module.exports = router;