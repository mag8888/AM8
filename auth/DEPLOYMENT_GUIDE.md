# 🚀 Руководство по развертыванию Aura Money на Railway с MongoDB Atlas

## 📋 Обзор

Это руководство описывает, как развернуть систему авторизации Aura Money на Railway с использованием MongoDB Atlas в качестве базы данных.

## 🎯 Что мы настроили

### ✅ Готовые компоненты:

1. **MongoDB Atlas Integration** - Полная интеграция с облачной базой данных
2. **Автоматическое переключение** - JSON файл для разработки, MongoDB для продакшна
3. **Миграция данных** - Скрипт для переноса данных из JSON в MongoDB
4. **Health Monitoring** - Проверка состояния базы данных
5. **Railway Ready** - Готовность к развертыванию на Railway

## 🌐 Настройка MongoDB Atlas

### 1. Создание кластера

1. Перейдите на [MongoDB Atlas](https://account.mongodb.com/)
2. Создайте бесплатный кластер **M0 Sandbox**
3. Выберите регион (рекомендуется тот же, что и Railway)
4. Нажмите "Create Cluster"

### 2. Настройка пользователя

1. **Database Access** → **Add New Database User**
2. Username: `aura_money_user`
3. Password: `[создайте надежный пароль]`
4. Role: **Read and write to any database**

### 3. Настройка сетевого доступа

1. **Network Access** → **Add IP Address**
2. Выберите **"Allow access from anywhere"** (0.0.0.0/0)

### 4. Получение строки подключения

1. **Clusters** → **Connect** → **Connect your application**
2. Выберите **Node.js** и версию **4.1 or later**
3. Скопируйте connection string

Пример:
```
mongodb+srv://aura_money_user:<password>@cluster0.xyz123.mongodb.net/aura_money?retryWrites=true&w=majority
```

## ⚙️ Настройка Railway

### 1. Создание проекта на Railway

1. Перейдите на [Railway](https://railway.app/)
2. Нажмите "New Project"
3. Выберите "Deploy from GitHub repo"
4. Подключите ваш репозиторий

### 2. Настройка переменных окружения

В настройках Railway добавьте следующие переменные:

```env
# MongoDB Atlas Configuration
MONGODB_USERNAME=aura_money_user
MONGODB_PASSWORD=your_mongodb_password
MONGODB_CLUSTER=cluster0.xyz123.mongodb.net
MONGODB_DATABASE=aura_money
MONGODB_OPTIONS=retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://am8-production.up.railway.app

# Database Selection
USE_MONGODB=true
```

### 3. Настройка деплоя

1. **Settings** → **Deploy**
2. Root Directory: `auth`
3. Build Command: `npm install`
4. Start Command: `npm start`

## 🔄 Миграция данных

### Автоматическая миграция

После развертывания на Railway, система автоматически создаст необходимые коллекции в MongoDB Atlas.

### Ручная миграция (если нужно)

```bash
# Локально с реальными данными MongoDB
USE_MONGODB=true MONGODB_USERNAME=... MONGODB_PASSWORD=... npm run migrate
```

## 🧪 Тестирование

### 1. Проверка здоровья сервиса

```bash
curl https://your-railway-app.railway.app/api/health
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
      "connectionState": 1
    },
    "health": {
      "status": "ok",
      "message": "База данных работает"
    }
  }
}
```

### 2. Тестирование авторизации

```bash
curl -X POST https://your-railway-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test123"}'
```

### 3. Создание нового пользователя

```bash
curl -X POST https://your-railway-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@test.com", "password": "password123", "username": "NewUser"}'
```

## 📊 Мониторинг

### MongoDB Atlas Dashboard

1. **Metrics** - Статистика использования
2. **Real Time** - Мониторинг в реальном времени
3. **Logs** - Логи базы данных

### Railway Dashboard

1. **Deployments** - История развертываний
2. **Metrics** - Использование ресурсов
3. **Logs** - Логи приложения

### Health Check Endpoints

- `GET /api/health` - Базовая проверка
- `GET /api/health/detailed` - Детальная информация
- `GET /api/auth/stats` - Статистика пользователей

## 🔧 Troubleshooting

### Проблема: "Authentication failed"

**Решение:**
1. Проверьте `MONGODB_USERNAME` и `MONGODB_PASSWORD`
2. Убедитесь, что пользователь создан в MongoDB Atlas
3. Проверьте права доступа пользователя

### Проблема: "Connection timeout"

**Решение:**
1. Проверьте `MONGODB_CLUSTER` URL
2. Убедитесь, что Network Access настроен правильно
3. Проверьте, что кластер запущен

### Проблема: "CORS error"

**Решение:**
1. Проверьте `ALLOWED_ORIGINS` в Railway
2. Убедитесь, что домен фронтенда включен

## 🎉 Результат

После выполнения всех шагов у вас будет:

✅ **Полнофункциональная система авторизации**  
✅ **Облачная база данных MongoDB Atlas**  
✅ **Автоматическое развертывание на Railway**  
✅ **Мониторинг и логирование**  
✅ **Готовность к продакшену**

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи в Railway Dashboard
2. Проверьте MongoDB Atlas Dashboard
3. Используйте health check endpoints
4. Обратитесь к документации MongoDB Atlas и Railway

---

**🎯 Готово!** Ваша система авторизации Aura Money теперь работает в облаке с MongoDB Atlas!
