/**
 * AuthService - Сервис авторизации
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
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
            console.log('🔐 AuthService: Инициализация...');
            
            // Проверяем наличие JWT секрета
            if (this.jwtSecret === 'default-secret-key') {
                console.warn('⚠️ AuthService: Используется дефолтный JWT секрет!');
            }

            this.isInitialized = true;
            console.log('✅ AuthService: Инициализация завершена');
        } catch (error) {
            console.error('❌ AuthService: Ошибка инициализации:', error);
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
            console.error('❌ AuthService: Ошибка хеширования пароля:', error);
            throw new Error('Ошибка обработки пароля');
        }
    }

    /**
     * Проверка пароля
     * @param {string} password - Пароль для проверки
     * @param {string} hash - Хеш для сравнения
     * @returns {Promise<boolean>} Результат проверки
     */
    async comparePassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            console.error('❌ AuthService: Ошибка проверки пароля:', error);
            throw new Error('Ошибка проверки пароля');
        }
    }

    /**
     * Генерация JWT токена
     * @param {Object} payload - Данные для токена
     * @returns {string} JWT токен
     */
    generateToken(payload) {
        try {
            return jwt.sign(payload, this.jwtSecret, {
                expiresIn: this.jwtExpiresIn,
                issuer: 'aura-money-auth',
                audience: 'aura-money-game'
            });
        } catch (error) {
            console.error('❌ AuthService: Ошибка генерации токена:', error);
            throw new Error('Ошибка создания токена');
        }
    }

    /**
     * Верификация JWT токена
     * @param {string} token - JWT токен
     * @returns {Object} Данные токена
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret, {
                issuer: 'aura-money-auth',
                audience: 'aura-money-game'
            });
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
     * Декодирование JWT токена без верификации
     * @param {string} token - JWT токен
     * @returns {Object} Данные токена
     */
    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            console.error('❌ AuthService: Ошибка декодирования токена:', error);
            throw new Error('Ошибка декодирования токена');
        }
    }

    /**
     * Генерация случайного токена
     * @param {number} length - Длина токена
     * @returns {string} Случайный токен
     */
    generateRandomToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Генерация токена для восстановления пароля
     * @param {string} userId - ID пользователя
     * @returns {Object} Токен и данные
     */
    generateResetToken(userId) {
        const token = this.generateRandomToken(32);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

        return {
            token,
            userId,
            expiresAt: expiresAt.toISOString(),
            hash: crypto.createHash('sha256').update(token).digest('hex')
        };
    }

    /**
     * Проверка токена восстановления пароля
     * @param {string} token - Токен для проверки
     * @param {string} storedHash - Сохраненный хеш
     * @param {string} expiresAt - Время истечения
     * @returns {boolean} Валидность токена
     */
    verifyResetToken(token, storedHash, expiresAt) {
        try {
            // Проверка времени истечения
            if (new Date() > new Date(expiresAt)) {
                return false;
            }

            // Проверка хеша
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            return tokenHash === storedHash;
        } catch (error) {
            console.error('❌ AuthService: Ошибка проверки токена восстановления:', error);
            return false;
        }
    }

    /**
     * Создание сессии пользователя
     * @param {Object} user - Данные пользователя
     * @param {Object} options - Опции сессии
     * @returns {Object} Данные сессии
     */
    createUserSession(user, options = {}) {
        const sessionId = this.generateRandomToken();
        const token = this.generateToken({
            id: user.id,
            email: user.email,
            username: user.username,
            sessionId
        });

        return {
            sessionId,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                createdAt: user.createdAt
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 дней
            ...options
        };
    }

    /**
     * Обновление токена
     * @param {string} token - Текущий токен
     * @returns {string} Новый токен
     */
    refreshToken(token) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded) {
                throw new Error('Недействительный токен');
            }

            // Создаем новый токен с обновленными данными
            return this.generateToken({
                id: decoded.id,
                email: decoded.email,
                username: decoded.username,
                sessionId: decoded.sessionId
            });
        } catch (error) {
            console.error('❌ AuthService: Ошибка обновления токена:', error);
            throw new Error('Ошибка обновления токена');
        }
    }

    /**
     * Проверка силы пароля
     * @param {string} password - Пароль для проверки
     * @returns {Object} Результат проверки
     */
    checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            hasLower: /[a-z]/.test(password),
            hasUpper: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            noCommon: !this.isCommonPassword(password)
        };

        let score = 0;
        Object.values(checks).forEach(check => {
            if (check) score++;
        });

        let level;
        if (score < 3) {
            level = 'weak';
        } else if (score < 4) {
            level = 'fair';
        } else if (score < 5) {
            level = 'good';
        } else {
            level = 'strong';
        }

        return {
            level,
            score,
            checks,
            valid: score >= 3
        };
    }

    /**
     * Проверка на распространенные пароли
     * @param {string} password - Пароль для проверки
     * @returns {boolean} Является ли пароль распространенным
     */
    isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            '1234567890', 'password1', 'qwerty123', 'dragon', 'master',
            'hello', 'welcome', 'login', 'master', 'princess'
        ];
        
        return commonPasswords.includes(password.toLowerCase());
    }

    /**
     * Валидация email
     * @param {string} email - Email для валидации
     * @returns {boolean} Валидность email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * Валидация имени пользователя
     * @param {string} username - Имя пользователя для валидации
     * @returns {boolean} Валидность имени пользователя
     */
    validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        return usernameRegex.test(username) && !/^[0-9]/.test(username);
    }

    /**
     * Санитизация строки
     * @param {string} str - Строка для санитизации
     * @returns {string} Санитизированная строка
     */
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        
        return str
            .trim()
            .replace(/[<>]/g, '') // Удаление потенциально опасных символов
            .substring(0, 1000); // Ограничение длины
    }

    /**
     * Проверка состояния сервиса
     * @returns {Object} Статус сервиса
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            jwtConfigured: this.jwtSecret !== 'default-secret-key',
            bcryptRounds: this.bcryptRounds,
            jwtExpiresIn: this.jwtExpiresIn,
            version: '1.0.0'
        };
    }
}

module.exports = AuthService;
