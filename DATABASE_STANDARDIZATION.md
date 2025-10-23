# 🗄️ Стандартизация базы данных

## ✅ Проблема решена

Ранее в системе была путаница между двумя базами данных:
- `energy_money_game` - основная база данных с пользователями и всеми коллекциями
- `aura_money` - база данных только с комнатами

## 🎯 Решение

Стандартизирована единая база данных **`energy_money_game`** для всех компонентов системы.

## 📋 Изменения

### 1. Создан файл конфигурации `config/database.js`

```javascript
const config = {
    // Основная база данных MongoDB
    MONGODB: {
        // Имя базы данных - единое для всех компонентов
        DATABASE: 'energy_money_game',
        
        // Параметры подключения
        USERNAME: 'xqrmedia_db_user',
        PASSWORD: 'pOs1rKxSv9Y3e7rl',
        CLUSTER: 'cluster0.wvumcaj.mongodb.net',
        OPTIONS: 'retryWrites=true&w=majority&appName=Cluster0',
        
        // URI для подключения
        get URI() {
            return `mongodb+srv://${this.USERNAME}:${this.PASSWORD}@${this.CLUSTER}/${this.DATABASE}?${this.OPTIONS}`;
        }
    },
    
    // Коллекции
    COLLECTIONS: {
        ROOMS: 'rooms',
        USERS: 'users',
        GAMES: 'games',
        PLAYERS: 'room_players',
        PROFESSIONS: 'professions',
        CARDS: 'cards',
        DECKS: 'decks',
        TRANSACTIONS: 'transactions',
        BANK_ACCOUNTS: 'bank_accounts',
        PLAYER_HISTORY: 'player_history'
    }
};
```

### 2. Обновлен `database/mongo.js`

- Использует стандартизированную конфигурацию
- Единое имя базы данных: `energy_money_game`
- Стандартизированные коллекции

### 3. Обновлены все скрипты

- `scripts/deleteAllRooms.js` - использует единую конфигурацию
- `scripts/checkRoomsAge.js` - использует единую конфигурацию
- `scripts/fixRoomsCreatedAt.js` - использует единую конфигурацию

## 🎯 Результат

### ✅ Единый источник данных

Все компоненты системы теперь используют:
- **База данных**: `energy_money_game`
- **Коллекции**: Стандартизированные имена
- **Подключение**: Единая конфигурация

### ✅ Консистентность данных

- Все данные хранятся в одной базе данных
- Нет дублирования между разными базами
- Единая точка истины для всех данных

### ✅ Упрощение поддержки

- Один файл конфигурации для всех компонентов
- Стандартизированные имена коллекций
- Единая логика подключения

## 🔧 Использование

### В коде сервера

```javascript
const config = require('./config/database');

// Подключение к базе данных
const db = client.db(config.MONGODB.DATABASE);

// Работа с коллекциями
const rooms = await db.collection(config.COLLECTIONS.ROOMS).find({}).toArray();
```

### В скриптах

```javascript
const config = require('../config/database');

// Использование конфигурации
const CONFIG = {
    ...config.MONGODB,
    // дополнительные параметры
};
```

## 📊 Текущее состояние

- **База данных**: `energy_money_game` ✅
- **Пользователи**: 9 ✅
- **Комнаты**: 0 (очищены) ✅
- **Коллекции**: Все стандартизированы ✅

## 🚀 Следующие шаги

1. Обновить сервер для использования стандартизированной конфигурации
2. Протестировать консистентность данных
3. Обновить документацию по развертыванию

## ✅ Проблема решена

Ранее в системе была путаница между двумя базами данных:
- `energy_money_game` - основная база данных с пользователями и всеми коллекциями
- `aura_money` - база данных только с комнатами

## 🎯 Решение

Стандартизирована единая база данных **`energy_money_game`** для всех компонентов системы.

## 📋 Изменения

### 1. Создан файл конфигурации `config/database.js`

```javascript
const config = {
    // Основная база данных MongoDB
    MONGODB: {
        // Имя базы данных - единое для всех компонентов
        DATABASE: 'energy_money_game',
        
        // Параметры подключения
        USERNAME: 'xqrmedia_db_user',
        PASSWORD: 'pOs1rKxSv9Y3e7rl',
        CLUSTER: 'cluster0.wvumcaj.mongodb.net',
        OPTIONS: 'retryWrites=true&w=majority&appName=Cluster0',
        
        // URI для подключения
        get URI() {
            return `mongodb+srv://${this.USERNAME}:${this.PASSWORD}@${this.CLUSTER}/${this.DATABASE}?${this.OPTIONS}`;
        }
    },
    
    // Коллекции
    COLLECTIONS: {
        ROOMS: 'rooms',
        USERS: 'users',
        GAMES: 'games',
        PLAYERS: 'room_players',
        PROFESSIONS: 'professions',
        CARDS: 'cards',
        DECKS: 'decks',
        TRANSACTIONS: 'transactions',
        BANK_ACCOUNTS: 'bank_accounts',
        PLAYER_HISTORY: 'player_history'
    }
};
```

### 2. Обновлен `database/mongo.js`

- Использует стандартизированную конфигурацию
- Единое имя базы данных: `energy_money_game`
- Стандартизированные коллекции

### 3. Обновлены все скрипты

- `scripts/deleteAllRooms.js` - использует единую конфигурацию
- `scripts/checkRoomsAge.js` - использует единую конфигурацию
- `scripts/fixRoomsCreatedAt.js` - использует единую конфигурацию

## 🎯 Результат

### ✅ Единый источник данных

Все компоненты системы теперь используют:
- **База данных**: `energy_money_game`
- **Коллекции**: Стандартизированные имена
- **Подключение**: Единая конфигурация

### ✅ Консистентность данных

- Все данные хранятся в одной базе данных
- Нет дублирования между разными базами
- Единая точка истины для всех данных

### ✅ Упрощение поддержки

- Один файл конфигурации для всех компонентов
- Стандартизированные имена коллекций
- Единая логика подключения

## 🔧 Использование

### В коде сервера

```javascript
const config = require('./config/database');

// Подключение к базе данных
const db = client.db(config.MONGODB.DATABASE);

// Работа с коллекциями
const rooms = await db.collection(config.COLLECTIONS.ROOMS).find({}).toArray();
```

### В скриптах

```javascript
const config = require('../config/database');

// Использование конфигурации
const CONFIG = {
    ...config.MONGODB,
    // дополнительные параметры
};
```

## 📊 Текущее состояние

- **База данных**: `energy_money_game` ✅
- **Пользователи**: 9 ✅
- **Комнаты**: 0 (очищены) ✅
- **Коллекции**: Все стандартизированы ✅

## 🚀 Следующие шаги

1. Обновить сервер для использования стандартизированной конфигурации
2. Протестировать консистентность данных
3. Обновить документацию по развертыванию
