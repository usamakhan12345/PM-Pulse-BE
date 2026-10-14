const { z } = require('zod');

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional().default(''),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional().default('ACTIVE'),
  isPrivate: z.boolean().optional().default(false),
  members: z.array(z.string()).optional().default([])
});

const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  isPrivate: z.boolean().optional(),
  members: z.array(z.string()).optional()
});

module.exports = {
  createProjectSchema,
  updateProjectSchema
};
