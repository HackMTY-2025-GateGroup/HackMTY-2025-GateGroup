import express from 'express';
import {
  getAllAlerts,
  acknowledgeAlert,
} from '../../controllers/fleetController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// router.use(protect); // COMMENTED FOR TESTING

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: Obtener todas las alertas de caducidad
 *     description: Retorna lista de alertas con filtros opcionales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *         description: Filtrar por nivel de alerta
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *         description: Filtrar por alertas reconocidas/no reconocidas
 *     responses:
 *       200:
 *         description: Lista de alertas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     alerts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ExpiryAlert'
 *                     count:
 *                       type: integer
 */
router.get('/', getAllAlerts);

/**
 * @swagger
 * /api/alerts/{id}/acknowledge:
 *   put:
 *     tags: [Alerts]
 *     summary: Reconocer una alerta
 *     description: Marca una alerta como reconocida por el usuario actual
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la alerta
 *     responses:
 *       200:
 *         description: Alerta reconocida exitosamente
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
 *                   example: Alert acknowledged successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     alert:
 *                       $ref: '#/components/schemas/ExpiryAlert'
 *       404:
 *         description: Alerta no encontrada
 */
router.put('/:id/acknowledge', acknowledgeAlert);

export default router;
