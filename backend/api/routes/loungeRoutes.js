import express from 'express';
import {
  getAllLounges,
  getLoungeById,
  createLounge,
  updateLounge,
  deleteLounge,
} from '../../controllers/loungeController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// router.use(protect); // COMMENTED FOR TESTING

/**
 * @swagger
 * /api/lounges:
 *   get:
 *     tags: [Lounges]
 *     summary: Obtener todas las salas
 *     description: Retorna lista de salas de aeropuerto con filtros opcionales
 *     parameters:
 *       - in: query
 *         name: airport_code
 *         schema:
 *           type: string
 *         description: Filtrar por código de aeropuerto
 *     responses:
 *       200:
 *         description: Lista de salas
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
 *                     lounges:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Lounge'
 *                     count:
 *                       type: integer
 */
router.get('/', getAllLounges);

/**
 * @swagger
 * /api/lounges/{id}:
 *   get:
 *     tags: [Lounges]
 *     summary: Obtener sala por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sala encontrada
 *       404:
 *         description: Sala no encontrada
 */
router.get('/:id', getLoungeById);

/**
 * @swagger
 * /api/lounges:
 *   post:
 *     tags: [Lounges]
 *     summary: Crear nueva sala
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - airport_code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "LOUNGE-MEX-01"
 *               name:
 *                 type: string
 *                 example: "VIP Sala Premier"
 *               airport_code:
 *                 type: string
 *                 example: "MEX"
 *               latitude:
 *                 type: number
 *                 example: 19.4363
 *               longitude:
 *                 type: number
 *                 example: -99.0721
 *               capacity:
 *                 type: integer
 *                 example: 150
 *     responses:
 *       201:
 *         description: Sala creada
 */
// router.post('/', authorize(ROLES.ADMIN, ROLES.INVENTORY_MANAGER), createLounge); // COMMENTED FOR TESTING
router.post('/', createLounge);

/**
 * @swagger
 * /api/lounges/{id}:
 *   put:
 *     tags: [Lounges]
 *     summary: Actualizar sala
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
 *             $ref: '#/components/schemas/Lounge'
 *     responses:
 *       200:
 *         description: Sala actualizada
 */
// router.put('/:id', authorize(ROLES.ADMIN, ROLES.INVENTORY_MANAGER), updateLounge); // COMMENTED FOR TESTING
router.put('/:id', updateLounge);

/**
 * @swagger
 * /api/lounges/{id}:
 *   delete:
 *     tags: [Lounges]
 *     summary: Eliminar sala
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sala eliminada
 */
// router.delete('/:id', authorize(ROLES.ADMIN), deleteLounge); // COMMENTED FOR TESTING
router.delete('/:id', deleteLounge);

export default router;
