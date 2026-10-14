const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

const isMailConfigured = () => Boolean(env.SMTP_USER && env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
  }
  return transporter;
};

// Sends an email. Without SMTP settings, development prints the message to the
// server console so the flow can be tested; production refuses to run unconfigured.
const sendMail = async ({ to, subject, text, html }) => {
  if (!isMailConfigured()) {
    if (env.NODE_ENV === 'production') {
      throw new Error('Email is not configured. Set SMTP_USER and SMTP_PASS.');
    }
    console.log('---------------- [Mail - SMTP not configured, printing instead] ----------------');
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}`);
    console.log('--------------------------------------------------------------------------------');
    return;
  }

  await getTransporter().sendMail({
    from: env.MAIL_FROM || `PulsePM <${env.SMTP_USER}>`,
    to,
    subject,
    text,
    html
  });
};

// Email layout uses tables and inline styles because most email clients ignore modern CSS.
const BRAND = '#0052cc';

const otpEmail = ({ code, purpose, minutes }) => {
  const isSignup = purpose === 'SIGNUP';
  const title = isSignup ? 'Verify your email' : 'Reset your password';
  const intro = isSignup
    ? 'Thanks for signing up for PulsePM. Enter this code on the sign-up page to finish creating your account.'
    : 'We received a request to reset your PulsePM password. Enter this code on the reset page to choose a new one.';
  const safety = isSignup
    ? 'If you did not try to create an account, you can safely ignore this email.'
    : 'If you did not request a password reset, you can safely ignore this email. Your password will not change.';

  const text = [
    title,
    '',
    intro,
    '',
    `Your code: ${code}`,
    '',
    `This code expires in ${minutes} minutes. Do not share it with anyone.`,
    safety,
    '',
    'PulsePM'
  ].join('\n');

  const codeCells = code
    .split('')
    .map(
      (d) =>
        `<td align="center" style="width:44px;height:56px;background:#ffffff;border:1px solid #cbd5e1;border-radius:10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#0f172a;">${d}</td><td style="width:8px;font-size:0;line-height:0;">&nbsp;</td>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f5f9;">Your PulsePM code is ${code}. It expires in ${minutes} minutes.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:${BRAND};border-radius:10px;width:36px;height:36px;" align="center" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="bottom" style="padding-right:2px;"><div style="width:5px;height:18px;background:#ffffff;border-radius:2px;line-height:18px;font-size:0;">&nbsp;</div></td>
                        <td valign="bottom" style="padding-right:2px;"><div style="width:5px;height:12px;background:#ffffff;opacity:.85;border-radius:2px;line-height:12px;font-size:0;">&nbsp;</div></td>
                        <td valign="bottom"><div style="width:5px;height:8px;background:#ffffff;opacity:.7;border-radius:2px;line-height:8px;font-size:0;">&nbsp;</div></td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left:10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#0f172a;">PulsePM</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:36px 32px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">${title}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:24px 12px;">
                    <p style="margin:0 0 14px;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;">Your verification code</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>${codeCells}</tr></table>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#475569;">
                This code expires in <strong style="color:#0f172a;">${minutes} minutes</strong>. For your security, do not share it with anyone.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 20px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">${safety}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 8px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;">
              You are receiving this email because a request was made with this address on PulsePM.<br>
              &copy; ${new Date().getFullYear()} PulsePM. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: `${code} is your PulsePM verification code`, text, html };
};

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Invitation to join a workspace
const inviteEmail = ({ inviterName, workspaceName, link, days }) => {
  const inviter = escapeHtml(inviterName);
  const workspace = escapeHtml(workspaceName);
  const text = [
    `${inviterName} invited you to join ${workspaceName} on PulsePM.`,
    '',
    'Open this link to accept the invitation:',
    link,
    '',
    `The link works for ${days} days. If you were not expecting this, you can ignore this email.`
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>You are invited</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f5f9;">${inviter} invited you to join ${workspace} on PulsePM.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:20px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#0f172a;">PulsePM</td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:36px 32px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">Join ${workspace}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;"><strong style="color:#0f172a;">${inviter}</strong> invited you to work together in the <strong style="color:#0f172a;">${workspace}</strong> workspace on PulsePM.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:${BRAND};border-radius:10px;">
            <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Accept invitation</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Or paste this link into your browser:<br><a href="${link}" style="color:${BRAND};word-break:break-all;">${link}</a></p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 20px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">The link works for ${days} days. If you were not expecting this invitation, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: `${inviterName} invited you to ${workspaceName} on PulsePM`, text, html };
};

module.exports = { sendMail, otpEmail, inviteEmail, isMailConfigured };
