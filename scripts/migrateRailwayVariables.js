#!/usr/bin/env node

/**
 * Скрипт для переноса переменных окружения с MongoDB Atlas на Railway MongoDB
 */

const fs = require('fs');
const path = require('path');

class VariableMigrator {
    constructor() {
        this.mapping = {
            // Основные переменные
            'MONGO_URL': 'RAILWAY_MONGODB_URI',
            'MONGODB_URI': 'RAILWAY_MONGODB_URI',
            'MONGODB_DATABASE': 'RAILWAY_MONGODB_DATABASE',
            
            // Детали подключения
            'MONGOHOST': 'RAILWAY_MONGODB_HOST',
            'MONGOUSER': 'RAILWAY_MONGODB_USERNAME', 
            'MONGOPASSWORD': 'RAILWAY_MONGODB_PASSWORD',
            'MONGOPORT': 'RAILWAY_MONGODB_PORT',
            
            // Учетные данные
            'MONGO_INITDB_ROOT_USERNAME': 'RAILWAY_MONGODB_ROOT_USERNAME',
            'MONGO_INITDB_ROOT_PASSWORD': 'RAILWAY_MONGODB_ROOT_PASSWORD'
        };
    }

    generateMigrationInstructions() {
        console.log('🚀 Инструкции по переносу переменных окружения');
        console.log('=' .repeat(60));
        
        console.log('\n📋 Шаг 1: Создайте MongoDB сервис на Railway');
        console.log('1. Зайдите в Railway Dashboard');
        console.log('2. Выберите ваш проект');
        console.log('3. Нажмите "+ New" → "Database" → "MongoDB"');
        console.log('4. Дождитесь создания сервиса');
        
        console.log('\n📋 Шаг 2: Получите новые переменные');
        console.log('После создания MongoDB сервиса, перейдите в его раздел "Variables"');
        console.log('Скопируйте значения следующих переменных:');
        console.log('  - MONGODB_URI');
        console.log('  - MONGODB_DATABASE');
        console.log('  - MONGODB_USERNAME');
        console.log('  - MONGODB_PASSWORD');
        
        console.log('\n📋 Шаг 3: Обновите переменные в основном сервисе');
        console.log('В основном сервисе (не в MongoDB сервисе) добавьте:');
        
        console.log('\n🔧 Новые переменные для добавления:');
        for (const [oldVar, newVar] of Object.entries(this.mapping)) {
            console.log(`  ${newVar}=<значение_из_${oldVar}>`);
        }
        
        console.log('\n📋 Шаг 4: Удалите старые переменные (опционально)');
        console.log('После успешной миграции можно удалить:');
        for (const oldVar of Object.keys(this.mapping)) {
            console.log(`  - ${oldVar}`);
        }
        
        console.log('\n🎯 Приоритет подключения:');
        console.log('1. RAILWAY_MONGODB_URI (Railway MongoDB)');
        console.log('2. MONGODB_URI (MongoDB Atlas)');
        console.log('3. MONGO_URL (резервный)');
        
        this.generateRailwayCLICommands();
        this.generateManualInstructions();
    }

    generateRailwayCLICommands() {
        console.log('\n🛠️ Команды Railway CLI (если используете):');
        console.log('=' .repeat(50));
        
        console.log('\n# Добавление новых переменных:');
        console.log('railway variables set RAILWAY_MONGODB_URI="<новый_URI>"');
        console.log('railway variables set RAILWAY_MONGODB_DATABASE="energy_money_game"');
        console.log('railway variables set RAILWAY_MONGODB_USERNAME="<новый_username>"');
        console.log('railway variables set RAILWAY_MONGODB_PASSWORD="<новый_password>"');
        
        console.log('\n# Проверка переменных:');
        console.log('railway variables list');
        
        console.log('\n# Удаление старых переменных (после миграции):');
        for (const oldVar of Object.keys(this.mapping)) {
            console.log(`railway variables delete ${oldVar}`);
        }
    }

