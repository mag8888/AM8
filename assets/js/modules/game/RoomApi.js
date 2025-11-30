/**
 * RoomApi v1.0.0
 * API клиент для взаимодействия с игровыми комнатами
 */

class RoomApi {
    constructor() {
        // Используем ApiUrlHelper для определения правильного API URL
        const apiBaseUrl = window.ApiUrlHelper?.getApiBaseUrl() || 
                          (window.config?.get('api.baseUrl') || 'https://am8-production.up.railway.app/api');
        this.baseUrl = `${apiBaseUrl}/rooms`;
        
        this.headers = {
            'Content-Type': 'application/json'
        };
        
        // Защита от множественных одновременных запросов
        this.pendingRequests = new Map();

        // Глобальный контроль частоты запросов к API комнаты
        this.minInterval = 150; // минимальная пауза между запросами
        this.lastRequestAt = 0;
        this.rateLimitUntil = 0;
        this.rateLimitBackoff = 0;

        console.log('🌐 RoomApi: Инициализирован');
    }
    
    /**
     * Получение заголовков с авторизацией
     */
    getHeaders() {
        const token =
            localStorage.getItem('aura_money_token') ||
            sessionStorage.getItem('aura_money_token');

        let userId = null;
        try {
            const storedUser =
                localStorage.getItem('aura_money_user') ||
                sessionStorage.getItem('aura_money_user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                userId = parsed?.id || parsed?.userId || null;
            }
        } catch (error) {
            console.warn('RoomApi: Не удалось получить пользователя из storage', error);
        }

        const headers = {
            ...this.headers
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        if (userId) {
            headers['x-user-id'] = userId;
        }

        return headers;
    }
    
    /**
     * Выполнение HTTP запроса
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            await this._respectRateLimitWindow();

            const response = await fetch(url, config);

            if (response.status === 429) {
                const retryAfter = this._applyRateLimitFromResponse(response);
                const error = new Error(`HTTP 429: ${response.statusText || 'Rate limited'}`);
                error.isRateLimit = true;
                error.retryAfter = retryAfter;
                throw error;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this._resetRateLimit();

            const data = await response.json();
            return data;
        } catch (error) {
            if (error.isRateLimit) {
                console.warn(`⏳ RoomApi: Получен HTTP 429, повторная попытка через ${error.retryAfter}мс`);
            } else {
                console.error(`❌ RoomApi: Ошибка запроса ${endpoint}:`, error);
            }
            throw error;
        }
    }
    
    /**
     * Завершение хода
     * @param {string} roomId - ID комнаты
     * @returns {Promise<Object>} Результат завершения хода
     */
    async endTurn(roomId) {
        const endpoint = `/${roomId}/end-turn`;
        
        console.log(`🏁 RoomApi: Завершение хода в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'POST'
        });
    }
    
    /**
     * Получение состояния игры
     * @param {string} roomId - ID комнаты
     * @returns {Promise<Object>} Состояние игры
     */
    async getGameState(roomId) {
        const endpoint = `/${roomId}/game-state`;
        
        // Проверяем кэш
        const cacheKey = `gameState_${roomId}`;
        const now = Date.now();
        const cached = this.cache?.get(cacheKey);
        
        if (cached && (now - cached.timestamp) < 10000) { // Кэш на 10 секунд для снижения нагрузки
            console.log(`📊 RoomApi: Используем кэшированное состояние игры для ${roomId}`);
            return cached.data;
        }
        
        // Проверяем глобальный rate limiter для game-state
        if (window.CommonUtils && !window.CommonUtils.canMakeGameStateRequest(roomId)) {
            console.log(`📊 RoomApi: Пропускаем запрос к game-state из-за глобального rate limiting для ${roomId}`);
            // Возвращаем кэшированные данные если они есть
            if (cached) {
                return cached.data;
            }
            throw new Error('Rate limited');
        }
        
        // Защита от множественных одновременных запросов
        const pendingKey = `getGameState_${roomId}`;
        if (this.pendingRequests.has(pendingKey)) {
            console.log(`📊 RoomApi: Запрос уже выполняется для ${roomId}, ждем результат`);
            return await this.pendingRequests.get(pendingKey);
        }
        
        console.log(`📊 RoomApi: Получение состояния игры в комнате ${roomId}`);
        
        // Устанавливаем флаг pending в глобальном limiter
        if (window.CommonUtils && !window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
            console.log(`📊 RoomApi: Не удалось установить pending для ${roomId} (race condition)`);
            // Возвращаем кэшированные данные если они есть
            if (cached) {
                return cached.data;
            }
            throw new Error('Rate limited by race condition');
        }
        
        const requestPromise = this._executeGameStateRequest(endpoint, cacheKey, cached, now);
        this.pendingRequests.set(pendingKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(pendingKey);
            // Очищаем флаг pending в глобальном limiter
            if (window.CommonUtils) {
                window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
            }
        }
    }
    
    /**
     * Выполнение запроса состояния игры (выделен для переиспользования)
     */
    async _executeGameStateRequest(endpoint, cacheKey, cached, now) {
        try {
            // Специальный запрос для game-state без внутреннего rate limiting
            // так как глобальный limiter уже проверил и дал разрешение
            const url = `${this.baseUrl}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                method: 'GET'
            };

            const response = await fetch(url, config);

            if (response.status === 429) {
                const retryAfter = this._applyRateLimitFromResponse(response);
                const error = new Error(`HTTP 429: ${response.statusText || 'Rate limited'}`);
                error.isRateLimit = true;
                error.retryAfter = retryAfter;
                throw error;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this._resetRateLimit();
            const result = await response.json();
            
            // Сохраняем в кэш
            if (!this.cache) {
                this.cache = new Map();
            }
            this.cache.set(cacheKey, {
                data: result,
                timestamp: now
            });
            
            return result;
        } catch (error) {
            // При rate-limit возвращаем кэшированные данные, если есть
            if (error.isRateLimit && cached) {
                console.log(`📊 RoomApi: HTTP 429, используем кэшированные данные`);
                return cached.data;
            }
            throw error;
        }
    }

    /**
     * Учитываем временное окно rate limit
     * @private
     */
    async _respectRateLimitWindow() {
        const now = Date.now();

        const nextAllowedByInterval = this.lastRequestAt + this.minInterval;
        const nextAllowed = Math.max(nextAllowedByInterval, this.rateLimitUntil || 0);

        if (now < nextAllowed) {
            const waitTime = nextAllowed - now;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestAt = Date.now();
    }

    /**
     * Применяем данные rate limit из ответа сервера
     * @private
     */
    _applyRateLimitFromResponse(response) {
        const retryAfterHeader = response.headers?.get?.('Retry-After') || response.headers?.get?.('retry-after');
        let retryAfterMs = 0;

        if (retryAfterHeader) {
            const retrySeconds = Number(retryAfterHeader);
            if (!Number.isNaN(retrySeconds)) {
                retryAfterMs = retrySeconds * 1000;
            }
        }

        if (!retryAfterMs) {
            this.rateLimitBackoff = this.rateLimitBackoff ? Math.min(this.rateLimitBackoff * 2, 60000) : 5000;
            retryAfterMs = this.rateLimitBackoff;
        } else {
            this.rateLimitBackoff = retryAfterMs;
        }

        this.rateLimitUntil = Date.now() + retryAfterMs;
        return retryAfterMs;
    }

    /**
     * Сбрасываем состояние rate limit после успешного запроса
     * @private
     */
    _resetRateLimit() {
        this.rateLimitBackoff = 0;
        this.rateLimitUntil = 0;
    }
    
    /**
     * Получение списка игроков
     * @param {string} roomId - ID комнаты
     * @returns {Promise<Array>} Список игроков
     */
    async getPlayers(roomId) {
        const endpoint = `/${roomId}/players`;
        
        console.log(`👥 RoomApi: Получение списка игроков в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'GET'
        });
    }
    
    /**
     * Обновление позиции игрока
     * @param {string} roomId - ID комнаты
     * @param {string} playerId - ID игрока
     * @param {number} position - Новая позиция
     * @returns {Promise<Object>} Результат обновления
     */
    async updatePlayerPosition(roomId, playerId, position) {
        const endpoint = `/${roomId}/players/${playerId}/position`;
        const body = {
            position
        };
        
        console.log(`📍 RoomApi: Обновление позиции игрока ${playerId} на ${position}`);
        
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * Установка активного игрока
     * @param {string} roomId - ID комнаты
     * @param {string} playerId - ID игрока
     * @returns {Promise<Object>} Результат установки
     */
    async setActivePlayer(roomId, playerId) {
        const endpoint = `/${roomId}/active-player`;
        const body = {
            playerId
        };
        
        console.log(`🎯 RoomApi: Установка активного игрока ${playerId}`);
        
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * Получение истории ходов
     * @param {string} roomId - ID комнаты
     * @returns {Promise<Array>} История ходов
     */
    async getTurnHistory(roomId) {
        const endpoint = `/${roomId}/turn-history`;
        
        console.log(`📜 RoomApi: Получение истории ходов в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'GET'
        });
    }
    
    /**
     * Отправка сообщения в чат
     * @param {string} roomId - ID комнаты
     * @param {string} message - Сообщение
     * @returns {Promise<Object>} Результат отправки
     */
    async sendMessage(roomId, message) {
        const endpoint = `/${roomId}/chat`;
        const body = {
            message
        };
        
        console.log(`💬 RoomApi: Отправка сообщения в комнату ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * Получение сообщений чата
     * @param {string} roomId - ID комнаты
     * @returns {Promise<Array>} Сообщения чата
     */
    async getMessages(roomId) {
        const endpoint = `/${roomId}/chat`;
        
        console.log(`💬 RoomApi: Получение сообщений чата в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'GET'
        });
    }
    
