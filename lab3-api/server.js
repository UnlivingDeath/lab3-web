// Main server entry point
const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const customerRoutes = require('./routes/customer.routes');
const app = express();
const PORT = 3000;
app.use(express.json());
const setupSwagger = require('./config/swagger');
setupSwagger(app);
app.get('/', (req, res) => {
   res.status(200).json({
       success: true,
       message: 'Lab 3 API is running',
       endpoints: {
           products: '/api/products',
           categories: '/api/categories',
           orders: '/api/v1/orders',
           documentation: '/api-docs'
       }
   });
});
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/customers', customerRoutes);

app.use((err, req, res, next) => {
   let status = err.status || err.statusCode || 500;
   let message = status === 500 ? 'Internal server error' : err.message;

   if (err.name === 'ValidationError') {
       status = 400;
       message = err.message;
   } else if (err.name === 'CastError') {
       status = 400;
       message = 'Malformed resource ID';
   } else if (err.code === 11000 || err.code === 'ER_DUP_ENTRY') {
       status = 409;
       message = err.keyPattern && (err.keyPattern.name || err.keyPattern.slug)
           ? 'Category name or slug already exists'
           : 'A resource with the same unique value already exists';
   }

   if (status >= 500) {
       console.error('Server Error:', err);
   }
   res.status(status).json({ success: false, error: message || 'Internal server error' });
});

if (require.main === module) {
   mongoose.connect('mongodb://127.0.0.1:27017/shop_lab3_db')
       .then(() => {
           app.listen(PORT, () => console.log(`Server API is running at: http://localhost:${PORT}`));
       })
       .catch((error) => {
           console.error('MongoDB connection failed:', error.message);
           process.exitCode = 1;
       });
}

module.exports = app;
