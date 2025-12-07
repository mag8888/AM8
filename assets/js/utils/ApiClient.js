/**
 * Централизованный API клиент
 * Унифицированные методы для работы с API
 */

class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        this.defaultTimeout = 10000; // 10 секунд по умолчанию
        this.activeRequests = new Map(); // Для дедупликации запросов
    }

    /**
     * Получение заголовков с авторизацией
     * @returns {Object} - Заголовки запроса
     */
    getHeaders() {
        const headers = { ...this.defaultHeaders };
        
        // Добавляем токен авторизации если есть
        const token = localStorage.getItem('aura_money_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    /**
     * Универсальный метод для HTTP запросов
     * @param {string} url - URL запроса
     * @param {Object} options - Опции запроса
     * @param {number} options.timeoutMs - Таймаут запроса в миллисекундах (по умолчанию 10s)
     * @param {boolean} options.deduplicate - Дедупликация запросов по URL (по умолчанию false)
     * @param {AbortSignal} options.signal - Внешний AbortSignal для отмены
     * @returns {Promise<Object>} - Результат запроса
     */
    async request(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
        const timeoutMs = options.timeoutMs || this.defaultTimeout;
        const deduplicate = options.deduplicate !== false; // По умолчанию true для GET
        const method = options.method || 'GET';
        
        // ИСПРАВЛЕНО: Дедупликация запросов - если уже есть активный запрос с таким URL, возвращаем его Promise
        if (deduplicate && method === 'GET' && this.activeRequests.has(fullUrl)) {
            console.log(`🔄 ApiClient: Дедупликация запроса ${fullUrl}`);
            return this.activeRequests.get(fullUrl);
        }
        
        // Создаем AbortController для таймаута и отмены
        const abortController = options.signal ? null : new AbortController();
        const signal = options.signal || abortController.signal;
        
        // Таймаут для запроса
        const timeoutId = setTimeout(() => {
            if (abortController) {
                abortController.abort();
            }
        }, timeoutMs);
        
        const config = {
            headers: this.getHeaders(),
            signal: signal,
            keepalive: true, // ИСПРАВЛЕНО: Добавлен keepalive для стабильности
            ...options
        };
        
        // Удаляем timeoutMs из config, чтобы не передавать его в fetch
        delete config.timeoutMs;
        delete config.deduplicate;

        // Создаем Promise для запроса
        const requestPromise = (async () => {
            try {
                console.log(`🌐 ApiClient: ${method} ${fullUrl}`);
                
                const response = await fetch(fullUrl, config);
                
                clearTimeout(timeoutId);
                
                // ИСПРАВЛЕНО: Нормализованная обработка ошибок
                if (!response.ok) {
                    const errorText = await response.text().catch(() => response.statusText);
                    const error = new Error(`HTTP ${response.status}: ${errorText}`);
                    error.status = response.status;
                    error.statusText = response.statusText;
                    error.url = fullUrl;
                    throw error;
                }
                
                // Пытаемся распарсить JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return await response.text();
                }
                
            } catch (error) {
                clearTimeout(timeoutId);
                
                // ИСПРАВЛЕНО: Нормализованная обработка ошибок
                if (error.name === 'AbortError') {
                    const timeoutError = new Error(`Request timeout after ${timeoutMs}ms: ${fullUrl}`);
                    timeoutError.status = 408;
                    timeoutError.statusText = 'Request Timeout';
                    timeoutError.url = fullUrl;
                    timeoutError.isTimeout = true;
                    throw timeoutError;
                }
                
                // Сохраняем статус если есть
                if (!error.status && error.message) {
                    error.status = 0;
                    error.statusText = error.message;
                    error.url = fullUrl;
                }
                
                console.error(`❌ ApiClient: Ошибка запроса ${fullUrl}:`, error);
                throw error;
            } finally {
                // Удаляем из активных запросов после завершения
                if (deduplicate && method === 'GET') {
                    this.activeRequests.delete(fullUrl);
                }
            }
        })();
        
        // Сохраняем Promise для дедупликации
        if (deduplicate && method === 'GET') {
            this.activeRequests.set(fullUrl, requestPromise);
        }
        
        return requestPromise;
    }

    /**
     * GET запрос
     * @param {string} url - URL запроса
     * @param {Object} params - Параметры запроса
     * @returns {Promise<Object>} - Результат запроса
     */
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        return this.request(fullUrl, { method: 'GET' });
    }

    /**
     * POST запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @returns {Promise<Object>} - Результат запроса
     */
    async post(url, data = {}, options = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    /**
     * PUT запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @returns {Promise<Object>} - Результат запроса
     */
    async put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE запрос
     * @param {string} url - URL запроса
     * @returns {Promise<Object>} - Результат запроса
     */
    async delete(url) {
        return this.request(url, { method: 'DELETE' });
    }

    /**
     * Запрос с повторными попытками и экспоненциальным backoff с джиттером
     * @param {string} url - URL запроса
     * @param {Object} options - Опции запроса
     * @param {number} maxRetries - Максимальное количество попыток (по умолчанию 3)
     * @param {number} initialDelay - Начальная задержка между попытками (мс, по умолчанию 1000)
     * @returns {Promise<Object>} - Результат запроса
     */
    async requestWithRetry(url, options = {}, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        let delay = initialDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(url, options);
            } catch (error) {
                lastError = error;
                
                // Не повторяем для некоторых ошибок (4xx кроме 429, таймауты после всех попыток)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw error;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // ИСПРАВЛЕНО: Экспоненциальный backoff с джиттером
                const jitter = Math.random() * 0.3 * delay; // 0-30% джиттер
                const backoffDelay = delay + jitter;
                
                console.warn(`⚠️ ApiClient: Попытка ${attempt}/${maxRetries} неудачна, повтор через ${Math.round(backoffDelay)}мс:`, error.message);
                
                // Используем CommonUtils.delay если доступен, иначе setTimeout
                if (window.CommonUtils && typeof window.CommonUtils.delay === 'function') {
                    await window.CommonUtils.delay(backoffDelay);
                } else {
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                }
                
                delay *= 2; // Экспоненциальная задержка
            }
        }
        
        throw lastError;
    }
    
    /**
     * Отмена всех активных запросов
     */
    cancelAllRequests() {
        this.activeRequests.clear();
    }
    
    /**
     * Отмена запроса по URL
     * @param {string} url - URL запроса для отмены
     */
    cancelRequest(url) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
        this.activeRequests.delete(fullUrl);
    }
}

// Создаем глобальный экземпляр API клиента
window.apiClient = new ApiClient();

console.log('✅ ApiClient v2.0 загружен (ApiClient.js v2)');
