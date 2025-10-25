import nodemailer from 'nodemailer';
import { OTP_CONFIG } from '../config/constants.js';

/**
 * Generate a random OTP
 */
export const generateOTP = () => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < OTP_CONFIG.LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send OTP via email
 */
export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"GateGroup" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your OTP Code - ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: white; border: 2px solid #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; color: #667eea; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 OTP Verification</h1>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p>You requested an OTP for <strong>${purpose}</strong>.</p>
              <p>Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              <div class="warning">
                ⚠️ This code will expire in ${OTP_CONFIG.EXPIRE_MINUTES} minutes.
              </div>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} GateGroup. All rights reserved.</p>
              <p>HackMTY 2025</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

export default {
  generateOTP,
  sendOTPEmail,
};
