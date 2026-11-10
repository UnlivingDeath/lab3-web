const Category = require('../models/category.model');
const slugify = require('../utils/slugify');

const SORT_FIELDS = new Set(['name', 'createdAt', 'updatedAt']);

exports.getAllCategories = async (req, res, next) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 5, 1), 100);
        const sortOption = typeof req.query.sort === 'string' ? req.query.sort : '-createdAt';
        const sortField = sortOption.startsWith('-') ? sortOption.slice(1) : sortOption;
        const sort = SORT_FIELDS.has(sortField)
            ? { [sortField]: sortOption.startsWith('-') ? -1 : 1 }
            : { createdAt: -1 };
        const skip = (page - 1) * limit;
        const [totalCategories, categories] = await Promise.all([
            Category.countDocuments(),
            Category.find().sort(sort).skip(skip).limit(limit)
        ]);

        res.status(200).json({
            success: true,
            count: categories.length,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCategories / limit),
                totalItems: totalCategories
            },
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

exports.getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const category = await Category.create({
            name: req.body.name.trim(),
            description: req.body.description
        });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const update = {};
        if (req.body.name !== undefined) {
            update.name = req.body.name.trim();
            update.slug = slugify(update.name);
        }
        if (req.body.description !== undefined) {
            update.description = req.body.description;
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        next(error);
    }
};
