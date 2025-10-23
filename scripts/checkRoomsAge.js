#!/usr/bin/env node

/**
 * Скрипт для проверки возраста комнат в MongoDB
 * Показывает статистику по возрасту комнат
 */

const { MongoClient } = require('mongodb');
const config = require('../config/database');

// Конфигурация
const CONFIG = {
    ...config.MONGODB
};

async function checkRoomsAge() {
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
        console.log(`📊 Всего комнат: ${rooms.length}`);
        
        // Анализируем возраст комнат
        const now = new Date();
        const ageStats = {
            lessThan1Hour: 0,
            lessThan5Hours: 0,
            lessThan24Hours: 0,
            moreThan24Hours: 0,
            noCreatedAt: 0
        };
        
        const roomAges = [];
        
        rooms.forEach(room => {
            if (!room.created_at) {
                ageStats.noCreatedAt++;
                return;
            }
            
            const createdAt = new Date(room.created_at);
            const ageMs = now - createdAt;
            const ageHours = ageMs / (60 * 60 * 1000);
            
            roomAges.push({
                id: room.id,
                name: room.name,
                ageHours: Math.round(ageHours * 100) / 100,
                status: room.status || 'waiting',
                createdAt: room.created_at
            });
            
            if (ageHours < 1) {
                ageStats.lessThan1Hour++;
            } else if (ageHours < 5) {
                ageStats.lessThan5Hours++;
            } else if (ageHours < 24) {
                ageStats.lessThan24Hours++;
            } else {
                ageStats.moreThan24Hours++;
            }
        });
        
        // Выводим статистику
        console.log('\n📈 Статистика по возрасту комнат:');
        console.log(`  Менее 1 часа: ${ageStats.lessThan1Hour}`);
        console.log(`  Менее 5 часов: ${ageStats.lessThan5Hours}`);
        console.log(`  Менее 24 часов: ${ageStats.lessThan24Hours}`);
        console.log(`  Более 24 часов: ${ageStats.moreThan24Hours}`);
        console.log(`  Без даты создания: ${ageStats.noCreatedAt}`);
        
        // Показываем самые старые комнаты
        const sortedRooms = roomAges.sort((a, b) => b.ageHours - a.ageHours);
        console.log('\n🕐 Топ-10 самых старых комнат:');
        sortedRooms.slice(0, 10).forEach((room, index) => {
            console.log(`  ${index + 1}. ${room.name} - ${room.ageHours}ч (${room.status})`);
        });
        
        // Показываем самые новые комнаты
        console.log('\n🆕 Топ-10 самых новых комнат:');
        sortedRooms.slice(-10).reverse().forEach((room, index) => {
            console.log(`  ${index + 1}. ${room.name} - ${room.ageHours}ч (${room.status})`);
        });
        
        // Проверяем, сколько комнат будет удалено при текущих настройках (5 часов)
        const roomsToDelete = sortedRooms.filter(room => room.ageHours > 5);
        console.log(`\n🗑️ Комнат старше 5 часов (будут удалены): ${roomsToDelete.length}`);
        
        if (roomsToDelete.length > 0) {
            console.log('\n📋 Комнаты для удаления:');
            roomsToDelete.forEach(room => {
                console.log(`  - ${room.name} - ${room.ageHours}ч (${room.status})`);
            });
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

checkRoomsAge();
