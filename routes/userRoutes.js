const router = require("express").Router();
const { auth } = require("../middlewares/auth");
const UserCtrl = require("../controllers/userController");

/**
 * @swagger
 * tags: [Users]
 */

/** GET profile */
router.get("/me", auth, UserCtrl.getProfile);

/** PUT update profile */
router.put("/me", auth, UserCtrl.updateProfile);

/** POST add address */
router.post("/me/addresses", auth, UserCtrl.addAddress);

/** DELETE address */
router.delete("/me/addresses/:addressId", auth, UserCtrl.deleteAddress);

module.exports = router;
