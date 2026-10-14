const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: 2,
      maxlength: 150
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true
    },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
      default: 'TODO',
      index: true
    },
    dueDate: {
      type: Date,
      default: null
    },
    // Who last assigned the task to its current assignee
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Set when the task moves to DONE, cleared when it moves back
    completedAt: {
      type: Date,
      default: null
    },
    labels: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ workspaceId: 1, assignedTo: 1 });

module.exports = mongoose.model('Task', TaskSchema);
