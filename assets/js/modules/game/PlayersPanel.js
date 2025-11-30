/**
 * PlayersPanel v2.0.0 - Рефакторенная версия
 * Компонент для отображения списка игроков в боковой панели
 * Использует GameStateManager и PlayerList для унификации
 */

class PlayersPanel {
    constructor(config = {}) {
        this.gameStateManager = config.gameStateManager || null;
        this.eventBus = config.eventBus || null;
        this.containerId = config.containerId || 'players-list-container';
        
        // Создаем PlayerList для отображения игроков
        this.playerList = null;
        this.currentUser = null;
        this._lastStateKey = null;
        
        // Создаем BankModule при инициализации
        this.bankModule = null;
        
        // Кэш для данных игроков для ускорения загрузки
        this._playersCache = new Map();
        this._lastFetchTime = 0;
        this._cacheTimeout = 5000; // Увеличиваем до 5 секунд для снижения нагрузки
        
        // AbortController для отмены предыдущих запросов
        this._currentAbortController = null;
        
        // Rate limiting для предотвращения 429 ошибок
        this._lastApiRequestTime = 0;
        
        // Флаги защиты от race conditions
        this._isUpdating = false;
        this._isInitializing = false;
        this._isDestroyed = false;
        this._isUpdatingPlayers = false;
        this._isUpdatingButtons = false;
        this._isUpdatingActivePlayer = false;
        this._isLoadingPlayers = false; // Флаг для предотвращения множественных загрузок
        this._minRequestInterval = 1000; // Минимум 1 секунда между запросами (было 3)
        
        // Дебаунсинг для UI обновлений
        this._uiUpdateTimeout = null;
        this._uiUpdateDelay = 300; // Увеличено до 300ms для снижения нагрузки
        
        // Дебаунсинг для загрузки игроков
        this._loadPlayersTimeout = null;
        this._loadPlayersDebounceDelay = 500; // Увеличено до 500ms для снижения нагрузки
        
        // Защита от повторных вызовов броска кубика
        this._isRolling = false;
        
        console.log('👥 PlayersPanel v2.0: Инициализация');
        this.init();
    }
    
    /**
     * Инициализация компонента
     */
    init() {
        // Защита от повторной инициализации
        if (this._isInitializing || this._isDestroyed) {
            console.log('⚠️ PlayersPanel: Инициализация уже выполняется или компонент уничтожен');
            return;
        }
        
        this._isInitializing = true;
        
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('❌ PlayersPanel: Контейнер не найден:', this.containerId);
            this._isInitializing = false;
            return;
        }
        
        this.setupEventListeners();
        this.render();
        
        // Создаем BankModule при инициализации
        this.createBankModule();
        
        // Инициализируем отображение из текущего состояния игры
        if (this.gameStateManager && typeof this.gameStateManager.getState === 'function') {
            try {
                const state = this.gameStateManager.getState();
                this.updateFromGameState(state || {});
            } catch (_) {}
        }
        
        // Активация кнопок после инициализации
        setTimeout(() => {
            this.forceUpdateAllButtons();
        }, 100);
        
        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА через 1 секунду для надежности
        setTimeout(() => {
            console.log('🔧 PlayersPanel: Дополнительная проверка активации кнопки');
            this.forceUpdateAllButtons();
        }, 1000);
        
        // Показываем состояние загрузки сразу при инициализации
        this.showLoadingState();
        
        // Завершаем инициализацию
        this._isInitializing = false;
        this._isInitialized = true;
        
        // Используем GameStateManager для загрузки данных вместо прямых API вызовов
        // Вызываем немедленно без debounce для быстрой загрузки
        this.loadPlayersViaGameStateManager(true);
        
