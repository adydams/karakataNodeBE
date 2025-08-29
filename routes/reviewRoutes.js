const router = require("express").Router();
const { auth } = require("../middlewares/auth");
const RevCtrl = require("../controllers/reviewController");

/**
 * @swagger
 * tags: [Reviews]
 */

router.get("/product/:productId", RevCtrl.listForProduct);
router.post("/", auth, RevCtrl.upsert);                  // body: { productId, rating, comment }
router.delete("/:productId", auth, RevCtrl.remove);      // delete own review for product

module.exports = router;
