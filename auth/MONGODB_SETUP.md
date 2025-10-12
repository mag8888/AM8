# 🚀 Настройка MongoDB Atlas для Aura Money

## 📋 Обзор

Этот документ описывает, как настроить MongoDB Atlas для работы с системой авторизации Aura Money на Railway.

## 🌐 Создание кластера MongoDB Atlas

### 1. Регистрация в MongoDB Atlas

1. Перейдите на [MongoDB Atlas](https://account.mongodb.com/)
2. Создайте аккаунт или войдите в существующий
3. Нажмите "Create" для создания нового проекта

### 2. Создание кластера

1. Выберите "Build a Database"
2. Выберите план **M0 Sandbox** (бесплатный)
3. Выберите провайдера облака (AWS, Google Cloud, или Azure)
4. Выберите регион (рекомендуется ближайший к Railway)
5. Нажмите "Create Cluster"

### 3. Настройка доступа

#### 3.1 Создание пользователя базы данных

1. Перейдите в раздел "Database Access"
2. Нажмите "Add New Database User"
3. Выберите "Password" как метод аутентификации
4. Введите имя пользователя: `aura_money_user`
5. Введите пароль (сохраните его!)
6. Выберите роль "Read and write to any database"
7. Нажмите "Add User"

#### 3.2 Настройка сетевого доступа

1. Перейдите в раздел "Network Access"
2. Нажмите "Add IP Address"
3. Выберите "Allow access from anywhere" (0.0.0.0/0)
4. Нажмите "Confirm"

## 🔗 Получение строки подключения

### 1. Получение connection string

1. Перейдите в раздел "Clusters"
2. Нажмите "Connect" на вашем кластере
3. Выберите "Connect your application"
4. Выберите "Node.js" и версию "4.1 or later"
5. Скопируйте connection string

Пример строки подключения:
```
mongodb+srv://aura_money_user:<password>@cluster0.xyz123.mongodb.net/aura_money?retryWrites=true&w=majority
```

### 2. Извлечение параметров

Из строки подключения извлеките:
- **Username**: `aura_money_user`
- **Password**: ваш пароль
- **Cluster**: `cluster0.xyz123.mongodb.net`
- **Database**: `aura_money`

## ⚙️ Настройка переменных окружения

### Для локальной разработки

Создайте файл `.env` в папке `auth/`:

```env
# MongoDB Atlas Configuration
MONGODB_USERNAME=aura_money_user
MONGODB_PASSWORD=your_password_here
MONGODB_CLUSTER=cluster0.xyz123.mongodb.net
MONGODB_DATABASE=aura_money
MONGODB_OPTIONS=retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Server Configuration
PORT=3001
NODE_ENV=development

# Database Selection
USE_MONGODB=true
```

### Для Railway (Production)

В настройках Railway добавьте следующие переменные окружения:

```
MONGODB_USERNAME=aura_money_user
MONGODB_PASSWORD=your_password_here
MONGODB_CLUSTER=cluster0.xyz123.mongodb.net
MONGODB_DATABASE=aura_money
MONGODB_OPTIONS=retryWrites=true&w=majority

JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

PORT=3001
NODE_ENV=production

USE_MONGODB=true

ALLOWED_ORIGINS=https://am8-production.up.railway.app
```

## 🚀 Запуск и тестирование

### 1. Локальная разработка

```bash
# Перейдите в папку auth
cd auth

# Установите зависимости
npm install

# Запустите сервер с MongoDB
USE_MONGODB=true npm start
```

### 2. Миграция данных

Если у вас есть существующие данные в JSON файле:

```bash
# Запустите миграцию
npm run migrate:force
```

### 3. Проверка подключения

```bash
# Проверьте здоровье сервиса
curl http://localhost:3001/api/health
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "service": "auth",
  "database": {
    "type": "MongoDB Atlas",
    "status": {
      "isConnected": true,
      "connectionState": 1,
      "connectionStateText": "connected"
    },
    "health": {
      "status": "ok",
      "message": "База данных работает"
    }
  }
}
```

## 🔧 Troubleshooting

### Проблема: "Authentication failed"

**Решение:**
1. Проверьте имя пользователя и пароль в MongoDB Atlas
2. Убедитесь, что пользователь имеет права на чтение/запись
3. Проверьте, что IP адрес добавлен в Network Access

### Проблема: "Connection timeout"

**Решение:**
1. Проверьте, что кластер запущен
2. Убедитесь, что Network Access настроен правильно
3. Проверьте правильность cluster URL

### Проблема: "Database not found"

**Решение:**
1. MongoDB Atlas автоматически создаст базу данных при первом подключении
2. Убедитесь, что имя базы данных указано правильно в переменных окружения

## 📊 Мониторинг

### MongoDB Atlas Dashboard

1. Перейдите в раздел "Metrics" для просмотра статистики
2. Используйте "Real Time" для мониторинга в реальном времени
3. Проверяйте "Logs" для диагностики проблем

### Health Check Endpoints

- `GET /api/health` - Базовая проверка здоровья
- `GET /api/health/detailed` - Детальная информация
- `GET /api/health/ready` - Проверка готовности
- `GET /api/health/live` - Liveness probe

## 🎯 Следующие шаги

1. ✅ Настройте MongoDB Atlas кластер
2. ✅ Настройте переменные окружения
3. ✅ Запустите сервер с MongoDB
4. ✅ Выполните миграцию данных
5. ✅ Протестируйте авторизацию
6. ✅ Разверните на Railway

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи сервера
2. Проверьте MongoDB Atlas Dashboard
3. Используйте health check endpoints
4. Обратитесь к документации MongoDB Atlas

---

**Готово!** 🎉 Ваша система авторизации теперь работает с MongoDB Atlas!
