// Request handlers for the Product API
const Product = require('../models/product.model');
// 1. GET /api/products - List products (filters & pagination)
exports.getAllProducts = async (req, res, next) => {
try {
const { category, minPrice, maxPrice } = req.query;
// Query values are strings: convert them and fall back to safe defaults
const page = Math.max(Number(req.query.page) || 1, 1);
const limit = Math.max(Number(req.query.limit) || 5, 1);
const query = {};
if (category) query.category = category;
if (minPrice || maxPrice) {
query.price = {};
if (minPrice) query.price.$gte = Number(minPrice);
if (maxPrice) query.price.$lte = Number(maxPrice);
}
const skip = (page - 1) * limit;
const totalProducts = await Product.countDocuments(query);
const products = await Product.find(query)
.sort({ createdAt: -1 })
.skip(skip)
.limit(limit);
res.status(200).json({
success: true,
count: products.length,
pagination: {
currentPage: page,
totalPages: Math.ceil(totalProducts / limit),
totalProducts
},
data: products
});
} catch (error) {
next(error);
}
};
// 2. GET /api/products/:id - Get product details by ID
exports.getProductById = async (req, res, next) => {
try {
const product = await Product.findById(req.params.id);
if (!product) {
return res.status(404).json({ success: false, message: 'No product found with the given ID' });
}
res.status(200).json({ success: true, data: product });
} catch (error) {
next(error);
}
};
// 3. POST /api/products - Create a new product
exports.createProduct = async (req, res, next) => {
try {
const newProduct = await Product.create(req.body);
res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct });
} catch (error) {
next(error);
}
};
// 4. PUT /api/products/:id - Update a product by ID
// Note: findByIdAndUpdate only changes the fields that are sent (PATCH-like).
// A strict PUT would replace the whole document (e.g. findOneAndReplace).
exports.updateProduct = async (req, res, next) => {
try {
const updatedProduct = await Product.findByIdAndUpdate(
req.params.id,
req.body,
{ new: true, runValidators: true }
);
if (!updatedProduct) {
return res.status(404).json({ success: false, message: 'No product found to update' });
}
res.status(200).json({ success: true, message: 'Product updated successfully', data: updatedProduct });
} catch (error) {
next(error);
}
};
// 5. DELETE /api/products/:id - Delete a product by ID
exports.deleteProduct = async (req, res, next) => {
try {
const deletedProduct = await Product.findByIdAndDelete(req.params.id);
if (!deletedProduct) {
return res.status(404).json({ success: false, message: 'No product found to delete' });
}
res.status(200).json({ success: true, message: 'Product deleted successfully' });
} catch (error) {
next(error);
}
};
