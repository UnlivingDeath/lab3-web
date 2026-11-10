/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management endpoints
 *
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: Laptop Dell XPS 15
 *         category:
 *           type: string
 *           enum: [Electronics, Audio, Accessories]
 *         price:
 *           type: number
 *           example: 35000000
 *         stock:
 *           type: integer
 *           example: 10
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ProductInput:
 *       type: object
 *       required: [name, category, price]
 *       properties:
 *         name:
 *           type: string
 *         category:
 *           type: string
 *           enum: [Electronics, Audio, Accessories]
 *         price:
 *           type: number
 *           minimum: 0
 *         stock:
 *           type: integer
 *         description:
 *           type: string
 *     ProductUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         category:
 *           type: string
 *           enum: [Electronics, Audio, Accessories]
 *         price:
 *           type: number
 *           minimum: 0
 *         stock:
 *           type: integer
 *         description:
 *           type: string
 *
 * /products:
 *   get:
 *     summary: List products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid product data
 *
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Malformed product ID
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update product fields
 *     description: Updates the supplied fields; behaves like a partial update.
 *     tags: [Products]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdateInput'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Invalid product data or malformed ID
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       400:
 *         description: Malformed product ID
 *       404:
 *         description: Product not found
 */
const express = require('express');
const productController = require('../controllers/product.controller');

const router = express.Router();

router.get('/', productController.getAllProducts);
router.post('/', productController.createProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
