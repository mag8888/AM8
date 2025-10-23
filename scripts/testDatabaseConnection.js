#!/usr/bin/env node

/**
 * Скрипт для тестирования подключения к базе данных
 * Проверяет, какая база данных используется на продакшене
 */

const { MongoClient } = require('mongodb');

async function testDatabaseConnection() {
    console.log('🔍 Тестирование подключения к базе данных...');
    
    // Тестируем обе возможные базы данных
    const databases = ['energy_money_game', 'aura_money'];
    
    for (const dbName of databases) {
        try {
            console.log(`\n📊 Тестируем базу данных: ${dbName}`);
            
            // Подключение к MongoDB
            const uri = `mongodb+srv://xqrmedia_db_user:pOs1rKxSv9Y3e7rl@cluster0.wvumcaj.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
            
            const client = new MongoClient(uri);
            await client.connect();
            
            const db = client.db(dbName);
            
            // Проверяем коллекции
            const collections = await db.listCollections().toArray();
            console.log(`✅ Подключение успешно! Коллекции: ${collections.map(c => c.name).join(', ')}`);
            
            // Проверяем комнаты
            const roomsCount = await db.collection('rooms').countDocuments();
            console.log(`🏠 Комнат в базе: ${roomsCount}`);
            
            // Проверяем пользователей
            const usersCount = await db.collection('users').countDocuments();
            console.log(`👥 Пользователей в базе: ${usersCount}`);
            
            await client.close();
            
        } catch (error) {
            console.log(`❌ Ошибка подключения к ${dbName}: ${error.message}`);
        }
    }
}

testDatabaseConnection()
    .then(() => console.log('\n✅ Тестирование завершено!'))
    .catch(error => console.error('❌ Ошибка тестирования:', error));
