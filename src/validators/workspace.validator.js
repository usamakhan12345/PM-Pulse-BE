const { z } = require('zod');

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  description: z.string().optional().default('')
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').optional(),
  description: z.string().optional()
});

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address')
});

module.exports = {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteSchema
};
