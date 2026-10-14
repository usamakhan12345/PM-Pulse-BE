const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Secret part of the shareable join link. Anyone with the link can join as a member.
    inviteToken: {
      type: String,
      select: false,
      index: true,
      sparse: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Workspace', WorkspaceSchema);
