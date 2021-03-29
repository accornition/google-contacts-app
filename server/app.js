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


// Create the OAuth2 client to make Google API requests
const oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    process.env.OAUTH_CALLBACK_DOMAIN + process.env.OAUTH_CALLBACK_URL,
);

const CONTACT_SCOPES = ['https://www.googleapis.com/auth/contacts.readonly', 'https://www.googleapis.com/auth/contacts'];

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
        /*
        console.log("access token: ", accessToken);
        console.log("refresh token: ", refreshToken);
        console.log("Profile: ", profile);
        */
        
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

/**
 * Middleware to check if a user is authenticated or not.
 * If this check fails, the unauthenticated user is sent a 403 status code 
 */
function isAuthenticated(req, res, next) {
    if (req.session.accessToken) {
        // TODO: Add session expiry check
        next();
    } else {
        res.status(403).json({
            "message": "Unauthorized"
        });
        return;
    }
}

/**
 * Middleware to redirect a user to the home page if they aren't authenticated
 */
function redirectifNotloggedIn(req, res, next) {
    if (req.session.accessToken) {
        // TODO: Add session expiry check
        next();
    } else {
        res.redirect("/");
        return;
    }
}

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
            // console.log(stateJson);
            
            hashSecret = stateJson.hashSecret;
            if (hashSecret !== process.env.HASH_SECRET) {
                // TODO: Change this
                res.status(400).redirect("/error.html");
                return;
            }

            console.log(`Access Token is ${req.user.accessToken} and refreshToken is ${req.user.refreshToken}`);
            req.session.accessToken = req.user.accessToken;
            req.session.refreshToken = req.user.refreshToken;
            req.session.code = req.query.code;
            res.status(200).redirect("/home");
        } catch(err) {
            console.log(`Error: ${err.message}`);
            res.status(400).redirect("/");
            return;
        }
    }
);

/**
 * Fetches the authenticated user's Google Profile Data 
 */
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
    isAuthenticated,
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


/**
 * Fetches the total number of contacts 
 */
async function getNumberofContacts(auth) {
    const service = google.people({version: 'v1', auth});
    const options = {
        resourceName: 'people/me',
        personFields: 'emailAddresses'
    }
    return service.people.connections.list(options);
}

app.get(
    '/contacts/total',
    isAuthenticated,
    async function(req, res) {
        oauth2Client.setCredentials({
            access_token: req.session.accessToken,
            refresh_token: req.session.refreshToken
        });
        var numContacts = 0;
        let response;
        try {
            // TODO: Catch it in the loop as well
            response = await getNumberofContacts(oauth2Client);
            numContacts = response.data.totalItems;
        } catch(err) {
            console.log(err);
            res.status(400).json({
                error: true
            });
            return;
        }
        res.status(200).json({
            "data": numContacts
        });
    }
);

const listOptions = {
    resourceName: 'people/me',
    pageSize: 10,
    personFields: 'names,emailAddresses,phoneNumbers,photos'
}

async function listContacts(auth, nextPageToken=undefined) {
    const service = google.people({version: 'v1', auth});
    if (!nextPageToken || nextPageToken == undefined || nextPageToken === "undefined") {
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
        connections.forEach((person) => {
            let contactDetails = {
                'name': '',
                'email': '',
                'phoneNumber': '',
                'avatar': null,
                'resourceName': ''
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
            if (person.resourceName) {
                contactDetails.resourceName = person.resourceName
            }
            contacts.push(contactDetails);
        });
    } else {
        console.log('No connections found.');
    }

    return nextPage;
}

/**
 * Fetches a single page of contacts data
 */
app.get(
    '/contacts',
    isAuthenticated,
    async function(req, res) {
        oauth2Client.setCredentials({
            access_token: req.session.accessToken,
            refresh_token: req.session.refreshToken
        });
        var contacts = [];
        let response;
        try {
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


/**
 * Fetches all contacts at once
 */
app.get(
    '/contacts/all',
    isAuthenticated,
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

async function deleteContact(auth, resourceName) {
    const service = google.people({version: 'v1', auth});
    return service.people.deleteContact({
        resourceName: resourceName
    });
}

/**
 * Deletes a contact
 */
app.delete(
    '/contacts',
    isAuthenticated,
    async function(req, res) {
        var resourceName = decodeURIComponent(req.query.resourceName);
        if (!resourceName) {
            res.status(400).json({
                "error": true
            });
            return;
        }
        oauth2Client.setCredentials({
            access_token: req.session.accessToken,
            refresh_token: req.session.refreshToken
        });
        try {
            var response = await deleteContact(oauth2Client, resourceName);
        } catch(err) {
            console.log(err);
            res.status(400).json({
                "error": "Failed to delete"
            });
            return;
        }
        res.status(200).json({
            "data": {
                "deleted": true
            }
        });
    }
)

app.use(express.json());
app.use(express.static('frontend'))


app.get('/', (req, res) => {
    res.sendFile('index.html');
});

app.get('/home', redirectifNotloggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', "/contacts.html"));
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
