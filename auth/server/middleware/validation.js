/**
 * Validation Middleware - Middleware для валидации данных
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

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

module.exports = {
    validateEmail,
    validatePassword,
    validateUsername
};
