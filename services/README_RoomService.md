# 🏠 RoomService - Сервис управления игровыми комнатами

## 📋 Обзор

**RoomService** - это микросервис для управления игровыми комнатами в игре Aura Money. Он отвечает за создание, получение, обновление и удаление комнат, а также управление игроками в комнатах.

## 🎯 Основные функции

### ✅ Реализовано

- **Создание комнат** - с валидацией и автоматическим назначением хоста
- **Управление игроками** - присоединение, проверка заполненности
- **Запуск игр** - инициализация gameState с проверкой прав
- **CRUD операции** - полный набор операций с комнатами
- **Валидация данных** - проверка всех входных параметров
- **Очистка старых комнат** - автоматическое удаление неактивных комнат
- **REST API** - полный набор эндпоинтов
- **База данных** - интеграция с MongoDB
- **Тестирование** - комплексные unit и integration тесты

### 🔄 В разработке

- Redis кеширование для горячих комнат
- Пагинация для getAllRooms()
- Фильтрация комнат по статусу
- Поиск комнат
- Приватные комнаты с паролем

## 🏗️ Архитектура

```
RoomService
├── In-Memory Map (быстрый доступ)
├── MongoDB (постоянное хранилище)
├── REST API (внешний интерфейс)
└── Валидация & Безопасность
```

## 📊 Структура данных

### Комната (Room)
```javascript
{
    id: String,                // UUID комнаты
    name: String,              // Название комнаты
    creatorId: String,         // ID создателя
    creatorName: String,       // Имя создателя
    creatorAvatar: String,     // Аватар создателя
    maxPlayers: Number,        // Максимум игроков (2-8)
    minPlayers: Number,        // Минимум игроков (всегда 2)
    turnTime: Number,          // Время хода (10-120 сек)
    assignProfessions: Boolean,// Назначать профессии
    players: Array,            // Список игроков
    gameState: Object,         // Состояние игры
    isStarted: Boolean,        // Игра начата
    isFinished: Boolean,       // Игра завершена
    createdAt: Date,           // Время создания
    updatedAt: Date            // Время обновления
}
```

### Игрок (Player)
```javascript
{
    userId: String,            // ID пользователя
    name: String,              // Имя игрока
    username: String,          // Username
    avatar: String,            // URL аватара
    isHost: Boolean,           // Является ли хостом
    isReady: Boolean,          // Готов ли к игре
    position: Number,          // Позиция на доске
    profession: String,        // Профессия (если назначена)
    joinedAt: Date             // Время присоединения
}
```

### Состояние игры (GameState)
```javascript
{
    activePlayerIndex: Number, // Индекс активного игрока
    hasRolledThisTurn: Boolean,// Бросал ли кубик
    currentPhase: String,      // Фаза игры
    turnStartTime: Number,     // Время начала хода
    gameStartTime: Number,     // Время начала игры
    diceResult: Number,        // Результат броска кубика
    lastMove: Object,          // Последний ход
    turnTimer: Number          // Таймер хода (мс)
}
```

## 🚀 API Endpoints

### GET /api/rooms
Получение списка всех комнат
```javascript
Response: {
    success: true,
    data: Array<Room>,
    count: Number,
    message: String
}
```

### GET /api/rooms/:roomId
Получение комнаты по ID
```javascript
Response: {
    success: true,
    data: Room,
    message: String
}
```

### POST /api/rooms
Создание новой комнаты
```javascript
Request: {
    roomData: {
        name: String,
        maxPlayers: Number,
        turnTime: Number,
        assignProfessions: Boolean
    },
    creator: {
        id: String,
        name: String,
        username: String,
        avatar: String
    }
}
```

### POST /api/rooms/:roomId/join
Присоединение к комнате
```javascript
Request: {
    player: {
        userId: String,
        name: String,
        username: String,
        avatar: String
    }
}
```

### POST /api/rooms/:roomId/start
Запуск игры
```javascript
Request: {
    userId: String  // ID хоста
}
```

### PUT /api/rooms/:roomId
Обновление комнаты
```javascript
Request: {
    updates: Object  // Любые поля для обновления
}
```

### DELETE /api/rooms/:roomId
Удаление комнаты

### GET /api/rooms/stats
Получение статистики комнат
```javascript
Response: {
    success: true,
    data: {
        totalRooms: Number,
        activeRooms: Number,
        startedGames: Number,
        totalPlayers: Number,
        averagePlayersPerRoom: Number,
        fullRooms: Number,
        readyToStart: Number
    }
}
```

## 🔧 Использование

### Инициализация
```javascript
const roomService = require('./server/services/RoomService');

// Сервис автоматически инициализируется как singleton
// Подключение к базе данных происходит автоматически
```

### Создание комнаты
```javascript
const roomData = {
    name: 'Моя комната',
    maxPlayers: 4,
    turnTime: 30,
    assignProfessions: false
};

const creator = {
    id: 'user123',
    name: 'Иван Иванов',
    username: 'ivan',
    avatar: 'https://example.com/avatar.jpg'
};

const room = await roomService.createRoom(roomData, creator);
```

