#!/usr/bin/env node

/**
 * Скрипт для запуска миграции на Railway сервере
 * Этот скрипт должен выполняться в среде Railway, где доступны переменные окружения
 */

const { MongoClient } = require('mongodb');

async function runMigrationOnRailway() {
    console.log('🚀 Запуск миграции на Railway сервере...');
    console.log('📅 Время:', new Date().toISOString());
    
    // Проверяем переменные окружения
    const railwayMongoUri = process.env.RAILWAY_MONGODB_URI;
    const railwayMongoDb = process.env.RAILWAY_MONGODB_DATABASE || 'energy_money_game';
    const atlasMongoUri = process.env.MONGODB_URI;
    
    console.log('🔍 Проверка переменных окружения:');
    console.log('  RAILWAY_MONGODB_URI:', railwayMongoUri ? '✅ SET' : '❌ NOT SET');
    console.log('  RAILWAY_MONGODB_DATABASE:', railwayMongoDb);
    console.log('  MONGODB_URI (Atlas):', atlasMongoUri ? '✅ SET' : '❌ NOT SET');
    
    if (!railwayMongoUri) {
        console.error('❌ Ошибка: RAILWAY_MONGODB_URI не установлен!');
        process.exit(1);
    }
    
    if (!atlasMongoUri) {
        console.error('❌ Ошибка: MONGODB_URI не установлен!');
        process.exit(1);
    }
    
    let sourceClient = null;
    let targetClient = null;
    
    try {
        // Подключаемся к MongoDB Atlas (исходная база)
        console.log('\n🔍 Подключение к MongoDB Atlas...');
        sourceClient = new MongoClient(atlasMongoUri);
        await sourceClient.connect();
        const sourceDb = sourceClient.db('energy_money_game');
        console.log('✅ Подключение к MongoDB Atlas установлено');
        
        // Подключаемся к Railway MongoDB (целевая база)
        console.log('\n🔍 Подключение к Railway MongoDB...');
        targetClient = new MongoClient(railwayMongoUri);
        await targetClient.connect();
        const targetDb = targetClient.db(railwayMongoDb);
        console.log('✅ Подключение к Railway MongoDB установлено');
        
        // Коллекции для миграции
        const collections = ['rooms', 'room_players', 'users'];
        
        console.log('\n📦 Начинаем миграцию коллекций...');
        
        for (const collectionName of collections) {
            console.log(`\n📦 Миграция коллекции: ${collectionName}`);
            
            const sourceCollection = sourceDb.collection(collectionName);
            const targetCollection = targetDb.collection(collectionName);
            
            // Получаем документы из исходной коллекции
            const documents = await sourceCollection.find({}).toArray();
            const documentCount = documents.length;
            
            console.log(`  📊 Найдено документов: ${documentCount}`);
            
            if (documentCount === 0) {
                console.log(`  ⚠️ Коллекция ${collectionName} пуста, пропускаем`);
                continue;
            }
            
            // Очищаем целевую коллекцию
            const existingCount = await targetCollection.countDocuments();
            if (existingCount > 0) {
                console.log(`  🗑️ Очищаем существующие документы (${existingCount} документов)`);
                await targetCollection.deleteMany({});
            }
            
            // Вставляем документы в целевую коллекцию
            if (documents.length > 0) {
                const result = await targetCollection.insertMany(documents);
                console.log(`  ✅ Мигрировано документов: ${result.insertedCount}`);
            }
        }
        
        console.log('\n🎉 Миграция завершена успешно!');
        
        // Проверяем результат
        console.log('\n📊 Проверка результата:');
        for (const collectionName of collections) {
            const count = await targetClient.db(railwayMongoDb).collection(collectionName).countDocuments();
            console.log(`  ${collectionName}: ${count} документов`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
        process.exit(1);
    } finally {
        if (sourceClient) {
            await sourceClient.close();
            console.log('✅ Соединение с MongoDB Atlas закрыто');
        }
        if (targetClient) {
            await targetClient.close();
            console.log('✅ Соединение с Railway MongoDB закрыто');
        }
    }
}

if (require.main === module) {
    runMigrationOnRailway()
        .then(() => {
            console.log('✅ Миграция завершена успешно!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Ошибка выполнения миграции:', error);
            process.exit(1);
        });
}

module.exports = runMigrationOnRailway;
