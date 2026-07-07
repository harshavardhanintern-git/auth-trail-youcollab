const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');
const { TIER_COST, getTier } = require('../utils/credits');

/**
 * Helper to retrieve influencer associated with userId.
 */
const getInfluencerByUserId = async (userId) => {
  const { data: influencer, error } = await supabase
    .from('influencers')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error || !influencer) {
    throw new AppError('Complete your creator onboarding to apply for collabs.', 400, 'ONBOARDING_REQUIRED');
  }
  return influencer;
};

/**
 * Apply to a Gig.
 */
const apply = async (userId, gigId, coverNote) => {
  const influencer = await getInfluencerByUserId(userId);

  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('*, brand:brands(id, userId, businessName)')
    .eq('id', gigId)
    .maybeSingle();

  if (gigError || !gig) {
    throw new AppError('This collab does not exist or has been deleted.', 404, 'NOT_FOUND');
  }

  if (gig.status !== 'OPEN') {
    throw new AppError('This collab is closed for applications.', 400, 'BAD_REQUEST');
  }

  // Check for duplicate application
  const { data: existingApplication } = await supabase
    .from('applications')
    .select('id')
    .eq('gigId', gigId)
    .eq('influencerId', influencer.id)
    .maybeSingle();

  if (existingApplication) {
    throw new AppError("You've already applied to this collab! Sit tight.", 409, 'CONFLICT');
  }

  // Create application
  const { data: appRecord, error: appError } = await supabase
    .from('applications')
    .insert({
      gigId,
      influencerId: influencer.id,
      coverNote,
      status: 'PENDING',
    })
    .select('*')
    .single();

  if (appError) {
    throw new AppError('Failed to apply for this collab.', 500, 'DATABASE_ERROR');
  }

  // Notify brand owner
  try {
    await supabase.from('notifications').insert({
      userId: gig.brand.userId,
      type: 'APPLICATION_RECEIVED',
      title: 'New application! 🎉',
      message: `${influencer.name} applied to your collab "${gig.title}"`,
      metadata: JSON.stringify({
        gigId,
        applicationId: appRecord.id,
        influencerId: influencer.id,
      }),
    });
  } catch (notifErr) {
    console.error('Failed to create notification for brand owner:', notifErr);
  }

  return appRecord;
};

/**
 * Get all applications for a specific Gig (Brand Owner only).
 */
const getGigApplications = async (gigId, userId, filters) => {
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('userId', userId)
    .maybeSingle();

  if (!brand) {
    throw new AppError('Brand onboarding is required.', 400, 'ONBOARDING_REQUIRED');
  }

  const { data: gig } = await supabase
    .from('gigs')
    .select('brandId')
    .eq('id', gigId)
    .maybeSingle();

  if (!gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have access to view applicants for this collab.", 403, 'FORBIDDEN');
  }

  const { cursor, limit } = parsePagination(filters, 10);

  let query = supabase
    .from('applications')
    .select('*, influencer:influencers(id, name, instagramHandle, niche, bio, profileImageUrl, followerCount, user:users(last_active_at, email))', { count: 'exact' })
    .eq('gigId', gigId);

  if (cursor) {
    const { data: cursorItem } = await supabase
      .from('applications')
      .select('createdAt, id')
      .eq('id', cursor)
      .maybeSingle();
    if (cursorItem) {
      query = query.or(`createdAt.lt.${cursorItem.createdAt},and(createdAt.eq.${cursorItem.createdAt},id.lt.${cursorItem.id})`);
    }
  }

  query = query.order('createdAt', { ascending: false }).order('id', { ascending: false });

  const { data: applications, error, count: total } = await query.limit(limit + 1);

  if (error) {
    throw new AppError('Failed to fetch applications.', 500, 'DATABASE_ERROR');
  }

  const paginated = paginateResults(applications || [], limit);
  paginated.pagination.total = total || 0;

  return paginated;
};

/**
 * Get current creator's application history.
 */
const getMyApplications = async (userId, filters) => {
  const influencer = await getInfluencerByUserId(userId);
  const { cursor, limit } = parsePagination(filters, 10);

  let query = supabase
    .from('applications')
    .select('*, gig:gigs(id, title, budgetMin, budgetMax, deadline, category, status, city, brand:brands(businessName, logoUrl, user:users(email)))', { count: 'exact' })
    .eq('influencerId', influencer.id);

  if (cursor) {
    const { data: cursorItem } = await supabase
      .from('applications')
      .select('createdAt, id')
      .eq('id', cursor)
      .maybeSingle();
    if (cursorItem) {
      query = query.or(`createdAt.lt.${cursorItem.createdAt},and(createdAt.eq.${cursorItem.createdAt},id.lt.${cursorItem.id})`);
    }
  }

  query = query.order('createdAt', { ascending: false }).order('id', { ascending: false });

  const { data: applications, error, count: total } = await query.limit(limit + 1);

  if (error) {
    throw new AppError('Failed to fetch your applications.', 500, 'DATABASE_ERROR');
  }

  const paginated = paginateResults(applications || [], limit);
  paginated.pagination.total = total || 0;

  return paginated;
};

/**
 * Update Application Status (Accept / Reject) - Brand Owner only.
 */
