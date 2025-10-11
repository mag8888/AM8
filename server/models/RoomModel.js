const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Схема игрока в комнате
 */
const PlayerSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isHost: { type: Boolean, default: false },
    isReady: { type: Boolean, default: false },
    position: { type: Number, default: 0 },
    profession: { type: String, default: null },
    joinedAt: { type: Date, default: Date.now }
}, {
    _id: false
});

/**
 * Схема состояния игры
 */
const GameStateSchema = new mongoose.Schema({
    activePlayerIndex: { type: Number, default: 0 },
    hasRolledThisTurn: { type: Boolean, default: false },
    currentPhase: { type: String, default: 'waiting' },
    turnStartTime: { type: Number, default: Date.now },
    gameStartTime: { type: Number, default: Date.now },
    diceResult: { type: Number, default: null },
    lastMove: { type: mongoose.Schema.Types.Mixed, default: null },
    turnTimer: { type: Number, default: 30000 }
}, {
    _id: false
});

/**
 * Основная схема комнаты
 */
const RoomSchema = new mongoose.Schema({
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    creatorId: { type: String, required: true },
    creatorName: { type: String, required: true },
    creatorAvatar: { type: String, default: '' },
    maxPlayers: { type: Number, required: true, min: 2, max: 8 },
    minPlayers: { type: Number, default: 2 },
    turnTime: { type: Number, required: true, min: 10, max: 120 },
    assignProfessions: { type: Boolean, default: false },
    players: [PlayerSchema],
    gameState: { type: GameStateSchema, default: null },
    isStarted: { type: Boolean, default: false },
    isFinished: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: false, // Используем свои поля createdAt/updatedAt
    versionKey: false
});

// Индексы для оптимизации запросов
RoomSchema.index({ name: 1 }, { unique: true });
RoomSchema.index({ creatorId: 1 });
RoomSchema.index({ isStarted: 1, isFinished: 1 });
RoomSchema.index({ createdAt: 1 });
RoomSchema.index({ 'players.userId': 1 });

// Middleware для обновления updatedAt
RoomSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Middleware для обновления updatedAt при findOneAndUpdate
RoomSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

const Room = mongoose.model('Room', RoomSchema);

/**
 * Класс для работы с моделью комнаты
 */
class RoomModel {
    constructor() {
        console.log('🏠 RoomModel: Инициализация...');
        console.log('✅ RoomModel: Инициализация завершена');
    }

    /**
     * Создание новой комнаты
     * @param {Object} roomData - Данные комнаты
     * @returns {Object} Созданная комната
     */
    async createRoom(roomData) {
        try {
            console.log('💾 RoomModel: Создание комнаты:', roomData.name);
            
            const room = new Room(roomData);
            await room.save();
            
            console.log('✅ RoomModel: Комната создана:', room._id);
            return room;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка создания комнаты:', error);
            throw error;
        }
    }

    /**
     * Получение комнаты по ID
     * @param {string} roomId - ID комнаты
     * @returns {Object|null} Комната или null
     */
    async findById(roomId) {
        try {
            console.log('💾 RoomModel: Поиск комнаты по ID:', roomId);
            
            const room = await Room.findById(roomId);
            
            if (room) {
                console.log('✅ RoomModel: Комната найдена:', roomId);
            } else {
                console.log('❌ RoomModel: Комната не найдена:', roomId);
            }
            
            return room;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка поиска комнаты:', error);
            return null;
        }
    }

    /**
     * Получение комнаты по имени
     * @param {string} roomName - Название комнаты
     * @returns {Object|null} Комната или null
     */
    async findByName(roomName) {
        try {
            console.log('💾 RoomModel: Поиск комнаты по имени:', roomName);
            
            const room = await Room.findOne({ name: roomName });
            
            if (room) {
                console.log('✅ RoomModel: Комната найдена по имени:', roomName);
            } else {
                console.log('❌ RoomModel: Комната не найдена по имени:', roomName);
            }
            
            return room;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка поиска комнаты по имени:', error);
            return null;
        }
    }

    /**
     * Получение всех комнат
     * @param {Object} filter - Фильтр для поиска
     * @returns {Array} Массив комнат
     */
    async findAll(filter = {}) {
        try {
            console.log('💾 RoomModel: Получение всех комнат');
            
            const rooms = await Room.find(filter)
                .sort({ createdAt: -1 })
                .lean();
            
            console.log(`✅ RoomModel: Найдено ${rooms.length} комнат`);
            return rooms;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка получения комнат:', error);
            return [];
        }
    }

