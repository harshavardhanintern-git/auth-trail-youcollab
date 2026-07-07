const { z } = require('zod');

/**
 * Schema for the post-authentication sync endpoint.
 * Accepts the app roles plus the "CREATOR" alias used in the UI.
 */
const syncSchema = z.object({
  role: z
    .string({ required_error: 'Role is required.' })
    .transform((v) => v.trim().toUpperCase())
    .transform((v) => (v === 'CREATOR' ? 'INFLUENCER' : v))
    .refine((v) => ['BRAND', 'INFLUENCER'].includes(v), {
      message: 'Role must be either Creator or Brand.',
    }),
});

module.exports = {
  syncSchema,
};
