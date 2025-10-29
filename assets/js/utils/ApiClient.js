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
     * @returns {Promise<Object>} - Результат запроса
     */
    async request(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
        
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            console.log(`🌐 ApiClient: ${config.method || 'GET'} ${fullUrl}`);
            
            const response = await fetch(fullUrl, config);
            
            // Проверяем статус ответа
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Пытаемся распарсить JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
            
        } catch (error) {
            console.error(`❌ ApiClient: Ошибка запроса ${fullUrl}:`, error);
            throw error;
        }
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
    async post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
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
     * Запрос с повторными попытками
     * @param {string} url - URL запроса
     * @param {Object} options - Опции запроса
     * @param {number} maxRetries - Максимальное количество попыток
     * @param {number} delay - Задержка между попытками (мс)
     * @returns {Promise<Object>} - Результат запроса
     */
    async requestWithRetry(url, options = {}, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(url, options);
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                console.warn(`⚠️ ApiClient: Попытка ${attempt} неудачна, повтор через ${delay}мс:`, error.message);
                await CommonUtils.delay(delay);
                delay *= 2; // Экспоненциальная задержка
            }
        }
        
        throw lastError;
    }
}

// Создаем глобальный экземпляр API клиента
window.apiClient = new ApiClient();

console.log('✅ ApiClient загружен');
