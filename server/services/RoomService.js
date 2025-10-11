const crypto = require('crypto');
const databaseConfig = require('../config/database');
const RoomModel = require('../models/RoomModel');

/**
 * RoomService - Сервис управления игровыми комнатами
 * Отвечает за создание, получение, обновление и удаление комнат,
 * управление игроками в комнатах
 */
class RoomService {
    constructor() {
        console.log('🏠 RoomService: Инициализация...');
        
        // In-memory хранилище для быстрого доступа
        this.rooms = new Map();
        
        // Модель для работы с базой данных
        this.roomModel = new RoomModel();
        
        // Конфигурация
        this.config = {
            minPlayers: 2,
            maxPlayers: 8,
            minTurnTime: 10,
            maxTurnTime: 120,
            defaultTurnTime: 30,
            defaultMaxPlayers: 4,
            roomCleanupInterval: 8 * 60 * 60 * 1000, // 8 часов
            defaultTurnTimeMs: 30 * 1000
        };
        
        // Инициализация
        this.init();
        
        console.log('✅ RoomService: Инициализация завершена');
    }

    /**
     * Инициализация сервиса
     */
    async init() {
        try {
            // Загрузка комнат из MongoDB при старте
            await this.loadRoomsFromMongoDB();
            
            // Запуск периодической очистки старых комнат
            this.startCleanupTimer();
            
            console.log('✅ RoomService: Инициализация завершена успешно');
        } catch (error) {
            console.error('❌ RoomService: Ошибка инициализации:', error);
        }
    }

