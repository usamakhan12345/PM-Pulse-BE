// Sends one test email using the SMTP settings in .env, so email setup can be checked
// without going through sign-up.  Usage:  npm run test:mail -- someone@example.com
const env = require('../src/config/env');
const nodemailer = require('nodemailer');

const to = process.argv[2] || env.SMTP_USER;

const explain = (err) => {
  const msg = `${err.code || ''} ${err.responseCode || ''} ${err.message || ''}`;
  if (/EAUTH|535|Username and Password not accepted|Invalid login/i.test(msg)) {
    return [
      'Gmail rejected the login. Check that:',
      '  - SMTP_PASS is an APP PASSWORD (16 characters, no spaces), not your normal Gmail password',
      '  - 2-step verification is turned on for that Google account (app passwords need it)',
      '  - SMTP_USER is the full address of the same account that created the app password'
    ].join('\n');
  }
  if (/ECONNECTION|ETIMEDOUT|ESOCKET|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
    return 'Could not reach the mail server. Check your internet connection, and that SMTP_HOST=smtp.gmail.com and SMTP_PORT=465. A firewall or VPN can block port 465; try SMTP_PORT=587.';
  }
  return 'See the error above.';
};

(async () => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.error('SMTP_USER and SMTP_PASS are empty in server/.env. Fill them in, then run this again.');
    process.exit(1);
  }
  if (/\s/.test(env.SMTP_PASS)) {
    console.error('SMTP_PASS contains spaces. Remove them: the app password is 16 characters with no spaces.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });

  try {
    await transporter.verify();
    console.log(`Login to ${env.SMTP_HOST} succeeded.`);
    await transporter.sendMail({
      from: env.MAIL_FROM || `PulsePM <${env.SMTP_USER}>`,
      to,
      subject: 'PulsePM test email',
      text: 'Email sending works. Sign-up and password reset codes will arrive like this.'
    });
    console.log(`Test email sent to ${to}. Check the inbox (and spam).`);
  } catch (err) {
    console.error(`Email failed: ${err.message}\n`);
    console.error(explain(err));
    process.exit(1);
  }
})();
