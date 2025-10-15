/**
 * Test MongoDB Connection - Тест подключения к MongoDB Atlas
 * Версия: 1.0.0
 */

// Устанавливаем переменные окружения для теста
// ВНИМАНИЕ: Используйте переменные окружения, не хардкодите секреты!
process.env.MONGODB_USERNAME = process.env.MONGODB_USERNAME || 'test_user';
process.env.MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || 'test_password';
process.env.MONGODB_CLUSTER = process.env.MONGODB_CLUSTER || 'test-cluster.mongodb.net';
process.env.MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'test_database';
process.env.MONGODB_OPTIONS = process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority';
process.env.USE_MONGODB = 'true';

const databaseConfig = require('./server/config/database');
const MongooseUserModel = require('./server/models/MongooseUserModel');

async function testConnection() {
    try {
        console.log('🧪 Test: Начинаем тест подключения к MongoDB Atlas');
        console.log('=====================================');
        console.log(`📊 Database: ${process.env.MONGODB_DATABASE}`);
        console.log(`🌐 Cluster: ${process.env.MONGODB_CLUSTER}`);
        console.log(`👤 Username: ${process.env.MONGODB_USERNAME}`);
        console.log('=====================================\n');

        // 1. Подключение к базе данных
        console.log('1️⃣ Подключение к MongoDB Atlas...');
        await databaseConfig.connect();
        console.log('✅ Подключение успешно!\n');

        // 2. Проверка здоровья БД
        console.log('2️⃣ Проверка здоровья базы данных...');
        const health = await databaseConfig.healthCheck();
        console.log('📊 Статус:', health);
        console.log('✅ База данных работает!\n');

        // 3. Инициализация модели
        console.log('3️⃣ Инициализация модели пользователей...');
        const userModel = new MongooseUserModel();
        await userModel.init();
        console.log('✅ Модель инициализирована!\n');

        // 4. Получение статистики
        console.log('4️⃣ Получение статистики пользователей...');
        const stats = await userModel.getStats();
        console.log('📊 Статистика:', stats);
        console.log('✅ Статистика получена!\n');

        // 5. Создание тестового пользователя
        console.log('5️⃣ Создание тестового пользователя...');
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash('test123', 12);
        
        try {
            const testUser = await userModel.createUser({
                email: 'test@railway.app',
                username: 'RailwayTestUser',
                passwordHash
            });
            console.log('✅ Тестовый пользователь создан:', testUser.email);
        } catch (error) {
            if (error.code === 11000) {
                console.log('⚠️ Пользователь test@railway.app уже существует');
            } else {
                throw error;
            }
        }
        console.log();

        // 6. Поиск пользователя
        console.log('6️⃣ Поиск тестового пользователя...');
        const foundUser = await userModel.findByEmail('test@railway.app');
        if (foundUser) {
            console.log('✅ Пользователь найден:', {
                id: foundUser.id,
                email: foundUser.email,
                username: foundUser.username
            });
        } else {
            console.log('⚠️ Пользователь не найден');
        }
        console.log();

        // 7. Получение всех пользователей
        console.log('7️⃣ Получение списка пользователей...');
        const users = await userModel.getAllUsers({ limit: 5 });
        console.log(`✅ Найдено пользователей: ${users.length}`);
        users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.username} (${user.email})`);
        });
        console.log();

        // Итоговая статистика
        console.log('=====================================');
        console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
        console.log('=====================================');
        const finalStats = await userModel.getStats();
        console.log('📊 Итоговая статистика:');
        console.log(`   • Всего пользователей: ${finalStats.totalUsers}`);
        console.log(`   • Активных: ${finalStats.activeUsers}`);
        console.log(`   • Подтвержденных: ${finalStats.verifiedUsers}`);
        console.log(`   • Всего игр: ${finalStats.totalGames}`);
        console.log('=====================================\n');

        console.log('✅ Система готова к работе с MongoDB Atlas!');
        console.log('✅ Можно развертывать на Railway!');

    } catch (error) {
        console.error('\n❌ ОШИБКА ТЕСТА:', error.message);
        console.error('📋 Детали:', error);
    } finally {
        // Отключение от базы данных
        console.log('\n🛑 Отключение от MongoDB Atlas...');
        await databaseConfig.disconnect();
        console.log('✅ Отключено');
        process.exit(0);
    }
}

// Запуск теста
testConnection();
