#!/usr/bin/env node

/**
 * Скрипт для восстановления подключения к базе данных
 */

class DatabaseFixer {
    constructor() {
        this.atlasConfig = {
            username: 'xqrmedia_db_user',
            password: 'pOs1rKxSv9Y3e7rl',
            cluster: 'cluster0.wvumcaj.mongodb.net',
            database: 'energy_money_game',
            options: 'retryWrites=true&w=majority&appName=Cluster0'
        };
    }

    generateAtlasUri() {
        const { username, password, cluster, database, options } = this.atlasConfig;
        return `mongodb+srv://${username}:${password}@${cluster}/${database}?${options}`;
    }

    checkCurrentConfig() {
        console.log('🔍 Проверка текущей конфигурации базы данных...');
        console.log('=' .repeat(60));
        
        const currentVars = [
            'MONGODB_URI',
            'MONGO_URL', 
            'RAILWAY_MONGODB_URI',
            'RAILWAY_MONGODB_DATABASE'
        ];
        
        console.log('\n📋 Текущие переменные окружения:');
        for (const varName of currentVars) {
            const value = process.env[varName];
            if (value) {
                const masked = this.maskValue(value);
                console.log(`  ✅ ${varName}: ${masked}`);
            } else {
                console.log(`  ❌ ${varName}: NOT SET`);
            }
        }
    }

    maskValue(value) {
        if (!value) return 'NOT SET';
        
        if (value.includes('mongodb://') || value.includes('mongodb+srv://')) {
            return value.replace(/(mongodb[+]?srv?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
        }
        
        return value.substring(0, 20) + '...';
    }

    generateFixCommands() {
        console.log('\n🔧 Команды для восстановления MongoDB Atlas:');
        console.log('=' .repeat(50));
        
        const atlasUri = this.generateAtlasUri();
        
        console.log('\n📝 Railway CLI команды:');
        console.log(`railway variables set MONGODB_URI="${atlasUri}"`);
        console.log(`railway variables set MONGODB_DATABASE="energy_money_game"`);
        console.log(`railway variables delete RAILWAY_MONGODB_URI`);
        console.log(`railway variables delete RAILWAY_MONGODB_DATABASE`);
        
        console.log('\n📝 Или через Railway Dashboard:');
        console.log('1. Зайдите в Railway Dashboard');
        console.log('2. Выберите ваш проект AM8');
        console.log('3. Перейдите в раздел "Variables"');
        console.log('4. Добавьте переменные:');
        console.log(`   MONGODB_URI = ${atlasUri}`);
        console.log(`   MONGODB_DATABASE = energy_money_game`);
        console.log('5. Удалите Railway MongoDB переменные (если есть)');
        console.log('6. Перезапустите сервис');
    }

    testConnection() {
        console.log('\n🧪 Тестирование подключения к MongoDB Atlas...');
        
        const { MongoClient } = require('mongodb');
        const uri = this.generateAtlasUri();
        
        return new Promise((resolve, reject) => {
            const client = new MongoClient(uri);
            
            client.connect()
                .then(() => {
                    console.log('✅ Подключение к MongoDB Atlas успешно!');
                    return client.db('energy_money_game').admin().ping();
                })
                .then(() => {
                    console.log('✅ Ping к базе данных успешен!');
                    resolve(true);
                })
                .catch(error => {
                    console.error('❌ Ошибка подключения к MongoDB Atlas:', error.message);
                    reject(error);
                })
                .finally(() => {
                    client.close();
                });
        });
    }

    async run() {
        console.log('🚀 Восстановление подключения к базе данных');
        console.log('📅 Время:', new Date().toISOString());
        
        this.checkCurrentConfig();
        
        try {
            await this.testConnection();
            console.log('\n✅ MongoDB Atlas доступен!');
            this.generateFixCommands();
        } catch (error) {
            console.log('\n❌ MongoDB Atlas недоступен!');
            console.log('\n🔧 Альтернативные решения:');
            console.log('1. Проверьте интернет-соединение');
            console.log('2. Проверьте настройки MongoDB Atlas');
            console.log('3. Используйте Railway MongoDB (если настроен)');
        }
    }
}

if (require.main === module) {
    const fixer = new DatabaseFixer();
    fixer.run()
        .then(() => {
            console.log('\n🎉 Диагностика завершена!');
        })
        .catch(error => {
            console.error('❌ Ошибка диагностики:', error);
            process.exit(1);
        });
}

module.exports = DatabaseFixer;