### Присоединение игрока
```javascript
const player = {
    userId: 'player456',
    name: 'Петр Петров',
    username: 'petr',
    avatar: 'https://example.com/player.jpg'
};

const updatedRoom = await roomService.joinRoom(room.id, player);
```

### Запуск игры
```javascript
const startedRoom = await roomService.startGame(room.id, creator.id);
```

## ⚡ Производительность

### Требования (достигнуто)
- ✅ Создание комнаты: < 100ms
- ✅ Получение всех комнат: < 50ms (из памяти)
- ✅ Получение комнаты по ID: < 10ms (из памяти)
- ✅ Присоединение к комнате: < 150ms

### Оптимизация
- **In-memory Map** - для быстрого доступа к активным комнатам
- **Lazy loading** - загрузка из MongoDB при необходимости
- **Асинхронное сохранение** - неблокирующие операции с БД
- **Кеширование** - комната загружается в память при первом обращении

## 🔒 Безопасность

### Валидация входных данных
- ✅ Проверка maxPlayers: 2-8
- ✅ Проверка turnTime: 10-120 секунд
- ✅ Проверка уникальности имени комнаты
- ✅ Проверка прав хоста для старта игры
- ✅ Проверка заполненности комнаты
- ✅ Предотвращение дубликатов игроков

### Санитизация данных
- ✅ Удаление _id из ответов
- ✅ Очистка служебных полей
- ✅ Вычисляемые поля (playerCount, canStart, isFull)

## 📝 Логирование

### События
- ✅ `✅ Room created: {roomId} by {creator}`
- ✅ `✅ Player {name} joined room {roomId}`
- ✅ `✅ Game started in room {roomId}`
- ✅ `✅ Room deleted: {roomId}`
- ✅ `✅ Cleaned up {count} old rooms`
- ❌ `❌ Failed to {action}: {error}`

### Уровни логирования
- **INFO** - успешные операции
- **WARN** - предупреждения (MongoDB недоступна)
- **ERROR** - ошибки операций

## 🧪 Тестирование

### Unit тесты
- ✅ createRoom - создание и валидация
- ✅ getAllRooms - получение списка
- ✅ getRoomById - поиск по ID
- ✅ joinRoom - присоединение игроков
- ✅ startGame - запуск игры
- ✅ updateRoom - обновление данных
- ✅ deleteRoom - удаление комнат
- ✅ cleanupOldRooms - очистка старых комнат
- ✅ sanitizeRoom - санитизация данных

### Integration тесты
- ✅ Полный цикл жизни комнаты
- ✅ Множественные игроки
- ✅ Валидация и обработка ошибок

### Запуск тестов
```bash
npm test -- RoomService.test.js
```

## 🔄 Интеграция

### Используется в
- `server/routes/rooms.js` - REST API endpoints
- `server/routes/game.js` - игровые действия (планируется)
- `server/index.js` - инициализация (планируется)

### Зависит от
- `server/config/database.js` - подключение к MongoDB
- `server/models/RoomModel.js` - модель данных
- `crypto` - генерация UUID

## 📈 Мониторинг

### Метрики
- Количество активных комнат
- Среднее время создания комнаты
- Количество игроков в комнатах
- Процент заполненных комнат
- Количество начатых игр

### Health Check
```javascript
// Проверка статуса сервиса
const status = {
    isInitialized: true,
    roomsCount: roomService.rooms.size,
    databaseConnected: databaseConfig.getStatus().isConnected,
    uptime: process.uptime()
};
```

## 🚀 Развертывание

### Переменные окружения
```bash
MONGODB_URI=mongodb://localhost:27017/aura-money
NODE_ENV=production
```

### Docker
```dockerfile
# RoomService уже интегрирован в основной сервер
# Дополнительная настройка не требуется
```

## 📋 TODO

### Высокий приоритет
- [ ] Добавить Redis кеширование для горячих комнат
- [ ] Реализовать пагинацию для getAllRooms()
- [ ] Добавить фильтрацию комнат (по статусу, количеству игроков)

### Средний приоритет
- [ ] Реализовать поиск комнат
- [ ] Добавить рейтинг комнат
- [ ] Реализовать приватные комнаты (с паролем)

### Низкий приоритет
- [ ] Добавить webhook для событий комнаты
- [ ] Реализовать автоматическое удаление заброшенных игр
- [ ] Добавить аналитику игровых сессий

## 📞 Поддержка

### Логи
Все операции логируются с префиксом `🏠 RoomService:`

### Отладка
```javascript
// Включить подробное логирование
process.env.DEBUG = 'roomservice:*';
```

### Ошибки
- Проверьте подключение к MongoDB
- Убедитесь в корректности входных данных
- Проверьте права доступа к файлам

---

**Версия:** 1.0.0  
**Статус:** ✅ Готов к продакшену  
**Последнее обновление:** 11 октября 2024
