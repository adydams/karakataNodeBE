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

exports.login = async (req, res) => {
  try {
    console.log("Login attempt controller:", req.body);
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });
    res.json({ success: true, user, token });
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

exports.changePasswordFirstTime = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const result = await authService.changePasswordFirstTime(userId, oldPassword, newPassword);
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const result = await authService.changePassword(userId, oldPassword, newPassword);
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
