require('dotenv').config();

var express = require('express');
var base64url = require('base64url');
var path = require('path');

const passport = require("./auth");
const { oauth2Client, deleteContact, getProfileData, getNumberofContacts, listContacts, contactsCallback } = require("../backend/utils");
const { isAuthenticated, redirectifNotloggedIn } = require("../backend/middleware");


var appRouter = express.Router();

var authRouter = express.Router({mergeParams: true});

const CONTACT_SCOPES = ['https://www.googleapis.com/auth/contacts.readonly', 'https://www.googleapis.com/auth/contacts'];

appRouter.get('/', (req, res) => {
    console.log(__dirname);
    res.sendFile(path.join(__dirname, '../frontend', "/index.html"));
});

appRouter.get('/home', redirectifNotloggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', "/contacts.html"));
});

appRouter.get('/logout', (req, res) => {
    req.logout();
    req.session = null;
    res.redirect('/');
})

appRouter.use("/auth/google", authRouter);

authRouter.get(
    '/',
    passport.authenticate("google", {
      scope: ["profile", "email", ...CONTACT_SCOPES],
      state: base64url(JSON.stringify({hashSecret: process.env.HASH_SECRET})),
      accessType: 'offline',
      approvalPrompt: 'force',
    }, {failureRedirect: "/"}),
  );
  
authRouter.get(
    '/callback',
    passport.authenticate('google', {failureRedirect: '/'}),
    (req, res) => {
        try {
            console.log(req.query);
            
            state = req.query.state;
            stateJson = JSON.parse(base64url.decode(state));
            // console.log(stateJson);
            
            hashSecret = stateJson.hashSecret;
            if (hashSecret !== process.env.HASH_SECRET) {
                // TODO: Change this
                res.status(400).redirect("/");
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
appRouter.get(
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
 * Fetches all contacts at once
 */
appRouter.get(
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
        if (!numContacts || (numContacts === "undefined")) {
            numContacts = 0;
        }
        res.status(200).json({
            "data": numContacts
        });
    }
);

/**
 * Fetches a single page of contacts data
 */
appRouter.get(
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
appRouter.get(
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

/**
 * Deletes a contact
 */
appRouter.delete(
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

module.exports = appRouter;
