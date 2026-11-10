/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Category management endpoints
 *
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: Home & Living
 *         slug:
 *           type: string
 *           example: home-living
 *         description:
 *           type: string
 *           example: Home furnishings and decor
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CategoryInput:
 *       type: object
 *       required: [name]
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           example: Home & Living
 *         description:
 *           type: string
 *           example: Home furnishings and decor
 *     CategoryPatchInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *         description:
 *           type: string
 *
 * /categories:
 *   get:
 *     summary: List categories
 *     tags: [Categories]
 *     parameters:
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
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, -name, createdAt, -createdAt, updatedAt, -updatedAt]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid category data
 *       409:
 *         description: Category name or slug already exists
 *
 * /categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Malformed category ID
 *       404:
 *         description: Category not found
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid category data or malformed ID
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name or slug already exists
 *   patch:
 *     summary: Partially update a category
 *     tags: [Categories]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryPatchInput'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid category data or malformed ID
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name or slug already exists
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Malformed category ID
 *       404:
 *         description: Category not found
 */
const express = require('express');
const categoryController = require('../controllers/category.controller');
const slugify = require('../utils/slugify');

const router = express.Router();

const validateCategoryInput = ({ partial = false } = {}) => (req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ success: false, message: 'Request body must be a JSON object' });
    }

    const allowedFields = new Set(['name', 'description']);
    if (Object.keys(req.body).some((field) => !allowedFields.has(field))) {
        return res.status(400).json({ success: false, message: 'Only name and description can be changed' });
    }

    if (!partial && !Object.hasOwn(req.body, 'name')) {
        return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    if (partial && Object.keys(req.body).length === 0) {
        return res.status(400).json({ success: false, message: 'Provide at least one category field to update' });
    }
    if (Object.hasOwn(req.body, 'name')
        && (typeof req.body.name !== 'string' || req.body.name.trim().length < 3)) {
        return res.status(400).json({
            success: false,
            message: 'Category name must be at least 3 characters long'
        });
    }
    if (Object.hasOwn(req.body, 'name') && !slugify(req.body.name.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Category name must contain at least one letter or number'
        });
    }
    if (Object.hasOwn(req.body, 'description') && typeof req.body.description !== 'string') {
        return res.status(400).json({ success: false, message: 'Category description must be a string' });
    }

    next();
};

router.get('/', categoryController.getAllCategories);
router.post('/', validateCategoryInput(), categoryController.createCategory);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', validateCategoryInput(), categoryController.updateCategory);
router.patch('/:id', validateCategoryInput({ partial: true }), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
