#!/usr/bin/env node

/**
 * Скрипт для исправления поля created_at в существующих комнатах MongoDB
 * Добавляет поле created_at к комнатам, у которых его нет
 */

const { MongoClient } = require('mongodb');

// Конфигурация MongoDB
const CONFIG = {
    MONGODB_USERNAME: process.env.MONGODB_USERNAME || 'xqrmedia_db_user',
    MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || 'pOs1rKxSv9Y3e7rl',
    MONGODB_CLUSTER: process.env.MONGODB_CLUSTER || 'cluster0.wvumcaj.mongodb.net',
    MONGODB_DATABASE: process.env.MONGODB_DATABASE || 'energy_money_game',
    MONGODB_OPTIONS: process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0',
    DRY_RUN: process.argv.includes('--dry-run'),
    VERBOSE: process.argv.includes('--verbose')
};

async function fixRoomsCreatedAt() {
    let client = null;
    
    try {
        // Подключение к MongoDB
        const uri = `mongodb+srv://${CONFIG.MONGODB_USERNAME}:${CONFIG.MONGODB_PASSWORD}@${CONFIG.MONGODB_CLUSTER}/${CONFIG.MONGODB_DATABASE}?${CONFIG.MONGODB_OPTIONS}`;
        
        console.log('🔍 Подключение к MongoDB Atlas...');
        client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db(CONFIG.MONGODB_DATABASE);
        console.log('✅ Подключение установлено');
        
        // Находим комнаты без поля created_at
        const roomsWithoutCreatedAt = await db.collection('rooms').find({
            created_at: { $exists: false }
        }).toArray();
        
        console.log(`📊 Найдено комнат без поля created_at: ${roomsWithoutCreatedAt.length}`);
        
        if (roomsWithoutCreatedAt.length === 0) {
            console.log('✅ Все комнаты уже имеют поле created_at');
            return;
        }
        
        if (CONFIG.DRY_RUN) {
            console.log('\n🔍 РЕЖИМ ТЕСТИРОВАНИЯ - изменения не будут применены');
            console.log('\n📋 Комнаты для исправления:');
            roomsWithoutCreatedAt.forEach((room, index) => {
                console.log(`  ${index + 1}. ${room.name} (${room.id})`);
            });
            return;
        }
        
        // Добавляем поле created_at к комнатам
        console.log('\n🔧 Исправляем комнаты...');
        
        const now = new Date().toISOString();
        let updatedCount = 0;
        
        for (const room of roomsWithoutCreatedAt) {
            try {
                // Создаем случайную дату в прошлом (от 1 часа до 7 дней назад)
                const randomHoursAgo = Math.floor(Math.random() * (7 * 24 - 1)) + 1;
                const createdAt = new Date(Date.now() - randomHoursAgo * 60 * 60 * 1000).toISOString();
                
                await db.collection('rooms').updateOne(
                    { _id: room._id },
                    { 
                        $set: { 
                            created_at: createdAt,
                            updated_at: now
                        } 
                    }
                );
                
                updatedCount++;
                
                if (CONFIG.VERBOSE) {
                    const ageHours = Math.round((Date.now() - new Date(createdAt).getTime()) / (60 * 60 * 1000) * 100) / 100;
                    console.log(`✅ Исправлена комната: ${room.name} (возраст: ${ageHours}ч)`);
                }
                
            } catch (error) {
                console.error(`❌ Ошибка исправления комнаты ${room.id}:`, error.message);
            }
        }
        
        console.log(`\n✅ Исправлено комнат: ${updatedCount}`);
        
        // Проверяем результат
        const remainingRooms = await db.collection('rooms').find({
            created_at: { $exists: false }
        }).count();
        
        console.log(`📊 Осталось комнат без created_at: ${remainingRooms}`);
        
        if (remainingRooms === 0) {
            console.log('🎉 Все комнаты исправлены!');
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ Соединение закрыто');
        }
    }
}

fixRoomsCreatedAt();
