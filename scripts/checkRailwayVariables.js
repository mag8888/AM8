#!/usr/bin/env node

/**
 * Скрипт для проверки переменных окружения Railway
 */

class RailwayVariableChecker {
    constructor() {
        this.requiredVars = [
            'RAILWAY_MONGODB_URI',
            'RAILWAY_MONGODB_DATABASE',
            'MONGODB_URI',
            'MONGODB_DATABASE',
            'MONGO_URL'
        ];
    }

    checkVariables() {
        console.log('🔍 Проверка переменных окружения Railway MongoDB');
        console.log('=' .repeat(60));
        
        console.log('\n📋 Текущие переменные:');
        
        let hasRailwayVars = false;
        let hasOldVars = false;
        
        for (const varName of this.requiredVars) {
            const value = process.env[varName];
            if (value) {
                const isRailway = varName.startsWith('RAILWAY_');
                const isOld = !isRailway;
                
                if (isRailway) hasRailwayVars = true;
                if (isOld) hasOldVars = true;
                
                const displayValue = this.maskValue(value);
                console.log(`  ✅ ${varName}: ${displayValue}`);
            } else {
                console.log(`  ❌ ${varName}: NOT SET`);
            }
        }
        
        console.log('\n🎯 Анализ:');
        
        if (hasRailwayVars) {
            console.log('  ✅ Railway MongoDB переменные найдены');
        } else {
            console.log('  ❌ Railway MongoDB переменные НЕ найдены');
        }
        
        if (hasOldVars) {
            console.log('  ⚠️ Старые MongoDB переменные найдены (могут конфликтовать)');
        } else {
            console.log('  ℹ️ Старые MongoDB переменные не найдены');
        }
        
        this.generateRecommendations(hasRailwayVars, hasOldVars);
    }

    maskValue(value) {
        if (!value) return 'NOT SET';
        
        // Маскируем чувствительные данные
        if (value.includes('mongodb://') || value.includes('mongodb+srv://')) {
            return value.replace(/(mongodb[+]?srv?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
        }
        
        if (value.length > 20) {
            return value.substring(0, 10) + '...' + value.substring(value.length - 5);
        }
        
        return value;
    }

    generateRecommendations(hasRailwayVars, hasOldVars) {
        console.log('\n📋 Рекомендации:');
        
        if (!hasRailwayVars) {
            console.log('\n🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Railway MongoDB переменные не настроены!');
            console.log('\n🔧 Решение:');
            console.log('1. Создайте MongoDB сервис на Railway');
            console.log('2. Добавьте переменные в основной сервис:');
            console.log('   - RAILWAY_MONGODB_URI');
            console.log('   - RAILWAY_MONGODB_DATABASE');
            console.log('3. Перезапустите сервис');
        }
        
        if (hasRailwayVars && hasOldVars) {
            console.log('\n⚠️ Конфликт переменных: есть и старые, и новые переменные');
            console.log('\n🔧 Решение:');
            console.log('1. Удалите старые переменные MongoDB Atlas');
            console.log('2. Оставьте только Railway переменные');
            console.log('3. Перезапустите сервис');
        }
        
        if (hasRailwayVars && !hasOldVars) {
            console.log('\n✅ Конфигурация выглядит правильно');
            console.log('\n🔧 Если все еще есть проблемы:');
            console.log('1. Проверьте корректность RAILWAY_MONGODB_URI');
            console.log('2. Убедитесь, что MongoDB сервис на Railway запущен');
            console.log('3. Проверьте логи MongoDB сервиса');
        }
        
        this.generateQuickFix();
    }

    generateQuickFix() {
        console.log('\n🚀 Быстрое исправление:');
        console.log('=' .repeat(40));
        
        console.log('\n1. Создайте MongoDB сервис на Railway:');
        console.log('   - Railway Dashboard → "+ New" → "Database" → "MongoDB"');
        
        console.log('\n2. Добавьте переменные в основной сервис:');
        console.log('   RAILWAY_MONGODB_URI=<URI из MongoDB сервиса>');
        console.log('   RAILWAY_MONGODB_DATABASE=energy_money_game');
        
        console.log('\n3. Удалите старые переменные (если есть):');
        console.log('   MONGO_URL');
        console.log('   MONGODB_URI');
        console.log('   MONGODB_DATABASE');
        
        console.log('\n4. Перезапустите сервис');
        
        console.log('\n📝 Команды Railway CLI:');
        console.log('   railway variables set RAILWAY_MONGODB_URI="<новый_URI>"');
        console.log('   railway variables set RAILWAY_MONGODB_DATABASE="energy_money_game"');
        console.log('   railway variables delete MONGO_URL');
        console.log('   railway variables delete MONGODB_URI');
    }

    run() {
        this.checkVariables();
    }
}

if (require.main === module) {
    const checker = new RailwayVariableChecker();
    checker.run();
}

module.exports = RailwayVariableChecker;

