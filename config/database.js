const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'xqrmedia_db_user';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'pOs1rKxSv9Y3e7rl';
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'cluster0.wvumcaj.mongodb.net';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'energy_money_game';
const MONGODB_OPTIONS = process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0';

module.exports = {
    MONGODB: {
        USERNAME: MONGODB_USERNAME,
        PASSWORD: MONGODB_PASSWORD,
        CLUSTER: MONGODB_CLUSTER,
        DATABASE: MONGODB_DATABASE,
        OPTIONS: MONGODB_OPTIONS,
        URI: `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/${MONGODB_DATABASE}?${MONGODB_OPTIONS}`
    },
    RAILWAY_MONGODB: {
        URI: process.env.RAILWAY_MONGODB_URI || 'mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@mongodb.railway.internal:27017',
        DATABASE: process.env.RAILWAY_MONGODB_DATABASE || 'energy_money_game',
        USERNAME: process.env.RAILWAY_MONGODB_USERNAME,
        PASSWORD: process.env.RAILWAY_MONGODB_PASSWORD,
    },
    CONNECTION: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000
    },
    COLLECTIONS: {
        ROOMS: 'rooms',
        PLAYERS: 'room_players',
        USERS: 'users'
    }
};