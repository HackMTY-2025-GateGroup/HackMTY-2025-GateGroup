import { STATUS_CODES, MESSAGES, OTP_CONFIG } from '../config/constants.js';
import { generateOTP, sendOTPEmail } from '../services/otpService.js';

// In-memory OTP store to avoid DB dependency (no 'otps' table in schema)
// Structure: Map<email, { otp, purpose, expires_at: ISO, attempts, verified, created_at: ISO }>
const otpStore = new Map();

/**
 * Generate and send OTP
 */
export const sendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRE_MINUTES * 60 * 1000);

    // Store OTP in memory
    const record = {
      otp,
      purpose: purpose || 'verification',
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      verified: false,
      created_at: new Date().toISOString(),
    };
    otpStore.set(email, record);

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, purpose);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: MESSAGES.OTP_SENT,
      data: {
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Retrieve OTP from memory
    const otpRecord = otpStore.get(email);
    if (!otpRecord || otpRecord.verified !== false || otpRecord.otp !== otp) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.OTP_INVALID,
      });
    }

    // Check if OTP has expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.OTP_EXPIRED,
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Maximum verification attempts exceeded',
      });
    }

    // Mark OTP as verified in memory
    otpStore.set(email, { ...otpRecord, verified: true, verified_at: new Date().toISOString() });

    res.status(STATUS_CODES.SUCCESS).json({
      success: true,
      message: MESSAGES.OTP_VERIFIED,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Invalidate previous OTPs in memory
    if (otpStore.has(email)) {
      const old = otpStore.get(email);
      otpStore.set(email, { ...old, verified: true });
    }

    // Generate new OTP
    return sendOTP(req, res);
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(STATUS_CODES.INTERNAL_ERROR).json({
      success: false,
      message: MESSAGES.ERROR,
      error: error.message,
    });
  }
};

export default {
  sendOTP,
  verifyOTP,
  resendOTP,
};
