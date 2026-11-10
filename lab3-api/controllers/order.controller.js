const OrderService = require('../services/order.service');

exports.createOrder = async (req, res, next) => {
    try {
        const order = await OrderService.createOrder(req.body.customerId, req.body.items);
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        const result = await OrderService.getOrders(req.query);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.getOrderById = async (req, res, next) => {
    try {
        const order = await OrderService.getOrderById(req.params.id);
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const result = await OrderService.updateOrderStatus(
            req.params.id,
            req.body && req.body.status
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.deleteOrder = async (req, res, next) => {
    try {
        const result = await OrderService.deleteOrder(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.getSalesSummary = async (req, res, next) => {
    try {
        const summary = await OrderService.getSalesSummary();
        res.status(200).json(summary);
    } catch (error) {
        next(error);
    }
};
