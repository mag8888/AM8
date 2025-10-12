/**
 * Migration Script - Скрипт миграции данных из JSON в MongoDB Atlas
 * Версия: 1.0.0
 * Дата: 12 октября 2024
 */

const fs = require('fs').promises;
const path = require('path');

// Импорт конфигурации и модели
const databaseConfig = require('../server/config/database');
const MongooseUserModel = require('../server/models/MongooseUserModel');

class MigrationScript {
    constructor() {
        this.dataFile = path.join(__dirname, '../data/users.json');
        this.userModel = null;
    }

    /**
     * Инициализация скрипта
     */
    async init() {
        try {
            console.log('🚀 Migration: Инициализация скрипта миграции...');
            
            // Подключаемся к MongoDB
            await databaseConfig.connect();
            
            // Инициализируем модель
            this.userModel = new MongooseUserModel();
            await this.userModel.init();
            
            console.log('✅ Migration: Инициализация завершена');
        } catch (error) {
            console.error('❌ Migration: Ошибка инициализации:', error);
            throw error;
        }
    }

    /**
     * Загрузка данных из JSON файла
     */
    async loadJsonData() {
        try {
            console.log('📁 Migration: Загрузка данных из JSON файла...');
            
            const data = await fs.readFile(this.dataFile, 'utf8');
            const usersData = JSON.parse(data);
            
            console.log(`✅ Migration: Загружено ${usersData.length} пользователей из JSON`);
            return usersData;
        } catch (error) {
            console.error('❌ Migration: Ошибка загрузки JSON:', error);
            throw error;
        }
    }

    /**
     * Выполнение миграции
     */
    async migrate() {
        try {
            console.log('🔄 Migration: Начинаем миграцию данных...');
            
            // Загружаем данные из JSON
            const usersData = await this.loadJsonData();
            
            // Мигрируем данные
            const result = await this.userModel.migrateFromJson(usersData);
            
            console.log('✅ Migration: Миграция завершена:', result);
            return result;
        } catch (error) {
            console.error('❌ Migration: Ошибка миграции:', error);
            throw error;
        }
    }

    /**
     * Проверка результатов миграции
     */
    async verifyMigration() {
        try {
            console.log('🔍 Migration: Проверка результатов миграции...');
            
            // Получаем статистику
            const stats = await this.userModel.getStats();
            console.log('📊 Migration: Статистика после миграции:', stats);
            
            // Получаем всех пользователей
            const users = await this.userModel.getAllUsers({ limit: 10 });
            console.log(`👥 Migration: Найдено ${users.length} пользователей в MongoDB`);
            
            return {
                stats,
                usersCount: users.length,
                users: users.map(user => ({
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.createdAt
                }))
            };
        } catch (error) {
            console.error('❌ Migration: Ошибка проверки:', error);
            throw error;
        }
    }

    /**
     * Запуск полной миграции
     */
    async run() {
        try {
            console.log('🎯 Migration: Запуск полной миграции...');
            console.log('=====================================');
            
            // Инициализация
            await this.init();
            
            // Миграция
            const migrationResult = await this.migrate();
            
            // Проверка
            const verificationResult = await this.verifyMigration();
            
            console.log('=====================================');
            console.log('🎉 Migration: Миграция успешно завершена!');
            console.log('📊 Результаты:');
            console.log(`   - Мигрировано пользователей: ${migrationResult.migrated}`);
            console.log(`   - Ошибок: ${migrationResult.errors}`);
            console.log(`   - Всего в MongoDB: ${verificationResult.stats.totalUsers}`);
            console.log(`   - Активных: ${verificationResult.stats.activeUsers}`);
            
            return {
                success: true,
                migration: migrationResult,
                verification: verificationResult
            };
            
        } catch (error) {
            console.error('❌ Migration: Критическая ошибка:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            // Отключаемся от базы данных
            await databaseConfig.disconnect();
            console.log('🛑 Migration: Отключение от базы данных');
        }
    }
}

// Запуск скрипта, если он выполняется напрямую
if (require.main === module) {
    const migration = new MigrationScript();
    
    migration.run()
        .then((result) => {
            if (result.success) {
                console.log('✅ Migration: Скрипт выполнен успешно');
                process.exit(0);
            } else {
                console.error('❌ Migration: Скрипт завершился с ошибкой');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Migration: Необработанная ошибка:', error);
            process.exit(1);
        });
}

module.exports = MigrationScript;
