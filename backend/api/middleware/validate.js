import { validationResult } from 'express-validator';
import { STATUS_CODES, MESSAGES } from '../../config/constants.js';

/**
 * Validation middleware
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: MESSAGES.VALIDATION_ERROR,
      errors: errors.array(),
    });
  }

  next();
};

export default validate;
