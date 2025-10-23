#!/bin/bash

# Скрипт для ручного запуска очистки старых комнат
# 
# Использование:
# ./scripts/runCleanup.sh [--dry-run] [--verbose]

echo "🧹 Запуск очистки старых комнат..."

# Получаем аргументы
DRY_RUN=""
VERBOSE=""

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN="--dry-run"
            echo "🔍 Режим тестирования: ВКЛЮЧЕН"
            ;;
        --verbose)
            VERBOSE="--verbose"
            echo "📝 Подробный режим: ВКЛЮЧЕН"
            ;;
        --help)
            echo "Использование: $0 [--dry-run] [--verbose]"
            echo ""
            echo "Опции:"
            echo "  --dry-run   Режим тестирования (не удаляет комнаты)"
            echo "  --verbose   Подробный вывод"
            echo "  --help      Показать эту справку"
            exit 0
            ;;
    esac
done

# Путь к проекту
PROJECT_PATH=$(pwd)
SCRIPT_PATH="$PROJECT_PATH/scripts/cleanupOldRooms.js"

# Проверяем, существует ли скрипт
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Скрипт cleanupOldRooms.js не найден!"
    echo "📁 Ожидаемый путь: $SCRIPT_PATH"
    exit 1
fi

# Проверяем, существует ли Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден! Установите Node.js для выполнения скрипта."
    exit 1
fi

echo "📄 Выполняем: node $SCRIPT_PATH $DRY_RUN $VERBOSE"
echo ""

# Запускаем скрипт
node "$SCRIPT_PATH" $DRY_RUN $VERBOSE

# Проверяем результат
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Очистка завершена успешно!"
else
    echo ""
    echo "❌ Очистка завершилась с ошибкой!"
    exit 1
fi
