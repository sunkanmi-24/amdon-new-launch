const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../services/supabase');
const { requireAuth } = require('../middleware/authmiddleware');

// All routes in this file require authentication

// =============================================
// GET /api/members/me
// Get the logged-in member's full dashboard profile
// =============================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    const authUserId = req.user.id;

    // Find the member record linked to this auth user
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const memberId = member.member_id;

    // Fetch all related data in parallel
    const [bioResult, locationResult, contactResult] = await Promise.all([
      supabaseAdmin.from('member_bio').select('*').eq('member_id', memberId).single(),
      supabaseAdmin.from('member_location').select('*').eq('member_id', memberId).single(),
      supabaseAdmin.from('member_contact').select('*').eq('member_id', memberId).single(),
    ]);

    if (bioResult.error) throw bioResult.error;
    if (locationResult.error) throw locationResult.error;
    if (contactResult.error) throw contactResult.error;

    res.json({
      member: {
        memberId: member.member_id,
        accountStatus: member.account_status,
        registrationDate: member.created_at,
        bio: bioResult.data,
        location: locationResult.data,
        contact: contactResult.data,
      },
    });
  } catch (err) {
    console.error('Get member profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// =============================================
// PATCH /api/members/me/contact
// Member self-service: update contact info only
// (Phone numbers, email, address, dealership description, photo)
// =============================================
const contactUpdateValidation = [
  body('phonePrimary').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
];

router.patch('/me/contact', requireAuth, contactUpdateValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const authUserId = req.user.id;

    // Get member record
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('member_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const {
      phonePrimary,
      phoneSecondary,
      email,
      nokName,
      nokPhone,
      referralSource,
    } = req.body;

    // Build update object with only provided fields
    const contactUpdates = {};
    if (phonePrimary !== undefined) contactUpdates.phone_primary = phonePrimary.trim();
    if (phoneSecondary !== undefined) contactUpdates.phone_secondary = phoneSecondary.trim();
    if (email !== undefined) contactUpdates.email = email.toLowerCase().trim();
    if (nokName !== undefined) contactUpdates.nok_name = nokName.trim();
    if (nokPhone !== undefined) contactUpdates.nok_phone = nokPhone.trim();
    if (referralSource !== undefined) contactUpdates.referral_source = referralSource;

    if (Object.keys(contactUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('member_contact')
      .update(contactUpdates)
      .eq('member_id', member.member_id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Contact info updated successfully' });
  } catch (err) {
    console.error('Update contact error:', err.message);
    res.status(500).json({ error: 'Failed to update contact info' });
  }
});

// =============================================
// PATCH /api/members/me/address
// Member self-service: update full address and dealership description
// =============================================
router.patch('/me/address', requireAuth, async (req, res) => {
  try {
    const authUserId = req.user.id;

    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('member_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { fullAddress, businessDescription } = req.body;

    const locationUpdates = {};
    if (fullAddress !== undefined) locationUpdates.full_address = fullAddress.trim();
    if (businessDescription !== undefined) locationUpdates.business_description = businessDescription.trim();

    if (Object.keys(locationUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('member_location')
      .update(locationUpdates)
      .eq('member_id', member.member_id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Address updated successfully' });
  } catch (err) {
    console.error('Update address error:', err.message);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// =============================================
// PATCH /api/members/me/photo
// Member self-service: update profile photo URL
// =============================================
router.patch('/me/photo', requireAuth, async (req, res) => {
  try {
    const authUserId = req.user.id;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'photoUrl is required' });
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('member_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('member_bio')
      .update({ photo_url: photoUrl })
      .eq('member_id', member.member_id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Profile photo updated' });
  } catch (err) {
    console.error('Update photo error:', err.message);
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

module.exports = router;