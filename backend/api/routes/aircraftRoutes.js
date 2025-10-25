import express from 'express';
import {
  getAllAircrafts,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
} from '../../controllers/fleetController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/aircrafts:
 *   get:
 *     tags: [Aircrafts]
 *     summary: Obtener todas las aeronaves
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de aeronaves
 */
router.get('/', getAllAircrafts);

/**
 * @swagger
 * /api/aircrafts/{id}:
 *   get:
 *     tags: [Aircrafts]
 *     summary: Obtener aeronave por ID
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
 *         description: Aeronave encontrada
 */
router.get('/:id', getAircraftById);

/**
 * @swagger
 * /api/aircrafts:
 *   post:
 *     tags: [Aircrafts]
 *     summary: Crear nueva aeronave
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tail_number
 *             properties:
 *               tail_number:
 *                 type: string
 *                 example: "XA-ABC"
 *               model:
 *                 type: string
 *                 example: "Boeing 737"
 *               capacity:
 *                 type: integer
 *                 example: 180
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Aeronave creada
 */
router.post('/', authorize(ROLES.AIRCRAFT_MANAGER, ROLES.ADMIN), createAircraft);

/**
 * @swagger
 * /api/aircrafts/{id}:
 *   put:
 *     tags: [Aircrafts]
 *     summary: Actualizar aeronave
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
 *             $ref: '#/components/schemas/Aircraft'
 *     responses:
 *       200:
 *         description: Aeronave actualizada
 */
router.put('/:id', authorize(ROLES.AIRCRAFT_MANAGER, ROLES.ADMIN), updateAircraft);

/**
 * @swagger
 * /api/aircrafts/{id}:
 *   delete:
 *     tags: [Aircrafts]
 *     summary: Eliminar aeronave
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
 *         description: Aeronave eliminada
 */
router.delete('/:id', authorize(ROLES.ADMIN), deleteAircraft);

export default router;
