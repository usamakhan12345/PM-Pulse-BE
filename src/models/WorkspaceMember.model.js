const mongoose = require('mongoose');

const WorkspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['OWNER', 'MEMBER'],
      default: 'MEMBER'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED', 'INACTIVE'],
      default: 'ACTIVE'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate membership records
WorkspaceMemberSchema.index({ user: 1, workspace: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceMember', WorkspaceMemberSchema);
