const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers(req.query.search);
      return ApiResponse.success(res, { users }, 'Users retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user._id, req.body);
      return ApiResponse.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

UserController.prototype.uploadAvatar = async function (req, res, next) {
  try {
    if (!req.file) {
      throw ApiError.badRequest('Please choose an image to upload');
    }
    const user = await userService.setAvatar(req.user._id, req.file);
    return ApiResponse.success(res, { user }, 'Profile photo updated');
  } catch (error) {
    next(error);
  }
};

UserController.prototype.removeAvatar = async function (req, res, next) {
  try {
    const user = await userService.setAvatar(req.user._id, null);
    return ApiResponse.success(res, { user }, 'Profile photo removed');
  } catch (error) {
    next(error);
  }
};

module.exports = new UserController();
