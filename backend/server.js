const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const session = require('express-session');
const cors = require('cors');

require('dotenv').config(); // Load environment variables from .env file

const app = express();

// CORS middleware
app.use(cors());

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // You can save the user profile to your database here
     profile.accessToken = accessToken; // Add access token to profile
    profile.refreshToken = refreshToken;
    return done(null, profile);
  }
));

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Initialize Passport
app.use(passport.initialize());

// Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'] })

);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Redirect with tokens as query parameters
    res.redirect(`http://localhost:5173/emails/?accessToken=${req.user.accessToken}&refreshToken=${req.user.refreshToken}`);
  }
);


// Retrieve emails
app.get('/emails', (req, res) => {
  const accessToken = req.headers.authorization.split(' ')[1]; // Extract access token from request header
  const oauth2Client = new google.auth.OAuth2();
  console.log("user session recieved ",accessToken)
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  gmail.users.messages.list({
    userId: 'me',
    maxResults: 5
  }, (err, response) => {
    if (err) {
      console.error('Error fetching emails:', err);
      return res.status(500).send('Error fetching emails');
    }

    const emails = response.data.messages;
    // Now you can process the emails as needed
    res.json(emails);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
