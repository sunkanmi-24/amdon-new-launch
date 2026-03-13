const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Shared styled wrapper ─────────────────────────────────────
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

// ─── OTP code block ────────────────────────────────────────────
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
// ─── 1. Registration confirmation ───────────────────────────────
async function sendConfirmationEmail({ to, fullName, memberId }) {
  const body = `
    <p style="color:#374151;">Dear <strong>${fullName}</strong>,</p>
    <p style="color:#374151;">Your AMDON registration was successful. Here is your unique Member ID:</p>
    <div style="background:#1a3c5e;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
      <p style="color:#a0c4e8;font-size:12px;margin:0 0 6px;
                text-transform:uppercase;letter-spacing:1px;">Member ID</p>
      <h1 style="color:white;font-size:28px;letter-spacing:3px;margin:0;
                 font-family:monospace;">${memberId}</h1>
    </div>
    <p style="color:#374151;">
      Keep this ID safe — you will need it to access your dashboard and verify membership.
    </p>
  `;
  return sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `AMDON Registration Successful — Your Member ID: ${memberId}`,
    html: emailWrapper('Registration Successful!', body),
  });
}

// ─── 2. Email verification OTP ──────────────────────────────────
async function sendVerificationEmail({ to, fullName, code }) {
  const body = `
    <p style="color:#374151;">Hi <strong>${fullName}</strong>,</p>
    <p style="color:#374151;">
      Thank you for registering with AMDON. Please enter the verification 
      code below to confirm your email address and activate your account.
    </p>
    ${codeBlock(code)}
  `;
  return sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'AMDON — Verify Your Email Address',
    html: emailWrapper('Verify Your Email', body),
  });
}

// ─── 3. Password reset OTP ──────────────────────────────────────
async function sendPasswordResetEmail({ to, code }) {
  const body = `
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
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'AMDON — Password Reset Code',
    html: emailWrapper('Reset Your Password', body),
  });
}

module.exports = {
  sendConfirmationEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};