import express from 'express';
import {
  getAllTrolleys,
  getTrolleyById,
  createTrolley,
  updateTrolley,
  deleteTrolley,
} from '../../controllers/fleetController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/trolleys:
 *   get:
 *     tags: [Trolleys]
 *     summary: Obtener todos los trolleys
 *     description: Retorna lista de trolleys con filtros opcionales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ready, in-flight, returned, maintenance]
 *         description: Filtrar por estado
 *       - in: query
 *         name: flight_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por vuelo
 *     responses:
 *       200:
 *         description: Lista de trolleys
 */
router.get('/', getAllTrolleys);

/**
 * @swagger
 * /api/trolleys/{id}:
 *   get:
 *     tags: [Trolleys]
 *     summary: Obtener trolley por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Trolley encontrado
 */
router.get('/:id', getTrolleyById);

/**
 * @swagger
 * /api/trolleys:
 *   post:
 *     tags: [Trolleys]
 *     summary: Crear nuevo trolley
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "TROL-001"
 *               flight_id:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [ready, in-flight, returned, maintenance]
 *                 default: ready
 *     responses:
 *       201:
 *         description: Trolley creado
 */
router.post('/', authorize(ROLES.INVENTORY_MANAGER, ROLES.AIRCRAFT_MANAGER, ROLES.ADMIN), createTrolley);

/**
 * @swagger
 * /api/trolleys/{id}:
 *   put:
 *     tags: [Trolleys]
 *     summary: Actualizar trolley
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               flight_id:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [ready, in-flight, returned, maintenance]
 *               last_check:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Trolley actualizado
 */
router.put('/:id', authorize(ROLES.INVENTORY_MANAGER, ROLES.AIRCRAFT_MANAGER, ROLES.ADMIN), updateTrolley);

/**
 * @swagger
 * /api/trolleys/{id}:
 *   delete:
 *     tags: [Trolleys]
 *     summary: Eliminar trolley
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Trolley eliminado
 */
router.delete('/:id', authorize(ROLES.ADMIN), deleteTrolley);

export default router;
