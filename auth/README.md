# 🔐 AuthService - Система авторизации Aura Money

**Версия:** 1.0.0  
**Дата:** 11 октября 2024  
**Статус:** Готово к использованию

## 🎯 Описание

AuthService - это полноценная система авторизации для игры Aura Money, реализованная как отдельный микро-модуль. Обеспечивает безопасную регистрацию, вход в систему, управление сессиями и валидацию пользователей.

## ✨ Возможности

### 🔐 Авторизация
- ✅ Регистрация новых пользователей
- ✅ Вход в систему с email/паролем
- ✅ Выход из системы
- ✅ JWT токены с автоматическим обновлением
- ✅ Запоминание пользователя

### 🛡️ Безопасность
- ✅ Хеширование паролей с bcrypt
- ✅ Rate limiting для защиты от брутфорса
- ✅ Валидация входных данных
- ✅ Санитизация данных
- ✅ CORS защита

### 👤 Управление пользователями
- ✅ Профили пользователей
- ✅ Обновление данных
- ✅ Статистика игрока
- ✅ Настройки пользователя
- ✅ Поиск пользователей

### 🔄 Восстановление пароля
- ✅ Запрос восстановления по email
- ✅ Безопасные токены восстановления
- ✅ Валидация токенов

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
cd auth
npm install
```

### 2. Настройка переменных окружения
Создайте файл `.env` в корне папки `auth`:
```env
PORT=3001
JWT_SECRET=your-super-secret-key-here
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:8000
```

### 3. Запуск сервера
```bash
# Режим разработки
npm run dev

# Продакшн режим
npm start
```

### 4. Открытие страницы авторизации
Откройте браузер и перейдите по адресу:
```
http://localhost:3001
```

## 📁 Структура проекта

```
auth/
├── assets/
│   ├── css/
│   │   ├── main.css          # Основные стили
│   │   └── auth.css          # Стили форм авторизации
│   └── js/
│       ├── modules/
│       │   ├── AuthService.js     # Клиентский сервис авторизации
│       │   ├── ValidationService.js # Сервис валидации
│       │   ├── NotificationService.js # Сервис уведомлений
│       │   └── UserModel.js       # Модель пользователя (клиент)
│       └── main.js           # Главный файл управления формами
├── server/
│   ├── routes/
│   │   ├── auth.js           # API маршруты авторизации
│   │   └── health.js         # Проверка здоровья сервиса
│   ├── middleware/
│   │   ├── auth.js           # Middleware авторизации
│   │   └── errorHandler.js   # Обработчик ошибок
│   ├── services/
│   │   └── AuthService.js    # Серверный сервис авторизации
│   ├── models/
│   │   └── UserModel.js      # Модель пользователя (сервер)
│   └── server.js             # Главный файл сервера
├── data/                     # Хранилище данных пользователей
├── index.html               # Страница авторизации
├── package.json             # Зависимости проекта
└── README.md               # Документация
```

## 🔌 API Endpoints

### Авторизация
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/logout` - Выход из системы

### Профиль пользователя
- `GET /api/auth/profile` - Получение профиля
- `PUT /api/auth/profile` - Обновление профиля

### Валидация и восстановление
- `GET /api/auth/validate` - Валидация токена
- `POST /api/auth/forgot-password` - Запрос восстановления пароля
- `POST /api/auth/reset-password` - Сброс пароля

### Мониторинг
- `GET /api/health` - Проверка здоровья сервиса
- `GET /api/health/detailed` - Детальная проверка
- `GET /api/health/ready` - Проверка готовности

## 📝 Примеры использования

### Регистрация пользователя
```javascript
const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'player123',
        email: 'player@example.com',
        password: 'SecurePass123!'
    })
});

const result = await response.json();
if (result.success) {
    localStorage.setItem('token', result.token);
    console.log('Пользователь зарегистрирован:', result.user);
}
```

### Вход в систему
```javascript
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'player@example.com',
        password: 'SecurePass123!',
        remember: true
    })
});

const result = await response.json();
if (result.success) {
    localStorage.setItem('token', result.token);
    console.log('Вход выполнен:', result.user);
}
```

### Получение профиля
```javascript
const token = localStorage.getItem('token');
const response = await fetch('/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
});

const result = await response.json();
if (result.success) {
    console.log('Профиль пользователя:', result.user);
}
```

## 🛡️ Безопасность

### Валидация данных
- Email: формат и уникальность
- Пароль: минимум 4 символа, проверка силы
- Username: 3-30 символов, только буквы, цифры, дефисы

### Защита от атак
- Rate limiting: 5 попыток входа за 15 минут
- Хеширование паролей: bcrypt с 12 раундами
- JWT токены: 7 дней жизни, автоматическое обновление
- CORS: ограничение доступа по доменам

### Санитизация
- Очистка от XSS атак
- Валидация типов данных
- Ограничение длины полей

## 🔧 Настройка

### Переменные окружения
```env
# Основные настройки
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Безопасность
BCRYPT_ROUNDS=12

# CORS
ALLOWED_ORIGINS=https://yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Настройка CORS
Для продакции обязательно настройте разрешенные домены:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 📊 Мониторинг

### Проверка здоровья
```bash
# Базовая проверка
curl http://localhost:3001/api/health

# Детальная проверка
curl http://localhost:3001/api/health/detailed

# Проверка готовности
curl http://localhost:3001/api/health/ready
```

### Логи
Сервис ведет подробные логи всех операций:
- Успешные регистрации и входы
- Неудачные попытки авторизации
- Ошибки валидации
- Подозрительная активность

## 🧪 Тестирование

### Запуск тестов
```bash
npm test
```

### Тестирование API
```bash
# Проверка здоровья
npm run health

# Тест регистрации
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'
```

## 🚀 Развертывание

### Docker (рекомендуется)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### PM2
```bash
npm install -g pm2
pm2 start server/server.js --name "aura-money-auth"
pm2 save
pm2 startup
```

### Nginx
```nginx
server {
    listen 80;
    server_name auth.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔄 Интеграция с основной игрой

### В главном файле игры
```javascript
// Проверка авторизации при загрузке
const token = localStorage.getItem('aura_money_token');
if (!token) {
    // Перенаправление на страницу авторизации
    window.location.href = '/auth/index.html';
}

// Проверка валидности токена
fetch('/auth/api/auth/validate', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => response.json())
.then(result => {
    if (!result.success) {
        // Токен недействителен, перенаправление на авторизацию
        window.location.href = '/auth/index.html';
    }
});
```

## 📞 Поддержка

### Контакты
- **Команда разработки:** Backend Team
- **Безопасность:** Security Team
- **DevOps:** DevOps Team

### Полезные ссылки
- [Документация API](API_SPECIFICATION.md)
- [Руководство по безопасности](SECURITY_GUIDE.md)
- [Схема базы данных](DATABASE_SCHEMA.md)

---

**AuthService v1.0.0** - Надежная система авторизации для Aura Money 🎮
