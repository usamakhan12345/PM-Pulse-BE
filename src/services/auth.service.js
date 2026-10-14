const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const Otp = require('../models/Otp.model');
const ApiError = require('../utils/apiError');
const env = require('../config/env');
const { generateToken } = require('../utils/jwt');
const { sendMail, otpEmail } = require('../utils/mailer');
const workspaceService = require('./workspace.service');

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const generateCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const hashCode = (email, purpose, code) =>
  crypto.createHmac('sha256', env.JWT_SECRET).update(`${email}:${purpose}:${code}`).digest('hex');

const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const secondsUntilResend = (otp) => {
  if (!otp) return 0;
  const elapsed = (Date.now() - otp.lastSentAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
};

const toUserResponse = (user) => {
  const userObj = user.toObject();
  delete userObj.password;
  return userObj;
};

class AuthService {
  // Creates or refreshes a one-time code and emails it
  async issueOtp({ email, purpose, payload }) {
    const code = generateCode();
    await Otp.findOneAndUpdate(
      { email, purpose },
      {
        email,
        purpose,
        codeHash: hashCode(email, purpose, code),
        attempts: 0,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        ...(payload ? { payload } : {})
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const mail = otpEmail({ code, purpose, minutes: OTP_TTL_MINUTES });
    try {
      await sendMail({ to: email, ...mail });
    } catch (err) {
      console.error('[Mail] Failed to send OTP email:', err.message);
      await Otp.deleteOne({ email, purpose });
      throw new ApiError(503, 'We could not send the email. Please try again shortly.');
    }
  }

  // Checks a code and returns the stored record. Counts wrong attempts and locks after too many.
  async checkOtp({ email, purpose, code }) {
    const otp = await Otp.findOne({ email, purpose });
    if (!otp || otp.expiresAt < new Date()) {
      throw ApiError.badRequest('This code has expired. Please request a new one.');
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: otp._id });
      throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.');
    }

    if (!safeEqual(otp.codeHash, hashCode(email, purpose, String(code)))) {
      otp.attempts += 1;
      await otp.save();
      const left = MAX_ATTEMPTS - otp.attempts;
      throw ApiError.badRequest(
        left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Please request a new code.'
      );
    }
    return otp;
  }

  // Step 1 of sign up: store the details and email a code. No account exists yet.
  async register({ name, email, password }) {
    email = normalizeEmail(email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('Email is already registered');
    }

    const pending = await Otp.findOne({ email, purpose: 'SIGNUP' });
    const wait = secondsUntilResend(pending);
    if (wait > 0) {
      throw new ApiError(429, `Please wait ${wait} seconds before requesting another code.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.issueOtp({ email, purpose: 'SIGNUP', payload: { name: name.trim(), passwordHash } });

    return {
      email,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      resendAfterSeconds: RESEND_COOLDOWN_SECONDS
    };
  }

  // Step 2 of sign up: a valid code creates the account (a normal USER) and signs the user in.
  async verifySignup({ email, otp }) {
    email = normalizeEmail(email);
    const record = await this.checkOtp({ email, purpose: 'SIGNUP', code: otp });

    if (await User.findOne({ email })) {
      await Otp.deleteOne({ _id: record._id });
      throw ApiError.badRequest('Email is already registered');
    }

    const user = new User({
      name: record.payload.name,
      email,
      password: record.payload.passwordHash,
      role: 'USER'
    });
    user.$locals.passwordAlreadyHashed = true;
    await user.save();

    // A workspace of their own, so they can create a project straight away
    await workspaceService.ensureDefaultWorkspace(user);
    await Otp.deleteOne({ _id: record._id });

    const token = generateToken({ id: user._id, role: user.role });
    return { user: toUserResponse(user), token };
  }

  async resendSignupOtp({ email }) {
    email = normalizeEmail(email);
    const pending = await Otp.findOne({ email, purpose: 'SIGNUP' });
    if (!pending || !pending.payload || !pending.payload.passwordHash) {
      throw ApiError.badRequest('No sign-up in progress for this email. Please register again.');
    }
    const wait = secondsUntilResend(pending);
    if (wait > 0) {
      throw new ApiError(429, `Please wait ${wait} seconds before requesting another code.`);
    }

    await this.issueOtp({ email, purpose: 'SIGNUP', payload: { name: pending.payload.name, passwordHash: pending.payload.passwordHash } });
    return { email, expiresInSeconds: OTP_TTL_MINUTES * 60, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = generateToken({ id: user._id, role: user.role });
    return { user: toUserResponse(user), token };
  }

  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  // Always answers the same way so the form cannot be used to discover which emails are registered
  async forgotPassword(email) {
    email = normalizeEmail(email);
    const generic = {
      message: 'If an account exists for that email, we have sent a verification code.',
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      resendAfterSeconds: RESEND_COOLDOWN_SECONDS
    };

    const user = await User.findOne({ email });
    if (!user) return generic;

    const existing = await Otp.findOne({ email, purpose: 'RESET' });
    if (secondsUntilResend(existing) > 0) return generic;

    await this.issueOtp({ email, purpose: 'RESET' });
    return generic;
  }

  async resetPassword({ email, otp, password }) {
    email = normalizeEmail(email);
    const record = await this.checkOtp({ email, purpose: 'RESET', code: otp });

    const user = await User.findOne({ email });
    if (!user) {
      await Otp.deleteOne({ _id: record._id });
      throw ApiError.badRequest('This code has expired. Please request a new one.');
    }

    user.password = password;
    await user.save();
    await Otp.deleteOne({ _id: record._id });

    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
