/**
 * Главное приложение Aura Money v1.0.0
 * Управление навигацией и инициализация компонентов
 */

class App {
    constructor() {
        this.router = null;
        this.boardLayout = null;
        this.eventBus = null;
        this.gameState = null;
        this.currentUser = null;
        this.turnService = null;
        this.turnController = null;
        this.playerTokenRenderer = null;
        this.roomApi = null;
        
        console.log('🚀 App: Инициализация приложения');
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
        // Инициализируем компоненты игры
        this.initGameComponents();
        
        // Инициализируем роутер
        this.initRouter();
            
            // Настраиваем навигацию
            this.setupNavigation();
            
            // Проверяем авторизацию
            this.checkAuthentication();
            
            console.log('✅ App: Приложение инициализировано');
        } catch (error) {
            console.error('❌ App: Ошибка инициализации:', error);
        }
    }

    /**
     * Инициализация роутера
     */
    initRouter() {
        console.log('🗺️ App: Инициализация роутера');
        
        this.router = new window.Router();
        
        // Регистрируем маршруты
        this.router.route('/', () => {
            this.showPage('game-page');
            // Навигация удалена
            this.updateNavigation('/');
            // Автоматически выбираем комнату при загрузке главной страницы
            this.autoSelectRoom();
        }, 'Главная');
        
        this.router.route('/auth', () => {
            this.showPage('auth-page');
            // Навигация удалена
            this.updateNavigation('/auth');
        }, 'Авторизация');
        
        this.router.route('/lobby', () => {
            // Перенаправляем на отдельную страницу лобби
            window.location.href = 'pages/lobby.html';
        }, 'Лобби');
        
        this.router.route('/rooms', () => {
            // Перенаправляем на отдельную страницу комнат
            window.location.href = 'pages/rooms.html';
        }, 'Комнаты');
        
        this.router.route('/game', (state) => {
            this.showPage('game-page');
            // Навигация удалена
            this.updateNavigation('/');
            this.handleGameRoute(state);
        }, 'Игра');
        
        // Устанавливаем маршрут по умолчанию
        this.router.defaultRoute = '/';
        
        // Сохраняем роутер в глобальной области
        window.router = this.router;
        
        console.log('✅ App: Роутер инициализирован');
    }

    /**
     * Инициализация игровых компонентов
     */
    initGameComponents() {
        console.log('🎮 App: Инициализация игровых компонентов');
        
        // Скрываем навигацию для игровой страницы
        // Навигация удалена
        
        try {
            // Создаем EventBus
            this.eventBus = new window.EventBus();
            console.log('✅ EventBus создан');
            
            // Создаем GameState
            this.gameState = new window.GameState(this.eventBus);
            console.log('✅ GameState создан');
            
            // Создаем RoomApi
            this.roomApi = new window.RoomApi();
            console.log('✅ RoomApi создан');
            
            // Создаем PushClient
            this.pushClient = new window.PushClient({
                gameState: this.gameState,
                eventBus: this.eventBus
            });
            console.log('📱 App: PushClient создан');
            
            // Создаем DiceService
            this.diceService = new window.DiceService({
                gameState: this.gameState,
                eventBus: this.eventBus
            });
            console.log('🎲 App: DiceService создан');
            
            // Создаем MovementService
            this.movementService = new window.MovementService({
                gameState: this.gameState,
                eventBus: this.eventBus
            });
            console.log('🚀 App: MovementService создан');
            
            // Создаем TurnService
            this.turnService = new window.TurnService({
                state: this.gameState,
                roomApi: this.roomApi,
                diceService: this.diceService,
                movementService: this.movementService
            });
            console.log('✅ TurnService создан');
            
            // Создаем PlayerTokenRenderer
            this.playerTokenRenderer = new window.PlayerTokenRenderer({
                gameState: this.gameState,
                eventBus: this.eventBus,
                movementService: this.movementService
            });
            console.log('✅ PlayerTokenRenderer создан');
            
            // Создаем TurnController
            try {
                this.turnController = new window.TurnController(
                    this.turnService,
                    this.playerTokenRenderer
                );
                console.log('🎮 App: TurnController создан:', this.turnController);
            } catch (error) {
                console.error('❌ App: Ошибка создания TurnController:', error);
                this.turnController = null;
            }
            
        // Создаем ModalService
        this.modalService = new window.ModalService({
            eventBus: this.eventBus
        });
        console.log('🪟 App: ModalService создан');
        
        // Создаем BalanceManager
        this.balanceManager = new window.BalanceManager({
            gameState: this.gameState
        });
        console.log('💰 App: BalanceManager создан');
        
        // Создаем PlayersPanel
        this.playersPanel = new window.PlayersPanel({
            gameState: this.gameState,
            eventBus: this.eventBus,
            containerId: 'players-panel'
        });
        console.log('👥 App: PlayersPanel создан');
        
        // Создаем PlayerTokens
        this.playerTokens = new window.PlayerTokens({
            gameState: this.gameState,
            eventBus: this.eventBus,
            outerTrackSelector: '#outer-track',
            innerTrackSelector: '#inner-track'
        });
        console.log('🎯 App: PlayerTokens создан');
        
        // Создаем CellInteractionService
        this.cellInteractionService = new window.CellInteractionService({
            gameState: this.gameState,
            eventBus: this.eventBus,
            balanceManager: this.balanceManager
        });
        console.log('🎯 App: CellInteractionService создан');
        
        // Сохраняем компоненты в глобальной области
        window.balanceManager = this.balanceManager;
        window.pushClient = this.pushClient;
            
            // Инициализируем BoardLayout
            this.boardLayout = new window.BoardLayout({
                outerTrackSelector: '#outer-track',
                innerTrackSelector: '#inner-track',
                gameState: this.gameState,
                eventBus: this.eventBus
            });
            
            console.log('✅ App: Игровые компоненты инициализированы');
            
            // Добавляем тестовых игроков для демонстрации
            this.gameState.addTestPlayers();
            
            // Настраиваем обработчики кликов для главной страницы
            this.setupMainPageHandlers();
            
            // Инициализируем центральный кубик
            this.initCenterDice();
        } catch (error) {
            console.error('❌ App: Ошибка инициализации игровых компонентов:', error);
            // Продолжаем работу без игровых компонентов
            this.eventBus = null;
            this.gameState = null;
            this.boardLayout = null;
            
            // Настраиваем обработчики кликов для главной страницы даже без игровых компонентов
            this.setupMainPageHandlers();
            
            // Инициализируем центральный кубик даже при ошибке
            this.initCenterDice();
            this.turnService = null;
            this.turnController = null;
            this.playerTokenRenderer = null;
            this.roomApi = null;
        }
    }

    /**
     * Настройка навигации
     */
    setupNavigation() {
        console.log('🧭 App: Настройка навигации');
        
        // Обработчики для навигационных ссылок
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.dataset.route;
                if (route && this.router) {
                    this.router.navigate(route);
                }
            });
        });
        
        // Обработчик для кнопки авторизации
        const authButton = document.getElementById('auth-button');
        if (authButton) {
            authButton.addEventListener('click', () => {
                if (this.router) {
                    this.router.navigate('/auth');
                } else {
                    window.location.href = 'auth/';
                }
            });
        }
        
        // Обработчики для кнопок на главной странице
        const selectRoomBtn = document.querySelector('button[onclick*="router.navigate(\'/rooms\')"]');
        if (selectRoomBtn) {
            selectRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.router) {
                    this.router.navigate('/rooms');
                } else {
                    window.location.href = 'pages/rooms.html';
                }
            });
        }
        
        const authBtnMain = document.querySelector('button[onclick*="router.navigate(\'/auth\')"]');
        if (authBtnMain) {
            authBtnMain.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.router) {
                    this.router.navigate('/auth');
                } else {
                    window.location.href = 'auth/';
                }
            });
        }
        
        // Обработчик для перехода в лобби
        const lobbyBtn = document.querySelector('button[onclick*="router.navigate(\'/lobby\')"]');
        if (lobbyBtn) {
            lobbyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.router) {
                    this.router.navigate('/lobby');
                } else {
                    window.location.href = 'pages/lobby.html';
                }
            });
        }
        
        console.log('✅ App: Навигация настроена');
    }

    /**
     * Проверка авторизации
     */
    checkAuthentication() {
        console.log('🔐 App: Проверка авторизации');
        
        try {
            // Проверяем наличие данных пользователя в localStorage
            const userData = localStorage.getItem('currentUser') || localStorage.getItem('aura_money_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.updateUserInterface();
                console.log('👤 App: Пользователь авторизован:', this.currentUser.username);
                
                // Если пользователь авторизован и находится на главной странице - редиректим в лобби
                if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                    console.log('🔄 App: Перенаправление авторизованного пользователя в лобби');
                    this.router.navigate('/lobby');
                }
            } else {
                console.log('👤 App: Пользователь не авторизован');
                
                // Если пользователь не авторизован и находится на главной странице - редиректим на авторизацию
                if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                    console.log('🔄 App: Перенаправление неавторизованного пользователя на авторизацию');
                    this.router.navigate('/auth');
                }
            }
        } catch (error) {
            console.error('❌ App: Ошибка проверки авторизации:', error);
        }
    }

    /**
     * Обновление интерфейса пользователя
     */
    updateUserInterface() {
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const authButton = document.getElementById('auth-button');
        
        if (this.currentUser) {
            // Показываем информацию о пользователе
            if (userInfo) userInfo.style.display = 'flex';
            if (userAvatar) userAvatar.textContent = this.currentUser.name?.charAt(0).toUpperCase() || 'U';
            if (userName) userName.textContent = this.currentUser.name || this.currentUser.username || 'Пользователь';
            
            // Меняем кнопку на "Выйти"
            if (authButton) {
                authButton.textContent = 'Выйти';
                authButton.onclick = () => this.logout();
            }
        } else {
            // Скрываем информацию о пользователе
            if (userInfo) userInfo.style.display = 'none';
            
            // Возвращаем кнопку "Войти"
            if (authButton) {
                authButton.textContent = 'Войти';
                authButton.onclick = () => this.router.navigate('/auth');
            }
        }
    }

    /**
     * Выход из системы
     */
    logout() {
        console.log('🚪 App: Выход из системы');
        
        // Очищаем данные пользователя
        localStorage.removeItem('aura_money_user');
        localStorage.removeItem('aura_money_token');
        
        this.currentUser = null;
        this.updateUserInterface();
        
        // Переходим на главную страницу
        this.router.navigate('/');
        
        // Показываем уведомление
        this.showNotification('Вы вышли из системы', 'info');
    }

    /**
     * Показать страницу
     */
    showPage(pageId) {
        // Скрываем все страницы
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        
        // Показываем нужную страницу
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    /**
     * Показать заглушку
     */
    showPlaceholder(message) {
        this.showPage('placeholder-page');
        
        const placeholder = document.querySelector('#placeholder-page');
        if (placeholder) {
            placeholder.innerHTML = `
                <div style="padding: 4rem 2rem; text-align: center; color: #a0a0a0;">
                    <h2>🔄 ${message}</h2>
                    <p>Пожалуйста, подождите...</p>
                </div>
            `;
        }
    }

    /**
     * Обновление навигации
     */
    updateNavigation(activeRoute) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const route = link.dataset.route;
            if (route === activeRoute) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Обработка игрового маршрута
     */
    handleGameRoute(state) {
        console.log('🎮 App: Обработка игрового маршрута', state);
        
        if (state && state.roomId) {
            // Загружаем данные комнаты
            this.loadRoomData(state.roomId);
        }
    }

    /**
     * Загрузка данных комнаты
     */
    async loadRoomData(roomId) {
        try {
            console.log('🏠 App: Загрузка данных комнаты:', roomId);
            
            // Загружаем данные комнаты через API
            const response = await fetch(`/api/rooms/${roomId}`);
            if (response.ok) {
                const roomData = await response.json();
                console.log('✅ App: Данные комнаты загружены:', roomData);
                
                // Сохраняем данные комнаты в глобальной области
                window.currentRoom = roomData.data;
                
                // Обновляем интерфейс
                this.updateGameInterface(roomData.data);
            } else {
                console.error('❌ App: Ошибка загрузки комнаты:', response.status);
                this.showNotification('Комната не найдена', 'error');
            }
        } catch (error) {
            console.error('❌ App: Ошибка загрузки данных комнаты:', error);
            this.showNotification('Ошибка загрузки комнаты', 'error');
        }
    }

    /**
     * Автоматический выбор комнаты
     */
    async autoSelectRoom() {
        try {
            console.log('🏠 App: Автоматический выбор комнаты');
            
            // Получаем список комнат
            const response = await fetch('/api/rooms');
            if (response.ok) {
                const roomsData = await response.json();
                const rooms = roomsData.data || [];
                
                if (rooms.length > 0) {
                    // Выбираем первую доступную комнату
                    const availableRoom = rooms.find(room => !room.isStarted && !room.isFull);
                    
                    if (availableRoom) {
                        console.log('✅ App: Автоматически выбрана комната:', availableRoom.id);
                        await this.loadRoomData(availableRoom.id);
                        this.showNotification(`Автоматически выбрана комната: ${availableRoom.name}`, 'success');
                    } else {
                        console.log('⚠️ App: Нет доступных комнат');
                        this.showNotification('Нет доступных комнат', 'warning');
                    }
                } else {
                    console.log('⚠️ App: Комнаты не найдены');
                    this.showNotification('Комнаты не найдены', 'warning');
                }
            } else {
                console.error('❌ App: Ошибка получения списка комнат');
            }
        } catch (error) {
            console.error('❌ App: Ошибка автоматического выбора комнаты:', error);
        }
    }

    /**
     * Обновление интерфейса игры
     */
    updateGameInterface(roomData) {
        try {
            console.log('🎮 App: Обновление интерфейса игры');
            
            // Применяем специальную навигацию для игровой комнаты
            // Навигация удалена
            
            // Загружаем игроков в GameState
            if (this.gameState) {
                this.gameState.loadPlayersFromRoom(roomData);
            }
            
            // Инициализируем центральный кубик
            this.initCenterDice();
            
            // Обновляем балансы игроков через BalanceManager
            if (this.balanceManager && roomData.players) {
                this.balanceManager.refreshFromGameState(roomData.players);
            }
            
            console.log('✅ App: Интерфейс игры обновлен');
        } catch (error) {
            console.error('❌ App: Ошибка обновления интерфейса:', error);
        }
    }

    /**
     * Запуск игры
     */
    startGame() {
        try {
            console.log('🚀 App: Запуск игры');
            
            if (window.currentRoom) {
                // Здесь можно добавить логику запуска игры
                this.showNotification('Игра запущена!', 'success');
            } else {
                this.showNotification('Сначала выберите комнату', 'error');
            }
        } catch (error) {
            console.error('❌ App: Ошибка запуска игры:', error);
        }
    }

    /**
     * Показать уведомление
     */
    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Стили для уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: '100px',
            right: '20px',
            background: type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: '10000',
            fontSize: '0.9rem',
            fontWeight: '500',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease'
        });
        
        // Добавляем анимацию
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Добавляем уведомление на страницу
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Получение текущего пользователя
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Установка текущего пользователя
     */
    setCurrentUser(user) {
        this.currentUser = user;
        this.updateUserInterface();
    }
    
    /**
     * Настройка обработчиков для главной страницы
     */
    setupMainPageHandlers() {
        console.log('🖱️ App: Настройка обработчиков главной страницы');
        
        // Обработчик кнопки "Выбрать комнату"
        const selectRoomBtn = document.getElementById('select-room-btn');
        if (selectRoomBtn) {
            selectRoomBtn.addEventListener('click', () => {
                console.log('🏠 App: Переход к выбору комнаты');
                window.location.href = 'pages/rooms.html';
            });
            console.log('✅ App: Обработчик кнопки "Выбрать комнату" настроен');
        } else {
            console.warn('⚠️ App: Кнопка "Выбрать комнату" не найдена');
        }
        
        // Обработчик кнопки "Авторизация"
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                console.log('🔐 App: Переход к авторизации');
                window.location.href = 'auth/';
            });
            console.log('✅ App: Обработчик кнопки "Авторизация" настроен');
        } else {
            console.warn('⚠️ App: Кнопка "Авторизация" не найдена');
        }

        // Тестовые кнопки убраны для production
        
        // Обработчик кнопки "Админ" в навигации
        const adminBtn = document.querySelector('.nav-button[href="/admin/"]');
        if (adminBtn) {
            adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('⚙️ App: Переход к админ панели');
                window.location.href = 'admin/';
            });
            console.log('✅ App: Обработчик кнопки "Админ" настроен');
        }
        
        // Обработчик кнопки "Войти" в навигации
        const navAuthBtn = document.getElementById('auth-button');
        if (navAuthBtn) {
            navAuthBtn.addEventListener('click', () => {
                console.log('🔐 App: Переход к авторизации через навигацию');
                window.location.href = 'auth/';
            });
            console.log('✅ App: Обработчик кнопки "Войти" в навигации настроен');
        }
        
        console.log('✅ App: Обработчики главной страницы настроены');
    }

    /**
     * Добавление тестовых кнопок для движения фишек (только для разработки)
     */
    addTestMovementButtons() {
        // Проверяем, что мы на главной странице и есть игровые компоненты
        if (!this.gameState || !document.querySelector('.game-board-container')) {
            return;
        }

        // Создаем контейнер для тестовых кнопок
        const testControls = document.createElement('div');
        testControls.id = 'test-movement-controls';
        testControls.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 12px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Кнопка для перемещения первого игрока
        const movePlayer1Btn = document.createElement('button');
        movePlayer1Btn.textContent = '🎲 Ход игрока 1';
        movePlayer1Btn.style.cssText = `
            padding: 8px 12px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        movePlayer1Btn.addEventListener('click', () => {
            if (this.gameState.players.length > 0) {
                const player = this.gameState.players[0];
                const steps = Math.floor(Math.random() * 6) + 1; // 1-6
                
                // Устанавливаем игрока как активного
                this.gameState.setActivePlayer(player.id);
                
                // Перемещаем игрока
                this.gameState.movePlayerForward(player.id, steps);
                
                console.log(`🎲 Тестовый ход: игрок ${player.username} прошел ${steps} шагов`);
            }
        });

        // Кнопка для перемещения второго игрока
        const movePlayer2Btn = document.createElement('button');
        movePlayer2Btn.textContent = '🎲 Ход игрока 2';
        movePlayer2Btn.style.cssText = `
            padding: 8px 12px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        movePlayer2Btn.addEventListener('click', () => {
            if (this.gameState.players.length > 1) {
                const player = this.gameState.players[1];
                const steps = Math.floor(Math.random() * 6) + 1; // 1-6
                
                // Устанавливаем игрока как активного
                this.gameState.setActivePlayer(player.id);
                
                // Перемещаем игрока
                this.gameState.movePlayerForward(player.id, steps);
                
                console.log(`🎲 Тестовый ход: игрок ${player.username} прошел ${steps} шагов`);
            }
        });

        // Кнопка для сброса позиций
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '🔄 Сброс';
        resetBtn.style.cssText = `
            padding: 8px 12px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        resetBtn.addEventListener('click', () => {
            this.gameState.players.forEach(player => {
                this.gameState.movePlayer(player.id, 0, true); // Возвращаем на старт
            });
            console.log('🔄 Тестовый сброс: все игроки возвращены на старт');
        });

        testControls.appendChild(movePlayer1Btn);
        testControls.appendChild(movePlayer2Btn);
        testControls.appendChild(resetBtn);

        document.body.appendChild(testControls);
        console.log('🧪 App: Тестовые кнопки для движения фишек добавлены');
    }

    // Методы управления навигацией удалены - навигация больше не используется

    // Инициализация центрального кубика
    initCenterDice() {
        const diceIcon = document.getElementById('dice-center-icon');
        if (diceIcon) {
            // Добавляем обработчик клика для броска кубика
            diceIcon.addEventListener('click', () => {
                this.rollCenterDice();
            });
            
            // Устанавливаем начальную иконку доллара
            diceIcon.innerHTML = '💰';
            diceIcon.className = 'dice-icon';
            
            console.log('🎲 App: Центральный кубик инициализирован');
        }
    }

    // Бросок центрального кубика
    rollCenterDice() {
        const diceIcon = document.getElementById('dice-center-icon');
        if (!diceIcon) return;

        // Добавляем анимацию вращения
        diceIcon.classList.add('rolling');
        
        // Генерируем случайное число от 1 до 6
        const diceNumber = Math.floor(Math.random() * 6) + 1;
        
        // Через 1 секунду показываем результат
        setTimeout(() => {
            diceIcon.classList.remove('rolling');
            diceIcon.classList.add('showing-number');
            diceIcon.innerHTML = diceNumber;
            
            // Через 3 секунды возвращаем иконку доллара
            setTimeout(() => {
                diceIcon.classList.remove('showing-number');
                diceIcon.innerHTML = '💰';
            }, 3000);
            
            console.log(`🎲 App: Выпало число ${diceNumber}`);
        }, 1000);
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск приложения Aura Money');
    window.app = new App();
});

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.App = App;
}
