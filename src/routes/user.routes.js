const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');

router.use(authenticateUser);

router.get('/', userController.getAllUsers);
router.patch('/profile', userController.updateProfile);
router.patch('/:id/role', authorizeRoles('ADMIN'), userController.updateUserRole);

module.exports = router;
