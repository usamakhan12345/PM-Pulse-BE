const { z } = require('zod');

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty')
});

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty')
});

module.exports = {
  createCommentSchema,
  updateCommentSchema
};
