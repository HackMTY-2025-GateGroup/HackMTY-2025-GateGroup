import express from 'express';
import { body } from 'express-validator';
import { sendOTP, verifyOTP, resendOTP } from '../../controllers/otpController.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation rules
const otpValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
];

const verifyValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

// Routes
router.post('/send', otpValidation, validate, sendOTP);
router.post('/verify', verifyValidation, validate, verifyOTP);
router.post('/resend', otpValidation, validate, resendOTP);

export default router;
