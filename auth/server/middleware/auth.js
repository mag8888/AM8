/**
 * Auth Middleware - Middleware для авторизации и безопасности
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

/**
 * Middleware для проверки JWT токена
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Токен доступа не предоставлен'
            });
        }

        // Проверка токена
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return res.status(500).json({
                success: false,
                message: 'JWT_SECRET не настроен в переменных окружения'
            });
        }
        jwt.verify(token, jwtSecret, (err, user) => {
            if (err) {
                console.log('❌ Auth: Недействительный токен:', err.message);
                return res.status(403).json({
                    success: false,
                    message: 'Недействительный токен'
                });
            }

            req.user = user;
            next();
        });

    } catch (error) {
        console.error('❌ Auth: Ошибка проверки токена:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка проверки авторизации'
        });
    }
};

/**
 * Middleware для валидации входных данных
 * @param {Array} requiredFields - Обязательные поля
 * @returns {Function} Middleware функция
 */
const validateInput = (requiredFields = []) => {
    return (req, res, next) => {
        try {
            const errors = [];

            // Проверка обязательных полей
            requiredFields.forEach(field => {
                if (!req.body[field] || req.body[field].toString().trim() === '') {
                    errors.push(`${field} обязательно для заполнения`);
                }
            });

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверные входные данные',
                    errors
                });
            }

            // Санитизация данных
            req.body = sanitizeObject(req.body);
            next();

        } catch (error) {
            console.error('❌ Auth: Ошибка валидации:', error);
            res.status(400).json({
                success: false,
                message: 'Ошибка валидации данных'
            });
        }
    };
};

/**
 * Санитизация объекта
 * @param {Object} obj - Объект для санитизации
 * @returns {Object} Санитизированный объект
 */
const sanitizeObject = (obj) => {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
};

/**
 * Санитизация строки
 * @param {string} str - Строка для санитизации
 * @returns {string} Санитизированная строка
 */
const sanitizeString = (str) => {
    return str
        .trim()
        .replace(/[<>]/g, '') // Удаление потенциально опасных символов
        .substring(0, 1000); // Ограничение длины
};

/**
 * Валидация email
 * @param {string} email - Email для валидации
 * @returns {Object} Результат валидации
 */
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const result = {
        valid: true,
        errors: []
    };

    if (!email) {
        result.valid = false;
        result.errors.push('Email обязателен');
        return result;
    }

    if (email.length > 254) {
        result.valid = false;
        result.errors.push('Email слишком длинный');
        return result;
    }

    if (!emailRegex.test(email)) {
        result.valid = false;
        result.errors.push('Неверный формат email');
        return result;
    }

    return result;
};

/**
 * Валидация пароля
 * @param {string} password - Пароль для валидации
 * @returns {Object} Результат валидации
 */
const validatePassword = (password) => {
    const result = {
        valid: true,
        errors: []
    };

    if (!password) {
        result.valid = false;
        result.errors.push('Пароль обязателен');
        return result;
    }

    if (password.length < 4) {
        result.valid = false;
        result.errors.push('Пароль должен содержать минимум 4 символа');
        return result;
    }

    if (password.length > 128) {
        result.valid = false;
        result.errors.push('Пароль слишком длинный');
        return result;
    }

    return result;
};

/**
 * Валидация имени пользователя
 * @param {string} username - Имя пользователя для валидации
 * @returns {Object} Результат валидации
 */
const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    
    const result = {
        valid: true,
        errors: []
    };

    if (!username) {
        result.valid = false;
        result.errors.push('Имя пользователя обязательно');
        return result;
    }

    if (username.length < 3) {
        result.valid = false;
        result.errors.push('Имя пользователя должно содержать минимум 3 символа');
        return result;
    }

    if (username.length > 30) {
        result.valid = false;
        result.errors.push('Имя пользователя должно содержать максимум 30 символов');
        return result;
    }

    if (!usernameRegex.test(username)) {
        result.valid = false;
        result.errors.push('Имя пользователя может содержать только буквы, цифры, дефисы и подчеркивания');
        return result;
    }

    if (/^[0-9]/.test(username)) {
        result.valid = false;
        result.errors.push('Имя пользователя не может начинаться с цифры');
        return result;
    }

    return result;
};

/**
 * Rate limiting для авторизации
 */
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // 5 попыток
    message: {
        success: false,
        message: 'Слишком много попыток авторизации, попробуйте через 15 минут'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

/**
 * Rate limiting для регистрации
 */
const registerRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3, // 3 попытки в час
    message: {
        success: false,
        message: 'Слишком много попыток регистрации, попробуйте через час'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Middleware для логирования запросов
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log(`${timestamp} ${method} ${url} - ${ip} - ${userAgent}`);

    // Счетчик запросов
    const requestCount = req.app.get('requestCount') || 0;
    req.app.set('requestCount', requestCount + 1);

    next();
};

/**
 * Middleware для обработки ошибок
 * @param {Object} err - Ошибка
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Auth: Ошибка middleware:', err);

    // Счетчик ошибок
    const errorCount = req.app.get('errorCount') || 0;
    req.app.set('errorCount', errorCount + 1);

    // В зависимости от типа ошибки
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Ошибка валидации данных',
            errors: [err.message]
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Неавторизованный доступ'
        });
    }

    if (err.name === 'ForbiddenError') {
        return res.status(403).json({
            success: false,
            message: 'Доступ запрещен'
        });
    }

    // Общая ошибка сервера
    res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера'
    });
};

/**
 * Middleware для проверки CORS
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const corsHandler = (req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['http://localhost:8000', 'http://127.0.0.1:8000'];

    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

module.exports = {
    authenticateToken,
    validateInput,
    validateEmail,
    validatePassword,
    validateUsername,
    authRateLimit,
    registerRateLimit,
    requestLogger,
    errorHandler,
    corsHandler,
    sanitizeObject,
    sanitizeString
};
