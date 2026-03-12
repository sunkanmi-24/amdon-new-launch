const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../services/supabase');
const { generateMemberId } = require('../services/idGenerator');
const { sendConfirmationEmail } = require('../services/emailService');
const { NIGERIAN_STATES, getStateByName } = require('../constants/states');

// =============================================
// GET /api/registration/states
// Returns all states for dropdown
// =============================================
router.get('/states', (req, res) => {
  const states = NIGERIAN_STATES.map(({ name, code }) => ({ name, code }));
  res.json({ states });
});

// =============================================
// GET /api/registration/lgas/:stateName
// Returns LGAs for a given state
// =============================================
router.get('/lgas/:stateName', (req, res) => {
  const state = getStateByName(decodeURIComponent(req.params.stateName));

  if (!state) {
    return res.status(404).json({ error: 'State not found' });
  }

  res.json({ lgas: state.lgas });
});

// =============================================
// GET /api/registration/categories
// Returns active dealership categories
// =============================================
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('dealership_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    res.json({ categories: data });
  } catch (err) {
    console.error('Fetch categories error:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// =============================================
// POST /api/registration/submit
// Full 3-step form submission
// Creates member, generates ID, sends email
// =============================================
const registrationValidation = [
  // Step 1 — Bio
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isDate().withMessage('Valid date of birth is required'),
  body('gender')
    .isIn(['Male', 'Female', 'Prefer not to say'])
    .withMessage('Invalid gender value'),
  body('nationality').trim().notEmpty().withMessage('Nationality is required'),
  body('occupation').trim().notEmpty().withMessage('Occupation is required'),

  // Step 2 — Location
  body('state').trim().notEmpty().withMessage('State is required'),
  body('lga').trim().notEmpty().withMessage('LGA is required'),
  body('fullAddress').trim().notEmpty().withMessage('Address is required'),

  // Step 3 — Contact
  body('phonePrimary')
    .trim()
    .notEmpty()
    .withMessage('Primary phone is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('nokName').trim().notEmpty().withMessage('Next of kin name is required'),
  body('nokPhone')
    .trim()
    .notEmpty()
    .withMessage('Next of kin phone is required'),
];

router.post('/submit', registrationValidation, async (req, res) => {
  // Validate inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    // Step 1
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    gender,
    nationality,
    occupation,
    photoUrl,
    // Step 2
    state,
    lga,
    fullAddress,
    dealershipName,
    dealershipCategory,
    yearsInOperation,
    businessDescription,
    // Step 3
    phonePrimary,
    phoneSecondary,
    email,
    nokName,
    nokPhone,
    referralSource,
    // Supabase auth user id (if using Supabase auth login post-registration)
    authUserId,
  } = req.body;

  try {
    // 1. Check if email already registered
    const { data: existingContact } = await supabaseAdmin
      .from('member_contact')
      .select('member_id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingContact) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
      });
    }

    // 2. Generate unique Member ID
    const memberId = await generateMemberId(state);

    // 3. Get state code
    const stateInfo = getStateByName(state);

    // 4. Insert into members (primary)
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        member_id: memberId,
        auth_user_id: authUserId || null,
        registration_complete: true,
        account_status: 'active',
      });

    if (memberError) throw memberError;

    // 5. Insert Step 1 — Bio
    const { error: bioError } = await supabaseAdmin
      .from('member_bio')
      .insert({
        member_id: memberId,
        first_name: firstName.trim(),
        middle_name: middleName?.trim() || null,
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth,
        gender,
        nationality: nationality.trim(),
        occupation: occupation.trim(),
        photo_url: photoUrl || null,
      });

    if (bioError) throw bioError;

    // 6. Insert Step 2 — Location
    const { error: locationError } = await supabaseAdmin
      .from('member_location')
      .insert({
        member_id: memberId,
        state: state.trim(),
        state_code: stateInfo.code,
        lga: lga.trim(),
        full_address: fullAddress.trim(),
        dealership_name: dealershipName?.trim() || null,
        dealership_category: dealershipCategory || null,
        years_in_operation: yearsInOperation ? parseInt(yearsInOperation, 10) : null,
        business_description: businessDescription?.trim() || null,
      });

    if (locationError) throw locationError;

    // 7. Insert Step 3 — Contact
    const { error: contactError } = await supabaseAdmin
      .from('member_contact')
      .insert({
        member_id: memberId,
        phone_primary: phonePrimary.trim(),
        phone_secondary: phoneSecondary?.trim() || null,
        email: email.toLowerCase().trim(),
        nok_name: nokName.trim(),
        nok_phone: nokPhone.trim(),
        referral_source: referralSource || null,
      });

    if (contactError) throw contactError;

    // 8. Send confirmation email (non-blocking — don't fail registration if email fails)
    const fullName = `${firstName} ${lastName}`;
    sendConfirmationEmail({
      to: email.toLowerCase().trim(),
      fullName,
      memberId,
    }).catch((emailErr) => {
      console.error('Email send error (non-fatal):', emailErr.message);
    });

    // 9. Respond with success
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      memberId,
      fullName,
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({
      error: 'Registration failed. Please try again.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// =============================================
// POST /api/registration/upload-photo
// Upload profile photo to Supabase Storage
// Returns the public URL
// =============================================
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileExt = req.file.mimetype.split('/')[1];
    const fileName = `profile-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { data, error } = await supabaseAdmin.storage
      .from('amdon-uploads')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('amdon-uploads')
      .getPublicUrl(fileName);

    res.json({ photoUrl: publicUrl });
  } catch (err) {
    console.error('Photo upload error:', err.message);
    res.status(500).json({ error: 'Photo upload failed' });
  }
});

module.exports = router;