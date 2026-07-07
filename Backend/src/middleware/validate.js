const AppError = require('../utils/AppError');

/**
 * Validates request body against a Zod schema.
 * @param {import('zod').ZodSchema} schema 
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const errorMessages = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        
        return next(new AppError(`Validation failed: ${errorMessages}`, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  };
};

module.exports = validate;
