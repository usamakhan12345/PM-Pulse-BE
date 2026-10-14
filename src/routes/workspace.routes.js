const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspace.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addMemberSchema
} = require('../validators/workspace.validator');

router.use(authenticateUser);

router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/', workspaceController.getUserWorkspaces);
router.get('/:id', workspaceController.getWorkspaceById);
router.patch('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.delete('/:id', authorizeRoles('ADMIN'), workspaceController.deleteWorkspace);

router.post('/:id/members', authorizeRoles('ADMIN', 'MANAGER'), validate(addMemberSchema), workspaceController.addMember);
router.delete('/:id/members/:userId', authorizeRoles('ADMIN', 'MANAGER'), workspaceController.removeMember);

module.exports = router;
