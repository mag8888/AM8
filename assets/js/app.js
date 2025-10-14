/**
 * App v2.0.0 - Главное приложение Aura Money
 * 
 * Особенности:
 * - Модульная архитектура
 * - Dependency Injection
 * - Улучшенная обработка ошибок
 * - Централизованное логирование
 * - Конфигурируемость
 */
class App {
    constructor() {
        this.logger = window.logger;
        this.errorHandler = window.errorHandler;
        this.config = window.config;
        
        this.modules = new Map();
        this.services = new Map();
        this.isInitialized = false;
        
        this._initializeCore();
        this._setupGlobalErrorHandling();
    }

    /**
     * Инициализация ядра приложения
     * @private
     */
    _initializeCore() {
        this.logger?.info('Инициализация приложения Aura Money v2.0.0', null, 'App');
        
        // Создаем основные сервисы
        this.services.set('eventBus', new window.EventBus(this.logger, this.errorHandler));
        this.services.set('router', new window.Router());
        
        this.logger?.info('Основные сервисы созданы', {
            services: Array.from(this.services.keys())
        }, 'App');
    }

    /**
     * Настройка глобальной обработки ошибок
     * @private
     */
    _setupGlobalErrorHandling() {
        // Обработка ошибок инициализации
        window.addEventListener('error', (event) => {
            this.errorHandler?.handleError({
                type: 'APP_ERROR',
                message: 'Global error in application',
                error: event.error,
                context: 'App',
                filename: event.filename,
                lineno: event.lineno
            });
        });

        // Обработка необработанных промисов
        window.addEventListener('unhandledrejection', (event) => {
            this.errorHandler?.handleError({
                type: 'PROMISE_ERROR',
                message: 'Unhandled promise rejection',
                error: event.reason,
                context: 'App'
            });
        });
    }

    /**
     * Основная инициализация приложения
     */
    async init() {
        if (this.isInitialized) {
            this.logger?.warn('Приложение уже инициализировано', null, 'App');
            return;
        }

        try {
            this.logger?.group('Инициализация приложения', () => {
                this._initializeServices();
                this._initializeModules();
                this._setupNavigation();
                this._checkAuthentication();
                this._setupPerformanceMonitoring();
            });

            this.isInitialized = true;
            this.logger?.info('Приложение успешно инициализировано', {
                modules: Array.from(this.modules.keys()),
                services: Array.from(this.services.keys())
            }, 'App');

            // Уведомляем о готовности приложения
            this.getEventBus().emit('app:ready', {
                timestamp: Date.now(),
                modules: Array.from(this.modules.keys()),
                config: this.config?.getEnvironmentInfo()
            });

        } catch (error) {
            this.errorHandler?.handleError({
                type: 'APP_ERROR',
                message: 'Failed to initialize application',
                error,
                context: 'App'
            });
            throw error;
        }
    }

    /**
     * Инициализация сервисов
     * @private
     */
    _initializeServices() {
        this.logger?.info('Инициализация сервисов', null, 'App');
        
        // Инициализация роутера
        const router = this.getRouter();
        router.route('/', () => this._handleHomeRoute(), 'Главная');
        router.route('/auth', () => this._handleAuthRoute(), 'Авторизация');
        router.route('/lobby', () => this._handleLobbyRoute(), 'Лобби');
        router.route('/rooms', () => this._handleRoomsRoute(), 'Комнаты');
        router.route('/game', (state) => this._handleGameRoute(state), 'Игра');
        router.defaultRoute = '/';
        
        this.logger?.debug('Роутер настроен', {
            routes: router.getRoutes?.() || 'routes info not available'
        }, 'App');
    }

    /**
     * Инициализация модулей
     * @private
     */
    _initializeModules() {
        this.logger?.info('Инициализация модулей', null, 'App');
        
        // Инициализируем модули по необходимости
        this._loadGameModules();
        this._loadUIModules();
    }

