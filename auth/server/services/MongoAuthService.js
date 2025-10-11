/**
 * MongoAuthService - Сервис авторизации с MongoDB
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const MongooseUserModel = require('../models/MongooseUserModel');
const databaseConfig = require('../../../server/config/database');

class MongoAuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация сервиса
     */
    async init() {
        try {
            console.log('🔐 MongoAuthService: Инициализация...');
            
            // Проверяем подключение к MongoDB
            if (!databaseConfig.isConnected) {
                console.log('💾 MongoAuthService: Подключение к MongoDB...');
                await databaseConfig.connectMongoDB();
            }
            
            // Проверяем наличие JWT секрета
            if (this.jwtSecret === 'default-secret-key') {
                console.warn('⚠️ MongoAuthService: Используется дефолтный JWT секрет!');
            }

            this.isInitialized = true;
            console.log('✅ MongoAuthService: Инициализация завершена');
        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка инициализации:', error);
            throw error;
        }
    }

    /**
     * Хеширование пароля
     * @param {string} password - Пароль для хеширования
     * @returns {Promise<string>} Хеш пароля
     */
    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, this.bcryptRounds);
        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка хеширования пароля:', error);
            throw error;
        }
    }

    /**
     * Проверка пароля
     * @param {string} password - Пароль для проверки
     * @param {string} hash - Хеш пароля
     * @returns {Promise<boolean>} Результат проверки
     */
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка проверки пароля:', error);
            throw error;
        }
    }

    /**
     * Регистрация нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} Результат регистрации
     */
    async register(userData) {
        try {
            console.log('🔐 MongoAuthService: Регистрация пользователя:', userData.email);
            
            // Проверяем, существует ли пользователь
            const existingUser = await MongooseUserModel.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Пользователь с таким email уже существует');
            }

            // Хешируем пароль
            const passwordHash = await this.hashPassword(userData.password);

            // Создаем нового пользователя
            const newUser = new MongooseUserModel({
                email: userData.email.toLowerCase(),
                username: userData.username,
                passwordHash: passwordHash
            });

            await newUser.save();

            console.log('✅ MongoAuthService: Пользователь зарегистрирован:', userData.email);
            
            // Возвращаем данные без пароля
            const userResponse = newUser.toJSON();
            return {
                success: true,
                message: 'Пользователь успешно зарегистрирован',
                user: userResponse
            };

        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка регистрации:', error);
            throw error;
        }
    }

    /**
     * Авторизация пользователя
     * @param {Object} credentials - Данные для входа
     * @returns {Promise<Object>} Результат авторизации
     */
    async login(credentials) {
        try {
            console.log('🔐 MongoAuthService: Авторизация пользователя:', credentials.email);
            
            // Ищем пользователя по email
            const user = await MongooseUserModel.findByEmail(credentials.email);
            if (!user) {
                throw new Error('Неверный email или пароль');
            }

            // Проверяем пароль
            const isPasswordValid = await user.checkPassword(credentials.password);
            if (!isPasswordValid) {
                throw new Error('Неверный email или пароль');
            }

            // Обновляем время последнего входа
            await user.updateLastLogin();

            // Генерируем JWT токен
            const token = this.generateToken(user);

            console.log('✅ MongoAuthService: Пользователь авторизован:', credentials.email);
            
            // Возвращаем данные без пароля
            const userResponse = user.toJSON();
            return {
                success: true,
                message: 'Вход выполнен успешно',
                user: userResponse,
                token: token
            };

        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка авторизации:', error);
            throw error;
        }
    }

    /**
     * Генерация JWT токена
     * @param {Object} user - Объект пользователя
     * @returns {string} JWT токен
     */
    generateToken(user) {
        try {
            const payload = {
                id: user.id,
                email: user.email,
                username: user.username
            };

            return jwt.sign(payload, this.jwtSecret, { 
                expiresIn: this.jwtExpiresIn 
            });
        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка генерации токена:', error);
            throw error;
        }
    }

    /**
     * Верификация JWT токена
     * @param {string} token - JWT токен
     * @returns {Object} Данные токена
     */
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Проверяем, существует ли пользователь
            const user = await MongooseUserModel.findById(decoded.id);
            if (!user || !user.isActive) {
                throw new Error('Пользователь не найден или неактивен');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Токен истек');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Недействительный токен');
            } else {
                throw new Error('Ошибка проверки токена');
            }
        }
    }

    /**
     * Получение пользователя по токену
     * @param {string} token - JWT токен
     * @returns {Promise<Object>} Данные пользователя
     */
    async getUserByToken(token) {
        try {
            const decoded = await this.verifyToken(token);
            const user = await MongooseUserModel.findById(decoded.id);
            
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            return user.toJSON();
        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка получения пользователя по токену:', error);
            throw error;
        }
    }

    /**
     * Проверка авторизации
     * @param {string} token - JWT токен
     * @returns {Promise<boolean>} Результат проверки
     */
    async isAuthenticated(token) {
        try {
            await this.verifyToken(token);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Получение текущего пользователя
     * @param {string} token - JWT токен
     * @returns {Promise<Object>} Данные пользователя
     */
    async getCurrentUser(token) {
        try {
            return await this.getUserByToken(token);
        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка получения текущего пользователя:', error);
            throw error;
        }
    }

    /**
     * Восстановление пароля
     * @param {string} email - Email пользователя
     * @returns {Promise<Object>} Результат операции
     */
    async forgotPassword(email) {
        try {
            console.log('🔐 MongoAuthService: Восстановление пароля для:', email);
            
            const user = await MongooseUserModel.findByEmail(email);
            if (!user) {
                // Не раскрываем информацию о существовании пользователя
                return {
                    success: true,
                    message: 'Если пользователь с таким email существует, на него отправлена ссылка для восстановления'
                };
            }

            // Генерируем токен для восстановления
            const resetToken = this.generateResetToken(user.id);
            
            // TODO: Отправить email с токеном восстановления
            // В реальном приложении здесь должна быть отправка email
            
            console.log('✅ MongoAuthService: Токен восстановления сгенерирован для:', email);
            
            return {
                success: true,
                message: 'Ссылка для восстановления отправлена на ваш email'
            };

        } catch (error) {
            console.error('❌ MongoAuthService: Ошибка восстановления пароля:', error);
            throw error;
        }
    }

    /**
     * Генерация токена для восстановления пароля
     * @param {string} userId - ID пользователя
     * @returns {Object} Токен и данные
     */
    generateResetToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

        return {
            token,
            userId,
            expiresAt: expiresAt.toISOString(),
            hash: crypto.createHash('sha256').update(token).digest('hex')
        };
    }
}

// Экспорт singleton экземпляра
const mongoAuthService = new MongoAuthService();
module.exports = mongoAuthService;