    generateManualInstructions() {
        console.log('\n📝 Ручная настройка через Dashboard:');
        console.log('=' .repeat(50));
        
        console.log('\n1. Перейдите в основной сервис → Variables');
        console.log('2. Нажмите "+ New Variable"');
        console.log('3. Добавьте переменные:');
        
        const variables = [
            {
                name: 'RAILWAY_MONGODB_URI',
                value: '<MONGODB_URI из нового MongoDB сервиса>',
                description: 'URI для подключения к Railway MongoDB'
            },
            {
                name: 'RAILWAY_MONGODB_DATABASE', 
                value: 'energy_money_game',
                description: 'Имя базы данных MongoDB'
            },
            {
                name: 'RAILWAY_MONGODB_USERNAME',
                value: '<MONGODB_USERNAME из нового MongoDB сервиса>',
                description: 'Имя пользователя MongoDB'
            },
            {
                name: 'RAILWAY_MONGODB_PASSWORD',
                value: '<MONGODB_PASSWORD из нового MongoDB сервиса>',
                description: 'Пароль MongoDB'
            }
        ];
        
        variables.forEach(({name, value, description}) => {
            console.log(`\n   Переменная: ${name}`);
            console.log(`   Значение: ${value}`);
            console.log(`   Описание: ${description}`);
        });
    }

    generateMigrationScript() {
        const script = `#!/bin/bash

# Скрипт для автоматического переноса переменных
# ВНИМАНИЕ: Замените <NEW_MONGODB_URI> на реальный URI из Railway MongoDB сервиса

echo "🚀 Начинаем перенос переменных окружения..."

# Добавляем новые переменные
railway variables set RAILWAY_MONGODB_URI="<NEW_MONGODB_URI>"
railway variables set RAILWAY_MONGODB_DATABASE="energy_money_game"

echo "✅ Новые переменные добавлены"

# Проверяем переменные
echo "📋 Текущие переменные:"
railway variables list

echo "🎉 Перенос завершен!"
echo "📝 Следующий шаг: запустите миграцию данных"
echo "   node scripts/migrateToRailwayMongo.js --dry-run"`;

        const scriptPath = path.join(__dirname, 'migrate-variables.sh');
        fs.writeFileSync(scriptPath, script);
        console.log(`\n📄 Создан скрипт: ${scriptPath}`);
    }

    run() {
        this.generateMigrationInstructions();
        this.generateMigrationScript();
        
        console.log('\n🎯 Следующие шаги:');
        console.log('1. Выполните инструкции выше');
        console.log('2. Запустите тестовую миграцию:');
        console.log('   node scripts/migrateToRailwayMongo.js --dry-run');
        console.log('3. Запустите реальную миграцию:');
        console.log('   node scripts/migrateToRailwayMongo.js');
        console.log('4. Перезапустите приложение');
    }
}

if (require.main === module) {
    const migrator = new VariableMigrator();
    migrator.run();
}

module.exports = VariableMigrator;

/**
 * Скрипт для переноса переменных окружения с MongoDB Atlas на Railway MongoDB
 */

const fs = require('fs');
const path = require('path');

class VariableMigrator {
    constructor() {
        this.mapping = {
            // Основные переменные
            'MONGO_URL': 'RAILWAY_MONGODB_URI',
            'MONGODB_URI': 'RAILWAY_MONGODB_URI',
            'MONGODB_DATABASE': 'RAILWAY_MONGODB_DATABASE',
            
            // Детали подключения
            'MONGOHOST': 'RAILWAY_MONGODB_HOST',
            'MONGOUSER': 'RAILWAY_MONGODB_USERNAME', 
            'MONGOPASSWORD': 'RAILWAY_MONGODB_PASSWORD',
            'MONGOPORT': 'RAILWAY_MONGODB_PORT',
            
            // Учетные данные
            'MONGO_INITDB_ROOT_USERNAME': 'RAILWAY_MONGODB_ROOT_USERNAME',
            'MONGO_INITDB_ROOT_PASSWORD': 'RAILWAY_MONGODB_ROOT_PASSWORD'
        };
    }

    generateMigrationInstructions() {
        console.log('🚀 Инструкции по переносу переменных окружения');
        console.log('=' .repeat(60));
        
        console.log('\n📋 Шаг 1: Создайте MongoDB сервис на Railway');
        console.log('1. Зайдите в Railway Dashboard');
        console.log('2. Выберите ваш проект');
        console.log('3. Нажмите "+ New" → "Database" → "MongoDB"');
        console.log('4. Дождитесь создания сервиса');
        
        console.log('\n📋 Шаг 2: Получите новые переменные');
        console.log('После создания MongoDB сервиса, перейдите в его раздел "Variables"');
        console.log('Скопируйте значения следующих переменных:');
        console.log('  - MONGODB_URI');
        console.log('  - MONGODB_DATABASE');
        console.log('  - MONGODB_USERNAME');
        console.log('  - MONGODB_PASSWORD');
        
        console.log('\n📋 Шаг 3: Обновите переменные в основном сервисе');
        console.log('В основном сервисе (не в MongoDB сервисе) добавьте:');
        
        console.log('\n🔧 Новые переменные для добавления:');
        for (const [oldVar, newVar] of Object.entries(this.mapping)) {
            console.log(`  ${newVar}=<значение_из_${oldVar}>`);
        }
        
        console.log('\n📋 Шаг 4: Удалите старые переменные (опционально)');
        console.log('После успешной миграции можно удалить:');
        for (const oldVar of Object.keys(this.mapping)) {
            console.log(`  - ${oldVar}`);
        }
        
        console.log('\n🎯 Приоритет подключения:');
        console.log('1. RAILWAY_MONGODB_URI (Railway MongoDB)');
        console.log('2. MONGODB_URI (MongoDB Atlas)');
        console.log('3. MONGO_URL (резервный)');
        
        this.generateRailwayCLICommands();
        this.generateManualInstructions();
    }

