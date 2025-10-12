# 🚀 Инструкции по настройке Railway - Пошаговое руководство

## ✅ Текущий статус

- ✅ Frontend развернут: https://am8-production.up.railway.app
- ❌ Auth Service: Нужно развернуть
- ✅ MongoDB Atlas: Подключен и работает (cluster0.wvumcaj.mongodb.net)

## 📋 Что нужно сделать

### Шаг 1: Войдите в Railway

1. Откройте https://railway.app
2. Войдите через GitHub
3. Найдите ваш проект или создайте новый

---

### Шаг 2: Создайте Auth Service

1. **В вашем Railway проекте нажмите "+ New"**
2. **Выберите "GitHub Repo"**
3. **Выберите репозиторий**: `mag8888/AM8`
4. **Нажмите "Add Service"**

---

### Шаг 3: Настройте Auth Service

#### 3.1 Настройки Root Directory

1. Перейдите в **Settings** созданного сервиса
2. Найдите **"Root Directory"**
3. Установите: `auth`
4. Сохраните

#### 3.2 Настройки команды запуска (опционально)

Railway обычно автоматически определяет команду запуска из `package.json`, но можно указать явно:

1. В **Settings** → **Deploy**
2. **Start Command**: `npm start`
3. Сохраните

---

### Шаг 4: Добавьте переменные окружения

1. Перейдите в **Variables** в auth service
2. Нажмите **"+ New Variable"**
3. Добавьте следующие переменные **ОДНА ЗА ОДНОЙ**:

```
MONGODB_USERNAME=xqrmedia_db_user
MONGODB_PASSWORD=pOs1rKxSv9Y3e7rl
MONGODB_CLUSTER=cluster0.wvumcaj.mongodb.net
MONGODB_DATABASE=energy_money_game
MONGODB_OPTIONS=retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET=em1-production-secret-key-2024-railway
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

PORT=3001
NODE_ENV=production

ALLOWED_ORIGINS=https://am8-production.up.railway.app

USE_MONGODB=true

RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

**ВАЖНО**: Скопируйте каждую строку отдельно! Формат:
- **Variable Name** (слева от =)
- **Value** (справа от =)

---

### Шаг 5: Разверните сервис

1. После добавления всех переменных Railway автоматически начнет деплой
2. Если нет - нажмите **"Deploy"** вручную
3. Дождитесь завершения (обычно 2-3 минуты)
4. Проверьте логи - должно быть:
   ```
   ✅ Database: Успешно подключено к MongoDB Atlas
   🚀 AuthServer: Сервер запущен на порту 3001
   ```

---

### Шаг 6: Получите URL вашего Auth Service

1. После успешного деплоя перейдите в **Settings** auth service
2. Найдите раздел **"Domains"**
3. Нажмите **"Generate Domain"** (если домен еще не создан)
4. Скопируйте URL - он будет примерно таким:
   ```
   https://auth-am8-production-xxxx.up.railway.app
   ```
   или
   ```
   https://am8-auth-production.up.railway.app
   ```

---

### Шаг 7: Обновите код с правильным URL

**ВАЖНО**: Теперь нужно обновить URL в коде!

1. Откройте файл `auth/assets/js/modules/AuthService.js`
2. Найдите строку 17:
   ```javascript
   this.apiBase = 'https://am8-auth.up.railway.app/api/auth';
   ```
3. Замените на ваш реальный URL от Railway:
   ```javascript
   this.apiBase = 'https://ВАШ-РЕАЛЬНЫЙ-URL.up.railway.app/api/auth';
   ```
4. Сохраните файл

---

### Шаг 8: Закоммитьте изменения

```bash
git add .
git commit -m "Update auth service URL for Railway"
git push
```

Railway автоматически задеплоит обновленную версию frontend!

---

### Шаг 9: Обновите CORS в Auth Service

После того, как обновите URL и задеплоите frontend:

1. Вернитесь в Railway → Auth Service → **Variables**
2. Найдите переменную `ALLOWED_ORIGINS`
3. Убедитесь, что она содержит правильный URL frontend:
   ```
   https://am8-production.up.railway.app
   ```
4. Если нужно добавить несколько доменов:
   ```
   https://am8-production.up.railway.app,https://другой-домен.com
   ```
   (БЕЗ пробелов после запятой!)

---

## 🧪 Проверка работоспособности

### Тест 1: Health Check

Откройте в браузере:
```
https://ВАШ-AUTH-SERVICE-URL.up.railway.app/api/health
```

Должны увидеть JSON:
```json
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

### Тест 2: Авторизация на сайте

1. Откройте https://am8-production.up.railway.app
2. Нажмите **"Авторизация"**
3. Нажмите кнопку **"🧪 TestUser"**
4. Нажмите **"Войти"**
5. Должно показать: **"Вход выполнен успешно!"**
6. Вверху страницы должно появиться имя: **"TestUser"**

---

## 🔧 Troubleshooting

### Проблема 1: "Cannot connect to auth service"

**Решение**:
- Проверьте, что auth service запущен в Railway
- Проверьте логи auth service на наличие ошибок
- Убедитесь, что URL в `AuthService.js` правильный

### Проблема 2: "CORS error"

**Решение**:
- Проверьте `ALLOWED_ORIGINS` в auth service
- Убедитесь, что нет пробелов после запятых
- Формат должен быть: `https://domain1.com,https://domain2.com`

### Проблема 3: "MongoDB connection error"

**Решение**:
- Проверьте все MongoDB переменные окружения
- Убедитесь, что MongoDB Atlas → Network Access → Allow from anywhere (0.0.0.0/0)
- Проверьте логи auth service

### Проблема 4: Сервис не запускается

**Решение**:
- Проверьте логи деплоя в Railway
- Убедитесь, что `Root Directory` установлен в `auth`
- Проверьте, что все зависимости установлены

---

## 📞 Команды для проверки

### Проверка health
```bash
curl https://ВАШ-AUTH-URL.up.railway.app/api/health
```

### Проверка авторизации
```bash
curl -X POST https://ВАШ-AUTH-URL.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test123"}'
```

### Проверка статистики
```bash
curl https://ВАШ-AUTH-URL.up.railway.app/api/auth/stats
```

---

## ✅ Checklist

- [ ] Auth service создан в Railway
- [ ] Root Directory установлен в `auth`
- [ ] Все переменные окружения добавлены
- [ ] Сервис успешно задеплоен
- [ ] Health check возвращает `status: ok`
- [ ] URL auth service скопирован
- [ ] URL обновлен в `AuthService.js`
- [ ] Изменения закоммичены и запушены
- [ ] Frontend перезадеплоился
- [ ] CORS настроен правильно
- [ ] Авторизация работает на сайте

---

## 🎉 Готово!

После выполнения всех шагов:
- ✅ Frontend работает на https://am8-production.up.railway.app
- ✅ Auth Service работает на https://ВАШ-URL.up.railway.app
- ✅ MongoDB Atlas подключен
- ✅ Авторизация работает
- ✅ Пользователи сохраняются в облачной БД

**Ваш Aura Money полностью работает в продакшене!** 🎮🚀
