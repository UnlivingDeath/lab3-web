const OrderService = require('../services/order.service');

exports.getOrderHistory = async (req, res, next) => {
    try {
        const history = await OrderService.getCustomerHistory(req.params.id);
        res.status(200).json(history);
    } catch (error) {
        next(error);
    }
};
