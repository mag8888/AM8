#!/usr/bin/env node

/**
 * Скрипт обновления конфигурации для использования Railway MongoDB
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    // Файлы для обновления
    FILES_TO_UPDATE: [
        'database/mongo.js',
        'config/database.js',
        'server.js'
    ],
    
    // Переменные окружения для обновления
    ENV_VARS: [
        'MONGODB_URI',
        'MONGODB_DATABASE',
        'MONGODB_USERNAME',
        'MONGODB_PASSWORD'
    ]
};

class ConfigUpdater {
    constructor() {
        this.changes = [];
    }

    updateMongoConfig() {
        const filePath = path.join(__dirname, '..', 'database', 'mongo.js');
        
        if (!fs.existsSync(filePath)) {
            console.log('⚠️ Файл database/mongo.js не найден, пропускаем');
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Обновляем логику подключения для Railway MongoDB
        const newContent = content.replace(
            /const uri = process\.env\.MONGODB_URI \|\| process\.env\.MONGO_URL \|\| config\.MONGODB\.URI;/,
            `// Приоритет: Railway MongoDB -> MongoDB Atlas -> Config
const uri = process.env.RAILWAY_MONGODB_URI || 
            process.env.MONGODB_URI || 
            process.env.MONGO_URL || 
            config.MONGODB.URI;`
        );

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            this.changes.push('database/mongo.js - обновлена логика подключения');
            console.log('✅ Обновлен database/mongo.js');
        } else {
            console.log('ℹ️ database/mongo.js уже обновлен');
        }
    }

    updateDatabaseConfig() {
        const filePath = path.join(__dirname, '..', 'config', 'database.js');
        
        if (!fs.existsSync(filePath)) {
            console.log('⚠️ Файл config/database.js не найден, пропускаем');
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Добавляем поддержку Railway MongoDB
        const railwayConfig = `
// Railway MongoDB конфигурация
const RAILWAY_MONGODB_URI = process.env.RAILWAY_MONGODB_URI;
const RAILWAY_MONGODB_DATABASE = process.env.RAILWAY_MONGODB_DATABASE || 'energy_money_game';

module.exports = {
    MONGODB: {
        USERNAME: MONGODB_USERNAME,
        PASSWORD: MONGODB_PASSWORD,
        CLUSTER: MONGODB_CLUSTER,
        DATABASE: RAILWAY_MONGODB_DATABASE || MONGODB_DATABASE,
        OPTIONS: MONGODB_OPTIONS,
        URI: RAILWAY_MONGODB_URI || \`mongodb+srv://\${MONGODB_USERNAME}:\${MONGODB_PASSWORD}@\${MONGODB_CLUSTER}/\${MONGODB_DATABASE}?\${MONGODB_OPTIONS}\`
    },`;

        if (!content.includes('RAILWAY_MONGODB_URI')) {
            content = content.replace(
                'module.exports = {',
                railwayConfig
            );
            
            fs.writeFileSync(filePath, content);
            this.changes.push('config/database.js - добавлена поддержка Railway MongoDB');
            console.log('✅ Обновлен config/database.js');
        } else {
            console.log('ℹ️ config/database.js уже обновлен');
        }
    }

    createRailwayConfig() {
        const configPath = path.join(__dirname, '..', 'railway.config.js');
        
        const config = `/**
 * Railway конфигурация для MongoDB
 */

module.exports = {
    // Переменные окружения для Railway
    env: {
        RAILWAY_MONGODB_URI: {
            description: 'MongoDB URI от Railway сервиса',
            required: true
        },
        RAILWAY_MONGODB_DATABASE: {
            description: 'Имя базы данных MongoDB на Railway',
            default: 'energy_money_game'
        }
    },
    
    // Настройки подключения
    database: {
        // Приоритет подключения: Railway -> Atlas -> Local
        connectionPriority: [
            'RAILWAY_MONGODB_URI',
            'MONGODB_URI', 
            'MONGO_URL'
        ]
    }
};`;

        fs.writeFileSync(configPath, config);
        this.changes.push('railway.config.js - создан конфигурационный файл');
        console.log('✅ Создан railway.config.js');
    }

    updateServerConfig() {
        const filePath = path.join(__dirname, '..', 'server.js');
        
        if (!fs.existsSync(filePath)) {
            console.log('⚠️ Файл server.js не найден, пропускаем');
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Добавляем логирование используемой базы данных
        const loggingCode = `
