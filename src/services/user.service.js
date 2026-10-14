const User = require('../models/User.model');
const ApiError = require('../utils/apiError');
const fs = require('fs');
const path = require('path');
const { avatarsDir } = require('../middleware/avatar.middleware');

class UserService {
  // Only the platform admin may list everyone (see the admin routes)
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

// Delete a previously uploaded local avatar file (ignores external URLs)
const removeLocalAvatar = (avatarUrl) => {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  const filePath = path.join(avatarsDir, path.basename(avatarUrl));
  fs.unlink(filePath, () => {});
};

UserService.prototype.setAvatar = async function (userId, file) {
  const user = await User.findById(userId);
  if (!user) {
    if (file) fs.unlink(file.path, () => {});
    throw ApiError.notFound('User not found');
  }
  removeLocalAvatar(user.avatar);
  user.avatar = file ? `/uploads/avatars/${file.filename}` : '';
  await user.save();
  const userObj = user.toObject();
  delete userObj.password;
  return userObj;
};

module.exports = new UserService();
