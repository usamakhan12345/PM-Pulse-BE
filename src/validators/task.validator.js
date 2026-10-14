const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional().default(''),
  projectId: z.string().min(1, 'Project ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  assignedTo: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional().default('TODO'),
  dueDate: z.string().optional().nullable(),
  labels: z.array(z.string()).optional().default([])
});

const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  dueDate: z.string().optional().nullable(),
  labels: z.array(z.string()).optional()
});

module.exports = {
  createTaskSchema,
  updateTaskSchema
};
