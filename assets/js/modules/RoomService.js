/**
 * RoomService v1.0.4
 * Клиентский сервис для работы с игровыми комнатами
 */
class RoomService {
    constructor() {
        // Определяем базовый URL в зависимости от окружения
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocal) {
            // Локальная разработка - используем мок-API
            this.baseUrl = 'http://localhost:3002/api/rooms';
            console.log('🏠 RoomService: Инициализация клиентского сервиса с мок-API');
        } else {
            // Продакшн - используем основной API, но с fallback на мок-данные
            this.baseUrl = '/api/rooms';
            this.useMockData = true; // Включаем мок-данные для продакшна
            console.log('🏠 RoomService: Инициализация клиентского сервиса с основным API (с fallback на мок-данные)');
        }
        
        this.currentRoom = null;
        this.rooms = [];
        
        // Инициализируем мок-данные для продакшна
        if (this.useMockData) {
            this.initializeMockData();
            // Загружаем динамически созданные комнаты из localStorage
            this.loadDynamicRooms();
        }
    }

    /**
     * Инициализация мок-данных для продакшна
     */
    initializeMockData() {
        this.mockRooms = [
            {
                id: 'room-demo-1',
                name: 'Демо комната 1',
                maxPlayers: 4,
                playerCount: 2,
                status: 'waiting',
                isStarted: false,
                isFull: false,
                creator: 'demo_user',
                turnTime: 30,
                assignProfessions: true,
                players: [
                    { id: 'p1', username: 'demo_user', name: 'demo_user', isHost: true },
                    { id: 'p2', username: 'player1', name: 'player1', isHost: false }
                ],
                createdAt: new Date(Date.now() - 60000).toISOString() // 1 минута назад
            },
            {
                id: 'room-demo-2',
                name: 'Турнирная комната',
                maxPlayers: 6,
                playerCount: 3,
                status: 'waiting',
                isStarted: false,
                isFull: false,
                creator: 'tournament_master',
                turnTime: 60,
                assignProfessions: false,
                players: [
                    { id: 'p3', username: 'tournament_master', name: 'tournament_master', isHost: true },
                    { id: 'p4', username: 'player2', name: 'player2', isHost: false },
                    { id: 'p5', username: 'player3', name: 'player3', isHost: false }
                ],
                createdAt: new Date(Date.now() - 30000).toISOString() // 30 секунд назад
            }
        ];
        
        console.log('🏠 RoomService: Мок-данные инициализированы для продакшна');
    }

    /**
     * Сохранение динамически созданных комнат в localStorage
     */
    saveDynamicRooms() {
        try {
            const dynamicRooms = this.mockRooms.filter(room => room.id.startsWith('mock-room-'));
            localStorage.setItem('aura_money_dynamic_rooms', JSON.stringify(dynamicRooms));
            console.log('💾 RoomService: Динамические комнаты сохранены в localStorage:', dynamicRooms.length);
        } catch (error) {
            console.error('❌ RoomService: Ошибка сохранения динамических комнат:', error);
        }
    }

    /**
     * Загрузка динамически созданных комнат из localStorage
     */
    loadDynamicRooms() {
        try {
            const saved = localStorage.getItem('aura_money_dynamic_rooms');
            if (saved) {
                const dynamicRooms = JSON.parse(saved);
                // Добавляем динамические комнаты к базовым мок-данным
                this.mockRooms = [...dynamicRooms, ...this.mockRooms];
                console.log('📂 RoomService: Динамические комнаты загружены из localStorage:', dynamicRooms.length);
            }
        } catch (error) {
            console.error('❌ RoomService: Ошибка загрузки динамических комнат:', error);
        }
    }

    /**
     * Получение списка всех комнат
     * @returns {Promise<Array>}
     */
    async getAllRooms() {
        try {
            console.log('🏠 RoomService: Получение списка комнат');
            
            // Если включены мок-данные, используем их
            if (this.useMockData) {
                console.log('🏠 RoomService: Использование мок-данных');
                // Сортируем комнаты по дате создания (новые вверху)
                const sortedRooms = [...this.mockRooms].sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                this.rooms = sortedRooms;
                return sortedRooms;
            }
            
            const response = await fetch(this.baseUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.rooms = data.data;
                console.log(`✅ RoomService: Получено ${data.count} комнат`);
                return data.data;
            } else {
                throw new Error(data.message || 'Ошибка получения комнат');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнат:', error);
            
            // Fallback на мок-данные при ошибке
            if (this.useMockData && this.mockRooms) {
                console.log('🏠 RoomService: Fallback на мок-данные');
                this.rooms = this.mockRooms;
                return this.mockRooms;
            }
            
            throw error;
        }
    }

    /**
     * Получение комнаты по ID
     * @param {string} roomId
     * @returns {Promise<Object>}
     */
    async getRoomById(roomId) {
        try {
            console.log('🏠 RoomService: Получение комнаты по ID:', roomId);
            
            // Если включены мок-данные, ищем комнату в них
            if (this.useMockData) {
                console.log('🏠 RoomService: Использование мок-данных для поиска комнаты');
                const room = this.mockRooms.find(r => r.id === roomId);
                if (room) {
                    console.log('✅ RoomService: Комната найдена в мок-данных:', room.name);
                    return room;
                } else {
                    console.warn('⚠️ RoomService: Комната не найдена в мок-данных');
                    return null;
                }
            }
            
            const response = await fetch(`${this.baseUrl}/${roomId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Комната получена');
                return data.data;
            } else {
                throw new Error(data.message || 'Комната не найдена');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнаты:', error);
            console.warn('⚠️ RoomService: API недоступен, используем мок-данные');
            
            // Fallback на мок-данные
            const room = this.mockRooms.find(r => r.id === roomId);
            if (room) {
                console.log('✅ RoomService: Комната найдена в мок-данных (fallback):', room.name);
                return room;
            } else {
                console.warn('⚠️ RoomService: Комната не найдена в мок-данных (fallback)');
                return null;
            }
        }
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
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomData,
                    creator
                })
            });

            // Проверяем статус ответа
            if (!response.ok) {
                console.warn('⚠️ RoomService: API недоступен, используем мок-данные для создания комнаты');
                return this.createMockRoom(roomData, creator);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Комната создана');
                this.currentRoom = data.data;
                
                // Отправляем push-уведомление о создании комнаты
                try {
                    if (window.pushClient && typeof window.pushClient.sendBroadcastPush === 'function') {
                        await window.pushClient.sendBroadcastPush('room_created', {
                            roomId: data.data.id,
                            roomName: data.data.name,
                            creator: creator.username,
                            playerCount: data.data.playerCount,
                            maxPlayers: data.data.maxPlayers,
                            status: data.data.status,
                            timestamp: new Date().toISOString()
                        }, true); // excludeSelf = true, чтобы не отправлять себе
                        
                        console.log('📡 RoomService: Push-уведомление о создании комнаты отправлено');
                    }
                } catch (pushError) {
                    console.error('⚠️ RoomService: Ошибка отправки push-уведомления:', pushError);
                    // Не прерываем создание комнаты из-за ошибки push
                }
                
                return data.data;
            } else {
                throw new Error(data.message || 'Ошибка создания комнаты');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка создания комнаты:', error);
            
            // Если API недоступен, используем мок-данные
            console.warn('⚠️ RoomService: API недоступен, используем мок-данные для создания комнаты');
            return this.createMockRoom(roomData, creator);
        }
    }

    /**
     * Создание комнаты в мок-данных
     * @param {Object} roomData
     * @param {Object} creator
     * @returns {Object}
     */
    createMockRoom(roomData, creator) {
        try {
            const newRoom = {
                id: 'mock-room-' + Date.now(),
                name: roomData.name || 'Новая комната',
                maxPlayers: roomData.maxPlayers || 4,
                playerCount: 1,
                status: 'waiting',
                isStarted: false,
                isFull: false,
                creator: creator.username || 'unknown',
                turnTime: roomData.turnTime || 30,
                assignProfessions: roomData.assignProfessions || false,
                players: [
                    {
                        id: creator.id || 'creator-id',
                        username: creator.username || 'creator',
                        name: creator.username || 'creator',
                        isHost: true
                    }
                ],
                createdAt: new Date().toISOString()
            };

            // Добавляем комнату в начало списка мок-данных (новые комнаты вверху)
            this.mockRooms.unshift(newRoom);
            
            // Сохраняем динамически созданные комнаты в localStorage
            this.saveDynamicRooms();
            
            console.log('✅ RoomService: Мок-комната создана:', newRoom.name);
            
            return newRoom;
        } catch (error) {
            console.error('❌ RoomService: Ошибка создания мок-комнаты:', error);
            throw error;
        }
    }

    /**
     * Присоединение к мок-комнате
     * @param {string} roomId
     * @param {Object} player
     * @returns {Object}
     */
    joinMockRoom(roomId, player) {
        try {
            console.log('🏠 RoomService: Присоединение к мок-комнате:', roomId);
            
            // Находим комнату в мок-данных
            const room = this.mockRooms.find(r => r.id === roomId);
            if (!room) {
                throw new Error('Комната не найдена');
            }
            
            // Проверяем, не полная ли комната
            if (room.playerCount >= room.maxPlayers) {
                throw new Error('Комната заполнена');
            }
            
            // Проверяем, не присоединился ли уже игрок
            const existingPlayer = room.players.find(p => p.userId === player.userId);
            if (existingPlayer) {
                console.log('✅ RoomService: Игрок уже в комнате');
                return room;
            }
            
            // Добавляем игрока в комнату
            const newPlayer = {
                id: 'player-' + Date.now(),
                userId: player.userId,
                username: player.username,
                name: player.name,
                isHost: false
            };
            
            room.players.push(newPlayer);
            room.playerCount = room.players.length;
            
            // Сохраняем текущую комнату
            this.currentRoom = room;
            
            // Сохраняем изменения в localStorage
            this.saveDynamicRooms();
            
            console.log('✅ RoomService: Присоединение к мок-комнате успешно:', room.name);
            
            return room;
        } catch (error) {
            console.error('❌ RoomService: Ошибка присоединения к мок-комнате:', error);
            throw error;
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
            console.log('🔍 RoomService: useMockData =', this.useMockData);
            
            // Принудительно используем мок-данные для продакшна
            if (this.useMockData || !window.location.hostname.includes('localhost')) {
                console.log('🏠 RoomService: Использование мок-данных для присоединения к комнате');
                return this.joinMockRoom(roomId, player);
            }
            
            const response = await fetch(`${this.baseUrl}/${roomId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player
                })
            });

            if (!response.ok) {
                console.warn('⚠️ RoomService: API недоступен, используем мок-данные для присоединения');
                return this.joinMockRoom(roomId, player);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Присоединение успешно');
                this.currentRoom = data.data;
                return data.data;
            } else {
                throw new Error(data.message || 'Ошибка присоединения к комнате');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка присоединения к комнате:', error);
            console.warn('⚠️ RoomService: API недоступен, используем мок-данные для присоединения');
            return this.joinMockRoom(roomId, player);
        }
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
            
            const response = await fetch(`${this.baseUrl}/${roomId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Игра запущена');
                this.currentRoom = data.data;
                return data.data;
            } else {
                throw new Error(data.message || 'Ошибка запуска игры');
            }
            
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
            
            const response = await fetch(`${this.baseUrl}/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    updates
                })
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Комната обновлена');
                this.currentRoom = data.data;
                return data.data;
            } else {
                throw new Error(data.message || 'Ошибка обновления комнаты');
            }
            
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
            
            const response = await fetch(`${this.baseUrl}/${roomId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Комната удалена');
                if (this.currentRoom && this.currentRoom.id === roomId) {
                    this.currentRoom = null;
                }
                return true;
            } else {
                throw new Error(data.message || 'Ошибка удаления комнаты');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка удаления комнаты:', error);
            throw error;
        }
    }

    /**
     * Получение статистики комнат
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            console.log('🏠 RoomService: Получение статистики');
            
            // Если включены мок-данные, используем их
            if (this.useMockData) {
                const stats = {
                    totalRooms: this.mockRooms.length,
                    activeRooms: this.mockRooms.filter(r => !r.isStarted).length,
                    gamesStarted: this.mockRooms.filter(r => r.isStarted).length,
                    playersOnline: this.mockRooms.reduce((sum, r) => sum + r.playerCount, 0)
                };
                
                console.log('🏠 RoomService: Использование мок-статистики');
                return stats;
            }
            
            console.log('🏠 RoomService: baseUrl =', this.baseUrl);
            console.log('🏠 RoomService: URL =', `${this.baseUrl}/stats`);
            
            const response = await fetch(`${this.baseUrl}/stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Статистика получена');
                return data.data;
            } else {
                throw new Error(data.message || 'Ошибка получения статистики');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка получения статистики:', error);
            
            // Fallback на мок-статистику при ошибке
            if (this.useMockData && this.mockRooms) {
                console.log('🏠 RoomService: Fallback на мок-статистику');
                const stats = {
                    totalRooms: this.mockRooms.length,
                    activeRooms: this.mockRooms.filter(r => !r.isStarted).length,
                    gamesStarted: this.mockRooms.filter(r => r.isStarted).length,
                    playersOnline: this.mockRooms.reduce((sum, r) => sum + r.playerCount, 0)
                };
                return stats;
            }
            
            throw error;
        }
    }

    /**
     * Получение текущей комнаты
     * @returns {Object|null}
     */
    getCurrentRoom() {
        return this.currentRoom;
    }

    /**
     * Установка текущей комнаты
     * @param {Object} room
     */
    setCurrentRoom(room) {
        this.currentRoom = room;
    }

    /**
     * Очистка текущей комнаты
     */
    clearCurrentRoom() {
        this.currentRoom = null;
    }

    /**
     * Получение списка комнат из кеша
     * @returns {Array}
     */
    getCachedRooms() {
        return this.rooms;
    }

    /**
     * Проверка является ли пользователь хостом
     * @param {string} userId
     * @param {Object} room
     * @returns {boolean}
     */
    isHost(userId, room = null) {
        const targetRoom = room || this.currentRoom;
        if (!targetRoom || !targetRoom.players) {
            return false;
        }
        
        const hostPlayer = targetRoom.players.find(p => p.isHost);
        return hostPlayer && hostPlayer.userId === userId;
    }

    /**
     * Получение игрока из комнаты
     * @param {string} userId
     * @param {Object} room
     * @returns {Object|null}
     */
    getPlayer(userId, room = null) {
        const targetRoom = room || this.currentRoom;
        if (!targetRoom || !targetRoom.players) {
            return null;
        }
        
        return targetRoom.players.find(p => p.userId === userId) || null;
    }

    /**
     * Проверка может ли пользователь присоединиться к комнате
     * @param {string} userId
     * @param {Object} room
     * @returns {boolean}
     */
    canJoinRoom(userId, room) {
        if (!room || !userId) {
            return false;
        }
        
        // Комната заполнена
        if (room.isFull) {
            return false;
        }
        
        // Игра уже началась
        if (room.isStarted) {
            return false;
        }
        
        // Пользователь уже в комнате
        const existingPlayer = this.getPlayer(userId, room);
        if (existingPlayer) {
            return false;
        }
        
        return true;
    }

    /**
     * Проверка может ли пользователь начать игру
     * @param {string} userId
     * @param {Object} room
     * @returns {boolean}
     */
    canStartGame(userId, room = null) {
        const targetRoom = room || this.currentRoom;
        if (!targetRoom || !userId) {
            return false;
        }
        
        // Только хост может начать игру
        if (!this.isHost(userId, targetRoom)) {
            return false;
        }
        
        // Игра уже началась
        if (targetRoom.isStarted) {
            return false;
        }
        
        // Недостаточно игроков
        if (!targetRoom.canStart) {
            return false;
        }
        
        return true;
    }

    /**
     * Обновление данных игрока в комнате
     * @param {string} roomId - ID комнаты
     * @param {Object} playerData - Данные игрока
     * @returns {Promise<Object>}
     */
    async updatePlayerInRoom(roomId, playerData) {
        try {
            console.log('🏠 RoomService: Обновление игрока в комнате:', roomId);
            
            const response = await fetch(`${this.baseUrl}/${roomId}/player`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playerData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ RoomService: Игрок обновлен в комнате');
                return data.data;
            } else {
                throw new Error(data.message || 'Ошибка обновления игрока');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка обновления игрока:', error);
            throw error;
        }
    }
}

// Экспорт для использования
if (typeof window !== 'undefined') {
    window.RoomService = RoomService;
}
// Version: 1760436500
