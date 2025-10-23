#!/bin/bash

# Простой скрипт для настройки автоматической очистки комнат

echo "🔧 Настройка автоматической очистки комнат AM8..."

# Проверяем права доступа
if [ ! -x "./scripts/runCleanup.sh" ]; then
    echo "📝 Делаем скрипты исполняемыми..."
    chmod +x scripts/runCleanup.sh
    chmod +x scripts/setupCleanupCron.sh
fi

# Создаем директорию для логов
mkdir -p logs

echo "📋 Доступные команды:"
echo "  ./scripts/runCleanup.sh --dry-run    # Тестовый запуск"
echo "  ./scripts/runCleanup.sh              # Реальная очистка"
echo "  ./scripts/setupCleanupCron.sh        # Настройка автоматической очистки"
echo ""
echo "📄 Документация: docs/ROOM_CLEANUP.md"
echo ""
echo "✅ Настройка завершена!"

# Простой скрипт для настройки автоматической очистки комнат

echo "🔧 Настройка автоматической очистки комнат AM8..."

# Проверяем права доступа
if [ ! -x "./scripts/runCleanup.sh" ]; then
    echo "📝 Делаем скрипты исполняемыми..."
    chmod +x scripts/runCleanup.sh
    chmod +x scripts/setupCleanupCron.sh
fi

# Создаем директорию для логов
mkdir -p logs

echo "📋 Доступные команды:"
echo "  ./scripts/runCleanup.sh --dry-run    # Тестовый запуск"
echo "  ./scripts/runCleanup.sh              # Реальная очистка"
echo "  ./scripts/setupCleanupCron.sh        # Настройка автоматической очистки"
echo ""
echo "📄 Документация: docs/ROOM_CLEANUP.md"
echo ""
echo "✅ Настройка завершена!"
