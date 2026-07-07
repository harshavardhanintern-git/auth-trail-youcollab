const { z } = require('zod');

const createGigSchema = z.object({
  title: z.string({ required_error: 'Give your collab a catchy title 🚀' })
    .min(5, 'Title must be at least 5 characters long')
    .max(100, 'Title is too long'),
  description: z.string({ required_error: 'Describe the collab in detail' })
    .min(20, 'Description must contain at least 20 characters')
    .max(2000, 'Description is too long'),
  budgetMin: z.number({ required_error: 'Set a minimum budget' })
    .int('Budget must be an integer')
    .min(1, 'Minimum budget must be greater than 0'),
  budgetMax: z.number({ required_error: 'Set a maximum budget' })
    .int('Budget must be an integer')
    .min(1, 'Maximum budget must be greater than 0'),
  deliverables: z.string({ required_error: 'List the deliverables expected' })
    .min(1, 'Deliverables field is required'),
  creatorRequirements: z.string({ required_error: 'Creator requirements are required' })
    .min(1, 'Creator requirements field is required'),
  platform: z.string({ required_error: 'Platform selection is required' })
    .min(1, 'Platform selection is required'),
  campaignType: z.string({ required_error: 'Campaign type is required' })
    .min(1, 'Campaign type is required'),
  deadline: z.string({ required_error: 'Set a deadline for applications' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .transform((val) => new Date(val))
    .refine((date) => date > new Date(), { message: 'Deadline cannot be in the past' }),
  category: z.string({ required_error: 'Select a category' })
    .min(2, 'Please select a category'),
  status: z.enum(['OPEN', 'CLOSED', 'DRAFT']).optional().nullable(),
  city: z.string().optional().nullable(),
}).refine((data) => {
  return data.budgetMax > data.budgetMin;
}, {
  message: 'Budget Max must be greater than Budget Min',
  path: ['budgetMax'],
});

const updateGigSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(2000).optional(),
  budgetMin: z.number().int().min(1).optional(),
  budgetMax: z.number().int().min(1).optional().nullable(),
  deliverables: z.string().min(1).optional(),
  creatorRequirements: z.string().min(1).optional(),
  platform: z.string().min(1).optional(),
  campaignType: z.string().min(1).optional(),
  deadline: z.string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .transform((val) => new Date(val))
    .refine((date) => date > new Date(), { message: 'Deadline cannot be in the past' })
    .optional(),
  category: z.string().min(2).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'DRAFT']).optional(),
  city: z.string().optional().nullable(),
}).refine((data) => {
  if (data.budgetMin && data.budgetMax && data.budgetMax <= data.budgetMin) {
    return false;
  }
  return true;
}, {
  message: 'Budget Max must be greater than Budget Min',
  path: ['budgetMax'],
});

module.exports = {
  createGigSchema,
  updateGigSchema,
};