    /**
     * Бросок кубика
     * @param {string} roomId - ID комнаты
     * @param {string} [diceChoice] - 'single' | 'double'
     * @param {boolean} [isReroll] - повторный бросок
     * @returns {Promise<Object>} Результат броска
     */
    async rollDice(roomId, diceChoice, isReroll) {
        const endpoint = `/${roomId}/roll`;
        
        console.log(`🎲 RoomApi: Бросок кубика в комнате ${roomId}`, { diceChoice, isReroll });
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify({ diceChoice, isReroll })
        });
    }
    
    /**
     * Движение фишки (совместимо с TurnService.move)
     * @param {string} roomId - ID комнаты
     * @param {number} steps - Количество шагов
     * @param {Object} options - Дополнительные параметры
     * @param {boolean} [options.isInner] - Признак внутреннего круга
     * @param {string} [options.track] - Идентификатор трека
     * @returns {Promise<Object>} Результат движения
     */
    async move(roomId, steps, options = {}) {
        const endpoint = `/${roomId}/move`;
        
        const payload = { steps };
        if (typeof options.isInner === 'boolean') {
            payload.isInner = options.isInner;
        }
        if (options.track) {
            payload.track = options.track;
        }
        
        console.log(`🚶 RoomApi: Движение фишки в комнате ${roomId} на ${steps} шагов`, payload);
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // Обратная совместимость (если где-то вызывается movePlayer)
    async movePlayer(roomId, steps) {
        return this.move(roomId, steps);
    }

    /**
     * Отправка push-уведомления для комнаты
     * @param {string} roomId
     * @param {Object} notification
     * @returns {Promise<Object>}
     */
    async sendNotification(roomId, notification) {
        if (!roomId || !notification) {
            throw new Error('RoomApi.sendNotification: invalid parameters');
        }

        const endpoint = `/${roomId}/notifications`;
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(notification)
        });
    }

    /**
     * Алиас для getGameState для обратной совместимости
     * @param {string} roomId
     * @returns {Promise<Object>}
     */
    async getRoomState(roomId) {
        return this.getGameState(roomId);
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.RoomApi = RoomApi;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomApi;
}
