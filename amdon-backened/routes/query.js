const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../services/supabase');
const { requireAdmin } = require('../middleware/adminmiddleware');

// =============================================
// Helper: Build full member profile from member_id
// =============================================
async function getMemberProfile(memberId) {
  const [memberResult, bioResult, locationResult, contactResult] = await Promise.all([
    supabaseAdmin.from('members').select('*').eq('member_id', memberId).single(),
    supabaseAdmin.from('member_bio').select('*').eq('member_id', memberId).single(),
    supabaseAdmin.from('member_location').select('*').eq('member_id', memberId).single(),
    supabaseAdmin.from('member_contact').select('*').eq('member_id', memberId).single(),
  ]);

  if (memberResult.error || !memberResult.data) return null;

  return {
    memberId: memberResult.data.member_id,
    accountStatus: memberResult.data.account_status,
    registrationDate: memberResult.data.created_at,
    bio: bioResult.data || null,
    location: locationResult.data || null,
    contact: contactResult.data || null,
  };
}

// =============================================
// GET /api/query/member?id=AMDON-FC-2026-0001
// OR /api/query/member?name=John+Doe
// Public search — returns profile card
// =============================================
router.get('/member', async (req, res) => {
  try {
    const { id, name } = req.query;

    if (!id && !name) {
      return res.status(400).json({
        error: 'Provide either "id" (Member ID) or "name" (Full Name) as query param',
      });
    }

    let memberId = null;

    if (id) {
      // Search by member ID directly
      const { data: member } = await supabaseAdmin
        .from('members')
        .select('member_id')
        .eq('member_id', id.toUpperCase().trim())
        .maybeSingle();

      if (member) memberId = member.member_id;
    } else if (name) {
      // Search by full name — match first + last name in member_bio
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts[nameParts.length - 1] || '';

      const { data: bios } = await supabaseAdmin
        .from('member_bio')
        .select('member_id, first_name, last_name')
        .ilike('first_name', `%${firstName}%`)
        .ilike('last_name', `%${lastName}%`)
        .limit(5);

      if (bios && bios.length > 0) {
        // Return first match (could return multiple in a real scenario)
        memberId = bios[0].member_id;
      }
    }

    if (!memberId) {
      return res.status(404).json({
        found: false,
        message: 'No member found with the provided information.',
      });
    }

    const profile = await getMemberProfile(memberId);

    if (!profile) {
      return res.status(404).json({ found: false, message: 'Member profile not found.' });
    }

    res.json({ found: true, profile });
  } catch (err) {
    console.error('Query member error:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// =============================================
// PATCH /api/query/admin/update/:memberId
// ADMIN ONLY — Update contact, address, and dealership info
// =============================================
const adminUpdateValidation = [
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phonePrimary').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
];

router.patch(
  '/admin/update/:memberId',
  requireAdmin,
  adminUpdateValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { memberId } = req.params;

    try {
      // Confirm the member exists
      const { data: member } = await supabaseAdmin
        .from('members')
        .select('member_id')
        .eq('member_id', memberId.toUpperCase().trim())
        .maybeSingle();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const {
        // Contact fields
        phonePrimary,
        phoneSecondary,
        email,
        nokName,
        nokPhone,
        // Location fields
        state,
        lga,
        fullAddress,
        // Dealership fields
        dealershipName,
        dealershipCategory,
        businessDescription,
      } = req.body;

      const updates = [];

      // Contact updates
      const contactUpdates = {};
      if (phonePrimary !== undefined) contactUpdates.phone_primary = phonePrimary.trim();
      if (phoneSecondary !== undefined) contactUpdates.phone_secondary = phoneSecondary.trim();
      if (email !== undefined) contactUpdates.email = email.toLowerCase().trim();
      if (nokName !== undefined) contactUpdates.nok_name = nokName.trim();
      if (nokPhone !== undefined) contactUpdates.nok_phone = nokPhone.trim();

      if (Object.keys(contactUpdates).length > 0) {
        updates.push(
          supabaseAdmin
            .from('member_contact')
            .update(contactUpdates)
            .eq('member_id', member.member_id)
        );
      }

      // Location updates
      const locationUpdates = {};
      if (state !== undefined) locationUpdates.state = state.trim();
      if (lga !== undefined) locationUpdates.lga = lga.trim();
      if (fullAddress !== undefined) locationUpdates.full_address = fullAddress.trim();
      if (dealershipName !== undefined) locationUpdates.dealership_name = dealershipName.trim();
      if (dealershipCategory !== undefined) locationUpdates.dealership_category = dealershipCategory;
      if (businessDescription !== undefined) locationUpdates.business_description = businessDescription.trim();

      if (Object.keys(locationUpdates).length > 0) {
        updates.push(
          supabaseAdmin
            .from('member_location')
            .update(locationUpdates)
            .eq('member_id', member.member_id)
        );
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      // Run all updates concurrently
      const results = await Promise.all(updates);

      for (const result of results) {
        if (result.error) throw result.error;
      }

      // Return updated profile
      const updatedProfile = await getMemberProfile(member.member_id);

      res.json({
        success: true,
        message: `Member ${member.member_id} updated successfully`,
        profile: updatedProfile,
      });
    } catch (err) {
      console.error('Admin update error:', err.message);
      res.status(500).json({ error: 'Update failed' });
    }
  }
);

// =============================================
// GET /api/query/admin/all
// ADMIN ONLY — List all members (paginated)
// =============================================
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { data: members, count, error } = await supabaseAdmin
      .from('members')
      .select('member_id, account_status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      members,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('List members error:', err.message);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

module.exports = router;