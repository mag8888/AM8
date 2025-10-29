/**
 * Общие утилиты для всего приложения
 * Централизованные функции для избежания дублирования кода
 */

class CommonUtils {
    /**
     * Форматирование валюты
     * @param {number} amount - Сумма для форматирования
     * @param {string} currency - Валюта (по умолчанию '$')
     * @returns {string} - Отформатированная строка
     */
    static formatCurrency(amount, currency = '$') {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return `${currency}0`;
        }
        
        // Форматируем с разделителями тысяч
        const formatted = amount.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        
        return `${currency}${formatted}`;
    }

    /**
     * Форматирование чисел
     * @param {number} num - Число для форматирования
     * @returns {string} - Отформатированная строка
     */
    static formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) {
            return '0';
        }
        
        return num.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    /**
     * Безопасная работа с localStorage
     */
    static storage = {
        /**
         * Сохранение данных в localStorage
         * @param {string} key - Ключ
         * @param {any} data - Данные для сохранения
         * @returns {boolean} - Успех операции
         */
        set(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.warn('⚠️ CommonUtils: Ошибка сохранения в localStorage:', error);
                return false;
            }
        },

        /**
         * Загрузка данных из localStorage
         * @param {string} key - Ключ
         * @param {any} defaultValue - Значение по умолчанию
         * @returns {any} - Загруженные данные или значение по умолчанию
         */
        get(key, defaultValue = null) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : defaultValue;
            } catch (error) {
                console.warn('⚠️ CommonUtils: Ошибка загрузки из localStorage:', error);
                return defaultValue;
            }
        },

        /**
         * Удаление данных из localStorage
         * @param {string} key - Ключ
         * @returns {boolean} - Успех операции
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('⚠️ CommonUtils: Ошибка удаления из localStorage:', error);
                return false;
            }
        }
    };

    /**
     * Безопасная работа с sessionStorage
     */
    static sessionStorage = {
        /**
         * Сохранение данных в sessionStorage
         * @param {string} key - Ключ
         * @param {any} data - Данные для сохранения
         * @returns {boolean} - Успех операции
         */
        set(key, data) {
            try {
                sessionStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.warn('⚠️ CommonUtils: Ошибка сохранения в sessionStorage:', error);
                return false;
            }
        },

        /**
         * Загрузка данных из sessionStorage
         * @param {string} key - Ключ
         * @param {any} defaultValue - Значение по умолчанию
         * @returns {any} - Загруженные данные или значение по умолчанию
         */
        get(key, defaultValue = null) {
            try {
                const raw = sessionStorage.getItem(key);
                return raw ? JSON.parse(raw) : defaultValue;
            } catch (error) {
                console.warn('⚠️ CommonUtils: Ошибка загрузки из sessionStorage:', error);
                return defaultValue;
            }
        },

        /**
         * Удаление данных из sessionStorage
         * @param {string} key - Ключ
         * @returns {boolean} - Успех операции
         */
        remove(key) {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('⚠️ CommonUtils: Ошибка удаления из sessionStorage:', error);
                return false;
            }
        }
    };

    /**
     * Универсальная функция задержки
     * @param {number} ms - Миллисекунды
     * @returns {Promise} - Promise с задержкой
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Генерация уникального ID
     * @returns {string} - Уникальный ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Проверка на пустое значение
     * @param {any} value - Значение для проверки
     * @returns {boolean} - true если значение пустое
     */
    static isEmpty(value) {
        return value === null || value === undefined || value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
    }

    /**
     * Глубокое копирование объекта
     * @param {any} obj - Объект для копирования
     * @returns {any} - Копия объекта
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
}

// Экспортируем в глобальную область видимости
window.CommonUtils = CommonUtils;

console.log('✅ CommonUtils загружены');