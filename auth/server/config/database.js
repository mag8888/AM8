/**
 * Database Configuration - Конфигурация базы данных MongoDB Atlas
 * Версия: 1.0.0
 * Дата: 12 октября 2024
 */

const mongoose = require('mongoose');

class DatabaseConfig {
    constructor() {
        this.isConnected = false;
        this.connectionString = this.buildConnectionString();
        this.options = this.getConnectionOptions();
    }

    /**
     * Построение строки подключения к MongoDB Atlas
     * @returns {string} Строка подключения
     */
    buildConnectionString() {
        const username = process.env.MONGODB_USERNAME || 'aura_money_user';
        const password = process.env.MONGODB_PASSWORD || 'password123';
        const cluster = process.env.MONGODB_CLUSTER || 'cluster0.xyz123.mongodb.net';
        const database = process.env.MONGODB_DATABASE || 'aura_money';
        const options = process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority';

        // Экранируем специальные символы в пароле
        const encodedPassword = encodeURIComponent(password);
        const connectionString = `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?${options}`;
        
        console.log('📊 Database: Connection string built');
        console.log('📊 Database: Username:', username);
        console.log('📊 Database: Cluster:', cluster);
        console.log('📊 Database: Database:', database);
        
        return connectionString;
    }

    /**
     * Получение опций подключения
     * @returns {Object} Опции подключения
     */
    getConnectionOptions() {
        return {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true
        };
    }

    /**
     * Подключение к базе данных
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            if (this.isConnected) {
                console.log('📊 Database: Уже подключено к MongoDB');
                return;
            }

            console.log('📊 Database: Подключение к MongoDB Atlas...');
            console.log(`📊 Database: Cluster: ${process.env.MONGODB_CLUSTER || 'cluster0.xyz123.mongodb.net'}`);

            await mongoose.connect(this.connectionString, this.options);

            this.isConnected = true;
            console.log('✅ Database: Успешно подключено к MongoDB Atlas');

            // Обработчики событий
            mongoose.connection.on('error', (error) => {
                console.error('❌ Database: Ошибка подключения:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ Database: Отключено от MongoDB');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('🔄 Database: Переподключено к MongoDB');
                this.isConnected = true;
            });

        } catch (error) {
            console.error('❌ Database: Ошибка подключения к MongoDB Atlas:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Отключение от базы данных
     * @returns {Promise<void>}
     */
    async disconnect() {
        try {
            if (!this.isConnected) {
                console.log('📊 Database: Не подключено к MongoDB');
                return;
            }

            await mongoose.disconnect();
            this.isConnected = false;
            console.log('🛑 Database: Отключено от MongoDB Atlas');

        } catch (error) {
            console.error('❌ Database: Ошибка отключения:', error);
            throw error;
        }
    }

    /**
     * Проверка состояния подключения
     * @returns {Object} Статус подключения
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            connectionState: mongoose.connection.readyState,
            connectionStateText: this.getConnectionStateText(mongoose.connection.readyState),
            database: mongoose.connection.db ? mongoose.connection.db.databaseName : null,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections) : []
        };
    }

    /**
     * Получение текстового описания состояния подключения
     * @param {number} state - Состояние подключения
     * @returns {string} Описание состояния
     */
    getConnectionStateText(state) {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[state] || 'unknown';
    }

    /**
     * Проверка здоровья базы данных
     * @returns {Promise<Object>} Статус здоровья
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return {
                    status: 'error',
                    message: 'База данных не подключена'
                };
            }

            // Простой запрос для проверки
            await mongoose.connection.db.admin().ping();
            
            return {
                status: 'ok',
                message: 'База данных работает',
                timestamp: new Date().toISOString(),
                collections: Object.keys(mongoose.connection.collections)
            };

        } catch (error) {
            console.error('❌ Database: Ошибка проверки здоровья:', error);
            return {
                status: 'error',
                message: 'Ошибка проверки базы данных',
                error: error.message
            };
        }
    }

    /**
     * Получение экземпляра mongoose
     * @returns {Object} Экземпляр mongoose
     */
    getMongoose() {
        return mongoose;
    }

    /**
     * Получение модели по имени
     * @param {string} modelName - Имя модели
     * @returns {Object|null} Модель Mongoose
     */
    getModel(modelName) {
        try {
            return mongoose.model(modelName);
        } catch (error) {
            console.error(`❌ Database: Модель ${modelName} не найдена:`, error);
            return null;
        }
    }
}

// Создаем глобальный экземпляр
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;
