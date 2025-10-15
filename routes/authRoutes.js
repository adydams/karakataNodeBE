const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const passport = require("passport");
const setupPassport = require("../config/passport");
const { auth } = require("../middlewares/auth");

setupPassport();
router.use(passport.initialize());

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Bad request }
 */
router.post("/register", authCtrl.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email + password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Ok }
 */
router.post("/login", authCtrl.login);

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Start Google OAuth flow
 *     description: Redirects the user to Google for authentication.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google login page
 */
router.get("/google", authCtrl.googleAuth);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Google redirects back with code and state.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Authorization code returned from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: false
 *         description: State parameter for CSRF protection
 *     responses:
 *       302:
 *         description: Redirect to frontend with JWT token in query
 */
//router.get("/google/callback", authCtrl.googleCallback);

router.get("/google/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) return res.status(400).json({ error: "Missing code parameter" });

  try {
    // Exchange code for tokens
    const { data: tokens } = await axios.post(
      "https://oauth2.googleapis.com/token",
      qs.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "https://karakatanodebe.onrender.com/api/auth/google/callback",
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Fetch user profile
    const { data: profile } = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    res.json({ tokens, profile });
  } catch (err) {
    console.error("OAuth exchange failed:", err.response?.data || err.message);
    res.status(500).json({ error: "OAuth failed", details: err.response?.data });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User data }
 *       401: { description: Unauthorized }
 */
router.get("/me", auth, authCtrl.me);

module.exports = router;