// Логирование используемой базы данных
const dbUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
if (dbUri) {
    if (dbUri.includes('railway')) {
        console.log('🗄️ Database: Используется Railway MongoDB');
    } else if (dbUri.includes('mongodb.net')) {
        console.log('🗄️ Database: Используется MongoDB Atlas');
    } else {
        console.log('🗄️ Database: Используется локальная MongoDB');
    }
} else {
    console.log('⚠️ Database: URI не найден, проверьте переменные окружения');
}`;

        if (!content.includes('Railway MongoDB')) {
            content = content.replace(
                'const app = express();',
                `const app = express();${loggingCode}`
            );
            
            fs.writeFileSync(filePath, content);
            this.changes.push('server.js - добавлено логирование базы данных');
            console.log('✅ Обновлен server.js');
        } else {
            console.log('ℹ️ server.js уже обновлен');
        }
    }

    update() {
        console.log('🔧 Обновление конфигурации для Railway MongoDB...');
        
        this.updateMongoConfig();
        this.updateDatabaseConfig();
        this.createRailwayConfig();
        this.updateServerConfig();
        
        console.log('\n✅ Конфигурация обновлена!');
        
        if (this.changes.length > 0) {
            console.log('\n📝 Внесенные изменения:');
            this.changes.forEach(change => console.log(`  - ${change}`));
        }
        
        console.log('\n📋 Следующие шаги:');
        console.log('1. Создайте MongoDB сервис на Railway');
        console.log('2. Установите переменные окружения:');
        console.log('   - RAILWAY_MONGODB_URI');
        console.log('   - RAILWAY_MONGODB_DATABASE');
        console.log('3. Запустите миграцию: node scripts/migrateToRailwayMongo.js');
        console.log('4. Перезапустите приложение');
    }
}

if (require.main === module) {
    const updater = new ConfigUpdater();
    updater.update();
}

module.exports = ConfigUpdater;

/**
 * Скрипт обновления конфигурации для использования Railway MongoDB
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    // Файлы для обновления
    FILES_TO_UPDATE: [
        'database/mongo.js',
        'config/database.js',
        'server.js'
    ],
    
    // Переменные окружения для обновления
    ENV_VARS: [
        'MONGODB_URI',
        'MONGODB_DATABASE',
        'MONGODB_USERNAME',
        'MONGODB_PASSWORD'
    ]
};

class ConfigUpdater {
    constructor() {
        this.changes = [];
    }

    updateMongoConfig() {
        const filePath = path.join(__dirname, '..', 'database', 'mongo.js');
        
        if (!fs.existsSync(filePath)) {
            console.log('⚠️ Файл database/mongo.js не найден, пропускаем');
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Обновляем логику подключения для Railway MongoDB
        const newContent = content.replace(
            /const uri = process\.env\.MONGODB_URI \|\| process\.env\.MONGO_URL \|\| config\.MONGODB\.URI;/,
            `// Приоритет: Railway MongoDB -> MongoDB Atlas -> Config
const uri = process.env.RAILWAY_MONGODB_URI || 
            process.env.MONGODB_URI || 
            process.env.MONGO_URL || 
            config.MONGODB.URI;`
        );

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            this.changes.push('database/mongo.js - обновлена логика подключения');
            console.log('✅ Обновлен database/mongo.js');
        } else {
            console.log('ℹ️ database/mongo.js уже обновлен');
        }
    }

    updateDatabaseConfig() {
        const filePath = path.join(__dirname, '..', 'config', 'database.js');
        
        if (!fs.existsSync(filePath)) {
            console.log('⚠️ Файл config/database.js не найден, пропускаем');
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Добавляем поддержку Railway MongoDB
        const railwayConfig = `
// Railway MongoDB конфигурация
const RAILWAY_MONGODB_URI = process.env.RAILWAY_MONGODB_URI;
const RAILWAY_MONGODB_DATABASE = process.env.RAILWAY_MONGODB_DATABASE || 'energy_money_game';

