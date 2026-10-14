const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const data = await authService.register(req.body);
      return ApiResponse.success(res, data, 'Verification code sent');
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const data = await authService.verifySignup(req.body);
      return ApiResponse.created(res, data, 'Account created successfully');
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req, res, next) {
    try {
      const data = await authService.resendSignupOtp(req.body);
      return ApiResponse.success(res, data, 'Verification code sent');
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const data = await authService.login(req.body);
      return ApiResponse.success(res, data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res) {
    return ApiResponse.success(res, null, 'Logged out successfully');
  }

  async me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user._id);
      return ApiResponse.success(res, { user }, 'User details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      return ApiResponse.success(res, result, 'Verification code sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      return ApiResponse.success(res, result, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
