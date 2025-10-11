const mongoose = require('mongoose');

/**
 * Конфигурация и подключение к базам данных
 */

class DatabaseConfig {
    constructor() {
        console.log('💾 DatabaseConfig: Инициализация...');
        
        this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aura-money';
        this.isConnected = false;
        
        console.log('✅ DatabaseConfig: Инициализация завершена');
    }

    /**
     * Подключение к MongoDB
     */
    async connectMongoDB() {
        try {
            if (this.isConnected) {
                console.log('💾 DatabaseConfig: MongoDB уже подключена');
                return;
            }

            console.log('💾 DatabaseConfig: Подключение к MongoDB...');
            console.log('💾 DatabaseConfig: URI:', this.mongoUri.replace(/\/\/.*@/, '//***:***@')); // Скрываем пароль в логах
            
            await mongoose.connect(this.mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000, // Увеличиваем таймаут
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000,
                bufferCommands: false, // Отключаем буферизацию команд
                bufferMaxEntries: 0
            });

            this.isConnected = true;
            
            // Обработчики событий подключения
            mongoose.connection.on('connected', () => {
                console.log('✅ DatabaseConfig: MongoDB подключена');
            });

            mongoose.connection.on('error', (error) => {
                console.error('❌ DatabaseConfig: Ошибка MongoDB:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ DatabaseConfig: MongoDB отключена');
                this.isConnected = false;
            });

            // Graceful shutdown
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });

            console.log('✅ DatabaseConfig: MongoDB подключена успешно');
            
        } catch (error) {
            console.error('❌ DatabaseConfig: Ошибка подключения к MongoDB:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Отключение от MongoDB
     */
    async disconnect() {
        try {
            if (!this.isConnected) {
                console.log('💾 DatabaseConfig: MongoDB не подключена');
                return;
            }

            console.log('💾 DatabaseConfig: Отключение от MongoDB...');
            
            await mongoose.connection.close();
            this.isConnected = false;
            
            console.log('✅ DatabaseConfig: Отключение от MongoDB завершено');
            
        } catch (error) {
            console.error('❌ DatabaseConfig: Ошибка отключения от MongoDB:', error);
            throw error;
        }
    }

    /**
     * Проверка статуса подключения
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            mongoUri: this.mongoUri,
            readyState: mongoose.connection.readyState
        };
    }

    /**
     * Получение подключения к MongoDB
     */
    getConnection() {
        return mongoose.connection;
    }
}

// Экспорт singleton экземпляра
const databaseConfig = new DatabaseConfig();
module.exports = databaseConfig;
