#!/bin/bash

# Скрипт для автоматического тестирования сайта каждые 10 минут
# Использование: ./test-site.sh или запустить через cron

SITE_URL="https://am8-production.up.railway.app"
LOG_FILE="site-test.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Начинаем тестирование сайта..." >> "$LOG_FILE"

# Проверка доступности главной страницы
if curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" | grep -q "200"; then
    echo "[$TIMESTAMP] ✅ Главная страница доступна" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ❌ Главная страница недоступна" >> "$LOG_FILE"
    exit 1
fi

# Проверка доступности игровой страницы
if curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/#game" | grep -q "200"; then
    echo "[$TIMESTAMP] ✅ Игровая страница доступна" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ⚠️ Игровая страница может быть недоступна" >> "$LOG_FILE"
fi

# Проверка API
API_URL="$SITE_URL/api/health"
if curl -s "$API_URL" | grep -q "ok\|success\|healthy"; then
    echo "[$TIMESTAMP] ✅ API отвечает" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ⚠️ API может не отвечать корректно" >> "$LOG_FILE"
fi

# Проверка загрузки критических ресурсов
CRITICAL_RESOURCES=(
    "assets/js/app.js"
    "assets/css/game-optimized.css"
    "assets/js/modules/GameStateManager.js"
)

for resource in "${CRITICAL_RESOURCES[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/$resource" | grep -q "200"; then
        echo "[$TIMESTAMP] ✅ Ресурс $resource доступен" >> "$LOG_FILE"
    else
        echo "[$TIMESTAMP] ❌ Ресурс $resource недоступен" >> "$LOG_FILE"
    fi
done

echo "[$TIMESTAMP] Тестирование завершено" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

