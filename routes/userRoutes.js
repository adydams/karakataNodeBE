const router = require("express").Router();
const { auth, ensureActive } = require("../middlewares/auth");
const UserCtrl = require("../controllers/userController");

/**
 * @swagger
 * tags: [Users]
 */

/** GET profile */
router.get("/me", auth, ensureActive, UserCtrl.getProfile);

/** PUT update profile */
router.put("/me", auth, ensureActive, UserCtrl.updateProfile);

/** POST add address */
router.post("/me/addresses", auth, ensureActive, UserCtrl.addAddress);

/** DELETE address */
router.delete("/me/addresses/:addressId", auth, ensureActive, UserCtrl.deleteAddress);

module.exports = router;
