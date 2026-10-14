const mongoose = require('mongoose');

// An email invitation to join a workspace. Only a hash of the token is stored.
const InvitationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REVOKED'], default: 'PENDING' },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

InvitationSchema.index({ workspaceId: 1, email: 1, status: 1 });

module.exports = mongoose.model('Invitation', InvitationSchema);
