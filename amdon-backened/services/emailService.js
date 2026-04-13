require('dotenv').config();
const nodemailer = require('nodemailer');


// ─── Environment Variable Validation ───────────────────────────
const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ CRITICAL: Missing required email environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('   Email service will fail until these are set!');
}

// Log current config (mask sensitive data)
console.log('📧 Email Configuration:');
console.log(`   Host: ${process.env.EMAIL_HOST || 'NOT SET'}`);
console.log(`   Port: ${process.env.EMAIL_PORT || '587 (default)'}`);
console.log(`   User: ${process.env.EMAIL_USER ? '***' + process.env.EMAIL_USER.slice(-10) : 'NOT SET'}`);
console.log(`   From: ${process.env.EMAIL_FROM || 'NOT SET'}`);
console.log(`   Secure: ${process.env.EMAIL_PORT === '465' ? 'Yes (SSL)' : 'No (STARTTLS)'}`);

// ─── Transporter with enhanced error handling ────────────────────
let transporter;
try {
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    tls: {
      rejectUnauthorized: false,
      // Add debugging for TLS issues
      minVersion: 'TLSv1.2',
    },
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.EMAIL_DEBUG === 'true', // Set EMAIL_DEBUG=true for verbose logs
  });

  // Verify immediately with detailed logging
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Email transporter verification FAILED:', err.message);
      console.error('   Error code:', err.code);
      console.error('   Command:', err.command);
      if (err.response) console.error('   SMTP response:', err.response);
      console.error('   Check your EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env');
    } else {
      console.log('✅ Email transporter verified and ready');
    }
  });

} catch (setupError) {
  console.error('❌ Failed to create email transporter:', setupError.message);
}

// ─── Enhanced email sender with error tracking ───────────────────
async function sendEmailWithLogging(mailOptions) {
  const startTime = Date.now();
  const messageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`📤 [${messageId}] Attempting to send email:`);
  console.log(`   To: ${mailOptions.to}`);
  console.log(`   Subject: ${mailOptions.subject}`);
  console.log(`   From: ${mailOptions.from}`);

  try {
    // Check if transporter is ready
    if (!transporter) {
      throw new Error('Email transporter not initialized - check env vars');
    }

    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;
    
    console.log(`✅ [${messageId}] Email sent successfully in ${duration}ms`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Accepted by: ${info.accepted?.join(', ') || 'N/A'}`);
    console.log(`   Rejected: ${info.rejected?.join(', ') || 'None'}`);
    
    return { success: true, messageId: info.messageId, info };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${messageId}] Email failed after ${duration}ms`);
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code || 'N/A'}`);
    console.error(`   Command: ${err.command || 'N/A'}`);
    
    if (err.response) {
      console.error(`   SMTP Response: ${err.response}`);
    }
    
    // Common error diagnostics
    if (err.code === 'ECONNECTION') {
      console.error('   💡 Diagnosis: Cannot connect to SMTP server. Check EMAIL_HOST and firewall.');
    } else if (err.code === 'EAUTH') {
      console.error('   💡 Diagnosis: Authentication failed. Check EMAIL_USER and EMAIL_PASS.');
    } else if (err.code === 'ESOCKET') {
      console.error('   💡 Diagnosis: Socket error. Check EMAIL_PORT (465 for SSL, 587 for TLS).');
    } else if (err.code === 'EENVELOPE') {
      console.error('   💡 Diagnosis: Invalid email address format.');
    }
    
    throw err; // Re-throw so caller knows it failed
  }
}

// ─── Fire-and-forget with error callback ─────────────────────────
function sendEmailAsync(mailOptions, onError) {
  setImmediate(async () => {
    try {
      await sendEmailWithLogging(mailOptions);
    } catch (err) {
      console.error(`❌ Async email failed to ${mailOptions.to}:`, err.message);
      if (onError && typeof onError === 'function') {
        onError(err);
      }
    }
  });
}

// ─── Email Templates (unchanged) ─────────────────────────────────
function emailWrapper(title, bodyHtml) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f5f7fa;padding:20px;">
      <div style="background:#1a3c5e;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">AMDON Portal</h1>
        <p style="color:#a0c4e8;margin:4px 0 0;font-size:13px;">Automobile Dealers Association of Nigeria</p>
      </div>
      <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
        <h2 style="color:#1a3c5e;margin:0 0 16px;font-size:18px;">${title}</h2>
        ${bodyHtml}
        <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
          This is an automated message from the AMDON Portal. Do not reply.
        </p>
      </div>
    </div>
  `;
}

