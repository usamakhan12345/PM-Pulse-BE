const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers(req.query.search);
      return ApiResponse.success(res, { users }, 'Users retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const user = await userService.updateUserRole(req.params.id, req.body.role);
      return ApiResponse.success(res, { user }, 'User role updated');
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

module.exports = new UserController();
