#!/usr/bin/env node

/**
 * Экстренное исправление конфигурации Railway
 */

class EmergencyRailwayFix {
    constructor() {
        this.railwayMongoUri = 'mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@mongodb.railway.internal:27017';
        this.railwayMongoDb = 'energy_money_game';
    }

    generateEmergencyInstructions() {
        console.log('🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ RAILWAY MONGODB');
        console.log('=' .repeat(60));
        
        console.log('\n📋 ПРОБЛЕМА:');
        console.log('❌ MONGODB_URI: NOT SET');
        console.log('❌ Сервер пытается подключиться к cluster0.xyz123.mongodb.net');
        console.log('❌ Railway MongoDB переменные не установлены');
        
        console.log('\n🔧 РЕШЕНИЕ:');
        console.log('1. Зайдите в Railway Dashboard: https://railway.app/dashboard');
        console.log('2. Выберите проект AM8');
        console.log('3. Перейдите в раздел "Variables"');
        console.log('4. УДАЛИТЕ старые переменные (если есть):');
        console.log('   - MONGODB_URI');
        console.log('   - MONGODB_DATABASE');
        console.log('   - MONGO_URL');
        console.log('5. ДОБАВЬТЕ новые переменные:');
        
        console.log('\n📝 ПЕРЕМЕННЫЕ ДЛЯ ДОБАВЛЕНИЯ:');
        console.log('=' .repeat(40));
        console.log(`RAILWAY_MONGODB_URI = ${this.railwayMongoUri}`);
        console.log(`RAILWAY_MONGODB_DATABASE = ${this.railwayMongoDb}`);
        console.log(`RAILWAY_MONGODB_USERNAME = mongo`);
        console.log(`RAILWAY_MONGODB_PASSWORD = XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT`);
        
        console.log('\n🚀 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ:');
        console.log('Если Railway MongoDB не работает, восстановите MongoDB Atlas:');
        console.log('MONGODB_URI = mongodb+srv://xqrmedia_db_user:pOs1rKxSv9Y3e7rl@cluster0.wvumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0');
        console.log('MONGODB_DATABASE = energy_money_game');
        
        console.log('\n📋 ПОСЛЕ УСТАНОВКИ ПЕРЕМЕННЫХ:');
        console.log('1. Перезапустите сервис на Railway');
        console.log('2. Проверьте логи на ошибки');
        console.log('3. Убедитесь, что подключение успешно');
        
        this.generateQuickFixScript();
    }

    generateQuickFixScript() {
        console.log('\n🔧 БЫСТРОЕ ИСПРАВЛЕНИЕ ЧЕРЕЗ КОД:');
        console.log('=' .repeat(50));
        
        console.log('\n📝 Создайте файл .env на Railway с содержимым:');
        console.log('RAILWAY_MONGODB_URI=mongodb://mongo:XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT@mongodb.railway.internal:27017');
        console.log('RAILWAY_MONGODB_DATABASE=energy_money_game');
        console.log('RAILWAY_MONGODB_USERNAME=mongo');
        console.log('RAILWAY_MONGODB_PASSWORD=XFAMLKzevqVGJxxIXcXLOCSonYXKtWxT');
        
        console.log('\n📝 Или временно восстановите MongoDB Atlas:');
        console.log('MONGODB_URI=mongodb+srv://xqrmedia_db_user:pOs1rKxSv9Y3e7rl@cluster0.wvumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0');
        console.log('MONGODB_DATABASE=energy_money_game');
    }

    run() {
        console.log('🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ RAILWAY MONGODB');
        console.log('📅 Время:', new Date().toISOString());
        
        this.generateEmergencyInstructions();
        
        console.log('\n🎯 ПРИОРИТЕТ:');
        console.log('1. СНАЧАЛА попробуйте Railway MongoDB (рекомендуется)');
        console.log('2. ЕСЛИ не работает - восстановите MongoDB Atlas');
        console.log('3. ПЕРЕЗАПУСТИТЕ сервис после установки переменных');
        
        console.log('\n✅ После исправления сервер должен показать:');
        console.log('🗄️ DB: Используем Railway MongoDB');
        console.log('✅ Подключение к Railway MongoDB установлено');
    }
}

if (require.main === module) {
    const fixer = new EmergencyRailwayFix();
    fixer.run();
}

module.exports = EmergencyRailwayFix;
