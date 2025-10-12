# 🎮 Aura Money - Полное руководство по развертыванию

## 📋 Содержание

1. [Обзор системы](#обзор-системы)
2. [Локальная разработка](#локальная-разработка)
3. [MongoDB Atlas настройка](#mongodb-atlas-настройка)
4. [Railway развертывание](#railway-развертывание)
5. [Тестирование](#тестирование)
6. [Troubleshooting](#troubleshooting)

## 🎯 Обзор системы

### Архитектура

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│                 │       │                  │       │                 │
│   Frontend      │◄─────►│   Auth Service   │◄─────►│  MongoDB Atlas  │
│   (Static)      │       │   (Node.js)      │       │   (Database)    │
│   Port: 8000    │       │   Port: 3001     │       │                 │
│                 │       │                  │       │                 │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

### Компоненты

1. **Frontend** - Статический HTML/CSS/JS
2. **Auth Service** - Node.js сервер авторизации
3. **MongoDB Atlas** - Облачная база данных

## 🚀 Локальная разработка

### Предварительные требования

```bash
# Установлены:
- Node.js v20+
- Python 3
- npm
```

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-username/AM8.git
cd AM8
```

### 2. Установка зависимостей

```bash
# Auth service
cd auth
npm install
cd ..
```

### 3. Запуск серверов

**Терминал 1: Auth Service**
```bash
cd auth
node server/server.js
```

**Терминал 2: Frontend**
```bash
python3 -m http.server 8000
```

### 4. Открытие в браузере

```
http://localhost:8000
```

### Тестовые пользователи (локально)

- Email: `test@test.com`, Password: `test123` (TestUser)
- Email: `admin@admin.com`, Password: `admin123` (Admin)
- Email: `roman@roman.com`, Password: `roman123` (Roman)

## 🌐 MongoDB Atlas настройка

### Текущее подключение ✅

**УЖЕ НАСТРОЕНО И РАБОТАЕТ!**

```
Кластер: cluster0.wvumcaj.mongodb.net
База данных: energy_money_game
Пользователей в БД: 9
Статус: ✅ Подключено и протестировано
```

### Параметры подключения

```env
MONGODB_USERNAME=xqrmedia_db_user
MONGODB_PASSWORD=pOs1rKxSv9Y3e7rl
MONGODB_CLUSTER=cluster0.wvumcaj.mongodb.net
MONGODB_DATABASE=energy_money_game
MONGODB_OPTIONS=retryWrites=true&w=majority&appName=Cluster0
```

### Тестирование подключения

```bash
cd auth
node test-mongodb-connection.js
```

Ожидаемый вывод:
```
✅ Подключение успешно!
✅ База данных работает!
✅ Модель инициализирована!
📊 Статистика: { totalUsers: 9, activeUsers: 1 }
```

## 🚂 Railway развертывание

### Шаг 1: Создание проекта на Railway

1. Перейдите на [railway.app](https://railway.app)
2. Войдите через GitHub
3. Нажмите "New Project"
4. Выберите "Deploy from GitHub repo"
5. Выберите ваш репозиторий AM8

### Шаг 2: Создание Auth Service

1. **New Service** → выберите репозиторий
2. **Settings** → **Root Directory**: `auth`
3. **Settings** → **Start Command**: `npm start`
4. **Variables** → добавьте переменные окружения:

```env
# MongoDB Atlas
MONGODB_USERNAME=xqrmedia_db_user
MONGODB_PASSWORD=pOs1rKxSv9Y3e7rl
MONGODB_CLUSTER=cluster0.wvumcaj.mongodb.net
MONGODB_DATABASE=energy_money_game
MONGODB_OPTIONS=retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=em1-production-secret-key-2024-railway
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Server
PORT=3001
NODE_ENV=production

# CORS - ОБНОВИТЕ ПОСЛЕ РАЗВЕРТЫВАНИЯ FRONTEND!
ALLOWED_ORIGINS=https://am8-production.up.railway.app

# Database
USE_MONGODB=true
```

5. **Deploy** → подождите завершения
6. **Скопируйте URL** (например: `https://auth-am8-production.up.railway.app`)

### Шаг 3: Обновление Frontend для Railway

**ВАЖНО**: Обновите URL auth service во фронтенде:

Откройте `auth/assets/js/modules/AuthService.js` и обновите:

```javascript
if (isProduction) {
    // Замените на ваш реальный URL auth service из Railway
    this.apiBase = 'https://YOUR-AUTH-SERVICE.railway.app/api/auth';
}
```

### Шаг 4: Создание Frontend Service

1. **New Service** → выберите тот же репозиторий
2. **Settings** → **Root Directory**: `.` (корень)
3. **Settings** → **Start Command**: `python3 -m http.server 8000`
4. **Variables** → добавьте:

```env
PORT=8000
NODE_ENV=production
```

5. **Deploy**
6. **Скопируйте URL** frontend
7. **Добавьте custom domain** (опционально): `am8-production.up.railway.app`

### Шаг 5: Обновление CORS

Вернитесь в **Auth Service** → **Variables**:
- Обновите `ALLOWED_ORIGINS` с правильным URL frontend
- Пример: `https://am8-production.up.railway.app`
- Можно добавить несколько через запятую: `https://domain1.com,https://domain2.com`

## 🧪 Тестирование

### 1. Health Check

```bash
# Auth Service
curl https://YOUR-AUTH-SERVICE.railway.app/api/health

# Ожидаемый ответ:
{
  "status": "ok",
  "service": "auth",
  "database": {
    "type": "MongoDB Atlas",
    "status": {
      "isConnected": true
    }
  }
}
```

### 2. Регистрация пользователя

```bash
curl -X POST https://YOUR-AUTH-SERVICE.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "username": "NewUser",
    "password": "password123"
  }'
```

### 3. Авторизация

```bash
curl -X POST https://YOUR-AUTH-SERVICE.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'
```

### 4. Проверка статистики

```bash
curl https://YOUR-AUTH-SERVICE.railway.app/api/auth/stats
```

### 5. Тестирование в браузере

1. Откройте `https://am8-production.up.railway.app`
2. Перейдите на страницу авторизации
3. Попробуйте войти с существующим пользователем
4. Проверьте, что имя пользователя отображается в навигации
5. Попробуйте создать нового пользователя

## 📊 Мониторинг

### Railway Dashboard

**Auth Service Logs:**
```bash
# Успешное подключение к MongoDB:
✅ Database: Успешно подключено к MongoDB Atlas
📁 UserModel: Загружено X пользователей

# Успешная авторизация:
✅ Auth: Пользователь авторизован: email@example.com
```

**Frontend Logs:**
```bash
# Успешная загрузка:
Serving HTTP on :: port 8000
```

### MongoDB Atlas Dashboard

1. **Metrics** → Connections, Operations
2. **Real Time** → Current operations
3. **Collections** → `users` collection

### Health Check Endpoints

- `GET /api/health` - Основная проверка
- `GET /api/health/detailed` - Детальная информация
- `GET /api/health/ready` - Готовность
- `GET /api/health/live` - Liveness
- `GET /api/auth/stats` - Статистика пользователей

## 🔧 Troubleshooting

### Проблема: "Cannot connect to auth service"

**Причины:**
- Auth service не запущен
- Неправильный URL
- CORS блокирует запросы

**Решение:**
1. Проверьте логи auth service на Railway
2. Убедитесь, что `ALLOWED_ORIGINS` включает URL frontend
3. Проверьте URL в `AuthService.js`

### Проблема: "MongoDB connection error"

**Причины:**
- Неправильные credentials
- Network Access не настроен
- Кластер не запущен

**Решение:**
1. Проверьте переменные окружения MongoDB
2. MongoDB Atlas → Network Access → Allow from anywhere (0.0.0.0/0)
3. Проверьте, что кластер запущен

### Проблема: "JWT token invalid"

**Причины:**
- JWT_SECRET не установлен
- JWT_SECRET отличается между инстансами
- Токен истек

**Решение:**
1. Установите `JWT_SECRET` в переменных окружения
2. Убедитесь, что значение одинаковое везде
3. Очистите localStorage в браузере

### Проблема: "CORS policy error"

**Причины:**
- `ALLOWED_ORIGINS` не включает домен frontend
- Неправильный формат ALLOWED_ORIGINS

**Решение:**
```env
# Правильно:
ALLOWED_ORIGINS=https://domain1.com,https://domain2.com

# Неправильно:
ALLOWED_ORIGINS=https://domain1.com, https://domain2.com
# (не должно быть пробелов после запятой)
```

### Проблема: "502 Bad Gateway"

**Причины:**
- Сервер не запустился
- Ошибка в коде
- Порт не указан правильно

**Решение:**
1. Проверьте логи на Railway
2. Убедитесь, что `npm install` прошел успешно
3. Проверьте, что `PORT` установлен правильно

## ✅ Checklist развертывания

### Подготовка
- [x] MongoDB Atlas подключен и работает
- [x] Локальная разработка настроена
- [x] Тесты подключения к MongoDB пройдены
- [ ] GitHub репозиторий готов

### Railway Auth Service
- [ ] Проект создан на Railway
- [ ] Auth service развернут
- [ ] Переменные окружения MongoDB настроены
- [ ] JWT_SECRET установлен
- [ ] Health check проходит
- [ ] URL auth service скопирован

### Railway Frontend
- [ ] Frontend service развернут
- [ ] URL auth service обновлен в коде
- [ ] CORS настроен правильно
- [ ] Custom domain добавлен (опционально)
- [ ] SSL работает

### Финальное тестирование
- [ ] Health checks проходят
- [ ] Регистрация работает
- [ ] Авторизация работает
- [ ] Данные сохраняются в MongoDB
- [ ] Frontend отображает пользователя
- [ ] Выход работает

## 📞 Поддержка

### Полезные ссылки

- [Railway Documentation](https://docs.railway.app/)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Mongoose Docs](https://mongoosejs.com/docs/)

### Логи

**Railway:**
```bash
# Auth Service
railway logs --service auth-service

# Frontend
railway logs --service frontend
```

**MongoDB Atlas:**
- Dashboard → Logs

### Команды для отладки

```bash
# Локальный тест MongoDB
cd auth
node test-mongodb-connection.js

# Проверка health
curl https://YOUR-SERVICE.railway.app/api/health

# Проверка stats
curl https://YOUR-SERVICE.railway.app/api/auth/stats
```

---

## 🎉 Готово!

После выполнения всех шагов у вас будет:

✅ **Полностью рабочее приложение на Railway**  
✅ **MongoDB Atlas база данных**  
✅ **SSL сертификаты**  
✅ **Автоматическое развертывание**  
✅ **Мониторинг и логи**  
✅ **Готовность к продакшену**

**Ваш Aura Money готов к игре! 🎮**