module.exports = {
    MONGODB: {
        USERNAME: MONGODB_USERNAME,
        PASSWORD: MONGODB_PASSWORD,
        CLUSTER: MONGODB_CLUSTER,
        DATABASE: RAILWAY_MONGODB_DATABASE || MONGODB_DATABASE,
        OPTIONS: MONGODB_OPTIONS,
        URI: RAILWAY_MONGODB_URI || \`mongodb+srv://\${MONGODB_USERNAME}:\${MONGODB_PASSWORD}@\${MONGODB_CLUSTER}/\${MONGODB_DATABASE}?\${MONGODB_OPTIONS}\`
    },`;

        if (!content.includes('RAILWAY_MONGODB_URI')) {
            content = content.replace(
                'module.exports = {',
                railwayConfig
            );
            
            fs.writeFileSync(filePath, content);
            this.changes.push('config/database.js - добавлена поддержка Railway MongoDB');
            console.log('✅ Обновлен config/database.js');
        } else {
            console.log('ℹ️ config/database.js уже обновлен');
        }
    }

    createRailwayConfig() {
        const configPath = path.join(__dirname, '..', 'railway.config.js');
        
        const config = `/**
 * Railway конфигурация для MongoDB
 */

module.exports = {
    // Переменные окружения для Railway
    env: {
        RAILWAY_MONGODB_URI: {
            description: 'MongoDB URI от Railway сервиса',
            required: true
        },
        RAILWAY_MONGODB_DATABASE: {
            description: 'Имя базы данных MongoDB на Railway',
            default: 'energy_money_game'
        }
    },
    
    // Настройки подключения
    database: {
        // Приоритет подключения: Railway -> Atlas -> Local
        connectionPriority: [
            'RAILWAY_MONGODB_URI',
            'MONGODB_URI', 
            'MONGO_URL'
        ]
    }
};`;

        fs.writeFileSync(configPath, config);
        this.changes.push('railway.config.js - создан конфигурационный файл');
        console.log('✅ Создан railway.config.js');
    }

    updateServerConfig() {
        const filePath = path.join(__dirname, '..', 'server.js');
        
        if (!fs.existsSync(filePath)) {
            console.log('⚠️ Файл server.js не найден, пропускаем');
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Добавляем логирование используемой базы данных
        const loggingCode = `
// Логирование используемой базы данных
const dbUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
if (dbUri) {
    if (dbUri.includes('railway')) {
        console.log('🗄️ Database: Используется Railway MongoDB');
    } else if (dbUri.includes('mongodb.net')) {
        console.log('🗄️ Database: Используется MongoDB Atlas');
    } else {
        console.log('🗄️ Database: Используется локальная MongoDB');
    }
} else {
    console.log('⚠️ Database: URI не найден, проверьте переменные окружения');
}`;

        if (!content.includes('Railway MongoDB')) {
            content = content.replace(
                'const app = express();',
                `const app = express();${loggingCode}`
            );
            
            fs.writeFileSync(filePath, content);
            this.changes.push('server.js - добавлено логирование базы данных');
            console.log('✅ Обновлен server.js');
        } else {
            console.log('ℹ️ server.js уже обновлен');
        }
    }

    update() {
        console.log('🔧 Обновление конфигурации для Railway MongoDB...');
        
        this.updateMongoConfig();
        this.updateDatabaseConfig();
        this.createRailwayConfig();
        this.updateServerConfig();
        
        console.log('\n✅ Конфигурация обновлена!');
        
        if (this.changes.length > 0) {
            console.log('\n📝 Внесенные изменения:');
            this.changes.forEach(change => console.log(`  - ${change}`));
        }
        
        console.log('\n📋 Следующие шаги:');
        console.log('1. Создайте MongoDB сервис на Railway');
        console.log('2. Установите переменные окружения:');
        console.log('   - RAILWAY_MONGODB_URI');
        console.log('   - RAILWAY_MONGODB_DATABASE');
        console.log('3. Запустите миграцию: node scripts/migrateToRailwayMongo.js');
        console.log('4. Перезапустите приложение');
    }
}

if (require.main === module) {
    const updater = new ConfigUpdater();
    updater.update();
}

module.exports = ConfigUpdater;