function codeBlock(code) {
  return `
    <div style="background:#f0f7ff;border:2px dashed #1a3c5e;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
      <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your Code</p>
      <h1 style="color:#1a3c5e;font-size:38px;font-weight:900;letter-spacing:10px;margin:0;font-family:monospace;">${code}</h1>
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:8px 0 0;">
      This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
    </p>
  `;
}

// ─── 1. Registration confirmation email ─────────────────────────
async function sendConfirmationEmail({ to, fullName, memberId }) {
  console.log(`📝 sendConfirmationEmail called for ${to}, Member ID: ${memberId}`);
  
  try {
    await sendEmailWithLogging({
      from: process.env.EMAIL_FROM,
      to,
      subject: `AMDON Registration Successful — Your Member ID: ${memberId}`,
      html: emailWrapper('Registration Successful!', `
        <p style="color:#374151;">Dear <strong>${fullName}</strong>,</p>
        <p style="color:#374151;">Your AMDON registration was successful. Here is your unique Member ID:</p>
        <div style="background:#1a3c5e;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
          <p style="color:#a0c4e8;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Member ID</p>
          <h1 style="color:white;font-size:28px;letter-spacing:3px;margin:0;font-family:monospace;">${memberId}</h1>
        </div>
        <p style="color:#374151;">Keep this ID safe — you will need it to access your dashboard and verify membership.</p>
      `),
    });
    console.log(`✅ Confirmation email completed for ${to}`);
  } catch (err) {
    console.error(`❌ sendConfirmationEmail failed for ${to}:`, err.message);
    throw err; // Propagate to caller
  }
}

// ─── 2. Email verification OTP ──────────────────────────────────
async function sendVerificationEmail({ to, fullName, code }) {
  console.log(`📝 sendVerificationEmail called for ${to}, code: ${code}`);
  
  try {
    const result = await sendEmailWithLogging({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'AMDON — Verify Your Email Address',
      html: emailWrapper('Verify Your Email', `
        <p style="color:#374151;">Hi <strong>${fullName}</strong>,</p>
        <p style="color:#374151;">
          Thank you for registering with AMDON. Please enter the verification code below 
          to confirm your email address and activate your account.
        </p>
        ${codeBlock(code)}
      `),
    });
    console.log(`✅ Verification email sent to ${to}`);
    return result;
  } catch (err) {
    console.error(`❌ sendVerificationEmail failed for ${to}:`, err.message);
    throw err;
  }
}

// ─── 3. Password reset OTP ──────────────────────────────────────
async function sendPasswordResetEmail({ to, code }) {
  console.log(`📝 sendPasswordResetEmail called for ${to}`);
  
  try {
    const result = await sendEmailWithLogging({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'AMDON — Password Reset Code',
      html: emailWrapper('Reset Your Password', `
        <p style="color:#374151;">
          We received a request to reset the password for your AMDON account 
          associated with <strong>${to}</strong>.
        </p>
        <p style="color:#374151;">Enter the code below to proceed with resetting your password:</p>
        ${codeBlock(code)}
        <p style="color:#ef4444;font-size:13px;">
          If you did not request a password reset, please ignore this email. 
          Your password will remain unchanged.
        </p>
      `),
    });
    console.log(`✅ Password reset email sent to ${to}`);
    return result;
  } catch (err) {
    console.error(`❌ sendPasswordResetEmail failed for ${to}:`, err.message);
    throw err;
  }
}

module.exports = {
  sendConfirmationEmail,   
  sendVerificationEmail,   
  sendPasswordResetEmail,
  sendEmailWithLogging, // Export for testing
};
