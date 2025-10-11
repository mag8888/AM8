/**
 * ValidationService - Сервис валидации данных
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

export class ValidationService {
    constructor() {
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            username: /^[a-zA-Z0-9_-]{3,30}$/,
            password: {
                minLength: 4,
                maxLength: 128,
                hasLetter: /[a-zA-Z]/,
                hasNumber: /[0-9]/,
                hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
            }
        };
        
        this.messages = {
            email: {
                required: 'Email обязателен',
                invalid: 'Введите корректный email адрес',
                tooLong: 'Email слишком длинный (максимум 254 символа)'
            },
            username: {
                required: 'Имя пользователя обязательно',
                tooShort: 'Минимум 3 символа',
                tooLong: 'Максимум 30 символов',
                invalid: 'Только буквы, цифры, дефисы и подчеркивания',
                startsWithNumber: 'Не может начинаться с цифры'
            },
            password: {
                required: 'Пароль обязателен',
                tooShort: 'Минимум 4 символа',
                tooLong: 'Максимум 128 символов',
                weak: 'Пароль слишком слабый'
            },
            confirmPassword: {
                required: 'Подтверждение пароля обязательно',
                mismatch: 'Пароли не совпадают'
            },
            agreeTerms: {
                required: 'Необходимо согласиться с условиями'
            }
        };
        
        console.log('✅ ValidationService: Инициализирован');
    }

    /**
     * Валидация email
     * @param {string} email - Email для валидации
     * @returns {Object} Результат валидации
     */
    validateEmail(email) {
        const result = {
            valid: true,
            errors: [],
            strength: 'none'
        };

        if (!email) {
            result.valid = false;
            result.errors.push(this.messages.email.required);
            return result;
        }

        if (email.length > 254) {
            result.valid = false;
            result.errors.push(this.messages.email.tooLong);
            return result;
        }

        if (!this.patterns.email.test(email)) {
            result.valid = false;
            result.errors.push(this.messages.email.invalid);
            return result;
        }

        return result;
    }

    /**
     * Валидация имени пользователя
     * @param {string} username - Имя пользователя для валидации
     * @returns {Object} Результат валидации
     */
    validateUsername(username) {
        const result = {
            valid: true,
            errors: [],
            strength: 'none'
        };

        if (!username) {
            result.valid = false;
            result.errors.push(this.messages.username.required);
            return result;
        }

        if (username.length < 3) {
            result.valid = false;
            result.errors.push(this.messages.username.tooShort);
            return result;
        }

        if (username.length > 30) {
            result.valid = false;
            result.errors.push(this.messages.username.tooLong);
            return result;
        }

        if (/^[0-9]/.test(username)) {
            result.valid = false;
            result.errors.push(this.messages.username.startsWithNumber);
            return result;
        }

        if (!this.patterns.username.test(username)) {
            result.valid = false;
            result.errors.push(this.messages.username.invalid);
            return result;
        }

        return result;
    }

    /**
     * Валидация пароля
     * @param {string} password - Пароль для валидации
     * @returns {Object} Результат валидации
     */
    validatePassword(password) {
        const result = {
            valid: true,
            errors: [],
            strength: 'weak',
            score: 0
        };

        if (!password) {
            result.valid = false;
            result.errors.push(this.messages.password.required);
            result.strength = 'none';
            return result;
        }

        if (password.length < this.patterns.password.minLength) {
            result.valid = false;
            result.errors.push(this.messages.password.tooShort);
            result.strength = 'weak';
            return result;
        }

        if (password.length > this.patterns.password.maxLength) {
            result.valid = false;
            result.errors.push(this.messages.password.tooLong);
            return result;
        }

        // Анализ силы пароля
        const strength = this.calculatePasswordStrength(password);
        result.strength = strength.level;
        result.score = strength.score;

        if (strength.level === 'weak') {
            result.valid = false;
            result.errors.push(this.messages.password.weak);
        }

        return result;
    }

    /**
     * Валидация подтверждения пароля
     * @param {string} password - Исходный пароль
     * @param {string} confirmPassword - Подтверждение пароля
     * @returns {Object} Результат валидации
     */
    validateConfirmPassword(password, confirmPassword) {
        const result = {
            valid: true,
            errors: []
        };

        if (!confirmPassword) {
            result.valid = false;
            result.errors.push(this.messages.confirmPassword.required);
            return result;
        }

        if (password !== confirmPassword) {
            result.valid = false;
            result.errors.push(this.messages.confirmPassword.mismatch);
            return result;
        }

        return result;
    }

    /**
     * Валидация согласия с условиями
     * @param {boolean} agree - Согласие с условиями
     * @returns {Object} Результат валидации
     */
    validateAgreeTerms(agree) {
        const result = {
            valid: true,
            errors: []
        };

        if (!agree) {
            result.valid = false;
            result.errors.push(this.messages.agreeTerms.required);
        }

        return result;
    }

    /**
     * Валидация формы регистрации
     * @param {Object} formData - Данные формы
     * @returns {Object} Результат валидации
     */
    validateRegistrationForm(formData) {
        const result = {
            valid: true,
            errors: {},
            fieldErrors: {}
        };

        // Валидация имени пользователя
        const usernameValidation = this.validateUsername(formData.username);
        if (!usernameValidation.valid) {
            result.valid = false;
            result.fieldErrors.username = usernameValidation.errors;
        }

        // Валидация email
        const emailValidation = this.validateEmail(formData.email);
        if (!emailValidation.valid) {
            result.valid = false;
            result.fieldErrors.email = emailValidation.errors;
        }

        // Валидация пароля
        const passwordValidation = this.validatePassword(formData.password);
        if (!passwordValidation.valid) {
            result.valid = false;
            result.fieldErrors.password = passwordValidation.errors;
        }

        // Валидация подтверждения пароля
        const confirmPasswordValidation = this.validateConfirmPassword(formData.password, formData.confirmPassword);
        if (!confirmPasswordValidation.valid) {
            result.valid = false;
            result.fieldErrors.confirmPassword = confirmPasswordValidation.errors;
        }

        // Валидация согласия с условиями
        const agreeTermsValidation = this.validateAgreeTerms(formData.agreeTerms);
        if (!agreeTermsValidation.valid) {
            result.valid = false;
            result.fieldErrors.agreeTerms = agreeTermsValidation.errors;
        }

        return result;
    }

    /**
     * Валидация формы входа
     * @param {Object} formData - Данные формы
     * @returns {Object} Результат валидации
     */
    validateLoginForm(formData) {
        const result = {
            valid: true,
            errors: {},
            fieldErrors: {}
        };

        // Валидация email
        const emailValidation = this.validateEmail(formData.email);
        if (!emailValidation.valid) {
            result.valid = false;
            result.fieldErrors.email = emailValidation.errors;
        }

        // Валидация пароля (базовая)
        if (!formData.password) {
            result.valid = false;
            result.fieldErrors.password = [this.messages.password.required];
        }

        return result;
    }

    /**
     * Валидация формы восстановления пароля
     * @param {Object} formData - Данные формы
     * @returns {Object} Результат валидации
     */
    validateForgotPasswordForm(formData) {
        const result = {
            valid: true,
            errors: {},
            fieldErrors: {}
        };

        // Валидация email
        const emailValidation = this.validateEmail(formData.email);
        if (!emailValidation.valid) {
            result.valid = false;
            result.fieldErrors.email = emailValidation.errors;
        }

        return result;
    }

    /**
     * Расчет силы пароля
     * @param {string} password - Пароль для анализа
     * @returns {Object} Уровень силы и балл
     */
    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            hasLower: /[a-z]/.test(password),
            hasUpper: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            noCommon: !this.isCommonPassword(password)
        };

        // Подсчет баллов
        if (checks.length) score += 2;
        if (checks.hasLower) score += 1;
        if (checks.hasUpper) score += 1;
        if (checks.hasNumber) score += 1;
        if (checks.hasSpecial) score += 2;
        if (checks.noCommon) score += 1;

        // Определение уровня
        let level;
        if (score < 3) {
            level = 'weak';
        } else if (score < 5) {
            level = 'fair';
        } else if (score < 7) {
            level = 'good';
        } else {
            level = 'strong';
        }

        return { level, score, checks };
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
            '1234567890', 'password1', 'qwerty123', 'dragon', 'master'
        ];
        
        return commonPasswords.includes(password.toLowerCase());
    }

    /**
     * Санитизация входных данных
     * @param {string} input - Входная строка
     * @returns {string} Очищенная строка
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Удаление потенциально опасных символов
            .substring(0, 1000); // Ограничение длины
    }

    /**
     * Валидация и санитизация объекта
     * @param {Object} data - Данные для обработки
     * @returns {Object} Обработанные данные
     */
    sanitizeObject(data) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeInput(value);
            } else if (typeof value === 'boolean') {
                sanitized[key] = value;
            } else if (typeof value === 'number') {
                sanitized[key] = value;
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Получение сообщения об ошибке для поля
     * @param {string} field - Название поля
     * @param {string} errorType - Тип ошибки
     * @returns {string} Сообщение об ошибке
     */
    getErrorMessage(field, errorType) {
        if (this.messages[field] && this.messages[field][errorType]) {
            return this.messages[field][errorType];
        }
        return 'Неизвестная ошибка';
    }

    /**
     * Проверка валидности URL
     * @param {string} url - URL для проверки
     * @returns {boolean} Валиден ли URL
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Проверка валидности номера телефона
     * @param {string} phone - Номер телефона
     * @returns {boolean} Валиден ли номер
     */
    isValidPhone(phone) {
        const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
        return phonePattern.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
}

// Создаем глобальный экземпляр сервиса
export const validationService = new ValidationService();

// Экспортируем для использования в других модулях
export default validationService;
