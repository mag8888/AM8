#!/bin/bash

# Скрипт для автоматического переноса переменных
# ВНИМАНИЕ: Замените <NEW_MONGODB_URI> на реальный URI из Railway MongoDB сервиса

echo "🚀 Начинаем перенос переменных окружения..."

# Добавляем новые переменные
railway variables set RAILWAY_MONGODB_URI="<NEW_MONGODB_URI>"
railway variables set RAILWAY_MONGODB_DATABASE="energy_money_game"

echo "✅ Новые переменные добавлены"

# Проверяем переменные
echo "📋 Текущие переменные:"
railway variables list

echo "🎉 Перенос завершен!"
echo "📝 Следующий шаг: запустите миграцию данных"
echo "   node scripts/migrateToRailwayMongo.js --dry-run"