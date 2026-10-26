const express = require("express");
const ProductController = require("../controllers/productController");
const { 
  authenticate, 
  ensureActive, 
  authorizeRole 
} = require("../middlewares/auth");

const multer = require("multer");

const router = express.Router();


// Temporary storage before Cloudinary upload
const upload = multer({
  dest: "uploads/"
});


/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management APIs
 */


/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - categoryId
 *               - subCategoryId
 *               - storeId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *               categoryId:
 *                 type: string
 *               subCategoryId:
 *                 type: string
 *               storeId:
 *                 type: string
 *               brandId:
 *                 type: string
 *               weightKg:
 *                 type: number
 *               pickupStationId:
 *                 type: string
 *               pickupStations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     stationId:
 *                       type: string
 *                     initialStock:
 *                       type: integer
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *
 */
router.post(
  "/",
  authenticate,
  ensureActive,
  //authorizeRole("Admin","SuperAdmin"),
  upload.array("images",5),
  ProductController.create
);



/**
 * @swagger
 * /api/products/featured-discounts:
 *   get:
 *     summary: Get random products with active discounts
 *     tags: [Products]
 */
router.get(
  "/featured-discounts",
  ProductController.getFeaturedDiscounts
);
router.get("/advertised-discounts", ProductController.getAdvertisedDiscounts);

router.get("/admin/pending-approvals", authenticate, authorizeRole("Admin", "SuperAdmin", "SystemAdmin"), ProductController.pendingApprovals);
router.patch("/:id/approval", authenticate, authorizeRole("Admin", "SuperAdmin", "SystemAdmin"), ProductController.decideApproval);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 */
router.get(
  "/",
  ProductController.getAll
);



/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by id
 *     tags: [Products]
 */
router.get(
  "/:id",
  ProductController.getById
);



/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *               pickupStationId:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 */
router.put(
  "/:id",
  authenticate,
  ensureActive,
  authorizeRole("Admin", "SuperAdmin", "SystemAdmin"),
  upload.array("images", 5),
  ProductController.update
);



/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Soft delete product
 *     tags: [Products]
 */
router.delete(
  "/:id",
  authenticate,
  ensureActive,
  authorizeRole("Admin", "SuperAdmin", "SystemAdmin"),
  ProductController.delete
);



module.exports = router;