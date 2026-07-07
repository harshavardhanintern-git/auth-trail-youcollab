const supabase = require('./supabase');
const AppError = require('../utils/AppError');

/**
 * Get current user's profile (brand or influencer based on role).
 */
const getProfile = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('id', userId)
    .maybeSingle();

  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
    avatarUrl: user.avatar_url,
    isOnboarded: user.is_onboarded,
    brand: user.brand,
    influencer: user.influencer,
  };
};

/**
 * Update brand profile.
 */
const updateBrandProfile = async (userId, data) => {
  const { data: brand, error: findError } = await supabase
    .from('brands')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (findError || !brand) {
    throw new AppError('Brand profile not found. Complete onboarding first.', 404, 'NOT_FOUND');
  }

  const updateData = {};
  if (data.businessName !== undefined) updateData.businessName = data.businessName;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.website !== undefined) updateData.website = data.website || null;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl || null;

  const { data: updatedBrand, error: updateError } = await supabase
    .from('brands')
    .update(updateData)
    .eq('id', brand.id)
    .select('*')
    .single();

  if (updateError) {
    throw new AppError('Failed to update brand profile.', 500, 'DATABASE_ERROR');
  }

  // Sync avatar if logo changed
  if (data.logoUrl !== undefined) {
    await supabase
      .from('users')
      .update({ avatar_url: data.logoUrl || null })
      .eq('id', userId);
  }

  return updatedBrand;
};

/**
 * Update influencer profile.
 */
const updateInfluencerProfile = async (userId, data) => {
  const { data: influencer, error: findError } = await supabase
    .from('influencers')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (findError || !influencer) {
    throw new AppError('Creator profile not found. Complete onboarding first.', 404, 'NOT_FOUND');
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.instagramHandle !== undefined) updateData.instagramHandle = data.instagramHandle;
  if (data.niche !== undefined) updateData.niche = data.niche;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.profileImageUrl !== undefined) updateData.profileImageUrl = data.profileImageUrl || null;
  if (data.followerCount !== undefined) updateData.followerCount = data.followerCount;

  const { data: updatedInfluencer, error: updateError } = await supabase
    .from('influencers')
    .update(updateData)
    .eq('id', influencer.id)
    .select('*')
    .single();

  if (updateError) {
    throw new AppError('Failed to update creator profile.', 500, 'DATABASE_ERROR');
  }

  // Sync avatar if profile image changed
  if (data.profileImageUrl !== undefined) {
    await supabase
      .from('users')
      .update({ avatar_url: data.profileImageUrl || null })
      .eq('id', userId);
  }

  return updatedInfluencer;
};

module.exports = {
  getProfile,
  updateBrandProfile,
  updateInfluencerProfile,
};
