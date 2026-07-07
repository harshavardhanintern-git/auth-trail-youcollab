const { z } = require('zod');

const updateBrandProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100).optional(),
  category: z.string().min(2).optional(),
  location: z.string().min(2).max(100).optional(),
  bio: z.string({ required_error: 'Bio is required' })
    .max(1000)
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 3, {
      message: 'Bio must contain at least three words',
    }),
  website: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  logoUrl: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
});

const updateInfluencerProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  instagramHandle: z.string().min(1).max(100).optional(),
  niche: z.string().min(2).optional(),
  bio: z.string({ required_error: 'Bio is required' })
    .max(1000)
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 3, {
      message: 'Bio must contain at least three words',
    }),
  profileImageUrl: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  followerCount: z.number().int().min(0).optional(),
});

module.exports = {
  updateBrandProfileSchema,
  updateInfluencerProfileSchema,
};
