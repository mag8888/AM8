/**
 * Общие утилиты для всего приложения
 * Централизованные функции для избежания дублирования кода
 */

class CommonUtils {
    /**
     * Безопасный querySelector с защитой от ошибок
     * @param {string} selector
     * @param {ParentNode} root
     * @param {any} fallback
     * @returns {Element|null}
     */
    static safeQuerySelector(selector, root = document, fallback = null) {
        try {
            if (!selector || !root || typeof root.querySelector !== 'function') {
                return fallback;
            }
            const el = root.querySelector(selector);
            return el || fallback;
        } catch (_) {
            return fallback;
        }
    }
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

    /**
     * Получение ID текущего пользователя
     * @returns {string|null} - ID пользователя или null
     */
    static getCurrentUserId() {
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                if (bundle.userId) {
                    return bundle.userId;
                }
            }
            
            // Пытаемся получить из localStorage
            const userRaw = localStorage.getItem('currentUser');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                if (user.id || user.userId) {
                    return user.id || user.userId;
                }
            }
            
            // Fallback на старый формат
            const oldUserRaw = localStorage.getItem('aura_money_user');
            if (oldUserRaw) {
                const oldUser = JSON.parse(oldUserRaw);
                if (oldUser.id || oldUser.userId) {
                    return oldUser.id || oldUser.userId;
                }
            }
        } catch (error) {
            console.warn('⚠️ CommonUtils: Ошибка получения userId:', error);
        }
        
        return null;
    }

    /**
     * Проверка возможности выполнения запроса game-state (rate limiting)
     * @param {string} roomId - ID комнаты
     * @returns {boolean} - true если запрос разрешен
     */
    static canMakeGameStateRequest(roomId) {
        if (!roomId) return false;
        
        try {
            // Проверяем глобальный rate limiter для game-state
            const limiterKey = `game_state_limiter_${roomId}`;
            const limiterData = this.storage.get(limiterKey, { lastRequest: 0, pending: false });
            
            const now = Date.now();
            const minInterval = 2000; // Минимум 2 секунды между запросами
            
            // Если запрос уже в процессе, блокируем
            if (limiterData.pending) {
                return false;
            }
            
            // Если прошло достаточно времени с последнего запроса, разрешаем
            if (now - limiterData.lastRequest >= minInterval) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('⚠️ CommonUtils: Ошибка проверки rate limit:', error);
            return true; // В случае ошибки разрешаем запрос
        }
    }
}

// Экспортируем в глобальную область видимости
window.CommonUtils = CommonUtils;

console.log('✅ CommonUtils загружены');