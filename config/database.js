/**
 * Стандартизированная конфигурация базы данных
 * Все компоненты системы используют единую базу данных
 */

const config = {
    // Основная база данных MongoDB
    MONGODB: {
        // Имя базы данных - единое для всех компонентов
        DATABASE: process.env.MONGODB_DATABASE || process.env.MONGODB_DB || 'energy_money_game',
        
        // Параметры подключения
        USERNAME: process.env.MONGODB_USERNAME || 'xqrmedia_db_user',
        PASSWORD: process.env.MONGODB_PASSWORD || 'pOs1rKxSv9Y3e7rl',
        CLUSTER: process.env.MONGODB_CLUSTER || 'cluster0.wvumcaj.mongodb.net',
        OPTIONS: process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0',
        
        // URI для подключения
        get URI() {
            return `mongodb+srv://${this.USERNAME}:${this.PASSWORD}@${this.CLUSTER}/${this.DATABASE}?${this.OPTIONS}`;
        }
    },
    
    // Настройки подключения
    CONNECTION: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000
    },
    
    // Коллекции
    COLLECTIONS: {
        ROOMS: 'rooms',
        USERS: 'users',
        GAMES: 'games',
        PLAYERS: 'room_players',
        PROFESSIONS: 'professions',
        CARDS: 'cards',
        DECKS: 'decks',
        TRANSACTIONS: 'transactions',
        BANK_ACCOUNTS: 'bank_accounts',
        PLAYER_HISTORY: 'player_history'
    }
};

module.exports = config;