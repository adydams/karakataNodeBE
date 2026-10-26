const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const InstagramStrategy = require('passport-instagram').Strategy;
const authService = require('../services/authServices');

module.exports = function setupPassport() {
  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await authService.findOrCreateFromOAuth('google', profile);
        done(null, result.user);
      } catch (err) {
        done(err, null);
      }
    }));
  } else {
    console.warn('⚠️ Google OAuth credentials missing. Google login disabled.');
  }

  // Facebook Strategy
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'emails']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await authService.findOrCreateFromOAuth('facebook', profile);
        done(null, result.user);
      } catch (err) {
        done(err, null);
      }
    }));
  } else {
    console.warn('⚠️ Facebook OAuth credentials missing. Facebook login disabled.');
  }

  // X (Twitter) Strategy
  if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    passport.use(new TwitterStrategy({
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL
    }, async (token, tokenSecret, profile, done) => {
      try {
        const result = await authService.findOrCreateFromOAuth('twitter', profile);
        done(null, result.user);
      } catch (err) {
        done(err, null);
      }
    }));
  } else {
    console.warn('⚠️ Twitter OAuth credentials missing. Twitter login disabled.');
  }

  // Instagram Strategy
  if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
    passport.use(new InstagramStrategy({
      clientID: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      callbackURL: process.env.INSTAGRAM_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await authService.findOrCreateFromOAuth('instagram', profile);
        done(null, result.user);
      } catch (err) {
        done(err, null);
      }
    }));
  } else {
    console.warn('⚠️ Instagram OAuth credentials missing. Instagram login disabled.');
  }

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

