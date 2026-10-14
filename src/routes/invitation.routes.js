const express = require('express');
const router = express.Router();
const invitationService = require('../services/invitation.service');
const ApiResponse = require('../utils/apiResponse');
const { authenticateUser } = require('../middleware/auth.middleware');

// What the join page shows before sign in: the workspace name and who invited the person.
// It reveals nothing else, and the link itself is the secret.
router.get('/:token', async (req, res, next) => {
  try {
    const info = await invitationService.getPublicInfo(req.params.token);
    return ApiResponse.success(res, { invitation: info }, 'Invitation found');
  } catch (error) {
    next(error);
  }
});

router.post('/:token/accept', authenticateUser, async (req, res, next) => {
  try {
    const result = await invitationService.accept(req.params.token, req.user);
    return ApiResponse.success(res, result, 'You joined the workspace');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
