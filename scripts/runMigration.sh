#!/bin/bash

# Скрипт для запуска миграции на Railway сервере
echo "🚀 Запуск миграции MongoDB на Railway сервере..."

# Проверяем, что Railway CLI установлен
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не установлен!"
    echo "📝 Установите Railway CLI:"
    echo "   npm install -g @railway/cli"
    echo "   railway login"
    exit 1
fi

# Проверяем, что мы авторизованы
if ! railway whoami &> /dev/null; then
    echo "❌ Не авторизован в Railway CLI!"
    echo "📝 Выполните: railway login"
    exit 1
fi

echo "✅ Railway CLI готов"

# Запускаем миграцию на Railway сервере
echo "🚀 Запускаем миграцию на Railway сервере..."
echo "📝 Это может занять несколько минут..."

railway run node scripts/runMigrationOnRailway.js

if [ $? -eq 0 ]; then
    echo "✅ Миграция завершена успешно!"
    echo "🎉 Теперь приложение использует Railway MongoDB!"
else
    echo "❌ Миграция завершилась с ошибкой!"
    exit 1
fi