    /**
     * Обновление комнаты
     * @param {string} roomId - ID комнаты
     * @param {Object} updateData - Данные для обновления
     * @returns {Object|null} Обновленная комната или null
     */
    async updateRoom(roomId, updateData) {
        try {
            console.log('💾 RoomModel: Обновление комнаты:', roomId);
            
            const room = await Room.findByIdAndUpdate(
                roomId,
                { $set: updateData },
                { new: true, runValidators: true }
            );
            
            if (room) {
                console.log('✅ RoomModel: Комната обновлена:', roomId);
            } else {
                console.log('❌ RoomModel: Комната не найдена для обновления:', roomId);
            }
            
            return room;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка обновления комнаты:', error);
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
            console.log('💾 RoomModel: Удаление комнаты:', roomId);
            
            const result = await Room.findByIdAndDelete(roomId);
            
            if (result) {
                console.log('✅ RoomModel: Комната удалена:', roomId);
                return true;
            } else {
                console.log('❌ RoomModel: Комната не найдена для удаления:', roomId);
                return false;
            }
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка удаления комнаты:', error);
            return false;
        }
    }

    /**
     * Получение комнат по статусу
     * @param {boolean} isStarted - Статус игры
     * @param {boolean} isFinished - Статус завершения
     * @returns {Array} Массив комнат
     */
    async findByStatus(isStarted, isFinished) {
        try {
            console.log('💾 RoomModel: Поиск комнат по статусу');
            
            const rooms = await Room.find({ isStarted, isFinished })
                .sort({ createdAt: -1 })
                .lean();
            
            console.log(`✅ RoomModel: Найдено ${rooms.length} комнат со статусом`);
            return rooms;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка поиска комнат по статусу:', error);
            return [];
        }
    }

    /**
     * Получение комнат по создателю
     * @param {string} creatorId - ID создателя
     * @returns {Array} Массив комнат
     */
    async findByCreator(creatorId) {
        try {
            console.log('💾 RoomModel: Поиск комнат по создателю:', creatorId);
            
            const rooms = await Room.find({ creatorId })
                .sort({ createdAt: -1 })
                .lean();
            
            console.log(`✅ RoomModel: Найдено ${rooms.length} комнат создателя`);
            return rooms;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка поиска комнат по создателю:', error);
            return [];
        }
    }

    /**
     * Получение комнат по игроку
     * @param {string} userId - ID игрока
     * @returns {Array} Массив комнат
     */
    async findByPlayer(userId) {
        try {
            console.log('💾 RoomModel: Поиск комнат по игроку:', userId);
            
            const rooms = await Room.find({ 'players.userId': userId })
                .sort({ createdAt: -1 })
                .lean();
            
            console.log(`✅ RoomModel: Найдено ${rooms.length} комнат игрока`);
            return rooms;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка поиска комнат по игроку:', error);
            return [];
        }
    }

    /**
     * Очистка старых комнат
     * @param {Date} cutoffDate - Дата отсечения
     * @returns {number} Количество удаленных комнат
     */
    async cleanupOldRooms(cutoffDate) {
        try {
            console.log('💾 RoomModel: Очистка старых комнат');
            
            const result = await Room.deleteMany({
                createdAt: { $lt: cutoffDate },
                isStarted: false
            });
            
            console.log(`✅ RoomModel: Удалено ${result.deletedCount} старых комнат`);
            return result.deletedCount;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка очистки старых комнат:', error);
            return 0;
        }
    }

    /**
     * Получение статистики комнат
     * @returns {Object} Статистика
     */
    async getStats() {
        try {
            console.log('💾 RoomModel: Получение статистики комнат');
            
            const stats = await Room.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRooms: { $sum: 1 },
                        activeRooms: {
                            $sum: { $cond: [{ $eq: ['$isFinished', false] }, 1, 0] }
                        },
                        startedGames: {
                            $sum: { 
                                $cond: [
                                    { $and: [{ $eq: ['$isStarted', true] }, { $eq: ['$isFinished', false] }] }, 
                                    1, 
                                    0
                                ] 
                            }
                        },
                        totalPlayers: { $sum: { $size: '$players' } },
                        averagePlayersPerRoom: { $avg: { $size: '$players' } }
                    }
                }
            ]);
            
            const result = stats[0] || {
                totalRooms: 0,
                activeRooms: 0,
                startedGames: 0,
                totalPlayers: 0,
                averagePlayersPerRoom: 0
            };
            
            console.log('✅ RoomModel: Статистика получена');
            return result;
            
        } catch (error) {
            console.error('❌ RoomModel: Ошибка получения статистики:', error);
            return {
                totalRooms: 0,
                activeRooms: 0,
                startedGames: 0,
                totalPlayers: 0,
                averagePlayersPerRoom: 0
            };
        }
    }
}

module.exports = RoomModel;
