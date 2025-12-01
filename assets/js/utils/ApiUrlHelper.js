/**
 * ApiUrlHelper - Утилита для определения правильного API URL
 * Автоматически определяет URL в зависимости от окружения
 */

class ApiUrlHelper {
    /**
     * Получить базовый URL API
     * @returns {string}
     */
    static getApiBaseUrl() {
        // Проверяем, есть ли конфигурация
        if (window.config && typeof window.config.get === 'function') {
            const configUrl = window.config.get('api.baseUrl');
            if (configUrl) {
                return configUrl;
            }
        }
        
        // Определяем окружение
        const isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1' &&
                           !window.location.hostname.includes('127.0.0.1');
        
        if (isProduction) {
            // Production: Railway
            return 'https://am8-production.up.railway.app/api';
        } else {
            // Development: localhost
            return 'http://localhost:8080/api';
        }
    }
    
    /**
     * Получить полный URL для API endpoint
     * @param {string} endpoint - Endpoint (например, '/rooms' или 'rooms')
     * @returns {string}
     */
    static getApiUrl(endpoint) {
        const baseUrl = this.getApiBaseUrl();
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${baseUrl}${cleanEndpoint}`;
    }
    
    /**
     * Получить URL для комнат
     * @param {string} roomId - ID комнаты (опционально)
     * @param {string} action - Действие (опционально, например, 'game-state')
     * @returns {string}
     */
    static getRoomsUrl(roomId = '', action = '') {
        const baseUrl = this.getApiBaseUrl();
        let url = `${baseUrl}/rooms`;
        
        if (roomId) {
            url += `/${roomId}`;
        }
        
        if (action) {
            url += `/${action}`;
        }
        
        return url;
    }
    
    /**
     * Получить URL для банковских операций
     * @param {string} action - Действие (например, 'transfer')
     * @returns {string}
     */
    static getBankUrl(action = '') {
        const baseUrl = this.getApiBaseUrl();
        let url = `${baseUrl}/bank`;
        
        if (action) {
            url += `/${action}`;
        }
        
        return url;
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.ApiUrlHelper = ApiUrlHelper;
}

