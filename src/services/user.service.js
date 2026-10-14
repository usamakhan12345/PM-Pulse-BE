const User = require('../models/User.model');
const ApiError = require('../utils/apiError');

class UserService {
  async getAllUsers(search) {
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    return await User.find(query).select('-password').sort({ name: 1 });
  }

  async updateUserRole(targetUserId, newRole) {
    if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(newRole)) {
      throw ApiError.badRequest('Invalid role value');
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { role: newRole },
      { new: true }
    ).select('-password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }

  async updateProfile(userId, { name, avatar }) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }
}

module.exports = new UserService();
