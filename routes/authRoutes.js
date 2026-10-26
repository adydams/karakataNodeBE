const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const passport = require("passport");
const setupPassport = require("../config/passport");
const { auth, ensureActive } = require("../middlewares/auth");

setupPassport();
router.use(passport.initialize());

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);

// Social Auth - Initiation
router.get("/google", authCtrl.googleAuth);
router.get("/facebook", authCtrl.facebookAuth);
router.get("/twitter", authCtrl.twitterAuth);
router.get("/instagram", authCtrl.instagramAuth);

// Social Auth - Callbacks
router.get("/google/callback", authCtrl.googleCallback);
router.get("/facebook/callback", authCtrl.socialCallback("facebook"));
router.get("/twitter/callback", authCtrl.socialCallback("twitter"));
router.get("/instagram/callback", authCtrl.socialCallback("instagram"));

router.get("/me", auth, ensureActive, authCtrl.me);
router.put("/profile", auth, authCtrl.updateProfile);
router.post("/logout", auth, authCtrl.logout);

router.post("/complete-reset", authCtrl.completePasswordReset);
router.post("/reset-password", ensureActive, authCtrl.resetPassword);
router.get("/verify-email", authCtrl.verifyEmail);

module.exports = router;
