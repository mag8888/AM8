# CODEX - Рекомендации по рефакторингу

## 🔧 Refactoring Recommendations

### 1. CellPopup Memory Leak Fix

**Проблема**: `CellPopup` регистрирует глобальные обработчики (`assets/js/modules/game/CellPopup.js:68` & `:83`) без соответствующего удаления, поэтому повторные открытия накапливают слушатели.

**Статус**: ❌ НЕ ИСПРАВЛЕНО

**Решение**: Добавить метод `destroy()` который удаляет DOM/key слушатели:

```javascript
// В CellPopup.js добавить:
destroy() {
    // Удаляем обработчик Escape клавиши
    document.removeEventListener('keydown', this.boundHandleKeydown);
    
    // Удаляем DOM элемент
    if (this.popupElement && this.popupElement.parentNode) {
        this.popupElement.parentNode.removeChild(this.popupElement);
    }
    
    // Очищаем ссылки
    this.popupElement = null;
    this.isVisible = false;
    this.currentCellData = null;
}

// И в setupEventListeners сохранить ссылку на обработчик:
this.boundHandleKeydown = (e) => {
    if (e.key === 'Escape' && this.isVisible) {
        this.hide();
    }
};
document.addEventListener('keydown', this.boundHandleKeydown);
```

**Интеграция**: Вызывать `destroy()` из `BoardLayout.destroy()` метод.

---

## 🧪 Tests

**Статус**: Не запущены (нет lint/test скрипта в проекте для покрытия этих модулей).

---

## 🚀 Next Steps

### 1. Унификация инициализации игровых модулей
Создать единое место композиции сервисов для двух путей инициализации игровых модулей.

### 2. Расширение CellPopup с teardown процедурой
- Добавить метод `destroy()` в `CellPopup`
- Вызывать его из `BoardLayout.destroy()`
- Исправить утечки памяти от накопления слушателей

### 3. Миграция console.* блоков
Переместить оставшиеся ad-hoc `console.*` блоки в shared logger или закрыть их за новым debug флагом.

---

## 📊 Git Changes Summary

- **2 files changed**: +180 -34
  - `app.js`: +9 -3
  - `BoardLayout.js`: +171 -31

## 🔍 Приоритет исправлений

1. **Высокий**: CellPopup memory leak - может вызывать проблемы с производительностью
2. **Средний**: Унификация инициализации модулей - улучшит maintainability
3. **Низкий**: Миграция console.* - улучшит debugging опыт

---

*CODEX создан: $(date)*
*Версия: 1.0*
*Статус: Требует реализации*
