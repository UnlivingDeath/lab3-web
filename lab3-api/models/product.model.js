// Mongoose schema definition for Product
const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
name: {
type: String,
required: [true, 'Product name cannot be empty'],
trim: true
},
category: {
type: String,
required: [true, 'Category is required'],
enum: ['Electronics', 'Audio', 'Accessories']
},
price: {
type: Number,
required: [true, 'Product price is required'],
min: [0, 'Product price cannot be negative']
},
stock: {
type: Number,
default: 0
},
description: {
type: String,
trim: true
}
}, { timestamps: true });
module.exports = mongoose.model('Product', productSchema)