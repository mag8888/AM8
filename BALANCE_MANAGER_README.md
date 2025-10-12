# 💰 BalanceManager - Документация

## 📋 Обзор

`BalanceManager` - это единый источник истины для управления балансами игроков в игре Aura Money. Модуль обеспечивает синхронизацию, оптимизацию и отображение балансов между различными источниками данных.

## 🚀 Быстрый старт

### Инициализация

```javascript
// Создание экземпляра
const balanceManager = new BalanceManager({
    gameState: gameStateInstance  // опционально
});

// Глобальный доступ
window.balanceManager = balanceManager;
```

### Основные операции

```javascript
// Обновление баланса
balanceManager.updateBalance('player123', 5000, 'bank-api');

// Получение баланса
const balance = balanceManager.getBalance('player123');

// Массовое обновление из GameState
balanceManager.refreshFromGameState(playersArray);

// Проверка достаточности средств
const canAfford = balanceManager.hasEnoughMoney('player123', 1000);
```

## 🔧 API Reference

### Основные методы

#### `updateBalance(userId, newBalance, source)`
Обновляет баланс конкретного игрока с оптимизацией.

**Параметры:**
- `userId` (string) - ID игрока
- `newBalance` (number) - Новая сумма баланса
- `source` (string) - Источник обновления: 'game-state', 'bank-api', 'manual'

**Оптимизация:**
- Пропускает обновление если баланс не изменился и данные свежие (< 3 сек)
- Автоматически обновляет UI элементы

#### `getBalance(userId)`
Возвращает текущий баланс игрока.

**Возвращает:** number (баланс или 0 если не найден)

#### `refreshFromGameState(players)`
Массовое обновление балансов из массива игроков.

**Параметры:**
- `players` (Array) - Массив объектов с полями `id` и `cash`

**Оптимизация:**
- Debounce 5 секунд для предотвращения частых обновлений

#### `getAllBalances()`
Возвращает все балансы в виде объекта.

**Возвращает:** `{ [userId]: { amount, source, timestamp } }`

### Дополнительные методы

#### `clearBalances()`
Очищает все балансы и сбрасывает время последнего обновления.

#### `isDataFresh(userId)`
Проверяет свежесть данных для конкретного игрока.

**Возвращает:** boolean (true если данные свежее 3 секунд)

#### `getStats()`
Возвращает статистику по всем балансам.

**Возвращает:**
```javascript
{
    totalPlayers: number,
    totalBalance: number,
    averageBalance: number,
    minBalance: number,
    maxBalance: number
}
```

#### `hasEnoughMoney(userId, requiredAmount)`
Проверяет достаточность средств у игрока.

**Возвращает:** boolean

#### `getFormattedBalance(userId)`
Возвращает отформатированный баланс.

**Возвращает:** string (например, "$5,000")

## 🎨 UI Интеграция

BalanceManager автоматически обновляет следующие UI элементы:

1. **Панель игрока** - `.player-balance`
2. **Правая панель** - `.right-panel .balance`
3. **Карточки игроков** - `[data-player-id] .player-balance`
4. **Игровые операции** - `.game-operations-card .player-balance`

### Анимация изменений

При изменении баланса добавляется CSS класс `balance-updated` с анимацией:

```css
.balance-updated {
    animation: balance-updated 1s ease-in-out;
}
```

## ⚡ Оптимизации

### Debounce
- `refreshFromGameState`: не чаще 5 секунд
- Предотвращает избыточные обновления

### Проверка свежести данных
- Обновления пропускаются если данные свежее 3 секунд
- Предотвращает "дергание" UI

### Валидация данных
- Проверка корректности userId и newBalance
- Автоматическое приведение к числовому типу

## 🔄 Источники данных

### Приоритет источников:
1. **manual** - Ручные обновления (высший приоритет)
2. **bank-api** - Банковские операции
3. **game-state** - Основной источник через polling

### Стратегия обновления:
```javascript
// Обновляем если:
- Баланс изменился ИЛИ
- Данные устарели (> 3 сек)
// Пропускаем если:
- Баланс тот же И данные свежие
```

## 🧪 Тестирование

Для тестирования доступна страница `test-balance-manager.html` с полным набором тестов:

- Обновление и получение балансов
- Тестирование оптимизаций
- Проверка производительности
- Визуальное отображение логов

## 📊 Мониторинг

### Логирование событий:
```javascript
💰 BalanceManager: player123 обновлен до 5000 (bank-api)
🔄 BalanceManager: Обновлены балансы для 4 игроков
⚠️ BalanceManager: Пропуск обновления для player123 (unchanged, fresh)
✅ BalanceManager инициализирован
```

### Метрики производительности:
- `updateBalance`: < 5ms
- `getBalance`: < 1ms
- `refreshFromGameState`: < 20ms (для 8 игроков)
- `getAllBalances`: < 2ms

## 🔒 Безопасность

- Валидация всех входных данных
- Защита от некорректных значений
- Логирование всех изменений
- Очистка ресурсов при destroy()

## 🔗 Интеграция

### Используется в:
- `TurnController` - отображение баланса активного игрока
- `app.js` - обновление при изменении игрового состояния
- `PlayersPanel` - отображение балансов всех игроков
- `BankClientV2` - обновления от банковских операций

### Зависимости:
- `GameState` - для подписки на изменения
- DOM элементы с соответствующими селекторами

## 🎯 Примеры использования

### Базовое использование:
```javascript
// Инициализация
const balanceManager = new BalanceManager({ gameState });

// Обновление баланса после покупки
balanceManager.updateBalance(userId, newBalance, 'bank-api');

// Проверка перед покупкой
if (balanceManager.hasEnoughMoney(userId, itemPrice)) {
    // Покупка разрешена
}
```

### Интеграция с игровым циклом:
```javascript
// В updateGameInterface
if (this.balanceManager && roomData.players) {
    this.balanceManager.refreshFromGameState(roomData.players);
}
```

### Отображение статистики:
```javascript
const stats = balanceManager.getStats();
console.log(`Общий баланс всех игроков: $${stats.totalBalance}`);
```

## 🚀 Будущие улучшения

- [ ] История изменений баланса
- [ ] Предсказание будущего баланса
- [ ] Уведомления при критически низком балансе
- [ ] Автосохранение в localStorage
- [ ] Сравнение балансов между игроками
- [ ] Экспорт истории балансов

---

**Версия:** 1.0.0  
**Дата создания:** 11 октября 2024  
**Автор:** Client-side Team
