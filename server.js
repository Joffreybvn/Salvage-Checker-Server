const router = require('./bin/router');
const http = require('http').Server(router);
const io = require('socket.io')(http);

// Routes imports
const authRoutes = require('./bin/routes/auth');

// Middleware imports
const sessionChecker = require('./bin/middlewares/session_checker').sessionChecker;

// Route for homepage
router.get('/', sessionChecker, (req, res) => {
    res.redirect('/login');
});

// Route for user authentication
router.use('/login', authRoutes);

// Route for dashboard
router.get('/dashboard', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        console.log(req.session.user);
        res.sendFile(__dirname + '/public/dashboard.html');
    } else {
        res.redirect('/login');
    }
});

// Salvage Tool routes
const users_list = [];

io.on('connection', (socket) => {
    console.log('User connected to dashboard');

    socket.on('disconnect', () => {
        console.log('User disconnected from dashboard');
    });
});

http.listen(router.get('port'), () => {
    console.log(`App started on port ${router.get('port')}`)
});
