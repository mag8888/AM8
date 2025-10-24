#!/usr/bin/env node

/**
 * Диагностика Railway MongoDB подключения
 */

class RailwayMongoDiagnostic {
    constructor() {
        this.railwayMongoUri = 'mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@mongodb.railway.internal:27017';
        this.railwayMongoDb = 'energy_money_game';
    }

    async testConnection() {
        console.log('🔍 Тестирование подключения к Railway MongoDB...');
        
        try {
            const { MongoClient } = require('mongodb');
            
            console.log('📡 URI:', this.railwayMongoUri);
            console.log('🗄️ Database:', this.railwayMongoDb);
            
            const client = new MongoClient(this.railwayMongoUri);
            
            console.log('🔌 Попытка подключения...');
            await client.connect();
            console.log('✅ Подключение установлено!');
            
            const db = client.db(this.railwayMongoDb);
            console.log('✅ База данных доступна!');
            
            // Тестируем операции
            const collections = await db.listCollections().toArray();
            console.log('📦 Коллекции:', collections.map(c => c.name));
            
            // Тестируем запись
            const testCollection = db.collection('test_connection');
            await testCollection.insertOne({ 
                test: true, 
                timestamp: new Date(),
                message: 'Railway MongoDB connection test'
            });
            console.log('✅ Запись в базу работает!');
            
            // Тестируем чтение
            const result = await testCollection.findOne({ test: true });
            console.log('✅ Чтение из базы работает!', result ? 'Данные получены' : 'Данные не найдены');
            
            // Очищаем тестовые данные
            await testCollection.deleteOne({ test: true });
            console.log('✅ Удаление из базы работает!');
            
            await client.close();
            console.log('✅ Соединение закрыто');
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка подключения к Railway MongoDB:', error.message);
            
            if (error.message.includes('ENOTFOUND')) {
                console.log('🔍 Проблема: DNS не может найти mongodb.railway.internal');
                console.log('💡 Решение: Убедитесь, что Railway MongoDB сервис запущен');
            } else if (error.message.includes('ECONNREFUSED')) {
                console.log('🔍 Проблема: Соединение отклонено');
                console.log('💡 Решение: Проверьте, что MongoDB сервис на Railway активен');
            } else if (error.message.includes('authentication')) {
                console.log('🔍 Проблема: Ошибка аутентификации');
                console.log('💡 Решение: Проверьте username/password в URI');
            }
            
            return false;
        }
    }

    generateFixInstructions() {
        console.log('\n🔧 ИНСТРУКЦИИ ПО ИСПРАВЛЕНИЮ:');
        console.log('=' .repeat(50));
        
        console.log('\n1. Проверьте Railway MongoDB сервис:');
        console.log('   - Зайдите в Railway Dashboard');
        console.log('   - Найдите MongoDB сервис');
        console.log('   - Убедитесь, что он запущен (зеленый статус)');
        
        console.log('\n2. Проверьте переменные окружения:');
        console.log('   - В основном сервисе AM8');
        console.log('   - Должны быть:');
        console.log(`     RAILWAY_MONGODB_URI = ${this.railwayMongoUri}`);
        console.log(`     RAILWAY_MONGODB_DATABASE = ${this.railwayMongoDb}`);
        
        console.log('\n3. Проверьте логи Railway MongoDB:');
        console.log('   - В Railway Dashboard → MongoDB сервис → Logs');
        console.log('   - Ищите ошибки запуска или подключения');
        
        console.log('\n4. Перезапустите сервисы:');
        console.log('   - Сначала MongoDB сервис');
        console.log('   - Потом основной сервис AM8');
        
        console.log('\n5. Проверьте сеть Railway:');
        console.log('   - MongoDB должен быть в том же проекте');
        console.log('   - Используйте внутренний URI (mongodb.railway.internal)');
    }

    async run() {
        console.log('🚀 Диагностика Railway MongoDB');
        console.log('📅 Время:', new Date().toISOString());
        console.log('=' .repeat(60));
        
        const isConnected = await this.testConnection();
        
        if (isConnected) {
            console.log('\n🎉 Railway MongoDB работает отлично!');
            console.log('✅ Проблема в конфигурации приложения');
            console.log('💡 Нужно обновить код для использования Railway MongoDB');
        } else {
            console.log('\n❌ Railway MongoDB не работает');
            this.generateFixInstructions();
        }
    }
}

if (require.main === module) {
    const diagnostic = new RailwayMongoDiagnostic();
    diagnostic.run()
        .then(() => {
            console.log('\n✅ Диагностика завершена');
        })
        .catch(error => {
            console.error('❌ Ошибка диагностики:', error);
            process.exit(1);
        });
}

module.exports = RailwayMongoDiagnostic;