    /**
     * Загрузка игровых модулей
     * @private
     */
    _loadGameModules() {
        if (window.GameState) {
            const gameState = new window.GameState(this.getEventBus());
            this.modules.set('gameState', gameState);
            this.logger?.debug('GameState модуль загружен', null, 'App');
        }

        if (window.BoardLayout) {
            const boardLayout = new window.BoardLayout({
                outerTrackSelector: '#outer-track',
                innerTrackSelector: '#inner-track',
                gameState: this.modules.get('gameState'),
                eventBus: this.getEventBus()
            });
            this.modules.set('boardLayout', boardLayout);
            this.logger?.debug('BoardLayout модуль загружен', null, 'App');
        }
    }

    /**
     * Загрузка UI модулей
     * @private
     */
    _loadUIModules() {
        // Загружаем модули по необходимости
        if (window.UserModel) {
            const userModel = new window.UserModel();
            this.modules.set('userModel', userModel);
            this.logger?.debug('UserModel модуль загружен', null, 'App');
        }
    }

    /**
     * Настройка навигации
     * @private
     */
    _setupNavigation() {
        this.logger?.info('Настройка навигации', null, 'App');
        
        // Обработчики навигации
        this.getEventBus().on('navigate:to', (data) => {
            this.getRouter().navigate(data.route, data.state);
        }, { priority: 10 });

        this.getEventBus().on('navigate:back', () => {
            window.history.back();
        });

        this.getEventBus().on('navigate:forward', () => {
            window.history.forward();
        });
    }

    /**
     * Проверка авторизации
     * @private
     */
    _checkAuthentication() {
        this.logger?.info('Проверка авторизации', null, 'App');
        
        try {
            const userData = this._getUserData();
            
            if (userData) {
                this.currentUser = userData;
                this._updateUserInterface();
                
                this.logger?.info('Пользователь авторизован', {
                    username: userData.username
                }, 'App');
                
                // Перенаправляем авторизованного пользователя
                if (this._shouldRedirectAuthenticated()) {
                    this.getRouter().navigate('/lobby');
                }
            } else {
                this.logger?.info('Пользователь не авторизован', null, 'App');
                
                // Перенаправляем неавторизованного пользователя
                if (this._shouldRedirectUnauthenticated()) {
                    this.getRouter().navigate('/auth');
                }
            }
        } catch (error) {
            this.errorHandler?.handleError({
                type: 'AUTH_ERROR',
                message: 'Authentication check failed',
                error,
                context: 'App'
            });
        }
    }

    /**
     * Получение данных пользователя
     * @returns {Object|null}
     * @private
     */
    _getUserData() {
        const userData = localStorage.getItem('currentUser') || 
                        localStorage.getItem('aura_money_user');
        
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (parseError) {
                this.logger?.warn('Ошибка парсинга данных пользователя', parseError, 'App');
                return null;
            }
        }
        
