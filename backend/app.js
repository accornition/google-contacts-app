var createError = require('http-errors');
var express = require('express');

var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');

const passport = require("./auth");
const appRouter = require("./routes");

const app = express();

app.use(cookieSession({
    name: 'session',
    keys: ['123']
}))
app.use(cookieParser());

app.use(passport.initialize());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('frontend'))

app.use(appRouter);

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
    res.redirect("/");
});

module.exports = app;
