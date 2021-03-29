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

module.exports = {
    isAuthenticated: isAuthenticated,
    redirectifNotloggedIn: redirectifNotloggedIn
}
