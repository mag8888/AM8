/**
 * Главный модуль управления авторизацией
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

// Модули загружаются как глобальные объекты

class AuthManager {
    constructor() {
        this.currentForm = 'login';
        this.isLoading = false;
        this.forms = {
            login: document.getElementById('login-form'),
            register: document.getElementById('register-form'),
            forgot: document.getElementById('forgot-form')
        };
        
        this.init();
    }

    /**
     * Инициализация менеджера авторизации
     */
    async init() {
        try {
            console.log('🚀 AuthManager: Инициализация...');
            
            // Инициализируем сервисы
            await Promise.all([
                window.window.authService.init(),
                window.userModel.init()
            ]);

            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            // Проверяем авторизацию
            if (window.window.authService.isAuthenticated()) {
                this.handleAuthenticatedUser();
            }
            
            // Инициализируем роутер если доступен
            if (typeof window.Router !== 'undefined') {
                this.initRouter();
            }

            console.log('✅ AuthManager: Инициализация завершена');
        } catch (error) {
            console.error('❌ AuthManager: Ошибка инициализации:', error);
            window.window.notificationService.error('Ошибка инициализации системы');
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Переключение форм
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('register');
        });

        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('login');
        });

        document.getElementById('forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('forgot');
        });

        document.getElementById('back-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('login');
        });

        // Кнопки заполнения тестовыми данными для формы входа
        document.getElementById('fill-test-data-1')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.fillTestData('roman');
        });

        document.getElementById('fill-test-data-2')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.fillTestData('testuser');
        });

        document.getElementById('fill-test-data-3')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.fillTestData('admin');
        });

        // Кнопки заполнения тестовыми данными для формы регистрации
        document.getElementById('fill-test-data-register-1')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.fillTestData('roman');
        });

        document.getElementById('fill-test-data-register-2')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.fillTestData('testuser');
        });

        document.getElementById('fill-test-data-register-3')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.fillTestData('admin');
        });

        // Обработчики форм
        this.setupFormHandlers();

        // Обработчики полей
        this.setupFieldHandlers();

        // Обработчики клавиатуры
        this.setupKeyboardHandlers();
    }

    /**
     * Настройка обработчиков форм
     */
    setupFormHandlers() {
        // Форма входа
        const loginForm = this.forms.login?.querySelector('form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e);
            });
        }

        // Форма регистрации
        const registerForm = this.forms.register?.querySelector('form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(e);
            });
        }

        // Форма восстановления пароля
        const forgotForm = this.forms.forgot?.querySelector('form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(e);
            });
        }
    }

    /**
     * Настройка обработчиков полей
     */
    setupFieldHandlers() {
        // Валидация в реальном времени
        this.setupRealTimeValidation();

        // Индикатор силы пароля
        this.setupPasswordStrengthIndicator();

        // Автозаполнение
        this.setupAutofillHandlers();
    }

    /**
     * Настройка валидации в реальном времени
     */
    setupRealTimeValidation() {
        // Email поля
        document.querySelectorAll('input[type="email"]').forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input, 'email');
            });
        });

        // Username поля
        document.querySelectorAll('input[name="username"]').forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input, 'username');
            });
        });

        // Пароли
        document.querySelectorAll('input[name="password"]').forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input, 'password');
            });
        });

        // Подтверждение пароля
        const confirmPassword = document.getElementById('register-confirm-password');
        if (confirmPassword) {
            confirmPassword.addEventListener('blur', () => {
                this.validateConfirmPassword();
            });
        }
    }

    /**
     * Настройка индикатора силы пароля
     */
    setupPasswordStrengthIndicator() {
        const passwordInput = document.getElementById('register-password');
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        if (passwordInput && strengthBar && strengthText) {
            passwordInput.addEventListener('input', (e) => {
                const strength = window.validationService.calculatePasswordStrength(e.target.value);
                
                strengthBar.className = `strength-fill ${strength.level}`;
                strengthText.textContent = this.getStrengthText(strength.level);
            });
        }
    }

    /**
     * Настройка автозаполнения
     */
    setupAutofillHandlers() {
        // Проверяем автозаполнение
        setTimeout(() => {
            document.querySelectorAll('input').forEach(input => {
                if (input.value) {
                    input.classList.add('filled');
                }
            });
        }, 100);
    }

    /**
     * Настройка обработчиков клавиатуры
     */
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            // Escape для закрытия уведомлений
            if (e.key === 'Escape') {
                window.notificationService.hideAll();
            }

            // Enter для отправки форм
            if (e.key === 'Enter' && e.ctrlKey) {
                const activeForm = document.querySelector('.auth-form.active form');
                if (activeForm) {
                    activeForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    /**
     * Переключение между формами
     * @param {string} formName - Название формы
     */
    switchForm(formName) {
        if (this.isLoading) return;

        // Скрываем все формы
        Object.values(this.forms).forEach(form => {
            if (form) {
                form.classList.remove('active');
            }
        });

        // Показываем нужную форму
        if (this.forms[formName]) {
            this.forms[formName].classList.add('active');
            this.currentForm = formName;
            
            // Очищаем ошибки
            this.clearAllErrors();
            
            // Фокус на первом поле
            const firstInput = this.forms[formName].querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }

            console.log(`📝 AuthManager: Переключение на форму ${formName}`);
        }
    }

    /**
     * Получение тестовых данных пользователя
     * @param {string} userType - Тип пользователя
     * @returns {Object} Данные пользователя
     */
    getTestUserData(userType) {
        const testUsers = {
            roman: {
                username: 'Roman',
                email: 'Roman@Roman.com',
                password: 'password123'
            },
            testuser: {
                username: 'TestUser',
                email: 'test@example.com',
                password: 'testpass123'
            },
            admin: {
                username: 'Admin',
                email: 'admin@example.com',
                password: 'admin123'
            }
        };
        
        return testUsers[userType] || testUsers.roman;
    }

    /**
     * Заполнение полей тестовыми данными
     * @param {string} userType - Тип пользователя: 'roman', 'testuser', 'admin'
     */
    fillTestData(userType = 'roman') {
        // Определяем данные пользователя
        const userData = this.getTestUserData(userType);
        if (this.currentForm === 'login') {
            // Заполняем форму входа
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            
            if (emailInput && passwordInput) {
                emailInput.value = userData.email;
                passwordInput.value = userData.password;
                
                // Убираем ошибки валидации
                emailInput.classList.remove('error');
                passwordInput.classList.remove('error');
                
                // Очищаем сообщения об ошибках
                const emailError = document.getElementById('login-email-error');
                const passwordError = document.getElementById('login-password-error');
                
                if (emailError) emailError.textContent = '';
                if (passwordError) passwordError.textContent = '';
                
                // Фокус на кнопку входа
                const loginButton = document.querySelector('#login-form .auth-button.primary');
                if (loginButton) {
                    loginButton.focus();
                }
                
                window.notificationService.success(`Поля заполнены данными пользователя ${userData.username}`);
                console.log(`🧪 AuthManager: Заполнены тестовые данные для входа (${userType})`);
            }
        } else if (this.currentForm === 'register') {
            // Заполняем форму регистрации
            const usernameInput = document.getElementById('register-username');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const confirmPasswordInput = document.getElementById('register-confirm-password');
            const agreeTermsCheckbox = document.getElementById('agree-terms');
            
            if (usernameInput && emailInput && passwordInput && confirmPasswordInput) {
                // Для регистрации создаем уникальные данные
                const timestamp = Date.now();
                const uniqueUsername = userType === 'admin' ? 'Admin' : 
                                     userType === 'testuser' ? 'TestUser' : 'Roman';
                
                usernameInput.value = `${uniqueUsername}_${timestamp}`;
                emailInput.value = userType === 'admin' ? `admin_${timestamp}@example.com` :
                                 userType === 'testuser' ? `testuser_${timestamp}@example.com` :
                                 `roman_${timestamp}@example.com`;
                passwordInput.value = userData.password;
                confirmPasswordInput.value = userData.password;
                
                if (agreeTermsCheckbox) {
                    agreeTermsCheckbox.checked = true;
                }
                
                // Убираем ошибки валидации
                [usernameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
                    input.classList.remove('error');
                });
                
                // Очищаем сообщения об ошибках
                const errorElements = [
                    'register-username-error',
                    'register-email-error', 
                    'register-password-error',
                    'register-confirm-password-error'
                ];
                
                errorElements.forEach(id => {
                    const errorElement = document.getElementById(id);
                    if (errorElement) errorElement.textContent = '';
                });
                
                // Обновляем индикатор силы пароля
                if (window.validationService) {
                    window.validationService.checkPasswordStrength(passwordInput.value);
                }
                
                window.notificationService.success(`Поля заполнены данными пользователя ${uniqueUsername}`);
                console.log(`🧪 AuthManager: Заполнены тестовые данные для регистрации (${userType})`);
            }
        }
    }

    /**
     * Обработка формы входа
     * @param {Event} e - Событие формы
     */
    async handleLogin(e) {
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            password: formData.get('password'),
            remember: formData.get('remember') === 'on'
        };

        // Валидация
        const validation = window.validationService.validateLoginForm(data);
        if (!validation.valid) {
            this.showFieldErrors(validation.fieldErrors);
            return;
        }

        await this.performLogin(data);
    }

    /**
     * Обработка формы регистрации
     * @param {Event} e - Событие формы
     */
    async handleRegister(e) {
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            agreeTerms: formData.get('agreeTerms') === 'on'
        };

        // Валидация
        const validation = window.validationService.validateRegistrationForm(data);
        if (!validation.valid) {
            this.showFieldErrors(validation.fieldErrors);
            return;
        }

        await this.performRegister(data);
    }

    /**
     * Обработка формы восстановления пароля
     * @param {Event} e - Событие формы
     */
    async handleForgotPassword(e) {
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email')
        };

        // Валидация
        const validation = window.validationService.validateForgotPasswordForm(data);
        if (!validation.valid) {
            this.showFieldErrors(validation.fieldErrors);
            return;
        }

        await this.performForgotPassword(data);
    }

    /**
     * Выполнение входа
     * @param {Object} data - Данные для входа
     */
    async performLogin(data) {
        this.setLoading(true);

        try {
            const result = await window.authService.loginUser(data.email, data.password, data.remember);
            
            if (result.success) {
                window.notificationService.success('Вход выполнен успешно!');
                this.handleAuthenticatedUser();
            } else {
                window.notificationService.error(result.message);
                this.showFieldErrors(result.errors);
            }
        } catch (error) {
            console.error('❌ AuthManager: Ошибка входа:', error);
            window.notificationService.error('Произошла ошибка при входе');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Выполнение регистрации
     * @param {Object} data - Данные для регистрации
     */
    async performRegister(data) {
        this.setLoading(true);

        try {
            const result = await window.authService.registerUser(data);
            
            if (result.success) {
                window.notificationService.success('Регистрация выполнена успешно!');
                this.handleAuthenticatedUser();
            } else {
                window.notificationService.error(result.message);
                this.showFieldErrors(result.errors);
            }
        } catch (error) {
            console.error('❌ AuthManager: Ошибка регистрации:', error);
            window.notificationService.error('Произошла ошибка при регистрации');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Выполнение восстановления пароля
     * @param {Object} data - Данные для восстановления
     */
    async performForgotPassword(data) {
        this.setLoading(true);

        try {
            const result = await window.authService.forgotPassword(data.email);
            
            if (result.success) {
                window.notificationService.success('Ссылка для восстановления отправлена на ваш email');
                this.switchForm('login');
            } else {
                window.notificationService.error(result.message);
                this.showFieldErrors(result.errors);
            }
        } catch (error) {
            console.error('❌ AuthManager: Ошибка восстановления пароля:', error);
            window.notificationService.error('Произошла ошибка при восстановлении пароля');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Обработка авторизованного пользователя
     */
    handleAuthenticatedUser() {
        const user = window.authService.getCurrentUser();
        if (user) {
            console.log('👤 AuthManager: Пользователь авторизован:', user.username);
            
            // Если есть роутер, используем его для навигации
            if (typeof window.Router !== 'undefined' && window.router) {
                setTimeout(() => {
                    window.router.navigate('/rooms');
                }, 1500);
            } else {
                // Fallback: перенаправляем на страницу комнат
                setTimeout(() => {
                    window.location.href = '../pages/rooms.html';
                }, 1500);
            }
        }
    }

    /**
     * Валидация отдельного поля
     * @param {HTMLElement} input - Поле для валидации
     * @param {string} type - Тип валидации
     */
    validateField(input, type) {
        const value = input.value.trim();
        let validation;

        switch (type) {
            case 'email':
                validation = window.validationService.validateEmail(value);
                break;
            case 'username':
                validation = window.validationService.validateUsername(value);
                break;
            case 'password':
                validation = window.validationService.validatePassword(value);
                break;
            default:
                return;
        }

        this.showFieldError(input, validation);
    }

    /**
     * Валидация подтверждения пароля
     */
    validateConfirmPassword() {
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('register-confirm-password')?.value;
        
        if (password && confirmPassword) {
            const validation = window.validationService.validateConfirmPassword(password, confirmPassword);
            const confirmInput = document.getElementById('register-confirm-password');
            if (confirmInput) {
                this.showFieldError(confirmInput, validation);
            }
        }
    }

    /**
     * Показать ошибку для поля
     * @param {HTMLElement} input - Поле
     * @param {Object} validation - Результат валидации
     */
    showFieldError(input, validation) {
        const fieldName = input.name;
        const errorElement = document.getElementById(`${this.currentForm}-${fieldName}-error`);
        
        if (errorElement) {
            if (validation.valid) {
                errorElement.classList.remove('show');
                input.classList.remove('error');
            } else {
                errorElement.textContent = validation.errors[0];
                errorElement.classList.add('show');
                input.classList.add('error');
            }
        }
    }

    /**
     * Показать ошибки для полей
     * @param {Object} errors - Ошибки по полям
     */
    showFieldErrors(errors) {
        for (const [field, fieldErrors] of Object.entries(errors)) {
            const input = document.querySelector(`input[name="${field}"]`);
            const errorElement = document.getElementById(`${this.currentForm}-${field}-error`);
            
            if (input && errorElement && fieldErrors.length > 0) {
                errorElement.textContent = fieldErrors[0];
                errorElement.classList.add('show');
                input.classList.add('error');
            }
        }
    }

    /**
     * Очистить все ошибки
     */
    clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.remove('show');
        });
        
        document.querySelectorAll('input.error').forEach(input => {
            input.classList.remove('error');
        });
    }

    /**
     * Установить состояние загрузки
     * @param {boolean} loading - Состояние загрузки
     */
    setLoading(loading) {
        this.isLoading = loading;
        
        const activeForm = document.querySelector('.auth-form.active');
        if (activeForm) {
            const button = activeForm.querySelector('.auth-button');
            const inputs = activeForm.querySelectorAll('input');
            
            if (button) {
                button.disabled = loading;
                const text = button.querySelector('.button-text');
                const loader = button.querySelector('.button-loader');
                
                if (loading) {
                    text.style.display = 'none';
                    loader.style.display = 'inline-block';
                } else {
                    text.style.display = 'inline-block';
                    loader.style.display = 'none';
                }
            }
            
            inputs.forEach(input => {
                input.disabled = loading;
            });
        }
    }

    /**
     * Получить текст силы пароля
     * @param {string} level - Уровень силы
     * @returns {string} Текст описания
     */
    getStrengthText(level) {
        const texts = {
            weak: 'Слабый пароль',
            fair: 'Приемлемый пароль',
            good: 'Хороший пароль',
            strong: 'Отличный пароль'
        };
        return texts[level] || 'Введите пароль';
    }

    /**
     * Инициализация роутера
     */
    initRouter() {
        try {
            console.log('🗺️ AuthManager: Инициализация роутера');
            
            // Создаем роутер если его нет
            if (!window.router) {
                window.router = new Router();
            }
            
            // Регистрируем маршруты
            window.router.route('/auth', () => {
                console.log('🗺️ AuthManager: Активна страница авторизации');
            }, 'Авторизация');
            
            window.router.route('/auth/', () => {
                console.log('🗺️ AuthManager: Активна страница авторизации (слеш)');
            }, 'Авторизация');
            
            window.router.route('/rooms', () => {
                console.log('🗺️ AuthManager: Переход к комнатам');
                window.location.href = '../pages/rooms.html';
            }, 'Комнаты');
            
            console.log('✅ AuthManager: Роутер инициализирован');
        } catch (error) {
            console.error('❌ AuthManager: Ошибка инициализации роутера:', error);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск системы авторизации Aura Money');
    new AuthManager();
});

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}