        return null;
    }

    /**
     * Обновление интерфейса пользователя
     * @private
     */
    _updateUserInterface() {
        if (!this.currentUser) return;
        
        const usernameElement = document.querySelector('.username-display');
        if (usernameElement) {
            usernameElement.textContent = this.currentUser.username;
        }
        
        // Уведомляем другие модули об обновлении пользователя
        this.getEventBus().emit('user:updated', this.currentUser);
    }

    /**
     * Проверка необходимости перенаправления авторизованного пользователя
     * @returns {boolean}
     * @private
     */
    _shouldRedirectAuthenticated() {
        const currentPath = window.location.pathname;
        const isOnGameBoard = window.location.hash.includes('game');
        
        // Не перенаправляем, если мы на игровой доске
        if (isOnGameBoard) {
            return false;
        }
        
        return currentPath === '/' || currentPath === '/index.html';
    }

    /**
     * Проверка необходимости перенаправления неавторизованного пользователя
     * @returns {boolean}
     * @private
     */
    _shouldRedirectUnauthenticated() {
        const currentPath = window.location.pathname;
        return currentPath === '/' || currentPath === '/index.html';
    }

    /**
     * Настройка мониторинга производительности
     * @private
     */
    _setupPerformanceMonitoring() {
        if (!this.config?.get('performance.enableProfiling', false)) {
            return;
        }
        
        this.logger?.info('Настройка мониторинга производительности', null, 'App');
        
        // Мониторинг производительности
        this.getEventBus().on('performance:measure', (data) => {
            this.logger?.measure(data.name, data.fn, 'Performance');
        });
    }

    /**
     * Обработчики маршрутов
     */
    _handleHomeRoute() {
        this._showPage('game-page');
        this._updateNavigation('/');
        this._autoSelectRoom();
    }

    _handleAuthRoute() {
        this._showPage('auth-page');
        this._updateNavigation('/auth');
    }

    _handleLobbyRoute() {
        window.location.href = 'pages/lobby.html';
    }

    _handleRoomsRoute() {
        window.location.href = 'pages/rooms.html';
    }

    _handleGameRoute(state) {
        this._showPage('game-page');
        this._updateNavigation('/');
        this._handleGameState(state);
    }

    /**
     * Вспомогательные методы
     */
    _showPage(pageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.style.display = 'none');
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
            this.logger?.debug(`Показана страница: ${pageId}`, null, 'App');
        }
    }

    _updateNavigation(route) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === route) {
                link.classList.add('active');
            }
        });
    }

    _autoSelectRoom() {
        // Автоматический выбор комнаты если нужно
        this.logger?.debug('Автоматический выбор комнаты', null, 'App');
    }

    _handleGameState(state) {
        if (state && state.roomId) {
            this.logger?.debug('Обработка состояния игры', { roomId: state.roomId }, 'App');
            // Логика обработки состояния игры
        }
    }

    /**
     * Публичные методы для получения сервисов и модулей
     */
    getEventBus() {
        return this.services.get('eventBus');
    }

    getRouter() {
        return this.services.get('router');
    }

    getModule(name) {
        return this.modules.get(name);
    }

    getService(name) {
        return this.services.get(name);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Методы управления приложением
     */
    async destroy() {
        this.logger?.info('Уничтожение приложения', null, 'App');
        
        // Очищаем модули
        for (const [name, module] of this.modules) {
            if (module.destroy) {
                try {
                    await module.destroy();
                    this.logger?.debug(`Модуль ${name} уничтожен`, null, 'App');
                } catch (error) {
                    this.logger?.warn(`Ошибка при уничтожении модуля ${name}`, error, 'App');
                }
            }
        }
        
        // Очищаем сервисы
        for (const [name, service] of this.services) {
            if (service.destroy) {
                try {
                    await service.destroy();
                    this.logger?.debug(`Сервис ${name} уничтожен`, null, 'App');
                } catch (error) {
                    this.logger?.warn(`Ошибка при уничтожении сервиса ${name}`, error, 'App');
                }
            }
        }
        
        this.modules.clear();
        this.services.clear();
        this.isInitialized = false;
        
        this.logger?.info('Приложение уничтожено', null, 'App');
    }

    /**
     * Получение статистики приложения
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            modulesCount: this.modules.size,
            servicesCount: this.services.size,
            modules: Array.from(this.modules.keys()),
            services: Array.from(this.services.keys()),
            user: this.currentUser ? {
                username: this.currentUser.username,
                isLoggedIn: true
            } : null
        };
    }

    /**
     * Режим отладки
     */
    enableDebugMode() {
        this.config?.setLevel('DEBUG');
        this.logger?.info('Режим отладки включен', null, 'App');
    }

    disableDebugMode() {
        this.config?.setLevel('WARN');
        this.logger?.info('Режим отладки отключен', null, 'App');
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.App = App;
}

// Version: 1760439000 - App v2.0.0