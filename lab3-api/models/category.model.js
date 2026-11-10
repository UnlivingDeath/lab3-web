const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        minlength: [3, 'Category name must be at least 3 characters long'],
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        trim: true
    }
}, { timestamps: true });

categorySchema.pre('save', function() {
    if (this.isModified('name')) {
        this.slug = slugify(this.name);
    }
});

module.exports = mongoose.model('Category', categorySchema);
