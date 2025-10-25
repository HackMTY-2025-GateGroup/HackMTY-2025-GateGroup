import { STATUS_CODES, MESSAGES } from '../../config/constants.js';

/**
 * 404 Not Found middleware
 */
export const notFound = (req, res, next) => {
  res.status(STATUS_CODES.NOT_FOUND).json({
    success: false,
    message: MESSAGES.NOT_FOUND,
    path: req.originalUrl,
  });
};

export default notFound;
