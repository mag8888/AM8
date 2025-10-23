#!/usr/bin/env node

/**
 * Скрипт для полного удаления всех комнат из MongoDB
 * Удаляет все комнаты независимо от их статуса
 */

const { MongoClient } = require('mongodb');
const config = require('../config/database');

// Конфигурация
const CONFIG = {
    ...config.MONGODB,
    DRY_RUN: process.argv.includes('--dry-run'),
    VERBOSE: process.argv.includes('--verbose')
};

async function deleteAllRooms() {
    let client = null;
    
    try {
        // Подключение к MongoDB
        const uri = CONFIG.URI;
        
        console.log('🔍 Подключение к MongoDB Atlas...');
        client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db(CONFIG.DATABASE);
        console.log('✅ Подключение установлено');
        
        // Получаем все комнаты
        const rooms = await db.collection(config.COLLECTIONS.ROOMS).find({}).toArray();
        console.log(`📊 Всего комнат для удаления: ${rooms.length}`);
        
        if (rooms.length === 0) {
            console.log('✅ Комнаты для удаления не найдены');
            return;
        }
        
        if (CONFIG.DRY_RUN) {
            console.log('\n🔍 РЕЖИМ ТЕСТИРОВАНИЯ - удаление не будет выполнено');
            console.log('\n📋 Комнаты для удаления:');
            rooms.forEach((room, index) => {
                console.log(`  ${index + 1}. ${room.name} (${room.id}) - ${room.status || 'waiting'}`);
            });
            return;
        }
        
        // Удаляем все комнаты
        console.log('\n🗑️ Начинаем удаление всех комнат...');
        
        let deletedCount = 0;
        let errorsCount = 0;
        
        for (const room of rooms) {
            try {
                        // Удаляем игроков комнаты
                        const playersResult = await db.collection(config.COLLECTIONS.PLAYERS).deleteMany({ room_id: room.id });
                console.log(`✅ Удалены игроки комнаты ${room.name} (${playersResult.deletedCount} записей)`);
                
                // Удаляем саму комнату
                const roomResult = await db.collection(config.COLLECTIONS.ROOMS).deleteOne({ _id: room._id });
                
                if (roomResult.deletedCount > 0) {
                    deletedCount++;
                    if (CONFIG.VERBOSE) {
                        console.log(`✅ Удалена комната: ${room.name} (${room.status || 'waiting'})`);
                    }
                } else {
                    console.log(`⚠️ Комната ${room.name} не найдена для удаления`);
                }
                
            } catch (error) {
                console.error(`❌ Ошибка удаления комнаты ${room.name}:`, error.message);
                errorsCount++;
            }
        }
        
        console.log(`\n📊 Статистика удаления:`);
        console.log(`  Всего комнат: ${rooms.length}`);
        console.log(`  Удалено комнат: ${deletedCount}`);
        console.log(`  Ошибок: ${errorsCount}`);
        
        if (deletedCount > 0) {
            console.log('🎉 Удаление завершено успешно!');
        } else {
            console.log('ℹ️ Комнаты для удаления не найдены');
        }
        
        // Проверяем результат
        const remainingRooms = await db.collection(config.COLLECTIONS.ROOMS).find({}).count();
        console.log(`📊 Осталось комнат в базе: ${remainingRooms}`);
        
        if (remainingRooms === 0) {
            console.log('✅ Все комнаты успешно удалены!');
        } else {
            console.log(`⚠️ Остались комнаты в базе: ${remainingRooms}`);
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

deleteAllRooms();

/**
 * Скрипт для полного удаления всех комнат из MongoDB
 * Удаляет все комнаты независимо от их статуса
 */

const { MongoClient } = require('mongodb');
const config = require('../config/database');

// Конфигурация
const CONFIG = {
    ...config.MONGODB,
    DRY_RUN: process.argv.includes('--dry-run'),
    VERBOSE: process.argv.includes('--verbose')
};

async function deleteAllRooms() {
    let client = null;
    
    try {
        // Подключение к MongoDB
        const uri = CONFIG.URI;
        
        console.log('🔍 Подключение к MongoDB Atlas...');
        client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db(CONFIG.DATABASE);
        console.log('✅ Подключение установлено');
        
        // Получаем все комнаты
        const rooms = await db.collection(config.COLLECTIONS.ROOMS).find({}).toArray();
        console.log(`📊 Всего комнат для удаления: ${rooms.length}`);
        
        if (rooms.length === 0) {
            console.log('✅ Комнаты для удаления не найдены');
            return;
        }
        
        if (CONFIG.DRY_RUN) {
            console.log('\n🔍 РЕЖИМ ТЕСТИРОВАНИЯ - удаление не будет выполнено');
            console.log('\n📋 Комнаты для удаления:');
            rooms.forEach((room, index) => {
                console.log(`  ${index + 1}. ${room.name} (${room.id}) - ${room.status || 'waiting'}`);
            });
            return;
        }
        
        // Удаляем все комнаты
        console.log('\n🗑️ Начинаем удаление всех комнат...');
        
        let deletedCount = 0;
        let errorsCount = 0;
        
        for (const room of rooms) {
            try {
                        // Удаляем игроков комнаты
                        const playersResult = await db.collection(config.COLLECTIONS.PLAYERS).deleteMany({ room_id: room.id });
                console.log(`✅ Удалены игроки комнаты ${room.name} (${playersResult.deletedCount} записей)`);
                
                // Удаляем саму комнату
                const roomResult = await db.collection(config.COLLECTIONS.ROOMS).deleteOne({ _id: room._id });
                
                if (roomResult.deletedCount > 0) {
                    deletedCount++;
                    if (CONFIG.VERBOSE) {
                        console.log(`✅ Удалена комната: ${room.name} (${room.status || 'waiting'})`);
                    }
                } else {
                    console.log(`⚠️ Комната ${room.name} не найдена для удаления`);
                }
                
            } catch (error) {
                console.error(`❌ Ошибка удаления комнаты ${room.name}:`, error.message);
                errorsCount++;
            }
        }
        
        console.log(`\n📊 Статистика удаления:`);
        console.log(`  Всего комнат: ${rooms.length}`);
        console.log(`  Удалено комнат: ${deletedCount}`);
        console.log(`  Ошибок: ${errorsCount}`);
        
        if (deletedCount > 0) {
            console.log('🎉 Удаление завершено успешно!');
        } else {
            console.log('ℹ️ Комнаты для удаления не найдены');
        }
        
        // Проверяем результат
        const remainingRooms = await db.collection(config.COLLECTIONS.ROOMS).find({}).count();
        console.log(`📊 Осталось комнат в базе: ${remainingRooms}`);
        
        if (remainingRooms === 0) {
            console.log('✅ Все комнаты успешно удалены!');
        } else {
            console.log(`⚠️ Остались комнаты в базе: ${remainingRooms}`);
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

deleteAllRooms();
