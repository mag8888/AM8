/**
 * Модуль для работы с игровыми данными
 * Централизованное управление состоянием игры
 */

class GameDataManager {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
        this.init();
    }

    /**
     * Инициализация менеджера данных
     */
    init() {
        // Загружаем кэшированные данные
        this.loadCache();
        
        // Очищаем устаревший кэш каждые 10 минут
        setInterval(() => {
            this.cleanExpiredCache();
        }, 10 * 60 * 1000);
    }

    /**
     * Получить данные комнаты
     * @param {string} roomId - ID комнаты
     * @param {boolean} useCache - Использовать кэш
     * @returns {Promise<Object>} - Данные комнаты
     */
    async getRoomData(roomId, useCache = true) {
        const cacheKey = `room_${roomId}`;
        
        // Проверяем кэш
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`📦 GameDataManager: Используем кэш для комнаты ${roomId}`);
                return cached.data;
            }
        }
        
        try {
            console.log(`🌐 GameDataManager: Загружаем данные комнаты ${roomId}`);
            const data = await window.apiClient.get(`/api/rooms/${roomId}?include=players,ready,status`);
            
            // Сохраняем в кэш
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error(`❌ GameDataManager: Ошибка загрузки данных комнаты ${roomId}:`, error);
            
            // Возвращаем кэшированные данные если есть
            if (this.cache.has(cacheKey)) {
                console.log(`📦 GameDataManager: Используем устаревший кэш для комнаты ${roomId}`);
                return this.cache.get(cacheKey).data;
            }
            
            throw error;
        }
    }

    /**
     * Получить список комнат
     * @param {boolean} useCache - Использовать кэш
     * @returns {Promise<Array>} - Список комнат
     */
    async getRoomsList(useCache = true) {
        const cacheKey = 'rooms_list';
        
        // Проверяем кэш
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 GameDataManager: Используем кэш списка комнат');
                return cached.data;
            }
        }
        
        try {
            console.log('🌐 GameDataManager: Загружаем список комнат');
            const data = await window.apiClient.get('/api/rooms');
            
            // Сохраняем в кэш
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('❌ GameDataManager: Ошибка загрузки списка комнат:', error);
            
            // Возвращаем кэшированные данные если есть
            if (this.cache.has(cacheKey)) {
                console.log('📦 GameDataManager: Используем устаревший кэш списка комнат');
                return this.cache.get(cacheKey).data;
            }
            
            throw error;
        }
    }

    /**
     * Обновить данные игрока
     * @param {string} roomId - ID комнаты
     * @param {Object} playerData - Данные игрока
     * @returns {Promise<Object>} - Результат обновления
     */
    async updatePlayerData(roomId, playerData) {
        try {
            console.log(`🌐 GameDataManager: Обновляем данные игрока в комнате ${roomId}`);
            const result = await window.apiClient.put(`/api/rooms/${roomId}/player`, playerData);
            
            // Инвалидируем кэш комнаты
            this.invalidateRoomCache(roomId);
            
            return result;
        } catch (error) {
            console.error(`❌ GameDataManager: Ошибка обновления данных игрока:`, error);
            throw error;
        }
    }

    /**
     * Присоединиться к комнате
     * @param {string} roomId - ID комнаты
     * @param {Object} playerData - Данные игрока
     * @returns {Promise<Object>} - Результат присоединения
     */
    async joinRoom(roomId, playerData) {
        try {
            console.log(`🌐 GameDataManager: Присоединяемся к комнате ${roomId}`);
            const result = await window.apiClient.post(`/api/rooms/${roomId}/join`, playerData);
            
            // Инвалидируем кэш комнаты
            this.invalidateRoomCache(roomId);
            
            return result;
        } catch (error) {
            console.error(`❌ GameDataManager: Ошибка присоединения к комнате:`, error);
            throw error;
        }
    }

    /**
     * Запустить игру
     * @param {string} roomId - ID комнаты
     * @returns {Promise<Object>} - Результат запуска
     */
    async startGame(roomId) {
        try {
            console.log(`🌐 GameDataManager: Запускаем игру в комнате ${roomId}`);
            const result = await window.apiClient.post(`/api/rooms/${roomId}/start`);
            
            // Инвалидируем кэш комнаты
            this.invalidateRoomCache(roomId);
            
            return result;
        } catch (error) {
            console.error(`❌ GameDataManager: Ошибка запуска игры:`, error);
            throw error;
        }
    }

    /**
     * Инвалидировать кэш комнаты
     * @param {string} roomId - ID комнаты
     */
    invalidateRoomCache(roomId) {
        const cacheKey = `room_${roomId}`;
        this.cache.delete(cacheKey);
        console.log(`🗑️ GameDataManager: Кэш комнаты ${roomId} инвалидирован`);
    }

    /**
     * Инвалидировать весь кэш
     */
    invalidateAllCache() {
        this.cache.clear();
        console.log('🗑️ GameDataManager: Весь кэш инвалидирован');
    }

    /**
     * Загрузить кэш из localStorage
     */
    loadCache() {
        try {
            const cached = CommonUtils.storage.get('game_data_cache', {});
            const now = Date.now();
            
            for (const [key, value] of Object.entries(cached)) {
                if (now - value.timestamp < this.cacheTimeout) {
                    this.cache.set(key, value);
                }
            }
            
            console.log(`📦 GameDataManager: Загружен кэш (${this.cache.size} элементов)`);
        } catch (error) {
            // Игнорируем ошибку если CommonUtils еще не загружен
            if (error.name === 'ReferenceError' && error.message.includes('CommonUtils')) {
                // CommonUtils загрузится позже, это нормально
                return;
            }
            console.warn('⚠️ GameDataManager: Ошибка загрузки кэша:', error);
        }
    }

    /**
     * Сохранить кэш в localStorage
     */
    saveCache() {
        try {
            const cacheData = {};
            for (const [key, value] of this.cache.entries()) {
                cacheData[key] = value;
            }
            
            CommonUtils.storage.set('game_data_cache', cacheData);
            console.log(`💾 GameDataManager: Кэш сохранен (${this.cache.size} элементов)`);
        } catch (error) {
            console.warn('⚠️ GameDataManager: Ошибка сохранения кэша:', error);
        }
    }

    /**
     * Очистить устаревший кэш
     */
    cleanExpiredCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.cacheTimeout) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 GameDataManager: Очищено ${cleaned} устаревших элементов кэша`);
        }
    }

    /**
     * Получить статистику кэша
     * @returns {Object} - Статистика кэша
     */
    getCacheStats() {
        const now = Date.now();
        let valid = 0;
        let expired = 0;
        
        for (const value of this.cache.values()) {
            if (now - value.timestamp < this.cacheTimeout) {
                valid++;
            } else {
                expired++;
            }
        }
        
        return {
            total: this.cache.size,
            valid,
            expired,
            timeout: this.cacheTimeout
        };
    }
}

// Создаем глобальный экземпляр менеджера данных
window.gameDataManager = new GameDataManager();

// Сохраняем кэш при выгрузке страницы
window.addEventListener('beforeunload', () => {
    window.gameDataManager.saveCache();
});

console.log('✅ GameDataManager загружен');
