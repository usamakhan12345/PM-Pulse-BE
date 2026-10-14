const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { authenticateUser } = require('../middleware/auth.middleware');
const {
  registerSchema,
  otpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validators/auth.validator');

router.post('/register', validate(registerSchema), authController.register);
router.post('/verify-otp', validate(otpSchema), authController.verifyOtp);
router.post('/resend-otp', validate(resendOtpSchema), authController.resendOtp);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateUser, authController.me);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
