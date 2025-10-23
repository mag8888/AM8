#!/usr/bin/env node

/**
 * Скрипт для обновления конфигурации на Railway MongoDB
 */

const fs = require('fs');
const path = require('path');

class RailwayMongoUpdater {
    constructor() {
        this.railwayMongoUri = 'mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@mongodb.railway.internal:27017';
        this.railwayMongoDb = 'energy_money_game';
        
        this.filesToUpdate = [
            'database/mongo.js',
            'config/database.js',
            'server.js',
            'auth/server/server.js'
        ];
    }

    updateDatabaseMongo() {
        const filePath = 'database/mongo.js';
        console.log(`📝 Обновляем ${filePath}...`);
        
        const content = `const { MongoClient } = require('mongodb');
const config = require('../config/database');

let cachedClient = null;
let cachedDb = null;

async function connectMongo() {
    // Приоритет Railway MongoDB переменных
    const uri = process.env.RAILWAY_MONGODB_URI || 
                process.env.MONGODB_URI || 
                process.env.MONGO_URL || 
                config.MONGODB.URI;
    const dbName = process.env.RAILWAY_MONGODB_DATABASE || 
                   config.MONGODB.DATABASE;

    if (!uri) {
        throw new Error('MongoDB URI is not provided (RAILWAY_MONGODB_URI/MONGODB_URI/MONGO_URL)');
    }

    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(uri, config.CONNECTION);
    await client.connect();
    const db = client.db(dbName);
    cachedClient = client;
    cachedDb = db;

    // Создаем индексы
    await db.collection(config.COLLECTIONS.ROOMS).createIndex({ id: 1 }, { unique: true });
    await db.collection(config.COLLECTIONS.ROOMS).createIndex({ status: 1, createdAt: -1 });

    return { client, db };
}

function getDbSync() {
    return cachedDb;
}

module.exports = { connectMongo, getDbSync };`;
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${filePath} обновлен`);
    }

    updateConfigDatabase() {
        const filePath = 'config/database.js';
        console.log(`📝 Обновляем ${filePath}...`);
        
        const content = `const MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'xqrmedia_db_user';
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
        URI: \`mongodb+srv://\${MONGODB_USERNAME}:\${MONGODB_PASSWORD}@\${MONGODB_CLUSTER}/\${MONGODB_DATABASE}?\${MONGODB_OPTIONS}\`
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
};`;
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${filePath} обновлен`);
    }

    updateServerJs() {
        const filePath = 'server.js';
        console.log(`📝 Обновляем ${filePath}...`);
        
        // Читаем текущий файл
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Добавляем комментарий о Railway MongoDB
        const railwayComment = `
// Railway MongoDB Configuration
// Приоритет: RAILWAY_MONGODB_URI > MONGODB_URI > MONGO_URL
if (process.env.RAILWAY_MONGODB_URI) {
    console.log('🗄️ DB: Используем Railway MongoDB');
} else if (process.env.MONGODB_URI) {
    console.log('🗄️ DB: Используем MongoDB Atlas');
} else {
    console.log('🗄️ DB: Используем локальную SQLite');
}`;
        
        // Вставляем комментарий после импортов
        const importEndIndex = content.lastIndexOf('require(');
        if (importEndIndex !== -1) {
            const nextLineIndex = content.indexOf('\n', importEndIndex) + 1;
            content = content.slice(0, nextLineIndex) + railwayComment + content.slice(nextLineIndex);
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${filePath} обновлен`);
    }

    updateAuthServer() {
        const filePath = 'auth/server/server.js';
        console.log(`📝 Обновляем ${filePath}...`);
        
        // Читаем текущий файл
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Добавляем логирование Railway MongoDB
        const railwayLog = `
// Railway MongoDB Detection
if (process.env.RAILWAY_MONGODB_URI) {
    console.log('🗄️ Auth: Используется Railway MongoDB для хранения пользователей');
} else {
    console.log('🗄️ Auth: Используется MongoDB Atlas для хранения пользователей');
}`;
        
        // Вставляем после console.log('🚀 AuthServer: Инициализация...')
        const authServerIndex = content.indexOf('console.log(\'🚀 AuthServer: Инициализация...\');');
        if (authServerIndex !== -1) {
            const nextLineIndex = content.indexOf('\n', authServerIndex) + 1;
            content = content.slice(0, nextLineIndex) + railwayLog + content.slice(nextLineIndex);
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${filePath} обновлен`);
    }

    generateEnvironmentVariables() {
        console.log('\n🔧 Переменные окружения для Railway:');
        console.log('=' .repeat(50));
        console.log(`RAILWAY_MONGODB_URI=${this.railwayMongoUri}`);
        console.log(`RAILWAY_MONGODB_DATABASE=${this.railwayMongoDb}`);
        console.log(`RAILWAY_MONGODB_USERNAME=mongo`);
        console.log(`RAILWAY_MONGODB_PASSWORD=XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT`);
        
        console.log('\n📝 Команды Railway CLI:');
        console.log(`railway variables --set "RAILWAY_MONGODB_URI=${this.railwayMongoUri}"`);
        console.log(`railway variables --set "RAILWAY_MONGODB_DATABASE=${this.railwayMongoDb}"`);
        console.log(`railway variables --set "RAILWAY_MONGODB_USERNAME=mongo"`);
        console.log(`railway variables --set "RAILWAY_MONGODB_PASSWORD=XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT"`);
    }

    run() {
        console.log('🚀 Обновление конфигурации на Railway MongoDB...');
        console.log('📅 Время:', new Date().toISOString());
        console.log(`🔗 Railway MongoDB URI: ${this.railwayMongoUri}`);
        console.log(`🗄️ Database: ${this.railwayMongoDb}`);
        
        try {
            this.updateDatabaseMongo();
            this.updateConfigDatabase();
            this.updateServerJs();
            this.updateAuthServer();
            
            console.log('\n✅ Все файлы обновлены!');
            this.generateEnvironmentVariables();
            
            console.log('\n🎉 Конфигурация обновлена!');
            console.log('📝 Следующие шаги:');
            console.log('1. Установите переменные окружения на Railway');
            console.log('2. Перезапустите сервис');
            console.log('3. Проверьте логи на ошибки подключения');
            
        } catch (error) {
            console.error('❌ Ошибка обновления:', error);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    const updater = new RailwayMongoUpdater();
    updater.run();
}

module.exports = RailwayMongoUpdater;
