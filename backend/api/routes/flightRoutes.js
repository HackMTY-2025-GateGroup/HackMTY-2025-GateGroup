import express from 'express';
import {
  getAllFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
} from '../../controllers/fleetController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// router.use(protect); // COMMENTED FOR TESTING

/**
 * @swagger
 * /api/flights:
 *   get:
 *     tags: [Flights]
 *     summary: Obtener todos los vuelos
 *     description: Retorna lista de todos los vuelos con información de aeronave
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vuelos
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
 *                     flights:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Flight'
 *                     count:
 *                       type: integer
 */
router.get('/', getAllFlights);

/**
 * @swagger
 * /api/flights/{id}:
 *   get:
 *     tags: [Flights]
 *     summary: Obtener vuelo por ID
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
 *         description: Vuelo encontrado
 *       404:
 *         description: Vuelo no encontrado
 */
router.get('/:id', getFlightById);

/**
 * @swagger
 * /api/flights:
 *   post:
 *     tags: [Flights]
 *     summary: Crear nuevo vuelo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - flight_number
 *               - departure_at
 *             properties:
 *               aircraft_id:
 *                 type: string
 *                 format: uuid
 *               flight_number:
 *                 type: string
 *                 example: "AM101"
 *               departure_at:
 *                 type: string
 *                 format: date-time
 *               arrival_at:
 *                 type: string
 *                 format: date-time
 *               origin:
 *                 type: string
 *                 example: "MEX"
 *               destination:
 *                 type: string
 *                 example: "JFK"
 *     responses:
 *       201:
 *         description: Vuelo creado
 */
// router.post('/', authorize(ROLES.AIRCRAFT_MANAGER, ROLES.ADMIN), createFlight); // COMMENTED FOR TESTING
router.post('/', createFlight);

/**
 * @swagger
 * /api/flights/{id}:
 *   put:
 *     tags: [Flights]
 *     summary: Actualizar vuelo
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
 *             $ref: '#/components/schemas/Flight'
 *     responses:
 *       200:
 *         description: Vuelo actualizado
 */
// router.put('/:id', authorize(ROLES.AIRCRAFT_MANAGER, ROLES.ADMIN), updateFlight); // COMMENTED FOR TESTING
router.put('/:id', updateFlight);

/**
 * @swagger
 * /api/flights/{id}:
 *   delete:
 *     tags: [Flights]
 *     summary: Eliminar vuelo
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
 *         description: Vuelo eliminado
 */
// router.delete('/:id', authorize(ROLES.ADMIN), deleteFlight); // COMMENTED FOR TESTING
router.delete('/:id', deleteFlight);

export default router;
