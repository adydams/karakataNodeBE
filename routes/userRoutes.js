const router = require("express").Router();
const { auth, ensureActive } = require("../middlewares/auth");
const UserCtrl = require("../controllers/userController");
const { uploadUser } = require("../middlewares/upload");

/**
 * @swagger
 * tags: [Users]
 */

/** GET profile */
router.get("/me", auth, ensureActive, UserCtrl.getProfile);

/** PUT update profile */
router.put("/me", auth, ensureActive, UserCtrl.updateProfile);

/** POST update profile picture */
router.post("/me/profile-picture", auth, ensureActive, uploadUser.single("image"), UserCtrl.uploadProfilePicture);

/** POST add address */
router.post("/me/addresses", auth, ensureActive, UserCtrl.addAddress);

/** DELETE address */
router.delete("/me/addresses/:addressId", auth, ensureActive, UserCtrl.deleteAddress);

/** GET recent activity */
router.get("/me/activity", auth, ensureActive, UserCtrl.getActivity);

module.exports = router;
