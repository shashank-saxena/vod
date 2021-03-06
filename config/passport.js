var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

// load the auth variables
var configAuth = require('./auth');

passport.use(new FacebookStrategy(
  {
    // pull in our app id and secret from our auth.js file
    clientID: configAuth.facebookAuth.clientID,
    clientSecret: configAuth.facebookAuth.clientSecret,
    callbackURL: configAuth.facebookAuth.callbackURL,
    profileFields: ['id', 'name', 'link', 'photos', 'emails']
  },
  // facebook will send back the token and profile
  function (token, refreshToken, profile, done) {
    console.log("FacebookStrategy token :: ",token,"refreshToken ::",refreshToken,"Profile :: ", profile);

    // find the user in the database based on their facebook id
    User.findOne({ 'facebook.userID': profile.id }, function (err, user) {
      // if there is an error, stop everything and return
      if (err){
        return done(err);
      }

      // if the user is found, then log them in
      if (user) {
        return done(null, user); // user found, return that user
      } else {
        // if there is no user found with that facebook id, create them
        var newUser = new User();

        // set all of the facebook information in our user model
        newUser.facebook.userID = profile.id; // set the users facebook id                   
        newUser.facebook.accessToken = token; // we will save the token that facebook provides to the user                    
        newUser.facebook.profilePicture = profile.photos[0].value;
        
        newUser.firstName = profile.name.givenName;
        newUser.lastName = profile.name.familyName;
        newUser.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
        

        // save our user to the database
        newUser.save(function (err) {
          if (err){
            throw err;
          }
          // if successful, return the new user
          return done(null, newUser);
        });
      }
    });


  }
));

passport.use(new LocalStrategy(
  {
    // define the parameter in req.body that passport can use as username and password
    usernameField: 'email',
    passwordField: 'password'
  },
  function (username, password, done) {
    User.findOne({ email: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect email.' });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));