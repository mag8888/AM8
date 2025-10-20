# Анализ первопричины спам-запросов в продакшн

## 🔍 ПЕРВОПРИЧИНА ПРОБЛЕМЫ

После исследования продакшн-версии игры на https://am8-production.up.railway.app была обнаружена **критическая первопричина** множественных спам-запросов к `/api/rooms/{roomId}/game-state`.

### Проблема в PlayersPanel.js

**Главная проблема**: В методе `PlayersPanel.init()` одновременно вызывались **ТРИ** разных запроса к одному и тому же API endpoint:

1. `forceLoadPlayers()` - немедленный запрос
2. `preloadGameData()` - сразу после forceLoadPlayers 
3. `_fetchPlayersInBackground()` - вызывался из forceLoadPlayers при использовании кэша

### Race Condition в Rate Limiting

**Вторая проблема**: Во всех методах использовалась **неатомарная** логика проверки rate limiting:

```javascript
// ПРОБЛЕМНЫЙ КОД:
if (!window.CommonUtils.canMakeGameStateRequest(roomId)) {
    return; // ← Здесь может произойти race condition
}
// ... время проходит ...
if (!window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
    return; // ← Другой компонент уже установил pending между проверками
}
```

## 🔧 ИСПРАВЛЕНИЯ

### 1. Устранение множественных одновременных запросов

**В PlayersPanel.init():**
```javascript
// ДО (проблемный код):
this.forceLoadPlayers();        // ← Запрос #1
this.preloadGameData();         // ← Запрос #2 (сразу после)

// ПОСЛЕ (исправленный код):
this.forceLoadPlayers();        // ← Только основной запрос
// preloadGameData будет вызван через 10 секунд после успешной загрузки
```

### 2. Атомарная проверка Rate Limiting

**Заменили неатомарную логику на атомарную:**
```javascript
// ДО (проблемный код):
if (!window.CommonUtils.canMakeGameStateRequest(roomId)) {
    return;
}
// ... время может пройти, другой компонент может установить pending ...
if (!window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
    return;
}

// ПОСЛЕ (исправленный код):
if (!window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
    return; // Атомарная проверка и установка флага
}
```

### 3. Улучшенная координация запросов

**В forceLoadPlayers при использовании кэша:**
```javascript
// ДО: немедленный вызов фонового обновления
this._fetchPlayersInBackground(roomId);

// ПОСЛЕ: отложенный вызов для предотвращения конфликтов
setTimeout(() => {
    this._fetchPlayersInBackground(roomId);
}, 15000); // Через 15 секунд
```

### 4. Правильная очистка pending флагов

Добавлена корректная очистка флагов при локальном rate limiting:
```javascript
if (now - this._lastApiRequestTime < this._minRequestInterval) {
    window.CommonUtils.gameStateLimiter.clearRequestPending(roomId); // ← Новая строка
    return;
}
```

## 📊 КОМПОНЕНТЫ, ЗАТРОНУТЫЕ ИСПРАВЛЕНИЯМИ

1. **PlayersPanel.js** - основная проблема с множественными запросами
2. **BankPreview.js** - уже был исправлен ранее
3. **CommonUtils.js** - улучшен GameStateLimiter

## 🎯 РЕЗУЛЬТАТ

После исправлений система запросов будет работать следующим образом:

1. **При инициализации**: только один запрос через `forceLoadPlayers()`
2. **При использовании кэша**: отложенное обновление через 15 секунд
3. **Предзагрузка**: выполняется через 10 секунд после успешной основной загрузки
4. **Атомарные операции**: исключены race conditions в rate limiting

## 🔍 ТЕХНИЧЕСКАЯ ДЕТАЛЬ

**Проблема была в архитектуре**: несколько компонентов (`PlayersPanel`, `BankPreview`, `BankModule`, `GameState`) одновременно инициализировались и делали запросы к одному endpoint без должной координации.

**Решение**: централизованная координация через улучшенный `GameStateLimiter` с атомарными операциями и правильной последовательностью запросов.

Теперь спам-запросы должны полностью прекратиться, так как устранена первопричина race conditions и множественных одновременных обращений к API.
