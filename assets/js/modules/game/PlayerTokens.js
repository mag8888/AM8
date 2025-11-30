/**
 * PlayerTokens v1.0.0
 * Компонент для отображения фишек игроков на игровом поле
 */
if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('🎯 PlayerTokens: Файл загружается...');
}

class PlayerTokens {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.outerTrackSelector = config.outerTrackSelector || '#outer-track';
        this.innerTrackSelector = config.innerTrackSelector || '#inner-track';
        this.boardLayout = config.boardLayout || this._resolveBoardLayout();
        this.logger = config.logger || window.logger || null;

        const globalConfig = typeof window !== 'undefined' ? window.config : null;
        this.debugEnabled =
            typeof config.debug === 'boolean'
                ? config.debug
                : globalConfig?.get?.('logging.playerTokensDebug', false);
        
        this.tokens = new Map(); // Хранение DOM элементов фишек
        this.animatingTokens = new Set(); // Фишки, которые сейчас анимируются
        this._forceUpdateTimer = null; // Дебаунсинг для forceUpdate
        this._isForceUpdating = false; // Флаг выполняющегося обновления
        this._pendingPositionRefresh = null;
        this._initialRenderTimer = null;
        this._initialRenderAttempts = 0;
        this._maxInitialRenderAttempts = config.maxInitialRenderAttempts || 12;
        this._updateTokensTimer = null; // Таймер для debounce updateTokens
        this._updateTokensDebounceDelay = 500; // Увеличено до 500ms для снижения нагрузки
        this._hasUpdatedTokens = false; // Флаг первого обновления
        this._eventHandlers = new Map(); // Хранение обработчиков событий для отписки
        this._lastPlayersHash = null; // Хеш последних данных игроков для предотвращения дублирования
        this.outerTrackElement = null;
        this.innerTrackElement = null;
        this.cellCenters = {
            outer: [],
            inner: []
        };
        
