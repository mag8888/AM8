#!/usr/bin/env node

/**
 * Скрипт очистки старых комнат для MongoDB
 * Удаляет комнаты старше 5 часов из MongoDB Atlas
 * 
 * Использование:
 * node scripts/cleanupOldRoomsMongo.js
 * 
 * Автоматический запуск каждые 30 минут через cron:
 * 0,30 * * * * cd /path/to/project && node scripts/cleanupOldRoomsMongo.js
 */

const { MongoClient } = require('mongodb');

// Конфигурация
const CONFIG = {
    ROOM_MAX_AGE_HOURS: 5, // Максимальный возраст комнаты в часах
    DRY_RUN: process.argv.includes('--dry-run'), // Режим тестирования без удаления
    VERBOSE: process.argv.includes('--verbose'), // Подробный вывод
    // MongoDB подключение
    MONGODB_USERNAME: process.env.MONGODB_USERNAME || 'xqrmedia_db_user',
    MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || 'pOs1rKxSv9Y3e7rl',
    MONGODB_CLUSTER: process.env.MONGODB_CLUSTER || 'cluster0.wvumcaj.mongodb.net',
    MONGODB_DATABASE: process.env.MONGODB_DATABASE || 'energy_money_game',
    MONGODB_OPTIONS: process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0'
};

class MongoRoomCleanupService {
    constructor() {
        this.client = null;
        this.db = null;
        this.stats = {
            totalRooms: 0,
            oldRooms: 0,
            deletedRooms: 0,
            errors: 0
        };
    }

