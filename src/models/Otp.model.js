const mongoose = require('mongoose');

// One-time codes for sign-up verification and password reset.
// For SIGNUP, the pending name and password hash live here until the code is verified,
// so no User account exists before the email is confirmed.
const OtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    purpose: {
      type: String,
      enum: ['SIGNUP', 'RESET'],
      required: true
    },
    codeHash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastSentAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    payload: {
      name: { type: String },
      passwordHash: { type: String }
    }
  },
  {
    timestamps: true
  }
);

OtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
// MongoDB removes expired documents automatically
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);
