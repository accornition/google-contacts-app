require('dotenv').config();

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

/**
 * Serialize user for storing to Passport.JS
 */
passport.serializeUser(function(user, cb) {
    cb(null, user);
});


/**
 * Deserialize user for fetching from Passport.JS
 */
passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});


passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        callbackURL: process.env.OAUTH_CALLBACK_DOMAIN + '/auth/google/callback'
      },
      (accessToken, refreshToken, profile, done) => {
        // Create the user to supply to Passport.JS using the below options
        let userProfile = {
            profile: profile,
            accessToken: accessToken,
            refreshToken: refreshToken
        };
        return done(null, userProfile);
      }
    )
);

module.exports = passport;
