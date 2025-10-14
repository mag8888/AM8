/**
 * RoomService v1.0.0
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
            // Продакшн - используем основной API
            this.baseUrl = '/api/rooms';
            console.log('🏠 RoomService: Инициализация клиентского сервиса с основным API');
        }
        
        this.currentRoom = null;
        this.rooms = [];
    }

    /**
     * Получение списка всех комнат
     * @returns {Promise<Array>}
     */
    async getAllRooms() {
        try {
            console.log('🏠 RoomService: Получение списка комнат');
            
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
            throw error;
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
            
            const response = await fetch(`${this.baseUrl}/${roomId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player
                })
            });

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
            throw error;
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
