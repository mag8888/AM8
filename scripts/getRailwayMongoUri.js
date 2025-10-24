#!/usr/bin/env node

/**
 * Получение правильного URI для Railway MongoDB
 */

class RailwayMongoUriHelper {
    constructor() {
        this.possibleUris = [
            // Внутренний URI (для сервисов в том же проекте)
            'mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@mongodb.railway.internal:27017',
            
            // Внешний URI (если внутренний не работает)
            'mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@containers-us-west-xxx.railway.app:27017',
            
            // Альтернативный формат
            'mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@mongodb-production.railway.internal:27017'
        ];
    }

    async testUris() {
        console.log('🔍 Тестирование различных URI для Railway MongoDB...');
        
        const { MongoClient } = require('mongodb');
        
        for (let i = 0; i < this.possibleUris.length; i++) {
            const uri = this.possibleUris[i];
            console.log(`\n📡 Тестируем URI ${i + 1}: ${uri}`);
            
            try {
                const client = new MongoClient(uri);
                await client.connect();
                console.log('✅ Подключение успешно!');
                
                const db = client.db('energy_money_game');
                const collections = await db.listCollections().toArray();
                console.log('✅ База данных доступна!');
                console.log('📦 Коллекции:', collections.map(c => c.name));
                
                await client.close();
                console.log('🎉 Этот URI работает!');
                
                return uri;
                
            } catch (error) {
                console.log('❌ Ошибка:', error.message);
            }
        }
        
        return null;
    }

    generateInstructions() {
        console.log('\n🔧 ИНСТРУКЦИИ ПО НАСТРОЙКЕ RAILWAY MONGODB:');
        console.log('=' .repeat(60));
        
        console.log('\n1. В Railway Dashboard:');
        console.log('   - Найдите MongoDB сервис');
        console.log('   - Перейдите в раздел "Variables"');
        console.log('   - Скопируйте значение MONGODB_URI');
        
        console.log('\n2. Возможные форматы URI:');
        console.log('   - Внутренний: mongodb://mongo:password@mongodb.railway.internal:27017');
        console.log('   - Внешний: mongodb://mongo:password@containers-us-west-xxx.railway.app:27017');
        console.log('   - С доменом: mongodb://mongo:password@mongodb-production.railway.internal:27017');
        
        console.log('\n3. Если ни один URI не работает:');
        console.log('   - Перезапустите MongoDB сервис');
        console.log('   - Проверьте логи MongoDB сервиса');
        console.log('   - Убедитесь, что сервис в том же проекте');
        
        console.log('\n4. После получения рабочего URI:');
        console.log('   - Добавьте в переменные основного сервиса AM8:');
        console.log('     RAILWAY_MONGODB_URI = <рабочий_URI>');
        console.log('     RAILWAY_MONGODB_DATABASE = energy_money_game');
        console.log('   - Перезапустите основной сервис AM8');
    }

    async run() {
        console.log('🚀 Поиск рабочего URI для Railway MongoDB');
        console.log('📅 Время:', new Date().toISOString());
        console.log('=' .repeat(60));
        
        const workingUri = await this.testUris();
        
        if (workingUri) {
            console.log('\n🎉 НАЙДЕН РАБОЧИЙ URI!');
            console.log('=' .repeat(40));
            console.log(`✅ URI: ${workingUri}`);
            console.log('\n📝 Добавьте в Railway Dashboard:');
            console.log(`RAILWAY_MONGODB_URI = ${workingUri}`);
            console.log('RAILWAY_MONGODB_DATABASE = energy_money_game');
        } else {
            console.log('\n❌ НИ ОДИН URI НЕ РАБОТАЕТ');
            this.generateInstructions();
        }
    }
}

if (require.main === module) {
    const helper = new RailwayMongoUriHelper();
    helper.run()
        .then(() => {
            console.log('\n✅ Поиск URI завершен');
        })
        .catch(error => {
            console.error('❌ Ошибка поиска URI:', error);
            process.exit(1);
        });
}

module.exports = RailwayMongoUriHelper;
