const esso = require('eve-sso-simple');
const request = require('request');
const mongo = require('./mongodb');
const generateSessionId = require('./middlewares/generate_session_id');

// MongoDB constants
const client = mongo.client;
const db_name = mongo.db_name;

// EVE SSO Options
const esoClient = process.env.ESO_CLIENT;
const esoSecret = process.env.ESO_SECRET;
const callbackURL = process.env.CALLBACK_URL;

// User definition
let user = (username, player_id, sid) => {
    return {
        name: username,
        id: player_id,
        sid: sid,
        has_sub: false
    }
};

// Routes functions

let login = (res) => {
    esso.login({
        client_id: esoClient,
        client_secret: esoSecret,
        redirect_uri: callbackURL,
        scope: 'publicData'
    }, res);
};

let login_callback = (req, res) => {

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
};

// Core functions

const createUser = (username, player_id, sid, callback) => {

    client.connect().then((res) => {

        client.db(db_name).collection("users").insertOne(user(username, player_id, sid))
            .then((res) => {
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
        })
    }, (err) => {
        callback(false)
    });

    client.close();
};

module.exports = {
    'login': login,
    'login_callback': login_callback,
};
