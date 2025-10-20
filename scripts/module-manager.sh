#!/bin/bash

# Module Manager Script
# Позволяет работать с отдельными микромодулями в git

set -e

MODULES_DIR="assets/js/modules"
GAME_MODULES_DIR="$MODULES_DIR/game"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода справки
show_help() {
    echo -e "${BLUE}Module Manager - Управление микромодулями${NC}"
    echo ""
    echo "Использование: $0 <команда> [опции]"
    echo ""
    echo "Команды:"
    echo "  list                    - Показать все доступные модули"
    echo "  commit <module> <msg>   - Зафиксировать изменения конкретного модуля"
    echo "  push <module>           - Отправить модуль в отдельную ветку"
    echo "  restore <module>        - Восстановить модуль из ветки"
    echo "  create-branch <module>  - Создать ветку для модуля"
    echo "  switch <module>         - Переключиться на ветку модуля"
    echo "  status <module>         - Показать статус модуля"
    echo ""
    echo "Примеры:"
    echo "  $0 list"
    echo "  $0 commit BankModule 'Исправление отображения данных'"
    echo "  $0 push BankModule"
    echo "  $0 restore Logger"
    echo ""
}

# Функция для получения списка модулей
list_modules() {
    echo -e "${BLUE}Доступные модули:${NC}"
    echo ""
    
    echo -e "${YELLOW}Основные модули:${NC}"
    find $MODULES_DIR -maxdepth 1 -name "*.js" 2>/dev/null | while read file; do
        if [[ ! "$file" =~ /game/ ]]; then
            basename=$(basename "$file" .js)
            echo "  - $basename ($file)"
        fi
    done
    
    echo ""
    echo -e "${YELLOW}Игровые модули:${NC}"
    find $GAME_MODULES_DIR -name "*.js" 2>/dev/null | while read file; do
        basename=$(basename "$file" .js)
        relative_path=$(echo "$file" | sed "s|^assets/js/modules/||")
        echo "  - $basename ($relative_path)"
    done
}

# Функция для получения пути к модулю
get_module_path() {
    local module_name="$1"
    
    # Проверяем основные модули
    if [[ -f "$MODULES_DIR/$module_name.js" ]]; then
        echo "$MODULES_DIR/$module_name.js"
        return 0
    fi
    
    # Проверяем игровые модули
    if [[ -f "$GAME_MODULES_DIR/$module_name.js" ]]; then
        echo "$GAME_MODULES_DIR/$module_name.js"
        return 0
    fi
    
    # Поиск по частичному совпадению
    local found=$(find "$MODULES_DIR" -name "*$module_name*" -type f 2>/dev/null | head -1)
    if [[ -n "$found" ]]; then
        echo "$found"
        return 0
    fi
    
    return 1
}

# Функция для создания ветки модуля
create_module_branch() {
    local module_name="$1"
    local branch_name="module/$module_name"
    
    echo -e "${BLUE}Создание ветки для модуля: $module_name${NC}"
    
    # Проверяем существование ветки
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${YELLOW}Ветка $branch_name уже существует${NC}"
        return 1
    fi
    
    # Создаем ветку
    git checkout -b "$branch_name"
    echo -e "${GREEN}Ветка $branch_name создана${NC}"
}

