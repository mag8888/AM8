# Улучшения системы логирования

## Обзор

Добавлена функциональность для отображения информации о стеке вызовов в логах, что помогает разработчикам быстро находить источник проблем.

## Новые возможности

### 1. Улучшенный Logger

Класс `Logger` теперь автоматически показывает информацию о том, откуда вызывается функция:

- **Файл**: Имя файла, откуда идет вызов
- **Функция**: Название функции или метода
- **Строка**: Номер строки в файле

#### Пример вывода:
```
ℹ️ 14:25:30 [BankModule] updateBankData (BankModule.js@updateBankData:1295)
```

### 2. Глобальная функция logWithStack

Добавлена утилитарная функция `window.logWithStack()` для быстрого добавления информации о стеке к обычным логам.

#### Использование:
```javascript
// Вместо обычного console.log
console.log('Сообщение', data);

// Используйте logWithStack
window.logWithStack('Сообщение', data, 'log');
window.logWithStack('Предупреждение', data, 'warn');
window.logWithStack('Ошибка', data, 'error');
```

#### Параметры:
- `message` - сообщение для вывода
- `data` - дополнительные данные (опционально)
- `level` - уровень логирования: 'log', 'info', 'warn', 'error' (по умолчанию 'log')

### 3. Интеграция с существующим Logger

Все методы Logger (`debug`, `info`, `warn`, `error`) теперь автоматически включают информацию о стеке вызовов.

#### Использование:
```javascript
// Через глобальный логгер
window.logger.info('Обновление данных', userData, 'UserModule');

// Через контекстный логгер
const userLogger = window.logger.createContextLogger('UserModule');
userLogger.info('Пользователь авторизован', userInfo);
```

## Формат вывода

Информация о стеке вызовов отображается в формате:
```
(FunctionName@FileName:LineNumber)
```

Примеры:
- `(updateBankData@BankModule.js:1295)`
- `(onPlayerUpdated@PlayersPanel.js:45)`
- `(handleClick@ButtonController.js:23)`

## Исправленные ошибки

### TurnController.js

Исправлена ошибка `TypeError: null is not an object (evaluating 'this.ui.querySelector')`:

1. **Добавлен метод `safeQuerySelector()`** - безопасный поиск элементов с fallback на `document.querySelector()`
2. **Добавлены проверки на `null`** во всех местах обращения к `this.ui`
3. **Исправлен метод `updateTurnInfo()`** - теперь корректно обрабатывает случай когда `this.ui` равен `null`

## Совместимость

- Все изменения полностью обратно совместимы
- Существующий код продолжает работать без изменений
- Новые функции доступны через `window.logWithStack` и обновленный `window.logger`

## Рекомендации по использованию

1. **Для новых логов**: используйте `window.logWithStack()` или обновленный `window.logger`
2. **Для существующих логов**: постепенно заменяйте `console.log` на соответствующие методы Logger
3. **Отладка**: используйте информацию о стеке для быстрого поиска проблемных мест в коде
