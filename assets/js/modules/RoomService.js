/**
 * RoomService v2.0.0 - Refactored
 * Клиентский сервис для работы с игровыми комнатами
 * 
 * Основные улучшения:
 * - Устранено дублирование комнат
 * - Улучшена архитектура управления данными
 * - Добавлена система кэширования
 * - Оптимизирована инициализация
 */
class RoomService {
    constructor() {
        this._initializeConfiguration();
        this._initializeState();
        this._initializeData();
    }

    /**
     * Инициализация конфигурации сервиса
     * @private
     */
    _initializeConfiguration() {
        const isLocal = this._isLocalEnvironment();
        
        this.config = {
            isLocal,
            baseUrl: isLocal ? 'http://localhost:3002/api/rooms' : '/api/rooms',
            useMockData: !isLocal, // В продакшне используем мок-данные
            localStorageKey: 'aura_money_dynamic_rooms',
            cacheTimeout: 30000, // 30 секунд
            maxRetries: 3
        };

        console.log(`🏠 RoomService v2.0.0: Инициализация ${isLocal ? 'локального' : 'продакшн'} режима`);
    }

    /**
     * Инициализация состояния сервиса
     * @private
     */
    _initializeState() {
        this.state = {
            currentRoom: null,
            rooms: [],
            lastUpdate: null,
            isLoading: false,
            error: null
        };
    }

    /**
     * Инициализация данных (мок-данные + localStorage)
     * @private
     */
    _initializeData() {
        if (this.config.useMockData) {
            this._initializeMockData();
            this._loadPersistedRooms();
        }
    }