# Функция для коммита модуля
commit_module() {
    local module_name="$1"
    local message="$2"
    
    if [[ -z "$message" ]]; then
        echo -e "${RED}Ошибка: Необходимо указать сообщение коммита${NC}"
        return 1
    fi
    
    local module_path=$(get_module_path "$module_name")
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Ошибка: Модуль '$module_name' не найден${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Коммит модуля: $module_name${NC}"
    echo -e "Путь: $module_path"
    echo -e "Сообщение: $message"
    
    # Добавляем только конкретный файл
    git add "$module_path"
    
    # Проверяем, есть ли изменения для коммита
    if git diff --cached --quiet; then
        echo -e "${YELLOW}Нет изменений для коммита${NC}"
        return 1
    fi
    
    # Коммитим
    git commit -m "module($module_name): $message"
    
    echo -e "${GREEN}Модуль $module_name зафиксирован${NC}"
}

# Функция для отправки модуля в ветку
push_module() {
    local module_name="$1"
    local branch_name="module/$module_name"
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    echo -e "${BLUE}Отправка модуля $module_name в ветку $branch_name${NC}"
    
    # Проверяем наличие не зафиксированных изменений
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${YELLOW}Обнаружены не зафиксированные изменения. Рекомендуется сначала зафиксировать изменения модуля:${NC}"
        echo -e "${YELLOW}git mod-commit $module_name \"Ваше сообщение\"${NC}"
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    # Проверяем существование ветки модуля
    if ! git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${YELLOW}Ветка $branch_name не существует, создаем...${NC}"
        # Создаем ветку от текущего состояния main
        git stash push -m "temp stash before creating module branch" || true
        git checkout -b "$branch_name"
        git checkout "$current_branch"
        git stash pop || true
    fi
    
    # Переключаемся на ветку модуля
    if [[ "$current_branch" != "$branch_name" ]]; then
        echo -e "Переключение на ветку $branch_name"
        git checkout "$branch_name"
    fi
    
    # Перебазируем изменения из main (если ветка не пустая)
    if git rev-list --count HEAD > /dev/null 2>&1 && git rev-list --count HEAD > 0; then
        echo -e "Синхронизация с main..."
        git rebase main || {
            echo -e "${RED}Конфликт при rebase. Разрешите конфликты и выполните git rebase --continue${NC}"
            return 1
        }
    fi
    
    # Отправляем в удаленный репозиторий
    echo -e "Отправка в origin/$branch_name"
    if git push origin "$branch_name" 2>/dev/null; then
        echo -e "${GREEN}Модуль $module_name отправлен в ветку $branch_name${NC}"
    else
        # Если remote не существует, создаем его
        git push origin "$branch_name":refs/heads/"$branch_name" 2>/dev/null || {
            echo -e "${YELLOW}Не удалось отправить в origin. Ветка создана локально.${NC}"
            echo -e "${YELLOW}Для отправки выполните: git push origin $branch_name${NC}"
        }
    fi
    
    # Возвращаемся на исходную ветку
    git checkout "$current_branch" 2>/dev/null || true
}

# Функция для восстановления модуля
restore_module() {
    local module_name="$1"
    local branch_name="module/$module_name"
    local module_path=$(get_module_path "$module_name")
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Ошибка: Модуль '$module_name' не найден${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Восстановление модуля: $module_name${NC}"
    echo -e "Путь: $module_path"
    
    # Проверяем существование ветки
    if ! git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${RED}Ошибка: Ветка $branch_name не существует${NC}"
        return 1
    fi
    
    # Сохраняем текущую ветку
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    # Переключаемся на ветку модуля и восстанавливаем файл
    echo -e "Восстановление из ветки $branch_name"
    git checkout "$branch_name" -- "$module_path"
    
    # Возвращаемся на исходную ветку
    git checkout "$current_branch" 2>/dev/null || true
    
    echo -e "${GREEN}Модуль $module_name восстановлен${NC}"
}

# Функция для переключения на ветку модуля
switch_module() {
    local module_name="$1"
    local branch_name="module/$module_name"
    
    if ! git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${RED}Ошибка: Ветка $branch_name не существует${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Переключение на ветку модуля: $branch_name${NC}"
    git checkout "$branch_name"
    echo -e "${GREEN}Переключено на ветку $branch_name${NC}"
}

# Функция для показа статуса модуля
status_module() {
    local module_name="$1"
    local module_path=$(get_module_path "$module_name")
    local branch_name="module/$module_name"
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Ошибка: Модуль '$module_name' не найден${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Статус модуля: $module_name${NC}"
    echo -e "Путь: $module_path"
    echo ""
    
    # Статус файла
    if git diff --quiet "$module_path" 2>/dev/null; then
        echo -e "${GREEN}Файл не изменен${NC}"
    else
        echo -e "${YELLOW}Файл имеет изменения:${NC}"
        git diff --name-status "$module_path"
    fi
    
    # Информация о ветке
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo -e "${GREEN}Ветка $branch_name существует${NC}"
    else
        echo -e "${RED}Ветка $branch_name не существует${NC}"
    fi
}

# Основная логика
case "$1" in
    "list")
        list_modules
        ;;
    "commit")
        if [[ -z "$2" ]] || [[ -z "$3" ]]; then
            echo -e "${RED}Ошибка: Необходимо указать имя модуля и сообщение${NC}"
            echo "Использование: $0 commit <module> <message>"
            exit 1
        fi
        commit_module "$2" "$3"
        ;;
    "push")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Ошибка: Необходимо указать имя модуля${NC}"
            exit 1
        fi
        push_module "$2"
        ;;
    "restore")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Ошибка: Необходимо указать имя модуля${NC}"
            exit 1
        fi
        restore_module "$2"
        ;;
    "create-branch")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Ошибка: Необходимо указать имя модуля${NC}"
            exit 1
        fi
        create_module_branch "$2"
        ;;
    "switch")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Ошибка: Необходимо указать имя модуля${NC}"
            exit 1
        fi
        switch_module "$2"
        ;;
    "status")
        if [[ -z "$2" ]]; then
            echo -e "${RED}Ошибка: Необходимо указать имя модуля${NC}"
            exit 1
        fi
        status_module "$2"
        ;;
    *)
        show_help
        ;;
esac
