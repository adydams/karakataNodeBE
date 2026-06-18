const authService = require("../services/authServices");
const passport = require("passport");

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const { user, token } = await authService.register({ name, email, phone, password });
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

    return res.status(200).json({
      success: true,
      user: result.user,
      token: result.token,
      mustChangePassword: false
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

exports.googleAuth = passport.authenticate("google", { scope: ["profile", "email"] });

exports.googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, profile) => {
   
    if (err || !profile) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    try {
      const { user, token } = await authService.findOrCreateFromOAuth("google", profile);
      // redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (e) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
};

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
