const express = require('express');
const SubCategoryController = require('../controllers/subCategoryController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SubCategories
 *   description: API for managing subcategories
 */

/**
 * @swagger
 * /api/subcategories:
 *   post:
 *     summary: Create a new subcategory
 *     tags: [SubCategories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - name
 *             properties:
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: SubCategory created successfully
 *       400:
 *         description: Invalid request
 */
router.post('/', SubCategoryController.create);

/**
 * @swagger
 * /api/subcategories:
 *   get:
 *     summary: Get all subcategories
 *     tags: [SubCategories]
 *     responses:
 *       200:
 *         description: List of subcategories
 */
router.get('/', SubCategoryController.getAll);

/**
 * @swagger
 * /api/subcategories/{id}:
 *   get:
 *     summary: Get subcategory by ID
 *     tags: [SubCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: SubCategory found
 *       404:
 *         description: SubCategory not found
 */
router.get('/:id', SubCategoryController.getById);

/**
 * @swagger
 * /api/subcategories/{id}:
 *   put:
 *     summary: Update a subcategory
 *     tags: [SubCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: SubCategory updated
 *       404:
 *         description: SubCategory not found
 */
router.put('/:id', SubCategoryController.update);

/**
 * @swagger
 * /api/subcategories/{id}:
 *   delete:
 *     summary: Delete a subcategory
 *     tags: [SubCategories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: SubCategory deleted
 *       404:
 *         description: SubCategory not found
 */
router.delete('/:id', SubCategoryController.delete);

module.exports = router;
