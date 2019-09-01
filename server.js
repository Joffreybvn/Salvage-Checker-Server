const request = require('request');
const router = require('express')();
const http = require('http').Server(router);
const io = require('socket.io')(http);
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const esso = require('eve-sso-simple');

const PORT = 3000;

// EVE SSO Options
const esoClient = process.env.ESO_CLIENT;
const esoSecret = process.env.ESO_SECRET;

// MongoDB Configuration
const db_name = 'salvagedb';
const db_password = process.env.MONGO_PASSWORD;
const mongoURL = `mongodb+srv://dbUser:${db_password}@cluster0-emdss.azure.mongodb.net/${db_name}`;
const client = new MongoClient(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Authentication options
const cookieSecret = process.env.COOKIE_SECRET;
const callbackURL = process.env.CALLBACK_URL;

// Port configuration
router.set('port', PORT);

// Cookie configuration
router.use(cookieParser());

// Session configuration
router.use(session({
    key: 'user_sid',
    secret: cookieSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

// Clear the cookie if the browser doesn't have it.
router.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});

// Middleware function to check for logged-in users
const sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/dashboard');
    } else {
        next();
    }
};

// Route for homepage
router.get('/', sessionChecker, (req, res) => {
    res.redirect('/login');
});

// Route for user authentication
const generateSessionId = () => {
    let chars = "abcdefghijklmnopqrstuvwxyz-+ABCDEFGHIJKLMNOP1234567890.:";
    let pass = "";
    for (let x = 0; x < 10; x++) {
         let i = Math.floor(Math.random() * chars.length);
         pass += chars.charAt(i);
    }
    return pass;
};

const createUser = (username, player_id, sid, callback) => {

    client.connect().then((res) => {
        const doc = {
            name: username,
            id: player_id,
            sid: sid,
            has_sub: false
        };

        client.db(db_name).collection("users").insertOne(doc).then((res) => {
            callback(player_id);
        }, (err) => {
            callback(false)
        });
        client.close()
    })
};

const userLogin = (characterId, access_token, callback) => {

    client.connect().then((res) => {

        // Retrieve the user data
        let collection = client.db(db_name).collection('users');
        collection.findOne({id: characterId}, (err, doc) => {
            let sid = generateSessionId();

            // If the user already exists, get his name and set a sid
            if (doc) {
                collection.updateOne({_id: doc._id}, {$set: { sid: sid}})
                    .then((res) => {
                        callback({id: doc.id, sid: sid})
                    }, (err) => {
                        callback(false)
                    })
            }

            // If the user doesn't exist, create it and set a sid
            else {

                // Get the player's name
                let options = {
                    uri: `https://esi.evetech.net/latest/characters/${characterId}/`,
                    hearders : {
                        'Authorization' : `Bearer ${access_token}`
                    }
                };
                request(options, (err, r, body) => {
                    const response = JSON.parse(body);

                    if (err) {
                        callback(false)
                    } else {
                        createUser(response.name, characterId, sid, (player_id) => {
                            callback({id: player_id, sid: sid})
                        })
                    }
                })
            }
            client.close();
        })
    }, (err) => {
        callback(false)
    })
};

router.get('/login/callback', (req, res) => {

    // Returns a promise - resolves into a JSON object containing access and character token.
    esso.getTokens({
            client_id: esoClient,
            client_secret: esoSecret
        }, req, res,
        (accessToken, charToken) => {

            userLogin(charToken.CharacterID, accessToken.access_token, (result) => {
                if (result) {
                    req.session.user = result;
                    res.redirect('/dashboard');
                } else {
                    res.send('NOK')
                }
            })
        }
    )
});

router.get('/login', sessionChecker, (req, res) => {

    esso.login({
        client_id: esoClient,
        client_secret: esoSecret,
        redirect_uri: callbackURL,
        scope: 'publicData'
    }, res);
});

// Route for dashboard
router.get('/dashboard', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        console.log(req.session.user);
        res.sendFile(__dirname + '/public/dashboard.html');
    } else {
        res.redirect('/login');
    }
});

// 404 handler
router.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!")
});

http.listen(router.get('port'), () => {
    console.log(`App started on port ${router.get('port')}`)
});
