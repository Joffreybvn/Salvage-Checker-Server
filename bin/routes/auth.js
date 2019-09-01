const router = require('express').Router();
const auth = require('../auth');

const sessionChecker = require('../middlewares/session_checker').sessionChecker;

// These routes are under domain.com/login

router.get('', sessionChecker, (req, res) => {
    auth.login(res)
});

router.get('/callback', (req, res) => {
    auth.login_callback(req, res)
});

module.exports = router;
