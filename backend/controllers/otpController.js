import { supabase } from '../config/supabase.js';
import { STATUS_CODES, MESSAGES, OTP_CONFIG } from '../config/constants.js';
import { generateOTP, sendOTPEmail } from '../services/otpService.js';

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

    // Store OTP in database
    const { data, error } = await supabase
      .from('otps')
      .insert([
        {
          email,
          otp,
          purpose: purpose || 'verification',
          expires_at: expiresAt.toISOString(),
          attempts: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error storing OTP:', error);
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error generating OTP',
        error: error.message,
      });
    }

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
        otpId: data.id,
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

    // Find the latest OTP for this email
    const { data: otpRecord, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !otpRecord) {
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

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otps')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    if (updateError) {
      return res.status(STATUS_CODES.INTERNAL_ERROR).json({
        success: false,
        message: 'Error verifying OTP',
        error: updateError.message,
      });
    }

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

    // Invalidate previous OTPs
    await supabase
      .from('otps')
      .update({ verified: true })
      .eq('email', email)
      .eq('verified', false);

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
