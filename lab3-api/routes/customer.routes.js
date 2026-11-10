/**
 * @swagger
 * tags:
 *   - name: Customers
 *     description: Customer order history
 *
 * /v1/customers/{id}/order-history:
 *   get:
 *     summary: Get customer order history and completed-order spend
 *     tags: [Customers]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Customer order history retrieved
 *       400:
 *         description: Malformed customer ID
 *       404:
 *         description: Customer not found
 */
const express = require('express');
const customerController = require('../controllers/customer.controller');

const router = express.Router();

router.get('/:id/order-history', customerController.getOrderHistory);

module.exports = router;
