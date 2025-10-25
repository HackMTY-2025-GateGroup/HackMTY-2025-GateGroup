import express from 'express';
import {
  getAllInventories,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getAllMovements,
  createMovement,
} from '../../controllers/inventoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// All routes require authentication
// router.use(protect); // COMMENTED FOR TESTING

/**
 * @swagger
 * /api/inventories:
 *   get:
 *     tags: [Inventories]
 *     summary: Obtener todos los inventarios
 *     description: Retorna una lista de todos los inventarios con filtros opcionales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location_type
 *         schema:
 *           type: string
 *           enum: [general, trolley, flight, lounge, aircraft_storage]
 *         description: Filtrar por tipo de ubicación
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID de ubicación
 *     responses:
 *       200:
 *         description: Lista de inventarios
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
 *                     inventories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Inventory'
 *                     count:
 *                       type: integer
 *       401:
 *         description: No autorizado
 */
router.get('/', getAllInventories);

/**
 * @swagger
 * /api/inventories/{id}:
 *   get:
 *     tags: [Inventories]
 *     summary: Obtener inventario por ID
 *     description: Retorna un inventario específico con sus items
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
 *         description: Inventario encontrado
 *       404:
 *         description: Inventario no encontrado
 */
router.get('/:id', getInventoryById);

/**
 * @swagger
 * /api/inventories:
 *   post:
 *     tags: [Inventories]
 *     summary: Crear nuevo inventario
 *     description: Crea un nuevo inventario en el sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location_type
 *             properties:
 *               location_type:
 *                 type: string
 *                 enum: [general, trolley, flight, lounge, aircraft_storage]
 *               location_id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inventario creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
// router.post('/', authorize(ROLES.INVENTORY_MANAGER, ROLES.ADMIN), createInventory); // COMMENTED FOR TESTING
router.post('/', createInventory);

/**
 * @swagger
 * /api/inventories/{id}:
 *   put:
 *     tags: [Inventories]
 *     summary: Actualizar inventario
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
 *               name:
 *                 type: string
 *               notes:
 *                 type: string
 *               location_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Inventario actualizado
 */
// router.put('/:id', authorize(ROLES.INVENTORY_MANAGER, ROLES.ADMIN), updateInventory); // COMMENTED FOR TESTING
router.put('/:id', updateInventory);

/**
 * @swagger
 * /api/inventories/{id}:
 *   delete:
 *     tags: [Inventories]
 *     summary: Eliminar inventario
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
 *         description: Inventario eliminado
 */
// router.delete('/:id', authorize(ROLES.ADMIN), deleteInventory); // COMMENTED FOR TESTING
router.delete('/:id', deleteInventory);

/**
 * @swagger
 * /api/inventories/{id}/items:
 *   get:
 *     tags: [Inventory Items]
 *     summary: Obtener items de un inventario
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
 *         description: Lista de items del inventario
 */
router.get('/:id/items', getInventoryItems);

/**
 * @swagger
 * /api/inventories/{id}/items:
 *   post:
 *     tags: [Inventory Items]
 *     summary: Agregar item a inventario
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - quantity
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               batch_id:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               expiry_date:
 *                 type: string
 *                 format: date
 *               min_stock:
 *                 type: integer
 *               max_stock:
 *                 type: integer
 *               storage_temp_celsius:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item agregado exitosamente
 */
// router.post('/:id/items', authorize(ROLES.INVENTORY_MANAGER, ROLES.ADMIN), addInventoryItem); // COMMENTED FOR TESTING
router.post('/:id/items', addInventoryItem);

/**
 * @swagger
 * /api/inventories/{id}/items/{itemId}:
 *   put:
 *     tags: [Inventory Items]
 *     summary: Actualizar item de inventario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
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
 *               quantity:
 *                 type: integer
 *               reserved:
 *                 type: integer
 *               expiry_date:
 *                 type: string
 *                 format: date
 *               storage_temp_celsius:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item actualizado
 */
// router.put('/:id/items/:itemId', authorize(ROLES.INVENTORY_MANAGER, ROLES.ADMIN), updateInventoryItem); // COMMENTED FOR TESTING
router.put('/:id/items/:itemId', updateInventoryItem);

/**
 * @swagger
 * /api/inventories/{id}/items/{itemId}:
 *   delete:
 *     tags: [Inventory Items]
 *     summary: Eliminar item de inventario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Item eliminado
 */
// router.delete('/:id/items/:itemId', authorize(ROLES.ADMIN), deleteInventoryItem); // COMMENTED FOR TESTING
router.delete('/:id/items/:itemId', deleteInventoryItem);

/**
 * @swagger
 * /api/inventories/movements:
 *   get:
 *     tags: [Movements]
 *     summary: Obtener todos los movimientos de inventario
 *     description: Retorna historial de movimientos con filtros opcionales
 *     parameters:
 *       - in: query
 *         name: inventory_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por inventario
 *       - in: query
 *         name: movement_type
 *         schema:
 *           type: string
 *           enum: [in, out, transfer, adjustment, waste, replenishment]
 *         description: Filtrar por tipo de movimiento
 *       - in: query
 *         name: flight_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por vuelo
 *     responses:
 *       200:
 *         description: Lista de movimientos
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
 *                     movements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryMovement'
 *                     count:
 *                       type: integer
 */
router.get('/movements', getAllMovements);

/**
 * @swagger
 * /api/inventories/movements:
 *   post:
 *     tags: [Movements]
 *     summary: Crear movimiento de inventario
 *     description: Registra un nuevo movimiento de inventario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inventory_id
 *               - qty_change
 *               - movement_type
 *             properties:
 *               item_id:
 *                 type: string
 *                 format: uuid
 *               inventory_id:
 *                 type: string
 *                 format: uuid
 *               performed_by:
 *                 type: string
 *                 format: uuid
 *               qty_change:
 *                 type: integer
 *                 example: 10
 *               movement_type:
 *                 type: string
 *                 enum: [in, out, transfer, adjustment, waste, replenishment]
 *               from_inventory:
 *                 type: string
 *                 format: uuid
 *               to_inventory:
 *                 type: string
 *                 format: uuid
 *               flight_id:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movimiento creado
 */
router.post('/movements', createMovement);

export default router;
