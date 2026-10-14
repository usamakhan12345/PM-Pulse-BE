const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const { avatarUpload } = require('../middleware/avatar.middleware');

router.use(authenticateUser);

// There is deliberately no way to browse other users. People join a workspace by invitation.
router.get('/', authorizeRoles('ADMIN'), userController.getAllUsers);
router.patch('/profile', userController.updateProfile);
router.post('/profile/avatar', avatarUpload.single('avatar'), userController.uploadAvatar);
router.delete('/profile/avatar', userController.removeAvatar);

module.exports = router;