    /**
     * Получить URI подключения к MongoDB
     */
    getMongoUri() {
        const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER, MONGODB_DATABASE, MONGODB_OPTIONS } = CONFIG;
        return `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/${MONGODB_DATABASE}?${MONGODB_OPTIONS}`;
    }

    /**
     * Инициализация подключения к MongoDB
     */
    async initialize() {
        try {
            const uri = this.getMongoUri();
            console.log('✅ Подключение к MongoDB Atlas...');
            
            this.client = new MongoClient(uri);
            await this.client.connect();
            
            this.db = this.client.db(CONFIG.MONGODB_DATABASE);
            console.log('✅ Подключение к MongoDB Atlas установлено');
            
            // Проверяем подключение
            await this.db.admin().ping();
            console.log('✅ MongoDB Atlas отвечает');
            
        } catch (error) {
            console.error('❌ Ошибка подключения к MongoDB Atlas:', error.message);
            throw error;
        }
    }

    /**
     * Получить все комнаты из MongoDB
     */
    async getAllRooms() {
        try {
            const rooms = await this.db.collection('rooms').find({}).toArray();
            return rooms || [];
        } catch (error) {
            console.error('❌ Ошибка получения комнат из MongoDB:', error.message);
            throw error;
        }
    }

    /**
     * Проверить, является ли комната старой
     */
    isRoomOld(createdAt) {
        if (!createdAt) return false;
        
        const roomCreatedTime = new Date(createdAt).getTime();
        const currentTime = Date.now();
        const maxAgeMs = CONFIG.ROOM_MAX_AGE_HOURS * 60 * 60 * 1000; // 5 часов в миллисекундах
        
        return (currentTime - roomCreatedTime) > maxAgeMs;
    }

    /**
     * Получить возраст комнаты в часах
     */
    getRoomAgeHours(createdAt) {
        if (!createdAt) return 0;
        
        const roomCreatedTime = new Date(createdAt).getTime();
        const currentTime = Date.now();
        const ageMs = currentTime - roomCreatedTime;
        return Math.round(ageMs / (60 * 60 * 1000) * 100) / 100; // Округляем до 2 знаков
    }

    /**
     * Удалить комнату из MongoDB
     */
    async deleteRoom(roomId) {
        try {
            // Удаляем игроков комнаты
            const playersResult = await this.db.collection('room_players').deleteMany({ room_id: roomId });
            console.log(`✅ Удалены игроки комнаты ${roomId} (${playersResult.deletedCount} записей)`);
            
            // Помечаем комнату как удаленную
            const roomResult = await this.db.collection('rooms').updateOne(
                { id: roomId },
                { 
                    $set: { 
                        status: 'deleted',
                        updated_at: new Date().toISOString()
                    } 
                }
            );
            
            if (roomResult.modifiedCount > 0) {
                console.log(`✅ Комната ${roomId} помечена как удаленная`);
                return true;
            } else {
                console.log(`⚠️ Комната ${roomId} не найдена или уже удалена`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Ошибка удаления комнаты ${roomId}:`, error.message);
            throw error;
        }
    }

    /**
     * Выполнить очистку
     */
    async cleanup() {
        try {
            console.log('🧹 Начинаем очистку старых комнат из MongoDB Atlas...');
            console.log(`📅 Максимальный возраст комнат: ${CONFIG.ROOM_MAX_AGE_HOURS} часов`);
            console.log(`🔍 Режим тестирования: ${CONFIG.DRY_RUN ? 'ДА' : 'НЕТ'}`);
            console.log(`🗄️ База данных: ${CONFIG.MONGODB_DATABASE}`);
            
            // Получаем все комнаты
            const rooms = await this.getAllRooms();
            this.stats.totalRooms = rooms.length;
            
            console.log(`📊 Всего комнат в MongoDB: ${this.stats.totalRooms}`);
            
            if (rooms.length === 0) {
                console.log('ℹ️ Комнаты для очистки не найдены');
                return;
            }

            // Фильтруем старые комнаты
            const oldRooms = rooms.filter(room => this.isRoomOld(room.created_at));
            this.stats.oldRooms = oldRooms.length;
            
            console.log(`⏰ Найдено старых комнат: ${this.stats.oldRooms}`);
            
            if (oldRooms.length === 0) {
                console.log('✅ Старые комнаты не найдены');
                return;
            }

            // Выводим информацию о старых комнатах
            console.log('\n📋 Список старых комнат:');
            oldRooms.forEach(room => {
                const ageHours = this.getRoomAgeHours(room.created_at);
                console.log(`  - ${room.id} | ${room.name} | Возраст: ${ageHours}ч | Статус: ${room.status || 'waiting'}`);
            });

            if (CONFIG.DRY_RUN) {
                console.log('\n🔍 РЕЖИМ ТЕСТИРОВАНИЯ - удаление не выполнено');
                return;
            }

            // Удаляем старые комнаты
            console.log('\n🗑️ Начинаем удаление старых комнат...');
            
            for (const room of oldRooms) {
                try {
                    await this.deleteRoom(room.id);
                    this.stats.deletedRooms++;
                    
                    if (CONFIG.VERBOSE) {
                        const ageHours = this.getRoomAgeHours(room.created_at);
                        console.log(`✅ Удалена комната: ${room.name} (возраст: ${ageHours}ч)`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Ошибка удаления комнаты ${room.id}:`, error.message);
                    this.stats.errors++;
                }
            }

            // Выводим статистику
            console.log('\n📊 Статистика очистки:');
            console.log(`  Всего комнат: ${this.stats.totalRooms}`);
            console.log(`  Старых комнат: ${this.stats.oldRooms}`);
            console.log(`  Удалено комнат: ${this.stats.deletedRooms}`);
            console.log(`  Ошибок: ${this.stats.errors}`);
            
            if (this.stats.deletedRooms > 0) {
                console.log('✅ Очистка завершена успешно');
            } else {
                console.log('ℹ️ Комнаты для удаления не найдены');
            }

        } catch (error) {
            console.error('❌ Критическая ошибка при очистке:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Закрыть соединение с MongoDB
     */
    async close() {
        if (this.client) {
            await this.client.close();
            console.log('✅ Соединение с MongoDB Atlas закрыто');
        }
    }

    /**
     * Запустить очистку
     */
    async run() {
        try {
            await this.initialize();
            await this.cleanup();
        } catch (error) {
            console.error('❌ Ошибка выполнения очистки:', error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Запуск скрипта
if (require.main === module) {
    const cleanupService = new MongoRoomCleanupService();
    cleanupService.run().then(() => {
        console.log('🎉 Скрипт очистки MongoDB завершен');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Фатальная ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = MongoRoomCleanupService;

/**
 * Скрипт очистки старых комнат для MongoDB
 * Удаляет комнаты старше 5 часов из MongoDB Atlas
 * 
 * Использование:
 * node scripts/cleanupOldRoomsMongo.js
 * 
 * Автоматический запуск каждые 30 минут через cron:
 * 0,30 * * * * cd /path/to/project && node scripts/cleanupOldRoomsMongo.js
 */

const { MongoClient } = require('mongodb');

// Конфигурация
const CONFIG = {
    ROOM_MAX_AGE_HOURS: 5, // Максимальный возраст комнаты в часах
    DRY_RUN: process.argv.includes('--dry-run'), // Режим тестирования без удаления
    VERBOSE: process.argv.includes('--verbose'), // Подробный вывод
    // MongoDB подключение
    MONGODB_USERNAME: process.env.MONGODB_USERNAME || 'xqrmedia_db_user',
    MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || 'pOs1rKxSv9Y3e7rl',
    MONGODB_CLUSTER: process.env.MONGODB_CLUSTER || 'cluster0.wvumcaj.mongodb.net',
    MONGODB_DATABASE: process.env.MONGODB_DATABASE || 'energy_money_game',
    MONGODB_OPTIONS: process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0'
};

class MongoRoomCleanupService {
    constructor() {
        this.client = null;
        this.db = null;
        this.stats = {
            totalRooms: 0,
            oldRooms: 0,
            deletedRooms: 0,
            errors: 0
        };
    }

    /**
     * Получить URI подключения к MongoDB
     */
    getMongoUri() {
        const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER, MONGODB_DATABASE, MONGODB_OPTIONS } = CONFIG;
        return `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/${MONGODB_DATABASE}?${MONGODB_OPTIONS}`;
    }

    /**
     * Инициализация подключения к MongoDB
     */
    async initialize() {
        try {
            const uri = this.getMongoUri();
            console.log('✅ Подключение к MongoDB Atlas...');
            
            this.client = new MongoClient(uri);
            await this.client.connect();
            
            this.db = this.client.db(CONFIG.MONGODB_DATABASE);
            console.log('✅ Подключение к MongoDB Atlas установлено');
            
            // Проверяем подключение
            await this.db.admin().ping();
            console.log('✅ MongoDB Atlas отвечает');
            
        } catch (error) {
            console.error('❌ Ошибка подключения к MongoDB Atlas:', error.message);
            throw error;
        }
    }

    /**
     * Получить все комнаты из MongoDB
     */
    async getAllRooms() {
        try {
            const rooms = await this.db.collection('rooms').find({}).toArray();
            return rooms || [];
        } catch (error) {
            console.error('❌ Ошибка получения комнат из MongoDB:', error.message);
            throw error;
        }
    }

    /**
     * Проверить, является ли комната старой
     */
    isRoomOld(createdAt) {
        if (!createdAt) return false;
        
        const roomCreatedTime = new Date(createdAt).getTime();
        const currentTime = Date.now();
        const maxAgeMs = CONFIG.ROOM_MAX_AGE_HOURS * 60 * 60 * 1000; // 5 часов в миллисекундах
        
        return (currentTime - roomCreatedTime) > maxAgeMs;
    }

    /**
     * Получить возраст комнаты в часах
     */
    getRoomAgeHours(createdAt) {
        if (!createdAt) return 0;
        
        const roomCreatedTime = new Date(createdAt).getTime();
        const currentTime = Date.now();
        const ageMs = currentTime - roomCreatedTime;
        return Math.round(ageMs / (60 * 60 * 1000) * 100) / 100; // Округляем до 2 знаков
    }

    /**
     * Удалить комнату из MongoDB
     */
    async deleteRoom(roomId) {
        try {
            // Удаляем игроков комнаты
            const playersResult = await this.db.collection('room_players').deleteMany({ room_id: roomId });
            console.log(`✅ Удалены игроки комнаты ${roomId} (${playersResult.deletedCount} записей)`);
            
            // Помечаем комнату как удаленную
            const roomResult = await this.db.collection('rooms').updateOne(
                { id: roomId },
                { 
                    $set: { 
                        status: 'deleted',
                        updated_at: new Date().toISOString()
                    } 
                }
            );
            
            if (roomResult.modifiedCount > 0) {
                console.log(`✅ Комната ${roomId} помечена как удаленная`);
                return true;
            } else {
                console.log(`⚠️ Комната ${roomId} не найдена или уже удалена`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ Ошибка удаления комнаты ${roomId}:`, error.message);
            throw error;
        }
    }

    /**
     * Выполнить очистку
     */
    async cleanup() {
        try {
            console.log('🧹 Начинаем очистку старых комнат из MongoDB Atlas...');
            console.log(`📅 Максимальный возраст комнат: ${CONFIG.ROOM_MAX_AGE_HOURS} часов`);
            console.log(`🔍 Режим тестирования: ${CONFIG.DRY_RUN ? 'ДА' : 'НЕТ'}`);
            console.log(`🗄️ База данных: ${CONFIG.MONGODB_DATABASE}`);
            
            // Получаем все комнаты
            const rooms = await this.getAllRooms();
            this.stats.totalRooms = rooms.length;
            
            console.log(`📊 Всего комнат в MongoDB: ${this.stats.totalRooms}`);
            
            if (rooms.length === 0) {
                console.log('ℹ️ Комнаты для очистки не найдены');
                return;
            }

            // Фильтруем старые комнаты
            const oldRooms = rooms.filter(room => this.isRoomOld(room.created_at));
            this.stats.oldRooms = oldRooms.length;
            
            console.log(`⏰ Найдено старых комнат: ${this.stats.oldRooms}`);
            
            if (oldRooms.length === 0) {
                console.log('✅ Старые комнаты не найдены');
                return;
            }

            // Выводим информацию о старых комнатах
            console.log('\n📋 Список старых комнат:');
            oldRooms.forEach(room => {
                const ageHours = this.getRoomAgeHours(room.created_at);
                console.log(`  - ${room.id} | ${room.name} | Возраст: ${ageHours}ч | Статус: ${room.status || 'waiting'}`);
            });

            if (CONFIG.DRY_RUN) {
                console.log('\n🔍 РЕЖИМ ТЕСТИРОВАНИЯ - удаление не выполнено');
                return;
            }

            // Удаляем старые комнаты
            console.log('\n🗑️ Начинаем удаление старых комнат...');
            
            for (const room of oldRooms) {
                try {
                    await this.deleteRoom(room.id);
                    this.stats.deletedRooms++;
                    
                    if (CONFIG.VERBOSE) {
                        const ageHours = this.getRoomAgeHours(room.created_at);
                        console.log(`✅ Удалена комната: ${room.name} (возраст: ${ageHours}ч)`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Ошибка удаления комнаты ${room.id}:`, error.message);
                    this.stats.errors++;
                }
            }

            // Выводим статистику
            console.log('\n📊 Статистика очистки:');
            console.log(`  Всего комнат: ${this.stats.totalRooms}`);
            console.log(`  Старых комнат: ${this.stats.oldRooms}`);
            console.log(`  Удалено комнат: ${this.stats.deletedRooms}`);
            console.log(`  Ошибок: ${this.stats.errors}`);
            
            if (this.stats.deletedRooms > 0) {
                console.log('✅ Очистка завершена успешно');
            } else {
                console.log('ℹ️ Комнаты для удаления не найдены');
            }

        } catch (error) {
            console.error('❌ Критическая ошибка при очистке:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Закрыть соединение с MongoDB
     */
    async close() {
        if (this.client) {
            await this.client.close();
            console.log('✅ Соединение с MongoDB Atlas закрыто');
        }
    }

    /**
     * Запустить очистку
     */
    async run() {
        try {
            await this.initialize();
            await this.cleanup();
        } catch (error) {
            console.error('❌ Ошибка выполнения очистки:', error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Запуск скрипта
if (require.main === module) {
    const cleanupService = new MongoRoomCleanupService();
    cleanupService.run().then(() => {
        console.log('🎉 Скрипт очистки MongoDB завершен');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Фатальная ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = MongoRoomCleanupService;
