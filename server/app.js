require('dotenv').config();

const port = process.env.PORT;

var createError = require('http-errors');
const fs = require('fs');
var express = require('express');
var base64url = require('base64url');
const {google} = require('googleapis');
var path = require('path');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var logger = require('morgan');

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();

app.use(cookieSession({
    name: 'session',
    keys: ['123']
}))
app.use(cookieParser());
app.use(passport.initialize());


let cache = [];

const oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    process.env.OAUTH_CALLBACK_DOMAIN + process.env.OAUTH_CALLBACK_URL,
);

const CONTACT_SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];
const TOKEN_PATH = "google_token.json";

passport.serializeUser(function(user, cb) {
    cb(null, user);
  });
  
  passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
  });

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        // callbackURL: "/auth/google/callback"
        callbackURL: process.env.OAUTH_CALLBACK_DOMAIN + '/auth/google/callback'
      },
      (accessToken, refreshToken, profile, done) => {
        console.log("access token: ", accessToken);
        console.log("refresh token: ", refreshToken);
        console.log("Profile: ", profile);
        var userProfile = profile;
        return done(null, userProfile);
        // return done(null, ""); // Supply the user authenticated to Passport
      }
    )
);

app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email", CONTACT_SCOPES],
      state: base64url(JSON.stringify({hashSecret: process.env.HASH_SECRET}))
    }, {failureRedirect: "/error.html"}),
  );
  
app.get(
    '/auth/google/callback',
    // passport.authenticate('google', {failureRedirect: '/error.html'}),
    (req, res) => {
        try {
            console.log(`Token is ${req.session.token}`);
            if (req.session.token) {
                res.cookie('token', req.session.token);
            } else {
                res.cookie('token', '');
            }
            queryParams = req.query;
            console.log(queryParams);
            state = queryParams.state;
            req.session.code = queryParams.code;
            stateJson = JSON.parse(base64url.decode(state));
            console.log(stateJson);
            hashSecret = stateJson.hashSecret;
            if (hashSecret === process.env.HASH_SECRET) {
                // TODO: Change this
                var code = queryParams.code;
                cache[0] = code;
                res.status(200).redirect("/contacts.html");
            } else {
                res.status(400).redirect("/error.html");
            }
        } catch {
            res.status(400).redirect("/error.html");
            return;
        }
    }
    //passport.authenticate("google", {successRedirect: "/contacts.html", failureRedirect: "/error.html"}),
);

function listConnectionNames(auth) {
    var contacts = [];
    const service = google.people({version: 'v1', auth});
    service.people.connections.list({
        resourceName: 'people/me',
        pageSize: 10,
        personFields: 'names,emailAddresses',
    }, (err, res) => {
        if (err) return console.error('The API returned an error: ' + err);
        const connections = res.data.connections;
        if (connections) {
        console.log(connections);
        console.log('Connections:');
        connections.forEach((person) => {
            console.log(person);
            if (person.names && person.names.length > 0) {
                contacts.push(person.names[0].displayName);
            } else {
                console.log('No display name found for connection.');
            }
        });
        } else {
            console.log('No connections found.');
        }
        console.log(contacts);
        // return contacts;
    });
    console.log(contacts);
    return contacts;
}

app.get(
    '/contacts',
    (req, res) => {
        var contacts = null;
        console.log(req.session.code);
        oauth2Client.getToken(req.session.code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oauth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
              if (err) return console.error(err);
              console.log(token);
              req.session.token = token;
              // console.log('Token stored to', TOKEN_PATH);
            });
            contacts = listConnectionNames(oauth2Client);
            console.log(contacts);
        });
        /*
        console.log(req.session.token);
        oauth2Client.setCredentials(req.session.token);
        listConnectionNames(oauth2Client);
        */
        res.status(200).json({
            "contacts": contacts
        });
    }
);

app.use(express.json());

//app.use(express.static(path.join(__dirname, 'frontend')));
//app.engine('html', require('ejs').renderFile);
//app.set('views', __dirname + '/frontend');
app.use(express.static('frontend'))

// Cache externally fetched information for future invocations
let aud;

// cache.push(fs.readFileSync('../frontend/index.html'));

app.get('/', (req, res) => {
    // res.render("index.html");
    // res.send("Hello World!");
    // res.setHeader('Content-Type', 'text/html');
    // res.send( cache[0] );
    res.sendFile('index.html');
});

app.get('/home', (req, res) => {
    res.sendFile("contacts.html");
});

app.post('/login', (req, res, next) => {
    try {
        var body = req.body;
        console.log(body);
        var email = body['email'];
        var password = body['password'];
        var responseJson = {
            "email": email,
            "password": password
        };
    } catch {
        res.status(400).json({
            "error": true
        });
        return;
    }
    res.status(200).json(responseJson);
  });


app.get('/logout', (req, res) => {
    req.logout();
    req.session = null;
    res.redirect('/');
})

/*
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
*/

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

/*
app.use('/', indexRouter);
app.use('/users', usersRouter);
*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    console.log(res.locals.message);

    // render the error page
    res.status(err.status || 500);
    res.redirect("/error.html");
});

app.listen(port, () => {
    console.log(`Application listening on: http://localhost:${port}`);
});

module.exports = app;
