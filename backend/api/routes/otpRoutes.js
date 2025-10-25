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

/**
 * @swagger
 * /api/otp/send:
 *   post:
 *     tags: [OTP]
 *     summary: Enviar código OTP
 *     description: Envía un código OTP al email especificado para verificación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *     responses:
 *       200:
 *         description: OTP enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
 *       400:
 *         description: Email inválido
 */
router.post('/send', otpValidation, validate, sendOTP);

/**
 * @swagger
 * /api/otp/verify:
 *   post:
 *     tags: [OTP]
 *     summary: Verificar código OTP
 *     description: Valida un código OTP enviado previamente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verificado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *       400:
 *         description: OTP inválido o expirado
 */
router.post('/verify', verifyValidation, validate, verifyOTP);

/**
 * @swagger
 * /api/otp/resend:
 *   post:
 *     tags: [OTP]
 *     summary: Reenviar código OTP
 *     description: Reenvía un nuevo código OTP al email especificado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *     responses:
 *       200:
 *         description: Nuevo OTP enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP resent successfully
 *       400:
 *         description: Email inválido
 */
router.post('/resend', otpValidation, validate, resendOTP);

export default router;
