const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many requests from this device. Please rest a minute and try again.', 429, 'RATE_LIMITED'));
  },
});

module.exports = {
  generalLimiter,
};
