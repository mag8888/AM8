# Управление микромодулями в Git

## Обзор

Система позволяет работать с отдельными JavaScript модулями: фиксировать, отправлять и восстанавливать изменения только для конкретных микромодулей.

## Установка алиасов (опционально)

Добавьте алиасы в ваш `.gitconfig` для удобного использования:

```bash
git config --global alias.mod-list "!bash scripts/module-manager.sh list"
git config --global alias.mod-commit "!bash scripts/module-manager.sh commit"
git config --global alias.mod-push "!bash scripts/module-manager.sh push"
git config --global alias.mod-restore "!bash scripts/module-manager.sh restore"
git config --global alias.mod-switch "!bash scripts/module-manager.sh switch"
git config --global alias.mod-status "!bash scripts/module-manager.sh status"
git config --global alias.mod-branch "!bash scripts/module-manager.sh create-branch"
```

## Команды

### 1. Просмотр доступных модулей

```bash
# Основные модули
bash scripts/module-manager.sh list

# С алиасом
git mod-list
```

**Результат:**
- Основные модули: `Logger`, `EventBus`, `GameState`, etc.
- Игровые модули: `BankModule`, `TurnController`, `PlayersPanel`, etc.

### 2. Коммит изменений конкретного модуля

```bash
# Фиксация только одного модуля
bash scripts/module-manager.sh commit Logger "Добавлена информация о стеке вызовов"

# С алиасом
git mod-commit BankModule "Исправление отображения данных банка"
```

**Что происходит:**
- Добавляется только указанный файл модуля
- Создается коммит с префиксом `module(ModuleName):`
- Остальные изменения остаются не зафиксированными

### 3. Отправка модуля в отдельную ветку

```bash
# Создание ветки и отправка модуля
bash scripts/module-manager.sh push Logger

# С алиасом
git mod-push BankModule
```

**Что происходит:**
- Создается ветка `module/ModuleName` (если не существует)
- Выполняется rebase с `main`
- Ветка отправляется в origin
- Можно работать с модулем независимо

### 4. Восстановление модуля из ветки

```bash
# Восстановление конкретного модуля
bash scripts/module-manager.sh restore Logger

# С алиасом
git mod-restore BankModule
```

**Что происходит:**
- Файл модуля восстанавливается из соответствующей ветки
- Остальные файлы остаются неизменными
- Можно восстановить модуль к рабочему состоянию

### 5. Переключение на ветку модуля

```bash
# Работа с веткой конкретного модуля
bash scripts/module-manager.sh switch Logger

# С алиасом
git mod-switch TurnController
```

### 6. Проверка статуса модуля

```bash
# Статус конкретного модуля
bash scripts/module-manager.sh status Logger

# С алиасом
git mod-status BankModule
```

## Примеры рабочего процесса

### Сценарий 1: Исправление критической ошибки в одном модуле

```bash
# 1. Исправляем код в BankModule.js
# 2. Проверяем статус
git mod-status BankModule

# 3. Фиксируем только этот модуль
git mod-commit BankModule "Критическое исправление: предотвращение null pointer"

# 4. Отправляем в отдельную ветку для быстрого деплоя
git mod-push BankModule

# 5. Создаем PR из ветки module/BankModule в main
```

### Сценарий 2: Восстановление модуля к рабочему состоянию

```bash
# 1. Что-то сломалось в TurnController
# 2. Восстанавливаем из последней рабочей версии
git mod-restore TurnController

# 3. Проверяем, что все работает
# 4. При необходимости делаем новый коммит
git mod-commit TurnController "Исправление после восстановления"
```

### Сценарий 3: Работа над новым модулем

```bash
# 1. Создаем новую ветку для модуля
git mod-branch NewModule

# 2. Переключаемся на ветку
git mod-switch NewModule

# 3. Разрабатываем модуль
# 4. Фиксируем изменения
git mod-commit NewModule "Первая версия нового модуля"

# 5. Отправляем в origin
git mod-push NewModule
```

## Структура веток

```
main (основная ветка)
├── module/Logger
├── module/BankModule
├── module/TurnController
├── module/PlayersPanel
└── module/EventBus
```

Каждая ветка модуля содержит:
- Историю изменений только этого модуля
- Возможность независимого развития
- Легкое восстановление при проблемах

## Преимущества

1. **Изоляция изменений** - проблемы в одном модуле не влияют на другие
2. **Быстрое восстановление** - можно откатить только проблемный модуль
3. **Независимое тестирование** - каждый модуль можно тестировать отдельно
4. **Упрощенные PR** - изменения в PR касаются только конкретного модуля
5. **Отслеживание истории** - четкая история изменений каждого модуля

## Ограничения

- Подходит только для модулей с четкими границами
- Требует дисциплины в работе с файлами модулей
- Может усложнить merge при конфликтах между модулями

## Автоматизация

Можно настроить CI/CD для автоматического тестирования модулей:

```bash
# В .github/workflows/module-test.yml
- name: Test Module
  run: |
    if git diff --name-only HEAD~1 | grep -q "assets/js/modules.*\.js$"; then
      # Запускаем тесты только для измененных модулей
      MODULE=$(git diff --name-only HEAD~1 | grep "assets/js/modules.*\.js$" | head -1)
      npm test -- --module="$MODULE"
    fi
```
