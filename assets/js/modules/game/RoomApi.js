/**
 * RoomApi v1.0.0
 * API клиент для взаимодействия с игровыми комнатами
 */

class RoomApi {
    constructor() {
        this.baseUrl = '/api/rooms';
        this.headers = {
            'Content-Type': 'application/json'
        };
        
        console.log('🌐 RoomApi: Инициализирован');
    }
    
    /**
     * Получение заголовков с авторизацией
     */
    getHeaders() {
        const token = localStorage.getItem('aura_money_token');
        const userId = localStorage.getItem('aura_money_user_id');
        
        return {
            ...this.headers,
            'Authorization': `Bearer ${token}`,
            'x-user-id': userId
        };
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
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`❌ RoomApi: Ошибка запроса ${endpoint}:`, error);
            throw error;
        }
    }
    
    /**
     * Бросок кубика
     * @param {string} roomId - ID комнаты
     * @param {string} diceChoice - 'single' или 'double'
     * @param {boolean} isReroll - Повторный бросок
     * @returns {Promise<Object>} Результат броска
     */
    async rollDice(roomId, diceChoice = 'single', isReroll = false) {
        const endpoint = `/${roomId}/roll`;
        const body = {
            diceChoice,
            isReroll
        };
        
        console.log(`🎲 RoomApi: Бросок кубика в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * Перемещение игрока
     * @param {string} roomId - ID комнаты
     * @param {number} steps - Количество шагов
     * @returns {Promise<Object>} Результат перемещения
     */
    async move(roomId, steps) {
        const endpoint = `/${roomId}/move`;
        const body = {
            steps
        };
        
        console.log(`🚶 RoomApi: Перемещение на ${steps} шагов в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
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
        
        console.log(`📊 RoomApi: Получение состояния игры в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'GET'
        });
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
     * @returns {Promise<Object>} Результат броска
     */
    async rollDice(roomId) {
        const endpoint = `/${roomId}/roll`;
        
        console.log(`🎲 RoomApi: Бросок кубика в комнате ${roomId}`);
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify({})
        });
    }
    
    /**
     * Движение фишки
     * @param {string} roomId - ID комнаты
     * @param {number} steps - Количество шагов
     * @returns {Promise<Object>} Результат движения
     */
    async movePlayer(roomId, steps) {
        const endpoint = `/${roomId}/move`;
        
        console.log(`🚶 RoomApi: Движение фишки в комнате ${roomId} на ${steps} шагов`);
        
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify({ steps })
        });
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.RoomApi = RoomApi;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomApi;
}
