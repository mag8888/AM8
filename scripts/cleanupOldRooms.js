#!/usr/bin/env node

/**
 * Скрипт очистки старых комнат
 * Удаляет комнаты старше 5 часов
 * 
 * Использование:
 * node scripts/cleanupOldRooms.js
 * 
 * Автоматический запуск каждые 30 минут через cron:
 * 0,30 * * * * cd /path/to/project && node scripts/cleanupOldRooms.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Конфигурация
const CONFIG = {
    ROOM_MAX_AGE_HOURS: 5, // Максимальный возраст комнаты в часах
    DRY_RUN: process.argv.includes('--dry-run'), // Режим тестирования без удаления
    VERBOSE: process.argv.includes('--verbose') // Подробный вывод
};

class RoomCleanupService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'database', 'aura_money.db');
        this.db = null;
        this.stats = {
            totalRooms: 0,
            oldRooms: 0,
            deletedRooms: 0,
            errors: 0
        };
    }

    /**
     * Инициализация базы данных
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Ошибка подключения к базе данных:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Подключение к базе данных установлено');
                    resolve();
                }
            });
        });
    }

    /**
     * Получить все комнаты
     */
    async getAllRooms() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    id,
                    name,
                    status,
                    created_at,
                    updated_at,
                    creator_id
                FROM rooms 
                WHERE status != 'deleted'
                ORDER BY created_at DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка получения комнат:', err.message);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Проверить, является ли комната старой
     */
    isRoomOld(createdAt) {
        const roomCreatedTime = new Date(createdAt).getTime();
        const currentTime = Date.now();
        const maxAgeMs = CONFIG.ROOM_MAX_AGE_HOURS * 60 * 60 * 1000; // 5 часов в миллисекундах
        
        return (currentTime - roomCreatedTime) > maxAgeMs;
    }

    /**
     * Получить возраст комнаты в часах
     */
    getRoomAgeHours(createdAt) {
        const roomCreatedTime = new Date(createdAt).getTime();
        const currentTime = Date.now();
        const ageMs = currentTime - roomCreatedTime;
        return Math.round(ageMs / (60 * 60 * 1000) * 100) / 100; // Округляем до 2 знаков
    }

    /**
     * Удалить комнату
     */
    async deleteRoom(roomId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE rooms 
                SET status = 'deleted', 
                    updated_at = ?
                WHERE id = ?
            `;

            this.db.run(query, [new Date().toISOString(), roomId], function(err) {
                if (err) {
                    console.error(`❌ Ошибка удаления комнаты ${roomId}:`, err.message);
                    reject(err);
                } else {
                    console.log(`✅ Комната ${roomId} помечена как удаленная`);
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Удалить игроков комнаты
     */
    async deleteRoomPlayers(roomId) {
        return new Promise((resolve, reject) => {
            const query = `
                DELETE FROM room_players 
                WHERE room_id = ?
            `;

            this.db.run(query, [roomId], function(err) {
                if (err) {
                    console.error(`❌ Ошибка удаления игроков комнаты ${roomId}:`, err.message);
                    reject(err);
                } else {
                    console.log(`✅ Удалены игроки комнаты ${roomId} (${this.changes} записей)`);
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Выполнить очистку
     */
    async cleanup() {
        try {
            console.log('🧹 Начинаем очистку старых комнат...');
            console.log(`📅 Максимальный возраст комнат: ${CONFIG.ROOM_MAX_AGE_HOURS} часов`);
            console.log(`🔍 Режим тестирования: ${CONFIG.DRY_RUN ? 'ДА' : 'НЕТ'}`);
            
            // Получаем все комнаты
            const rooms = await this.getAllRooms();
            this.stats.totalRooms = rooms.length;
            
            console.log(`📊 Всего комнат в базе: ${this.stats.totalRooms}`);
            
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
                console.log(`  - ${room.id} | ${room.name} | Возраст: ${ageHours}ч | Статус: ${room.status}`);
            });

            if (CONFIG.DRY_RUN) {
                console.log('\n🔍 РЕЖИМ ТЕСТИРОВАНИЯ - удаление не выполнено');
                return;
            }

            // Удаляем старые комнаты
            console.log('\n🗑️ Начинаем удаление старых комнат...');
            
            for (const room of oldRooms) {
                try {
                    // Удаляем игроков комнаты
                    await this.deleteRoomPlayers(room.id);
                    
                    // Помечаем комнату как удаленную
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
     * Закрыть соединение с базой данных
     */
    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Ошибка закрытия базы данных:', err.message);
                    } else {
                        console.log('✅ Соединение с базой данных закрыто');
                    }
                    resolve();
                });
            });
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
    const cleanupService = new RoomCleanupService();
    cleanupService.run().then(() => {
        console.log('🎉 Скрипт очистки завершен');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Фатальная ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = RoomCleanupService;
