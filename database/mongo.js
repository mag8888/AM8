const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function connectMongo() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
    const dbName = process.env.MONGODB_DB || 'aura_money';

    if (!uri) {
        throw new Error('MongoDB URI is not provided (MONGODB_URI/MONGO_URL)');
    }

    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(uri, { 
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000
    });
    await client.connect();
    const db = client.db(dbName);
    cachedClient = client;
    cachedDb = db;

    // Indexes
    await db.collection('rooms').createIndex({ id: 1 }, { unique: true });
    await db.collection('rooms').createIndex({ status: 1, createdAt: -1 });

    return { client, db };
}

function getDbSync() {
    // Return cached if exists, otherwise null to force async path
    return cachedDb;
}

module.exports = { connectMongo, getDbSync };


