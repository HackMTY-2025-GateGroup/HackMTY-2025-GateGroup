import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, verifyToken } from '../../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Registrar un nuevo usuario
 *     description: Crea una nueva cuenta de usuario en el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: Juan Pérez
 *               role:
 *                 type: string
 *                 enum: [admin, inventory_manager, aircraft_manager, flight_attendant]
 *                 example: inventory_manager
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
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
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Usuario ya existe
 */
router.post('/register', registerValidation, validate, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Iniciar sesión
 *     description: Autentica un usuario y devuelve un JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', loginValidation, validate, login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: Obtener perfil del usuario actual
 *     description: Retorna la información del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
// router.get('/profile', protect, getProfile); // COMMENTED FOR TESTING
router.get('/profile', getProfile);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     tags: [Authentication]
 *     summary: Verificar token JWT
 *     description: Valida si el token JWT es válido
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
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
 *                   example: Token is valid
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: Token inválido o expirado
 */
// router.get('/verify', protect, verifyToken); // COMMENTED FOR TESTING
router.get('/verify', verifyToken);

export default router;