        this._debug('Инициализация');
        this.init();
    }
    
    /**
     * Инициализация компонента
     */
    init() {
        this.ensureTrackElements();
        this.setupEventListeners();
        this.addStyles();
        this.setupGameStateManagerListeners();
        
        // Принудительно обновляем фишки через небольшую задержку
        setTimeout(() => {
            this.forceUpdateFromGameState();
        }, 100); // Уменьшили задержку для быстрой загрузки фишек
        
        // Дополнительный наблюдатель для гарантированного первого рендера
        this.startInitialRenderWatcher();
        
        this._info('PlayerTokens инициализирован');
    }
    
    /**
     * Подписка на обновления GameStateManager
     */
    setupGameStateManagerListeners() {
        this._info('🔍 Настройка подписки на GameStateManager...');
        
        if (!window.app) {
            this._warn('❌ window.app не найден, не можем подписаться на GameStateManager');
            return;
        }
        
        if (!window.app.getModule) {
            this._warn('❌ window.app.getModule не найден');
            return;
        }
        
        const gameStateManager = window.app.getModule('gameStateManager');
        this._info('🔍 GameStateManager получен:', {
            found: !!gameStateManager,
            hasOn: gameStateManager && typeof gameStateManager.on === 'function',
            hasGetState: gameStateManager && typeof gameStateManager.getState === 'function'
        });
        
        if (!gameStateManager) {
            this._warn('❌ GameStateManager не найден через window.app.getModule');
            // Попробуем получить напрямую
            if (window.app.gameStateManager) {
                this._info('✅ GameStateManager найден напрямую через window.app.gameStateManager');
                this._setupListenersForGameStateManager(window.app.gameStateManager);
            }
            return;
        }
        
        if (typeof gameStateManager.on !== 'function') {
            this._warn('❌ GameStateManager не имеет метода on', {
                type: typeof gameStateManager.on,
                methods: Object.keys(gameStateManager).filter(k => typeof gameStateManager[k] === 'function')
            });
            return;
        }
        
        this._setupListenersForGameStateManager(gameStateManager);
    }
    
    _setupListenersForGameStateManager(gameStateManager) {
        // Отписываемся от старых обработчиков, если они есть
        this._unsubscribeGameStateManager();
        
        this._info('✅ Подписываемся на обновления GameStateManager');
        
        // Объединенный обработчик для всех событий обновления игроков
        const handlePlayersUpdate = (players) => {
            if (!Array.isArray(players) || players.length === 0) {
                this._debug('handlePlayersUpdate: пустой массив игроков');
                return;
            }
            
            // Проверяем, изменились ли данные (простая проверка по хешу)
            const playersHash = JSON.stringify(players.map(p => ({ id: p.id, position: p.position })));
            if (this._lastPlayersHash === playersHash && this._hasUpdatedTokens) {
                this._debug('Данные игроков не изменились, пропускаем обновление');
                return;
            }
            this._lastPlayersHash = playersHash;
            
            this._info('📢 Обновление игроков от GameStateManager', { playersCount: players.length });
            this.updateTokens(players);
        };
        
        // Подписка на обновление состояния (объединенный обработчик)
        const stateUpdatedHandler = (state) => {
            if (state && state.players && state.players.length > 0) {
                handlePlayersUpdate(state.players);
            }
        };
        
        // Подписка на обновление игроков
        const playersUpdatedHandler = (players) => {
            if (Array.isArray(players) && players.length > 0) {
                handlePlayersUpdate(players);
            }
        };
        
        // Подписка на событие game:playersUpdated
        const gamePlayersUpdatedHandler = (data) => {
            const players = data?.players || data;
            if (Array.isArray(players) && players.length > 0) {
                handlePlayersUpdate(players);
            }
        };
        
        // Сохраняем обработчики для отписки
        this._eventHandlers.set('gameStateManager:state:updated', stateUpdatedHandler);
        this._eventHandlers.set('gameStateManager:players:updated', playersUpdatedHandler);
        this._eventHandlers.set('gameStateManager:game:playersUpdated', gamePlayersUpdatedHandler);
        
        // Подписываемся
        gameStateManager.on('state:updated', stateUpdatedHandler);
        gameStateManager.on('players:updated', playersUpdatedHandler);
        gameStateManager.on('game:playersUpdated', gamePlayersUpdatedHandler);
        
        this._info('✅ Подписка на GameStateManager завершена');
    }
    
    _unsubscribeGameStateManager() {
        if (!window.app || !window.app.getModule) {
            return;
        }
        
        const gameStateManager = window.app.getModule('gameStateManager') || window.app.gameStateManager;
        if (!gameStateManager || typeof gameStateManager.off !== 'function') {
            return;
        }
        
        // Отписываемся от всех сохраненных обработчиков
        const stateHandler = this._eventHandlers.get('gameStateManager:state:updated');
        const playersHandler = this._eventHandlers.get('gameStateManager:players:updated');
        const gameHandler = this._eventHandlers.get('gameStateManager:game:playersUpdated');
        
        if (stateHandler) {
            gameStateManager.off('state:updated', stateHandler);
            this._eventHandlers.delete('gameStateManager:state:updated');
        }
        if (playersHandler) {
            gameStateManager.off('players:updated', playersHandler);
            this._eventHandlers.delete('gameStateManager:players:updated');
        }
        if (gameHandler) {
            gameStateManager.off('game:playersUpdated', gameHandler);
            this._eventHandlers.delete('gameStateManager:game:playersUpdated');
        }
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (!this.eventBus) {
            this._warn('EventBus не найден');
            return;
        }

        // Отписываемся от старых обработчиков, если они есть
        this._unsubscribeEventBus();

        // Создаем обработчики и сохраняем их для отписки
        const gamePlayersUpdatedHandler = (data = {}) => {
            this._debug('Получено событие game:playersUpdated', data);
            this.updateTokens(data.players);
        };

        const playerPositionUpdatedHandler = (data = {}) => {
            this._debug('Получено событие player:positionUpdated', data);
            if (this.animatingTokens.has(data.playerId)) {
                this._debug(`Фишка ${data.playerId} анимируется, пропускаем player:positionUpdated`);
                return;
            }
            this.updateTokenPosition(data.playerId, data.position, data.player?.isInner);
        };

        const playersPositionsUpdatedHandler = (data = {}) => {
            this._debug('Получено событие players:positionsUpdated', data);
            if (Array.isArray(data.changes)) {
                data.changes.forEach((change) => {
                    if (!change || change.position === undefined || !change.playerId) {
                        return;
                    }
                    if (this.animatingTokens.has(change.playerId)) {
                        this._debug(`Фишка ${change.playerId} анимируется, пропускаем обновление`);
                        return;
                    }
                    const player =
                        Array.isArray(data.players) &&
                        data.players.find((p) => p && (p.id === change.playerId || p.userId === change.playerId));
                    this.updateTokenPosition(change.playerId, change.position, player?.isInner);
                });

                setTimeout(() => {
                    this.updateAllTokenPositions();
                }, 100);
            }
        };

        const gameStartedHandler = () => {
            this._debug('Получено событие game:started');
            if (this.gameState && Array.isArray(this.gameState.players)) {
                this.renderTokens(this.gameState.players);
            }
        };

        const playersUpdatedHandler = (data = {}) => {
            this._debug('Получено событие players:updated', data);
            this.updateTokens(data.players);
        };

        const boardCellsPositionedHandler = (payload = {}) => {
            this._debug('Получено событие board:cellsPositioned');
            if (payload.outer) {
                this.cellCenters.outer = payload.outer;
            }
            if (payload.inner) {
                this.cellCenters.inner = payload.inner;
            }
            this.scheduleTokenPositionRefresh();
        };

        // Сохраняем обработчики для отписки
        this._eventHandlers.set('eventBus:game:playersUpdated', gamePlayersUpdatedHandler);
        this._eventHandlers.set('eventBus:player:positionUpdated', playerPositionUpdatedHandler);
        this._eventHandlers.set('eventBus:players:positionsUpdated', playersPositionsUpdatedHandler);
        this._eventHandlers.set('eventBus:game:started', gameStartedHandler);
        this._eventHandlers.set('eventBus:players:updated', playersUpdatedHandler);
        this._eventHandlers.set('eventBus:board:cellsPositioned', boardCellsPositionedHandler);

        // Подписываемся на события
        this.eventBus.on('game:playersUpdated', gamePlayersUpdatedHandler);
        this.eventBus.on('player:positionUpdated', playerPositionUpdatedHandler);
        this.eventBus.on('players:positionsUpdated', playersPositionsUpdatedHandler);
        this.eventBus.on('game:started', gameStartedHandler);
        this.eventBus.on('players:updated', playersUpdatedHandler);
        this.eventBus.on('board:cellsPositioned', boardCellsPositionedHandler);
    }
    
    _unsubscribeEventBus() {
        if (!this.eventBus || typeof this.eventBus.off !== 'function') {
            return;
        }

        // Отписываемся от всех сохраненных обработчиков EventBus
        const eventNames = [
            'game:playersUpdated',
            'player:positionUpdated',
            'players:positionsUpdated',
            'game:started',
            'players:updated',
            'board:cellsPositioned'
        ];

        eventNames.forEach(eventName => {
            const handler = this._eventHandlers.get(`eventBus:${eventName}`);
            if (handler) {
                this.eventBus.off(eventName, handler);
                this._eventHandlers.delete(`eventBus:${eventName}`);
            }
        });
    }
    
    /**
     * Добавление стилей для фишек
     */
    addStyles() {
        if (document.getElementById('player-tokens-styles')) {
            this._debug('Стили уже добавлены');
            return;
        }
        
        this._debug('Добавляем стили для фишек');
        const styles = document.createElement('style');
        styles.id = 'player-tokens-styles';
        styles.textContent = `
            .player-token {
                position: absolute !important;
                width: 32px !important;
                height: 32px !important;
                min-width: 32px !important;
                min-height: 32px !important;
                border-radius: 50%;
                display: flex !important;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
                font-weight: bold;
                border: 3px solid rgba(255, 255, 255, 0.9);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
                z-index: 2000 !important;
                pointer-events: auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                backdrop-filter: blur(5px);
                transform: translate3d(0, 0, 0);
                will-change: transform, left, top;
            }
            
            .player-token:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            }
            
            .player-token.outer {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
            }
            
            .player-token.inner {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
            }
            
            .player-token.multiple {
                /* Стили для множественных фишек на одной клетке */
            }
            
            /* Анимация появления фишки */
            @keyframes tokenAppear {
                from {
                    opacity: 0;
                    transform: scale(0);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            .player-token.appearing {
                animation: tokenAppear 0.3s ease-out;
            }
            
            /* Анимация перемещения */
            @keyframes tokenMove {
                from {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.2);
                }
                to {
                    transform: scale(1);
                }
            }
            
            .player-token.moving {
                animation: tokenMove 0.5s ease-in-out;
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Разрешить текущий экземпляр BoardLayout, если он доступен
     * @returns {*|null}
     * @private
     */
    _resolveBoardLayout() {
        try {
            if (this.boardLayout) {
                return this.boardLayout;
            }
            if (window?.app?.getModule) {
                const moduleInstance = window.app.getModule('boardLayout');
                if (moduleInstance) {
                    return moduleInstance;
                }
            }
            if (window.boardLayout) {
                return window.boardLayout;
            }
            if (window.BoardLayoutInstance) {
                return window.BoardLayoutInstance;
            }
        } catch (error) {
            this._debug('Не удалось разрешить BoardLayout из window', error);
        }
        return null;
    }

    ensureTrackElements() {
        if (!this.outerTrackElement) {
            this.outerTrackElement = document.querySelector(this.outerTrackSelector);
        }
        if (!this.innerTrackElement) {
            this.innerTrackElement = document.querySelector(this.innerTrackSelector);
        }
    }

    getTrackElement(isInner) {
        this.ensureTrackElements();
        const element = isInner ? this.innerTrackElement : this.outerTrackElement;
        if (!element) {
            this._warn(`Трек не найден при getTrackElement`, {
                isInner,
                innerSelector: this.innerTrackSelector,
                outerSelector: this.outerTrackSelector,
                innerExists: !!this.innerTrackElement,
                outerExists: !!this.outerTrackElement
            });
        }
        return element;
    }

    /**
     * Получить координаты центра клетки.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {{x:number,y:number,width:number,height:number}|null}
     */
    getCellCenter(position, isInner) {
        this._debug('🔍 getCellCenter вызван', { position, isInner });
        
        // Сначала пытаемся получить координаты из boardLayout (кэш)
        const boardLayout = this.boardLayout || this._resolveBoardLayout();
        if (boardLayout && typeof boardLayout.getCellCenter === 'function') {
            const center = boardLayout.getCellCenter(position, isInner);
            this._info('📊 boardLayout.getCellCenter вернул', { position, isInner, center, centerType: typeof center });
            if (center && Number.isFinite(center.x) && Number.isFinite(center.y)) {
                // Проверяем, что координаты в пределах разумных значений
                if (center.x >= 0 && center.y >= 0) {
                    this._info('✅ Координаты получены из boardLayout', center);
                return center;
                } else {
                    this._warn('⚠️ Координаты из boardLayout отрицательные, вычисляем из DOM', { center, position, isInner });
                }
            } else {
                this._warn('❌ boardLayout.getCellCenter вернул невалидные координаты', { center, position, isInner });
            }
        } else {
            this._warn('❌ boardLayout не найден или не имеет метода getCellCenter', { 
                hasBoardLayout: !!boardLayout,
                boardLayoutType: typeof boardLayout
            });
        }

        // Если координаты из boardLayout недоступны, вычисляем напрямую из DOM
        const trackElement = this.getTrackElement(isInner);
        if (!trackElement) {
            this._warn('Трек не найден для вычисления координат', { position, isInner });
            return null;
        }

        const cell = trackElement.querySelector(`[data-position="${position}"]`);
        if (!cell || typeof cell.getBoundingClientRect !== 'function') {
            this._warn('Клетка не найдена в DOM', { 
                position, 
                isInner,
                trackElementExists: !!trackElement,
                cellsCount: trackElement.querySelectorAll('.track-cell').length
            });
            return null;
        }

        // Используем offsetLeft/offsetTop для координат относительно родителя (как в BoardLayout)
        const cellRect = cell.getBoundingClientRect(); // Используем только для размеров
        const offsetLeft = cell.offsetLeft || 0;
        const offsetTop = cell.offsetTop || 0;
        
        // Вычисляем координаты центра клетки относительно trackElement
        // Используем offsetLeft/offsetTop для координат, getBoundingClientRect только для размеров
        const coords = {
            x: offsetLeft + (cellRect.width / 2),
            y: offsetTop + (cellRect.height / 2),
            width: cellRect.width,
            height: cellRect.height
        };
        
        // Проверяем, что координаты находятся в пределах видимой области трека
        const isWithinTrack = coords.x >= 0 && coords.x <= trackRect.width && 
                              coords.y >= 0 && coords.y <= trackRect.height;
        
        if (!isWithinTrack) {
            this._warn('⚠️ Координаты клетки выходят за пределы трека', {
                coords,
                trackRect: { 
                    left: trackRect.left, 
                    top: trackRect.top, 
                    width: trackRect.width, 
                    height: trackRect.height 
                },
                cellRect: { 
                    left: cellRect.left, 
                    top: cellRect.top, 
                    width: cellRect.width, 
                    height: cellRect.height 
                },
                trackElementId: trackElement.id,
                computedTrackStyles: {
                    position: window.getComputedStyle(trackElement).position,
                    left: window.getComputedStyle(trackElement).left,
                    top: window.getComputedStyle(trackElement).top,
                    width: window.getComputedStyle(trackElement).width,
                    height: window.getComputedStyle(trackElement).height
                }
            });
        }
        
        this._debug('✅ Координаты вычислены из DOM', {
            position,
            isInner,
            coords
        });
        return coords;
    }

    getCellBaseCoordinates(position, isInner) {
        this._debug('🔍 getCellBaseCoordinates вызван', { position, isInner });
        const center = this.getCellCenter(position, isInner);
        if (!center) {
            this._warn('getCellBaseCoordinates: не удалось получить центр клетки', {
                position,
                isInner,
                hasBoardLayout: !!this.boardLayout,
                hasCellCenters: !!(isInner ? this.cellCenters.inner : this.cellCenters.outer)
            });
            return null;
        }
        this._debug('✅ getCellBaseCoordinates: координаты получены', { position, isInner, center });
        return {
            x: center.x,
            y: center.y
        };
    }
    
    /**
     * Очистка всех фишек
     */
    clearTokens() {
        this.tokens.forEach((token) => {
            if (token.parentNode) {
                token.parentNode.removeChild(token);
            }
        });
        this.tokens.clear();
    }
    
    /**
     * Получение игроков из GameStateManager
     */
    getPlayers() {
        // Сначала пробуем получить из локального gameState
        if (this.gameState && this.gameState.players) {
            return this.gameState.players;
        }
        
        // Пробуем получить из глобального GameStateManager
        if (window.app && window.app.getModule) {
            const gameStateManager = window.app.getModule('gameStateManager');
            if (gameStateManager && typeof gameStateManager.getState === 'function') {
                try {
                    const state = gameStateManager.getState();
                    if (state && state.players && Array.isArray(state.players)) {
                        this._debug('Получены игроки из GameStateManager', state.players.length);
                        return state.players;
                    }
                } catch (error) {
                    this._warn('Ошибка получения состояния из GameStateManager', error);
                }
            }
        }
        
        this._debug('Игроки не найдены, возвращаем пустой массив');
        return [];
    }
    
    /**
     * Рендер фишек для всех игроков
     */
    renderTokens(players) {
        const normalized = this.normalizePlayers(players?.length ? players : this.getPlayers());
        if (!normalized.length) {
            this.clearTokens();
            return;
        }
        this.updateTokens(normalized);
    }
    
    /**
     * Создание DOM элемента фишки
     */
    createPlayerToken(player, index, totalPlayers) {
        const token = document.createElement('div');
        token.className = 'player-token';
        token.classList.add(player.isInner ? 'inner' : 'outer');
        token.classList.toggle('inner-track', !!player.isInner);
        token.classList.toggle('outer-track', !player.isInner);
        token.dataset.playerId = player.id;
        token.dataset.playerName = player.username;
        token.setAttribute('data-position', player.position || 0); // Добавляем атрибут позиции
        token.dataset.isInner = String(Boolean(player.isInner));
        token.style.zIndex = '2000'; /* Фишки поверх */
        
        // Используем иконку фишки вместо текста
        const tokenIcon = this.getTokenIcon(player.token);
        token.textContent = tokenIcon;
        
        // Добавляем информацию о игроке в title
        token.title = `${player.username} - $${player.money || 0}`;
        
        return token;
    }
    
    /**
     * Получить иконку токена
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
        
        const icon = tokenIcons[tokenId] || '🎯';
        return icon;
    }
    
    /**
     * Получить токен по умолчанию для игрока
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
     * Расчет смещения для множественных фишек
     */
    calculateOffset(index, totalPlayers) {
        if (totalPlayers === 1) {
            return { x: 0, y: 0 };
        }
        
        // Конфигурация сдвига для разного количества фишек
        const offsetConfigs = {
            2: [
                { x: -8, y: 0 },
                { x: 8, y: 0 }
            ],
            3: [
                { x: -12, y: -6 },
                { x: 0, y: 6 },
                { x: 12, y: -6 }
            ],
            4: [
                { x: -12, y: -8 },
                { x: 12, y: -8 },
                { x: -12, y: 8 },
                { x: 12, y: 8 }
            ]
        };
        
        const config = offsetConfigs[totalPlayers] || offsetConfigs[4];
        const offset = config[index] || { x: 0, y: 0 };
        
        // Добавляем визуальную индикацию для множественных фишек
        if (totalPlayers > 1) {
            this._debug(`Фишка ${index + 1}/${totalPlayers} получает сдвиг`, offset);
        }
        
        return offset;
    }

    _collectTokensOnPosition(position, isInner) {
        const result = [];
        const targetInner = Boolean(isInner);
        this.tokens.forEach((token, playerId) => {
            const tokenPosition = parseInt(token.getAttribute('data-position')) || 0;
            const tokenIsInner = token.dataset?.isInner
                ? token.dataset.isInner === 'true'
                : token.classList.contains('inner-track') || token.classList.contains('inner');
            if (tokenPosition === position && tokenIsInner === targetInner) {
                result.push({ token, playerId });
            }
        });
        return result;
    }
    
    /**
     * Обновление позиции фишки с анимацией
     */
    updateTokenPosition(playerId, newPosition, isInner) {
        this._debug('updateTokenPosition вызван', {
            playerId,
            newPosition,
            isAnimating: this.animatingTokens.has(playerId)
        });
        
        const token = this.tokens.get(playerId);
        if (!token) {
            this._warn('Фишка не найдена для игрока', { playerId });
            return;
        }
        
        // Проверяем, не выполняется ли уже анимация для этой фишки
        if (this.animatingTokens.has(playerId)) {
            this._debug('Фишка уже движется, пропускаем дублирующий вызов', { playerId });
            return;
        }

        // Защита от устаревших обновлений, приходящих сразу после движения
        const nowTs = Date.now();
        const lastUpdateTs = parseInt(token.getAttribute('data-update-ts')) || 0;
        const currentPositionTsWindowMs = 1200; // окно защиты от отката
        const currentPosition = parseInt(token.getAttribute('data-position')) || 0;
        if (lastUpdateTs && (nowTs - lastUpdateTs) < currentPositionTsWindowMs) {
            const maxPosition = isInner ? 23 : 43;
            const isWrapAround = (currentPosition > newPosition) && ((currentPosition - newPosition) > 6) && (currentPosition === maxPosition || newPosition === 0);
            if (!isWrapAround && newPosition < currentPosition && (currentPosition - newPosition) <= 6) {
                this._debug('Игнорируем возможный откат позиции (устаревшее обновление)', {
                    playerId, currentPosition, newPosition, sinceMs: nowTs - lastUpdateTs
                });
                return;
            }
        }
        
        // Получаем текущую позицию из атрибута data-position
        // (поверх переменной currentPosition, объявленной выше)
        
        // Если позиция не изменилась, просто синхронизируем координаты
        if (currentPosition === newPosition) {
            this.moveTokenToPosition(token, playerId, newPosition, isInner);
            return;
        }
        
        // Проверяем, что разница в позициях не слишком большая (максимум 6 шагов)
        const positionDiff = Math.abs(newPosition - currentPosition);
        const maxDiff = 6;
        
        if (positionDiff > maxDiff) {
            this._debug('Слишком большое изменение позиции, выполняем мгновенное перемещение', {
                playerId,
                positionDiff
            });
            this.moveTokenToPosition(token, playerId, newPosition, isInner);
            return;
        }
        
        this._debug('Начинаем пошаговое движение фишки', {
            playerId,
            from: currentPosition,
            to: newPosition
        });
        this.moveTokenStepByStep(token, playerId, currentPosition, newPosition, isInner);
    }
    
    /**
     * Мгновенное перемещение фишки на позицию (без анимации)
     */
    moveTokenToPosition(token, playerId, position, isInner) {
        const baseCoords = this.getCellBaseCoordinates(position, isInner);
        if (!baseCoords) {
            this._warn('Клетка не найдена для позиции', { position, isInner });
            return;
        }

        token.setAttribute('data-position', position);
        token.setAttribute('data-update-ts', String(Date.now()));
        token.dataset.isInner = String(Boolean(isInner));
        token.classList.toggle('inner', !!isInner);
        token.classList.toggle('outer', !isInner);
        token.classList.toggle('inner-track', !!isInner);
        token.classList.toggle('outer-track', !isInner);

        const tokensOnPosition = this._collectTokensOnPosition(position, isInner);
        const total = Math.max(tokensOnPosition.length, 1);
        const offset = this.getTokenOffset(playerId, position, isInner, tokensOnPosition);
        this.positionTokenElement(token, baseCoords, offset, total);
        this._debug(`Фишка ${playerId} мгновенно перемещена на позицию ${position}`, { offset });

        // Обеспечиваем корректный сдвиг остальных фишек
        this.handleTokenCollisions(position, isInner);
    }
    
    /**
     * Обработка коллизий фишек на одной клетке
     */
    handleTokenCollisions(position, isInner) {
        const tokensOnPosition = this._collectTokensOnPosition(position, isInner);
        if (tokensOnPosition.length > 1) {
            this._debug(`Обнаружено ${tokensOnPosition.length} фишек на позиции ${position}, выполняем сдвиг`);
            this.arrangeTokensOnPosition(tokensOnPosition, position, isInner);
        }
    }
    
    /**
     * Расстановка фишек на одной позиции с сдвигом
     */
    arrangeTokensOnPosition(tokensOnPosition, position, isInner) {
        const baseCoords = this.getCellBaseCoordinates(position, isInner);
        if (!baseCoords) {
            this._debug('arrangeTokensOnPosition: нет координат клетки', { position, isInner });
            return;
        }

        const total = tokensOnPosition.length || 1;

        tokensOnPosition.forEach(({ token, playerId }, index) => {
            const offset = this.calculateOffset(index, total);
            this.positionTokenElement(token, baseCoords, offset, total);
            this._debug(`Фишка ${playerId} сдвинута`, { position, offset });
        });
    }
    
    /**
     * Получение сдвига для фишки
     */
    getTokenOffset(playerId, position, isInner, precomputedTokens = null) {
        const tokensOnPosition = precomputedTokens || this._collectTokensOnPosition(position, isInner);
        
        // Если фишка одна, сдвиг не нужен
        if (tokensOnPosition.length <= 1) {
            return { x: 0, y: 0 };
        }
        
        // Находим индекс текущей фишки
        const currentIndex = tokensOnPosition.findIndex(t => t.playerId === playerId);
        if (currentIndex === -1) {
            return { x: 0, y: 0 };
        }
        
        // Конфигурация сдвига
        const offsetConfigs = {
            2: [
                { x: -8, y: 0 },
                { x: 8, y: 0 }
            ],
            3: [
                { x: -12, y: -6 },
                { x: 0, y: 6 },
                { x: 12, y: -6 }
            ],
            4: [
                { x: -12, y: -8 },
                { x: 12, y: -8 },
                { x: -12, y: 8 },
                { x: 12, y: 8 }
            ]
        };
        
        const config = offsetConfigs[tokensOnPosition.length] || offsetConfigs[4];
        return config[currentIndex] || { x: 0, y: 0 };
    }
    
    /**
     * Пошаговое движение фишки с задержкой
     */
    moveTokenStepByStep(token, playerId, fromPosition, toPosition, isInner) {
        // Проверяем, не выполняется ли уже анимация для этой фишки
        if (this.animatingTokens.has(playerId)) {
            this._debug('Фишка уже движется, отменяем предыдущую анимацию', { playerId });
            return;
        }
        
        // Добавляем фишку в список анимирующихся
        this.animatingTokens.add(playerId);

        const maxPosition = isInner ? 23 : 43; // Максимальные позиции для треков
        const steps = [];
        
        // Рассчитываем количество шагов для движения
        let stepsToMove = toPosition - fromPosition;
        if (stepsToMove < 0) {
            // Если движение через 0 (например, с 40 на 2)
            stepsToMove = (maxPosition + 1) - fromPosition + toPosition;
        }
        
        // Ограничиваем максимальное количество шагов (1-6)
        const maxSteps = 6;
        const actualSteps = Math.min(stepsToMove, maxSteps);
        
        this._debug(`Движение с ${fromPosition} на ${toPosition}`, { actualSteps });
        
        // Рассчитываем шаги движения
        let currentPos = fromPosition;
        for (let i = 0; i < actualSteps; i++) {
            currentPos = (currentPos + 1) % (maxPosition + 1);
            steps.push(currentPos);
        }
        
        this._debug(`Шаги движения для ${playerId}`, steps);
        
        // Выполняем каждый шаг с задержкой
        let stepIndex = 0;
        const moveToNextStep = () => {
            if (stepIndex >= steps.length) {
                this._debug(`Движение фишки ${playerId} завершено`);
                this.animatingTokens.delete(playerId);
                return;
            }
            
            const stepPosition = steps[stepIndex];
            const baseCoords = this.getCellBaseCoordinates(stepPosition, isInner);

            if (!baseCoords) {
                this._warn('Клетка не найдена во время анимации движения', { stepPosition, isInner });
                stepIndex += 1;
                setTimeout(moveToNextStep, 100);
                return;
            }

            const currentX = parseFloat(token.style.left) || 0;
            const currentY = parseFloat(token.style.top) || 0;

            token.setAttribute('data-position', stepPosition);
            token.setAttribute('data-update-ts', String(Date.now()));
            token.dataset.isInner = String(Boolean(isInner));

            let tokensOnPosition = this._collectTokensOnPosition(stepPosition, isInner);
            if (!tokensOnPosition.some((entry) => entry.playerId === playerId)) {
                tokensOnPosition = [...tokensOnPosition, { token, playerId }];
            }
            const total = Math.max(tokensOnPosition.length, 1);
            const offset = this.getTokenOffset(playerId, stepPosition, isInner, tokensOnPosition);
            const targetX = baseCoords.x + offset.x - 16;
            const targetY = baseCoords.y + offset.y - 16;

            this.animateTokenMovement(token, currentX, currentY, targetX, targetY);

            this._debug(`Шаг ${stepIndex + 1}/${steps.length}`, {
                stepPosition,
                offset
            });

            this.handleTokenCollisions(stepPosition, isInner);

            stepIndex += 1;
            setTimeout(moveToNextStep, 200);
        };
        
        // Начинаем движение
        moveToNextStep();
    }
    
    /**
     * Анимация движения фишки
     */
    animateTokenMovement(token, fromX, fromY, toX, toY) {
        // Добавляем класс для анимации
        token.classList.add('moving');
        
        // Создаем keyframes для анимации
        const keyframes = [
            { 
                left: `${fromX}px`, 
                top: `${fromY}px`,
                transform: 'scale(1)'
            },
            { 
                left: `${(fromX + toX) / 2}px`, 
                top: `${(fromY + toY) / 2}px`,
                transform: 'scale(1.2)'
            },
            { 
                left: `${toX}px`, 
                top: `${toY}px`,
                transform: 'scale(1)'
            }
        ];
        
        // Выполняем анимацию
        token.animate(keyframes, {
            duration: 800,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
        }).onfinish = () => {
            // Устанавливаем финальную позицию
            token.style.left = `${toX}px`;
            token.style.top = `${toY}px`;
            
            // Убираем класс анимации
            token.classList.remove('moving');
        };
    }
    
    /**
     * Анимация появления фишки
     */
    animateTokenAppearance(token) {
        // Убеждаемся, что размер установлен перед анимацией
        if (!token.style.width || token.style.width === '0px') {
            token.style.width = '32px';
            token.style.height = '32px';
            token.style.minWidth = '32px';
            token.style.minHeight = '32px';
        }
        
        // Убеждаемся, что фишка видна ДО анимации
        token.style.opacity = '1';
        token.style.visibility = 'visible';
        token.style.display = 'flex';
        
        const keyframes = [
            { 
                opacity: '1',
                transform: 'scale(0) rotate(0deg)'
            },
            { 
                opacity: '1',
                transform: 'scale(1.2) rotate(180deg)'
            },
            { 
                opacity: '1',
                transform: 'scale(1) rotate(360deg)'
            }
        ];
        
        const animation = token.animate(keyframes, {
            duration: 400,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            fill: 'forwards'
        });
        
        // Убеждаемся, что после анимации opacity = 1 и размер сохранен
        animation.onfinish = () => {
            token.style.opacity = '1';
            token.style.visibility = 'visible';
            token.style.display = 'flex';
            token.style.width = '32px';
            token.style.height = '32px';
            token.style.minWidth = '32px';
            token.style.minHeight = '32px';
            this._debug('Анимация фишки завершена, стили установлены', {
                playerId: token.dataset.playerId,
                opacity: token.style.opacity,
                visibility: token.style.visibility
            });
        };
        animation.onfinish = () => {
            token.style.opacity = '1';
            token.style.width = '32px';
            token.style.height = '32px';
            token.style.minWidth = '32px';
            token.style.minHeight = '32px';
            
            // Дополнительная проверка после анимации
            requestAnimationFrame(() => {
                const rect = token.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    this._warn('⚠️ Фишка имеет нулевой размер после анимации!', {
                        playerId: token.dataset.playerId,
                        rect: { width: rect.width, height: rect.height }
                    });
                    // Принудительно устанавливаем размер еще раз
                    token.style.width = '32px';
                    token.style.height = '32px';
                    token.style.minWidth = '32px';
                    token.style.minHeight = '32px';
                }
            });
        };
    }
    
    /**
     * Обновление всех фишек
     */
    updateTokens(players) {
        // Проверяем, изменились ли данные (простая проверка по хешу)
        if (!Array.isArray(players) || players.length === 0) {
            return;
        }
        
        const playersHash = JSON.stringify(players.map(p => ({ id: p.id, position: p.position })));
        if (this._lastPlayersHash === playersHash && this._hasUpdatedTokens) {
            this._debug('Данные игроков не изменились, пропускаем updateTokens');
            return;
        }
        
        // Для первого обновления выполняем немедленно, для последующих - debounce
        const isFirstUpdate = !this._hasUpdatedTokens;
        
        if (this._updateTokensTimer) {
            clearTimeout(this._updateTokensTimer);
        }
        
        if (isFirstUpdate) {
            // Первое обновление выполняем немедленно
            this._updateTokensInternal(players);
        } else {
            // Последующие обновления - с увеличенным debounce для снижения нагрузки
            this._updateTokensTimer = setTimeout(() => {
                this._updateTokensInternal(players);
            }, this._updateTokensDebounceDelay || 500); // Увеличено до 500ms для снижения нагрузки
        }
    }
    
    _updateTokensInternal(players) {
        this._updateTokensTimer = null;
        this._hasUpdatedTokens = true;
        this._debug('updateTokens вызван', { playersCount: players?.length || 0 });
        
        const normalized = this.normalizePlayers(players);
        if (!normalized.length) {
            this._warn('Нет нормализованных игроков для отображения фишек');
            this.clearTokens();
            return;
        }
        
        this._debug('Нормализовано игроков', normalized.length);
        this.stopInitialRenderWatcher();
        
        const grouped = this.groupPlayersByPosition(normalized);
        const groupedArray = Array.isArray(grouped) ? grouped : Array.from(grouped.values());
        this._debug('Группировка игроков по позициям', { groups: groupedArray.length });
        
        if (groupedArray.length === 0) {
            this._warn('Нет групп игроков для отображения');
            return;
        }
        
        const processed = new Set();
        let tokensCreated = 0;
        let tokensSkipped = 0;
        
        groupedArray.forEach(({ position, isInner, players: playersAtPosition }) => {
            const trackElement = this.getTrackElement(isInner);
            if (!trackElement) {
                this._warn(`Трек не найден: ${isInner ? this.innerTrackSelector : this.outerTrackSelector}`, {
                    innerSelector: this.innerTrackSelector,
                    outerSelector: this.outerTrackSelector,
                    isInner
                });
                tokensSkipped += playersAtPosition.length;
                return;
            }

            const baseCoords = this.getCellBaseCoordinates(position, isInner);
            if (!baseCoords) {
                this._warn('Не удалось вычислить координаты клетки', { 
                    position, 
                    isInner,
                    hasTrackElement: !!trackElement,
                    trackSelector: isInner ? this.innerTrackSelector : this.outerTrackSelector
                });
                // Пробуем обновить координаты через небольшую задержку
                setTimeout(() => {
                    const retryCoords = this.getCellBaseCoordinates(position, isInner);
                    if (retryCoords) {
                        this._info('Координаты получены при повторной попытке', { position, isInner });
                        playersAtPosition.forEach((player, index) => {
                            const token = this.ensureToken(player, index, playersAtPosition.length, trackElement);
                            if (token) {
                                const offset = this.calculateOffset(index, playersAtPosition.length);
                                this.positionTokenElement(token, retryCoords, offset, playersAtPosition.length);
                                processed.add(player.id);
                                tokensCreated++;
                            }
                        });
                    } else {
                        this._warn('Координаты все еще недоступны после повторной попытки', { position, isInner });
                    }
                }, 500);
                tokensSkipped += playersAtPosition.length;
                return;
            }
            
            playersAtPosition.forEach((player, index) => {
                const token = this.ensureToken(player, index, playersAtPosition.length, trackElement);
                if (token) {
                    // Проверяем, что фишка все еще в DOM перед позиционированием
                    if (!token.isConnected || !token.parentElement) {
                        this._warn('Фишка потеряла связь с DOM после ensureToken, пересоздаем', {
                            player: player.username,
                            position,
                            isInner
                        });
                        // Удаляем фишку из кэша и пересоздаем
                        this.tokens.delete(player.id);
                        if (token.parentNode) {
                            token.parentNode.removeChild(token);
                        }
                        // Пробуем создать заново
                        const newToken = this.ensureToken(player, index, playersAtPosition.length, trackElement);
                        if (newToken && newToken.isConnected && newToken.parentElement) {
                            const offset = this.calculateOffset(index, playersAtPosition.length);
                            this.positionTokenElement(newToken, baseCoords, offset, playersAtPosition.length);
                            processed.add(player.id);
                            tokensCreated++;
                            this._info(`Фишка пересоздана для игрока ${player.username}`, { 
                                position, 
                                isInner, 
                                offset,
                                coords: baseCoords
                            });
                        } else {
                            this._warn('Не удалось пересоздать фишку', { player: player.username, position });
                            tokensSkipped++;
                        }
                    } else {
                const offset = this.calculateOffset(index, playersAtPosition.length);
                this.positionTokenElement(token, baseCoords, offset, playersAtPosition.length);
                processed.add(player.id);
                        tokensCreated++;
                        this._info(`Фишка создана для игрока ${player.username}`, { 
                            position, 
                            isInner, 
                            offset,
                            coords: baseCoords,
                            tokenStyle: {
                                left: token.style.left,
                                top: token.style.top,
                                zIndex: token.style.zIndex
                            }
                        });
                    }
                } else {
                    this._warn('Не удалось создать фишку', { player: player.username, position });
                    tokensSkipped++;
                }
            });
        });
        
        this._debug('Фишки обработаны', { created: tokensCreated, skipped: tokensSkipped, total: processed.size });
        
        // Удаляем фишки игроков, которых больше нет
        // Но делаем это только если фишка действительно не обработана и не в DOM
        this.tokens.forEach((token, playerId) => {
            if (!processed.has(playerId)) {
                // Проверяем, что фишка действительно в DOM перед удалением
                if (token && token.parentNode) {
                    this._debug('Удаляем фишку игрока, которого больше нет', { playerId });
                    token.parentNode.removeChild(token);
                }
                this.tokens.delete(playerId);
            } else {
                // Проверяем, что обработанная фишка все еще в DOM
                if (token && !token.isConnected) {
                    this._warn('Обработанная фишка потеряла связь с DOM, пересоздаем', { playerId });
                    // Находим игрока и пересоздаем фишку
                    const player = normalized.find(p => p.id === playerId);
                    if (player) {
                        const isInner = player.isInner;
                        const trackElement = this.getTrackElement(isInner);
                        if (trackElement) {
                            const position = player.position;
                            const playersAtPosition = normalized.filter(p => 
                                p.position === position && p.isInner === isInner
                            );
                            const index = playersAtPosition.findIndex(p => p.id === playerId);
                            if (index >= 0) {
                                this.tokens.delete(playerId);
                                const newToken = this.ensureToken(player, index, playersAtPosition.length, trackElement);
                                if (newToken) {
                                    const baseCoords = this.getCellBaseCoordinates(position, isInner);
                                    if (baseCoords) {
                                        const offset = this.calculateOffset(index, playersAtPosition.length);
                                        this.positionTokenElement(newToken, baseCoords, offset, playersAtPosition.length);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Принудительное обновление фишек из GameState
     */
    forceUpdate() {
        // Проверяем, не выполняется ли уже обновление
        if (this._isForceUpdating || this._forceUpdateTimer) {
            this._debug('Пропускаем forceUpdate - уже выполняется или запланировано', {
                isForceUpdating: this._isForceUpdating
            });
            return;
        }
        
        // Логируем источник вызова для отладки
        const stack = new Error().stack;
        const caller = stack ? stack.split('\n')[2]?.trim() : 'unknown';
        this._debug('forceUpdate вызван', caller);
        
        // Устанавливаем флаг сразу, чтобы заблокировать параллельные вызовы
        this._isForceUpdating = true;
        
        // Дебаунсинг для предотвращения множественных одновременных вызовов
        this._forceUpdateTimer = setTimeout(() => {
            this._performForceUpdate();
            this._forceUpdateTimer = null;
            // Флаг будет сброшен в _performForceUpdate после завершения
        }, 150); // Увеличена задержка до 150мс для лучшей защиты
    }

    /**
     * Принудительное обновление фишек с приоритетом GameStateManager
     */
    forceUpdateFromGameState() {
        this._debug('Принудительное обновление из GameStateManager');
        
        // Сначала пытаемся получить данные из GameStateManager
        if (window.app && window.app.getModule) {
            const gameStateManager = window.app.getModule('gameStateManager');
            if (gameStateManager && typeof gameStateManager.getState === 'function') {
                const state = gameStateManager.getState();
                if (state && state.players && state.players.length > 0) {
                    this._info('Получены данные из GameStateManager, обновляем фишки', state.players.length);
                    this.updateTokens(state.players);
                    return;
                } else {
                    this._warn('GameStateManager не содержит игроков', { hasState: !!state, playersCount: state?.players?.length || 0 });
                }
            } else {
                this._warn('GameStateManager не найден или не имеет метода getState');
            }
        }
        
        // Пробуем получить из gameState напрямую
        if (this.gameState && this.gameState.players && this.gameState.players.length > 0) {
            this._info('Получены данные из gameState, обновляем фишки', this.gameState.players.length);
            this.updateTokens(this.gameState.players);
            return;
        }
        
        // Если ничего не помогло, используем обычный forceUpdate
        this._warn('Не удалось получить данные игроков, используем forceUpdate');
        this.forceUpdate();
    }

    /**
     * Принудительное создание фишек для всех игроков
     */
    forceCreateTokens() {
        this._info('Принудительное создание фишек');
        
        // Получаем данные игроков
        const players = this.getPlayers();
        if (!players || players.length === 0) {
            this._warn('Нет игроков для создания фишек');
            return;
        }
        
        this._info('Создаем фишки для игроков', players.length);
        
        // Очищаем существующие фишки
        this.clearTokens();
        
        // Создаем фишки для каждого игрока
        this.renderTokens(players);
    }
    
    /**
     * Внутренний метод для выполнения принудительного обновления
     */
    _performForceUpdate() {
        // Флаг уже установлен в forceUpdate(), поэтому просто выполняем логику
        try {
            this._debug('Принудительное обновление фишек');
            const players = this.getPlayers();
            
            if (players && players.length > 0) {
                this._debug('Обновляем фишки для игроков', players.length);
                this.updateTokens(players);
            } else {
                this._debug('Игроки не найдены, пытаемся загрузить данные');
                
                // Пытаемся получить данные из GameStateManager принудительно
                if (window.app && window.app.getModule) {
                    const gameStateManager = window.app.getModule('gameStateManager');
                    if (gameStateManager && typeof gameStateManager.forceUpdate === 'function') {
                        this._debug('Запускаем forceUpdate GameStateManager');
                        gameStateManager.forceUpdate();
                        
                        // Повторяем попытку через небольшую задержку
                        setTimeout(() => {
                            const updatedPlayers = this.getPlayers();
                            if (updatedPlayers && updatedPlayers.length > 0) {
                                this._debug('Фишки восстановлены после forceUpdate', updatedPlayers.length);
                                this.updateTokens(updatedPlayers);
                            }
                        }, 500);
                    }
                }
            }
        } finally {
            // Всегда сбрасываем флаг после завершения всех операций
            setTimeout(() => {
                this._isForceUpdating = false;
            }, 50); // Небольшая задержка для завершения всех операций
        }
    }
    
    /**
     * Обновление позиций всех фишек с учетом коллизий
     */
    scheduleTokenPositionRefresh() {
        const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : null;
        if (typeof raf !== 'function') {
            this.updateAllTokenPositions();
            return;
        }
        if (this._pendingPositionRefresh) {
            cancelAnimationFrame(this._pendingPositionRefresh);
        }
        this._pendingPositionRefresh = raf(() => {
            this._pendingPositionRefresh = null;
            this.updateAllTokenPositions();
        });
    }

    updateAllTokenPositions() {
        this._debug('Обновление всех позиций фишек с учетом коллизий');
        
        // Группируем фишки по позициям
        const positionGroups = new Map();
        
        this.tokens.forEach((token, playerId) => {
            const position = parseInt(token.getAttribute('data-position')) || 0;
            const isInner = token.classList.contains('inner-track');
            const key = `${position}-${isInner}`;
            
            if (!positionGroups.has(key)) {
                positionGroups.set(key, { position, isInner, tokens: [] });
            }
            
            positionGroups.get(key).tokens.push({ token, playerId });
        });
        
        // Обновляем позиции для каждой группы
        positionGroups.forEach(({ position, isInner, tokens }) => {
            if (!tokens.length) {
                return;
            }
            const baseCoords = this.getCellBaseCoordinates(position, isInner);
            if (!baseCoords) {
                this._debug('Не удалось обновить позицию токенов — нет координат клетки', { position, isInner });
                return;
            }
            const total = tokens.length;
            tokens.forEach(({ token, playerId }, index) => {
                const offset = this.calculateOffset(index, total);
                this.positionTokenElement(token, baseCoords, offset, total);
                this._debug(`Фишка ${playerId} обновлена при массовом позиционировании`, {
                    position,
                    offset
                });
            });
        });
    }

    /**
     * Нормализация списка игроков (уникальные идентификаторы, позиции)
     */
    normalizePlayers(players = []) {
        const result = [];
        const seen = new Set();
        const source = Array.isArray(players) ? players : [];
        
        source.forEach((player, idx) => {
            if (!player) {
                return;
            }
            const key = player.id || player.userId || player.username || `player_${idx}`;
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            result.push({
                ...player,
                id: player.id || player.userId || key,
                position: Number(player.position) || 0,
                isInner: Boolean(player.isInner),
                token: player.token || this.getDefaultTokenForPlayer(player, idx)
            });
        });
        
        return result;
    }

    /**
     * Группировка игроков по позиции и треку
     */
    groupPlayersByPosition(players) {
        const groups = new Map();
        players.forEach(player => {
            const groupKey = `${player.position}|${player.isInner ? 'inner' : 'outer'}`;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    position: player.position,
                    isInner: player.isInner,
                    players: []
                });
            }
            groups.get(groupKey).players.push(player);
        });
        return groups;
    }

    /**
     * Создает или обновляет фишку игрока и возвращает DOM-элемент
     */
    ensureToken(player, index, totalPlayers, trackElement) {
        let token = this.tokens.get(player.id);
        
        // Проверяем, что существующая фишка все еще в DOM
        if (token && (!token.isConnected || !token.parentElement)) {
            this._warn('Фишка найдена в кэше, но не в DOM, пересоздаем', {
                player: player.username,
                playerId: player.id,
                tokenInDOM: token.isConnected,
                hasParent: !!token.parentElement
            });
            // Удаляем старую фишку из кэша
            this.tokens.delete(player.id);
            token = null;
        }
        
        if (!token) {
            token = this.createPlayerToken(player, index, totalPlayers);
            if (!trackElement) {
                this._warn('ensureToken: trackElement is null', { player: player.username, isInner: player.isInner });
                return null;
            }
            trackElement.appendChild(token);
            this._info('Фишка добавлена в DOM', {
                player: player.username,
                position: player.position,
                isInner: player.isInner,
                trackElement: trackElement.tagName,
                trackElementId: trackElement.id,
                tokenInDOM: token.isConnected,
                tokenParent: token.parentElement?.tagName
            });
            this.tokens.set(player.id, token);
            
            // Принудительно устанавливаем стили для видимости ДО анимации с !important
            token.style.setProperty('display', 'flex', 'important');
            token.style.setProperty('visibility', 'visible', 'important');
            token.style.setProperty('width', '32px', 'important');
            token.style.setProperty('height', '32px', 'important');
            token.style.setProperty('min-width', '32px', 'important');
            token.style.setProperty('min-height', '32px', 'important');
            token.style.setProperty('opacity', '1', 'important'); // Устанавливаем opacity: 1 ДО анимации
            token.style.setProperty('position', 'absolute', 'important');
            token.style.setProperty('z-index', '10000', 'important');
            
            // Дополнительно через обычные свойства
            token.style.display = 'flex';
            token.style.visibility = 'visible';
            token.style.width = '32px';
            token.style.height = '32px';
            token.style.minWidth = '32px';
            token.style.minHeight = '32px';
            token.style.opacity = '1';
            token.style.position = 'absolute';
            token.style.zIndex = '10000';
            
            // Проверяем, что фишка действительно в DOM
            if (!token.isConnected) {
                this._warn('⚠️ Фишка не подключена к DOM после appendChild!', {
                    player: player.username,
                    hasParent: !!token.parentElement
                });
            }
            
            // Используем requestAnimationFrame для гарантии, что стили применены перед анимацией
            requestAnimationFrame(() => {
                // Проверяем размер после рендера
                const rect = token.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    // Принудительно устанавливаем размер еще раз
                    token.style.width = '32px';
                    token.style.height = '32px';
                    token.style.minWidth = '32px';
                    token.style.minHeight = '32px';
                    this._warn('⚠️ Фишка имела нулевой размер после рендера, исправлено', {
                        player: player.username,
                        rect: { width: rect.width, height: rect.height }
                    });
                }
                
                // Запускаем анимацию только после того, как размер установлен
            this.animateTokenAppearance(token);
            });
        } else {
            // Фишка уже существует и в DOM, обновляем её данные
            token.dataset.position = player.position;
            token.dataset.playerName = player.username;
             token.dataset.isInner = String(Boolean(player.isInner));
            token.classList.toggle('inner', !!player.isInner);
            token.classList.toggle('outer', !player.isInner);
            token.classList.toggle('inner-track', !!player.isInner);
            token.classList.toggle('outer-track', !player.isInner);
            token.textContent = this.getTokenIcon(player.token);
            token.title = `${player.username} - $${player.money || 0}`;
        }
        return token;
    }

    /**
     * Позиционирование фишки с учётом смещения
     */
    positionTokenElement(token, baseCoords, offset, totalPlayers = 1) {
        if (!token) {
            this._warn('positionTokenElement: token is null');
            return;
        }
        if (!baseCoords || !Number.isFinite(baseCoords.x) || !Number.isFinite(baseCoords.y)) {
            this._warn('positionTokenElement: invalid baseCoords', { baseCoords, offset });
            return;
        }
        
        const halfSize = 16; // половина ширины/высоты токена
        const left = baseCoords.x + offset.x - halfSize;
        const top = baseCoords.y + offset.y - halfSize;
        
        // Убеждаемся, что фишка имеет родителя перед позиционированием
        if (!token.parentElement) {
            this._debug('Фишка потеряла родителя перед позиционированием, пытаемся восстановить', {
                playerId: token.dataset.playerId,
                position: token.dataset.position,
                isInner: token.dataset.isInner
            });
            
            // Пытаемся найти правильный трек и добавить фишку туда
            const isInner = token.dataset.isInner === 'true';
            const trackElement = this.getTrackElement(isInner);
            if (trackElement) {
                trackElement.appendChild(token);
                this._debug('Фишка восстановлена в DOM', {
                    playerId: token.dataset.playerId,
                    trackElementId: trackElement.id
                });
            } else {
                this._warn('Не удалось найти трек для восстановления фишки', {
                    playerId: token.dataset.playerId,
                    isInner
                });
                return;
            }
        }
        
        // Убеждаемся, что родительский элемент имеет правильный position для абсолютного позиционирования
        const parentElement = token.parentElement;
        if (parentElement) {
            const parentPosition = window.getComputedStyle(parentElement).position;
            if (parentPosition === 'static') {
                // Устанавливаем position: relative для родителя, если он static
                parentElement.style.position = 'relative';
                this._debug('Установлен position: relative для родительского элемента трека', {
                    parentId: parentElement.id,
                    parentTag: parentElement.tagName
                });
            }
        }
        
        // Принудительно устанавливаем все стили с !important через setProperty
        token.style.setProperty('position', 'absolute', 'important');
        token.style.setProperty('left', `${left}px`, 'important');
        token.style.setProperty('top', `${top}px`, 'important');
        token.style.setProperty('width', '32px', 'important');
        token.style.setProperty('height', '32px', 'important');
        token.style.setProperty('min-width', '32px', 'important');
        token.style.setProperty('min-height', '32px', 'important');
        token.style.setProperty('z-index', '10000', 'important');
        token.style.setProperty('display', 'flex', 'important');
        token.style.setProperty('visibility', 'visible', 'important');
        token.style.setProperty('opacity', '1', 'important');
        token.style.setProperty('pointer-events', 'auto', 'important');
        
        // Дополнительно устанавливаем через обычные свойства для совместимости
        token.style.position = 'absolute';
        token.style.left = `${left}px`;
        token.style.top = `${top}px`;
        token.style.width = '32px';
        token.style.height = '32px';
        token.style.minWidth = '32px';
        token.style.minHeight = '32px';
        token.style.zIndex = '10000';
        token.style.display = 'flex';
        token.style.visibility = 'visible';
        token.style.opacity = '1';
        token.style.pointerEvents = 'auto';
        
        // ОПТИМИЗАЦИЯ: Минимизируем дорогие операции getBoundingClientRect() и getComputedStyle()
        // Эти операции вызывают reflow/repaint и очень дорогие
        // Выполняем валидацию только периодически, а не при каждом позиционировании
        if (this._validationCounter === undefined) {
            this._validationCounter = 0;
        }
        this._validationCounter++;
        
        // Валидация только каждые 20 позиционирований (снижает нагрузку в 20 раз)
        if (this._validationCounter % 20 === 0) {
            const tokenRect = token.getBoundingClientRect();
            
            // Проверяем только критичные проблемы
            if (tokenRect.width === 0 || tokenRect.height === 0) {
                token.style.width = '32px';
                token.style.height = '32px';
                token.style.minWidth = '32px';
                token.style.minHeight = '32px';
            }
            
            // Проверяем координаты только если они явно выходят за пределы
            if (left < -1000 || left > 10000 || top < -1000 || top > 10000) {
                this._warn('⚠️ Фишка имеет подозрительные координаты!', {
                    playerId: token.dataset.playerId,
                    finalPosition: { left, top }
                });
            }
        }
        
        // ОПТИМИЗАЦИЯ: Убрано избыточное логирование и дорогие проверки
        // Логирование только при реальных проблемах (уже проверено выше)
        
        // Добавляем визуальную индикацию для множественных фишек
        if (totalPlayers > 1) {
            token.style.zIndex = 2000 + Math.abs(offset.x + offset.y); /* Фишки поверх */
            token.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.4)';
            token.style.border = '2px solid rgba(255, 255, 255, 0.6)';
        } else {
            token.style.zIndex = '2000'; /* Базовый z-index */
            token.style.boxShadow = '';
            token.style.border = '';
        }
    }

    _log(level, message, meta) {
        const logger = this.logger;
        if (logger && typeof logger[level] === 'function') {
            try {
                logger[level](message, meta ?? null, 'PlayerTokens');
                return;
            } catch (error) {
                console.warn('[PlayerTokens] Ошибка при логировании через logger', error);
            }
        }
        const consoleFn = console[level] || console.log;
        if (meta !== undefined) {
            consoleFn(`[PlayerTokens] ${message}`, meta);
        } else {
            consoleFn(`[PlayerTokens] ${message}`);
        }
    }

    _debug(message, meta) {
        if (!this.debugEnabled) {
            return;
        }
        this._log('debug', message, meta);
    }

    _info(message, meta) {
        this._log('info', message, meta);
    }

    _warn(message, meta) {
        this._log('warn', message, meta);
    }

    _error(message, meta) {
        this._log('error', message, meta);
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        if (this._forceUpdateTimer) {
            clearTimeout(this._forceUpdateTimer);
            this._forceUpdateTimer = null;
        }
        this.stopInitialRenderWatcher();
        // Сбрасываем флаг обновления
        this._isForceUpdating = false;
        
        // Очищаем коллекции
        this.tokens.clear();
        this.animatingTokens.clear();
        
        this._debug('Ресурсы очищены');
    }
    
    startInitialRenderWatcher() {
        this.stopInitialRenderWatcher();
        this._initialRenderAttempts = 0;
        
        // Увеличиваем интервал до 2000ms для снижения нагрузки
        this._initialRenderTimer = setInterval(() => {
            this._initialRenderAttempts += 1;
            
            // Дополнительная проверка, что таймер не был остановлен
            if (!this._initialRenderTimer) {
                return;
            }
            
            const players = this.getPlayers();
            if (Array.isArray(players) && players.length) {
                this.updateTokens(players);
                this.stopInitialRenderWatcher();
                return;
            }
            
            // Останавливаем после максимального количества попыток
            if (this._initialRenderAttempts >= this._maxInitialRenderAttempts) {
                this._debug('Достигнуто максимальное количество попыток начального рендера');
                this.stopInitialRenderWatcher();
            }
        }, 2000); // Увеличено до 2000ms для снижения нагрузки
    }
    
    stopInitialRenderWatcher() {
        if (this._initialRenderTimer) {
            clearInterval(this._initialRenderTimer);
            this._initialRenderTimer = null;
        }
    }
    
    /**
     * Очистка ресурсов и отписка от событий
     */
    destroy() {
        this._info('Уничтожение PlayerTokens, очистка ресурсов...');
        
        // Останавливаем все таймеры
        this.stopInitialRenderWatcher();
        if (this._updateTokensTimer) {
            clearTimeout(this._updateTokensTimer);
            this._updateTokensTimer = null;
        }
        if (this._forceUpdateTimer) {
            clearTimeout(this._forceUpdateTimer);
            this._forceUpdateTimer = null;
        }
        
        // Отписываемся от событий
        this._unsubscribeGameStateManager();
        this._unsubscribeEventBus();
        
        // Очищаем кэш
        this._eventHandlers.clear();
        this._lastPlayersHash = null;
        this._hasUpdatedTokens = false;
        
        this._info('PlayerTokens уничтожен, ресурсы очищены');
    }
}

if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('🎯 PlayerTokens: Класс определен, экспортируем в window...');
}
window.PlayerTokens = PlayerTokens;
if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('🎯 PlayerTokens: Экспорт завершен, window.PlayerTokens =', !!window.PlayerTokens);
}
