const router = require("express").Router();
const { auth } = require("../middlewares/auth");
const FavCtrl = require("../controllers/favoriteController");

/**
 * @swagger
 * tags: [Favorites]
 */

router.get("/", auth, FavCtrl.list);
router.post("/", auth, FavCtrl.add);                 // body: { productId }
router.delete("/:productId", auth, FavCtrl.remove);  // path: productId

module.exports = router;
