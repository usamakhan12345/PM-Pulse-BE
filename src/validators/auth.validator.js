const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const otpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code')
});

const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

module.exports = {
  registerSchema,
  otpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
