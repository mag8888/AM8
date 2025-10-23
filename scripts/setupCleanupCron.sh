#!/bin/bash

# Скрипт настройки автоматической очистки комнат
# Настраивает cron для запуска очистки каждые 30 минут

echo "🔧 Настройка автоматической очистки комнат..."

# Получаем путь к проекту
PROJECT_PATH=$(pwd)
SCRIPT_PATH="$PROJECT_PATH/scripts/cleanupOldRooms.js"

echo "📁 Путь к проекту: $PROJECT_PATH"
echo "📄 Путь к скрипту: $SCRIPT_PATH"

# Проверяем, существует ли скрипт
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Скрипт cleanupOldRooms.js не найден!"
    exit 1
fi

# Создаем временный файл для cron
CRON_TEMP="/tmp/am8_cleanup_cron"

# Записываем задачу cron
cat > "$CRON_TEMP" << EOF
# Автоматическая очистка старых комнат AM8 (каждые 30 минут)
*/30 * * * * cd $PROJECT_PATH && node scripts/cleanupOldRooms.js >> logs/cleanup.log 2>&1

# Ежедневная очистка в 2:00 (дополнительная очистка)
0 2 * * * cd $PROJECT_PATH && node scripts/cleanupOldRooms.js --verbose >> logs/cleanup.log 2>&1
EOF

echo "📋 Задача cron:"
cat "$CRON_TEMP"

# Создаем директорию для логов, если её нет
mkdir -p logs

echo ""
echo "🚀 Установка cron задачи..."

# Добавляем задачу в crontab
crontab "$CRON_TEMP"

if [ $? -eq 0 ]; then
    echo "✅ Cron задача успешно установлена!"
    echo ""
    echo "📅 Расписание:"
    echo "  - Каждые 30 минут: очистка старых комнат"
    echo "  - Ежедневно в 2:00: подробная очистка с логами"
    echo ""
    echo "📄 Логи будут сохраняться в: logs/cleanup.log"
    echo ""
    echo "🔍 Для проверки cron задач выполните: crontab -l"
    echo "🗑️ Для удаления cron задач выполните: crontab -r"
else
    echo "❌ Ошибка установки cron задачи!"
    exit 1
fi

# Удаляем временный файл
rm "$CRON_TEMP"

echo "🎉 Настройка завершена!"