    /**
     * Создание новой игровой комнаты
     * @param {Object} roomData - Данные комнаты
     * @param {Object} creator - Создатель комнаты
     * @returns {Object} Созданная комната
     */
    async createRoom(roomData, creator) {
        try {
            console.log('🏠 RoomService: Создание комнаты:', roomData.name);
            
            // Валидация входных данных
            this.validateRoomData(roomData);
            this.validateCreator(creator);
            
            // Генерация уникального ID
            const roomId = this.generateRoomId();
            
            // Проверка уникальности имени
            if (this.getRoomByName(roomData.name)) {
                throw new Error('Room name already exists');
            }
            
            // Создание структуры комнаты
            const room = {
                id: roomId,
                name: roomData.name,
                creatorId: creator.id,
                creatorName: creator.name || creator.username || 'Unknown',
                creatorAvatar: creator.avatar || '',
                maxPlayers: roomData.maxPlayers || this.config.defaultMaxPlayers,
                minPlayers: this.config.minPlayers,
                turnTime: roomData.turnTime || this.config.defaultTurnTime,
                assignProfessions: roomData.assignProfessions || false,
                players: [],
                gameState: null,
                isStarted: false,
                isFinished: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Создание объекта игрока-создателя
            const hostPlayer = {
                userId: creator.id,
                name: creator.name || creator.username || 'Host',
                username: creator.username || '',
                avatar: creator.avatar || '',
                isHost: true,
                isReady: false,
                position: 0,
                profession: null,
                joinedAt: new Date()
            };
            
            // Добавление создателя как первого игрока
            room.players.push(hostPlayer);
            
            // Сохранение комнаты
            this.rooms.set(roomId, room);
            await this.saveRoomToDatabases(room);
            
            console.log(`✅ RoomService: Комната создана: ${roomId} пользователем ${creator.name}`);
            
            return this.sanitizeRoom(room);
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка создания комнаты:', error);
            throw new Error(`Failed to create room: ${error.message}`);
        }
    }

    /**
     * Получение списка всех комнат
     * @returns {Array} Массив комнат
     */
    getAllRooms() {
        try {
            console.log('🏠 RoomService: Получение всех комнат');
            
            // Если Map пустая, попытка загрузки из MongoDB
            if (this.rooms.size === 0) {
                this.loadRoomsFromMongoDB().catch(error => {
                    console.error('❌ RoomService: Ошибка загрузки комнат из MongoDB:', error);
                });
            }
            
            const rooms = Array.from(this.rooms.values())
                .map(room => this.sanitizeRoom(room))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            console.log(`✅ RoomService: Получено ${rooms.length} комнат`);
            return rooms;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнат:', error);
            return [];
        }
    }

    /**
     * Получение комнаты по ID
     * @param {string} roomId - ID комнаты
     * @returns {Object|null} Комната или null
     */
    getRoomById(roomId) {
        try {
            console.log('🏠 RoomService: Получение комнаты по ID:', roomId);
            
            let room = this.rooms.get(roomId);
            
            // Если не найдена в памяти, попытка загрузки из MongoDB
            if (!room) {
                this.loadRoomFromMongoDB(roomId).then(loadedRoom => {
                    if (loadedRoom) {
                        this.rooms.set(roomId, loadedRoom);
                    }
                }).catch(error => {
                    console.error('❌ RoomService: Ошибка загрузки комнаты из MongoDB:', error);
                });
            }
            
            if (room) {
                console.log(`✅ RoomService: Комната найдена: ${roomId}`);
                return this.sanitizeRoom(room);
            } else {
                console.log(`❌ RoomService: Комната не найдена: ${roomId}`);
                return null;
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнаты:', error);
            return null;
        }
    }

    /**
     * Получение комнаты по имени
     * @param {string} roomName - Название комнаты
     * @returns {Object|null} Комната или null
     */
    getRoomByName(roomName) {
        try {
            console.log('🏠 RoomService: Получение комнаты по имени:', roomName);
            
            // Поиск в in-memory Map
            for (const room of this.rooms.values()) {
                if (room.name === roomName) {
                    console.log(`✅ RoomService: Комната найдена по имени: ${roomName}`);
                    return this.sanitizeRoom(room);
                }
            }
            
            console.log(`❌ RoomService: Комната не найдена по имени: ${roomName}`);
            return null;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка поиска комнаты по имени:', error);
            return null;
        }
    }

    /**
     * Присоединение игрока к комнате
     * @param {string} roomId - ID комнаты
     * @param {Object} player - Данные игрока
     * @returns {Object} Обновленная комната
     */
    async joinRoom(roomId, player) {
        try {
            console.log('🏠 RoomService: Присоединение игрока к комнате:', roomId);
            
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            
            // Проверка заполненности комнаты
            if (room.players.length >= room.maxPlayers) {
                throw new Error('Room is full');
            }
            
            // Проверка что игра не начата
            if (room.isStarted) {
                throw new Error('Game already started');
            }
            
            // Проверка что игрок еще не в комнате
            const existingPlayer = room.players.find(p => p.userId === player.userId);
            if (existingPlayer) {
                throw new Error('Player already in room');
            }
            
            // Валидация данных игрока
            this.validatePlayer(player);
            
            // Создание объекта игрока
            const newPlayer = {
                userId: player.userId,
                name: player.name || player.username || 'Player',
                username: player.username || '',
                avatar: player.avatar || '',
                isHost: false,
                isReady: false,
                position: 0,
                profession: null,
                joinedAt: new Date()
            };
            
            // Добавление игрока в комнату
            room.players.push(newPlayer);
            room.updatedAt = new Date();
            
            // Сохранение обновленной комнаты
            await this.saveRoomToDatabases(room);
            
            console.log(`✅ RoomService: Игрок ${player.name} присоединился к комнате ${roomId}`);
            
            return this.sanitizeRoom(room);
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка присоединения к комнате:', error);
            throw error;
        }
    }

    /**
     * Запуск игры в комнате
     * @param {string} roomId - ID комнаты
     * @param {string} userId - ID пользователя (должен быть хостом)
     * @returns {Object} Обновленная комната с инициализированным gameState
     */
    async startGame(roomId, userId) {
        try {
            console.log('🏠 RoomService: Запуск игры в комнате:', roomId);
            
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            
            // Проверка что пользователь - хост
            const hostPlayer = room.players.find(p => p.isHost);
            if (!hostPlayer || hostPlayer.userId !== userId) {
                throw new Error('Only host can start the game');
            }
            
            // Проверка минимального количества игроков
            if (room.players.length < room.minPlayers) {
                throw new Error(`Need at least ${room.minPlayers} players to start`);
            }
            
            // Проверка что игра еще не начата
            if (room.isStarted) {
                throw new Error('Game already started');
            }
            
            // Инициализация gameState
            const gameState = {
                activePlayerIndex: 0,
                hasRolledThisTurn: false,
                currentPhase: 'waiting',
                turnStartTime: Date.now(),
                gameStartTime: Date.now(),
                diceResult: null,
                lastMove: null,
                turnTimer: room.turnTime * 1000
            };
            
            // Обновление комнаты
            room.gameState = gameState;
            room.isStarted = true;
            room.updatedAt = new Date();
            
            // Сохранение обновленной комнаты
            await this.saveRoomToDatabases(room);
            
            console.log(`✅ RoomService: Игра запущена в комнате ${roomId}`);
            
            return this.sanitizeRoom(room);
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка запуска игры:', error);
            throw error;
        }
    }

    /**
     * Обновление данных комнаты
     * @param {string} roomId - ID комнаты
     * @param {Object} updates - Обновления
     * @returns {Object} Обновленная комната
     */
    async updateRoom(roomId, updates) {
        try {
            console.log('🏠 RoomService: Обновление комнаты:', roomId);
            
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            
            // Применение обновлений
            Object.assign(room, updates);
            room.updatedAt = new Date();
            
            // Сохранение обновленной комнаты
            await this.saveRoomToDatabases(room);
            
            console.log(`✅ RoomService: Комната ${roomId} обновлена`);
            
            return this.sanitizeRoom(room);
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка обновления комнаты:', error);
            throw error;
        }
    }

    /**
     * Удаление комнаты
     * @param {string} roomId - ID комнаты
     * @returns {boolean} true - успешно, false - ошибка
     */
    async deleteRoom(roomId) {
        try {
            console.log('🏠 RoomService: Удаление комнаты:', roomId);
            
            const room = this.rooms.get(roomId);
            if (!room) {
                console.log(`❌ RoomService: Комната ${roomId} не найдена для удаления`);
                return false;
            }
            
            // Удаление из in-memory Map
            this.rooms.delete(roomId);
            
            // Удаление из баз данных
            await this.deleteRoomFromDatabases(roomId);
            
            console.log(`✅ RoomService: Комната ${roomId} удалена`);
            
            return true;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка удаления комнаты:', error);
            return false;
        }
    }

    /**
     * Очистка старых неактивных комнат
     * @returns {number} Количество удаленных комнат
     */
    async cleanupOldRooms() {
        try {
            console.log('🏠 RoomService: Очистка старых комнат');
            
            const cutoffTime = new Date(Date.now() - this.config.roomCleanupInterval);
            let deletedCount = 0;
            
            for (const [roomId, room] of this.rooms.entries()) {
                // Удаляем комнаты старше cutoff времени и не начатые
                if (room.createdAt < cutoffTime && !room.isStarted) {
                    await this.deleteRoom(roomId);
                    deletedCount++;
                }
            }
            
            console.log(`✅ RoomService: Очищено ${deletedCount} старых комнат`);
            
            return deletedCount;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка очистки старых комнат:', error);
            return 0;
        }
    }

    /**
     * Очистка комнаты для отправки клиенту
     * @param {Object} room - Полная структура комнаты
     * @returns {Object} Очищенная комната с дополнительными полями
     */
    sanitizeRoom(room) {
        try {
            // Копирование объекта комнаты
            const sanitized = { ...room };
            
            // Удаление служебных полей
            delete sanitized._id;
            delete sanitized.__v;
            
            // Вычисление дополнительных полей
            sanitized.playerCount = room.players.length;
            sanitized.readyCount = room.players.filter(p => p.isReady).length;
            sanitized.canStart = room.players.length >= room.minPlayers && !room.isStarted;
            sanitized.isFull = room.players.length >= room.maxPlayers;
            
            return sanitized;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка санитизации комнаты:', error);
            return room;
        }
    }

    // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

    /**
     * Генерация уникального ID комнаты
     * @returns {string} UUID
     */
    generateRoomId() {
        return crypto.randomUUID();
    }

    /**
     * Валидация данных комнаты
     * @param {Object} roomData - Данные комнаты
     */
    validateRoomData(roomData) {
        if (!roomData.name || typeof roomData.name !== 'string' || roomData.name.trim().length === 0) {
            throw new Error('Room name is required');
        }
        
        if (roomData.maxPlayers && (roomData.maxPlayers < this.config.minPlayers || roomData.maxPlayers > this.config.maxPlayers)) {
            throw new Error(`Max players must be between ${this.config.minPlayers} and ${this.config.maxPlayers}`);
        }
        
        if (roomData.turnTime && (roomData.turnTime < this.config.minTurnTime || roomData.turnTime > this.config.maxTurnTime)) {
            throw new Error(`Turn time must be between ${this.config.minTurnTime} and ${this.config.maxTurnTime} seconds`);
        }
    }

    /**
     * Валидация создателя комнаты
     * @param {Object} creator - Создатель
     */
    validateCreator(creator) {
        if (!creator.id || typeof creator.id !== 'string') {
            throw new Error('Creator ID is required');
        }
    }

    /**
     * Валидация данных игрока
     * @param {Object} player - Игрок
     */
    validatePlayer(player) {
        if (!player.userId || typeof player.userId !== 'string') {
            throw new Error('Player user ID is required');
        }
    }

    /**
     * Запуск таймера периодической очистки
     */
    startCleanupTimer() {
        // Очистка каждые 2 часа
        setInterval(() => {
            this.cleanupOldRooms();
        }, 2 * 60 * 60 * 1000);
    }

    // ==================== РАБОТА С БАЗАМИ ДАННЫХ ====================

    /**
     * Сохранение комнаты в базы данных
     * @param {Object} room - Комната
     */
    async saveRoomToDatabases(room) {
        try {
            console.log('💾 RoomService: Сохранение комнаты в базы данных:', room.id);
            
            // Проверяем подключение к MongoDB
            if (databaseConfig.getStatus().isConnected) {
                // Проверяем существует ли комната в базе
                const existingRoom = await this.roomModel.findById(room.id);
                
                if (existingRoom) {
                    // Обновляем существующую комнату
                    await this.roomModel.updateRoom(room.id, room);
                    console.log('✅ RoomService: Комната обновлена в MongoDB:', room.id);
                } else {
                    // Создаем новую комнату
                    await this.roomModel.createRoom(room);
                    console.log('✅ RoomService: Комната создана в MongoDB:', room.id);
                }
            } else {
                console.log('⚠️ RoomService: MongoDB не подключена, пропускаем сохранение');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка сохранения в базы данных:', error);
        }
    }

    /**
     * Загрузка всех комнат из MongoDB
     */
    async loadRoomsFromMongoDB() {
        try {
            console.log('💾 RoomService: Загрузка комнат из MongoDB');
            
            if (!databaseConfig.getStatus().isConnected) {
                console.log('⚠️ RoomService: MongoDB не подключена, пропускаем загрузку');
                return;
            }
            
            const rooms = await this.roomModel.findAll();
            
            // Загружаем комнаты в память
            for (const room of rooms) {
                this.rooms.set(room._id, room);
            }
            
            console.log(`✅ RoomService: Загружено ${rooms.length} комнат из MongoDB`);
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка загрузки из MongoDB:', error);
        }
    }

    /**
     * Загрузка комнаты из MongoDB по ID
     * @param {string} roomId - ID комнаты
     * @returns {Object|null} Комната или null
     */
    async loadRoomFromMongoDB(roomId) {
        try {
            console.log('💾 RoomService: Загрузка комнаты из MongoDB:', roomId);
            
            if (!databaseConfig.getStatus().isConnected) {
                console.log('⚠️ RoomService: MongoDB не подключена');
                return null;
            }
            
            const room = await this.roomModel.findById(roomId);
            
            if (room) {
                // Кешируем в памяти
                this.rooms.set(roomId, room);
                console.log('✅ RoomService: Комната загружена из MongoDB:', roomId);
                return room;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка загрузки комнаты из MongoDB:', error);
            return null;
        }
    }

    /**
     * Удаление комнаты из баз данных
     * @param {string} roomId - ID комнаты
     */
    async deleteRoomFromDatabases(roomId) {
        try {
            console.log('💾 RoomService: Удаление комнаты из баз данных:', roomId);
            
            if (databaseConfig.getStatus().isConnected) {
                await this.roomModel.deleteRoom(roomId);
                console.log('✅ RoomService: Комната удалена из MongoDB:', roomId);
            } else {
                console.log('⚠️ RoomService: MongoDB не подключена, пропускаем удаление');
            }
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка удаления из баз данных:', error);
        }
    }
}

// Экспорт singleton экземпляра
const roomService = new RoomService();
module.exports = roomService;
