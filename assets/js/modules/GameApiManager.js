/**
 * GameApiManager - специальный менеджер для игровых API запросов
 * Оптимизирован для игровых действий с минимальными задержками
 */

class GameApiManager {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.rateLimitUntil = 0;
        this.minRequestInterval = 500; // 500мс для игровых действий
        this.backoffMultiplier = 1.05; // Минимальный рост backoff
        this.currentBackoff = 0;
        this.maxBackoff = 2000; // Максимум 2 секунды
    }

    /**
     * Выполнить игровой запрос с оптимизированным rate limiting
     */
    async request(url, options = {}) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        
        // Проверяем кэш
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 1000) { // 1 секунда кэш для игровых действий
                console.log('🎮 GameApiManager: Используем кэш для', url);
                return cached.data;
            }
        }

        // Проверяем rate limiting
        if (this.rateLimitUntil > Date.now()) {
            const waitTime = this.rateLimitUntil - Date.now();
            console.log(`⏳ GameApiManager: Rate limited, ждем ${waitTime}мс`);
            await this._wait(waitTime);
        }

        // Проверяем минимальный интервал
        const now = Date.now();
        const timeSinceLastRequest = now - (this.lastRequestTime || 0);
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await this._wait(waitTime);
        }

        // Проверяем pending запросы
        if (this.pendingRequests.has(cacheKey)) {
            console.log('🎮 GameApiManager: Ждем pending запрос для', url);
            return this.pendingRequests.get(cacheKey);
        }

        // Создаем promise для pending запроса
        const requestPromise = this._executeRequest(url, options, cacheKey);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
            this.lastRequestTime = Date.now();
        }
    }

    /**
     * Выполнить игровой запрос
     */
    async _executeRequest(url, options, cacheKey) {
        try {
            console.log(`🎮 GameApiManager: Выполняем запрос ${url}`);
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (response.status === 429) {
                const retryAfter = this._applyRateLimitFromResponse(response);
                const error = new Error(`HTTP 429: Rate limited`);
                error.isRateLimit = true;
                error.retryAfter = retryAfter;
                throw error;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Сохраняем в кэш
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            // Сбрасываем backoff при успешном запросе
            this._resetBackoff();

            return data;

        } catch (error) {
            if (error.isRateLimit) {
                this._increaseBackoff(error.retryAfter);
                throw error;
            }
            
            // Для других ошибок используем минимальный backoff
            this._increaseBackoff(1000);
            throw error;
        }
    }

    /**
     * Применить rate limiting из ответа сервера
     */
    _applyRateLimitFromResponse(response) {
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
            const seconds = parseInt(retryAfter);
            return seconds * 1000; // конвертируем в миллисекунды
        }
        return 1000; // по умолчанию 1 секунда
    }

    /**
     * Увеличить backoff
     */
    _increaseBackoff(preferredMs = 0) {
        const maxServerWait = 2000; // Максимум 2 секунды для игровых действий
        const minServerWait = 500; // Минимум 500мс

        if (preferredMs > 0) {
            this.rateLimitUntil = Date.now() + Math.min(preferredMs, maxServerWait);
        }

        if (this.currentBackoff === 0) {
            this.currentBackoff = minServerWait;
        } else {
            this.currentBackoff = Math.min(
                this.currentBackoff * this.backoffMultiplier,
                this.maxBackoff
            );
        }
    }

    /**
     * Сбросить backoff
     */
    _resetBackoff() {
        this.currentBackoff = 0;
        this.rateLimitUntil = 0;
    }

    /**
     * Ожидание
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Очистить кэш
     */
    clearCache() {
        this.cache.clear();
        console.log('🎮 GameApiManager: Кэш очищен');
    }
}

// Создаем глобальный экземпляр для игровых действий
window.GameApiManager = new GameApiManager();

console.log('✅ GameApiManager: Инициализирован для игровых действий');
