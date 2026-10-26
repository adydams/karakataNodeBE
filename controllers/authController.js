const authService = require("../services/authServices");
const passport = require("passport");
const emailService = require("../services/emailService");

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const { user, token } = await authService.register({ name, email, phone, password });

    // Send welcome email
    emailService.sendWelcomeEmail(user.email, user.name).catch(err =>
      console.error("Welcome email error:", err)
    );

    res.status(201).json({ success: true, user, token });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log("Login attempt controller:", req.body);
    const { email, password } = req.body;
     const result = await authService.login({ email, password });

    if (result.mustVerifyAccount) {
      return res.status(200).json({
        success: true,
        mustVerifyAccount: true,
        userId: result.userId,
        email: result.email
      });
    }

    // Send login alert email
    emailService.sendLoginAlert(result.user.email).catch(err =>
      console.error("Login alert email error:", err)
    );

    return res.status(200).json({
      success: true,
      user: result.user,
      token: result.token,
      mustVerifyAccount: false
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

exports.googleAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ success: false, message: "Google authentication is currently disabled." });
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
};

exports.facebookAuth = (req, res, next) => {
  if (!process.env.FACEBOOK_CLIENT_ID) {
    return res.status(503).json({ success: false, message: "Facebook authentication is currently disabled." });
  }
  passport.authenticate("facebook", { scope: ["email", "public_profile"] })(req, res, next);
};

exports.twitterAuth = (req, res, next) => {
  if (!process.env.TWITTER_CONSUMER_KEY) {
    return res.status(503).json({ success: false, message: "X (Twitter) authentication is currently disabled." });
  }
  passport.authenticate("twitter", { scope: ["read"] })(req, res, next);
};

exports.instagramAuth = (req, res, next) => {
  if (!process.env.INSTAGRAM_CLIENT_ID) {
    return res.status(503).json({ success: false, message: "Instagram authentication is currently disabled." });
  }
  passport.authenticate("instagram")(req, res, next);
};

exports.socialCallback = (provider) => (req, res, next) => {
  passport.authenticate(provider, { session: false }, async (err, profile) => {
    if (err || !profile) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    try {
      const { user, token } = await authService.findOrCreateFromOAuth(provider, profile);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (e) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
};

exports.googleCallback = exports.socialCallback("google");


exports.resetPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const result = await authService.resetPassword(userId, oldPassword, newPassword);
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};



exports.completePasswordReset = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password are required" });
    }
    const result = await authService.completePasswordReset(token, newPassword);
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await authService.getById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    const updatedUser = await authService.updateUser(userId, updates);
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
