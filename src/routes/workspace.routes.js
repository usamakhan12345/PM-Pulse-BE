const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspace.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeWorkspaceRoles, workspaceFromParam } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteSchema
} = require('../validators/workspace.validator');

router.use(authenticateUser);

const ownerOnly = authorizeWorkspaceRoles(workspaceFromParam, 'OWNER');
const anyMember = authorizeWorkspaceRoles(workspaceFromParam, 'OWNER', 'MEMBER');

// Anyone signed in can start a workspace and becomes its owner
router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/', workspaceController.getUserWorkspaces);
router.get('/:id', workspaceController.getWorkspaceById);
router.patch('/:id', ownerOnly, validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.delete('/:id', ownerOnly, workspaceController.deleteWorkspace);

// People: members only see their own workspace; there is no way to browse other users
router.get('/:id/members', anyMember, workspaceController.getMembers);
router.delete('/:id/members/:userId', ownerOnly, workspaceController.removeMember);

// Inviting people: by email, or with a shareable link
router.get('/:id/invitations', ownerOnly, workspaceController.listInvitations);
router.post('/:id/invitations', ownerOnly, validate(inviteSchema), workspaceController.inviteByEmail);
router.delete('/:id/invitations/:invitationId', ownerOnly, workspaceController.revokeInvitation);
router.get('/:id/invite-link', ownerOnly, workspaceController.getInviteLink);
router.post('/:id/invite-link/reset', ownerOnly, workspaceController.resetInviteLink);

module.exports = router;
