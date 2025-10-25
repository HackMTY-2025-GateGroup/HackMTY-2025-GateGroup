import express from 'express';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from '../../controllers/supplierController.js';

const router = express.Router();

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Obtener todas las órdenes de compra
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por estado
 *       - in: query
 *         name: supplier_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por proveedor
 *     responses:
 *       200:
 *         description: Lista de órdenes de compra
 */
router.get('/', getAllPurchaseOrders);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Obtener orden de compra por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Orden de compra encontrada
 */
router.get('/:id', getPurchaseOrderById);

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Crear nueva orden de compra
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - items
 *             properties:
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               created_by:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: object
 *                 description: JSON con los productos y cantidades
 *               status:
 *                 type: string
 *                 default: draft
 *                 example: "draft"
 *     responses:
 *       201:
 *         description: Orden de compra creada
 */
router.post('/', createPurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     tags: [Purchase Orders]
 *     summary: Actualizar orden de compra
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Orden actualizada
 */
router.put('/:id', updatePurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     tags: [Purchase Orders]
 *     summary: Eliminar orden de compra
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Orden eliminada
 */
router.delete('/:id', deletePurchaseOrder);

export default router;
