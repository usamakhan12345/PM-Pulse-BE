const express = require('express');
const router = express.Router();
const adminService = require('../services/admin.service');
const ApiResponse = require('../utils/apiResponse');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');

// Platform administrator only
router.use(authenticateUser, authorizeRoles('ADMIN'));

const handler = (fn, label) => async (req, res, next) => {
  try {
    const data = await fn(req);
    return ApiResponse.success(res, data, label);
  } catch (error) {
    next(error);
  }
};

router.get('/overview', handler(() => adminService.overview(), 'Overview retrieved'));
router.get('/users', handler((req) => adminService.users(req.query), 'Users retrieved'));
router.get('/workspaces', handler(async () => ({ workspaces: await adminService.workspaces() }), 'Workspaces retrieved'));
router.get('/projects', handler((req) => adminService.projects(req.query), 'Projects retrieved'));

module.exports = router;
