const applicationService = require('../services/application.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Influencer applies to a gig.
 */
const apply = asyncHandler(async (req, res) => {
  const { gigId, coverNote } = req.body;
  const application = await applicationService.apply(req.user.id, gigId, coverNote);

  res.status(201).json({
    success: true,
    data: application,
    message: 'Applied! The brand will review your profile soon. ✨',
  });
});

/**
 * Brand views applicants for a specific gig.
 */
const listApplicants = asyncHandler(async (req, res) => {
  const result = await applicationService.getGigApplications(
    req.params.gigId,
    req.user.id,
    req.query
  );

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * Influencer tracks application history.
 */
const listMyApplications = asyncHandler(async (req, res) => {
  const result = await applicationService.getMyApplications(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * Brand accepts or declines applicant.
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const application = await applicationService.updateStatus(id, req.user.id, status);

  const message = status === 'ACCEPTED'
    ? 'Applicant accepted! 🎊 An email and in-app notification have been sent.'
    : 'Applicant declined. Keep looking!';

  res.status(200).json({
    success: true,
    data: application,
    message,
  });
});

/**
 * Fetch the DM thread for an approved collaboration.
 */
const listMessages = asyncHandler(async (req, res) => {
  const messages = await applicationService.getMessages(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: messages,
  });
});

/**
 * Send a message within an approved collaboration's thread.
 */
const sendMessage = asyncHandler(async (req, res) => {
  const message = await applicationService.sendMessage(req.params.id, req.user.id, req.body.content);

  res.status(201).json({
    success: true,
    data: message,
  });
});

module.exports = {
  apply,
  listApplicants,
  listMyApplications,
  updateStatus,
  listMessages,
  sendMessage,
};
