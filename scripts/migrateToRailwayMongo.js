#!/usr/bin/env node

/**
 * Скрипт миграции данных из MongoDB Atlas в MongoDB на Railway
 * 
 * Использование:
 * node scripts/migrateToRailwayMongo.js [--dry-run] [--verbose]
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
    // Исходная база (MongoDB Atlas)
    SOURCE: {
        URI: process.env.MONGODB_URI || 'mongodb+srv://xqrmedia_db_user:pOs1rKxSv9Y3e7rl@cluster0.wvumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0',
        DATABASE: 'energy_money_game'
    },
    
    // Целевая база (Railway MongoDB)
    TARGET: {
        URI: process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI_RAILWAY,
        DATABASE: process.env.RAILWAY_MONGODB_DATABASE || 'energy_money_game'
    },
    
    // Коллекции для миграции
    COLLECTIONS: ['rooms', 'room_players', 'users'],
    
    // Режим работы
    DRY_RUN: process.argv.includes('--dry-run'),
    VERBOSE: process.argv.includes('--verbose')
};

class MongoMigrator {
    constructor() {
        this.sourceClient = null;
        this.targetClient = null;
        this.sourceDb = null;
        this.targetDb = null;
        this.stats = {
            totalDocuments: 0,
            migratedDocuments: 0,
            errors: 0,
            collections: {}
        };
    }

    async connect() {
        console.log('🔍 Подключение к исходной базе данных (MongoDB Atlas)...');
        this.sourceClient = new MongoClient(CONFIG.SOURCE.URI);
        await this.sourceClient.connect();
        this.sourceDb = this.sourceClient.db(CONFIG.SOURCE.DATABASE);
        console.log('✅ Подключение к MongoDB Atlas установлено');

        if (!CONFIG.TARGET.URI) {
            throw new Error('❌ RAILWAY_MONGODB_URI не установлен! Установите переменную окружения с URI Railway MongoDB');
        }

        console.log('🔍 Подключение к целевой базе данных (Railway MongoDB)...');
        this.targetClient = new MongoClient(CONFIG.TARGET.URI);
        await this.targetClient.connect();
        this.targetDb = this.targetClient.db(CONFIG.TARGET.DATABASE);
        console.log('✅ Подключение к Railway MongoDB установлено');
    }

    async disconnect() {
        if (this.sourceClient) {
            await this.sourceClient.close();
            console.log('✅ Соединение с MongoDB Atlas закрыто');
        }
        if (this.targetClient) {
            await this.targetClient.close();
            console.log('✅ Соединение с Railway MongoDB закрыто');
        }
    }

    async migrateCollection(collectionName) {
        console.log(`\n📦 Миграция коллекции: ${collectionName}`);
        
        try {
            const sourceCollection = this.sourceDb.collection(collectionName);
            const targetCollection = this.targetDb.collection(collectionName);

            // Получаем все документы из исходной коллекции
            const documents = await sourceCollection.find({}).toArray();
            const documentCount = documents.length;
            
            console.log(`📊 Найдено документов: ${documentCount}`);
            
            if (documentCount === 0) {
                console.log(`⚠️ Коллекция ${collectionName} пуста, пропускаем`);
                return;
            }

            this.stats.totalDocuments += documentCount;
            this.stats.collections[collectionName] = {
                source: documentCount,
                migrated: 0,
                errors: 0
            };

            if (CONFIG.DRY_RUN) {
                console.log(`🔍 DRY RUN: Пропускаем миграцию ${collectionName}`);
                this.stats.collections[collectionName].migrated = documentCount;
                return;
            }

            // Очищаем целевую коллекцию (если существует)
            const existingCount = await targetCollection.countDocuments();
            if (existingCount > 0) {
                console.log(`🗑️ Очищаем существующие документы в ${collectionName} (${existingCount} документов)`);
                await targetCollection.deleteMany({});
            }

            // Вставляем документы в целевую коллекцию
            if (documents.length > 0) {
                const result = await targetCollection.insertMany(documents);
                console.log(`✅ Мигрировано документов: ${result.insertedCount}`);
                
                this.stats.migratedDocuments += result.insertedCount;
                this.stats.collections[collectionName].migrated = result.insertedCount;
            }

        } catch (error) {
            console.error(`❌ Ошибка миграции коллекции ${collectionName}:`, error);
            this.stats.errors++;
            this.stats.collections[collectionName].errors++;
        }
    }

    async migrate() {
        console.log('🚀 Начинаем миграцию данных...');
        console.log(`📅 Время начала: ${new Date().toISOString()}`);
        console.log(`🔍 Режим: ${CONFIG.DRY_RUN ? 'DRY RUN (тестирование)' : 'ПРОДАКШН'}`);
        console.log(`📝 Подробный режим: ${CONFIG.VERBOSE ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}`);

        await this.connect();

        try {
            // Мигрируем каждую коллекцию
            for (const collectionName of CONFIG.COLLECTIONS) {
                await this.migrateCollection(collectionName);
            }

            console.log('\n🎉 Миграция завершена!');
            this.printStats();

        } catch (error) {
            console.error('❌ Критическая ошибка при миграции:', error);
            this.stats.errors++;
        } finally {
            await this.disconnect();
        }
    }

    printStats() {
        console.log('\n📊 Статистика миграции:');
        console.log(`  Всего документов: ${this.stats.totalDocuments}`);
        console.log(`  Мигрировано: ${this.stats.migratedDocuments}`);
        console.log(`  Ошибок: ${this.stats.errors}`);
        
        console.log('\n📦 По коллекциям:');
        for (const [collectionName, stats] of Object.entries(this.stats.collections)) {
            console.log(`  ${collectionName}: ${stats.migrated}/${stats.source} (ошибок: ${stats.errors})`);
        }
    }
}

// Проверка переменных окружения
function checkEnvironment() {
    if (!CONFIG.TARGET.URI) {
        console.error('❌ Ошибка: Не установлена переменная окружения RAILWAY_MONGODB_URI');
        console.log('📝 Установите переменную окружения:');
        console.log('   export RAILWAY_MONGODB_URI="mongodb://..."');
        process.exit(1);
    }
}

if (require.main === module) {
    checkEnvironment();
    
    const migrator = new MongoMigrator();
    migrator.migrate()
        .then(() => {
            console.log('✅ Миграция завершена успешно!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Ошибка выполнения миграции:', error);
            process.exit(1);
        });
}

module.exports = MongoMigrator;
