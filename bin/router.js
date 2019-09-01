const router = require('express')();
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Options
const port = 3000;
const cookieSecret = process.env.COOKIE_SECRET;

router.set('port', port);

// Cookie and session configuration
router.use(cookieParser());

router.use(session({
    key: 'user_sid',
    secret: cookieSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

// Reset/clear the cookie if the browser doesn't have it.
router.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});

// 404 handler
router.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!")
});

module.exports = router;
