# ✅ Настройка Railway - Завершено

## 🎯 Текущая конфигурация

### Frontend
- **URL**: https://am8-production.up.railway.app
- **Статус**: ✅ Работает

### Auth Service
- **URL**: https://web-production-fc48b.up.railway.app/api/auth
- **Статус**: Настроен в коде

### База данных
- **Тип**: Railway MongoDB (приоритет) или MongoDB Atlas (fallback)
- **Конфигурация**: Автоматическое определение через переменные окружения

## 📋 Переменные окружения для Railway

### Auth Service (Backend)

В настройках Railway для auth service добавьте следующие переменные:

```env
# Railway MongoDB (приоритет)
RAILWAY_MONGODB_URI=mongodb://mongo:YOUR_PASSWORD@mongodb.railway.internal:27017
RAILWAY_MONGODB_DATABASE=energy_money_game

# ИЛИ MongoDB Atlas (fallback, если Railway MongoDB не настроен)
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
RATE_LIMIT_MAX=1000
```

## 🔧 Приоритет подключения к базе данных

Система автоматически определяет, какую базу данных использовать:

1. **Railway MongoDB** (если установлена переменная `RAILWAY_MONGODB_URI`)
2. **MongoDB Atlas** (если установлена переменная `MONGODB_URI` или отдельные переменные)
3. **Fallback** (использует значения по умолчанию из конфигурации)

## 📝 Обновленные файлы

### 1. AuthService.js
- ✅ Обновлен для использования Railway auth service URL
- ✅ Автоматическое определение production/development окружения

### 2. Config.js
- ✅ Обновлен для использования Railway endpoints в production
- ✅ Правильная конфигурация API base URL

### 3. RoomService.js
- ✅ Уже настроен для использования Railway API

### 4. Database Configuration
- ✅ Поддержка Railway MongoDB через `RAILWAY_MONGODB_URI`
- ✅ Автоматическое определение приоритета подключения

## 🚀 Как использовать Railway MongoDB

### Вариант 1: Railway MongoDB Volume (рекомендуется)

1. В Railway проекте создайте **MongoDB Volume**
2. Подключите volume к auth service
3. Railway автоматически создаст переменную `RAILWAY_MONGODB_URI`
4. Добавьте переменную `RAILWAY_MONGODB_DATABASE=energy_money_game`

### Вариант 2: MongoDB Atlas (текущая конфигурация)

Если Railway MongoDB не настроен, система автоматически использует MongoDB Atlas с переменными:
- `MONGODB_USERNAME`
- `MONGODB_PASSWORD`
- `MONGODB_CLUSTER`
- `MONGODB_DATABASE`

## 🧪 Тестирование

### 1. Проверка Frontend
Откройте: https://am8-production.up.railway.app

### 2. Проверка Auth Service
```bash
curl https://web-production-fc48b.up.railway.app/api/health
```

### 3. Проверка авторизации
1. Откройте https://am8-production.up.railway.app/pages/auth.html
2. Используйте тестовые кнопки для быстрого входа
3. Проверьте, что авторизация работает

## ✅ Checklist

- [x] Frontend развернут на Railway
- [x] AuthService.js обновлен для Railway
- [x] Config.js обновлен для Railway
- [x] RoomService.js настроен для Railway
- [x] Поддержка Railway MongoDB добавлена
- [ ] Auth Service развернут на Railway (нужно проверить)
- [ ] Railway MongoDB Volume создан (опционально)
- [ ] Переменные окружения настроены в Railway

## 📞 Следующие шаги

1. **Проверьте Railway проект**:
   - Убедитесь, что auth service развернут
   - Проверьте переменные окружения
   - Проверьте логи на наличие ошибок

2. **Настройте Railway MongoDB** (опционально):
   - Создайте MongoDB Volume в Railway
   - Подключите к auth service
   - Система автоматически использует Railway MongoDB

3. **Обновите URL auth service** (если отличается):
   - Если auth service на другом домене, обновите URL в `AuthService.js`
   - Обновите `ALLOWED_ORIGINS` в auth service

## 🎉 Готово!

Все конфигурации обновлены для работы с Railway. Система автоматически определяет окружение и использует правильные endpoints.

