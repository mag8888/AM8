#!/usr/bin/env node

/**
 * Скрипт для полного удаления всех комнат из MongoDB
 * Удаляет все комнаты независимо от их статуса
 */

const { MongoClient } = require('mongodb');

// Конфигурация MongoDB
const CONFIG = {
    MONGODB_USERNAME: process.env.MONGODB_USERNAME || 'xqrmedia_db_user',
    MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || 'pOs1rKxSv9Y3e7rl',
    MONGODB_CLUSTER: process.env.MONGODB_CLUSTER || 'cluster0.wvumcaj.mongodb.net',
    MONGODB_DATABASE: process.env.MONGODB_DATABASE || process.env.MONGODB_DB || 'aura_money',
    MONGODB_OPTIONS: process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0',
    DRY_RUN: process.argv.includes('--dry-run'),
    VERBOSE: process.argv.includes('--verbose')
};

async function deleteAllRooms() {
    let client = null;
    
    try {
        // Подключение к MongoDB
        const uri = `mongodb+srv://${CONFIG.MONGODB_USERNAME}:${CONFIG.MONGODB_PASSWORD}@${CONFIG.MONGODB_CLUSTER}/${CONFIG.MONGODB_DATABASE}?${CONFIG.MONGODB_OPTIONS}`;
        
        console.log('🔍 Подключение к MongoDB Atlas...');
        client = new MongoClient(uri);
        await client.connect();
        
        const db = client.db(CONFIG.MONGODB_DATABASE);
        console.log('✅ Подключение установлено');
        
        // Получаем все комнаты
        const rooms = await db.collection('rooms').find({}).toArray();
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
                const playersResult = await db.collection('room_players').deleteMany({ room_id: room.id });
                console.log(`✅ Удалены игроки комнаты ${room.name} (${playersResult.deletedCount} записей)`);
                
                // Удаляем саму комнату
                const roomResult = await db.collection('rooms').deleteOne({ _id: room._id });
                
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
        const remainingRooms = await db.collection('rooms').find({}).count();
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
