// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authService = require('../services/authServices');

module.exports = function setupPassport() {
 passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // use service to find or create user
      const result = await authService.findOrCreateFromOAuth('google', profile);
      // done(err, user) -> we'll pass token via sessionless approach
      done(null, result.user); // store user for session (though we won't use sessions)
    } catch (err) {
      done(err, null);
    }
  }));

  // For sessionless API we don't need serializeUser/deserializeUser, but define anyway:
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await require('../models/userModel').findByPk(id);
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
  });
};
