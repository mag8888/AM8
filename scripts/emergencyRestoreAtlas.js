#!/usr/bin/env node

/**
 * Экстренное восстановление MongoDB Atlas
 */

class EmergencyAtlasRestore {
    constructor() {
        this.atlasUri = 'mongodb+srv://xqrmedia_db_user:pOs1rKxSv9Y3e7rl@cluster0.wvumcaj.mongodb.net/energy_money_game?retryWrites=true&w=majority&appName=Cluster0';
        this.atlasDatabase = 'energy_money_game';
    }

    generateRestoreInstructions() {
        console.log('🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ MONGODB ATLAS');
        console.log('=' .repeat(60));
        
        console.log('\n📋 ПРОБЛЕМА:');
        console.log('❌ Railway MongoDB не подключился');
        console.log('❌ Rate limiting все еще активен');
        console.log('❌ Сервер возвращает HTTP 429 ошибки');
        
        console.log('\n🔧 СРОЧНОЕ РЕШЕНИЕ:');
        console.log('1. Зайдите в Railway Dashboard: https://railway.app/dashboard');
        console.log('2. Выберите проект AM8');
        console.log('3. Перейдите в раздел "Variables"');
        console.log('4. УДАЛИТЕ Railway MongoDB переменные:');
        console.log('   - RAILWAY_MONGODB_URI');
        console.log('   - RAILWAY_MONGODB_DATABASE');
        console.log('   - RAILWAY_MONGODB_USERNAME');
        console.log('   - RAILWAY_MONGODB_PASSWORD');
        console.log('5. ДОБАВЬТЕ MongoDB Atlas переменные:');
        
        console.log('\n📝 ПЕРЕМЕННЫЕ ДЛЯ ДОБАВЛЕНИЯ:');
        console.log('=' .repeat(50));
        console.log(`MONGODB_URI = ${this.atlasUri}`);
        console.log(`MONGODB_DATABASE = ${this.atlasDatabase}`);
        
        console.log('\n🚀 КОМАНДЫ RAILWAY CLI:');
        console.log('=' .repeat(40));
        console.log(`railway variables --set "MONGODB_URI=${this.atlasUri}"`);
        console.log(`railway variables --set "MONGODB_DATABASE=${this.atlasDatabase}"`);
        console.log('railway variables delete RAILWAY_MONGODB_URI');
        console.log('railway variables delete RAILWAY_MONGODB_DATABASE');
        console.log('railway variables delete RAILWAY_MONGODB_USERNAME');
        console.log('railway variables delete RAILWAY_MONGODB_PASSWORD');
        
        console.log('\n📋 ПОСЛЕ ВОССТАНОВЛЕНИЯ:');
        console.log('1. Перезапустите сервис на Railway');
        console.log('2. Проверьте логи - должно появиться:');
        console.log('   🗄️ DB: Используем MongoDB Atlas');
        console.log('   ✅ Подключение к MongoDB Atlas установлено');
        console.log('3. Проверьте, что rate limiting исчез');
        
        this.generateAlternativeSolution();
    }

    generateAlternativeSolution() {
        console.log('\n🔧 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ:');
        console.log('=' .repeat(50));
        
        console.log('\n📝 Если Railway CLI не работает:');
        console.log('1. Используйте Railway Dashboard');
        console.log('2. Или временно отключите rate limiting в коде');
        
        console.log('\n📝 Временное отключение rate limiting:');
        console.log('1. Найдите в server.js строки с rateLimit');
        console.log('2. Закомментируйте или удалите их');
        console.log('3. Закоммитьте и запушьте изменения');
        
        console.log('\n🎯 ПРИОРИТЕТ:');
        console.log('1. СНАЧАЛА восстановите MongoDB Atlas (быстро)');
        console.log('2. ПОТОМ разберитесь с Railway MongoDB (долгосрочно)');
        console.log('3. ПЕРЕЗАПУСТИТЕ сервис после изменений');
    }

    run() {
        console.log('🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ MONGODB ATLAS');
        console.log('📅 Время:', new Date().toISOString());
        
        this.generateRestoreInstructions();
        
        console.log('\n✅ После восстановления MongoDB Atlas:');
        console.log('- Rate limiting должен исчезнуть');
        console.log('- Игра должна работать нормально');
        console.log('- Можно будет спокойно разобраться с Railway MongoDB');
    }
}

if (require.main === module) {
    const restorer = new EmergencyAtlasRestore();
    restorer.run();
}

module.exports = EmergencyAtlasRestore;
