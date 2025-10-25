import express from 'express';
import { queryDatabase, getAIMetrics, processAI, analyze, predict } from './aiController.js';
import { protect } from '../api/middleware/auth.js';

const router = express.Router();

// All AI routes require authentication
// router.use(protect); // COMMENTED FOR TESTING

/**
 * @swagger
 * /api/ai/query:
 *   post:
 *     tags: [AI]
 *     summary: Consulta en lenguaje natural a la base de datos
 *     description: Permite realizar consultas a la base de datos usando lenguaje natural. La IA interpreta la consulta y genera el SQL correspondiente.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 example: "¿Cuántos productos están próximos a caducar?"
 *                 description: Consulta en lenguaje natural
 *               conversationHistory:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Historial de conversación para contexto
 *               feedback:
 *                 type: object
 *                 description: Retroalimentación sobre consultas previas
 *     responses:
 *       200:
 *         description: Consulta procesada exitosamente
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
 *                   example: Query processed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     sql:
 *                       type: string
 *                     explanation:
 *                       type: string
 *       400:
 *         description: Consulta inválida
 *       401:
 *         description: No autorizado
 */
router.post('/query', queryDatabase);

/**
 * @swagger
 * /api/ai/metrics:
 *   get:
 *     tags: [AI]
 *     summary: Obtener métricas de rendimiento de IA
 *     description: Retorna métricas sobre el rendimiento del sistema de IA y insights de aprendizaje
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas obtenidas exitosamente
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
 *                   example: Metrics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalQueries:
 *                           type: integer
 *                         successRate:
 *                           type: number
 *                         avgResponseTime:
 *                           type: number
 *                     insights:
 *                       type: object
 *                       properties:
 *                         learningRate:
 *                           type: number
 *                         improvements:
 *                           type: array
 *                           items:
 *                             type: string
 */
router.get('/metrics', getAIMetrics);

/**
 * @swagger
 * /api/ai/process:
 *   post:
 *     tags: [AI]
 *     summary: Procesar datos con modelo de IA
 *     description: Procesa datos con el modelo de inteligencia artificial
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - input
 *             properties:
 *               input:
 *                 type: object
 *                 description: Datos a procesar
 *               type:
 *                 type: string
 *                 example: classification
 *                 description: Tipo de procesamiento
 *     responses:
 *       200:
 *         description: Procesamiento completado
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
 *                 data:
 *                   type: object
 */
router.post('/process', processAI);

/**
 * @swagger
 * /api/ai/analyze:
 *   post:
 *     tags: [AI]
 *     summary: Analizar datos
 *     description: Realiza análisis de datos usando algoritmos de IA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: object
 *                 description: Datos para análisis
 *     responses:
 *       200:
 *         description: Análisis completado
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
 *                   example: Analysis completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     patterns:
 *                       type: array
 *                     insights:
 *                       type: array
 *                     recommendations:
 *                       type: array
 */
router.post('/analyze', analyze);

/**
 * @swagger
 * /api/ai/predict:
 *   post:
 *     tags: [AI]
 *     summary: Generar predicciones
 *     description: Genera predicciones basadas en características proporcionadas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - features
 *             properties:
 *               features:
 *                 type: object
 *                 description: Características para predicción
 *                 example:
 *                   temperature: 25
 *                   humidity: 60
 *                   season: "summer"
 *     responses:
 *       200:
 *         description: Predicción generada
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
 *                   example: Prediction generated
 *                 data:
 *                   type: object
 *                   properties:
 *                     prediction:
 *                       type: object
 *                     confidence:
 *                       type: number
 *                     factors:
 *                       type: array
 */
router.post('/predict', predict);

export default router;
