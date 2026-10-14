const crypto = require('crypto');
const Workspace = require('../models/Workspace.model');
const WorkspaceMember = require('../models/WorkspaceMember.model');
const Invitation = require('../models/Invitation.model');
const User = require('../models/User.model');
const ApiError = require('../utils/apiError');
const env = require('../config/env');
const { sendMail, inviteEmail } = require('../utils/mailer');

const INVITE_TTL_DAYS = 7;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const linkFor = (token) => `${env.CLIENT_URL.replace(/\/$/, '')}/invite/${token}`;
const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}***@${domain}`;
};

class InvitationService {
  // Sends an email invitation. The person joins by opening the link and signing in (or signing up)
  // with this same email address.
  async inviteByEmail(workspaceId, inviter, rawEmail) {
    const email = normalizeEmail(rawEmail);
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw ApiError.notFound('Workspace not found');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const already = await WorkspaceMember.exists({ workspace: workspaceId, user: existingUser._id, status: 'ACTIVE' });
      if (already) throw ApiError.badRequest('This person is already a member of the workspace');
    }

    // A new invitation replaces any earlier open one for the same address
    await Invitation.updateMany({ workspaceId, email, status: 'PENDING' }, { status: 'REVOKED' });

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await Invitation.create({
      workspaceId,
      email,
      tokenHash: hashToken(token),
      invitedBy: inviter._id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
    });

    try {
      await sendMail({
        to: email,
        ...inviteEmail({ inviterName: inviter.name, workspaceName: workspace.name, link: linkFor(token), days: INVITE_TTL_DAYS })
      });
    } catch (err) {
      console.error('[Mail] Failed to send invitation:', err.message);
      await Invitation.deleteOne({ _id: invitation._id });
      throw new ApiError(503, 'We could not send the invitation email. Please try again shortly.');
    }

    return { _id: invitation._id, email, expiresAt: invitation.expiresAt, createdAt: invitation.createdAt };
  }

  async listPending(workspaceId) {
    return Invitation.find({ workspaceId, status: 'PENDING', expiresAt: { $gt: new Date() } })
      .select('email createdAt expiresAt invitedBy')
      .populate('invitedBy', 'name')
      .sort({ createdAt: -1 });
  }

  async revoke(workspaceId, invitationId) {
    const result = await Invitation.findOneAndUpdate(
      { _id: invitationId, workspaceId, status: 'PENDING' },
      { status: 'REVOKED' }
    );
    if (!result) throw ApiError.notFound('Invitation not found');
    return { message: 'Invitation cancelled' };
  }

  // The reusable join link. Anyone who has it can join as a member until the owner resets it.
  async getInviteLink(workspaceId, { reset = false } = {}) {
    const workspace = await Workspace.findById(workspaceId).select('+inviteToken');
    if (!workspace) throw ApiError.notFound('Workspace not found');

    if (!workspace.inviteToken || reset) {
      workspace.inviteToken = crypto.randomBytes(24).toString('base64url');
      await workspace.save();
    }
    return { link: linkFor(workspace.inviteToken) };
  }

  async resolve(token) {
    const invitation = await Invitation.findOne({
      tokenHash: hashToken(token),
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    });
    if (invitation) {
      const workspace = await Workspace.findById(invitation.workspaceId);
      if (workspace) return { type: 'email', workspace, invitation };
    }

    const workspace = await Workspace.findOne({ inviteToken: token }).select('+inviteToken');
    if (workspace) return { type: 'link', workspace };
    return null;
  }

  // What the join page shows before anyone signs in
  async getPublicInfo(token) {
    const found = await this.resolve(token);
    if (!found) throw ApiError.notFound('This invitation link is invalid or has expired');

    const info = { workspaceName: found.workspace.name, type: found.type };
    if (found.type === 'email') {
      const inviter = await User.findById(found.invitation.invitedBy).select('name');
      info.invitedBy = inviter ? inviter.name : null;
      info.email = found.invitation.email;
    } else {
      const owner = await User.findById(found.workspace.ownerId).select('name');
      info.invitedBy = owner ? owner.name : null;
    }
    return info;
  }

  async accept(token, user) {
    const found = await this.resolve(token);
    if (!found) throw ApiError.notFound('This invitation link is invalid or has expired');

    if (found.type === 'email' && normalizeEmail(user.email) !== found.invitation.email) {
      throw ApiError.forbidden(
        `This invitation was sent to ${maskEmail(found.invitation.email)}. Sign in with that email address to join.`
      );
    }

    const workspaceId = found.workspace._id;
    const existing = await WorkspaceMember.findOne({ workspace: workspaceId, user: user._id });
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        existing.status = 'ACTIVE';
        await existing.save();
      }
    } else {
      await WorkspaceMember.create({ workspace: workspaceId, user: user._id, role: 'MEMBER', status: 'ACTIVE' });
    }

    if (found.type === 'email') {
      found.invitation.status = 'ACCEPTED';
      await found.invitation.save();
    }

    return { workspace: { _id: workspaceId, name: found.workspace.name } };
  }
}

module.exports = new InvitationService();
