// User roles
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
  GUEST: 'guest',
};

// User permissions
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  UPDATE: 'update',
  ADMIN: 'admin',
};

// OTP configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRE_MINUTES: parseInt(process.env.OTP_EXPIRE_MINUTES) || 10,
  MAX_ATTEMPTS: 5,
};

// Status codes
export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

// Response messages
export const MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'An error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  INVALID_CREDENTIALS: 'Invalid credentials',
  OTP_SENT: 'OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully',
  OTP_EXPIRED: 'OTP has expired',
  OTP_INVALID: 'Invalid OTP',
};

export default {
  ROLES,
  PERMISSIONS,
  OTP_CONFIG,
  STATUS_CODES,
  MESSAGES,
};
