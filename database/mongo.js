const { MongoClient } = require('mongodb');
const config = require('../config/database');

let cachedClient = null;
let cachedDb = null;

async function connectMongo() {
    // Используем стандартизированную конфигурацию
    // Приоритет: Railway MongoDB -> MongoDB Atlas -> Config
const uri = process.env.RAILWAY_MONGODB_URI || 
            process.env.MONGODB_URI || 
            process.env.MONGO_URL || 
            config.MONGODB.URI;
    const dbName = config.MONGODB.DATABASE;

    if (!uri) {
        throw new Error('MongoDB URI is not provided (MONGODB_URI/MONGO_URL)');
    }

    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(uri, config.CONNECTION);
    await client.connect();
    const db = client.db(dbName);
    cachedClient = client;
    cachedDb = db;

    // Indexes
    await db.collection(config.COLLECTIONS.ROOMS).createIndex({ id: 1 }, { unique: true });
    await db.collection(config.COLLECTIONS.ROOMS).createIndex({ status: 1, createdAt: -1 });

    return { client, db };
}

function getDbSync() {
    // Return cached if exists, otherwise null to force async path
    return cachedDb;
}

module.exports = { connectMongo, getDbSync };