    /**
     * Проверка локального окружения
     * @private
     */
    _isLocalEnvironment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '0.0.0.0';
    }

    /**
     * Инициализация базовых мок-данных
     * @private
     */
    _initializeMockData() {
        const now = Date.now();
        
        this.mockRooms = [
            this._createMockRoomObject({
                id: 'room-demo-1',
                name: 'Демо комната 1',
                maxPlayers: 4,
                playerCount: 2,
                creator: 'demo_user',
                turnTime: 30,
                assignProfessions: true,
                players: [
                    { id: 'p1', username: 'demo_user', name: 'demo_user', isHost: true },
                    { id: 'p2', username: 'player1', name: 'player1', isHost: false }
                ],
                createdAt: new Date(now - 60000).toISOString()
            }),
            this._createMockRoomObject({
                id: 'room-demo-2',
                name: 'Турнирная комната',
                maxPlayers: 6,
                playerCount: 3,
                creator: 'tournament_master',
                turnTime: 60,
                assignProfessions: false,
                players: [
                    { id: 'p3', username: 'tournament_master', name: 'tournament_master', isHost: true },
                    { id: 'p4', username: 'player2', name: 'player2', isHost: false },
                    { id: 'p5', username: 'player3', name: 'player3', isHost: false }
                ],
                createdAt: new Date(now - 30000).toISOString()
            })
        ];

        console.log('🏠 RoomService: Базовые мок-данные инициализированы');
    }

    /**
     * Создание объекта мок-комнаты с дефолтными значениями
     * @private
     */
    _createMockRoom(roomData) {
        return {
            id: roomData.id,
            name: roomData.name,
            maxPlayers: roomData.maxPlayers || 4,
            playerCount: roomData.playerCount || 0,
            status: roomData.status || 'waiting',
            isStarted: roomData.isStarted || false,
            isFull: roomData.isFull || false,
            creator: roomData.creator || 'unknown',
            turnTime: roomData.turnTime || 30,
            assignProfessions: roomData.assignProfessions || false,
            players: roomData.players || [],
            createdAt: roomData.createdAt || new Date().toISOString()
        };
    }

    /**
     * Загрузка сохраненных комнат из localStorage
     * @private
     */
    _loadPersistedRooms() {
        try {
            const saved = localStorage.getItem(this.config.localStorageKey);
            if (!saved) {
                console.log('📂 RoomService: Нет сохраненных комнат в localStorage');
                return;
            }

            const persistedRooms = JSON.parse(saved);
            if (!Array.isArray(persistedRooms)) {
                console.warn('⚠️ RoomService: Неверный формат сохраненных комнат');
                return;
            }

            // Добавляем только новые комнаты (по ID)
            const existingIds = new Set(this.mockRooms.map(room => room.id));
            const newRooms = persistedRooms.filter(room => !existingIds.has(room.id));

            if (newRooms.length > 0) {
                this.mockRooms = [...newRooms, ...this.mockRooms];
                console.log(`📂 RoomService: Загружено ${newRooms.length} новых комнат из localStorage`);
            } else {
                console.log('📂 RoomService: Нет новых комнат для загрузки');
            }

        } catch (error) {
            console.error('❌ RoomService: Ошибка загрузки сохраненных комнат:', error);
        }
    }

    /**
     * Сохранение динамических комнат в localStorage
     * @private
     */
    _savePersistedRooms() {
        try {
            const dynamicRooms = this.mockRooms.filter(room => 
                room.id.startsWith('mock-room-')
            );
            
            localStorage.setItem(this.config.localStorageKey, JSON.stringify(dynamicRooms));
            console.log(`💾 RoomService: Сохранено ${dynamicRooms.length} динамических комнат`);
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка сохранения комнат:', error);
        }
    }

    /**
     * Получение списка всех комнат
     * @returns {Promise<Array>}
     */
    async getAllRooms() {
        try {
            console.log('🏠 RoomService: Получение списка комнат');

            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._getMockRooms();
            }

            // Пытаемся получить данные с API
            const rooms = await this._fetchRoomsFromAPI();
            this.state.rooms = rooms;
            this.state.lastUpdate = Date.now();
            
            return rooms;

        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнат:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                console.log('🔄 RoomService: Fallback на мок-данные');
                return this._getMockRooms();
            }
            
            throw error;
        }
    }

    /**
     * Получение мок-комнат
     * @private
     */
    _getMockRooms() {
        // Сортируем комнаты по дате создания (новые вверху)
        const sortedRooms = [...this.mockRooms].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        this.state.rooms = sortedRooms;
        this.state.lastUpdate = Date.now();
        
        return sortedRooms;
    }

    /**
     * Получение комнат с API
     * @private
     */
    async _fetchRoomsFromAPI() {
        const response = await fetch(this.config.baseUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Ошибка получения комнат');
        }

        return data.data;
    }

    /**
     * Получение комнаты по ID
     * @param {string} roomId
     * @returns {Promise<Object>}
     */
    async getRoomById(roomId) {
        try {
            console.log('🏠 RoomService: Получение комнаты по ID:', roomId);

            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._findMockRoomById(roomId);
            }

            // Пытаемся получить с API
            const room = await this._fetchRoomFromAPI(roomId);
            return room;

        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнаты:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                return this._findMockRoomById(roomId);
            }
            
            return null;
        }
    }

    /**
     * Поиск мок-комнаты по ID
     * @private
     */
    _findMockRoomById(roomId) {
        const room = this.mockRooms.find(r => r.id === roomId);
        if (room) {
            console.log('✅ RoomService: Комната найдена в мок-данных:', room.name);
            return room;
        } else {
            console.warn('⚠️ RoomService: Комната не найдена в мок-данных');
            return null;
        }
    }

    /**
     * Получение комнаты с API
     * @private
     */
    async _fetchRoomFromAPI(roomId) {
        const response = await fetch(`${this.config.baseUrl}/${roomId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Комната не найдена');
        }

        return data.data;
    }

    /**
     * Создание новой комнаты
     * @param {Object} roomData
     * @param {Object} creator
     * @returns {Promise<Object>}
     */
    async createRoom(roomData, creator) {
        try {
            console.log('🏠 RoomService: Создание комнаты:', roomData.name);

            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._createMockRoom(roomData, creator);
            }

            // Пытаемся создать через API
            const room = await this._createRoomViaAPI(roomData, creator);
            
            // Отправляем push-уведомление
            await this._sendRoomCreatedNotification(room, creator);
            
            return room;

        } catch (error) {
            console.error('❌ RoomService: Ошибка создания комнаты:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                console.log('🔄 RoomService: Fallback на создание мок-комнаты');
                return this._createMockRoom(roomData, creator);
            }
            
            throw error;
        }
    }

    /**
     * Создание объекта мок-комнаты
     * @param {Object} roomData - Данные комнаты
     * @param {Object} creator - Создатель комнаты
     * @returns {Object}
     * @private
     */
    _createMockRoomObject(roomData, creator) {
        const safeCreator = creator || {};
        
        return {
            id: roomData.id || 'mock-room-' + Date.now(),
            name: roomData.name || 'Новая комната',
            maxPlayers: roomData.maxPlayers || 4,
            playerCount: roomData.playerCount || 1,
            status: roomData.status || 'waiting',
            isStarted: roomData.isStarted || false,
            isFull: roomData.isFull || false,
            creator: roomData.creator || safeCreator.username || 'unknown',
            turnTime: roomData.turnTime || 30,
            assignProfessions: roomData.assignProfessions || false,
            players: roomData.players || [{
                id: safeCreator.id || 'creator-id',
                username: safeCreator.username || 'creator',
                name: safeCreator.username || 'creator',
                isHost: true
            }],
            createdAt: roomData.createdAt || new Date().toISOString()
        };
    }

    /**
     * Создание мок-комнаты
     * @private
     */
    _createMockRoom(roomData, creator) {
        // Обеспечиваем безопасность creator
        const safeCreator = creator || {};
        
        const newRoom = this._createMockRoomObject({
            id: 'mock-room-' + Date.now(),
            name: roomData.name || 'Новая комната',
            maxPlayers: roomData.maxPlayers || 4,
            playerCount: 1,
            creator: safeCreator.username || 'unknown',
            turnTime: roomData.turnTime || 30,
            assignProfessions: roomData.assignProfessions || false,
            players: [{
                id: safeCreator.id || 'creator-id',
                username: safeCreator.username || 'creator',
                name: safeCreator.username || 'creator',
                isHost: true
            }]
        });

        // Добавляем комнату в начало списка
        this.mockRooms.unshift(newRoom);
        
        // Сохраняем в localStorage
        this._savePersistedRooms();
        
        console.log('✅ RoomService: Мок-комната создана:', newRoom.name);
        
        return newRoom;
    }

    /**
     * Создание комнаты через API
     * @private
     */
    async _createRoomViaAPI(roomData, creator) {
        const response = await fetch(this.config.baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomData, creator })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Ошибка создания комнаты');
        }

        return data.data;
    }

    /**
     * Отправка уведомления о создании комнаты
     * @private
     */
    async _sendRoomCreatedNotification(room, creator) {
        try {
            if (window.pushClient && typeof window.pushClient.sendBroadcastPush === 'function') {
                await window.pushClient.sendBroadcastPush('room_created', {
                    roomId: room.id,
                    roomName: room.name,
                    creator: creator.username,
                    playerCount: room.playerCount,
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                    timestamp: new Date().toISOString()
                }, true);
                
                console.log('📡 RoomService: Push-уведомление отправлено');
            }
        } catch (error) {
            console.error('⚠️ RoomService: Ошибка отправки push-уведомления:', error);
        }
    }

    /**
     * Присоединение к комнате
     * @param {string} roomId
     * @param {Object} player
     * @returns {Promise<Object>}
     */
    async joinRoom(roomId, player) {
        try {
            console.log('🏠 RoomService: Присоединение к комнате:', roomId);

            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._joinMockRoom(roomId, player);
            }

            // Пытаемся присоединиться через API
            const room = await this._joinRoomViaAPI(roomId, player);
            this.state.currentRoom = room;
            
            return room;

        } catch (error) {
            console.error('❌ RoomService: Ошибка присоединения к комнате:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                return this._joinMockRoom(roomId, player);
            }
            
            throw error;
        }
    }

    /**
     * Присоединение к мок-комнате
     * @private
     */
    _joinMockRoom(roomId, player) {
        const room = this.mockRooms.find(r => r.id === roomId);
        if (!room) {
            throw new Error('Комната не найдена');
        }

        if (room.playerCount >= room.maxPlayers) {
            throw new Error('Комната заполнена');
        }

        // Проверяем, не присоединился ли уже игрок
        const existingPlayer = room.players.find(p => p.userId === player.userId);
        if (existingPlayer) {
            console.log('✅ RoomService: Игрок уже в комнате');
            this.state.currentRoom = room;
            return room;
        }

        // Добавляем игрока
        const newPlayer = {
            id: 'player-' + Date.now(),
            userId: player.userId,
            username: player.username,
            name: player.name,
            isHost: false
        };

        room.players.push(newPlayer);
        room.playerCount = room.players.length;
        
        this.state.currentRoom = room;
        this._savePersistedRooms();
        
        console.log('✅ RoomService: Присоединение к мок-комнате успешно:', room.name);
        
        return room;
    }

    /**
     * Присоединение к комнате через API
     * @private
     */
    async _joinRoomViaAPI(roomId, player) {
        const response = await fetch(`${this.config.baseUrl}/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Ошибка присоединения к комнате');
        }

        return data.data;
    }

    /**
     * Получение статистики комнат
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            console.log('🏠 RoomService: Получение статистики');

            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._getMockStats();
            }

            // Пытаемся получить с API
            const stats = await this._fetchStatsFromAPI();
            return stats;

        } catch (error) {
            console.error('❌ RoomService: Ошибка получения статистики:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                return this._getMockStats();
            }
            
            throw error;
        }
    }

    /**
     * Получение мок-статистики
     * @private
     */
    _getMockStats() {
        const stats = {
            totalRooms: this.mockRooms.length,
            activeRooms: this.mockRooms.filter(r => !r.isStarted).length,
            gamesStarted: this.mockRooms.filter(r => r.isStarted).length,
            playersOnline: this.mockRooms.reduce((sum, r) => sum + r.playerCount, 0)
        };
        
        console.log('🏠 RoomService: Использование мок-статистики');
        return stats;
    }

    /**
     * Получение статистики с API
     * @private
     */
    async _fetchStatsFromAPI() {
        const response = await fetch(`${this.config.baseUrl}/stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Ошибка получения статистики');
        }

        return data.data;
    }

    /**
     * Запуск игры
     * @param {string} roomId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async startGame(roomId, userId) {
        try {
            console.log('🏠 RoomService: Запуск игры в комнате:', roomId);
            
            const response = await fetch(`${this.config.baseUrl}/${roomId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка запуска игры');
            }

            this.state.currentRoom = data.data;
            return data.data;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка запуска игры:', error);
            throw error;
        }
    }

    /**
     * Обновление комнаты
     * @param {string} roomId
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async updateRoom(roomId, updates) {
        try {
            console.log('🏠 RoomService: Обновление комнаты:', roomId);
            
            const response = await fetch(`${this.config.baseUrl}/${roomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка обновления комнаты');
            }

            this.state.currentRoom = data.data;
            return data.data;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка обновления комнаты:', error);
            throw error;
        }
    }

    /**
     * Удаление комнаты
     * @param {string} roomId
     * @returns {Promise<boolean>}
     */
    async deleteRoom(roomId) {
        try {
            console.log('🏠 RoomService: Удаление комнаты:', roomId);
            
            const response = await fetch(`${this.config.baseUrl}/${roomId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка удаления комнаты');
            }

            if (this.state.currentRoom && this.state.currentRoom.id === roomId) {
                this.state.currentRoom = null;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка удаления комнаты:', error);
            throw error;
        }
    }

    /**
     * Обновление данных игрока в комнате
     * @param {string} roomId
     * @param {Object} playerData
     * @returns {Promise<Object>}
     */
    async updatePlayerInRoom(roomId, playerData) {
        try {
            console.log('🏠 RoomService: Обновление игрока в комнате:', roomId);
            
            // Если используем мок-данные, обновляем локально
            if (this.config.useMockData || this.useMockData) {
                console.log('🏠 RoomService: Использование мок-обновления игрока');
                return this._updatePlayerInMockRoom(roomId, playerData);
            }
            
            const response = await fetch(`${this.config.baseUrl}/${roomId}/player`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(playerData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка обновления игрока');
            }

            return data.data;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка обновления игрока:', error);
            throw error;
        }
    }

    /**
     * Обновление игрока в мок-комнате
     * @param {string} roomId
     * @param {Object} playerData
     * @returns {Promise<Object>}
     * @private
     */
    _updatePlayerInMockRoom(roomId, playerData) {
        console.log('🏠 RoomService: Обновление игрока в мок-комнате:', roomId, playerData);
        
        const room = this.mockRooms.find(r => r.id === roomId);
        if (!room) {
            throw new Error('Комната не найдена');
        }

        // Находим игрока в комнате
        const playerIndex = room.players.findIndex(p => p.id === playerData.id || p.username === playerData.username);
        if (playerIndex === -1) {
            throw new Error('Игрок не найден в комнате');
        }

        // Обновляем данные игрока
        room.players[playerIndex] = { ...room.players[playerIndex], ...playerData };
        
        // Сохраняем обновленную комнату
        this._savePersistedRooms();
        
        console.log('✅ RoomService: Игрок успешно обновлен в мок-комнате');
        return {
            success: true,
            player: room.players[playerIndex],
            room: room
        };
    }

    // Геттеры для состояния
    getCurrentRoom() { return this.state.currentRoom; }
    setCurrentRoom(room) { this.state.currentRoom = room; }
    clearCurrentRoom() { this.state.currentRoom = null; }
    getCachedRooms() { return this.state.rooms; }

    // Утилитарные методы
    isHost(userId, room = null) {
        const targetRoom = room || this.state.currentRoom;
        if (!targetRoom || !targetRoom.players) return false;
        
        const hostPlayer = targetRoom.players.find(p => p.isHost);
        return hostPlayer && hostPlayer.userId === userId;
    }

    getPlayer(userId, room = null) {
        const targetRoom = room || this.state.currentRoom;
        if (!targetRoom || !targetRoom.players) return null;
        
        return targetRoom.players.find(p => p.userId === userId) || null;
    }

    canJoinRoom(userId, room) {
        if (!room || !userId) return false;
        if (room.isFull || room.isStarted) return false;
        
        const existingPlayer = this.getPlayer(userId, room);
        return !existingPlayer;
    }

    canStartGame(userId, room = null) {
        const targetRoom = room || this.state.currentRoom;
        if (!targetRoom || !userId) return false;
        
        return this.isHost(userId, targetRoom) && 
               !targetRoom.isStarted && 
               targetRoom.canStart;
    }

    /**
     * Очистка кэша и сброс состояния
     */
    clearCache() {
        this.state.rooms = [];
        this.state.lastUpdate = null;
        this.state.currentRoom = null;
        console.log('🧹 RoomService: Кэш очищен');
    }

    /**
     * Очистка всех данных из localStorage
     */
    clearPersistedData() {
        localStorage.removeItem(this.config.localStorageKey);
        console.log('🧹 RoomService: Сохраненные данные очищены');
    }
}

// Экспорт для использования
if (typeof window !== 'undefined') {
    window.RoomService = RoomService;
}

// Version: 1760438000 - Refactored v2.0.0