    generateRailwayCLICommands() {
        console.log('\n🛠️ Команды Railway CLI (если используете):');
        console.log('=' .repeat(50));
        
        console.log('\n# Добавление новых переменных:');
        console.log('railway variables set RAILWAY_MONGODB_URI="<новый_URI>"');
        console.log('railway variables set RAILWAY_MONGODB_DATABASE="energy_money_game"');
        console.log('railway variables set RAILWAY_MONGODB_USERNAME="<новый_username>"');
        console.log('railway variables set RAILWAY_MONGODB_PASSWORD="<новый_password>"');
        
        console.log('\n# Проверка переменных:');
        console.log('railway variables list');
        
        console.log('\n# Удаление старых переменных (после миграции):');
        for (const oldVar of Object.keys(this.mapping)) {
            console.log(`railway variables delete ${oldVar}`);
        }
    }

    generateManualInstructions() {
        console.log('\n📝 Ручная настройка через Dashboard:');
        console.log('=' .repeat(50));
        
        console.log('\n1. Перейдите в основной сервис → Variables');
        console.log('2. Нажмите "+ New Variable"');
        console.log('3. Добавьте переменные:');
        
        const variables = [
            {
                name: 'RAILWAY_MONGODB_URI',
                value: '<MONGODB_URI из нового MongoDB сервиса>',
                description: 'URI для подключения к Railway MongoDB'
            },
            {
                name: 'RAILWAY_MONGODB_DATABASE', 
                value: 'energy_money_game',
                description: 'Имя базы данных MongoDB'
            },
            {
                name: 'RAILWAY_MONGODB_USERNAME',
                value: '<MONGODB_USERNAME из нового MongoDB сервиса>',
                description: 'Имя пользователя MongoDB'
            },
            {
                name: 'RAILWAY_MONGODB_PASSWORD',
                value: '<MONGODB_PASSWORD из нового MongoDB сервиса>',
                description: 'Пароль MongoDB'
            }
        ];
        
        variables.forEach(({name, value, description}) => {
            console.log(`\n   Переменная: ${name}`);
            console.log(`   Значение: ${value}`);
            console.log(`   Описание: ${description}`);
        });
    }

    generateMigrationScript() {
        const script = `#!/bin/bash

# Скрипт для автоматического переноса переменных
# ВНИМАНИЕ: Замените <NEW_MONGODB_URI> на реальный URI из Railway MongoDB сервиса

echo "🚀 Начинаем перенос переменных окружения..."

# Добавляем новые переменные
railway variables set RAILWAY_MONGODB_URI="<NEW_MONGODB_URI>"
railway variables set RAILWAY_MONGODB_DATABASE="energy_money_game"

echo "✅ Новые переменные добавлены"

# Проверяем переменные
echo "📋 Текущие переменные:"
railway variables list

echo "🎉 Перенос завершен!"
echo "📝 Следующий шаг: запустите миграцию данных"
echo "   node scripts/migrateToRailwayMongo.js --dry-run"`;

        const scriptPath = path.join(__dirname, 'migrate-variables.sh');
        fs.writeFileSync(scriptPath, script);
        console.log(`\n📄 Создан скрипт: ${scriptPath}`);
    }

    run() {
        this.generateMigrationInstructions();
        this.generateMigrationScript();
        
        console.log('\n🎯 Следующие шаги:');
        console.log('1. Выполните инструкции выше');
        console.log('2. Запустите тестовую миграцию:');
        console.log('   node scripts/migrateToRailwayMongo.js --dry-run');
        console.log('3. Запустите реальную миграцию:');
        console.log('   node scripts/migrateToRailwayMongo.js');
        console.log('4. Перезапустите приложение');
    }
}

if (require.main === module) {
    const migrator = new VariableMigrator();
    migrator.run();
}

module.exports = VariableMigrator;
