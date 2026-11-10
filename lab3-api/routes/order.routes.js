/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Order and inventory management
 *
 * components:
 *   schemas:
 *     OrderInput:
 *       type: object
 *       required: [customerId, items]
 *       properties:
 *         customerId:
 *           type: integer
 *           example: 1
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *     OrderStatusInput:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *
 * /v1/orders:
 *   post:
 *     summary: Create an order and deduct product stock
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Invalid items or insufficient stock
 *       404:
 *         description: Customer or product not found
 *   get:
 *     summary: List orders with filters and pagination
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       400:
 *         description: Invalid filter or pagination value
 *
 * /v1/orders/analytics/sales-summary:
 *   get:
 *     summary: Summarize completed-order sales
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Revenue, average order value, and top-selling products
 *
 * /v1/orders/{id}:
 *   get:
 *     summary: Get order details and line items
 *     tags: [Orders]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Order details retrieved
 *       400:
 *         description: Malformed order ID
 *       404:
 *         description: Order not found
 *   delete:
 *     summary: Delete an order and restore its stock when applicable
 *     tags: [Orders]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Order deleted
 *       400:
 *         description: Malformed order ID
 *       404:
 *         description: Order not found
 *
 * /v1/orders/{id}/status:
 *   patch:
 *     summary: Change order status and restore stock on cancellation
 *     tags: [Orders]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderStatusInput'
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status or already-cancelled order
 *       404:
 *         description: Order not found
 */
const express = require('express');
const orderController = require('../controllers/order.controller');

const router = express.Router();

router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/analytics/sales-summary', orderController.getSalesSummary);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
