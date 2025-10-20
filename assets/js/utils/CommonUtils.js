/**
 * CommonUtils - Общие утилиты для устранения дублирования кода
 * Версия: 1.0.0
 */

class CommonUtils {
    /**
     * Форматирование чисел для отображения денежных сумм
     * @param {number} num - Число для форматирования
     * @returns {string} Отформатированная строка
     */
    static formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) {
            return '0';
        }
        return new Intl.NumberFormat('ru-RU').format(Math.round(num));
    }

    /**
     * Форматирование денежной суммы с символом валюты
     * @param {number} amount - Сумма
     * @returns {string} Отформатированная денежная сумма
     */
    static formatMoney(amount) {
        return `$${this.formatNumber(amount)}`;
    }

    /**
     * Безопасный поиск элемента DOM
     * @param {string} selector - CSS селектор
     * @param {HTMLElement} context - Контекст поиска (по умолчанию document)
     * @returns {HTMLElement|null} Найденный элемент или null
     */
    static safeQuerySelector(selector, context = document) {
        try {
            return context.querySelector(selector);
        } catch (error) {
            console.warn(`CommonUtils: Ошибка поиска элемента "${selector}":`, error);
            return null;
        }
    }

    /**
     * Безопасный поиск элементов DOM
     * @param {string} selector - CSS селектор
     * @param {HTMLElement} context - Контекст поиска (по умолчанию document)
     * @returns {NodeList} Список найденных элементов
     */
    static safeQuerySelectorAll(selector, context = document) {
        try {
            return context.querySelectorAll(selector);
        } catch (error) {
            console.warn(`CommonUtils: Ошибка поиска элементов "${selector}":`, error);
            return [];
        }
    }

    /**
     * Получение текущего пользователя из различных источников
     * @returns {Object|null} Данные пользователя
     */
    static getCurrentUser() {
        try {
            // 1. Попытка получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                if (bundle?.currentUser) {
                    return bundle.currentUser;
                }
            }

            // 2. Попытка получить из localStorage
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    return {
                        id: payload.id || payload.userId,
                        username: payload.username || payload.name,
                        name: payload.name || payload.username
                    };
                } catch (e) {
                    console.warn('CommonUtils: Ошибка парсинга токена:', e);
                }
            }

            // 3. Попытка получить из window.app
            if (window.app && typeof window.app.getCurrentUser === 'function') {
                return window.app.getCurrentUser();
            }

            return null;
        } catch (error) {
            console.warn('CommonUtils: Ошибка получения текущего пользователя:', error);
            return null;
        }
    }

    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     */
    static getCurrentUserId() {
        const user = this.getCurrentUser();
        return user?.id || user?.userId || null;
    }

    /**
     * Получение имени текущего пользователя
     * @returns {string|null} Имя пользователя
     */
    static getCurrentUsername() {
        const user = this.getCurrentUser();
        return user?.username || user?.name || null;
    }

    /**
     * Проверка, является ли пользователь активным игроком
     * @param {Object} activePlayer - Активный игрок
     * @returns {boolean} true, если это ход текущего пользователя
     */
    static isMyTurn(activePlayer) {
        if (!activePlayer) return false;
        
        const currentUserId = this.getCurrentUserId();
        const currentUsername = this.getCurrentUsername();
        
        return currentUserId && (
            activePlayer.id === currentUserId ||
            activePlayer.userId === currentUserId ||
            (activePlayer.username && currentUsername && activePlayer.username === currentUsername)
        );
    }

    /**
     * Безопасное логирование с информацией о контексте
     * @param {string} level - Уровень логирования (log, warn, error)
     * @param {string} message - Сообщение
     * @param {*} data - Данные
     * @param {string} context - Контекст (имя модуля)
     */
    static log(level, message, data = null, context = '') {
        const contextStr = context ? `[${context}] ` : '';
        const fullMessage = contextStr + message;
        
        if (window.logWithStack) {
            window.logWithStack(fullMessage, data, level);
        } else {
            console[level](fullMessage, data || '');
        }
    }

    /**
     * Дебаунс функция для оптимизации производительности
     * @param {Function} func - Функция для выполнения
     * @param {number} delay - Задержка в миллисекундах
     * @returns {Function} Дебаунсированная функция
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Троттлинг функция для ограничения частоты вызовов
     * @param {Function} func - Функция для выполнения
     * @param {number} limit - Лимит вызовов в миллисекундах
     * @returns {Function} Троттлированная функция
     */
    static throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Проверка валидности данных
     * @param {*} data - Данные для проверки
     * @param {string} expectedType - Ожидаемый тип
     * @returns {boolean} true, если данные валидны
     */
    static isValidData(data, expectedType = 'object') {
        if (expectedType === 'object') {
            return data && typeof data === 'object' && !Array.isArray(data);
        }
        if (expectedType === 'array') {
            return Array.isArray(data);
        }
        return data != null && typeof data === expectedType;
    }

    /**
     * Получение значения с fallback
     * @param {*} value - Основное значение
     * @param {*} fallback - Резервное значение
     * @returns {*} Значение или fallback
     */
    static getValueOrDefault(value, fallback) {
        return value != null ? value : fallback;
    }

    /**
     * Очистка HTML для безопасности
     * @param {string} html - HTML строка
     * @returns {string} Очищенная HTML строка
     */
    static sanitizeHtml(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.CommonUtils = CommonUtils;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommonUtils;
}

