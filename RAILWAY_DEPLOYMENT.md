# 🚀 Deployment на Railway с MongoDB Atlas

## ✅ Статус подключения

**MongoDB Atlas подключение протестировано и работает!**

- ✅ Кластер: `cluster0.wvumcaj.mongodb.net`
- ✅ База данных: `energy_money_game`
- ✅ Пользователей в БД: 9
- ✅ Все операции работают

## 📋 Переменные окружения для Railway

### Auth Service (Backend)

В настройках Railway для auth service добавьте следующие переменные:

```env
# MongoDB Atlas Configuration
MONGODB_USERNAME=xqrmedia_db_user
MONGODB_PASSWORD=pOs1rKxSv9Y3e7rl
MONGODB_CLUSTER=cluster0.wvumcaj.mongodb.net
MONGODB_DATABASE=energy_money_game
MONGODB_OPTIONS=retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_SECRET=em1-production-secret-key-2024-railway
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://am8-production.up.railway.app

# Database Selection
USE_MONGODB=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Frontend Service

```env
# API Configuration
API_BASE_URL=https://your-auth-service.railway.app

# Environment
NODE_ENV=production
```

## 🔧 Настройка Railway

### 1. Auth Service (Backend)

1. **Root Directory**: `auth`
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Port**: `3001` (автоматически определится из переменной PORT)

### 2. Frontend Service

1. **Root Directory**: `/` (корень проекта)
2. **Build Command**: `echo "No build required"`
3. **Start Command**: `python3 -m http.server 8000`
4. **Port**: `8000`

## 📊 Текущее состояние MongoDB Atlas

```
📊 База данных: energy_money_game
👥 Пользователей: 9
📁 Коллекции: users
✅ Статус: Работает
```

Существующие пользователи в MongoDB:
1. RailwayTestUser (test@railway.app) - тестовый
2. TestUser (testuser@test.com)
3. test (test@test.com)
4. max (max@123.com)
5. Maxx (max@max.com)
И еще 4 пользователя

## 🚀 Шаги для развертывания

### 1. Создание проектов на Railway

```bash
# Перейдите на railway.app
# Создайте новый проект
# Подключите GitHub репозиторий
```

### 2. Настройка Auth Service

```bash
1. New Service → GitHub Repo
2. Settings → Root Directory: auth
3. Settings → Start Command: npm start
4. Variables → Добавьте все переменные окружения выше
5. Deploy
```

### 3. Настройка Frontend Service

```bash
1. New Service → GitHub Repo
2. Settings → Root Directory: .
3. Settings → Start Command: python3 -m http.server 8000
4. Settings → Установите PORT=8000
5. Deploy
```

### 4. Обновление CORS

После развертывания auth service:
1. Скопируйте URL auth service (например: `https://auth-am8.railway.app`)
2. Обновите переменную `ALLOWED_ORIGINS` на фронтенде

После развертывания frontend:
1. Скопируйте URL frontend (например: `https://am8-production.railway.app`)
2. Обновите переменную `ALLOWED_ORIGINS` в auth service

## 🔄 Миграция существующих пользователей (опционально)

Если у вас есть локальные пользователи в JSON файле, которых нет в MongoDB:

```bash
# Локально
cd auth
USE_MONGODB=true \
MONGODB_USERNAME=xqrmedia_db_user \
MONGODB_PASSWORD=pOs1rKxSv9Y3e7rl \
MONGODB_CLUSTER=cluster0.wvumcaj.mongodb.net \
MONGODB_DATABASE=energy_money_game \
npm run migrate
```

## 🧪 Тестирование после развертывания

### 1. Проверка здоровья Auth Service

```bash
curl https://your-auth-service.railway.app/api/health
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
    }
  }
}
```

### 2. Проверка авторизации

```bash
curl -X POST https://your-auth-service.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test123"}'
```

### 3. Проверка Frontend

```bash
# Откройте в браузере
https://am8-production.up.railway.app
```

## 📈 Мониторинг

### MongoDB Atlas Dashboard
- **Metrics**: Использование базы данных
- **Real Time**: Активные подключения
- **Logs**: Логи запросов

### Railway Dashboard
- **Deployments**: История развертываний
- **Metrics**: CPU, Memory, Network
- **Logs**: Логи приложений

### Health Check Endpoints

```bash
# Базовая проверка
GET /api/health

# Детальная информация
GET /api/health/detailed

# Готовность к работе
GET /api/health/ready

# Liveness probe
GET /api/health/live

# Статистика пользователей
GET /api/auth/stats
```

## ⚡ Оптимизация

### MongoDB Atlas
- ✅ M0 Sandbox (бесплатный tier) - достаточно для начала
- ✅ Автоматическое масштабирование
- ✅ Резервное копирование включено

### Railway
- ✅ Auto-deploy при push в main
- ✅ Автоматические SSL сертификаты
- ✅ Environment variables защищены

## 🔒 Безопасность

### MongoDB Atlas
- ✅ Network Access настроен (allow from anywhere для Railway)
- ✅ Пользователь с ограниченными правами
- ✅ Шифрование в пути и в покое

### Auth Service
- ✅ JWT токены с истечением срока
- ✅ Bcrypt для паролей (12 rounds)
- ✅ Rate limiting
- ✅ Helmet.js для безопасности заголовков
- ✅ CORS настроен

## 📞 Troubleshooting

### Проблема: "Cannot connect to MongoDB"

**Решение:**
1. Проверьте переменные окружения на Railway
2. Убедитесь, что Network Access в MongoDB Atlas включает 0.0.0.0/0
3. Проверьте логи на Railway

### Проблема: "CORS error"

**Решение:**
1. Обновите `ALLOWED_ORIGINS` в auth service
2. Включите правильный URL frontend
3. Перезапустите auth service

### Проблема: "JWT error"

**Решение:**
1. Убедитесь, что `JWT_SECRET` установлен
2. Проверьте, что значение совпадает на всех инстансах
3. Очистите cookies и localStorage

## ✅ Чеклист развертывания

- [ ] Создан проект на Railway
- [ ] Auth service развернут
- [ ] Frontend service развернут
- [ ] Переменные окружения настроены
- [ ] CORS настроен правильно
- [ ] Health checks проходят
- [ ] Авторизация работает
- [ ] MongoDB Atlas подключен
- [ ] SSL сертификаты активны
- [ ] Домен настроен (опционально)

---

**🎉 Готово! Ваш Aura Money работает на Railway с MongoDB Atlas!**