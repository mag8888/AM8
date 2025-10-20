/**
 * AuthService - Централизованный сервис авторизации
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

class AuthService {
    constructor() {
        // Автоматическое определение API URL
        // Если запущено на Railway, используем production URL
        // Иначе используем localhost
        const isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1';
        
        if (isProduction) {
            // Production: Railway бэкенд сервис
            this.apiBase = 'https://web-production-fc48b.up.railway.app/api/auth';
        } else {
            // Development: localhost
            this.apiBase = 'http://localhost:3001/api/auth';
        }
        
        this.tokenKey = 'aura_money_token';
        this.userKey = 'aura_money_user';
        this.isInitialized = false;
        
        console.log(`🔐 AuthService: API Base: ${this.apiBase}`);
        
        this.init();
    }

    /**
     * Безопасный парсинг JSON ответа
     * @param {Response} response - HTTP ответ
     * @returns {Object} Распарсенный JSON или объект ошибки
     */
    async safeJsonParse(response) {
        try {
            return await response.json();
        } catch (jsonError) {
            console.error('❌ AuthService: Ошибка парсинга JSON:', jsonError);
            const text = await response.text();
            console.error('❌ AuthService: Ответ сервера:', text);
            throw new Error('Сервер вернул некорректный ответ');
        }
    }

    /**
     * Инициализация сервиса
     */
    async init() {
        try {
            console.log('🔐 AuthService: Инициализация...');
            
            // Проверяем сохраненный токен
            const token = this.getStoredToken();
            if (token) {
                const isValid = await this.validateToken(token);
                if (isValid) {
                    console.log('✅ AuthService: Токен валиден, пользователь авторизован');
                    this.isInitialized = true;
                    return;
                } else {
                    console.log('⚠️ AuthService: Токен недействителен, очистка...');
                    this.clearAuth();
                }
            }
            
            this.isInitialized = true;
            console.log('✅ AuthService: Инициализация завершена');
        } catch (error) {
            console.error('❌ AuthService: Ошибка инициализации:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Регистрация нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} Результат регистрации
     */
    async registerUser(userData) {
        try {
            console.log('📝 AuthService: Регистрация пользователя:', userData.email);
            
            const response = await fetch(`${this.apiBase}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const result = await this.safeJsonParse(response);

            if (response.ok && result.success) {
                console.log('✅ AuthService: Регистрация успешна');
                this.storeAuth(result.token, result.user);
                return {
                    success: true,
                    message: result.message,
                    user: result.user,
                    token: result.token
                };
            } else {
                console.log('❌ AuthService: Ошибка регистрации:', result.message);
                return {
                    success: false,
                    message: result.message,
                    errors: result.errors || []
                };
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка регистрации:', error);
            return {
                success: false,
                message: 'Ошибка сети. Проверьте подключение к интернету.',
                errors: ['network']
            };
        }
    }

    /**
     * Авторизация пользователя
     * @param {string} email - Email пользователя
     * @param {string} password - Пароль
     * @param {boolean} remember - Запомнить пользователя
     * @returns {Promise<Object>} Результат авторизации
     */
    async loginUser(email, password, remember = false) {
        try {
            console.log('🔑 AuthService: Авторизация пользователя:', email);
            
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, remember })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ AuthService: Авторизация успешна');
                this.storeAuth(result.token, result.user, remember);
                return {
                    success: true,
                    message: result.message,
                    user: result.user,
                    token: result.token
                };
            } else {
                console.log('❌ AuthService: Ошибка авторизации:', result.message);
                return {
                    success: false,
                    message: result.message,
                    errors: result.errors || []
                };
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка авторизации:', error);
            return {
                success: false,
                message: 'Ошибка сети. Проверьте подключение к интернету.',
                errors: ['network']
            };
        }
    }

    /**
     * Выход из системы
     * @returns {Promise<Object>} Результат выхода
     */
    async logoutUser() {
        try {
            console.log('🚪 AuthService: Выход из системы');
            
            const token = this.getStoredToken();
            if (token) {
                await fetch(`${this.apiBase}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                });
            }
            
            this.clearAuth();
            console.log('✅ AuthService: Выход выполнен');
            
            return {
                success: true,
                message: 'Вы успешно вышли из системы'
            };
        } catch (error) {
            console.error('❌ AuthService: Ошибка выхода:', error);
            // Очищаем локальные данные даже при ошибке
            this.clearAuth();
            return {
                success: true,
                message: 'Вы вышли из системы'
            };
        }
    }

    /**
     * Получение профиля пользователя
     * @returns {Promise<Object>} Профиль пользователя
     */
    async getUserProfile() {
        try {
            const token = this.getStoredToken();
            if (!token) {
                throw new Error('Пользователь не авторизован');
            }

            console.log('👤 AuthService: Получение профиля пользователя');
            
            const response = await fetch(`${this.apiBase}/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ AuthService: Профиль получен');
                this.updateStoredUser(result.user);
                return {
                    success: true,
                    user: result.user
                };
            } else {
                console.log('❌ AuthService: Ошибка получения профиля:', result.message);
                if (response.status === 401) {
                    this.clearAuth();
                }
                return {
                    success: false,
                    message: result.message
                };
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка получения профиля:', error);
            return {
                success: false,
                message: 'Ошибка получения профиля'
            };
        }
    }

    /**
     * Обновление профиля пользователя
     * @param {Object} updateData - Данные для обновления
     * @returns {Promise<Object>} Результат обновления
     */
    async updateUserProfile(updateData) {
        try {
            const token = this.getStoredToken();
            if (!token) {
                throw new Error('Пользователь не авторизован');
            }

            console.log('✏️ AuthService: Обновление профиля пользователя');
            
            const response = await fetch(`${this.apiBase}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ AuthService: Профиль обновлен');
                this.updateStoredUser(result.user);
                return {
                    success: true,
                    message: result.message,
                    user: result.user
                };
            } else {
                console.log('❌ AuthService: Ошибка обновления профиля:', result.message);
                return {
                    success: false,
                    message: result.message,
                    errors: result.errors || []
                };
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка обновления профиля:', error);
            return {
                success: false,
                message: 'Ошибка обновления профиля'
            };
        }
    }

    /**
     * Валидация токена
     * @param {string} token - JWT токен
     * @returns {Promise<boolean>} Валидность токена
     */
    async validateToken(token) {
        try {
            if (!token) return false;

            console.log('🔍 AuthService: Валидация токена');
            
            const response = await fetch(`${this.apiBase}/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok && result.success && result.valid) {
                console.log('✅ AuthService: Токен валиден');
                return true;
            } else {
                console.log('❌ AuthService: Токен недействителен');
                return false;
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка валидации токена:', error);
            return false;
        }
    }

    /**
     * Восстановление пароля
     * @param {string} email - Email пользователя
     * @returns {Promise<Object>} Результат запроса восстановления
     */
    async forgotPassword(email) {
        try {
            console.log('🔄 AuthService: Запрос восстановления пароля:', email);
            
            const response = await fetch(`${this.apiBase}/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ AuthService: Запрос восстановления отправлен');
                return {
                    success: true,
                    message: result.message
                };
            } else {
                console.log('❌ AuthService: Ошибка восстановления пароля:', result.message);
                return {
                    success: false,
                    message: result.message,
                    errors: result.errors || []
                };
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка восстановления пароля:', error);
            return {
                success: false,
                message: 'Ошибка сети. Проверьте подключение к интернету.'
            };
        }
    }

    /**
     * Проверка авторизации пользователя
     * @returns {boolean} Авторизован ли пользователь
     */
    isAuthenticated() {
        const token = this.getStoredToken();
        const user = this.getStoredUser();
        return !!(token && user && this.isInitialized);
    }

    /**
     * Получение текущего пользователя
     * @returns {Object|null} Данные пользователя
     */
    getCurrentUser() {
        return this.getStoredUser();
    }

    /**
     * Получение токена авторизации
     * @returns {string|null} JWT токен
     */
    getAuthToken() {
        return this.getStoredToken();
    }

    /**
     * Сохранение данных авторизации
     * @param {string} token - JWT токен
     * @param {Object} user - Данные пользователя
     * @param {boolean} remember - Запомнить пользователя
     */
    storeAuth(token, user, remember = false) {
        try {
            const primaryStorage = remember ? localStorage : sessionStorage;
            const secondaryStorage = remember ? sessionStorage : localStorage;

            primaryStorage.setItem(this.tokenKey, token);
            primaryStorage.setItem(this.userKey, JSON.stringify(user));

            // Удаляем устаревшие записи из альтернативного хранилища,
            // чтобы избежать конфликтов между режимами "запомнить меня" и сессией
            try {
                secondaryStorage.removeItem(this.tokenKey);
                secondaryStorage.removeItem(this.userKey);
            } catch (cleanupError) {
                console.warn('⚠️ AuthService: Не удалось очистить альтернативное хранилище', cleanupError);
            }
            
            console.log('💾 AuthService: Данные авторизации сохранены');
        } catch (error) {
            console.error('❌ AuthService: Ошибка сохранения данных:', error);
        }
    }

    /**
     * Получение сохраненного токена
     * @returns {string|null} JWT токен
     */
    getStoredToken() {
        try {
            return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
        } catch (error) {
            console.error('❌ AuthService: Ошибка получения токена:', error);
            return null;
        }
    }

    /**
     * Получение сохраненных данных пользователя
     * @returns {Object|null} Данные пользователя
     */
    getStoredUser() {
        try {
            const userData = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ AuthService: Ошибка получения данных пользователя:', error);
            return null;
        }
    }

    /**
     * Обновление сохраненных данных пользователя
     * @param {Object} user - Новые данные пользователя
     */
    updateStoredUser(user) {
        try {
            const userData = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
            if (userData) {
                const storage = localStorage.getItem(this.userKey) ? localStorage : sessionStorage;
                storage.setItem(this.userKey, JSON.stringify(user));
                console.log('🔄 AuthService: Данные пользователя обновлены');
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка обновления данных пользователя:', error);
        }
    }

    /**
     * Очистка данных авторизации
     */
    clearAuth() {
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            sessionStorage.removeItem(this.tokenKey);
            sessionStorage.removeItem(this.userKey);
            
            console.log('🗑️ AuthService: Данные авторизации очищены');
        } catch (error) {
            console.error('❌ AuthService: Ошибка очистки данных:', error);
        }
    }

    /**
     * Проверка здоровья сервиса
     * @returns {Promise<Object>} Статус сервиса
     */
    async healthCheck() {
        try {
            console.log('🏥 AuthService: Проверка здоровья сервиса');
            
            const response = await fetch(`${this.apiBase}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ AuthService: Сервис работает');
                return {
                    success: true,
                    status: result.status,
                    timestamp: result.timestamp
                };
            } else {
                console.log('⚠️ AuthService: Проблемы с сервисом');
                return {
                    success: false,
                    message: result.message || 'Сервис недоступен'
                };
            }
        } catch (error) {
            console.error('❌ AuthService: Ошибка проверки здоровья:', error);
            return {
                success: false,
                message: 'Сервис недоступен'
            };
        }
    }
}

// Создаем глобальный экземпляр сервиса
const authService = new AuthService();

// Экспортируем для использования в других модулях
if (typeof window !== 'undefined') {
    window.AuthService = AuthService;
    window.authService = authService;
}