const updateStatus = async (applicationId, userId, status) => {
  const { data: brand } = await supabase
    .from('brands')
    .select('id, businessName')
    .eq('userId', userId)
    .maybeSingle();

  if (!brand) {
    throw new AppError('Brand onboarding is required.', 400, 'ONBOARDING_REQUIRED');
  }

  const { data: application, error: findError } = await supabase
    .from('applications')
    .select('*, gig:gigs(*, brand:brands(*)), influencer:influencers(*, user:users(*))')
    .eq('id', applicationId)
    .maybeSingle();

  if (findError || !application) {
    throw new AppError('Application not found.', 404, 'NOT_FOUND');
  }

  if (application.gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to update this application.", 403, 'FORBIDDEN');
  }

  if (application.status !== 'PENDING') {
    throw new AppError('This application has already been processed.', 400, 'BAD_REQUEST');
  }

  // Hiring a creator spends trial credits, priced by their follower tier.
  let tierCost = 0;
  if (status === 'ACCEPTED') {
    const tier = getTier(application.influencer.followerCount);
    if (tier === 'MID') {
      throw new AppError('Mid-tier creators (10K+ followers) unlock after the trial pack.', 400, 'TIER_LOCKED');
    }
    tierCost = TIER_COST[tier];
  }

  // Conditioned on status still being PENDING at write time — the atomic guard
  // that closes the gap between the read above and this write, so two
  // concurrent accepts on the same application can't both go through.
  const { data: updatedApplication, error: updateError } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .eq('status', 'PENDING')
    .select('*')
    .maybeSingle();

  if (updateError || !updatedApplication) {
    throw new AppError('This application has already been processed.', 400, 'BAD_REQUEST');
  }

  if (status === 'ACCEPTED') {
    // Atomic DB-side decrement — avoids the lost-update race a JS-computed
    // "credits - tierCost" would have if this brand has two hires in flight.
    const { data: debitRows, error: debitError } = await supabase.rpc('debit_brand_credits', {
      p_brand_id: brand.id,
      p_amount: tierCost,
    });

    if (debitError || !debitRows?.length) {
      // Roll back — the hire didn't actually go through.
      await supabase.from('applications').update({ status: 'PENDING' }).eq('id', applicationId);
      throw new AppError('Not enough trial credits for this hire.', 402, 'INSUFFICIENT_CREDITS');
    }

    // The same hire credits the creator's earned balance — the brand's spend
    // and the creator's earning are one transaction, not two disconnected numbers.
    const { error: creditError } = await supabase.rpc('credit_influencer_earnings', {
      p_influencer_id: application.influencer.id,
      p_amount: tierCost,
    });

    if (creditError) {
      console.error('Failed to credit influencer earnings:', creditError);
    }
  }

  // Notify the Influencer
  try {
    const isAccepted = status === 'ACCEPTED';
    const notifType = isAccepted ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED';
    const notifTitle = isAccepted ? "You're in! 🎊" : 'Update on your application';
    const notifMessage = isAccepted
      ? `Congratulations! ${brand.businessName} accepted your application for "${application.gig.title}"`
      : `Bummer! ${brand.businessName} reviewed your application for "${application.gig.title}"`;

    await supabase.from('notifications').insert({
      userId: application.influencer.user.id,
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      metadata: JSON.stringify({
        gigId: application.gigId,
        applicationId,
        brandId: brand.id,
      }),
    });
  } catch (notifErr) {
    console.error('Failed to notify influencer about application status change:', notifErr);
  }

  return updatedApplication;
};

/**
 * Load an application along with both parties' user IDs, and confirm the
 * requesting user is one of them (the brand owner or the applying influencer).
 */
const getApplicationForMessaging = async (applicationId, userId) => {
  const { data: application, error } = await supabase
    .from('applications')
    .select('id, status, gig:gigs(brand:brands(userId)), influencer:influencers(userId)')
    .eq('id', applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  const brandUserId = application.gig?.brand?.userId;
  const influencerUserId = application.influencer?.userId;

  if (userId !== brandUserId && userId !== influencerUserId) {
    throw new AppError("You don't have access to this conversation.", 403, 'FORBIDDEN');
  }

  if (application.status !== 'ACCEPTED') {
    throw new AppError('Messaging opens once the collab is approved.', 400, 'BAD_REQUEST');
  }

  const otherUserId = userId === brandUserId ? influencerUserId : brandUserId;
  return { otherUserId };
};

/**
 * Fetch the message thread for an approved collaboration.
 * ponytail: fixed 200-message cap, no pagination — fine for a single-thread
 * DM view; revisit with cursor pagination if threads grow long in practice.
 */
const getMessages = async (applicationId, userId) => {
  await getApplicationForMessaging(applicationId, userId);

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('applicationId', applicationId)
    .order('createdAt', { ascending: true })
    .limit(200);

  if (error) {
    throw new AppError('Failed to load messages.', 500, 'DATABASE_ERROR');
  }

  return messages || [];
};

/**
 * Send a message within an approved collaboration's thread.
 */
const sendMessage = async (applicationId, userId, content) => {
  const { otherUserId } = await getApplicationForMessaging(applicationId, userId);

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      senderId: userId,
      receiverId: otherUserId,
      applicationId,
      content,
    })
    .select('*')
    .single();

  if (error) {
    throw new AppError('Failed to send message.', 500, 'DATABASE_ERROR');
  }

  return message;
};

module.exports = {
  apply,
  getGigApplications,
  getMyApplications,
  updateStatus,
  getMessages,
  sendMessage,
};
