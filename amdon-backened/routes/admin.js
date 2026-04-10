router.get('/ping', (req, res) => {
  res.json({ message: "Admin API working ✅" });
});
module.exports = router;
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../services/supabase');
const { requireAdmin } = require('../middleware/adminmiddleware');
const { generateMemberId } = require('../services/idGenerator');

// All routes require admin auth
router.use(requireAdmin);

// =============================================
// GET /api/admin/dashboard
// Full dashboard stats: registrations by state/LGA,
// progressive report, last 10 registrations,
// registrations without payments
// =============================================
router.get('/dashboard', async (req, res) => {
  try {
    // 1. Total registrations
    const { count: totalCount } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true });

    // 2. Registrations by state
    const { data: byState } = await supabaseAdmin
      .from('member_location')
      .select('state')
      .order('state');

    const stateCounts = {};
    (byState || []).forEach(({ state }) => {
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });
    const registrationsByState = Object.entries(stateCounts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Registrations by LGA (top 20)
    const { data: byLga } = await supabaseAdmin
      .from('member_location')
      .select('lga, state');

    const lgaCounts = {};
    (byLga || []).forEach(({ lga, state }) => {
      const key = `${lga}|${state}`;
      lgaCounts[key] = (lgaCounts[key] || 0) + 1;
    });
    const registrationsByLGA = Object.entries(lgaCounts)
      .map(([key, count]) => {
        const [lga, state] = key.split('|');
        return { lga, state, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // 4. Progressive registrations over time (by month)
    const { data: memberDates } = await supabaseAdmin
      .from('members')
      .select('created_at')
      .order('created_at');

    const monthCounts = {};
    (memberDates || []).forEach(({ created_at }) => {
      const date = new Date(created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });

    let cumulative = 0;
    const progressiveReport = Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        cumulative += count;
        return { month, count, cumulative };
      });

    // 5. Last 10 registrations
    const { data: lastTen } = await supabaseAdmin
      .from('members')
      .select(`
        member_id,
        account_status,
        created_at,
        member_bio (first_name, last_name, photo_url),
        member_location (state, lga),
        member_contact (email, phone_primary)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // 6. Registrations without payments
    const { data: allMembers } = await supabaseAdmin
      .from('members')
      .select('member_id, created_at, account_status, member_bio(first_name, last_name), member_contact(email, phone_primary), member_location(state)');

    const { data: paidMembers } = await supabaseAdmin
      .from('registration_payments')
      .select('member_id')
      .eq('status', 'paid');

    const paidSet = new Set((paidMembers || []).map(p => p.member_id));
    const withoutPayments = (allMembers || [])
      .filter(m => !paidSet.has(m.member_id))
      .slice(0, 50);

    res.json({
      totalCount,
      registrationsByState,
      registrationsByLGA,
      progressiveReport,
      lastTen,
      withoutPayments,
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// =============================================
// GET /api/admin/members
// All members with pagination, search, filter
// =============================================
router.get('/members', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, state, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('members')
      .select(`
        member_id,
        account_status,
        created_at,
        member_bio (first_name, middle_name, last_name, gender, occupation, photo_url, date_of_birth),
        member_location (state, lga, full_address, dealership_name, dealership_category),
        member_contact (email, phone_primary, phone_secondary)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) query = query.eq('account_status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      members: data,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (err) {
    console.error('Members list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// =============================================
// GET /api/admin/members/:memberId
// Single member full profile
// =============================================
router.get('/members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select(`
        member_id,
        account_status,
        created_at,
        member_bio (*),
        member_location (*),
        member_contact (*)
      `)
      .eq('member_id', memberId.toUpperCase())
      .single();

    if (error || !member) return res.status(404).json({ error: 'Member not found' });
    res.json({ member });
  } catch (err) {
    console.error('Fetch member error:', err.message);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// =============================================
// PATCH /api/admin/members/:memberId
// Admin update any member fields
// =============================================
router.patch('/members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { bio, location, contact, accountStatus } = req.body;

    const updates = [];

    if (accountStatus) {
      updates.push(
        supabaseAdmin.from('members').update({ account_status: accountStatus }).eq('member_id', memberId)
      );
    }
    if (bio) {
      updates.push(
        supabaseAdmin.from('member_bio').update(bio).eq('member_id', memberId)
      );
    }
    if (location) {
      updates.push(
        supabaseAdmin.from('member_location').update(location).eq('member_id', memberId)
      );
    }
    if (contact) {
      updates.push(
        supabaseAdmin.from('member_contact').update(contact).eq('member_id', memberId)
      );
    }

    await Promise.all(updates);
    res.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    console.error('Update member error:', err.message);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// =============================================
// GET /api/admin/payments/registration
// Registration payments log & breakdown
// =============================================
router.get('/payments/registration', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('registration_payments')
      .select(`
        id,
        member_id,
        amount,
        status,
        payment_date,
        payment_method,
        reference,
        created_at,
        member_bio:member_id (first_name, last_name),
        member_contact:member_id (email, phone_primary)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    // Summary stats
    const { data: stats } = await supabaseAdmin
      .from('registration_payments')
      .select('amount, status');

    const totalPaid = (stats || []).filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalPending = (stats || []).filter(s => s.status === 'pending').length;
    const totalCount = (stats || []).length;

    res.json({
      payments: data,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
      summary: { totalPaid, totalPending, totalCount },
    });
  } catch (err) {
    console.error('Registration payments error:', err.message);
    res.status(500).json({ error: 'Failed to fetch registration payments' });
  }
});

// =============================================
// POST /api/admin/payments/registration
// Record a registration payment
// =============================================
router.post('/payments/registration', async (req, res) => {
  try {
    const { memberId, amount, status, paymentMethod, reference } = req.body;
    if (!memberId || !amount) {
      return res.status(400).json({ error: 'memberId and amount are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('registration_payments')
      .insert({
        member_id: memberId.toUpperCase(),
        amount: Number(amount),
        status: status || 'paid',
        payment_method: paymentMethod,
        reference,
        payment_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, payment: data });
  } catch (err) {
    console.error('Record payment error:', err.message);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// =============================================
// GET /api/admin/payments/yearly-dues
// Yearly dues with defaulters breakdown by state
// =============================================
router.get('/payments/yearly-dues', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const { data: allMembers } = await supabaseAdmin
      .from('members')
      .select(`
        member_id,
        account_status,
        created_at,
        member_bio (first_name, last_name),
        member_location (state, lga),
        member_contact (email, phone_primary)
      `);

    const { data: duesPaid } = await supabaseAdmin
      .from('yearly_dues')
      .select('member_id, year, amount, status, payment_date')
      .eq('year', Number(year));

    const paidSet = new Set((duesPaid || []).filter(d => d.status === 'paid').map(d => d.member_id));

    const defaulters = (allMembers || []).filter(m => !paidSet.has(m.member_id));

    // Breakdown by state
    const defaultersByState = {};
    defaulters.forEach(m => {
      const state = m.member_location?.state || 'Unknown';
      if (!defaultersByState[state]) defaultersByState[state] = [];
      defaultersByState[state].push(m);
    });

    const stateBreakdown = Object.entries(defaultersByState)
      .map(([state, members]) => ({ state, count: members.length, members }))
      .sort((a, b) => b.count - a.count);

    res.json({
      year: Number(year),
      totalMembers: (allMembers || []).length,
      totalPaid: paidSet.size,
      totalDefaulters: defaulters.length,
      stateBreakdown,
      allDues: duesPaid,
    });
  } catch (err) {
    console.error('Yearly dues error:', err.message);
    res.status(500).json({ error: 'Failed to fetch yearly dues' });
  }
});

// =============================================
// POST /api/admin/payments/yearly-dues
// Record yearly due payment
// =============================================
router.post('/payments/yearly-dues', async (req, res) => {
  try {
    const { memberId, year, amount, status, paymentMethod, reference } = req.body;
    if (!memberId || !year) {
      return res.status(400).json({ error: 'memberId and year are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('yearly_dues')
      .upsert({
        member_id: memberId.toUpperCase(),
        year: Number(year),
        amount: Number(amount) || 0,
        status: status || 'paid',
        payment_method: paymentMethod,
        reference,
        payment_date: new Date().toISOString(),
      }, { onConflict: 'member_id,year' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, due: data });
  } catch (err) {
    console.error('Record yearly due error:', err.message);
    res.status(500).json({ error: 'Failed to record yearly due' });
  }
});

// =============================================
// GET /api/admin/reports
// List all issue reports
// =============================================
router.get('/reports', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('member_reports')
      .select(`
        id,
        reporter_id,
        reported_member_id,
        issue_type,
        description,
        status,
        admin_notes,
        created_at,
        resolved_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      reports: data,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (err) {
    console.error('Reports list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// =============================================
// POST /api/admin/reports
// Create an issue report against a member
// =============================================
router.post('/reports', async (req, res) => {
  try {
    const { reportedMemberId, issueType, description, reporterId } = req.body;
    if (!reportedMemberId || !issueType || !description) {
      return res.status(400).json({ error: 'reportedMemberId, issueType, and description are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('member_reports')
      .insert({
        reported_member_id: reportedMemberId.toUpperCase(),
        reporter_id: reporterId || null,
        issue_type: issueType,
        description,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, report: data });
  } catch (err) {
    console.error('Create report error:', err.message);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// =============================================
// PATCH /api/admin/reports/:reportId
// Update report status / admin notes
// =============================================
router.patch('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    const updates = {};
    if (status) {
      updates.status = status;
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    }
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;

    const { data, error } = await supabaseAdmin
      .from('member_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, report: data });
  } catch (err) {
    console.error('Update report error:', err.message);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// =============================================
// GET /api/admin/roles
// List admin roles and permissions
// =============================================
router.get('/roles', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('id, email, role, permissions, created_at, last_login')
      .order('created_at');

    if (error) throw error;
    res.json({ admins: data });
  } catch (err) {
    console.error('Roles error:', err.message);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// =============================================
// POST /api/admin/roles
// Add a new admin with role and permissions
// =============================================
router.post('/roles', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { email, role, permissions, password } = req.body;
    if (!email || !role || !password) {
      return res.status(400).json({ error: 'email, role, and password are required' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabaseAdmin
      .from('admins')
      .insert({ email: email.toLowerCase(), role, permissions: permissions || [], password_hash })
      .select('id, email, role, permissions, created_at, last_login')
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, admin: data });
  } catch (err) {
    console.error('Add admin error:', err.message);
    res.status(500).json({ error: 'Failed to add admin' });
  }
});

// =============================================
// PATCH /api/admin/roles/:adminId
// Update admin permissions
// =============================================
router.patch('/roles/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { role, permissions } = req.body;

    const { data, error } = await supabaseAdmin
      .from('admins')
      .update({ role, permissions })
      .eq('id', adminId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, admin: data });
  } catch (err) {
    console.error('Update admin error:', err.message);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});

// =============================================
// API: POST /api/admin/api/members
// Add member via API key
// =============================================
router.post('/api/members', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.firstName || !payload.lastName || !payload.email || !payload.state || !payload.lga) {
      return res.status(400).json({ error: 'firstName, lastName, email, state, lga are required' });
    }

    const memberId = await generateMemberId(payload.state);

    await supabaseAdmin.from('members').insert({ member_id: memberId, account_status: 'active' });
    await supabaseAdmin.from('member_bio').insert({
      member_id: memberId,
      first_name: payload.firstName,
      middle_name: payload.middleName || null,
      last_name: payload.lastName,
      date_of_birth: payload.dateOfBirth || null,
      gender: payload.gender || null,
      nationality: payload.nationality || 'Nigerian',
      occupation: payload.occupation || null,
    });
    await supabaseAdmin.from('member_location').insert({
      member_id: memberId,
      state: payload.state,
      lga: payload.lga,
      full_address: payload.fullAddress || '',
      dealership_name: payload.dealershipName || null,
    });
    await supabaseAdmin.from('member_contact').insert({
      member_id: memberId,
      email: payload.email.toLowerCase(),
      phone_primary: payload.phonePrimary || '',
      phone_secondary: payload.phoneSecondary || null,
      nok_name: payload.nokName || null,
      nok_phone: payload.nokPhone || null,
    });

    res.status(201).json({ success: true, memberId });
  } catch (err) {
    console.error('API add member error:', err.message);
    res.status(500).json({ error: 'Failed to add member via API' });
  }
});

// =============================================
// GET /api/admin/api/members/search
// Search members by ID, phone, or email
// =============================================
router.get('/api/members/search', async (req, res) => {
  try {
    const { id, phone, email } = req.query;

    if (!id && !phone && !email) {
      return res.status(400).json({ error: 'Provide id, phone, or email' });
    }

    let memberId = null;

    if (id) {
      const { data } = await supabaseAdmin.from('members').select('member_id').eq('member_id', id.toUpperCase()).maybeSingle();
      if (data) memberId = data.member_id;
    } else if (phone) {
      const { data } = await supabaseAdmin.from('member_contact').select('member_id').or(`phone_primary.eq.${phone},phone_secondary.eq.${phone}`).maybeSingle();
      if (data) memberId = data.member_id;
    } else if (email) {
      const { data } = await supabaseAdmin.from('member_contact').select('member_id').eq('email', email.toLowerCase()).maybeSingle();
      if (data) memberId = data.member_id;
    }

    if (!memberId) return res.status(404).json({ found: false, message: 'Member not found' });

    const [memberRes, bioRes, locationRes, contactRes] = await Promise.all([
      supabaseAdmin.from('members').select('*').eq('member_id', memberId).single(),
      supabaseAdmin.from('member_bio').select('*').eq('member_id', memberId).single(),
      supabaseAdmin.from('member_location').select('*').eq('member_id', memberId).single(),
      supabaseAdmin.from('member_contact').select('*').eq('member_id', memberId).single(),
    ]);

    res.json({
      found: true,
      member: {
        memberId,
        accountStatus: memberRes.data?.account_status,
        registrationDate: memberRes.data?.created_at,
        bio: bioRes.data,
        location: locationRes.data,
        contact: contactRes.data,
      },
    });
  } catch (err) {
    console.error('Search member error:', err.message);
    res.status(500).json({ error: 'Failed to search member' });
  }
});

// =============================================
// PATCH /api/admin/api/members/update
// Update member by ID, phone, or email
// =============================================
router.patch('/api/members/update', async (req, res) => {
  try {
    const { id, phone, email, updates } = req.body;
    if (!id && !phone && !email) {
      return res.status(400).json({ error: 'Provide id, phone, or email to identify member' });
    }

    let memberId = null;

    if (id) {
      const { data } = await supabaseAdmin.from('members').select('member_id').eq('member_id', id.toUpperCase()).maybeSingle();
      if (data) memberId = data.member_id;
    } else if (phone) {
      const { data } = await supabaseAdmin.from('member_contact').select('member_id').or(`phone_primary.eq.${phone},phone_secondary.eq.${phone}`).maybeSingle();
      if (data) memberId = data.member_id;
    } else if (email) {
      const { data } = await supabaseAdmin.from('member_contact').select('member_id').eq('email', email.toLowerCase()).maybeSingle();
      if (data) memberId = data.member_id;
    }

    if (!memberId) return res.status(404).json({ found: false, message: 'Member not found' });

    const updateOps = [];
    if (updates.bio) updateOps.push(supabaseAdmin.from('member_bio').update(updates.bio).eq('member_id', memberId));
    if (updates.location) updateOps.push(supabaseAdmin.from('member_location').update(updates.location).eq('member_id', memberId));
    if (updates.contact) updateOps.push(supabaseAdmin.from('member_contact').update(updates.contact).eq('member_id', memberId));
    if (updates.accountStatus) updateOps.push(supabaseAdmin.from('members').update({ account_status: updates.accountStatus }).eq('member_id', memberId));

    await Promise.all(updateOps);
    res.json({ success: true, memberId });
  } catch (err) {
    console.error('API update member error:', err.message);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

