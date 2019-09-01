const MongoClient = require('mongodb').MongoClient;

// MongoDB Configuration
const db_name = 'salvagedb';
const db_password = process.env.MONGO_PASSWORD;
const mongoURL = `mongodb+srv://dbUser:${db_password}@cluster0-emdss.azure.mongodb.net/${db_name}`;

// Client
const client = new MongoClient(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = {
    'client': client,
    'db_name': db_name
};
