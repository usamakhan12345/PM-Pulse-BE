const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pulsepm',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_only_insecure_jwt_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Email (SMTP). For Gmail use smtp.gmail.com with an app password.
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  // Google shows app passwords in groups of four with spaces; the spaces are not part of the password
  SMTP_PASS: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  MAIL_FROM: process.env.MAIL_FROM || '',

  // Administrator account created on first start if it does not exist
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || ''
};
