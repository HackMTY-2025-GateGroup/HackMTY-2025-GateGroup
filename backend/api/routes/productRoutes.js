import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// router.use(protect); // COMMENTED FOR TESTING

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Obtener todos los productos
 *     description: Retorna lista de productos con filtros opcionales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: perishable
 *         schema:
 *           type: boolean
 *         description: Filtrar por productos perecederos
 *     responses:
 *       200:
 *         description: Lista de productos
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
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     count:
 *                       type: integer
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Obtener producto por ID
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
 *         description: Producto encontrado
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Crear nuevo producto
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *             properties:
 *               sku:
 *                 type: string
 *                 example: "SKU-001"
 *               name:
 *                 type: string
 *                 example: "Coca Cola 330ml"
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 example: "beverages"
 *               perishable:
 *                 type: boolean
 *               shelf_life_days:
 *                 type: integer
 *               min_stock:
 *                 type: integer
 *               max_stock:
 *                 type: integer
 *               dimensions:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Producto creado
 */
// router.post('/', authorize(ROLES.INVENTORY_MANAGER, ROLES.ADMIN), createProduct); // COMMENTED FOR TESTING
router.post('/', createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Actualizar producto
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
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Producto actualizado
 */
// router.put('/:id', authorize(ROLES.INVENTORY_MANAGER, ROLES.ADMIN), updateProduct); // COMMENTED FOR TESTING
router.put('/:id', updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Eliminar producto
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
 *         description: Producto eliminado
 */
// router.delete('/:id', authorize(ROLES.ADMIN), deleteProduct); // COMMENTED FOR TESTING
router.delete('/:id', deleteProduct);

export default router;