        console.log('✅ PlayersPanel v2.0: Инициализирован');
    }
    
    /**
     * Создание BankModuleServer (новый модуль с загрузкой данных с сервера)
     */
    createBankModule() {
        if (this.bankModule) {
            console.log('🏦 PlayersPanel: BankModule уже существует');
            return; // Уже создан
        }
        
        console.log('🏦 PlayersPanel: Создание BankModuleServer...');
        
        if (!window.BankModuleServer) {
            console.error('❌ PlayersPanel: BankModuleServer класс не найден в window');
            return;
        }
        
                try {
                    const app = window.app;
                    if (!app) {
                        console.warn('⚠️ PlayersPanel: App не найден');
                        return;
                    }
                    
                    const gameState = app.getModule('gameState');
                    const eventBus = app.getEventBus();
                    const roomApi = app.getModule('roomApi');
                    const professionSystem = app.getModule('professionSystem');
            
            console.log('🏦 PlayersPanel: Создаем BankModuleServer с модулями:', {
                gameState: !!gameState,
                eventBus: !!eventBus,
                roomApi: !!roomApi,
                professionSystem: !!professionSystem,
                gameStateManager: !!this.gameStateManager
            });
                    
                    this.bankModule = new window.BankModuleServer({
                        gameState: gameState,
                        eventBus: eventBus,
                        roomApi: roomApi,
                        professionSystem: professionSystem,
                        gameStateManager: this.gameStateManager
                    });
                    
            // Сохраняем в app.modules
            if (app.modules && typeof app.modules.set === 'function') {
                    app.modules.set('bankModuleServer', this.bankModule);
            }
                    
            console.log('✅ PlayersPanel: BankModuleServer создан успешно');
                } catch (error) {
                    console.error('❌ PlayersPanel: Ошибка создания BankModuleServer:', error);
            console.error('❌ PlayersPanel: Стек ошибки:', error.stack);
                }
    }
    
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Обратная совместимость с существующими событиями
            this.eventBus.on('game:started', (data) => {
                if (data && Array.isArray(data.players)) {
                    this.gameStateManager?.updateFromServer({ players: data.players });
                }
            });
            
            this.eventBus.on('game:playersUpdated', (data) => {
                if (data && Array.isArray(data.players)) {
                    this.gameStateManager?.updateFromServer({ players: data.players });
                }
            });
            
            this.eventBus.on('game:activePlayerChanged', (data) => {
                if (data && data.activePlayer) {
                    this.gameStateManager?.updateFromServer({ activePlayer: data.activePlayer });
                }
            });
            
            // Обработчик для обновления кубика
            this.eventBus.on('dice:rolled', (data) => {
                if (data && data.value !== undefined) {
                    this.updateDiceResult(data.value);
                }
            });
        }

        // Подписываемся на обновления состояния игры
        if (this.gameStateManager && typeof this.gameStateManager.on === 'function') {
            this.gameStateManager.on('state:updated', (state) => {
                this.updateFromGameState(state || {});
            });
            this.gameStateManager.on('turn:changed', (data) => {
                this.handleTurnChanged(data || {});
            });
            this.gameStateManager.on('players:updated', (players) => {
                this.onPlayersUpdated(players);
            });
            this.gameStateManager.on('game:playersUpdated', (players) => {
                this.onPlayersUpdated(players);
            });
        }
        
        // Подписываемся на push-уведомления для принудительного обновления
        if (this.eventBus && typeof this.eventBus.on === 'function') {
            this.eventBus.on('push:message', (message) => {
                if (message.type === 'turn_changed' || message.type === 'game_state_updated') {
                    console.log('🎯 PlayersPanel: Получено push-уведомление о смене хода');
                    // Принудительно обновляем состояние
                    if (this.gameStateManager && typeof this.gameStateManager.forceUpdate === 'function') {
                        this.gameStateManager.forceUpdate();
                    }
                }
            });
        } else {
            console.warn('⚠️ PlayersPanel: eventBus недоступен для push-уведомлений');
        }
        
        // Обработчик клика для кнопки банка будет настроен в render() после создания DOM
    }
    
    /**
     * Обработка обновления игроков
     * @param {Array} players - Список игроков
     */
    onPlayersUpdated(players) {
        // Защита от множественных обновлений
        if (this._isUpdatingPlayers) {
            return;
        }
        
        this._isUpdatingPlayers = true;
        
        try {
        if (this.playerList) {
            // Проверяем, что players является массивом
            if (Array.isArray(players)) {
                this.playerList.updatePlayers(players);
            } else {
                // Fallback: получаем игроков из GameStateManager
                if (this.gameStateManager) {
                    const state = this.gameStateManager.getState();
                    const playersArray = state?.players || [];
                    if (Array.isArray(playersArray)) {
                        this.playerList.updatePlayers(playersArray);
                    }
                }
            }
            }
        } finally {
            setTimeout(() => {
                this._isUpdatingPlayers = false;
            }, 100);
        }
    }

    /**
     * Рендер компонента - полностью переработанный дизайн
     */
    render() {
        if (!this.container) return;
        
        // Очищаем контейнер перед рендерингом, чтобы избежать дублирования
        if (this.container.children.length > 0) {
            console.log('🧹 PlayersPanel: Очищаем контейнер перед рендерингом');
            this.container.innerHTML = '';
        }
        
        // Оптимизация: проверяем, нужно ли обновлять DOM
        if (this._lastRenderContent && this.container.children.length > 0) {
            console.log('⚡ PlayersPanel: Пропускаем рендеринг, контент уже существует');
            return; // Уже отрендерено
        }
        
        // Используем DocumentFragment для ускорения DOM операций
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `
            <div class="game-right-panel">

                <!-- Активный игрок -->
                <div class="active-player-widget">
                    <div class="widget-header">
                        <span class="widget-icon">👤</span>
                        <span class="widget-title">Активный игрок</span>
                    </div>
                    <div class="player-info-card" id="active-player-card">
                        <div class="player-avatar-container">
                            <div class="player-avatar" id="active-player-avatar">
                                <span class="avatar-text">👤</span>
                            </div>
                            <div class="player-status-indicator" id="player-status-indicator"></div>
                        </div>
                        <div class="player-details">
                            <div class="player-name" id="current-player-name"></div>
                            <div class="player-status" id="turn-status">
                                <span class="status-icon">⏳</span>
                                <span class="status-text">Ожидание данных</span>
                                <div class="player-timer" id="player-timer" style="display: none;">
                                    <div class="timer-ring">
                                        <svg class="timer-svg" viewBox="0 0 36 36">
                                            <path class="timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                            <path class="timer-progress" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                        </svg>
                                        <span class="timer-text" id="timer-text">30</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <!-- Игровые действия -->
                <div class="actions-widget">
                    <div class="widget-header">
                        <span class="widget-icon">⚡</span>
                        <span class="widget-title">Действия</span>
                    </div>
                    <div class="actions-grid">
                        <button class="action-btn bank-btn" id="open-bank" type="button">
                            <div class="btn-icon">🏦</div>
                            <div class="btn-label">Банк</div>
                            <div class="btn-glow"></div>
                        </button>
                        <button class="action-btn roll-btn" id="roll-dice-btn" type="button" disabled>
                            <div class="btn-icon">🎲</div>
                            <div class="btn-label">Бросить</div>
                            <div class="btn-glow"></div>
                        </button>
                        <button class="action-btn move-btn" id="move-btn" type="button" disabled>
                            <div class="btn-icon">🎲🎲</div>
                            <div class="btn-label">Бросок</div>
                            <div class="btn-glow"></div>
                        </button>
                        <button class="action-btn pass-btn" id="pass-turn" type="button" disabled>
                            <div class="btn-icon">➡️</div>
                            <div class="btn-label">Передать</div>
                            <div class="btn-glow"></div>
                        </button>
                    </div>
                </div>

                <!-- Список игроков -->
                <div class="players-widget">
                    <div class="widget-header">
                        <span class="widget-icon">👥</span>
                        <span class="widget-title">Игроки</span>
                        <span class="players-count" id="players-count">0/4</span>
                    </div>
                    <div class="players-list" id="players-list">
                        <!-- Игроки будут добавлены динамически -->
                    </div>
                </div>
            </div>
        `;
        
        // Перемещаем содержимое в fragment для ускорения
        fragment.appendChild(tempDiv.firstElementChild);
        this.container.appendChild(fragment);
        
        // Отмечаем, что рендер выполнен
        this._lastRenderContent = true;
        
        // Добавляем новые стили
        this.addNewStyles();
        
        // Настраиваем обработчики
        this.setupControls();
        
        console.log('✅ PlayersPanel v3.0: Новый дизайн отрендерен (оптимизированно)');
    }
    
    /**
     * Обновление от GameStateManager
     * @param {Object} state - Состояние игры
     */
    updateFromGameState(state) {
        // Защита от race conditions
        if (this._isUpdating || this._isDestroyed) {
            return;
        }
        
        this._isUpdating = true;
        
        try {
        // Throttling: обновляем только если состояние действительно изменилось
        // Оптимизация: используем только критически важные поля для уменьшения нагрузки
        const stateKey = JSON.stringify({
            activePlayer: state.activePlayer?.id,
            canRoll: state.canRoll,
            canMove: state.canMove,
            playersCount: state.players?.length || 0,
            playersHash: state.players?.map(p => p.id).join(',') || ''
        });
        
        if (this._lastStateKey === stateKey) {
            this._isUpdating = false;
            return; // Состояние не изменилось, пропускаем обновление
        }
        this._lastStateKey = stateKey;
        
        // Обновляем информацию об активном игроке
        this.updateActivePlayerInfo(state.activePlayer);
        
        // Если activePlayer отсутствует, принудительно обновляем состояние
        if (!state.activePlayer) {
            this.forceUpdateGameState();
        }
        
        // Обновляем кнопки управления
        this.updateControlButtons(state);

        // Дебаунсинг для UI обновлений
        if (this._uiUpdateTimeout) {
            clearTimeout(this._uiUpdateTimeout);
        }
        // Увеличена задержка для снижения нагрузки
        this._uiUpdateTimeout = setTimeout(() => {
            this.forceUpdateAllButtons();
        }, Math.max(this._uiUpdateDelay, 300)); // Минимум 300ms
        
        // Обновляем список игроков
        if (state.players && Array.isArray(state.players)) {
            if (state.players.length > 0) {
                this.updatePlayersList(state.players, state.activePlayer);
            } else {
                this.showLoadingState();
                // Загружаем игроков через GameStateManager с дебаунсингом
                this.loadPlayersViaGameStateManager();
            }
        } else {
            // Если игроки не переданы или невалидные, используем GameStateManager
            this.loadPlayersViaGameStateManager();
        }
        
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка в updateFromGameState:', error);
            // В случае ошибки устанавливаем флаг, чтобы предотвратить рекурсию
            setTimeout(() => {
                this._isUpdating = false;
            }, 1000);
        } finally {
            // Сбрасываем флаг только если не было ошибки
            if (!this._isUpdating || this._isUpdating === true) {
                setTimeout(() => {
            this._isUpdating = false;
                }, 100);
            }
        }
    }
    
    /**
     * Загрузка игроков через GameStateManager (новый рефакторенный метод)
     * @param {boolean} immediate - Если true, загрузка выполняется немедленно без дебаунсинга
     */
    async loadPlayersViaGameStateManager(immediate = false) {
        // Защита от множественных одновременных вызовов
        if (this._isLoadingPlayers && !immediate) {
            return;
        }
        
        // Дебаунсинг для предотвращения каскадных обновлений
        if (!immediate && this._loadPlayersTimeout) {
            clearTimeout(this._loadPlayersTimeout);
        }
        
        const loadPlayers = async () => {
            if (this._isLoadingPlayers) {
                return;
            }
            
            this._isLoadingPlayers = true;
            
            try {
        const roomId = this.getCurrentRoomId();
        
        if (!roomId) {
            console.warn('⚠️ PlayersPanel: roomId не найден, пропускаем загрузку');
            this.showErrorState('Комната не найдена');
            return;
        }

        // Проверяем кэш для ускорения
        const now = Date.now();
        const cacheKey = `players_${roomId}`;
        const cachedData = this._playersCache.get(cacheKey);
        
        if (cachedData && (now - this._lastFetchTime) < this._cacheTimeout) {
                    // Используем кэш без логирования для производительности
            this.updatePlayersList(cachedData, this.gameStateManager?.getState?.()?.activePlayer);
            this.startPeriodicUpdatesViaGameStateManager(roomId);
            return;
        }

                // Проверяем rate limiting
                const timeSinceLastRequest = now - this._lastApiRequestTime;
                if (timeSinceLastRequest < this._minRequestInterval) {
                    // Слишком рано после последнего запроса, используем кэш если есть
                    if (cachedData) {
                        this.updatePlayersList(cachedData, this.gameStateManager?.getState?.()?.activePlayer);
                    }
                    return;
                }

        // Используем GameStateManager для безопасного запроса
        if (this.gameStateManager && typeof this.gameStateManager.fetchGameState === 'function') {
                    this._lastApiRequestTime = Date.now();
                    
            try {
                const state = await this.gameStateManager.fetchGameState(roomId);
                const players = state?.players || this.gameStateManager.getState()?.players || [];
                
                if (Array.isArray(players) && players.length > 0) {
                    this._playersCache.set(cacheKey, players);
                    this._lastFetchTime = Date.now();
                    this.updatePlayersList(players, this.gameStateManager?.getState?.()?.activePlayer);
                    this.startPeriodicUpdatesViaGameStateManager(roomId);
                    
                    // Принудительно обновляем фишки после загрузки игроков
                    if (window.PlayerTokens) {
                        setTimeout(() => {
                            const playerTokens = window.app?.getModule?.('playerTokens') || window.playerTokens;
                            if (playerTokens && typeof playerTokens.updateTokens === 'function') {
                                console.log('🔄 PlayersPanel: Принудительно обновляем фишки после загрузки игроков');
                                playerTokens.updateTokens(players);
                            }
                        }, 100);
                    }
                } else {
                    this.showEmptyState();
                }
            } catch (error) {
                console.error('❌ PlayersPanel: Ошибка загрузки через GameStateManager:', error);
                this.showErrorState(`Ошибка загрузки: ${error.message}`);
            }
            return;
        }

        this.showErrorState('Состояние игры недоступно');
            } finally {
                this._isLoadingPlayers = false;
            }
        };
        
        if (immediate) {
            await loadPlayers();
        } else {
            this._loadPlayersTimeout = setTimeout(loadPlayers, this._loadPlayersDebounceDelay);
        }
    }

    /**
     * Запуск периодических обновлений через GameStateManager
     */
    startPeriodicUpdatesViaGameStateManager(roomId) {
        if (this.gameStateManager && typeof this.gameStateManager.startPeriodicUpdates === 'function') {
            console.log('🔄 PlayersPanel: Запуск периодических обновлений через GameStateManager');
            this.gameStateManager.startPeriodicUpdates(roomId, 45000); // 45 секунд интервал
        }
    }

    /**
     * Получение текущего roomId
     */
    getCurrentRoomId() {
        // Способ 1: из hash
        const hash = window.location.hash;
        const hashMatch = hash.match(/roomId=([^&]+)/);
        if (hashMatch) {
            return hashMatch[1];
        }
        
        // Способ 2: из URL search params
        const urlParams = new URLSearchParams(window.location.search);
        let roomId = urlParams.get('roomId');
        if (roomId) {
            return roomId;
        }
        
        // Способ 3: из sessionStorage
        try {
            const roomData = sessionStorage.getItem('am_room_data');
            if (roomData) {
                const parsed = JSON.parse(roomData);
                return parsed.roomId || parsed.id;
            }
        } catch (e) {
            console.warn('PlayersPanel: Ошибка чтения roomId из sessionStorage:', e);
        }
        
        return null;
    }

    /**
     * Принудительное восстановление игроков и фишек
     */
    forceRestorePlayers() {
        console.log('🔄 PlayersPanel: Принудительное восстановление игроков');
        
        const roomId = this.getCurrentRoomId();
        if (!roomId) {
            console.warn('⚠️ PlayersPanel: roomId не найден для восстановления');
            return;
        }

        // Принудительно загружаем данные через GameStateManager
        if (this.gameStateManager && typeof this.gameStateManager.forceUpdate === 'function') {
            console.log('🔄 PlayersPanel: Запускаем forceUpdate GameStateManager');
            this.gameStateManager.forceUpdate();
        }

        // Также загружаем через наш метод
        this.loadPlayersViaGameStateManager();

        // Принудительно обновляем фишки через PlayerTokens (убираем setTimeout для производительности)
        if (window.app && typeof window.app.safePlayerTokensForceUpdate === 'function') {
            console.log('🎯 PlayersPanel: Восстанавливаем фишки через PlayerTokens (защищенный метод)');
            window.app.safePlayerTokensForceUpdate('PlayersPanel.forceRestorePlayers');
        } else if (window.app && window.app.getModule) {
            // Fallback на прямой вызов, если новый метод недоступен
            const playerTokens = window.app.getModule('playerTokens');
            if (playerTokens && typeof playerTokens.forceUpdate === 'function') {
                console.log('🎯 PlayersPanel: Восстанавливаем фишки через PlayerTokens (fallback)');
                playerTokens.forceUpdate();
            }
        }

        // Дополнительное обновление через EventBus (убираем setTimeout для производительности)
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            console.log('🔄 PlayersPanel: Отправляем событие для восстановления игроков');
            this.eventBus.emit('players:restore');
            this.eventBus.emit('game:playersUpdated', { players: [] });
        }
    }

    /**
     * Принудительное обновление состояния игры для синхронизации данных
     */
    forceUpdateGameState() {
        // Принудительно загружаем данные через GameStateManager
        if (this.gameStateManager && typeof this.gameStateManager.forceUpdate === 'function') {
            this.gameStateManager.forceUpdate();
        }

        // Загружаем игроков через GameStateManager немедленно (без дебаунсинга)
        this.loadPlayersViaGameStateManager(true);

        // Принудительно запускаем первый ход если нет активного игрока
        setTimeout(() => {
            if (this.gameStateManager && typeof this.gameStateManager.forceStartFirstTurn === 'function') {
                const state = this.gameStateManager.getState();
                if (state && state.players && state.players.length > 0 && !state.activePlayer) {
                    console.log('🎯 PlayersPanel: Запускаем принудительный первый ход');
                    this.gameStateManager.forceStartFirstTurn();
                }
            }
        }, 300);

        // Принудительно обновляем фишки
        setTimeout(() => {
            if (this.gameStateManager && typeof this.gameStateManager.forceUpdateTokens === 'function') {
                console.log('🎯 PlayersPanel: Обновляем фишки игроков');
                this.gameStateManager.forceUpdateTokens();
            }
        }, 600);

        // Дополнительная проверка через небольшую задержку
        setTimeout(() => {
            if (this.gameStateManager && typeof this.gameStateManager.getState === 'function') {
                try {
                    const state = this.gameStateManager.getState();
                    if (state && state.activePlayer) {
                        console.log('✅ PlayersPanel: Найдены данные activePlayer, обновляем UI');
                        this.updateActivePlayerInfo(state.activePlayer);
                    } else {
                        console.log('⚠️ PlayersPanel: activePlayer все еще не найден, повторяем попытку');
                        // Повторяем попытку еще раз через короткое время
                        setTimeout(() => this.forceUpdateGameState(), 1000);
                    }
                } catch (error) {
                    console.warn('⚠️ PlayersPanel: Ошибка получения состояния после forceUpdate:', error);
                }
            }
        }, 500);
    }

    // Удалена deprecated функция forceLoadPlayers()
    /* Отключен ошибочный верхнеуровневый блок, вызывавший SyntaxError.
       Логика загрузки игроков реализована методами класса. */
    
    /**
     * Фоновое обновление данных игроков для кэша
     */
    _fetchPlayersInBackground(roomId) {
        // Атомарная проверка и установка pending флага для предотвращения race condition
        if (window.CommonUtils && !window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
            console.log('🚫 PlayersPanel: Пропускаем фоновый запрос из-за глобального rate limiting или concurrent request');
            return;
        }
        
        // Проверяем локальный rate limiting после успешной установки pending флага
        const now = Date.now();
        if (now - this._lastApiRequestTime < this._minRequestInterval) {
            console.log('🚫 PlayersPanel: Пропускаем фоновый запрос из-за локального rate limiting');
            // Очищаем флаг pending так как мы не будем делать запрос
            window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
            return;
        }
        
        this._lastApiRequestTime = now;
        
        const apiUrl = window.ApiUrlHelper?.getRoomsUrl(roomId, 'game-state') || 
                      `/api/rooms/${roomId}/game-state`;
        fetch(apiUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error(`HTTP ${response.status}`);
            })
            .then(data => {
                if (data && data.success && data.state && data.state.players) {
                    const cacheKey = `players_${roomId}`;
                    this._playersCache.set(cacheKey, data.state.players);
                    this._lastFetchTime = Date.now();
                    console.log('🔄 PlayersPanel: Кэш обновлен в фоне');
                }
            })
            .catch(err => {
                console.warn('⚠️ PlayersPanel: Ошибка фонового обновления кэша:', err);
            })
            .finally(() => {
                // Очищаем флаг pending в глобальном limiter
                if (window.CommonUtils) {
                    window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
                }
            });
    }
    
    /* Отключен ошибочный верхнеуровневый блок (бывший _fetchPlayersFromAPI),
       из‑за которого скрипт падал. При необходимости используйте метод
       loadPlayersViaGameStateManager() внутри класса. */
    
    
    /**
     * Предзагрузка игровых данных для ускорения работы
     */
    preloadGameData() {
        // Получаем roomId
        const hash = window.location.hash;
        const hashMatch = hash.match(/roomId=([^&]+)/);
        let roomId = hashMatch ? hashMatch[1] : null;
        
        if (!roomId) {
            try {
                const roomData = sessionStorage.getItem('am_room_data');
                if (roomData) {
                    const parsed = JSON.parse(roomData);
                    roomId = parsed.roomId || parsed.id;
                }
            } catch (e) {
                console.warn('PlayersPanel: Ошибка получения roomId для предзагрузки:', e);
            }
        }
        
        if (roomId) {
            // Атомарная проверка и установка pending флага для предотвращения race condition
            if (window.CommonUtils && !window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
                console.log('🚫 PlayersPanel: Пропускаем предзагрузку из-за глобального rate limiting или concurrent request');
                return;
            }
            
            // Проверяем локальный rate limiting после успешной установки pending флага
            const now = Date.now();
            if (now - this._lastApiRequestTime < this._minRequestInterval) {
                console.log('🚫 PlayersPanel: Пропускаем предзагрузку из-за локального rate limiting');
                // Очищаем флаг pending так как мы не будем делать запрос
                window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
                return;
            }
            
            // Отменяем предыдущий запрос если есть
            if (this._currentAbortController) {
                this._currentAbortController.abort();
            }
            
            // Предзагружаем данные с более коротким таймаутом для ускорения
            this._currentAbortController = new AbortController();
            this._lastApiRequestTime = now;
            const timeoutId = setTimeout(() => {
                this._currentAbortController.abort();
                window.CommonUtils?.gameStateLimiter.clearRequestPending(roomId);
            }, 3000); // 3 секунды вместо 5
            
            const apiUrl = window.ApiUrlHelper?.getRoomsUrl(roomId, 'game-state') || 
                          `/api/rooms/${roomId}/game-state`;
            fetch(apiUrl, {
                signal: this._currentAbortController.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
            .then(response => {
                clearTimeout(timeoutId);
                if (response.ok) {
                    return response.json();
                }
                if (response.status === 429) {
                    console.warn('⚠️ PlayersPanel: HTTP 429 при предзагрузке, пропускаем');
                    throw new Error('RATE_LIMITED');
                }
                throw new Error(`HTTP ${response.status}`);
            })
            .then(data => {
                if (data && data.success && data.state) {
                    // Кэшируем более полные данные
                    const cacheKey = `preload_${roomId}`;
                    this._playersCache.set(cacheKey, data.state);
                    console.log('🚀 PlayersPanel: Предзагружены игровые данные');
                }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                if (err.name !== 'AbortError' && err.message !== 'RATE_LIMITED') {
                    console.warn('⚠️ PlayersPanel: Ошибка предзагрузки данных:', err);
                }
            })
            .finally(() => {
                // Очищаем флаг pending в глобальном limiter
                if (window.CommonUtils) {
                    window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
                }
            });
        }
    }
    
    /**
     * Показать состояние загрузки
     */
    showLoadingState() {
        const playersList = document.getElementById('players-list');
        const playersCount = document.getElementById('players-count');
        
        if (playersList) {
            playersList.innerHTML = '<div class="loading-placeholder">Загрузка игроков...</div>';
        }
        
        if (playersCount) {
            playersCount.textContent = '?/4';
        }
    }
    
    /**
     * Показать состояние ошибки
     */
    showErrorState(message = 'Ошибка загрузки игроков') {
        const playersList = document.getElementById('players-list');
        const playersCount = document.getElementById('players-count');
        
        if (playersList) {
            playersList.innerHTML = `<div class="error-placeholder">${message}</div>`;
        }
        
        if (playersCount) {
            playersCount.textContent = '?/4';
        }
    }
    
    /**
     * Показать пустое состояние
     */
    showEmptyState() {
        const playersList = document.getElementById('players-list');
        const playersCount = document.getElementById('players-count');
        
        if (playersList) {
            playersList.innerHTML = '<div class="empty-placeholder">Нет игроков в комнате</div>';
        }
        
        if (playersCount) {
            playersCount.textContent = '0/4';
        }
    }
    
    /**
     * Обработка смены хода
     * @param {Object} data - Данные смены хода
     */
    handleTurnChanged(data) {
        console.log('🔄 PlayersPanel: Смена хода', data);
        
        // Обновляем информацию об активном игроке
        this.updateActivePlayerInfo(data.activePlayer);
    }
    
    /**
     * Обновление списка игроков
     * @param {Array} players - Массив игроков
     * @param {Object} activePlayer - Активный игрок
     */
    updatePlayersList(players = [], activePlayer = null) {
        console.log('🔧 PlayersPanel: updatePlayersList вызван с данными:', players);
        
        const playersList = document.getElementById('players-list');
        const playersCount = document.getElementById('players-count');
        
        if (!playersList) {
            console.error('❌ PlayersPanel: Элемент players-list не найден');
            return;
        }
        
        if (!playersCount) {
            console.error('❌ PlayersPanel: Элемент players-count не найден');
        } else {
            // Обновляем счетчик игроков
            playersCount.textContent = `${players.length}/4`;
        }
        
        // Проверяем валидность данных игроков
        if (!Array.isArray(players)) {
            console.warn('⚠️ PlayersPanel: players не является массивом:', typeof players, players);
            playersList.innerHTML = '<div class="error-placeholder">Ошибка загрузки данных игроков</div>';
            return;
        }
        
        // Очищаем список
        playersList.innerHTML = '';
        
        if (players.length === 0) {
            console.log('👥 PlayersPanel: Нет игроков для отображения');
            playersList.innerHTML = '<div class="empty-placeholder">Нет игроков в комнате</div>';
            return;
        }
        
        // Добавляем каждого игрока
        players.forEach((player, index) => {
            if (!player) {
                console.warn('⚠️ PlayersPanel: Пустой объект игрока на позиции', index);
                return;
            }
            
            try {
                const playerElement = this.createPlayerElement(player, index, activePlayer);
                if (playerElement) {
                    playersList.appendChild(playerElement);
                } else {
                    console.error('❌ PlayersPanel: Не удалось создать элемент для игрока:', player);
                }
            } catch (error) {
                console.error('❌ PlayersPanel: Ошибка создания элемента игрока:', error, player);
            }
        });
        
        console.log(`👥 PlayersPanel: Обновлен список игроков (${players.length})`);
        
        // Синхронизируем баланс с банком, если он открыт
        this.syncBalanceWithBank(players);
    }
    
    /**
     * Синхронизация баланса игроков с банком
     * @param {Array} players - Массив игроков
     */
    syncBalanceWithBank(players) {
        if (!this.bankModule) return;
        
        try {
            // Получаем текущего пользователя
            const currentUserId = this.getCurrentUserId();
            if (!currentUserId) return;
            
            // Находим текущего игрока в списке
            const currentPlayer = players.find(p => 
                p.id === currentUserId || 
                p.userId === currentUserId || 
                p.username === currentUserId
            );
            
            if (currentPlayer && this.bankModule.updatePlayerBalance) {
                // Обновляем баланс в банке
                this.bankModule.updatePlayerBalance(currentPlayer);
                console.log('💰 PlayersPanel: Баланс синхронизирован с банком:', currentPlayer.balance || currentPlayer.money);
            }
        } catch (error) {
            console.warn('⚠️ PlayersPanel: Ошибка синхронизации баланса:', error);
        }
    }
    
    /**
     * Создание элемента игрока
     * @param {Object} player - Данные игрока
     * @param {number} index - Индекс игрока
     * @param {Object} activePlayer - Активный игрок
     * @returns {HTMLElement} Элемент игрока
     */
    createPlayerElement(player, index, activePlayer = null) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        
        // Получаем баланс из разных возможных источников
        const balance = player.balance || player.money || player.cash || 0;
        
        // Определяем, является ли игрок активным
        const isActive = activePlayer && (
            player.id === activePlayer.id ||
            player.userId === activePlayer.userId ||
            player.username === activePlayer.username ||
            (player.username && activePlayer.username && player.username === activePlayer.username)
        );
        
        console.log('🔍 PlayersPanel: Проверка активности игрока:', {
            playerUsername: player.username,
            playerId: player.id,
            activePlayerUsername: activePlayer?.username,
            activePlayerId: activePlayer?.id,
            isActive: isActive,
            status: isActive ? 'Ходит' : 'Ожидание'
        });
        
        // Определяем статус игрока
        let status = 'Ожидание';
        if (isActive) {
            status = 'Ходит';
        }
        
        // Получаем токен игрока и его иконку
        const playerToken = this.getDefaultTokenForPlayer(player, index);
        const tokenIcon = this.getTokenIcon(playerToken);
        
        playerDiv.innerHTML = `
            <div class="player-avatar">
                <span class="player-icon">${tokenIcon}</span>
            </div>
            <div class="player-info">
                <div class="player-name">${player.username || 'Игрок ' + (index + 1)}</div>
                <div class="player-status ${isActive ? 'active' : 'inactive'}">
                    ${status}
                </div>
                <div class="player-balance">$${balance}</div>
            </div>
        `;
        
        return playerDiv;
    }
    
    /**
     * Обработка обновления игроков
     * @param {Object} data - Данные обновления игроков
     */
    handlePlayersUpdated(data) {
        console.log('👥 PlayersPanel: Игроки обновлены', data);
        // Игроки больше не отображаются в этом компоненте
    }
    
    /**
     * Обновление информации об активном игроке - обновлен для новой структуры
     * @param {Object} activePlayer - Активный игрок
     */
    updateActivePlayerInfo(activePlayer) {
        const currentPlayerName = document.getElementById('current-player-name');
        const turnStatus = document.getElementById('turn-status');
        const playerAvatar = document.getElementById('active-player-avatar');
        const playerTimer = document.getElementById('player-timer');
        const statusIndicator = document.getElementById('player-status-indicator');
        
        if (currentPlayerName) {
            if (activePlayer) {
                const displayName = PlayerStatusUtils.getPlayerDisplayName(activePlayer);
                currentPlayerName.textContent = displayName;
                console.log('✅ PlayersPanel: Обновляем имя активного игрока:', displayName);
                
                // Принудительно обновляем DOM
                currentPlayerName.style.display = 'block';
                currentPlayerName.style.visibility = 'visible';
                currentPlayerName.style.opacity = '1';
                
                // Обновляем аватар с инициалами игрока или эмодзи
                if (playerAvatar && displayName) {
                    const initials = displayName.split(' ')
                        .map(word => word.charAt(0))
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);
                    
                    // Используем эмодзи для известных игроков
                    const playerEmoji = this.getPlayerEmoji(displayName);
                    const avatarText = playerAvatar.querySelector('.avatar-text');
                    if (avatarText) {
                        avatarText.textContent = playerEmoji || initials || '👤';
                    }
                }
            } else {
                // Пытаемся получить активного игрока из GameStateManager
                if (this.gameStateManager && typeof this.gameStateManager.getState === 'function') {
                    try {
                        const state = this.gameStateManager.getState();
                        if (state && state.activePlayer) {
                            // Рекурсивно вызываем себя с полученными данными
                            this.updateActivePlayerInfo(state.activePlayer);
                            return;
                        }
                    } catch (error) {
                        console.warn('⚠️ PlayersPanel: Ошибка получения состояния для activePlayer:', error);
                    }
                }
                
                // Принудительно обновляем данные если activePlayer не найден
                this.forceUpdateGameState();
                
                // Показываем "Загрузка..." если нет данных
                currentPlayerName.textContent = 'Загрузка...';
                currentPlayerName.style.display = 'block';
                currentPlayerName.style.visibility = 'visible';
                currentPlayerName.style.opacity = '0.7';
                
                const avatarText = playerAvatar?.querySelector('.avatar-text');
                if (avatarText) {
                    avatarText.textContent = '👤';
                }
            }
        }
        
        // Обновляем статус хода
        if (turnStatus) {
            const statusIcon = turnStatus.querySelector('.status-icon');
            const statusText = turnStatus.querySelector('.status-text');
            
            if (statusIcon && statusText) {
                if (activePlayer) {
                    // Проверяем, может ли игрок бросать кубик
                    const canRoll = this.gameStateManager?.getState()?.canRoll || false;
                    const currentUserId = this.getCurrentUserId();
                    const isMyTurn = activePlayer && currentUserId && 
                        (activePlayer.id === currentUserId || 
                         activePlayer.userId === currentUserId || 
                         activePlayer.username === currentUserId);
                    
                    if (isMyTurn) {
                        if (canRoll) {
                            statusIcon.textContent = '🎲';
                            statusText.textContent = 'Можно бросать';
                            statusIndicator.style.background = '#22c55e';
                            this.showTimer(playerTimer, true);
                        } else {
                            statusIcon.textContent = '⏳';
                            statusText.textContent = 'Ожидание действий';
                            statusIndicator.style.background = '#f59e0b';
                            this.showTimer(playerTimer, false);
                        }
                    } else {
                        statusIcon.textContent = '👤';
                        statusText.textContent = `${PlayerStatusUtils.getPlayerDisplayName(activePlayer)} ходит`;
                        statusIndicator.style.background = '#6366f1';
                        this.showTimer(playerTimer, false);
                    }
                } else {
                    statusIcon.textContent = '⏳';
                    statusText.textContent = 'Ожидание данных';
                    statusIndicator.style.background = '#6b7280';
                    this.showTimer(playerTimer, false);
                }
            }
        }
    }

    /**
     * Получение эмодзи для игрока
     */
    getPlayerEmoji(playerName) {
        const emojiMap = {
            'admin': '👑',
            'roman': '🎯',
            'test': '🧪',
            'player': '🎮'
        };
        
        const name = playerName.toLowerCase();
        return emojiMap[name] || null;
    }

    /**
     * Получение иконки токена игрока
     * @param {string} tokenId - ID токена игрока
     * @returns {string} Иконка токена
     */
    getTokenIcon(tokenId) {
        const tokenIcons = {
            'lion': '🦁',
            'eagle': '🦅', 
            'fox': '🦊',
            'bear': '🐻',
            'tiger': '🐅',
            'wolf': '🐺',
            'elephant': '🐘',
            'shark': '🦈',
            'owl': '🦉',
            'dolphin': '🐬'
        };
        
        return tokenIcons[tokenId] || '👤';
    }

    /**
     * Получение токена по умолчанию для игрока
     * @param {Object} player - Объект игрока
     * @param {number} index - Индекс игрока
     * @returns {string} ID токена
     */
    getDefaultTokenForPlayer(player, index) {
        // Если у игрока уже есть выбранный токен, используем его
        if (player.token) {
            return player.token;
        }
        
        // Попробуем получить токен из localStorage если пользователь выбирал его
        const savedToken = localStorage.getItem(`player_token_${player.username || player.id}`);
        if (savedToken) {
            return savedToken;
        }
        
        // Массив доступных токенов по умолчанию
        const defaultTokens = ['lion', 'eagle', 'fox', 'bear', 'tiger', 'wolf', 'elephant', 'shark', 'owl', 'dolphin'];
        
        // Используем индекс игрока для выбора токена
        const tokenIndex = index % defaultTokens.length;
        return defaultTokens[tokenIndex];
    }

    /**
     * Показать/скрыть таймер - обновлено для новой структуры
     */
    showTimer(timerElement, show) {
        if (timerElement) {
            timerElement.style.display = show ? 'block' : 'none';
            if (show) {
                this.startTurnTimer(timerElement);
            } else {
                this.stopTurnTimer();
            }
        }
    }

    startTurnTimer(timerElement) {
        this.stopTurnTimer();
        const timerText = timerElement.querySelector('.timer-text');
        if (!timerText) return;

        let seconds = 30; // 30 секунд на ход
        const updateTimer = () => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerText.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            
            if (seconds <= 0) {
                this.stopTurnTimer();
                return;
            }
            
            seconds--;
            this.timerId = setTimeout(updateTimer, 1000);
        };
        
        updateTimer();
    }

    stopTurnTimer() {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
    
    /**
     * Открытие банк модуля
     */
    openBankModule() {
        console.log('🏦 PlayersPanel: Попытка открыть банк...');
        
        // Используем requestAnimationFrame для неблокирующего выполнения
        requestAnimationFrame(async () => {
            try {
                // Используем уже созданный BankModule или создаем новый
                if (!this.bankModule) {
                    console.log('🏦 PlayersPanel: BankModule не создан, создаем...');
                    this.createBankModule();
                    
                    // Используем более эффективное ожидание
                    await new Promise(resolve => {
                        const checkModule = () => {
                if (this.bankModule) {
                                resolve();
                            } else {
                                requestAnimationFrame(checkModule);
                            }
                        };
                        requestAnimationFrame(checkModule);
                    });
                }
                
                if (this.bankModule) {
                    console.log('🏦 PlayersPanel: Открываем BankModule...');
                    await this.bankModule.open();
                    console.log('✅ PlayersPanel: Банк модуль успешно открыт');
                } else {
                    console.error('❌ PlayersPanel: Не удалось создать BankModule');
                    
                    // Быстрая попытка создания
                    this.bankModule = null;
                        this.createBankModule();
                    
                    if (this.bankModule) {
                        await this.bankModule.open();
                        console.log('✅ PlayersPanel: Банк модуль открыт после повторной попытки');
                    } else {
                        console.error('❌ PlayersPanel: Критическая ошибка - BankModule не может быть создан');
                    }
                }
            } catch (error) {
                console.error('❌ PlayersPanel: Ошибка открытия банка:', error);
                console.error('❌ PlayersPanel: Детали ошибки:', error.stack);
            }
        });
    }
    
    /**
     * Обновление результата кубика - обновлен для новой структуры
     * @param {number} result - Результат броска
     */
    updateDiceResult(result) {
        const diceResult = document.getElementById('dice-result-value');
        const rollHistory = document.getElementById('roll-history');
        
        if (diceResult) {
            const numericValue = typeof result === 'object'
                ? Number(result?.value ?? result?.total)
                : Number(result);
            
            const diceFace = diceResult.querySelector('.dice-face');
            const diceNumber = diceFace?.querySelector('.dice-number');
            
            if (Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 6) {
                // Показываем результат
                if (diceNumber) {
                    diceNumber.textContent = numericValue;
                }
                
                if (diceFace) {
                    diceFace.classList.add('rolling');
                    setTimeout(() => {
                        diceFace.classList.remove('rolling');
                    }, 600);
                }
                
                // Добавляем результат в историю бросков
                this.addToRollHistory(numericValue, rollHistory);
            } else {
                // Возвращаем placeholder состояние
                if (diceNumber) {
                    diceNumber.textContent = '-';
                }
            }
        }
    }

    /**
     * Добавление результата в историю бросков - обновлено для новой структуры
     */
    addToRollHistory(value, rollHistoryElement) {
        if (!rollHistoryElement) return;
        
        // Инициализируем массив истории если его нет
        if (!this.rollHistory) {
            this.rollHistory = [];
        }
        
        // Добавляем новое значение
        this.rollHistory.unshift(value);
        
        // Ограничиваем историю последними 5 бросками
        if (this.rollHistory.length > 5) {
            this.rollHistory = this.rollHistory.slice(0, 5);
        }
        
        // Обновляем отображение истории для новой структуры
        rollHistoryElement.innerHTML = this.rollHistory
            .map(val => `<div class="roll-item">${val}</div>`)
            .join('');
    }

    /**
     * Получение эмодзи для значения кубика
     * @param {number} value - Значение кубика (1-6)
     * @returns {string} Эмодзи кубика
     */
    getDiceEmoji(value) {
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return diceEmojis[value - 1] || '⚀';
    }
    
    /**
     * Обновление кнопок управления
     * @param {Object} state - Состояние игры
     */
    updateControlButtons(state) {
        const passBtn = document.getElementById('pass-turn');
        const rollBtn = document.getElementById('roll-dice-btn');
        const moveBtn = document.getElementById('move-btn');
        
        // Если кнопки не найдены, принудительно создаем их
        if (!rollBtn || !passBtn) {
            console.warn('⚠️ PlayersPanel: Кнопки не найдены, принудительно создаем');
            this.forceCreateButtons();
            return;
        }
        
        // Проверяем, мой ли это ход
        const currentUserId = this.getCurrentUserId();
        const activePlayer = state.activePlayer;
        
        // Расширенная проверка isMyTurn с дополнительными проверками
        let isMyTurn = false;
        if (activePlayer && currentUserId) {
            isMyTurn = 
                activePlayer.id === currentUserId ||
                activePlayer.userId === currentUserId ||
                activePlayer.username === currentUserId ||
                (activePlayer.username && currentUserId && activePlayer.username === currentUserId);
        }
        
        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: если isMyTurn все еще false, попробуем альтернативные способы
        if (!isMyTurn && activePlayer) {
            // Проверяем через localStorage
            const storedUserId = localStorage.getItem('userId');
            const storedUsername = localStorage.getItem('username');
            const storedCurrentUser = localStorage.getItem('currentUser');
            
            if (storedUserId && (activePlayer.id === storedUserId || activePlayer.userId === storedUserId)) {
                isMyTurn = true;
                console.log('🔧 PlayersPanel: isMyTurn определен через localStorage userId');
            } else if (storedUsername && activePlayer.username === storedUsername) {
                isMyTurn = true;
                console.log('🔧 PlayersPanel: isMyTurn определен через localStorage username');
            } else if (storedCurrentUser) {
                try {
                    const currentUser = JSON.parse(storedCurrentUser);
                    const userId = currentUser.id || currentUser.userId;
                    const username = currentUser.username || currentUser.name;
                    
                    if (userId && (activePlayer.id === userId || activePlayer.userId === userId)) {
                        isMyTurn = true;
                        console.log('🔧 PlayersPanel: isMyTurn определен через currentUser id');
                    } else if (username && activePlayer.username === username) {
                        isMyTurn = true;
                        console.log('🔧 PlayersPanel: isMyTurn определен через currentUser username');
                    }
                } catch (e) {
                    console.warn('⚠️ PlayersPanel: Ошибка парсинга currentUser:', e);
                }
            }
        }
        
        console.log('🔍 PlayersPanel: Проверка isMyTurn:', {
            currentUserId,
            activePlayerId: activePlayer?.id,
            activePlayerUserId: activePlayer?.userId,
            activePlayerUsername: activePlayer?.username,
            isMyTurn,
            comparison: {
                idMatch: activePlayer?.id === currentUserId,
                userIdMatch: activePlayer?.userId === currentUserId,
                usernameMatch: activePlayer?.username === currentUserId
            }
        });
        
        // Логика для кнопки "Бросить" - активна если это мой ход (упрощенная логика)
        if (rollBtn) {
            // УПРОЩЕННАЯ ЛОГИКА: если это мой ход - кнопка активна (игнорируем state.canRoll)
            const canRoll = isMyTurn;
            
            console.log('🎲 PlayersPanel: Обновление кнопки бросить:', {
                isMyTurn,
                canRoll,
                stateCanRoll: state.canRoll,
                disabled: !canRoll
            });
            
            // АГРЕССИВНАЯ АКТИВАЦИЯ: если это мой ход, кнопка всегда активна
            if (isMyTurn) {
                rollBtn.disabled = false;
                rollBtn.classList.add('active');
                
                // Принудительно обновляем стили
                rollBtn.style.opacity = '1';
                rollBtn.style.cursor = 'pointer';
                rollBtn.style.pointerEvents = 'auto';
                rollBtn.style.backgroundColor = '#4CAF50';
                rollBtn.style.color = 'white';
                rollBtn.style.transform = 'scale(1.05)';
                
                console.log('✅ PlayersPanel: Кнопка "Бросок" АКТИВИРОВАНА для хода игрока');
            } else {
                rollBtn.disabled = true;
                rollBtn.classList.remove('active');
                
                // Принудительно обновляем стили для неактивного состояния
                rollBtn.style.opacity = '0.5';
                rollBtn.style.cursor = 'not-allowed';
                rollBtn.style.pointerEvents = 'none';
                rollBtn.style.backgroundColor = '';
                rollBtn.style.color = '';
                rollBtn.style.transform = '';
            }
            
            // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ UI для кнопки броска
            this.forceUpdateButtonUI(rollBtn);
            
        }
        
        // Кнопка передачи хода - активна если это мой ход (по умолчанию true если не указано иное)
        if (passBtn) {
            const canEndTurn = isMyTurn && (state.canEndTurn !== false);
            passBtn.disabled = !canEndTurn;
            
            if (canEndTurn) {
                passBtn.classList.add('active');
            } else {
                passBtn.classList.remove('active');
            }
            
            // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ UI для кнопки передачи хода
            this.forceUpdateButtonUI(passBtn);
        }
        
        // Кнопка броска - активна если это мой ход (упрощенная логика)
        if (moveBtn) {
            // ПРОСТАЯ ЛОГИКА: если это мой ход - кнопка активна (игнорируем state.canRoll)
            const shouldActivate = isMyTurn;
            moveBtn.disabled = !shouldActivate;
            
            // ПРИНУДИТЕЛЬНАЯ АКТИВАЦИЯ: если кнопка все еще отключена, но это ход игрока
            if (moveBtn.disabled && isMyTurn) {
                console.log('🔧 PlayersPanel: ПРИНУДИТЕЛЬНАЯ АКТИВАЦИЯ кнопки "Бросок"');
                moveBtn.disabled = false;
                moveBtn.classList.add('active');
            }
            
            console.log('🎲 PlayersPanel: УПРОЩЕННАЯ активация кнопки "Бросок":', {
                moveBtn: !!moveBtn,
                isMyTurn,
                shouldActivate,
                disabled: moveBtn.disabled,
                note: 'Кнопка активна если isMyTurn = true'
            });
            
            if (shouldActivate) {
                moveBtn.classList.add('active');
            } else {
                moveBtn.classList.remove('active');
            }
            
            // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ UI для кнопки движения
            this.forceUpdateButtonUI(moveBtn);
        }
        
        
        
        console.log('🎯 PlayersPanel: Обновлены кнопки управления:', {
            currentUserId,
            activePlayerId: activePlayer?.id,
            activePlayerUsername: activePlayer?.username,
            activePlayerUserId: activePlayer?.userId,
            isMyTurn,
            canRoll: state.canRoll,
            canEndTurn: state.canEndTurn,
            passBtnDisabled: passBtn?.disabled,
            rollBtnDisabled: rollBtn?.disabled,
            moveBtnDisabled: moveBtn?.disabled,
            shouldBeDisabled: !isMyTurn || !state.canEndTurn,
            turnCheckDetails: {
                idMatch: activePlayer?.id === currentUserId,
                userIdMatch: activePlayer?.userId === currentUserId,
                usernameMatch: activePlayer?.username === currentUserId
            }
        });
    }

    /**
     * Принудительное создание кнопок управления
     */
    forceCreateButtons() {
        console.log('🔧 PlayersPanel: Принудительное создание кнопок управления');
        
        const actionsGrid = document.querySelector('.actions-grid');
        if (!actionsGrid) {
            console.error('❌ PlayersPanel: actions-grid не найден');
            return;
        }
        
        // Очищаем существующие кнопки
        actionsGrid.innerHTML = '';
        
        // Создаем кнопки заново
        actionsGrid.innerHTML = `
            <button class="action-btn bank-btn" id="open-bank" type="button">
                <div class="btn-icon">🏦</div>
                <div class="btn-label">Банк</div>
                <div class="btn-glow"></div>
            </button>
            <button class="action-btn roll-btn" id="roll-dice-btn" type="button" disabled>
                <div class="btn-icon">🎲</div>
                <div class="btn-label">Бросить</div>
                <div class="btn-glow"></div>
            </button>
            <button class="action-btn move-btn" id="move-btn" type="button" disabled>
                <div class="btn-icon">🎲🎲</div>
                <div class="btn-label">Бросок</div>
                <div class="btn-glow"></div>
            </button>
            <button class="action-btn pass-btn" id="pass-turn" type="button" disabled>
                <div class="btn-icon">➡️</div>
                <div class="btn-label">Передать</div>
                <div class="btn-glow"></div>
            </button>
        `;
        
        // Привязываем обработчики событий (старые уже удалены в setupControls)
        this.setupControls();
        
        console.log('✅ PlayersPanel: Кнопки управления созданы принудительно');
    }
    
    /**
     * Обработка броска кубика
     */
    async handleRollDice() {
        try {
            console.log('🎲 PlayersPanel: Попытка броска кубика');
            
            const app = window.app;
            const turnManager = app && app.getModule ? app.getModule('turnManager') : null;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            
            const isMyTurn = turnService && typeof turnService.isMyTurn === 'function'
                ? turnService.isMyTurn()
                : false;
            
            if (turnManager) {
                if (!turnManager.canRoll) {
                    console.warn('⚠️ PlayersPanel: Нельзя бросать кубик (TurnManager.canRoll=false)');
                    return;
                }
                if (!isMyTurn) {
                    console.warn('⚠️ PlayersPanel: Не ваш ход — бросок заблокирован (TurnManager)');
                    return;
                }
                await turnManager.rollDice({ diceChoice: 'single' });
                console.log('✅ PlayersPanel: Бросок кубика выполнен через TurnManager');
                return;
            }
            
            if (!turnService || typeof turnService.roll !== 'function') {
                console.warn('⚠️ PlayersPanel: TurnService недоступен');
                return;
            }
            
            if (!turnService.canRoll()) {
                console.warn('⚠️ PlayersPanel: Нельзя бросать кубик');
                return;
            }
            
            if (!isMyTurn) {
                console.warn('⚠️ PlayersPanel: Не ваш ход — бросок заблокирован');
                return;
            }
            
            await turnService.roll({ diceChoice: 'single' });
            console.log('✅ PlayersPanel: Бросок кубика выполнен через TurnService');
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка при броске кубика:', error);
        }
    }
    
    /**
     * Обработка завершения хода
     */
    async handleEndTurn() {
        try {
            const app = window.app;
            const turnManager = app && app.getModule ? app.getModule('turnManager') : null;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            
            const isMyTurn = turnService && typeof turnService.isMyTurn === 'function'
                ? turnService.isMyTurn()
                : false;
            
            if (turnManager) {
                if (!turnManager.canEndTurn) {
                    console.warn('⚠️ PlayersPanel: Нельзя завершить ход (TurnManager.canEndTurn=false)');
                    return;
                }
                if (!isMyTurn) {
                    console.warn('⚠️ PlayersPanel: Не ваш ход — завершение заблокировано (TurnManager)');
                    return;
                }
                await turnManager.endTurn();
                console.log('✅ PlayersPanel: Ход завершен через TurnManager');
                return;
            }
            
            if (!turnService || typeof turnService.endTurn !== 'function') {
                console.warn('⚠️ PlayersPanel: TurnService не найден');
                return;
            }
            
            if (!turnService.canEndTurn()) {
                console.warn('⚠️ PlayersPanel: Нельзя завершить ход');
                return;
            }
            
            const currentUserId = this.getCurrentUserId();
            const state = turnService.getState();
            
            if (!state || !state.activePlayer) {
                console.warn('⚠️ PlayersPanel: Нет активного игрока');
                return;
            }
            
            const activePlayer = state.activePlayer;
            const isReallyMyTurn = 
                activePlayer.id === currentUserId ||
                activePlayer.userId === currentUserId ||
                (activePlayer.username && currentUserId && activePlayer.username === currentUserId);
            
            if (!isReallyMyTurn) {
                console.warn('⚠️ PlayersPanel: Не ваш ход - завершение хода заблокировано', {
                    activePlayer: activePlayer.username || activePlayer.id,
                    currentUserId
                });
                return;
            }
            
            console.log('🎯 PlayersPanel: Завершаем ход для текущего пользователя (fallback)');
            await turnService.endTurn();
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка завершения хода:', error);
        }
    }
    
    /**
     * Обработчик кнопки "Бросок"
     */
    async handleDiceRoll() {
        // Защита от повторных вызовов
        if (this._isRolling) {
            console.warn('⚠️ PlayersPanel: Бросок кубика уже выполняется, пропускаем');
            return;
        }
        
        try {
            this._isRolling = true;
            console.log('🎲 PlayersPanel: Обработка броска кубиков');
            
            const app = window.app;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            
            if (!turnService) {
                console.warn('⚠️ PlayersPanel: TurnService не найден, пытаемся найти альтернативные способы');
                
                // АЛЬТЕРНАТИВНЫЙ СПОСОБ: прямой вызов API
                const roomId = this.getRoomId();
                if (roomId) {
                    console.log('🔧 PlayersPanel: Прямой вызов API для броска кубика');
                    const apiUrl = window.ApiUrlHelper?.getRoomsUrl(roomId, 'roll') || 
                                  `/api/rooms/${roomId}/roll`;
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ diceChoice: 'single' })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('✅ PlayersPanel: Прямой бросок кубика выполнен:', result);
                        return;
                    } else {
                        console.error('❌ PlayersPanel: Ошибка прямого API вызова:', response.status);
                    }
                }
                return;
            }
            
            // Проверяем, можем ли мы бросить кубики (упрощенная проверка)
            const canRoll = turnService.canRoll && typeof turnService.canRoll === 'function'
                ? turnService.canRoll()
                : true; // По умолчанию разрешаем бросок
                
            console.log('🎲 PlayersPanel: canRoll проверка:', canRoll);
            
            if (!canRoll) {
                console.warn('⚠️ PlayersPanel: Бросок кубика недоступен');
                return;
            }
            
            // Выполняем бросок кубиков
            if (typeof turnService.roll === 'function') {
                console.log('🎲 PlayersPanel: Вызываем turnService.roll()');
                const result = await turnService.roll({ diceChoice: 'single' });
                console.log('✅ PlayersPanel: Бросок кубиков выполнен:', result);
            } else {
                console.warn('⚠️ PlayersPanel: Метод roll не найден в TurnService');
            }
            
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка броска кубиков:', error);
            
            // Показываем уведомление пользователю только если это не "уже выполняется"
            if (error.message && !error.message.includes('already in progress')) {
            if (window.NotificationService) {
                window.NotificationService.show('Ошибка броска кубика: ' + error.message, 'error');
            }
            }
        } finally {
            // Сбрасываем флаг через небольшую задержку для предотвращения повторных вызовов
            setTimeout(() => {
                this._isRolling = false;
            }, 1000);
        }
    }
    
    /**
     * Принудительное обновление всех кнопок управления с дебаунсингом
     */
    forceUpdateAllButtons() {
        // Дебаунсинг для предотвращения избыточных обновлений
        if (this._uiUpdateTimeout) {
            clearTimeout(this._uiUpdateTimeout);
        }
        
        this._uiUpdateTimeout = setTimeout(() => {
            this._performButtonUpdate();
        }, this._uiUpdateDelay);
    }
    
    /**
     * Выполнение обновления кнопок
     * @private
     */
    _performButtonUpdate() {
        try {
            console.log('🔧 PlayersPanel: Принудительное обновление всех кнопок');
            
            const rollBtn = document.getElementById('roll-dice-btn');
            const passBtn = document.getElementById('pass-turn');
            const moveBtn = document.getElementById('move-btn');
            
            // ОБЩАЯ ФУНКЦИЯ: Активация кнопок броска на основе TurnService
            const shouldActivate = this.checkIfShouldActivateDiceButtons();
            
            // Активация кнопки "Бросить" (roll-dice-btn)
            if (rollBtn) {
                this.activateDiceButton(rollBtn, 'Бросить', shouldActivate);
            }
            
            if (passBtn) {
                this.forceUpdateButtonUI(passBtn);
            }
            
            // Активация кнопки "🎲🎲 Бросок" (move-btn) - основная кнопка в интерфейсе
            if (moveBtn) {
                this.activateDiceButton(moveBtn, '🎲🎲 Бросок', shouldActivate);
                
                // ДОПОЛНИТЕЛЬНАЯ ПРИНУДИТЕЛЬНАЯ АКТИВАЦИЯ для move-btn
                if (shouldActivate && moveBtn.disabled) {
                    console.log('🔧 PlayersPanel: ПРИНУДИТЕЛЬНАЯ АКТИВАЦИЯ move-btn');
                    moveBtn.disabled = false;
                    moveBtn.classList.add('active');
                    moveBtn.style.opacity = '1';
                    moveBtn.style.cursor = 'pointer';
                    moveBtn.style.pointerEvents = 'auto';
                    moveBtn.style.backgroundColor = '#4CAF50';
                    moveBtn.style.color = 'white';
                    moveBtn.removeAttribute('disabled');
                }
            }
            
            console.log('✅ PlayersPanel: Все кнопки обновлены принудительно');
            
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка принудительного обновления всех кнопок:', error);
        }
    }
    
    /**
     * Принудительное обновление UI кнопки
     * @param {HTMLElement} button - Кнопка для обновления
     */
    forceUpdateButtonUI(button) {
        if (!button) return;
        
        try {
            console.log('🔧 PlayersPanel: Принудительное обновление UI кнопки:', {
                id: button.id,
                disabled: button.disabled,
                classList: Array.from(button.classList)
            });
            
            // Принудительно обновляем атрибуты
            button.setAttribute('disabled', button.disabled ? 'true' : 'false');
            
            // Принудительно обновляем стили
            if (button.disabled) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                button.style.pointerEvents = 'none';
            } else {
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                button.style.pointerEvents = 'auto';
            }
            
            // Принудительно обновляем классы
            if (button.classList.contains('active')) {
                button.style.backgroundColor = '#4CAF50';
                button.style.color = 'white';
                button.style.transform = 'scale(1.05)';
            } else {
                button.style.backgroundColor = '';
                button.style.color = '';
                button.style.transform = '';
            }
            
            // Принудительно перерисовываем элемент
            button.style.display = 'none';
            button.offsetHeight; // Принудительный reflow
            button.style.display = '';
            
            console.log('✅ PlayersPanel: UI кнопки обновлен принудительно');
            
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка принудительного обновления UI:', error);
        }
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     */
    getCurrentUserId() {
        try {
            // Используем ту же логику, что и TurnService
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                const userId = bundle?.currentUser?.id || bundle?.currentUser?.userId;
                if (userId) {
                    console.log('🔍 PlayersPanel: ID пользователя из bundle:', userId);
                    return userId;
                }
            }
            
            // Пытаемся получить из localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                const userId = user?.id || user?.userId;
                if (userId) {
                    console.log('🔍 PlayersPanel: ID пользователя из localStorage:', userId);
                    return userId;
                }
            }
            
            // Пытаемся получить из глобального объекта app
            if (window.app && window.app.getModule) {
                const userModel = window.app.getModule('userModel');
                if (userModel && userModel.getCurrentUser) {
                    const currentUser = userModel.getCurrentUser();
                    if (currentUser && (currentUser.id || currentUser.userId)) {
                        const userId = currentUser.id || currentUser.userId;
                        console.log('🔍 PlayersPanel: ID пользователя из userModel:', userId);
                        return userId;
                    }
                }
            }
            
            // ДОПОЛНИТЕЛЬНЫЕ СПОСОБЫ: проверяем другие источники
            const directUserId = localStorage.getItem('userId');
            if (directUserId) {
                console.log('🔍 PlayersPanel: ID пользователя из localStorage (прямой):', directUserId);
                return directUserId;
            }
            
            const directUsername = localStorage.getItem('username');
            if (directUsername) {
                console.log('🔍 PlayersPanel: Username из localStorage (прямой):', directUsername);
                return directUsername;
            }
            
            console.warn('⚠️ PlayersPanel: Не удалось получить ID пользователя');
            return null;
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка получения ID пользователя:', error);
            return null;
        }
    }
    
    getCurrentUsername() {
        try {
            // Пытаемся получить из currentUser в localStorage
            const currentUserRaw = localStorage.getItem('currentUser');
            if (currentUserRaw) {
                const currentUser = JSON.parse(currentUserRaw);
                const username = currentUser?.username;
                if (username) {
                    console.log('🔍 PlayersPanel: Username из currentUser:', username);
                    return username;
                }
            }
            
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                const username = bundle?.currentUser?.username;
                if (username) {
                    console.log('🔍 PlayersPanel: Username из bundle:', username);
                    return username;
                }
            }
            
            // Пытаемся получить из localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                const username = user?.username;
                if (username) {
                    console.log('🔍 PlayersPanel: Username из localStorage:', username);
                    return username;
                }
            }
            
            // Прямой способ из localStorage
            const directUsername = localStorage.getItem('username');
            if (directUsername) {
                console.log('🔍 PlayersPanel: Username из localStorage (прямой):', directUsername);
                return directUsername;
            }
            
            console.warn('⚠️ PlayersPanel: Не удалось получить username пользователя');
            return null;
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка получения username пользователя:', error);
            return null;
        }
    }
    
    /**
     * Получение ID комнаты
     * @returns {string|null} ID комнаты
     */
    getRoomId() {
        try {
            // Пытаемся получить из URL
            const urlParams = new URLSearchParams(window.location.search);
            const roomId = urlParams.get('roomId');
            if (roomId) {
                return roomId;
            }
            
            // Пытаемся получить из hash
            const hash = window.location.hash;
            const hashMatch = hash.match(/roomId=([^&]+)/);
            if (hashMatch) {
                return hashMatch[1];
            }
            
            // Пытаемся получить из localStorage
            const storedRoomId = localStorage.getItem('currentRoomId');
            if (storedRoomId) {
                return storedRoomId;
            }
            
            console.warn('⚠️ PlayersPanel: Не удалось получить ID комнаты');
            return null;
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка получения ID комнаты:', error);
            return null;
        }
    }
    
    
    /**
     * Добавление стилей (копируем из оригинального PlayersPanel)
     */
    addStyles() {
        if (document.getElementById('players-panel-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'players-panel-styles';
        styles.textContent = `
            .players-panel {
                background: linear-gradient(145deg, rgba(20, 25, 40, 0.95), rgba(15, 20, 35, 0.95));
                border-radius: 1.5rem;
                padding: 2rem;
                border: 2px solid rgba(99, 102, 241, 0.3);
                backdrop-filter: blur(20px);
                color: #ffffff;
                max-width: 400px;
                width: 100%;
                box-shadow: 
                    0 20px 40px rgba(0, 0, 0, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                position: relative;
                overflow: hidden;
                height: fit-content;
                max-height: calc(100vh - 120px);
            }
            
            .panel-grid {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                height: 100%;
            }
            
            
            .game-controls {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .dice-controls {
                display: flex;
                gap: 1rem;
                flex-direction: row;
            }

            /* Увеличенный кубик в верхнем блоке */
            .dice-display #dice-result {
                font-size: 9rem;
                line-height: 1;
            }

            .dice-controls .btn {
                flex: 1;
                min-width: 140px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .turn-info {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
                border-radius: 1rem;
                padding: 1.5rem;
                border: 2px solid rgba(99, 102, 241, 0.2);
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }
            
            .turn-info .player-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
            }
            
            .turn-info .player-info:last-child {
                margin-bottom: 0;
            }
            
            .turn-info .label {
                color: #a0a0a0;
                font-size: 0.9rem;
            }
            
            .turn-info .value {
                color: #ffffff;
                font-weight: 600;
                font-size: 0.9rem;
            }

            /* Увеличенный кубик в нижней панели "Кубик:" */
            .turn-info .player-info .value#dice-result {
                font-size: 3rem;
                font-weight: 800;
                color: #22c55e;
            }
            
            
            .btn {
                padding: 1rem 1.5rem;
                border: none;
                border-radius: 1rem;
                font-weight: 700;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(10px);
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: 2px solid rgba(99, 102, 241, 0.3);
                box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
            }
            
            .btn-primary:hover:not(:disabled) {
                background: linear-gradient(135deg, #8b5cf6, #a855f7);
                transform: translateY(-3px);
                box-shadow: 0 12px 35px rgba(99, 102, 241, 0.5);
                border-color: rgba(99, 102, 241, 0.6);
            }
            
            .btn-secondary {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1));
                color: #ffffff;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
                border-color: rgba(255, 255, 255, 0.4);
                transform: translateY(-3px);
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
            }
            
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
                box-shadow: none !important;
            }
            
            .bank-section {
                margin-top: 15px;
                display: flex;
                justify-content: center;
            }
            
            .btn-bank {
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                border: 1px solid rgba(139, 92, 246, 0.3);
                color: white;
                font-weight: 600;
                padding: 12px 24px;
                border-radius: 10px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            }
            
            .btn-bank:hover {
                background: linear-gradient(135deg, #7c3aed, #6d28d9);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
            }
            
            .btn-bank:active {
                transform: translateY(0);
            }
            
            /* Стили для списка игроков */
            .players-section {
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .players-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .players-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0;
            }
            
            .players-count {
                background: rgba(99, 102, 241, 0.2);
                color: #6366f1;
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.875rem;
                font-weight: 500;
                border: 1px solid rgba(99, 102, 241, 0.3);
            }
            
            .players-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .player-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }
            
            .player-item:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            .player-avatar {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .player-icon {
                font-size: 1.25rem;
            }
            
            .player-info {
                flex: 1;
                min-width: 0;
            }
            
            .player-name {
                font-weight: 600;
                color: #ffffff;
                font-size: 0.875rem;
                margin-bottom: 0.25rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .player-status {
                font-size: 0.75rem;
                font-weight: 500;
                margin-bottom: 0.25rem;
            }
            
            .player-status.active {
                color: #10b981;
            }
            
            .player-status.inactive {
                color: #6b7280;
            }
            
            .player-balance {
                font-size: 0.75rem;
                color: #fbbf24;
                font-weight: 600;
            }
            
            .player-avatar {
                flex-shrink: 0;
                margin-right: 0.75rem;
            }
            
            .player-icon {
                font-size: 1.2rem;
                opacity: 0.8;
            }

            /* === НОВЫЙ УЛУЧШЕННЫЙ ДИЗАЙН ПРАВОЙ ПАНЕЛИ === */
            
            /* Общие стили для секций */
            .section-title {
                font-size: 1rem;
                font-weight: 700;
                color: #ffffff;
                margin: 0 0 0.75rem 0;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                opacity: 0.9;
            }

            /* Секция текущего хода */
            .current-turn-section {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
                border-radius: 1rem;
                padding: 1.25rem;
                border: 2px solid rgba(99, 102, 241, 0.2);
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                margin-bottom: 1.5rem;
            }

            .active-player-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .player-avatar {
                width: 3rem;
                height: 3rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            }

            .player-details {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .player-name {
                font-size: 1.1rem;
                font-weight: 700;
                color: #ffffff;
                line-height: 1.2;
            }

            .player-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.375rem 0.75rem;
                border-radius: 1.5rem;
                font-size: 0.8rem;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .player-status.waiting {
                background: rgba(156, 163, 175, 0.2);
                color: #a0a0a0;
                border: 1px solid rgba(156, 163, 175, 0.3);
            }

            .player-status.active {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
                border: 1px solid rgba(34, 197, 94, 0.3);
                animation: pulse 2s infinite;
            }

            .player-status.processing {
                background: rgba(245, 158, 11, 0.2);
                color: #f59e0b;
                border: 1px solid rgba(245, 158, 11, 0.3);
            }

            .player-status.loading {
                background: rgba(156, 163, 175, 0.15);
                color: #94a3b8;
                border: 1px solid rgba(156, 163, 175, 0.2);
            }

            .player-timer {
                display: none;
                align-items: center;
                gap: 0.375rem;
                padding: 0.25rem 0.5rem;
                background: rgba(239, 68, 68, 0.15);
                border-radius: 1rem;
                font-size: 0.75rem;
                color: #fca5a5;
                border: 1px solid rgba(239, 68, 68, 0.3);
                animation: timerPulse 1s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            @keyframes timerPulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }

            /* Секция броска кубика */
            .dice-roll-section {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
                border-radius: 1rem;
                padding: 1.25rem;
                border: 2px solid rgba(156, 163, 175, 0.2);
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                margin-bottom: 1.5rem;
            }

            .dice-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }

            .dice-visual {
                width: 5rem;
                height: 5rem;
                background: linear-gradient(135deg, #ffffff, #f1f5f9);
                border-radius: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.3),
                    inset 0 2px 4px rgba(255, 255, 255, 0.5),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.1);
                border: 3px solid rgba(248, 250, 252, 0.8);
                position: relative;
            }

            .dice-visual::before {
                content: '';
                position: absolute;
                inset: -3px;
                background: linear-gradient(45deg, #6366f1, #8b5cf6, #6366f1);
                border-radius: 1rem;
                z-index: -1;
                opacity: 0.3;
            }

            .dice-face {
                font-size: 2.5rem;
                font-weight: 900;
                color: #1e293b;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }

            .dice-face.active {
                color: #059669;
                text-shadow: 0 0 20px rgba(5, 150, 105, 0.5);
                transform: scale(1.1);
            }

            .dice-face.rolling {
                animation: diceRoll 0.2s infinite;
            }

            @keyframes diceRoll {
                0% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(90deg) scale(1.1); }
                50% { transform: rotate(180deg) scale(0.9); }
                75% { transform: rotate(270deg) scale(1.1); }
                100% { transform: rotate(360deg) scale(1); }
            }

            .dice-actions {
                width: 100%;
            }

            .btn-roll {
                width: 100%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: 2px solid rgba(99, 102, 241, 0.3);
                box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
                font-size: 1rem;
                padding: 0.875rem 1.5rem;
            }

            .btn-roll:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(99, 102, 241, 0.5);
            }

            .roll-history {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
                justify-content: center;
                opacity: 0.6;
            }

            .roll-history-item {
                width: 2rem;
                height: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: 600;
                color: #ffffff;
            }

            /* Секция действий */
            .player-actions {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
                border-radius: 1rem;
                padding: 1.25rem;
                border: 2px solid rgba(245, 158, 11, 0.2);
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                margin-bottom: 1.5rem;
            }

            .action-buttons {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .btn-action {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                padding: 0.875rem 1.25rem;
                border-radius: 0.75rem;
                font-weight: 600;
                font-size: 0.95rem;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
            }

            .btn-bank {
                background: linear-gradient(135deg, #059669, #047857);
                color: white;
                border: 2px solid rgba(5, 150, 105, 0.3);
                box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);
            }

            .btn-bank:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(5, 150, 105, 0.5);
            }

            .btn-pass {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                border: 2px solid rgba(245, 158, 11, 0.3);
                box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
            }

            .btn-pass:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(245, 158, 11, 0.5);
            }

            .btn-pass:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            /* Адаптивность */
            @media (max-width: 768px) {
                .active-player-card {
                    flex-direction: column;
                    text-align: center;
                    gap: 0.75rem;
                }

                .dice-visual {
                    width: 4rem;
                    height: 4rem;
                }

                .dice-face {
                    font-size: 2rem;
                }

                .action-buttons {
                    gap: 0.5rem;
                }

                .btn-action {
                    padding: 0.75rem 1rem;
                    font-size: 0.9rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Новые стили для переработанной правой панели v3.0
     */
    addNewStyles() {
        if (document.getElementById('game-right-panel-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'game-right-panel-styles';
        styles.textContent = `
            /* Основной контейнер правой панели */
            .game-right-panel {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                height: 100vh;
                padding: 1.5rem;
                background: linear-gradient(180deg, 
                    rgba(15, 23, 42, 0.95) 0%, 
                    rgba(8, 13, 26, 0.98) 100%);
                border-left: 1px solid rgba(99, 102, 241, 0.2);
                backdrop-filter: blur(20px);
                overflow-y: auto;
                box-sizing: border-box;
            }

            /* Заголовок панели */
            .panel-header {
                text-align: center;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(148, 163, 184, 0.1);
            }

            .panel-title {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                font-size: 1.25rem;
                font-weight: 700;
                color: #f8fafc;
                margin-bottom: 0.5rem;
            }

            .title-icon {
                font-size: 1.5rem;
            }

            .panel-subtitle {
                font-size: 0.875rem;
                color: rgba(148, 163, 184, 0.8);
                font-weight: 500;
            }

            /* Общие стили для виджетов */
            .active-player-widget,
            .actions-widget,
            .players-widget {
                background: rgba(255, 255, 255, 0.03);
                border-radius: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.08);
                padding: 1.25rem;
                backdrop-filter: blur(10px);
                box-shadow: 
                    0 4px 20px rgba(0, 0, 0, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }

            .active-player-widget:hover,
            .actions-widget:hover,
            .players-widget:hover {
                border-color: rgba(99, 102, 241, 0.3);
                box-shadow: 
                    0 8px 30px rgba(0, 0, 0, 0.2),
                    0 0 20px rgba(99, 102, 241, 0.1);
            }

            /* Заголовки виджетов */
            .widget-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1rem;
                font-size: 1rem;
                font-weight: 600;
                color: #f8fafc;
            }

            .widget-icon {
                font-size: 1.125rem;
            }

            .widget-title {
                flex: 1;
            }

            /* Активный игрок */
            .player-info-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
            }

            .player-avatar-container {
                position: relative;
                flex-shrink: 0;
            }

            .player-avatar {
                width: 3.5rem;
                height: 3.5rem;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.2);
                position: relative;
                overflow: hidden;
            }

            .player-avatar::before {
                content: '';
                position: absolute;
                inset: -2px;
                border-radius: 50%;
                background: linear-gradient(45deg, #6366f1, #8b5cf6, #ec4899);
                z-index: -1;
                animation: avatarGlow 3s ease-in-out infinite;
            }

            @keyframes avatarGlow {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }

            .player-status-indicator {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 1rem;
                height: 1rem;
                border-radius: 50%;
                background: #22c55e;
                border: 2px solid rgba(15, 23, 42, 0.95);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }

            .player-details {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 1rem;
                position: relative;
            }

            .player-name {
                font-size: 1.125rem;
                font-weight: 600;
                color: #f8fafc;
                line-height: 1.2;
                word-break: break-word;
                flex-shrink: 0;
            }

            .player-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: rgba(148, 163, 184, 0.9);
                line-height: 1.2;
                flex: 1;
            }

            .status-icon {
                font-size: 1rem;
            }

            /* Таймер */
            .player-timer {
                margin-left: auto;
                margin-right: 0;
            }

            .timer-ring {
                position: relative;
                width: 2rem;
                height: 2rem;
            }

            .timer-svg {
                width: 100%;
                height: 100%;
                transform: rotate(-90deg);
            }

            .timer-bg {
                fill: none;
                stroke: rgba(148, 163, 184, 0.2);
                stroke-width: 2;
            }

            .timer-progress {
                fill: none;
                stroke: #f59e0b;
                stroke-width: 2;
                stroke-linecap: round;
                transition: stroke-dasharray 0.3s ease;
            }

            .timer-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 0.75rem;
                font-weight: 600;
                color: #f59e0b;
            }

            /* Бросок кубика */
            .dice-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .dice-main {
                position: relative;
            }

            .dice-face {
                width: 4rem;
                height: 4rem;
                background: linear-gradient(135deg, #ffffff, #f1f5f9);
                border-radius: 0.75rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                font-weight: 700;
                color: #1e293b;
                border: 2px solid rgba(255, 255, 255, 0.3);
                box-shadow: 
                    0 8px 20px rgba(0, 0, 0, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.5);
                transition: all 0.3s ease;
            }

            .dice-face.rolling {
                animation: diceRoll 0.6s ease-in-out;
            }

            @keyframes diceRoll {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(90deg) scale(1.1); }
                50% { transform: rotate(180deg) scale(1); }
                75% { transform: rotate(270deg) scale(1.1); }
            }

            .dice-number {
                user-select: none;
            }

            .dice-history {
                display: flex;
                gap: 0.5rem;
                max-width: 10rem;
                overflow-x: auto;
                padding: 0.5rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.5rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .roll-item {
                min-width: 2rem;
                height: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.875rem;
                font-weight: 600;
                color: #f8fafc;
            }

            .dice-controls {
                width: 100%;
            }

            .dice-btn {
                width: 100%;
                padding: 1rem 1.5rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border: none;
                border-radius: 0.75rem;
                color: white;
                font-size: 1rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
            }

            .dice-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
            }

            .dice-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .btn-glow {
                position: absolute;
                inset: 0;
                background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transform: translateX(-100%);
                transition: transform 0.6s ease;
            }

            .dice-btn:hover .btn-glow {
                transform: translateX(100%);
            }

            /* Игровые действия */
            .actions-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 1rem;
            }
            
            .roll-btn:hover:not(:disabled) {
                border-color: rgba(147, 51, 234, 0.3);
                box-shadow: 0 8px 20px rgba(147, 51, 234, 0.15);
            }

            .action-btn {
                padding: 1.25rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 0.75rem;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                text-align: center;
            }

            .action-btn:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(99, 102, 241, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            }

            .action-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .bank-btn:hover:not(:disabled) {
                border-color: rgba(34, 197, 94, 0.3);
                box-shadow: 0 8px 20px rgba(34, 197, 94, 0.15);
            }

            .pass-btn:hover:not(:disabled) {
                border-color: rgba(245, 158, 11, 0.3);
                box-shadow: 0 8px 20px rgba(245, 158, 11, 0.15);
            }

            .move-btn:hover:not(:disabled) {
                border-color: rgba(34, 197, 94, 0.3);
                box-shadow: 0 8px 20px rgba(34, 197, 94, 0.15);
            }

            .btn-icon {
                font-size: 1.5rem;
            }

            .btn-label {
                font-size: 0.875rem;
                font-weight: 600;
                color: #f8fafc;
            }

            /* Список игроков */
            .players-count {
                font-size: 0.875rem;
                color: rgba(148, 163, 184, 0.8);
                padding: 0.25rem 0.5rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.5rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .players-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                max-height: 20rem;
                overflow-y: auto;
            }

            .player-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 0.5rem;
                border: 1px solid rgba(255, 255, 255, 0.05);
                transition: all 0.2s ease;
            }

            .player-item:hover {
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(255, 255, 255, 0.1);
            }

            .player-item.active {
                border-color: rgba(99, 102, 241, 0.4);
                background: rgba(99, 102, 241, 0.1);
            }

            .player-avatar-small {
                width: 2rem;
                height: 2rem;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.875rem;
                color: white;
                flex-shrink: 0;
            }

            .player-info {
                flex: 1;
                min-width: 0;
            }

            .player-info-name {
                font-size: 0.875rem;
                font-weight: 600;
                color: #f8fafc;
                word-break: break-word;
            }

            .player-info-balance {
                font-size: 0.75rem;
                color: rgba(148, 163, 184, 0.8);
                margin-top: 0.125rem;
            }

            /* Адаптивность */
            @media (max-width: 480px) {
                .game-right-panel {
                    padding: 1rem;
                    gap: 1rem;
                }

                .player-info-card {
                    padding: 0.75rem;
                }

                .player-avatar {
                    width: 3rem;
                    height: 3rem;
                }

                .dice-face {
                    width: 3.5rem;
                    height: 3.5rem;
                    font-size: 1.75rem;
                }

                .actions-grid {
                    gap: 0.75rem;
                }

                .action-btn {
                    padding: 1rem 0.75rem;
                }
            }

            /* Скроллбар */
            .game-right-panel::-webkit-scrollbar,
            .players-list::-webkit-scrollbar {
                width: 4px;
            }

            .game-right-panel::-webkit-scrollbar-track,
            .players-list::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 2px;
            }

            .game-right-panel::-webkit-scrollbar-thumb,
            .players-list::-webkit-scrollbar-thumb {
                background: rgba(99, 102, 241, 0.4);
                border-radius: 2px;
            }

            .game-right-panel::-webkit-scrollbar-thumb:hover,
            .players-list::-webkit-scrollbar-thumb:hover {
                background: rgba(99, 102, 241, 0.6);
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Удаление старых обработчиков событий
     */
    removeEventListeners() {
        if (!this.container) return;
        
        // Удаляем обработчики с кнопок
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(button => {
            // Клонируем элемент для удаления всех обработчиков
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        console.log('🧹 PlayersPanel: Старые обработчики событий удалены');
    }

    /**
     * Настройка элементов управления
     * Примечание: PlayersPanel теперь только отображает UI, управление ходами через TurnController
     */
    setupControls() {
        // PlayersPanel больше не управляет броском кубика и ходами
        // Эта функциональность полностью делегирована TurnController
        console.log('ℹ️ PlayersPanel: UI контроллеры не настраиваются - используется TurnController');
        
        // УДАЛЯЕМ СТАРЫЕ ОБРАБОТЧИКИ перед добавлением новых
        this.removeEventListeners();
        
        // Обработчик кнопки банка
        const openBankBtn = this.container.querySelector('#open-bank');
        if (openBankBtn) {
            openBankBtn.addEventListener('click', () => {
                console.log('🏦 PlayersPanel: Клик по кнопке банка (из setupControls)');
                this.openBankModule();
            });
            console.log('✅ PlayersPanel: Обработчик кнопки банка привязан в setupControls');
        } else {
            console.warn('⚠️ PlayersPanel: Кнопка банка не найдена в setupControls');
        }
        
        // Обработчик кнопки "Бросить"
        const rollDiceBtn = this.container.querySelector('#roll-dice-btn');
        if (rollDiceBtn) {
            rollDiceBtn.addEventListener('click', () => {
                this.handleRollDice();
            });
        }
        
        // Обработчик кнопки "Передать ход"
        const passTurnBtn = this.container.querySelector('#pass-turn');
        if (passTurnBtn) {
            passTurnBtn.addEventListener('click', () => {
                this.handleEndTurn();
            });
        }
        
        // Обработчик кнопки "Бросок"
        const moveBtn = this.container.querySelector('#move-btn');
        if (moveBtn) {
            moveBtn.addEventListener('click', () => {
                this.handleDiceRoll();
            });
        }
        
        // Подписываемся на события TurnService для обновления UI
        try {
            const app = window.app;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            if (turnService && typeof turnService.on === 'function') {
                turnService.on('roll:start', () => {
                    this._showRollingAnimation();
                });
                turnService.on('roll:success', (response) => {
                    const serverValue = response && (response.serverValue ?? response.diceResult?.value);
                    const localValue = response && response.localRoll && (response.localRoll.value || response.localRoll.total);
                    const value = serverValue ?? localValue ?? null;
                    if (value != null) this.updateDiceResult(value);
                });
                turnService.on('roll:finish', () => {
                    this._hideRollingAnimation();
                });
            }
        } catch (e) {
            console.warn('⚠️ PlayersPanel: Не удалось подписаться на события TurnService', e);
        }
    }

    // Анимация броска кубика для нового дизайна v3.0
    _showRollingAnimation() {
        const diceResult = document.getElementById('dice-result-value');
        
        if (diceResult) {
            const diceFace = diceResult.querySelector('.dice-face');
            const diceNumber = diceFace?.querySelector('.dice-number');
            
            if (diceFace) {
                diceFace.classList.add('rolling');
            }
            
            if (diceNumber) {
                const seq = ['1','2','3','4','5','6'];
                let i = 0;
                this._rollingTimer && clearInterval(this._rollingTimer);
                this._rollingTimer = setInterval(() => {
                    diceNumber.textContent = seq[i % seq.length];
                    i++;
                }, 120);
            }
        }
    }
    
    _hideRollingAnimation() {
        if (this._rollingTimer) {
            clearInterval(this._rollingTimer);
            this._rollingTimer = null;
        }
        
        // Убираем классы анимации
        const diceResult = document.getElementById('dice-result-value');
        if (diceResult) {
            const diceFace = diceResult.querySelector('.dice-face');
            if (diceFace) {
                diceFace.classList.remove('rolling');
            }
        }
    }
    
    /**
     * Уничтожение компонента с полной очисткой памяти
     */
    destroy() {
        console.log('👥 PlayersPanel v2.0: Уничтожение с очисткой памяти...');
        
        // Очищаем ВСЕ таймеры (включая скрытые setTimeout)
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        
        if (this._rollingTimer) {
            clearInterval(this._rollingTimer);
            this._rollingTimer = null;
        }
        
        // Очищаем дополнительные таймеры
        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
            this._updateTimer = null;
        }
        
        if (this._forceUpdateTimer) {
            clearTimeout(this._forceUpdateTimer);
            this._forceUpdateTimer = null;
        }
        
        if (this._buttonUpdateTimer) {
            clearTimeout(this._buttonUpdateTimer);
            this._buttonUpdateTimer = null;
        }
        
        // Очищаем дебаунсинг таймаут
        if (this._uiUpdateTimeout) {
            clearTimeout(this._uiUpdateTimeout);
            this._uiUpdateTimeout = null;
        }
        
        // Отменяем текущие запросы
        if (this._currentAbortController) {
            this._currentAbortController.abort();
            this._currentAbortController = null;
        }
        
        // Очищаем кэш
        if (this._playersCache) {
            this._playersCache.clear();
            this._playersCache = null;
        }
        
        // Очищаем кэш времени последнего обновления
        this._lastFetchTime = 0;
        this._lastUpdateTime = 0;
        
        // Уничтожаем BankModule
        if (this.bankModule && typeof this.bankModule.destroy === 'function') {
            this.bankModule.destroy();
            this.bankModule = null;
        }
        
        // Отписываемся от ВСЕХ событий
        if (this.eventBus) {
            this.eventBus.off('game:started');
            this.eventBus.off('game:playersUpdated');
            this.eventBus.off('game:turnChanged');
            this.eventBus.off('dice:rolled');
            this.eventBus.off('players:updated');
            this.eventBus.off('game:stateUpdated');
        }
        
        // Отписываемся от GameStateManager
        if (this.gameStateManager && typeof this.gameStateManager.off === 'function') {
            this.gameStateManager.off('state:updated');
        }
        
        // Удаляем event listeners с DOM элементов
        if (this.container) {
            const buttons = this.container.querySelectorAll('button');
            buttons.forEach(button => {
                button.removeEventListener('click', this.handleDiceRoll);
                button.removeEventListener('click', this.handlePassTurn);
                button.removeEventListener('click', this.handleMove);
            });
        }
        
        // Очищаем все ссылки
        this.container = null;
        this.gameStateManager = null;
        this.eventBus = null;
        this.playerList = null;
        this.activePlayerInfo = null;
        this.controlButtons = null;
        
        // Сбрасываем флаги состояния
        this._isInitialized = false;
        this._isDestroyed = true;
        
        console.log('✅ PlayersPanel v2.0: Полностью очищен с улучшенной очисткой памяти');
    }
    
    /**
     * Проверка, должна ли активироваться кнопка броска кубика
     * @returns {boolean} true, если кнопка должна быть активна
     */
    checkIfShouldActivateDiceButtons() {
        const currentUserId = this.getCurrentUserId();
        const currentUsername = this.getCurrentUsername();
        
        // Проверяем через TurnService
        let shouldActivate = false;
        try {
            const turnService = window.app?.getModule?.('turnService');
            if (turnService) {
                // Базовое правило: ход и право броска
                shouldActivate = Boolean(turnService.canRoll() && turnService.isMyTurn());
                
                // Допуск в одиночной игре/демо: если игроков <= 1 или нет активного игрока — разрешаем бросок
                if (!shouldActivate) {
                    const gsm = window.app?.getGameStateManager?.();
                    const state = typeof gsm?.getState === 'function' ? gsm.getState() : null;
                    const gsModule = window.app?.getModule?.('gameState');
                    const playersFromGS = Array.isArray(gsModule?.players) ? gsModule.players : [];
                    const playersFromState = Array.isArray(state?.players) ? state.players : [];
                    const playersCount = playersFromState.length || playersFromGS.length || 0;
                    const noActivePlayer = !state?.activePlayer && !gsModule?.activePlayer;
                    if (playersCount <= 1 || noActivePlayer) {
                        shouldActivate = Boolean(turnService.canRoll());
                    }
                }
                console.log('🔧 PlayersPanel: TurnService проверка:', { 
                    canRoll: turnService.canRoll(), 
                    isMyTurn: turnService.isMyTurn(), 
                    shouldActivate 
                });
            }
        } catch (error) {
            console.warn('⚠️ PlayersPanel: Ошибка проверки TurnService:', error);
        }
        
        // Fallback: проверяем по имени пользователя в интерфейсе
        if (!shouldActivate) {
            const activePlayerText = document.querySelector('#current-player-name')?.textContent || '';
            const isAdminTurn = activePlayerText.includes('admin') && currentUsername === 'admin';
            const isRomanTurn = activePlayerText.includes('roman') && currentUsername === 'roman';
            shouldActivate = isAdminTurn || isRomanTurn;
            console.log('🔧 PlayersPanel: Fallback проверка:', { 
                activePlayerText, 
                currentUsername, 
                isAdminTurn, 
                isRomanTurn, 
                shouldActivate 
            });
        }
        
        return shouldActivate;
    }
    
    /**
     * Активация кнопки броска кубика
     * @param {HTMLElement} button - Элемент кнопки
     * @param {string} buttonName - Название кнопки для логов
     * @param {boolean} shouldActivate - Должна ли кнопка быть активна
     */
    activateDiceButton(button, buttonName, shouldActivate) {
        if (shouldActivate) {
            console.log(`🔧 PlayersPanel: Активация кнопки "${buttonName}"`);
            button.disabled = false;
            button.classList.add('active');
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
            button.style.backgroundColor = '#4CAF50';
            button.style.color = 'white';
            button.removeAttribute('disabled');
        } else {
            console.log(`🔧 PlayersPanel: Кнопка "${buttonName}" остается отключенной`);
        }
        
        this.forceUpdateButtonUI(button);
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
window.PlayersPanel = PlayersPanel;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayersPanel;
}
