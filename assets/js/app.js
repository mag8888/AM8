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
        this.performanceMonitor = window.performanceMonitor;
        
        this.modules = new Map();
        this.services = new Map();
        this.isInitialized = false;
        this.activeRoomId = null;
        this.gameModulesReady = false;
        
        // НОВОЕ: Защита от зависания браузера
        this._initializationDepth = 0;
        this._maxInitializationDepth = 3;
        this._isInInitialization = false;
        this._initializationTimeout = null;
        
        // Флаг для предотвращения множественных вызовов forceUpdate у PlayerTokens
        this._playerTokensForceUpdateCalled = false;
        
        // Дебаунсинг и кэширование для проверки авторизации
        this._lastAuthUsername = null;
        this._checkAuthDebounceTimer = null;
        
        // ИСПРАВЛЕНО: Безопасная инициализация с таймаутом
        this._safeInitialize();
    }
    
    /**
     * НОВОЕ: Безопасная инициализация с защитой от зависания
     * @private
     */
    _safeInitialize() {
        if (this._isInInitialization) {
            console.warn('⚠️ App: Предотвращена рекурсивная инициализация');
            return;
        }
        
        this._isInInitialization = true;
        
        // Устанавливаем таймаут на инициализацию (10 секунд максимум)
        this._initializationTimeout = setTimeout(() => {
            console.error('🚨 App: Таймаут инициализации! Возможно зависание.');
            this._isInInitialization = false;
        }, 10000);
        
        try {
            this._initializeCore();
            this._setupGlobalErrorHandling();
            this._startPerformanceMonitoring();
            
            // Очищаем таймаут при успешной инициализации
            if (this._initializationTimeout) {
                clearTimeout(this._initializationTimeout);
                this._initializationTimeout = null;
            }
            
            console.log('✅ App: Безопасная инициализация завершена');
        } catch (error) {
            console.error('❌ App: Ошибка при безопасной инициализации:', error);
        } finally {
            this._isInInitialization = false;
        }
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
        
        // ИСПРАВЛЕНО: Создаем GameStateManager для централизованного управления состоянием (ЕДИНСТВЕННЫЙ экземпляр)
        if (window.GameStateManager && !this.services.has('gameStateManager')) {
            const gameStateManager = new window.GameStateManager();
            this.services.set('gameStateManager', gameStateManager);
            this.modules.set('gameStateManager', gameStateManager);
            console.log('✅ App: GameStateManager создан в _initializeCore');
        }
        
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
            // Предотвращаем перезагрузку страницы
            event.preventDefault();
            
            this.errorHandler?.handleError({
                type: 'PROMISE_ERROR',
                message: 'Unhandled promise rejection',
                error: event.reason,
                context: 'App'
            });
            
            // Логируем ошибку, но не перезагружаем страницу
            console.error('❌ Unhandled Promise Rejection:', event.reason);
        });
    }

    /**
     * Основная инициализация приложения
     */
    async init() {
        console.log('🔍 App: init() вызван', { isInitialized: this.isInitialized });
        if (this.isInitialized) {
            console.log('⚠️ App: Приложение уже инициализировано, пропускаем');
            this.logger?.warn('Приложение уже инициализировано', null, 'App');
            return;
        }
        
        // НОВОЕ: Защита от рекурсивной инициализации
        this._initializationDepth++;
        if (this._initializationDepth > this._maxInitializationDepth) {
            console.error('🚨 App: Достигнута максимальная глубина инициализации! Прерываем.');
            this._initializationDepth = 0;
            return;
        }

        try {
            console.log('🔍 App: Начинаем инициализацию модулей...');
            // Вызываем функции напрямую для надежности
            this._initializeServices();
            this._initializeModules();
            this._setupNavigation();
            this._checkAuthentication();
            this._setupPerformanceMonitoring();
            
            // ИСПРАВЛЕНО: Проверяем, что GameStateManager уже создан (избегаем дубликатов)
            const existingGameStateManager = this.getModule('gameStateManager');
            if (existingGameStateManager) {
                console.log('✅ App: GameStateManager уже существует, пропускаем создание дубликата');
            } else {
                console.warn('⚠️ App: GameStateManager не найден, это не должно происходить!');
            }

            this.isInitialized = true;
            this._initializationDepth = 0; // НОВОЕ: Сбрасываем глубину при успешной инициализации
            
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
            this._initializationDepth = 0; // НОВОЕ: Сбрасываем глубину при ошибке
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
        // Алиас для прямого захода на index.html, чтобы не было предупреждений Router
        router.route('/index.html', () => this._handleHomeRoute(), 'Главная');
        router.route('/auth', () => this._handleAuthRoute(), 'Авторизация');
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
        console.log('🔍 App: _initializeModules вызван');
        this.logger?.info('Инициализация модулей', null, 'App');
        
        // Инициализируем модули по необходимости
        this._loadGameModules();
        this._loadUIModules();
    }

    /**
     * Загрузка игровых модулей (оптимизированная версия с lazy loading)
     * @private
     */
    _loadGameModules() {
        console.log('🔍 App: _loadGameModules вызван');
        
        // Используем ModuleLoader для оптимизированной загрузки
        if (window.ModuleLoader) {
            // Остальные модули загружаем по требованию
            this._loadGameModulesLazy();
            return;
        }
        // ИСПРАВЛЕНО: Создаем GameState только если его нет (избегаем дубликатов)
        if (window.GameState && !this.modules.has('gameState')) {
            const gameState = new window.GameState(this.getEventBus());
            this.modules.set('gameState', gameState);
            this.logger?.debug('GameState модуль загружен', null, 'App');
            console.log('✅ App: GameState создан в _loadGameModules');
        } else if (this.modules.has('gameState')) {
            console.log('✅ App: GameState уже существует, пропускаем создание дубликата');
        }

        console.log('🔍 App: Проверяем window.BoardLayout:', !!window.BoardLayout);
        if (window.BoardLayout) {
            console.log('🔍 App: Создаем BoardLayout...');
            try {
                const boardLayout = new window.BoardLayout({
                    outerTrackSelector: '#outer-track',
                    innerTrackSelector: '#inner-track',
                    gameState: this.modules.get('gameState'),
                    eventBus: this.getEventBus(),
                    logger: this.logger,
                    debug: this.config?.get?.('logging.boardLayoutDebug', false)
                });
                this.modules.set('boardLayout', boardLayout);
                this.logger?.debug('BoardLayout модуль загружен', null, 'App');
                console.log('✅ App: BoardLayout создан в _loadGameModules');
            } catch (error) {
                console.error('❌ App: Ошибка при создании BoardLayout:', error);
            }
        } else {
            console.warn('⚠️ App: window.BoardLayout не найден');
        }
        
        // Инициализируем PushClient для push-уведомлений
        if (window.PushClient) {
            const pushClient = new window.PushClient({
                gameState: this.getModule('gameState'),
                eventBus: this.getEventBus()
            });
            this.services.set('pushClient', pushClient);
            this.logger?.debug('PushClient сервис загружен', null, 'App');
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

        // Обрабатываем текущий маршрут мгновенно для быстрой навигации
        const router = this.getRouter();
        if (router && router.handleCurrentRoute) {
            router.handleCurrentRoute();
        }
    }

    /**
     * Проверка авторизации
     * @private
     */
    _checkAuthentication() {
        // Дебаунсинг для предотвращения спам-запросов
        if (this._checkAuthDebounceTimer) {
            return;
        }
        
        this._checkAuthDebounceTimer = setTimeout(() => {
            this._checkAuthDebounceTimer = null;
            this._performAuthCheck();
        }, 1000); // Дебаунс 1 секунда
    }
    
    /**
     * Выполняет фактическую проверку авторизации
     * @private
     */
    _performAuthCheck() {
        this.logger?.info('Проверка авторизации', null, 'App');
        
        try {
            const userData = this._getUserData();
            
            if (userData) {
                this.currentUser = userData;
                this._updateUserInterface();
                
                // Логируем только если пользователь изменился
                if (!this._lastAuthUsername || this._lastAuthUsername !== userData.username) {
                this.logger?.info('Пользователь авторизован', {
                    username: userData.username
                }, 'App');
                    this._lastAuthUsername = userData.username;
                }
                
                // Перенаправляем авторизованного пользователя
                if (this._shouldRedirectAuthenticated()) {
                    this.getRouter().navigate('/rooms');
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


    _handleRoomsRoute() {
        window.location.href = 'pages/rooms.html';
    }

    _handleGameRoute(state) {
        // Поддержка ссылок формата #game?roomId=...
        try {
            const hash = window.location.hash || '';
            const hashParams = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
            const roomIdFromHash = hashParams ? hashParams.get('roomId') : null;
            const roomId = state?.roomId || roomIdFromHash;

            if (roomId) {
                // Показываем игровую страницу вместо перенаправления
                this._showGamePage(roomId);
                return;
            }

            // Если roomId не указан — отправляем в список комнат
            this.getRouter().navigate('/rooms');
        } catch (error) {
            this.errorHandler?.handleError({
                type: 'ROUTER_ERROR',
                message: 'Failed to handle /game route',
                error,
                context: 'App._handleGameRoute'
            });
            this.getRouter().navigate('/rooms');
        }
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

    /**
     * Показать игровую страницу
     * @param {string} roomId - ID комнаты
     */
    _showGamePage(roomId) {
        this.logger?.info('Показ игровой страницы', { roomId }, 'App');
        
        try {
            // Скрываем все страницы
            const allPages = document.querySelectorAll('.page');
            allPages.forEach(page => {
                page.style.display = 'none';
                page.classList.remove('active');
            });
            
            // Показываем только игровую страницу
            const gamePage = document.getElementById('game-page');
            if (gamePage) {
                gamePage.style.display = 'grid';
                gamePage.style.visibility = 'visible';
                gamePage.style.opacity = '1';
                gamePage.classList.add('active');
                console.log('✅ App: Игровая страница активирована');
            } else {
                console.error('❌ App: Элемент game-page не найден');
            }
            
            // Инициализируем игровые модули для этой комнаты сразу (убрана задержка)
            this._initializeGameModules(roomId);
            
            // Принудительно инициализируем левую панель немедленно
            this._initializeLeftPanel();
            
            // Обновляем URL без перезагрузки
            window.history.replaceState(null, '', `#game?roomId=${roomId}`);
            
            this.logger?.info('Игровая страница показана', { roomId }, 'App');
            
        } catch (error) {
            console.error('❌ App: Ошибка показа игровой страницы:', error);
            this.errorHandler?.handleError({
                type: 'UI_ERROR',
                message: 'Failed to show game page',
                error,
                context: 'App._showGamePage'
            });
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
     * @deprecated Временная устаревшая версия инициализации игровых модулей.
     * Оставлена для совместимости, будет удалена после стабилизации нового пайплайна.
     */
    _legacyInitializeGameModules(roomId) {
        this.logger?.info('Инициализация игровых модулей для комнаты', { roomId }, 'App');
        
        // ИСПРАВЛЕНО: Используем существующий GameState (избегаем дубликатов)
        if (!this.getModule('gameState') && window.GameState) {
            try {
                const gs = new window.GameState(this.getEventBus());
                this.modules.set('gameState', gs);
                console.log('🎮 App: GameState создан в _legacyInitializeGameModules (fallback)');
            } catch (e) {
                console.warn('⚠️ App: Не удалось создать GameState на старте _initializeGameModules', e);
            }
        }

        const gameStateManager = this.getGameStateManager();
        const pushClient = this.getPushClient();
        
        if (gameStateManager) {
            gameStateManager.setRoomId(roomId);
        }
        
        if (pushClient) {
            // Подписываемся на push-уведомления для этой комнаты
            pushClient.subscribe().then(() => {
                console.log('🔔 PushClient: Подписка на push-уведомления активирована');
            }).catch(error => {
                console.warn('⚠️ PushClient: Ошибка подписки на push-уведомления:', error);
            });
        }
        
        // Инициализируем BoardLayout для отображения игрового поля
        console.log('🎯 App: Проверяем window.BoardLayout:', !!window.BoardLayout);
        console.log('🎯 App: Проверяем window.BoardConfig:', !!window.BoardConfig);
        console.log('🎯 App: Проверяем window.BIG_CIRCLE_CELLS:', !!window.BIG_CIRCLE_CELLS);
        console.log('🎯 App: Проверяем window.SMALL_CIRCLE_CELLS:', !!window.SMALL_CIRCLE_CELLS);
        
        if (window.BoardLayout) {
            try {
                const boardLayout = new window.BoardLayout({
                    outerTrackSelector: '#outer-track',
                    innerTrackSelector: '#inner-track',
                    gameState: this.getModule('gameState'),
                    eventBus: this.getEventBus(),
                    logger: this.logger,
                    debug: this.config?.get?.('logging.boardLayoutDebug', false)
                });
                this.modules.set('boardLayout', boardLayout);
                console.log('🎯 BoardLayout: Инициализирован успешно');
            } catch (error) {
                console.error('❌ BoardLayout: Ошибка инициализации:', error);
            }
        } else {
            console.error('❌ App: BoardLayout не найден в window');
        }

        // Инициализируем CardDeckPanel с отсрочкой
        const initCardDeckPanel = () => {
            if (window.CardDeckPanel && !this.modules.get('cardDeckPanel')) {
                const cardDeckPanel = new window.CardDeckPanel({
                    containerSelector: '#card-decks-panel',
                    eventBus: this.getEventBus()
                });
                this.modules.set('cardDeckPanel', cardDeckPanel);
                console.log('🃏 CardDeckPanel: Инициализирован');
            }
        };

        // Инициализируем BankPreview как синглтон
        const initBankPreview = () => {
            if (window.BankPreview && window.BankPreview.getInstance) {
                const bankPreview = window.BankPreview.getInstance({
                    containerSelector: '#bank-preview-container',
                    eventBus: this.getEventBus(),
                    gameStateManager: gameStateManager
                });
                // Синхронизируем с модулями app
                if (!this.modules.get('bankPreview')) {
                    this.modules.set('bankPreview', bankPreview);
                }
                console.log('🏦 BankPreview: Инициализирован как синглтон');
            }
        };

        // Проверяем доступность модулей перед инициализацией
        console.log('🎯 App: Проверка доступности модулей:', {
            BankPreview: !!window.BankPreview,
            CardDeckPanel: !!window.CardDeckPanel
        });
        
        // Инициализируем BankPreview первым, затем CardDeckPanel для правильного порядка
        if (window.BankPreview && !this.modules.get('bankPreview')) {
            initBankPreview(); // Инициализация BankPreview
        } else if (!window.BankPreview) {
            console.warn('⚠️ App: BankPreview не найден в window');
        }
        
        // Инициализируем CardDeckPanel сразу после BankPreview
        if (window.CardDeckPanel && !this.modules.get('cardDeckPanel')) {
            initCardDeckPanel(); // Инициализация CardDeckPanel после BankPreview
        } else if (!window.CardDeckPanel) {
            console.warn('⚠️ App: CardDeckPanel не найден в window');
        }
        
        // Инициализируем DealModule (микромодуль сделок)
        if (window.DealModule) {
            const dealModule = new window.DealModule({
                eventBus: this.getEventBus(),
                roomId
            });
            this.modules.set('dealModule', dealModule);
            console.log('🧩 DealModule: Инициализирован');
        }
        
        // Инициализируем PlayerTokens для отображения фишек игроков
        console.log('🎯 App: Проверяем window.PlayerTokens:', !!window.PlayerTokens);
        console.log('🎯 App: window.PlayerTokens тип:', typeof window.PlayerTokens);
        console.log('🎯 App: window объект содержит PlayerTokens:', 'PlayerTokens' in window);
        
        if (window.PlayerTokens) {
            console.log('🎯 App: Инициализируем PlayerTokens...');
            // Получаем boardLayout если он уже инициализирован
            const boardLayout = this.modules.get('boardLayout');
            const playerTokens = new window.PlayerTokens({
                gameState: this.getModule('gameState'),
                eventBus: this.getEventBus(),
                boardLayout: boardLayout, // Передаем boardLayout если доступен
                outerTrackSelector: '#outer-track',
                innerTrackSelector: '#inner-track'
            });
            this.modules.set('playerTokens', playerTokens);
            console.log('🎯 PlayerTokens: Инициализирован', { hasBoardLayout: !!boardLayout });
        } else {
            console.warn('⚠️ App: PlayerTokens не найден в window');
            console.warn('⚠️ App: Доступные модули в window:', Object.keys(window).filter(key => key.includes('Token') || key.includes('Player')));
        }
        
        // Инициализируем DiceService для бросков кубика
        if (window.DiceService) {
            console.log('🎲 App: Инициализируем DiceService...');
            const diceService = new window.DiceService({
                gameState: this.getModule('gameState'),
                eventBus: this.getEventBus()
            });
            this.modules.set('diceService', diceService);
            console.log('🎲 DiceService: Инициализирован');
        } else {
            console.warn('⚠️ App: DiceService не найден в window');
        }
        
        // Инициализируем DiceDisplay для отображения результата броска
        if (window.DiceDisplay) {
            console.log('🎲 App: Инициализируем DiceDisplay...');
            const diceDisplay = new window.DiceDisplay({
                eventBus: this.getEventBus(),
                diceService: this.modules.get('diceService')
            });
            this.modules.set('diceDisplay', diceDisplay);
            console.log('🎲 DiceDisplay: Инициализирован');
        } else {
            console.warn('⚠️ App: DiceDisplay не найден в window');
        }
        
        // Инициализируем ProfessionSystem
        if (window.ProfessionSystem) {
            const professionSystem = new window.ProfessionSystem({
                gameState: this.modules.get('gameState'),
                eventBus: this.getEventBus()
            });
            this.modules.set('professionSystem', professionSystem);
            console.log('💼 ProfessionSystem: Инициализирован');
        } else {
            console.warn('⚠️ App: ProfessionSystem не найден в window');
        }
        
        // Инициализируем PlayerBalanceDisplay
        if (window.PlayerBalanceDisplay) {
            const playerBalanceDisplay = new window.PlayerBalanceDisplay({
                gameState: this.modules.get('gameState'),
                eventBus: this.getEventBus(),
                roomApi: this.modules.get('roomApi')
            });
            this.modules.set('playerBalanceDisplay', playerBalanceDisplay);
            console.log('💰 PlayerBalanceDisplay: Инициализирован');
        } else {
            console.warn('⚠️ App: PlayerBalanceDisplay не найден в window');
        }
        
        // Инициализируем PlayersPanel с GameStateManager
        if (window.PlayersPanel && !this.modules.get('playersPanel')) {
            const gameStateManager = this.getModule('gameStateManager');
            const playersPanel = new window.PlayersPanel({
                gameStateManager: gameStateManager,
                eventBus: this.getEventBus(),
                containerId: 'players-panel'
            });
            this.modules.set('playersPanel', playersPanel);
            
            // Вызываем setupEventListeners для подписки на события GameStateManager
            if (typeof playersPanel.setupEventListeners === 'function') {
                playersPanel.setupEventListeners();
                console.log('🎯 PlayersPanel: setupEventListeners вызван');
            }
        } else if (this.modules.get('playersPanel')) {
            console.log('ℹ️ App: PlayersPanel уже инициализирован, пропускаем');
        }
        
        // Инициализируем TurnService (с защитой от отсутствия GameState)
        if (window.TurnService && !this.modules.get('turnService')) {
            try {
                console.log('🎯 App: Инициализируем TurnService...');
                let gameState = this.getModule('gameState');
                if (!gameState && window.GameState) {
                    console.warn('⚠️ App: GameState не найден, создаем fallback (последний раз)...');
                    gameState = new window.GameState(this.getEventBus());
                    this.modules.set('gameState', gameState);
                }
                // Гарантируем наличие RoomApi
                let roomApi = this.modules.get('roomApi');
                if (!roomApi && window.RoomApi) {
                    roomApi = new window.RoomApi();
                    this.modules.set('roomApi', roomApi);
                }
                if (gameState) {
                    const diceService = this.modules.get('diceService');
                    const gameStateManagerInstance = this.getGameStateManager();
                    const turnService = new window.TurnService({
                        // Некоторые реализации ожидают свойство state, добавляем алиас
                        state: gameState,
                        gameState: gameState,
                        roomApi: roomApi,
                        eventBus: this.getEventBus(),
                        diceService,
                        gameStateManager: gameStateManagerInstance
                    });
                    this.modules.set('turnService', turnService);
                    console.log('🎯 TurnService: Инициализирован');
                } else {
                    console.warn('⚠️ App: Пропускаем TurnService — GameState недоступен');
                }
            } catch (e) {
                console.error('❌ App: Ошибка инициализации TurnService', e);
            }
        } else if (this.modules.get('turnService')) {
            console.log('ℹ️ App: TurnService уже инициализирован, пропускаем');
        } else {
            console.warn('⚠️ App: TurnService не найден в window');
        }
        
        // Оптимизированная инициализация TurnController - убрана задержка для мгновенной загрузки
        if (window.TurnController && !this.modules.get('turnController')) {
            const turnService = this.modules.get('turnService');
            const playerTokensModule = this.modules.get('playerTokens');
            if (turnService && gameStateManager) {
                try {
                    console.log('🎯 App: Инициализируем TurnController (мгновенно)...');
                    const turnController = new window.TurnController(
                        turnService,
                        playerTokensModule,
                        gameStateManager,
                        this.getEventBus()
                    );
                    this.modules.set('turnController', turnController);
                    
                    if (typeof turnController.init === 'function') {
                        turnController.init();
                        console.log('🎯 TurnController: init() вызван успешно');
                    }
                } catch (e) {
                    console.error('❌ App: Ошибка инициализации TurnController', e);
                }
            }
        } else if (this.modules.get('turnController')) {
            console.log('ℹ️ App: TurnController уже инициализирован, пропускаем');
        }
        
        // Инициализируем TurnSyncService для синхронизации ходов (временно отключен)
        if (false && window.TurnSyncService) {
            const turnService = this.modules.get('turnService');
            const roomApi = this.modules.get('roomApi');
            if (turnService && roomApi) {
                try {
                    console.log('🔄 App: Инициализируем TurnSyncService...');
                    const turnSyncService = new window.TurnSyncService({
                        turnService: turnService,
                        roomApi: roomApi,
                        eventBus: this.getEventBus()
                    });
                    this.modules.set('turnSyncService', turnSyncService);
                    console.log('🔄 TurnSyncService: Инициализирован');
                } catch (e) {
                    console.error('❌ App: Ошибка инициализации TurnSyncService', e);
                }
            } else {
                console.warn('⚠️ App: Пропускаем TurnSyncService — нет turnService или roomApi');
            }
        } else {
            console.log('ℹ️ App: TurnSyncService временно отключен');
        }
        
        this.logger?.info('Игровые модули инициализированы', null, 'App');
        
        // Оптимизированное обновление фишек игроков - убрана задержка для мгновенного обновления
        this._safePlayerTokensForceUpdate('_finalizeGameModules');

        // Удален избыточный retry механизм - вызывает множественную инициализацию модулей
        // setTimeout(() => { /* retry logic */ }, 800); // REMOVED для оптимизации
    }

    /**
     * Актуальная инициализация игровых модулей.
     * @param {string} roomId
     * @param {{force?: boolean}} options
     * @returns {boolean} true, если выполнена новая инициализация
     */
    _initializeGameModules(roomId, options = {}) {
        // Защита от множественных одновременных вызовов
        if (this._initInProgress && !options.force) {
            console.log('ℹ️ App: Инициализация игровых модулей уже в процессе, пропускаем');
            return false;
        }
        
        // Сбрасываем флаг для PlayerTokens при новой инициализации
        this._playerTokensForceUpdateCalled = false;
        
        const { force = false } = options;
        const resolvedRoomId = roomId || this.activeRoomId || null;
        const roomChanged = Boolean(this.activeRoomId && resolvedRoomId && this.activeRoomId !== resolvedRoomId);
        const shouldForce = force || roomChanged;

        if (this.gameModulesReady && !shouldForce) {
            this.logger?.debug('Игровые модули уже готовы', { roomId: this.activeRoomId }, 'App');
            return false;
        }
        
        this._initInProgress = true;

        if (shouldForce) {
            this.logger?.info('Переинициализация игровых модулей', {
                previousRoomId: this.activeRoomId,
                nextRoomId: resolvedRoomId
            }, 'App');
            this._teardownGameModules();
        }

        this.activeRoomId = resolvedRoomId;
        this.logger?.info('Инициализация игровых модулей для комнаты', { roomId: this.activeRoomId }, 'App');
        
        try {

        const eventBus = this.getEventBus();
        let gameStateManager = this.getGameStateManager();
        
        // ИСПРАВЛЕНО: Используем существующий GameStateManager (избегаем дубликатов)
        if (!gameStateManager && window.GameStateManager) {
            console.log('🔧 App: Получаем существующий GameStateManager');
            gameStateManager = this.getGameStateManager();
            if (!gameStateManager) {
                console.error('❌ App: GameStateManager не найден, это критическая ошибка!');
                return;
            }
        }
        
        const pushClient = this.getPushClient();

        // ИСПРАВЛЕНО: Используем существующий GameState (критический guard)
        if (!this.getModule('gameState') && window.GameState) {
            try {
                console.warn('⚠️ App: Критический fallback - создаем GameState в _handleGameRoute');
                const gameState = new window.GameState(eventBus);
                this.modules.set('gameState', gameState);
            } catch (error) {
                this.logger?.warn('Не удалось создать GameState', error, 'App');
            }
        }

        if (!this.modules.get('roomApi') && window.RoomApi) {
            try {
                const roomApi = resolvedRoomId ? new window.RoomApi(resolvedRoomId) : new window.RoomApi();
                this.modules.set('roomApi', roomApi);
            } catch (error) {
                this.logger?.warn('Не удалось создать RoomApi', error, 'App');
            }
        }

        if (gameStateManager && typeof gameStateManager.setRoomId === 'function') {
            gameStateManager.setRoomId(this.activeRoomId || null);
        }

        if (pushClient && typeof pushClient.subscribe === 'function') {
            pushClient.subscribe().catch((error) => {
                this.logger?.warn('Ошибка подписки PushClient', error, 'App');
            });
        }

        if (shouldForce) {
            this._destroyModule('boardLayout');
        }
        if (!this.modules.get('boardLayout') && window.BoardLayout) {
            // Проверяем наличие BoardConfig перед инициализацией
            const checkAndInitBoardLayout = () => {
                if (!window.BoardConfig && !window.BIG_CIRCLE_CELLS && !window.SMALL_CIRCLE_CELLS) {
                    console.warn('⚠️ App: BoardConfig не загружен, ждем...', {
                        hasBoardConfig: !!window.BoardConfig,
                        hasBIG_CIRCLE: !!window.BIG_CIRCLE_CELLS,
                        hasSMALL_CIRCLE: !!window.SMALL_CIRCLE_CELLS
                    });
                    return false;
                }
                
            try {
                const boardLayout = new window.BoardLayout({
                    outerTrackSelector: '#outer-track',
                    innerTrackSelector: '#inner-track',
                    gameState: this.getModule('gameState'),
                    eventBus,
                    logger: this.logger,
                    debug: this.config?.get?.('logging.boardLayoutDebug', false)
                });
                this.modules.set('boardLayout', boardLayout);
                    console.log('✅ App: BoardLayout инициализирован успешно');
                    return true;
            } catch (error) {
                this.logger?.error('BoardLayout: ошибка инициализации', error, 'App');
                    console.error('❌ App: Ошибка инициализации BoardLayout:', error);
                    return false;
                }
            };
            
            // Пытаемся инициализировать сразу
            if (!checkAndInitBoardLayout()) {
                // Если не получилось, ждем загрузки конфигурации
                let attempts = 0;
                const maxAttempts = 20; // 2 секунды максимум
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (checkAndInitBoardLayout()) {
                        clearInterval(checkInterval);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        console.error('❌ App: BoardConfig не загружен после всех попыток');
                    }
                }, 100);
            }
        }

        const ensureModule = (name, factory, { forceRecreate = shouldForce, lazyLoad = false } = {}) => {
            if (forceRecreate) {
                this._destroyModule(name);
            }
            if (!this.modules.get(name)) {
                // Если модуль требует ленивой загрузки, загружаем его сначала (синхронно)
                if (lazyLoad && window.ModuleLoader && this._lazyModulesMap && this._lazyModulesMap[name]) {
                    const modulePath = this._lazyModulesMap[name];
                    if (!window.ModuleLoader.isLoaded(modulePath)) {
                        console.log(`⚡ App: Загружаем модуль ${name} по требованию...`);
                        // Синхронная загрузка для критических модулей
                        const script = document.createElement('script');
                        script.src = `assets/js/${modulePath}?v=${Date.now()}`;
                        script.async = false;
                        document.head.appendChild(script);
                        // Помечаем как загруженный
                        window.ModuleLoader.loadedModules.add(modulePath);
                    }
                }
                
                const instance = factory();
                if (instance) {
                    this.modules.set(name, instance);
                }
            }
            return this.modules.get(name);
        };

        ensureModule('cardDeckPanel', () => {
            if (!window.CardDeckPanel) return null;
            return new window.CardDeckPanel({
                containerSelector: '#card-decks-panel',
                eventBus
            });
        }, { forceRecreate: false, lazyLoad: true });

        ensureModule('bankPreview', () => {
            if (!window.BankPreview || !window.BankPreview.getInstance) return null;
            return window.BankPreview.getInstance({
                containerSelector: '#bank-preview-container',
                eventBus,
                gameStateManager
            });
        }, { forceRecreate: false, lazyLoad: true });

        ensureModule('dealModule', () => {
            if (!window.DealModule) return null;
            return new window.DealModule({
                eventBus,
                roomId: this.activeRoomId
            });
        });

        ensureModule('playerTokens', () => {
            if (!window.PlayerTokens) return null;
            return new window.PlayerTokens({
                gameState: this.getModule('gameState'),
                eventBus,
                outerTrackSelector: '#outer-track',
                innerTrackSelector: '#inner-track'
            });
        }, { lazyLoad: true });

        ensureModule('diceService', () => {
            if (!window.DiceService) return null;
            return new window.DiceService({
                gameState: this.getModule('gameState'),
                eventBus
            });
        });

        ensureModule('diceDisplay', () => {
            if (!window.DiceDisplay) return null;
            return new window.DiceDisplay({
                eventBus,
                diceService: this.modules.get('diceService')
            });
        });

        ensureModule('movementService', () => {
            if (!window.MovementService) return null;
            return new window.MovementService({
                gameState: this.getModule('gameState'),
                eventBus
            });
        });

        // ОТКЛЮЧЕНО: PlayerTokenRenderer конфликтует с PlayerTokens
        // PlayerTokens - единственный источник истины для рендеринга фишек с данными сервера
        // ensureModule('playerTokenRenderer', () => {
        //     if (!window.PlayerTokenRenderer) return null;
        //     return new window.PlayerTokenRenderer({
        //         gameState: this.getModule('gameState'),
        //         eventBus,
        //         movementService: this.modules.get('movementService')
        //     });
        // });

        ensureModule('professionSystem', () => {
            if (!window.ProfessionSystem) return null;
            return new window.ProfessionSystem({
                gameState: this.modules.get('gameState'),
                eventBus
            });
        });

        ensureModule('playerBalanceDisplay', () => {
            if (!window.PlayerBalanceDisplay) return null;
            return new window.PlayerBalanceDisplay({
                gameState: this.modules.get('gameState'),
                eventBus,
                roomApi: this.modules.get('roomApi')
            });
        });

        ensureModule('playersPanel', () => {
            if (!window.PlayersPanel) return null;
            return new window.PlayersPanel({
                gameStateManager,
                eventBus,
                containerId: 'players-panel'
            });
        }, { lazyLoad: true });

        ensureModule('turnService', () => {
            if (!window.TurnService) return null;
            const gameState = this.getModule('gameState');
            const roomApi = this.modules.get('roomApi');
            const diceService = this.modules.get('diceService');
            const movementService = this.modules.get('movementService');
            if (!gameState || !roomApi || !movementService) {
                this.logger?.warn('TurnService: отсутствуют зависимости', {
                    hasGameState: Boolean(gameState),
                    hasRoomApi: Boolean(roomApi),
                    hasMovementService: Boolean(movementService)
                }, 'App');
                return null;
            }
            return new window.TurnService({
                state: gameState,
                gameState,
                roomApi,
                eventBus: eventBus || this.getEventBus(),
                diceService,
                movementService,
                gameStateManager
            });
        });

        ensureModule('turnManager', () => {
            if (!window.TurnManager) return null;
            const turnService = this.modules.get('turnService');
            const movementService = this.modules.get('movementService');
            if (!turnService || !movementService) {
                this.logger?.warn('TurnManager: отсутствуют зависимости', {
                    hasTurnService: Boolean(turnService),
                    hasMovementService: Boolean(movementService)
                }, 'App');
                return null;
            }
            return new window.TurnManager({
                turnService,
                movementService,
                gameStateManager,
                eventBus,
                stepDelayMs: 500
            });
        });

        ensureModule('turnController', () => {
            if (!window.TurnController) return null;
            const turnService = this.modules.get('turnService');
            const playerTokens = this.modules.get('playerTokens');
            const turnManager = this.modules.get('turnManager');
            if (!turnService) return null;
            return new window.TurnController(
                turnService,
                playerTokens,
                gameStateManager,
                eventBus,
                turnManager
            );
        });

        this._safePlayerTokensForceUpdate('_initializeGameModules');

        this.gameModulesReady = true;
        this._finalizeGameModules();
        return true;
        
        } catch (error) {
            this.logger?.error('Ошибка инициализации игровых модулей', error, 'App');
            this._initInProgress = false; // Сбрасываем флаг при ошибке
            throw error;
        } finally {
            this._initInProgress = false; // Гарантированно сбрасываем флаг
        }
    }

    _destroyModule(name) {
        const instance = this.modules.get(name);
        if (!instance) {
            return;
        }

        const teardownCandidates = ['destroy', 'dispose', 'teardown', 'removeAllListeners', 'off'];
        for (const method of teardownCandidates) {
            if (typeof instance[method] === 'function') {
                try {
                    if (method === 'off' && instance[method].length > 0) {
                        continue;
                    }
                    instance[method]();
                } catch (error) {
                    this.logger?.warn(`Ошибка при уничтожении модуля ${name}`, error, 'App');
                }
                break;
            }
        }

        this.modules.delete(name);
    }

    _teardownGameModules() {
        const moduleNames = [
            'turnSyncService',
            'turnController',
            'turnService',
            'movementService',
            'diceDisplay',
            'diceService',
            'playerTokens',
            'playerTokenRenderer',
            'playersPanel',
            'playerBalanceDisplay',
            'professionSystem',
            'dealModule',
            'cardDeckPanel',
            'bankPreview',
            'boardLayout',
            'bankModuleServer',
            'gameState',
            'roomApi'
        ];

        moduleNames.forEach((name) => this._destroyModule(name));
        this.activeRoomId = null;
        this.gameModulesReady = false;
    }

    /**
     * Принудительная инициализация левой панели (BankPreview и CardDeckPanel)
     */
    _initializeLeftPanel() {
        console.log('🎯 App: Принудительная инициализация панелей...');
        
        const decksContainer = document.querySelector('#card-decks-panel');
        const bankContainer = document.querySelector('#bank-preview-container');
        
        if (!decksContainer) {
            console.warn('⚠️ App: Контейнер #card-decks-panel не найден');
        }
        if (!bankContainer) {
            console.warn('⚠️ App: Контейнер #bank-preview-container не найден');
        }
        
        // Инициализируем BankPreview если еще не инициализирован
        if (!this.modules.get('bankPreview') && window.BankPreview && bankContainer) {
            console.log('🏦 App: Инициализируем BankPreview...');
            try {
                const bankPreview = new window.BankPreview({
                    containerSelector: '#bank-preview-container',
                    eventBus: this.getEventBus(),
                    gameStateManager: this.getGameStateManager()
                });
                this.modules.set('bankPreview', bankPreview);
                console.log('✅ BankPreview: Инициализирован принудительно');
            } catch (error) {
                console.error('❌ App: Ошибка инициализации BankPreview:', error);
            }
        }
        
        // Инициализируем CardDeckPanel если еще не инициализирован
        if (!this.modules.get('cardDeckPanel') && window.CardDeckPanel && decksContainer) {
            console.log('🃏 App: Инициализируем CardDeckPanel...');
            try {
                const cardDeckPanel = new window.CardDeckPanel({
                    containerSelector: '#card-decks-panel',
                    eventBus: this.getEventBus()
                });
                this.modules.set('cardDeckPanel', cardDeckPanel);
                console.log('✅ CardDeckPanel: Инициализирован принудительно');
            } catch (error) {
                console.error('❌ App: Ошибка инициализации CardDeckPanel:', error);
            }
        }
        
        const bankPreview = this.modules.get('bankPreview');
        if (bankPreview) {
            // Пытаемся обновить данные из GameStateManager если он доступен
            const gameStateManager = this.getGameStateManager();
            if (gameStateManager && gameStateManager._state) {
                if (typeof bankPreview.updatePreviewDataFromState === 'function') {
                    // Принудительно обновляем данные банка
                    setTimeout(() => {
                        bankPreview.updatePreviewDataFromState(gameStateManager._state);
                        console.log('🏦 App: BankPreview данные обновлены из GameStateManager');
                    }, 300);
                }
            } else if (typeof bankPreview.updatePreviewData === 'function') {
                // Принудительно загружаем данные
                setTimeout(() => {
            bankPreview.updatePreviewData();
            console.log('🏦 App: BankPreview данные обновлены');
                }, 300);
            }
            
            // Дополнительная попытка обновления через loadInitialData
            if (typeof bankPreview.loadInitialData === 'function') {
                setTimeout(() => {
                    bankPreview.loadInitialData();
                    console.log('🏦 App: BankPreview принудительная загрузка данных');
                }, 500);
            }
        }
        
        const cardDeckPanel = this.modules.get('cardDeckPanel');
        if (cardDeckPanel && typeof cardDeckPanel.loadDecks === 'function') {
            cardDeckPanel.loadDecks();
            console.log('🃏 App: CardDeckPanel данные обновлены');
        }
        
        requestAnimationFrame(() => {
            const decksContent = decksContainer?.innerHTML.trim() || '';
            const bankContent = bankContainer?.innerHTML.trim() || '';
            console.log('🎯 App: Проверка содержимого панелей:', {
                decksExists: !!decksContainer,
                decksHasContent: decksContent.length > 0,
                bankExists: !!bankContainer,
                bankHasContent: bankContent.length > 0,
                cardsExist: !!decksContainer?.querySelector('.card-deck-card'),
                previewExists: !!bankContainer?.querySelector('.bank-preview-card')
            });
        });
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
        // Сначала проверяем модули
        let module = this.modules.get(name);
        if (module) {
            return module;
        }
        
        // Затем проверяем сервисы
        module = this.services.get(name);
        if (module) {
            return module;
        }
        
        return null;
    }

    getService(name) {
        return this.services.get(name);
    }

    getGameStateManager() {
        return this.services.get('gameStateManager');
    }

    getPushClient() {
        return this.services.get('pushClient');
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
        this.activeRoomId = null;
        this.gameModulesReady = false;
        
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
     * Инициализация игры
     */
    initGame() {
        try {
            this.logger?.info('Инициализация игры...', null, 'App');
            
            // Получаем ID комнаты из URL
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            const roomId = urlParams.get('roomId');
            
            if (!roomId) {
                this.logger?.warn('ID комнаты не найден в URL', null, 'App');
                return;
            }
            
            // Инициализируем игровые модули
            const shouldForce = Boolean(this.activeRoomId && this.activeRoomId !== roomId);
            this._initGameModules(roomId, { force: shouldForce });
            
            this.logger?.info('Игра инициализирована', { roomId }, 'App');
        } catch (error) {
            this.logger?.error('Ошибка инициализации игры', error, 'App');
        }
    }
    
    /**
     * Инициализация игровых модулей
     * @param {string} roomId - ID комнаты
     * @private
     */
    _initGameModules(roomId, options = {}) {
        const { force = false } = options;
        try {
            const initialized = this._initializeGameModules(roomId, { force });
            if (initialized) {
                this.logger?.info('Игровые модули созданы и инициализированы', {
                    modules: Array.from(this.modules.keys())
                }, 'App');
            } else {
                this.logger?.debug('Игровые модули уже были готовы', {
                    roomId: this.activeRoomId
                }, 'App');
            }
        } catch (error) {
            this.logger?.error('Ошибка создания игровых модулей', error, 'App');
            throw error;
        }
    }
    
    /**
     * Инициализация созданных игровых модулей
     * @private
     */
    _finalizeGameModules() {
        try {
            const gameStateManager = this.services.get('gameStateManager');
            const eventBus = this.services.get('eventBus');
            
            // Инициализируем TurnController
            const turnController = this.modules.get('turnController');
            if (turnController) {
                // init() уже содержит setupEventListeners через bindToExistingUI
                if (typeof turnController.init === 'function') {
                    turnController.init();
                }
            }
            
            // Инициализируем PlayersPanel
            const playersPanel = this.modules.get('playersPanel');
            if (playersPanel) {
                if (typeof playersPanel.init === 'function') {
                    playersPanel.init();
                }
                // Убеждаемся, что слушатели событий настроены
                if (typeof playersPanel.setupEventListeners === 'function') {
                    playersPanel.setupEventListeners();
                }
            }
            
            // Инициализируем BoardLayout
            const boardLayout = this.modules.get('boardLayout');
            if (boardLayout && typeof boardLayout.init === 'function') {
                boardLayout.init();
            }
            
            // Подписываемся на события GameStateManager
            if (gameStateManager) {
                // Принудительно обновляем состояние после инициализации
                if (typeof gameStateManager.forceUpdate === 'function') {
                    gameStateManager.forceUpdate();
                }
            }
            
            this.logger?.info('Игровые модули инициализированы', null, 'App');
        } catch (error) {
            this.logger?.error('Ошибка инициализации игровых модулей', error, 'App');
        }
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

    /**
     * Централизованный вызов forceUpdate для PlayerTokens с защитой от множественных вызовов
     * @private
     */
    _safePlayerTokensForceUpdate(context = 'unknown') {
        if (this._playerTokensForceUpdateCalled) {
            console.log(`🎯 App: Пропускаем forceUpdate PlayerTokens из контекста "${context}" - уже вызывался`);
            return;
        }

        const playerTokens = this.modules.get('playerTokens');
        if (playerTokens && typeof playerTokens.forceUpdate === 'function') {
            console.log(`🎯 App: forceUpdate PlayerTokens из контекста "${context}"`);
            this._playerTokensForceUpdateCalled = true;
            playerTokens.forceUpdate();
        }
    }

    /**
     * Публичный метод для безопасного обновления PlayerTokens (для глобальных функций)
     * @public
     */
    safePlayerTokensForceUpdate(context = 'global') {
        this._safePlayerTokensForceUpdate(context);
    }

    /**
     * Сброс флага для PlayerTokens forceUpdate (при переходе между комнатами)
     * @public
     */
    resetPlayerTokensForceUpdateFlag() {
        this._playerTokensForceUpdateCalled = false;
        console.log('🎯 App: Сброшен флаг _playerTokensForceUpdateCalled');
    }
    
    /**
     * Запуск мониторинга производительности
     * @private
     */
    _startPerformanceMonitoring() {
        if (this.performanceMonitor) {
            this.performanceMonitor.start();
            this.logger?.info('Мониторинг производительности запущен', null, 'App');
            
            // Выводим отчет каждые 30 секунд в development режиме
            if (this.config?.environment === 'development') {
                setInterval(() => {
                    this.performanceMonitor.printReport();
                }, 30000);
            }
        } else {
            this.logger?.warn('PerformanceMonitor не найден', null, 'App');
        }
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.App = App;
    
    // Глобальная функция для восстановления игроков и фишек
    window.restorePlayers = function() {
        console.log('🔄 Global: Восстановление игроков и фишек');
        
        if (window.app) {
            // Восстанавливаем через PlayersPanel
            const playersPanel = window.app.getModule('playersPanel');
            if (playersPanel && typeof playersPanel.forceRestorePlayers === 'function') {
                console.log('🔄 Global: Восстанавливаем через PlayersPanel');
                playersPanel.forceRestorePlayers();
            }
            
            // Восстанавливаем фишки через PlayerTokens (используем защищенный метод)
            if (typeof window.app.safePlayerTokensForceUpdate === 'function') {
                window.app.safePlayerTokensForceUpdate('window.restorePlayers');
            } else {
                console.warn('⚠️ Global: safePlayerTokensForceUpdate метод недоступен, пропускаем');
            }
            
            // Принудительно обновляем GameStateManager
            const gameStateManager = window.app.getModule('gameStateManager');
            if (gameStateManager && typeof gameStateManager.forceUpdate === 'function') {
                console.log('🔄 Global: Принудительно обновляем GameStateManager');
                gameStateManager.forceUpdate();
            }
        } else {
            console.warn('⚠️ Global: window.app не инициализирован');
        }
    };
    
    console.log('✅ Global: Функция window.restorePlayers() доступна');
    
    // Глобальная функция для принудительного обновления всех компонентов
    window.forceUpdateAllComponents = function() {
        console.log('🔄 Global: Принудительное обновление всех компонентов');
        
        if (window.app) {
            // Используем централизованный метод GameStateManager
            const gameStateManager = window.app.getModule('gameStateManager');
            if (gameStateManager && typeof gameStateManager.forceUpdateAllComponents === 'function') {
                console.log('🔄 Global: Используем централизованное обновление GameStateManager');
                gameStateManager.forceUpdateAllComponents();
            } else {
                console.warn('⚠️ Global: GameStateManager.forceUpdateAllComponents недоступен, используем fallback');
                
                // Fallback: обновляем компоненты по отдельности
                if (gameStateManager && typeof gameStateManager.forceUpdate === 'function') {
                    gameStateManager.forceUpdate();
                }
                
                const playersPanel = window.app.getModule('playersPanel');
                if (playersPanel && typeof playersPanel.forceUpdateGameState === 'function') {
                    playersPanel.forceUpdateGameState();
                }
                
                const playerTokens = window.app.getModule('playerTokens');
                if (playerTokens && typeof playerTokens.forceUpdateFromGameState === 'function') {
                    playerTokens.forceUpdateFromGameState();
                } else if (playerTokens && typeof playerTokens.forceUpdate === 'function') {
                    if (typeof window.app.safePlayerTokensForceUpdate === 'function') {
                        window.app.safePlayerTokensForceUpdate('window.forceUpdateAllComponents');
                    }
                }
                
                const bankPreview = window.app.getModule('bankPreview');
                if (bankPreview && typeof bankPreview.updatePreviewData === 'function') {
                    bankPreview.updatePreviewData();
                }
            }
            
            console.log('✅ Global: Все компоненты обновлены');
        } else {
            console.warn('⚠️ Global: window.app не инициализирован');
        }
    };
    
    console.log('✅ Global: Функция window.forceUpdateAllComponents() доступна');
}


// Автоматическая инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM загружен, инициализируем приложение...');
    
    // Создаем экземпляр приложения, если он еще не был создан
    if (!window.app || !(window.app instanceof App)) {
        window.app = new App();
    }

    // Запускаем полную инициализацию один раз
    if (typeof window.app.init === 'function' && !window.app.isInitialized) {
        try {
            window.app.init();
        } catch (error) {
            console.error('❌ App: Ошибка начальной инициализации', error);
        }
    }
    
    // Инициализируем игру если мы на игровой странице
    const hash = window.location.hash;
    if (hash.includes('game')) {
        console.log('🎮 Обнаружен игровой маршрут, инициализируем игру...');
        window.app.initGame();
    }
});

// Version: 1760439000 - App v2.0.0
