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
        
        // Создаем GameStateManager для централизованного управления состоянием
        this.services.set('gameStateManager', new window.GameStateManager());
        
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
                eventBus: this.getEventBus(),
                logger: this.logger,
                debug: this.config?.get?.('logging.boardLayoutDebug', false)
            });
            this.modules.set('boardLayout', boardLayout);
            this.logger?.debug('BoardLayout модуль загружен', null, 'App');
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
                gamePage.style.display = 'block';
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
     * Инициализация игровых модулей с GameStateManager
     * @param {string} roomId - ID комнаты
     */
    _initializeGameModules(roomId) {
        this.logger?.info('Инициализация игровых модулей для комнаты', { roomId }, 'App');
        
        // Гарантируем наличие GameState до инициализации зависимых модулей
        if (!this.getModule('gameState') && window.GameState) {
            try {
                const gs = new window.GameState(this.getEventBus());
                this.modules.set('gameState', gs);
                console.log('🎮 App: GameState создан (guard)');
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

        // Инициализируем BankPreview с отсрочкой
        const initBankPreview = () => {
            if (window.BankPreview && !this.modules.get('bankPreview')) {
                const bankPreview = new window.BankPreview({
                    containerSelector: '#card-decks-panel',
                    eventBus: this.getEventBus(),
                    gameStateManager: gameStateManager
                });
                this.modules.set('bankPreview', bankPreview);
                console.log('🏦 BankPreview: Инициализирован');
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
            const playerTokens = new window.PlayerTokens({
                gameState: this.getModule('gameState'),
                eventBus: this.getEventBus(),
                outerTrackSelector: '#outer-track',
                innerTrackSelector: '#inner-track'
            });
            this.modules.set('playerTokens', playerTokens);
            console.log('🎯 PlayerTokens: Инициализирован');
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
        if (window.PlayersPanel) {
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
        }
        
        // Инициализируем TurnService (с защитой от отсутствия GameState)
        if (window.TurnService) {
            try {
                console.log('🎯 App: Инициализируем TurnService...');
                let gameState = this.getModule('gameState');
                if (!gameState && window.GameState) {
                    console.warn('⚠️ App: GameState не найден, создаем новый (late)...');
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
        } else {
            console.warn('⚠️ App: TurnService не найден в window');
        }
        
        // Оптимизированная инициализация TurnController - убрана задержка для мгновенной загрузки
        if (window.TurnController) {
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
        const playerTokens = this.modules.get('playerTokens');
        if (playerTokens) {
            console.log('🎯 App: Обновление фишек игроков...');
            playerTokens.forceUpdate();
        }

        // Удален избыточный retry механизм - вызывает множественную инициализацию модулей
        // setTimeout(() => { /* retry logic */ }, 800); // REMOVED для оптимизации
    }

    /**
     * Принудительная инициализация левой панели (BankPreview и CardDeckPanel)
     */
    _initializeLeftPanel() {
        console.log('🎯 App: Принудительная инициализация левой панели...');
        
        // Проверяем наличие контейнера
        const container = document.querySelector('#card-decks-panel');
        if (!container) {
            console.warn('⚠️ App: Контейнер #card-decks-panel не найден');
            return;
        }
        
        // Инициализируем BankPreview если еще не инициализирован
        if (!this.modules.get('bankPreview') && window.BankPreview) {
            console.log('🏦 App: Инициализируем BankPreview...');
            try {
                const bankPreview = new window.BankPreview({
                    containerSelector: '#card-decks-panel',
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
        if (!this.modules.get('cardDeckPanel') && window.CardDeckPanel) {
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
        
        // Принудительно обновляем данные мгновенно (убрана задержка)
        const bankPreview = this.modules.get('bankPreview');
        if (bankPreview && typeof bankPreview.updatePreviewData === 'function') {
            bankPreview.updatePreviewData();
            console.log('🏦 App: BankPreview данные обновлены');
        }
        
        const cardDeckPanel = this.modules.get('cardDeckPanel');
        if (cardDeckPanel && typeof cardDeckPanel.loadDecks === 'function') {
            cardDeckPanel.loadDecks();
            console.log('🃏 App: CardDeckPanel данные обновлены');
        }
        
        // Проверяем, что контейнер не пустой
        setTimeout(() => {
            const containerContent = container.innerHTML.trim();
            console.log('🎯 App: Проверка содержимого левой панели:', {
                containerExists: !!container,
                hasContent: containerContent.length > 0,
                contentLength: containerContent.length,
                previewExists: !!container.querySelector('.bank-preview-card'),
                cardsExist: !!container.querySelector('.card-deck-card')
            });
        }, 500);
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
            this._initGameModules(roomId);
            
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
    _initGameModules(roomId) {
        try {
            // Создаем игровые модули
            const gameState = new window.GameState(this.services.get('eventBus'));
            const roomApi = new window.RoomApi(roomId);
            const diceService = new window.DiceService();
            const movementService = new window.MovementService(gameState, this.services.get('eventBus'));
            const turnService = new window.TurnService({
                state: gameState,
                roomApi: roomApi,
                diceService: diceService,
                movementService: movementService,
                gameStateManager: this.services.get('gameStateManager')
            });
            
            // Создаем UI компоненты
            const playerTokenRenderer = new window.PlayerTokenRenderer();
            const turnController = new window.TurnController(
                turnService,
                playerTokenRenderer,
                this.services.get('gameStateManager'),
                this.services.get('eventBus')
            );
            const playersPanel = new window.PlayersPanel({
                gameStateManager: this.services.get('gameStateManager'),
                eventBus: this.services.get('eventBus')
            });
            
            // Вызываем init() для правильной инициализации TurnController
            if (typeof turnController.init === 'function') {
                // Добавляем небольшую задержку для PlayersPanel
                setTimeout(() => {
                    turnController.init();
                    console.log('🎯 TurnController: init() вызван (_initGameModules)');
                }, 50);
            }
            if (typeof playersPanel.setupEventListeners === 'function') {
                playersPanel.setupEventListeners();
                console.log('🎯 PlayersPanel: setupEventListeners вызван (_initGameModules)');
            }
            
            // Создаем игровое поле
            const boardLayout = new window.BoardLayout({
                outerTrackSelector: '#outer-track',
                innerTrackSelector: '#inner-track',
                gameState: gameState,
                eventBus: this.services.get('eventBus'),
                logger: this.logger,
                debug: this.config?.get?.('logging.boardLayoutDebug', false)
            });
            
            // Сохраняем модули
            this.modules.set('gameState', gameState);
            this.modules.set('roomApi', roomApi);
            this.modules.set('diceService', diceService);
            this.modules.set('movementService', movementService);
            this.modules.set('turnService', turnService);
            this.modules.set('playerTokenRenderer', playerTokenRenderer);
            this.modules.set('turnController', turnController);
            this.modules.set('playersPanel', playersPanel);
            this.modules.set('boardLayout', boardLayout);
            
            // Инициализируем модули
            this._initializeGameModules();
            
            this.logger?.info('Игровые модули созданы и инициализированы', {
                modules: Array.from(this.modules.keys())
            }, 'App');
            
        } catch (error) {
            this.logger?.error('Ошибка создания игровых модулей', error, 'App');
            throw error;
        }
    }
    
    /**
     * Инициализация созданных игровых модулей
     * @private
     */
    _initializeGameModules() {
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
}

// Экспорт
if (typeof window !== 'undefined') {
    window.App = App;
}

// Автоматическая инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM загружен, инициализируем приложение...');
    
    // Создаем экземпляр приложения
    window.app = new App();
    
    // Инициализируем игру если мы на игровой странице
    const hash = window.location.hash;
    if (hash.includes('game')) {
        console.log('🎮 Обнаружен игровой маршрут, инициализируем игру...');
        window.app.initGame();
    }
});

// Version: 1760439000 - App v2.0.0
