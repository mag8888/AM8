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

    /**
     * Глобальный rate limiter для API запросов
     * Предотвращает 429 ошибки от слишком частых запросов
     */
    static rateLimiter = {
        _lastRequestTime: 0,
        _minInterval: 2000, // Минимальный интервал 2 секунды
        
        canMakeRequest() {
            const now = Date.now();
            if (now - this._lastRequestTime >= this._minInterval) {
                this._lastRequestTime = now;
                return true;
            }
            return false;
        },
        
        setInterval(ms) {
            this._minInterval = ms;
        }
    };

    /**
     * Проверка возможности сделать API запрос без превышения rate limit
     * @param {number} minInterval - Минимальный интервал в миллисекундах
     * @returns {boolean} true если можно делать запрос
     */
    static canMakeApiRequest(minInterval = 2000) {
        return this.rateLimiter.canMakeRequest();
    }

    /**
     * Специальный rate limiter для game-state endpoint
     * Предотвращает множественные одновременные запросы к game-state
     */
    static gameStateLimiter = {
        _lastRequestTime: 0,
        _minInterval: 5000, // Увеличено до 5 секунд для предотвращения rate limiting
        _pendingRequests: new Map(),
        
        canMakeRequest(roomId = 'default') {
            const now = Date.now();
            const key = `gamestate_${roomId}`;
            
            // Проверяем, не выполняется ли уже запрос для этой комнаты
            if (this._pendingRequests.has(key)) {
                const pendingTime = this._pendingRequests.get(key);
                const elapsedSincePending = now - pendingTime;
                // Если запрос висит больше 30 секунд, считаем его "зависшим" и очищаем
                if (elapsedSincePending > 30000) {
                    console.log(`⚠️ GameStateLimiter: Очищаем зависший запрос для комнаты ${roomId} (${elapsedSincePending}ms)`);
                    this._pendingRequests.delete(key);
                } else {
                    console.log(`⏳ GameStateLimiter: Запрос уже выполняется для комнаты ${roomId} (${elapsedSincePending}ms)`);
                    return false;
                }
            }
            
            // Проверяем временной интервал
            if (now - this._lastRequestTime < this._minInterval) {
                console.log(`⏳ GameStateLimiter: Слишком рано для запроса к game-state (${now - this._lastRequestTime}ms < ${this._minInterval}ms)`);
                return false;
            }
            
            return true;
        },
        
        setRequestPending(roomId = 'default') {
            const now = Date.now();
            const key = `gamestate_${roomId}`;
            
            // Атомарная проверка и установка pending флага
            if (this._pendingRequests.has(key)) {
                const pendingTime = this._pendingRequests.get(key);
                const elapsedSincePending = now - pendingTime;
                // Если запрос висит больше 5 секунд, перезаписываем его
                if (elapsedSincePending > 5000) {
                    console.log(`⚠️ GameStateLimiter: Перезаписываем зависший запрос для комнаты ${roomId} (${elapsedSincePending}ms)`);
                } else if (elapsedSincePending < 2000) {
                    // Очень быстрые повторные запросы блокируем (увеличено до 2 секунд)
                    console.log(`⏳ GameStateLimiter: Слишком частые запросы для комнаты ${roomId} (${elapsedSincePending}ms)`);
                    return false;
                } else {
                    // Для запросов 1-5 секунд даем больше информации, но не блокируем так строго
                    console.log(`⏳ GameStateLimiter: Запрос активен для комнаты ${roomId} (${elapsedSincePending}ms), разрешаем повтор`);
                }
            }
            
            // Устанавливаем pending и время одновременно для атомарности
            this._pendingRequests.set(key, now);
            this._lastRequestTime = now;
            return true;
        },
        
        clearRequestPending(roomId = 'default') {
            const key = `gamestate_${roomId}`;
            const wasPending = this._pendingRequests.has(key);
            this._pendingRequests.delete(key);
            if (wasPending) {
                console.log(`✅ GameStateLimiter: Очищен pending запрос для комнаты ${roomId}`);
            }
        },
        
        setInterval(ms) {
            this._minInterval = ms;
        },
        
        // Метод для очистки всех зависших запросов
        clearStaleRequests() {
            const now = Date.now();
            const staleKeys = [];
            
            for (const [key, timestamp] of this._pendingRequests.entries()) {
                if (now - timestamp > 30000) {
                    staleKeys.push(key);
                }
            }
            
            staleKeys.forEach(key => {
                console.log(`🧹 GameStateLimiter: Очищен зависший запрос ${key}`);
                this._pendingRequests.delete(key);
            });
            
            return staleKeys.length;
        }
    };

    /**
     * Проверка возможности сделать запрос к game-state endpoint
     * @param {string} roomId - ID комнаты для уникального ключа
     * @returns {boolean} true если можно делать запрос
     */
    static canMakeGameStateRequest(roomId = 'default') {
        return this.gameStateLimiter.canMakeRequest(roomId);
    }

    /**
     * Глобальный rate limiter для всех RoomService API запросов
     * Предотвращает множественные одновременные запросы к /api/rooms и /api/stats
     */
    static roomServiceLimiter = {
        _lastRoomsRequest: 0,
        _lastStatsRequest: 0,
        _minInterval: 20000, // Минимальный интервал 20 секунд для RoomService запросов
        _pendingRequests: new Map(),
        
        canMakeRoomsRequest() {
            const now = Date.now();
            const key = 'rooms_request';
            
            // Проверяем, не выполняется ли уже запрос
            if (this._pendingRequests.has(key)) {
                console.log('⏳ RoomServiceLimiter: Запрос к rooms уже выполняется');
                return false;
            }
            
            // Проверяем временной интервал
            if (now - this._lastRoomsRequest < this._minInterval) {
                console.log(`⏳ RoomServiceLimiter: Слишком рано для запроса к rooms (${now - this._lastRoomsRequest}ms < ${this._minInterval}ms)`);
                return false;
            }
            
            // Если все проверки прошли, НЕ устанавливаем время здесь - это будет сделано в setRequestPending
            return true;
        },
        
        canMakeStatsRequest() {
            const now = Date.now();
            const key = 'stats_request';
            
            // Проверяем, не выполняется ли уже запрос
            if (this._pendingRequests.has(key)) {
                console.log('⏳ RoomServiceLimiter: Запрос к stats уже выполняется');
                return false;
            }
            
            // Проверяем временной интервал
            if (now - this._lastStatsRequest < this._minInterval) {
                console.log(`⏳ RoomServiceLimiter: Слишком рано для запроса к stats (${now - this._lastStatsRequest}ms < ${this._minInterval}ms)`);
                return false;
            }
            
            // Если все проверки прошли, НЕ устанавливаем время здесь - это будет сделано в setRequestPending
            return true;
        },
        
        setRequestPending(type) {
            const key = `${type}_request`;
            const now = Date.now();
            this._pendingRequests.set(key, now);
            
            // Устанавливаем время последнего запроса для данного типа
            if (type === 'rooms') {
                this._lastRoomsRequest = now;
            } else if (type === 'stats') {
                this._lastStatsRequest = now;
            }
        },
        
        clearRequestPending(type) {
            const key = `${type}_request`;
            this._pendingRequests.delete(key);
        }
    };

    /**
     * Проверка возможности сделать запрос к rooms endpoint
     * @returns {boolean} true если можно делать запрос
     */
    static canMakeRoomsRequest() {
        return this.roomServiceLimiter.canMakeRoomsRequest();
    }

    /**
     * Проверка возможности сделать запрос к stats endpoint
     * @returns {boolean} true если можно делать запрос
     */
    static canMakeStatsRequest() {
        return this.roomServiceLimiter.canMakeStatsRequest();
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.CommonUtils = CommonUtils;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommonUtils;
}

