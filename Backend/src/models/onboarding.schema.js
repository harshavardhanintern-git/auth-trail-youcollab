const { z } = require('zod');

const brandOnboardingSchema = z.object({
  businessName: z.string({ required_error: 'Business name is required' })
    .min(2, 'Business name must be at least 2 characters long')
    .max(100, 'Business name is too long'),
  category: z.string({ required_error: 'Category is required' })
    .min(2, 'Category must be at least 2 characters long'),
  location: z.string().default('Pune'),
  bio: z.string({ required_error: 'A short bio helps creators know your vibe' })
    .max(1000)
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 3, {
      message: 'Bio must contain at least three words',
    }),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  website: z.string().url('Please enter a valid website URL starting with http/https').optional().or(z.literal('')),
});

const influencerOnboardingSchema = z.object({
  name: z.string({ required_error: 'Your name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name is too long'),
  instagramHandle: z.string().optional().default('')
    .transform((val) => {
      if (!val) return '';
      return val.startsWith('@') ? val : `@${val}`;
    }),
  niche: z.string({ required_error: 'Niche is required' })
    .min(2, 'Niche is required'),
  bio: z.string({ required_error: 'A short bio helps brands know your style' })
    .max(1000)
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 3, {
      message: 'Bio must contain at least three words',
    }),
  profileImageUrl: z.string().url('Invalid profile image URL').optional().or(z.literal('')),
  followerCount: z.number().int().min(0).optional().default(0),
});

module.exports = {
  brandOnboardingSchema,
  influencerOnboardingSchema,
};
