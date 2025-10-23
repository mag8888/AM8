# 🚀 Миграция MongoDB на Railway

Этот документ описывает процесс миграции с MongoDB Atlas на MongoDB сервис Railway для улучшения производительности и решения проблем с rate limiting.

## 📋 План миграции

### ✅ Шаг 1: Подготовка (Завершено)
- [x] Созданы скрипты миграции
- [x] Обновлена конфигурация приложения
- [x] Подготовлены инструкции

### 🔄 Шаг 2: Создание MongoDB на Railway
1. **Зайдите в Railway Dashboard**: https://railway.app/dashboard
2. **Выберите ваш проект** (AM8)
3. **Нажмите "+ New" → "Database"**
4. **Выберите "MongoDB"**
5. **Дождитесь создания сервиса**

### 🔄 Шаг 3: Настройка переменных окружения
После создания MongoDB сервиса:

1. **Перейдите в раздел "Variables" вашего основного сервиса**
2. **Добавьте переменные:**
   ```
   RAILWAY_MONGODB_URI=mongodb://username:password@host:port/database
   RAILWAY_MONGODB_DATABASE=energy_money_game
   ```

### 🔄 Шаг 4: Миграция данных
```bash
# Тестовый запуск (без изменений)
node scripts/migrateToRailwayMongo.js --dry-run

# Реальная миграция
node scripts/migrateToRailwayMongo.js
```

### 🔄 Шаг 5: Перезапуск приложения
После успешной миграции перезапустите приложение на Railway.

## 🛠️ Доступные скрипты

### `scripts/migrateToRailwayMongo.js`
Скрипт миграции данных из MongoDB Atlas в Railway MongoDB.

**Опции:**
- `--dry-run` - тестовый запуск без изменений
- `--verbose` - подробный вывод

**Использование:**
```bash
node scripts/migrateToRailwayMongo.js [--dry-run] [--verbose]
```

### `scripts/updateRailwayConfig.js`
Скрипт обновления конфигурации приложения для поддержки Railway MongoDB.

**Использование:**
```bash
node scripts/updateRailwayConfig.js
```

## 🔧 Конфигурация

### Приоритет подключения к базе данных:
1. **RAILWAY_MONGODB_URI** (Railway MongoDB)
2. **MONGODB_URI** (MongoDB Atlas)
3. **MONGO_URL** (резервный)
4. **Config fallback** (локальная конфигурация)

### Переменные окружения:
- `RAILWAY_MONGODB_URI` - URI MongoDB на Railway
- `RAILWAY_MONGODB_DATABASE` - имя базы данных (по умолчанию: energy_money_game)

## 📊 Ожидаемые улучшения

### ✅ Производительность:
- Быстрая локальная сеть между сервисами
- Отсутствие внешних rate limits
- Снижение задержек

### ✅ Надежность:
- Меньше зависимостей от внешних сервисов
- Лучший контроль над ресурсами
- Упрощенная диагностика проблем

### ✅ Стоимость:
- Возможная оптимизация расходов
- Прозрачное ценообразование Railway

## 🚨 Важные замечания

1. **Резервное копирование**: Обязательно создайте резервную копию данных перед миграцией
2. **Тестирование**: Используйте `--dry-run` для тестирования
3. **Мониторинг**: Следите за логами после миграции
4. **Откат**: При проблемах можно быстро вернуться к MongoDB Atlas

## 🔍 Диагностика

### Проверка подключения:
```bash
# Проверка переменных окружения
echo $RAILWAY_MONGODB_URI

# Тест подключения
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.RAILWAY_MONGODB_URI;
const client = new MongoClient(uri);
client.connect().then(() => {
  console.log('✅ Подключение успешно');
  process.exit(0);
}).catch(err => {
  console.error('❌ Ошибка подключения:', err);
  process.exit(1);
});
"
```

### Логи приложения:
После миграции в логах должно появиться:
```
🗄️ Database: Используется Railway MongoDB
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи миграции
2. Убедитесь в корректности переменных окружения
3. Проверьте статус сервисов на Railway
4. При необходимости выполните откат к MongoDB Atlas

---

**Дата создания:** $(date)
**Версия:** 1.0.0
