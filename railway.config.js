/**
 * Railway конфигурация для MongoDB
 */

module.exports = {
    // Переменные окружения для Railway
    env: {
        RAILWAY_MONGODB_URI: {
            description: 'MongoDB URI от Railway сервиса',
            required: true
        },
        RAILWAY_MONGODB_DATABASE: {
            description: 'Имя базы данных MongoDB на Railway',
            default: 'energy_money_game'
        }
    },
    
    // Настройки подключения
    database: {
        // Приоритет подключения: Railway -> Atlas -> Local
        connectionPriority: [
            'RAILWAY_MONGODB_URI',
            'MONGODB_URI', 
            'MONGO_URL'
        ]
    }
};