const User = require('../models/User.model');
const Workspace = require('../models/Workspace.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const ApiError = require('../utils/apiError');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');

class AuthService {
  async register({ name, email, password, role }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('Email is already registered');
    }

    const userRole = role && ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role) ? role : 'EMPLOYEE';

    const user = await User.create({
      name,
      email,
      password,
      role: userRole
    });

    // Automatically create a default personal/team workspace for the registered user or join default
    const workspaceSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace-${Date.now().toString().slice(-4)}`;
    const workspace = await Workspace.create({
      name: `${name}'s Workspace`,
      slug: workspaceSlug,
      description: 'Default personal workspace',
      ownerId: user._id
    });

    await WorkspaceMember.create({
      user: user._id,
      workspace: workspace._id,
      role: userRole === 'EMPLOYEE' ? 'ADMIN' : userRole,
      status: 'ACTIVE'
    });

    const token = generateToken({ id: user._id, role: user.role });

    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token,
      defaultWorkspace: workspace
    };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = generateToken({ id: user._id, role: user.role });

    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token
    };
  }

  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Return true to avoid user enumeration
      return { message: 'If an account exists, a reset instructions token has been generated.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 mins
    await user.save();

    return {
      message: 'Reset token generated successfully',
      resetToken // Returned for API usage/testing
    };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
