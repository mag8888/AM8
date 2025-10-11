/**
 * MongooseUserModel - Модель пользователя для MongoDB
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    passwordHash: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerified: {
        type: Boolean,
        default: false
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
            enum: ['light', 'dark']
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
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Индексы для оптимизации поиска
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Виртуальное поле для ID
userSchema.virtual('id').get(function() {
    return this._id.toString();
});

// Преобразование в JSON
userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
    }
});

// Метод для проверки пароля
userSchema.methods.checkPassword = async function(password) {
    try {
        return await bcrypt.compare(password, this.passwordHash);
    } catch (error) {
        console.error('❌ MongooseUserModel: Ошибка проверки пароля:', error);
        throw error;
    }
};

// Метод для обновления последнего входа
userSchema.methods.updateLastLogin = async function() {
    try {
        this.lastLogin = new Date();
        await this.save();
        return this;
    } catch (error) {
        console.error('❌ MongooseUserModel: Ошибка обновления lastLogin:', error);
        throw error;
    }
};

// Статический метод для поиска по email
userSchema.statics.findByEmail = async function(email) {
    try {
        return await this.findOne({ email: email.toLowerCase() });
    } catch (error) {
        console.error('❌ MongooseUserModel: Ошибка поиска по email:', error);
        throw error;
    }
};

// Статический метод для поиска по username
userSchema.statics.findByUsername = async function(username) {
    try {
        return await this.findOne({ username: username });
    } catch (error) {
        console.error('❌ MongooseUserModel: Ошибка поиска по username:', error);
        throw error;
    }
};

// Middleware для хеширования пароля перед сохранением
userSchema.pre('save', async function(next) {
    try {
        // Хешируем пароль только если он был изменен
        if (!this.isModified('passwordHash')) {
            return next();
        }
        
        // Пароль уже должен быть хеширован на уровне сервиса
        next();
    } catch (error) {
        console.error('❌ MongooseUserModel: Ошибка pre-save middleware:', error);
        next(error);
    }
});

// Создание модели
const MongooseUserModel = mongoose.model('User', userSchema);

module.exports = MongooseUserModel;
