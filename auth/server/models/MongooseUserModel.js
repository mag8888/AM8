/**
 * MongooseUserModel - Модель пользователя для MongoDB Atlas
 * Версия: 1.0.0
 * Дата: 12 октября 2024
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Схема пользователя
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 254,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Неверный формат email']
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        match: [/^[a-zA-Z0-9_-]+$/, 'Имя пользователя может содержать только буквы, цифры, дефисы и подчеркивания']
    },
    passwordHash: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    stats: {
        gamesPlayed: {
            type: Number,
            default: 0
        },
        totalWins: {
            type: Number,
            default: 0
        },
        totalEarnings: {
            type: Number,
            default: 0
        },
        totalTimePlayed: {
            type: Number,
            default: 0
        }
    },
    preferences: {
        theme: {
            type: String,
            default: 'dark',
            enum: ['dark', 'light']
        },
        language: {
            type: String,
            default: 'ru',
            enum: ['ru', 'en']
        },
        notifications: {
            type: Boolean,
            default: true
        },
        soundEnabled: {
            type: Boolean,
            default: true
        }
    },
    profile: {
        avatar: {
            type: String,
            default: null
        },
        bio: {
            type: String,
            default: '',
            maxlength: 500
        },
        location: {
            type: String,
            default: '',
            maxlength: 100
        },
        website: {
            type: String,
            default: '',
            maxlength: 200
        }
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Индексы для оптимизации запросов
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ 'stats.gamesPlayed': -1 });

// Виртуальное поле для ID
userSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Преобразование в JSON
userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
    }
});

// Преобразование в объект
userSchema.set('toObject', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
    }
});

class MongooseUserModel {
    constructor() {
        this.User = mongoose.model('User', userSchema);
        this.isInitialized = false;
        this.init();
    }

    /**
     * Инициализация модели
     */
    async init() {
        try {
            console.log('👤 MongooseUserModel: Инициализация...');
            
            // Проверяем подключение к базе данных
            if (mongoose.connection.readyState !== 1) {
                throw new Error('База данных не подключена');
            }

            this.isInitialized = true;
            console.log('✅ MongooseUserModel: Инициализация завершена');
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка инициализации:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Создание нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} Созданный пользователь
     */
    async createUser(userData) {
        try {
            const user = new this.User({
                email: userData.email,
                username: userData.username,
                passwordHash: userData.passwordHash
            });

            const savedUser = await user.save();
            console.log('✅ MongooseUserModel: Пользователь создан:', savedUser.email);
            return savedUser;
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка создания пользователя:', error);
            throw error;
        }
    }

    /**
     * Поиск пользователя по email
     * @param {string} email - Email пользователя
     * @returns {Promise<Object|null>} Найденный пользователь
     */
    async findByEmail(email) {
        try {
            return await this.User.findOne({ email: email.toLowerCase() });
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка поиска по email:', error);
            return null;
        }
    }

    /**
     * Поиск пользователя по username
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object|null>} Найденный пользователь
     */
    async findByUsername(username) {
        try {
            return await this.User.findOne({ username });
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка поиска по username:', error);
            return null;
        }
    }

    /**
     * Поиск пользователя по ID
     * @param {string} id - ID пользователя
     * @returns {Promise<Object|null>} Найденный пользователь
     */
    async findById(id) {
        try {
            return await this.User.findById(id);
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка поиска по ID:', error);
            return null;
        }
    }

    /**
     * Обновление пользователя
     * @param {string} id - ID пользователя
     * @param {Object} updateData - Данные для обновления
     * @returns {Promise<Object|null>} Обновленный пользователь
     */
    async updateUser(id, updateData) {
        try {
            const updatedUser = await this.User.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (updatedUser) {
                console.log('✅ MongooseUserModel: Пользователь обновлен:', id);
            }
            return updatedUser;
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    /**
     * Удаление пользователя
     * @param {string} id - ID пользователя
     * @returns {Promise<boolean>} Успешность удаления
     */
    async deleteUser(id) {
        try {
            const result = await this.User.findByIdAndDelete(id);
            if (result) {
                console.log('✅ MongooseUserModel: Пользователь удален:', id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка удаления пользователя:', error);
            return false;
        }
    }

    /**
     * Проверка уникальности email
     * @param {string} email - Email для проверки
     * @param {string} excludeId - ID пользователя для исключения
     * @returns {Promise<boolean>} Уникален ли email
     */
    async isEmailUnique(email, excludeId = null) {
        try {
            const query = { email: email.toLowerCase() };
            if (excludeId) {
                query._id = { $ne: excludeId };
            }
            const user = await this.User.findOne(query);
            return !user;
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка проверки email:', error);
            return false;
        }
    }

    /**
     * Проверка уникальности username
     * @param {string} username - Username для проверки
     * @param {string} excludeId - ID пользователя для исключения
     * @returns {Promise<boolean>} Уникален ли username
     */
    async isUsernameUnique(username, excludeId = null) {
        try {
            const query = { username };
            if (excludeId) {
                query._id = { $ne: excludeId };
            }
            const user = await this.User.findOne(query);
            return !user;
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка проверки username:', error);
            return false;
        }
    }

    /**
     * Обновление времени последнего входа
     * @param {string} id - ID пользователя
     * @returns {Promise<Object|null>} Обновленный пользователь
     */
    async updateLastLogin(id) {
        try {
            return await this.updateUser(id, {
                lastLogin: new Date()
            });
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка обновления времени входа:', error);
            return null;
        }
    }

    /**
     * Получение профиля пользователя (публичные данные)
     * @param {string} id - ID пользователя
     * @returns {Promise<Object|null>} Профиль пользователя
     */
    async getUserProfile(id) {
        try {
            return await this.User.findById(id).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка получения профиля:', error);
            return null;
        }
    }

    /**
     * Поиск пользователей
     * @param {Object} query - Параметры поиска
     * @returns {Promise<Array>} Массив найденных пользователей
     */
    async searchUsers(query) {
        try {
            const { username, email, limit = 10, offset = 0 } = query;
            const searchQuery = {};

            if (username) {
                searchQuery.username = { $regex: username, $options: 'i' };
            }

            if (email) {
                searchQuery.email = { $regex: email, $options: 'i' };
            }

            return await this.User.find(searchQuery)
                .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
                .limit(limit)
                .skip(offset)
                .sort({ createdAt: -1 });
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка поиска пользователей:', error);
            return [];
        }
    }

    /**
     * Получение всех пользователей
     * @param {Object} options - Опции запроса
     * @returns {Promise<Array>} Массив пользователей
     */
    async getAllUsers(options = {}) {
        try {
            const { limit = 50, offset = 0, activeOnly = false } = options;
            const query = activeOnly ? { isActive: true } : {};

            return await this.User.find(query)
                .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
                .limit(limit)
                .skip(offset)
                .sort({ createdAt: -1 });
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка получения пользователей:', error);
            return [];
        }
    }

    /**
     * Получение статистики модели
     * @returns {Object} Статистика
     */
    async getStats() {
        try {
            const totalUsers = await this.User.countDocuments();
            const activeUsers = await this.User.countDocuments({ isActive: true });
            const verifiedUsers = await this.User.countDocuments({ emailVerified: true });
            
            const totalGamesResult = await this.User.aggregate([
                { $group: { _id: null, totalGames: { $sum: '$stats.gamesPlayed' } } }
            ]);
            const totalGames = totalGamesResult.length > 0 ? totalGamesResult[0].totalGames : 0;

            return {
                totalUsers,
                activeUsers,
                verifiedUsers,
                totalGames
            };
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка получения статистики:', error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                verifiedUsers: 0,
                totalGames: 0
            };
        }
    }

    /**
     * Миграция данных из JSON файла
     * @param {Array} usersData - Массив пользователей из JSON
     * @returns {Promise<Object>} Результат миграции
     */
    async migrateFromJson(usersData) {
        try {
            console.log('🔄 MongooseUserModel: Начинаем миграцию данных...');
            
            let migrated = 0;
            let errors = 0;

            for (const [id, userData] of usersData) {
                try {
                    // Проверяем, существует ли пользователь
                    const existingUser = await this.findByEmail(userData.email);
                    if (existingUser) {
                        console.log(`⚠️ MongooseUserModel: Пользователь ${userData.email} уже существует, пропускаем`);
                        continue;
                    }

                    // Создаем нового пользователя
                    await this.createUser({
                        email: userData.email,
                        username: userData.username,
                        passwordHash: userData.passwordHash
                    });

                    migrated++;
                } catch (error) {
                    console.error(`❌ MongooseUserModel: Ошибка миграции пользователя ${userData.email}:`, error);
                    errors++;
                }
            }

            console.log(`✅ MongooseUserModel: Миграция завершена. Мигрировано: ${migrated}, Ошибок: ${errors}`);
            
            return {
                success: true,
                migrated,
                errors,
                total: usersData.length
            };
        } catch (error) {
            console.error('❌ MongooseUserModel: Ошибка миграции:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = MongooseUserModel;