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
        return done(null, {
            profile: profile,
            accessToken: accessToken,
            refreshToken: refreshToken
        });
        // return done(null, ""); // Supply the user authenticated to Passport
      }
    )
);

app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email", ...CONTACT_SCOPES],
      state: base64url(JSON.stringify({hashSecret: process.env.HASH_SECRET})),
      accessType: 'offline',
      approvalPrompt: 'force',
    }, {failureRedirect: "/error.html"}),
  );
  
app.get(
    '/auth/google/callback',
    passport.authenticate('google', {failureRedirect: '/error.html'}),
    (req, res) => {
        try {
            console.log(req.query);
            
            state = req.query.state;
            stateJson = JSON.parse(base64url.decode(state));
            console.log(stateJson);
            
            hashSecret = stateJson.hashSecret;
            if (hashSecret !== process.env.HASH_SECRET) {
                // TODO: Change this
                res.status(400).redirect("/error.html");
                return;
            }

            console.log(`Access Token is ${req.user.accessToken} and refreshToken is ${req.user.refreshToken}`);
            req.session.accessToken = req.user.accessToken;
            req.session.refreshToken = req.user.refreshToken;
            console.log(`Token is ${req.session.token}`);
            if (req.session.token) {
                res.cookie('googleToken', req.session.token);
            } else {
                res.cookie('googleToken', '');
            }
            req.session.code = req.query.code;
            res.status(200).redirect("/contacts.html");
        } catch(err) {
            console.log(err.message);
            res.status(400).redirect("/error.html");
            return;
        }
    }
);

async function getProfileData(auth) {
    const service = google.people({version: 'v1', auth});
    const options = {
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,photos'
    }
    return service.people.get(options);
}

app.get(
    '/profile',
    async function(req, res) {
        if (req.session.profileData) {
            // Use the cached data
            // While this may need the user to log out if they had updated their profile,
            // this is a good practice to avoid overshooting the API rate limits
            res.status(200).json({
                "data": req.session.profileData
            });
            return; 
        }

        let profileData = {
            'name': '',
            'email': '',
            'avatar': null
        };

        oauth2Client.setCredentials({
            access_token: req.session.accessToken,
            refresh_token: req.session.refreshToken
        });
        let response = await getProfileData(oauth2Client);

        let person = response.data;

        if (person.names && person.names.length > 0) {
            profileData.name = person.names[0].displayName;
        }
        if (person.emailAddresses && person.emailAddresses.length > 0) {
            profileData.email = person.emailAddresses[0].value;
        }
        if (person.photos && person.photos.length > 0) {
            profileData.avatar = person.photos[0].url;
        }

        req.session.profileData = profileData;

        res.status(200).json({
            "data": profileData
        });
    }
);

const listOptions = {
    resourceName: 'people/me',
    pageSize: 10,
    personFields: 'names,emailAddresses,phoneNumbers,photos'
}

async function listContacts(auth, nextPageToken=null) {
    const service = google.people({version: 'v1', auth});
    if (!nextPageToken) {
        return service.people.connections.list(listOptions);
    } else {
        listOptions.pageToken = nextPageToken
        return service.people.connections.list(listOptions, nextPageToken);
    }
}

function contactsCallback(response, contacts=[]) {
    let nextPage = response.data.nextPageToken;
    let connections = response.data.connections;

    if (connections) {
        // console.log('Connections:');
        // console.log(connections);
        connections.forEach((person) => {
            // console.log(person);
            let contactDetails = {
                'name': '',
                'email': '',
                'phoneNumber': '',
                'avatar': null
            };
            if (person.names && person.names.length > 0) {
                contactDetails.name = person.names[0].displayName;
            }
            if (person.emailAddresses && person.emailAddresses.length > 0) {
                contactDetails.email = person.emailAddresses[0].value;
            }
            if (person.phoneNumbers && person.phoneNumbers.length > 0) {
                contactDetails.phoneNumber = person.phoneNumbers[0].value;
            }
            if (person.photos && person.photos.length > 0) {
                contactDetails.avatar = person.photos[0].url;
            }
            contacts.push(contactDetails);
        });
    } else {
        console.log('No connections found.');
    }

    return nextPage;
}

app.get(
    '/contacts',
    async function(req, res) {
        /*
        console.log(req.session.code);
        console.log(req.session.accessToken);
        console.log(req.session.refreshToken);
        */
        oauth2Client.setCredentials({
            access_token: req.session.accessToken,
            refresh_token: req.session.refreshToken
        });
        var contacts = [];
        let response;
        try {
            // TODO: Catch it in the loop as well
            response = await listContacts(oauth2Client, req.query.nextPageToken);
        } catch(err) {
            console.log(err);
            res.status(400).json({
                error: true
            });
            return;
        }
        let nextPage = contactsCallback(response, contacts);
        res.status(200).json({
            "data": contacts,
            "nextPageToken": nextPage
        });
    }
);

app.get(
    '/contacts/all',
    async function(req, res) {
        oauth2Client.setCredentials({
            access_token: req.session.accessToken,
            refresh_token: req.session.refreshToken
        });
        var contacts = [];
        let response = await listContacts(oauth2Client);
        let nextPage = contactsCallback(response, contacts);

        while (nextPage) {
            response = await listContacts(oauth2Client, nextPage);
            nextPage = contactsCallback(response, contacts);
            console.log('nextPage: ', nextPage);
        }
        res.status(200).json({
            "data": contacts
        });
    }
);

app.use(express.json());
app.use(express.static('frontend'))


app.get('/', (req, res) => {
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

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


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
