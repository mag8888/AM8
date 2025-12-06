/**
 * PlayerTokens v2.0.0
 * Компонент для отображения фишек игроков на игровом поле
 */
if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('🎲 PlayerTokens: Файл загружается...');
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
        
        // Принудительно получаем игроков из GameStateManager при инициализации
        setTimeout(() => {
            const gameStateManager = window.app?.getModule?.('gameStateManager');
            if (gameStateManager) {
                const state = gameStateManager.getState();
                if (state && state.players && Array.isArray(state.players) && state.players.length > 0) {
                    this._info('Принудительное обновление фишек при инициализации', { playersCount: state.players.length });
                    this.updateTokens(state.players);
                }
            }
        }, 300);
        
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
                // Если игроков нет, но фишки должны быть видны, не очищаем их сразу
                return;
            }
            
            // Проверяем, изменились ли данные (простая проверка по хешу)
            const playersHash = JSON.stringify(players.map(p => ({ id: p.id, position: p.position, isInner: p.isInner })));
            if (this._lastPlayersHash === playersHash && this._hasUpdatedTokens) {
                this._debug('Данные игроков не изменились, пропускаем обновление');
                // Но если фишки еще не были отображены, принудительно обновляем
                if (!this._hasUpdatedTokens || this.tokens.size === 0) {
                    this._info('Принудительное обновление: фишки еще не отображены', { playersCount: players.length });
                    this.updateTokens(players);
                }
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
                z-index: 50000 !important;
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
        let boardLayout = this.boardLayout || this._resolveBoardLayout();
        
        // Если boardLayout не найден, пытаемся подождать и повторить попытку
        if (!boardLayout || typeof boardLayout.getCellCenter !== 'function') {
            // Попытка повторного поиска с небольшой задержкой
            if (!this._boardLayoutRetryAttempts) {
                this._boardLayoutRetryAttempts = 0;
            }
            if (this._boardLayoutRetryAttempts < 3) {
                this._boardLayoutRetryAttempts++;
                this._warn(`⚠️ boardLayout не найден, попытка ${this._boardLayoutRetryAttempts}/3`, { 
                    hasBoardLayout: !!boardLayout,
                    boardLayoutType: typeof boardLayout,
                    hasWindowApp: !!window?.app,
                    hasWindowBoardLayout: !!window?.boardLayout
                });
                // Небольшая задержка и повторная попытка
                setTimeout(() => {
                    boardLayout = this.boardLayout || this._resolveBoardLayout();
                    if (boardLayout && typeof boardLayout.getCellCenter === 'function') {
                        this._info('✅ boardLayout найден после повторной попытки');
                        this._boardLayoutRetryAttempts = 0;
                    }
                }, 100 * this._boardLayoutRetryAttempts);
            } else {
                this._warn('❌ boardLayout не найден после всех попыток, используем DOM', { 
                    hasBoardLayout: !!boardLayout,
                    boardLayoutType: typeof boardLayout
                });
            }
        } else {
            // Сбрасываем счетчик при успешном поиске
            this._boardLayoutRetryAttempts = 0;
        }
        
        if (boardLayout && typeof boardLayout.getCellCenter === 'function') {
            const center = boardLayout.getCellCenter(position, isInner);
            this._info('📊 boardLayout.getCellCenter вернул', { position, isInner, center, centerType: typeof center });
            if (center && typeof center === 'object' && Number.isFinite(center.x) && Number.isFinite(center.y)) {
                // КРИТИЧНО: BoardLayout.getCellCenter использует offsetLeft/offsetTop, которые НЕ учитывают
                // трансформации родителя (transform: translate(-50%, -50%)). Поэтому мы всегда вычисляем
                // координаты напрямую из DOM для точности.
                // Пропускаем координаты из boardLayout и вычисляем из DOM
                this._info('⚠️ Координаты из boardLayout получены, но вычисляем из DOM для учета трансформаций', { 
                    center, 
                    position, 
                    isInner,
                    note: 'BoardLayout использует offsetLeft/offsetTop, который не учитывает transform родителя'
                });
                // Продолжаем вычисление из DOM
            } else {
                // Проверяем, может быть center это массив или объект без x/y
                if (center && typeof center === 'object') {
                    // Если это объект, но нет x/y, возможно это другой формат
                    if ('x' in center && 'y' in center) {
                        // Есть x и y, но они не Number.isFinite - возможно NaN или Infinity
                        this._warn('❌ boardLayout.getCellCenter вернул координаты с NaN/Infinity, вычисляем из DOM', { 
                            center, 
                            position, 
                            isInner,
                            x: center.x,
                            y: center.y
                        });
                    } else {
                        this._warn('❌ boardLayout.getCellCenter вернул объект без x/y, вычисляем из DOM', { 
                            center, 
                            position, 
                            isInner,
                            centerKeys: Object.keys(center || {})
                        });
                    }
                } else {
                    this._warn('❌ boardLayout.getCellCenter вернул невалидные координаты, вычисляем из DOM', { 
                        center, 
                        position, 
                        isInner,
                        centerType: typeof center
                    });
                }
                // Продолжаем вычисление из DOM
        }
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

        // КРИТИЧНО: Используем getBoundingClientRect для вычисления координат относительно trackElement
        // Это более надежно, так как учитывает все трансформации родителя (включая transform: translate(-50%, -50%))
        const cellRect = cell.getBoundingClientRect();
        const trackRect = trackElement.getBoundingClientRect();
        
        // Вычисляем координаты центра клетки относительно trackElement
        // Координаты из getBoundingClientRect() - это координаты относительно viewport
        // Вычитаем позицию trackElement, чтобы получить координаты относительно него
        const cellCenterX = cellRect.left + (cellRect.width / 2);
        const cellCenterY = cellRect.top + (cellRect.height / 2);
        
        // Координаты относительно trackElement (вычитаем позицию trackElement)
        let coords = {
            x: cellCenterX - trackRect.left,
            y: cellCenterY - trackRect.top,
            width: cellRect.width,
            height: cellRect.height
        };
        
        // Проверяем, что координаты валидны
        if (!Number.isFinite(coords.x) || !Number.isFinite(coords.y) || 
            Math.abs(coords.x) > 10000 || Math.abs(coords.y) > 10000) {
            // Fallback: используем offsetLeft/offsetTop (но это может быть неточно из-за трансформаций)
            const offsetLeft = cell.offsetLeft || 0;
            const offsetTop = cell.offsetTop || 0;
            const cellWidth = cellRect.width || 50;
            const cellHeight = cellRect.height || 50;
            
            this._warn('Координаты из getBoundingClientRect невалидные или слишком большие, используем offsetLeft/offsetTop', {
                position,
                isInner,
                coords,
                offsetLeft,
                offsetTop,
                cellWidth,
                cellHeight,
                cellRect: { left: cellRect.left, top: cellRect.top, width: cellRect.width, height: cellRect.height },
                trackRect: { left: trackRect.left, top: trackRect.top, width: trackRect.width, height: trackRect.height }
            });
            
            coords.x = offsetLeft + (cellWidth / 2);
            coords.y = offsetTop + (cellHeight / 2);
        }
        
        // Дополнительная проверка валидности
        if (!Number.isFinite(coords.x) || !Number.isFinite(coords.y)) {
            this._warn('Координаты все еще невалидные после fallback', {
                position,
                isInner,
                coords
            });
            return null;
        }
        
        // Логируем для отладки
        this._debug('Координаты вычислены из DOM через getBoundingClientRect', {
            position,
            isInner,
            coords,
            cellRect: { left: cellRect.left, top: cellRect.top, width: cellRect.width, height: cellRect.height },
            trackRect: { left: trackRect.left, top: trackRect.top, width: trackRect.width, height: trackRect.height },
            relativeCoords: { x: coords.x, y: coords.y }
        });
        
        // Логируем координаты для отладки
        this._debug('Координаты вычислены из DOM', {
            coords,
            cellRect: { width: coords.width, height: coords.height },
            trackElementId: trackElement.id,
            position,
            isInner
        });
        
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
                hasCellCenters: !!(isInner ? this.cellCenters.inner : this.cellCenters.outer),
                trackElement: this.getTrackElement(isInner)?.id
            });
            return null;
        }
        
        // Проверяем, что координаты валидны
        if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
            this._warn('getCellBaseCoordinates: координаты невалидны', {
                position,
                isInner,
                center,
                x: center.x,
                y: center.y
            });
            return null;
        }
        
        // BoardLayout.getCellCenter возвращает координаты ЦЕНТРА клетки (x, y - это центр)
        // НЕ нужно вычитать tokenSize/2 здесь - это будет сделано в positionTokenElement
        // Включаем width и height из center, если они есть
        const result = {
            x: center.x,  // Это уже центр клетки
            y: center.y,  // Это уже центр клетки
            width: center.width || 50,
            height: center.height || 50
        };
        
        this._info('✅ getCellBaseCoordinates: координаты получены', { 
            position, 
            isInner, 
            result,
            note: 'Координаты - это центр клетки, tokenSize/2 будет вычтен в positionTokenElement'
        });
        return result;
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
     * Использует реальную позицию игрока из данных
     */
    createPlayerToken(player, index, totalPlayers) {
        const token = document.createElement('div');
        token.className = 'player-token';
        
        // Используем реальную позицию игрока из данных, или 0 по умолчанию
        const cellPosition = Number.isFinite(Number(player.position)) ? Number(player.position) : 0;
        const isInnerTrack = typeof player.isInner === 'boolean' ? player.isInner : false;
        
        token.classList.add(isInnerTrack ? 'inner' : 'outer');
        token.classList.toggle('inner-track', isInnerTrack);
        token.classList.toggle('outer-track', !isInnerTrack);
        token.dataset.playerId = player.id;
        token.dataset.playerName = player.username;
        token.setAttribute('data-position', cellPosition); // Используем реальную позицию игрока
        token.dataset.isInner = String(isInnerTrack);
        token.dataset.cellNumber = String(cellPosition + 1); // Номер клетки для отображения (позиция + 1)
        
        // Устанавливаем все стили сразу при создании с !important - улучшенная версия
        token.style.setProperty('position', 'absolute', 'important');
        token.style.setProperty('display', 'flex', 'important');
        token.style.setProperty('visibility', 'visible', 'important');
        token.style.setProperty('opacity', '1', 'important');
        token.style.setProperty('z-index', '99999', 'important'); // Максимальный z-index
        token.style.setProperty('width', '36px', 'important'); // Увеличено с 32px до 36px
        token.style.setProperty('height', '36px', 'important');
        token.style.setProperty('min-width', '36px', 'important');
        token.style.setProperty('min-height', '36px', 'important');
        token.style.setProperty('max-width', '36px', 'important');
        token.style.setProperty('max-height', '36px', 'important');
        token.style.setProperty('pointer-events', 'auto', 'important');
        token.style.setProperty('align-items', 'center', 'important');
        token.style.setProperty('justify-content', 'center', 'important');
        token.style.setProperty('border-radius', '50%', 'important');
        token.style.setProperty('background', 'white', 'important');
        token.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)', 'important');
        token.style.setProperty('transform', 'translateZ(0)', 'important'); // Аппаратное ускорение
        token.style.setProperty('will-change', 'left, top, transform', 'important'); // Оптимизация анимации
        token.style.setProperty('backface-visibility', 'hidden', 'important'); // Улучшение производительности
        token.style.setProperty('font-size', '18px', 'important'); // Увеличен размер иконки
        
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
        
        const icon = tokenIcons[tokenId] || '🎲';
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
     * Расчет смещения для множественных фишек (15% от размера клетки)
     */
    calculateOffset(index, totalPlayers, cellSize = 50) {
        if (totalPlayers === 1) {
            return { x: 0, y: 0 };
        }
        
        // МАКСИМАЛЬНЫЙ сдвиг для гарантированной видимости - 60% от размера клетки
        const offsetPercent = 0.60; // Увеличено до 60% для максимального расстояния между фишками
        const offsetPx = cellSize * offsetPercent;
        
        // Конфигурация сдвига для разного количества фишек (в пикселях, рассчитанных от размера клетки)
        // Для двух фишек используем максимальный диагональный сдвиг для максимального расстояния
        const offsetConfigs = {
            2: [
                { x: -offsetPx * 0.9, y: -offsetPx * 0.6 },  // Влево-вверх (54% и 36% от клетки)
                { x: offsetPx * 0.9, y: offsetPx * 0.6 }     // Вправо-вниз (54% и 36% от клетки)
            ],
            3: [
                { x: -offsetPx, y: -offsetPx * 0.7 },  // Влево-вверх
                { x: 0, y: offsetPx * 0.7 },          // Вниз
                { x: offsetPx, y: -offsetPx * 0.7 }   // Вправо-вверх
            ],
            4: [
                { x: -offsetPx, y: -offsetPx * 0.7 },  // Влево-вверх
                { x: offsetPx, y: -offsetPx * 0.7 },    // Вправо-вверх
                { x: -offsetPx, y: offsetPx * 0.7 },   // Влево-вниз
                { x: offsetPx, y: offsetPx * 0.7 }    // Вправо-вниз
            ]
        };
        
        const config = offsetConfigs[totalPlayers] || offsetConfigs[4];
        const offset = config[index] || { x: 0, y: 0 };
        
        // Добавляем визуальную индикацию для множественных фишек
        if (totalPlayers > 1) {
            this._info(`✅ Фишка ${index + 1}/${totalPlayers} получает сдвиг 60% (${offsetPx.toFixed(1)}px)`, {
                offset,
                cellSize,
                offsetPercent: (offsetPx / cellSize * 100).toFixed(1) + '%'
            });
        }
        
        return offset;
    }

    _collectTokensOnPosition(position, isInner) {
        const result = [];
        const targetInner = Boolean(isInner);
        this.tokens.forEach((token, playerId) => {
            const tokenPosition = Number.isFinite(+token.getAttribute('data-position')) ? +token.getAttribute('data-position') : 0;
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
        const currentPosition = Number.isFinite(+token.getAttribute('data-position')) ? +token.getAttribute('data-position') : 0;
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
        const tokenIndex = tokensOnPosition.findIndex(t => t.playerId === playerId);
        this.positionTokenElement(token, baseCoords, offset, total, tokenIndex >= 0 ? tokenIndex : 0);
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
        const cellSize = Math.max(baseCoords.width || 50, baseCoords.height || 50);

        tokensOnPosition.forEach(({ token, playerId }, index) => {
            const offset = this.calculateOffset(index, total, cellSize);
            this.positionTokenElement(token, baseCoords, offset, total, index);
            this._debug(`Фишка ${playerId} сдвинута`, { position, offset });
        });
    }
    
    /**
     * Получение сдвига для фишки (15% от размера клетки)
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
        
        // Получаем размер клетки для расчета процентного сдвига
        const baseCoords = this.getCellBaseCoordinates(position, isInner);
        const cellSize = baseCoords && (baseCoords.width || baseCoords.height) ? 
            Math.max(baseCoords.width || 50, baseCoords.height || 50) : 50;
        
        // Используем calculateOffset с размером клетки
        return this.calculateOffset(currentIndex, tokensOnPosition.length, cellSize);
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
            const tokenSize = 36; // Размер фишки
            const halfSize = tokenSize / 2; // 18px
            const targetX = baseCoords.x + offset.x - halfSize;
            const targetY = baseCoords.y + offset.y - halfSize;

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
        
        // Улучшенная анимация движения с плавным переходом
        const keyframes = [
            { 
                left: `${fromX}px`, 
                top: `${fromY}px`,
                transform: 'translateZ(0) scale(1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            },
            { 
                left: `${(fromX + toX) / 2}px`, 
                top: `${(fromY + toY) / 2}px`,
                transform: 'translateZ(0) scale(1.15)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5), 0 0 0 4px rgba(99, 102, 241, 0.3)'
            },
            { 
                left: `${toX}px`, 
                top: `${toY}px`,
                transform: 'translateZ(0) scale(1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }
        ];
        
        // Выполняем анимацию с улучшенными параметрами
        const animation = token.animate(keyframes, {
            duration: 600, // Увеличена длительность для более плавного движения
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Более выразительная кривая
            fill: 'forwards'
        });
        
        animation.onfinish = () => {
            // Устанавливаем финальную позицию с !important
            token.style.setProperty('left', `${toX}px`, 'important');
            token.style.setProperty('top', `${toY}px`, 'important');
            token.style.setProperty('transform', 'translateZ(0) scale(1)', 'important');
            token.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)', 'important');
            
            // Дополнительно через обычные свойства для совместимости
            token.style.left = `${toX}px`;
            token.style.top = `${toY}px`;
            
            // Убираем класс анимации
            token.classList.remove('moving');
            
            this._debug('Анимация движения фишки завершена', {
                playerId: token.dataset.playerId,
                from: { x: fromX, y: fromY },
                to: { x: toX, y: toY }
            });
        };
    }
    
    /**
     * Анимация появления фишки
     */
    animateTokenAppearance(token) {
        // Убеждаемся, что размер установлен перед анимацией
        if (!token.style.width || token.style.width === '0px') {
            token.style.width = '36px';
            token.style.height = '36px';
            token.style.minWidth = '36px';
            token.style.minHeight = '36px';
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
            // Принудительно устанавливаем все стили с !important после анимации
            token.style.setProperty('opacity', '1', 'important');
            token.style.setProperty('visibility', 'visible', 'important');
            token.style.setProperty('display', 'flex', 'important');
            token.style.setProperty('width', '36px', 'important');
            token.style.setProperty('height', '36px', 'important');
            token.style.setProperty('min-width', '36px', 'important');
            token.style.setProperty('min-height', '36px', 'important');
            
            // Дополнительно через обычные свойства
            token.style.opacity = '1';
            token.style.visibility = 'visible';
            token.style.display = 'flex';
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
                    // Принудительно устанавливаем размер еще раз с !important
                    token.style.setProperty('width', '32px', 'important');
                    token.style.setProperty('height', '32px', 'important');
                    token.style.setProperty('min-width', '32px', 'important');
                    token.style.setProperty('min-height', '32px', 'important');
                    token.style.setProperty('opacity', '1', 'important');
                    token.style.setProperty('visibility', 'visible', 'important');
                    token.style.setProperty('display', 'flex', 'important');
                }
                this._debug('Анимация фишки завершена, стили установлены', {
                    playerId: token.dataset.playerId,
                    opacity: token.style.opacity,
                    visibility: token.style.visibility,
                    rect: { width: rect.width, height: rect.height }
                });
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
        const tokensMissing = this.tokens.size === 0;

        // Не пропускаем обновление, если фишек нет в DOM (например, первая попытка не успела из-за отсутствия координат)
        // Это исправляет проблему, когда первая попытка из-за отсутствия координат замораживала обновление
        if (this._lastPlayersHash === playersHash && this._hasUpdatedTokens && !tokensMissing) {
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
            this._updateTokensInternal(players, playersHash);
        } else {
            // Последующие обновления - с увеличенным debounce для снижения нагрузки
            this._updateTokensTimer = setTimeout(() => {
                this._updateTokensInternal(players, playersHash);
            }, this._updateTokensDebounceDelay || 500); // Увеличено до 500ms для снижения нагрузки
        }
    }
    
    _updateTokensInternal(players, playersHash) {
        this._updateTokensTimer = null;
        this._debug('updateTokens вызван', { playersCount: players?.length || 0 });
        
        const normalized = this.normalizePlayers(players);
        if (!normalized.length) {
            this._warn('Нет нормализованных игроков для отображения фишек');
            this.clearTokens();
            return;
        }
        
        this._debug('Нормализовано игроков', normalized.length);
        this.stopInitialRenderWatcher();
        
        // Сохраняем количество фишек до обновления
        const tokensBeforeUpdate = this.tokens.size;
        
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
                                const cellSize = Math.max(retryCoords.width || 50, retryCoords.height || 50);
                                const offset = this.calculateOffset(index, playersAtPosition.length, cellSize);
                                this.positionTokenElement(token, retryCoords, offset, playersAtPosition.length, index);
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
                this._info(`Обработка фишки ${index + 1}/${playersAtPosition.length} для игрока ${player.username}`, {
                    playerId: player.id,
                    position,
                    isInner,
                    index,
                    total: playersAtPosition.length
                });
                
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
                            const cellSize = Math.max(baseCoords.width || 50, baseCoords.height || 50);
                            const offset = this.calculateOffset(index, playersAtPosition.length, cellSize);
                            this.positionTokenElement(newToken, baseCoords, offset, playersAtPosition.length, index);
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
                        const cellSize = Math.max(baseCoords.width || 50, baseCoords.height || 50);
                        const offset = this.calculateOffset(index, playersAtPosition.length, cellSize);
                        this.positionTokenElement(token, baseCoords, offset, playersAtPosition.length, index);
                        processed.add(player.id);
                        tokensCreated++;
                        
                        // Проверяем, что фишка действительно видна после позиционирования
                        setTimeout(() => {
                            const rect = token.getBoundingClientRect();
                            const computedStyle = window.getComputedStyle(token);
                            
                            if (rect.width === 0 || rect.height === 0 || (rect.left === 0 && rect.top === 0 && rect.width === 0)) {
                                this._warn('⚠️ Фишка имеет нулевой размер или невидима после позиционирования, перепозиционируем', {
                                    player: player.username,
                                    position,
                                    isInner,
                                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top },
                                    coords: baseCoords,
                                    offset,
                                    computedStyle: {
                                        display: computedStyle.display,
                                        visibility: computedStyle.visibility,
                                        opacity: computedStyle.opacity,
                                        left: computedStyle.left,
                                        top: computedStyle.top
                                    }
                                });
                                // Перепозиционируем фишку с принудительной установкой стилей
                                this.positionTokenElement(token, baseCoords, offset, playersAtPosition.length, index);
                                
                                // Принудительно устанавливаем все стили еще раз
                                token.style.setProperty('display', 'flex', 'important');
                                token.style.setProperty('visibility', 'visible', 'important');
                                token.style.setProperty('opacity', '1', 'important');
                                token.style.setProperty('z-index', '99999', 'important');
                            } else {
                                this._info(`✅ Фишка видна для игрока ${player.username}`, {
                                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top }
                                });
                            }
                        }, 200);
                        
                        this._info(`Фишка создана для игрока ${player.username}`, { 
                            position, 
                            isInner, 
                            offset,
                            coords: baseCoords,
                            tokenStyle: {
                                left: token.style.left,
                                top: token.style.top,
                                zIndex: token.style.zIndex
                            },
                            inDOM: token.isConnected,
                            hasParent: !!token.parentElement
                        });
                    }
                } else {
                    this._warn('Не удалось создать фишку', { player: player.username, position });
                    tokensSkipped++;
                }
            });
        });
        
        this._debug('Фишки обработаны', { created: tokensCreated, skipped: tokensSkipped, total: processed.size });
        
        // Обновляем хеш и флаг только если фишки были успешно созданы
        // Это исправляет проблему, когда первая попытка из-за отсутствия координат замораживала обновление
        const tokensAfterUpdate = this.tokens.size;
        if (tokensAfterUpdate > tokensBeforeUpdate || tokensAfterUpdate > 0) {
            // Фишки были созданы или обновлены, можно пометить обновление как выполненное
            this._hasUpdatedTokens = true;
            if (playersHash) {
                this._lastPlayersHash = playersHash;
            }
            this._debug('Обновление завершено успешно', { 
                tokensBefore: tokensBeforeUpdate, 
                tokensAfter: tokensAfterUpdate,
                created: tokensCreated 
            });
        } else {
            // Фишки не были созданы (возможно, координаты еще не готовы)
            // Не обновляем флаг, чтобы следующая попытка не была пропущена
            this._warn('Фишки не были созданы, следующее обновление не будет пропущено', {
                tokensBefore: tokensBeforeUpdate,
                tokensAfter: tokensAfterUpdate,
                skipped: tokensSkipped
            });
        }
        
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
                                        const cellSize = Math.max(baseCoords.width || 50, baseCoords.height || 50);
                                        const offset = this.calculateOffset(index, playersAtPosition.length, cellSize);
                                        this.positionTokenElement(newToken, baseCoords, offset, playersAtPosition.length, index);
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
                    // ИСПРАВЛЕНО: Используем позиции из состояния игры с сервера без изменений
                    // Не перезаписываем позиции, если они есть с сервера
                    const playersWithRealPositions = state.players.map(player => ({
                        ...player,
                        position: typeof player.position === 'number' ? player.position : (player.position === null || player.position === undefined ? 0 : Number(player.position) || 0),
                        isInner: typeof player.isInner === 'boolean' ? player.isInner : (player.isInner === null || player.isInner === undefined ? false : Boolean(player.isInner))
                    }));
                    this._info('Получены данные из GameStateManager, используем реальные позиции игроков', {
                        playersCount: playersWithRealPositions.length,
                        positions: playersWithRealPositions.map(p => ({ id: p.id, position: p.position, isInner: p.isInner }))
                    });
                    this.updateTokens(playersWithRealPositions);
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
            // ИСПРАВЛЕНО: Используем позиции из состояния игры с сервера без изменений
            const playersWithRealPositions = this.gameState.players.map(player => ({
                ...player,
                position: typeof player.position === 'number' ? player.position : (player.position === null || player.position === undefined ? 0 : Number(player.position) || 0),
                isInner: typeof player.isInner === 'boolean' ? player.isInner : (player.isInner === null || player.isInner === undefined ? false : Boolean(player.isInner))
            }));
            this._info('Получены данные из gameState, используем реальные позиции игроков', {
                playersCount: playersWithRealPositions.length,
                positions: playersWithRealPositions.map(p => ({ id: p.id, position: p.position, isInner: p.isInner }))
            });
            this.updateTokens(playersWithRealPositions);
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
            const position = Number.isFinite(+token.getAttribute('data-position')) ? +token.getAttribute('data-position') : 0;
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
            const cellSize = Math.max(baseCoords.width || 50, baseCoords.height || 50);
            tokens.forEach(({ token, playerId }, index) => {
                const offset = this.calculateOffset(index, total, cellSize);
                this.positionTokenElement(token, baseCoords, offset, total, index);
                this._debug(`Фишка ${playerId} обновлена при массовом позиционировании`, {
                    position,
                    offset
                });
            });
        });
    }

    /**
     * Нормализация списка игроков (уникальные идентификаторы, позиции)
     * ВСЕ игроки начинают с клетки #24 (позиция 23) - переделана логика
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
            
            // ИСПРАВЛЕНО: Используем позицию из данных сервера без изменений
            // Не перезаписываем позицию, если она есть с сервера (даже если это 0)
            // Дефолт 0 устанавливается только если сервер явно не передал позицию
            const playerPosition = typeof player.position === 'number' 
                ? player.position 
                : (player.position === null || player.position === undefined ? 0 : Number(player.position) || 0);
            const playerIsInner = typeof player.isInner === 'boolean' 
                ? player.isInner 
                : (player.isInner === null || player.isInner === undefined ? false : Boolean(player.isInner));
            
            result.push({
                ...player,
                id: player.id || player.userId || key,
                position: playerPosition, // Позиция с сервера (единственный источник истины)
                isInner: playerIsInner, // Трек с сервера (единственный источник истины)
                token: player.token || this.getDefaultTokenForPlayer(player, idx)
            });
        });
        
        this._info('Нормализация игроков: используются позиции с сервера (единственный источник истины)', {
            playersCount: result.length,
            allPositions: result.map(p => ({ id: p.id, position: p.position, isInner: p.isInner }))
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
        
        // Проверяем, что существующая фишка все еще в DOM и в правильном треке
        if (token) {
            const isInCorrectTrack = token.parentElement === trackElement;
            const isConnected = token.isConnected && token.parentElement;
            
            if (!isConnected) {
                this._warn('Фишка найдена в кэше, но не в DOM, пересоздаем', {
                    player: player.username,
                    playerId: player.id,
                    tokenInDOM: token.isConnected,
                    hasParent: !!token.parentElement
                });
                // Удаляем старую фишку из кэша
                this.tokens.delete(player.id);
                token = null;
            } else if (!isInCorrectTrack && trackElement) {
                // Фишка в неправильном треке, перемещаем её
                this._debug('Фишка в неправильном треке, перемещаем', {
                    player: player.username,
                    currentParent: token.parentElement?.id,
                    targetParent: trackElement.id
                });
                trackElement.appendChild(token);
                // Убеждаемся, что фишка в конце DOM и имеет максимальный z-index
                requestAnimationFrame(() => {
                    const allChildren = Array.from(trackElement.children);
                    const tokenIndex = allChildren.indexOf(token);
                    if (tokenIndex >= 0 && tokenIndex < allChildren.length - 1) {
                        trackElement.appendChild(token);
                    }
                    token.style.setProperty('z-index', '99999', 'important');
                    token.style.setProperty('transform', 'translateZ(0)', 'important');
                    token.style.setProperty('isolation', 'isolate', 'important');
                });
            } else if (isInCorrectTrack && isConnected) {
                // Фишка уже существует и в правильном месте, просто обновляем данные
                this._debug('Фишка уже существует, обновляем данные', {
                    player: player.username,
                    playerId: player.id
                });
                // Обновляем данные фишки без пересоздания
                token.dataset.position = player.position;
                token.dataset.playerName = player.username;
                token.dataset.isInner = String(Boolean(player.isInner));
                token.classList.toggle('inner', !!player.isInner);
                token.classList.toggle('outer', !player.isInner);
                token.classList.toggle('inner-track', !!player.isInner);
                token.classList.toggle('outer-track', !player.isInner);
                token.textContent = this.getTokenIcon(player.token);
                token.title = `${player.username} - $${player.money || 0}`;
                return token; // Возвращаем существующую фишку
            }
        }
        
        if (!token) {
            token = this.createPlayerToken(player, index, totalPlayers);
            if (!trackElement) {
                this._warn('ensureToken: trackElement is null', { player: player.username, isInner: player.isInner });
                return null;
            }
            
            // НОВЫЙ ПОДХОД: Находим клетку и добавляем фишку как дочерний элемент клетки
            const cellPosition = Number.isFinite(Number(player.position)) ? Number(player.position) : 0;
            const isInner = typeof player.isInner === 'boolean' ? player.isInner : false;
            const cell = trackElement.querySelector(`[data-position="${cellPosition}"]`);
            
            if (cell) {
                // Убеждаемся, что клетка имеет position: relative
                const cellStyle = window.getComputedStyle(cell);
                if (cellStyle.position === 'static') {
                    cell.style.setProperty('position', 'relative', 'important');
                }
                
                // Добавляем фишку в клетку
                cell.appendChild(token);
                
                this._info('Фишка добавлена в клетку (новый подход)', {
                    player: player.username,
                    position: cellPosition,
                    isInner: isInner,
                    cellId: cell.id || cell.dataset.position,
                    tokenInDOM: token.isConnected,
                    tokenParent: token.parentElement?.tagName
                });
            } else {
                // Fallback: добавляем в trackElement, если клетка не найдена
                this._warn('Клетка не найдена, добавляем фишку в trackElement (fallback)', {
                    player: player.username,
                    position: cellPosition,
                    isInner: isInner
                });
                trackElement.appendChild(token);
            }
            
            // Сохраняем в кэш сразу после добавления
            this.tokens.set(player.id, token);
            
            // Позиционируем фишку
            const baseCoords = this.getCellBaseCoordinates(cellPosition, isInner);
            if (baseCoords) {
                const cellSize = Math.max(baseCoords.width || 50, baseCoords.height || 50);
                const offset = this.calculateOffset(index, totalPlayers, cellSize);
                this.positionTokenElement(token, baseCoords, offset, totalPlayers, index);
                this._info('Фишка позиционирована', {
                    player: player.username,
                    position: cellPosition,
                    coords: baseCoords,
                    offset
                });
            } else {
                this._warn('Координаты клетки недоступны при создании фишки', {
                    player: player.username,
                    position: cellPosition
                });
            }
            
            // Используем requestAnimationFrame для перемещения в конец и установки z-index
            // Это делается ПОСЛЕ того, как фишка уже в DOM
            requestAnimationFrame(() => {
                // Проверяем, что фишка все еще в DOM
                if (!token.isConnected || !token.parentElement) {
                    this._warn('Фишка потеряла связь с DOM в requestAnimationFrame, восстанавливаем', {
                        player: player.username
                    });
                    // Восстанавливаем фишку в DOM
                    if (trackElement && token) {
                        trackElement.appendChild(token);
                    }
                    return;
                }
                
                // Принудительно перемещаем фишку в самый конец, если она не последняя
                const allChildren = Array.from(trackElement.children);
                const tokenIndex = allChildren.indexOf(token);
                if (tokenIndex >= 0 && tokenIndex < allChildren.length - 1) {
                    // Фишка не последняя - перемещаем в конец
                    trackElement.appendChild(token);
                    this._debug('Фишка перемещена в конец DOM для правильного z-index', {
                        player: player.username,
                        wasIndex: tokenIndex,
                        totalChildren: allChildren.length
                    });
                }
                
                // Принудительно устанавливаем МАКСИМАЛЬНЫЙ z-index после добавления в DOM
                token.style.setProperty('z-index', '99999', 'important');
                token.style.setProperty('transform', 'translateZ(0)', 'important');
                token.style.setProperty('isolation', 'isolate', 'important');
                
                // КРИТИЧНО: Принудительно позиционируем фишку на клетке #24 после добавления в DOM
                // Используем двойной requestAnimationFrame для гарантии, что DOM полностью готов
                requestAnimationFrame(() => {
                    const cellPosition = 23;
                    const isInner = true; // Внутренний трек (малый круг)
                    const baseCoords = this.getCellBaseCoordinates(cellPosition, isInner);
                    if (baseCoords && Number.isFinite(baseCoords.x) && Number.isFinite(baseCoords.y)) {
                        const cellSize = Math.max(baseCoords.width || 50, baseCoords.height || 50);
                        const offset = this.calculateOffset(0, 1, cellSize); // Для одной фишки offset = 0
                        this.positionTokenElement(token, baseCoords, offset, 1, 0);
                        
                        // Дополнительная проверка через небольшую задержку
                        setTimeout(() => {
                            const rect = token.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0 || rect.left === 0 && rect.top === 0) {
                                this._warn('Фишка не видна после позиционирования, повторяем', {
                                    player: player.username,
                                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top }
                                });
                                // Повторяем позиционирование
                                this.positionTokenElement(token, baseCoords, offset, 1, 0);
                            } else {
                                this._info('✅ Фишка видна после позиционирования', {
                                    player: player.username,
                                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top }
                                });
                            }
                        }, 100);
                        
                        this._info('Фишка принудительно позиционирована на клетке #24', {
                            player: player.username,
                            position: cellPosition,
                            coords: baseCoords,
                            offset
                        });
                    } else {
                        this._warn('Не удалось получить координаты клетки #24 для принудительного позиционирования', {
                            player: player.username,
                            baseCoords
                        });
                    }
                });
            });
            
            // Принудительно устанавливаем стили для видимости ДО анимации с !important
            token.style.setProperty('display', 'flex', 'important');
            token.style.setProperty('visibility', 'visible', 'important');
            token.style.setProperty('width', '36px', 'important');
            token.style.setProperty('height', '36px', 'important');
            token.style.setProperty('min-width', '36px', 'important');
            token.style.setProperty('min-height', '36px', 'important');
            token.style.setProperty('opacity', '1', 'important'); // Устанавливаем opacity: 1 ДО анимации
            token.style.setProperty('position', 'absolute', 'important');
            token.style.setProperty('z-index', '99999', 'important'); // МАКСИМАЛЬНЫЙ z-index
            token.style.setProperty('transform', 'translateZ(0)', 'important'); // Создаем новый stacking context
            token.style.setProperty('isolation', 'isolate', 'important'); // Изолируем stacking context
            
            // Дополнительно через обычные свойства
            token.style.display = 'flex';
            token.style.visibility = 'visible';
            token.style.width = '36px';
            token.style.height = '36px';
            token.style.minWidth = '36px';
            token.style.minHeight = '36px';
            token.style.opacity = '1';
            token.style.position = 'absolute';
            token.style.zIndex = '99999'; // МАКСИМАЛЬНЫЙ z-index
            token.style.transform = 'translateZ(0)';
            token.style.isolation = 'isolate';
            
            // Проверяем, что фишка действительно в DOM (с небольшой задержкой для синхронизации)
            setTimeout(() => {
                if (!token.isConnected || !token.parentElement) {
                    this._warn('⚠️ Фишка не подключена к DOM после appendChild! Восстанавливаем...', {
                        player: player.username,
                        hasParent: !!token.parentElement,
                        isConnected: token.isConnected
                    });
                    // Пытаемся восстановить фишку в DOM
                    if (trackElement && token) {
                        trackElement.appendChild(token);
                        this._info('Фишка восстановлена в DOM', {
                            player: player.username,
                            tokenInDOM: token.isConnected
                        });
                    }
                } else {
                    this._debug('✅ Фишка успешно подключена к DOM', {
                        player: player.username,
                        parentId: token.parentElement?.id
                    });
                }
            }, 10);
            
            // НЕ запускаем анимацию появления, чтобы избежать мерцания
            // Фишка уже видна благодаря установленным стилям выше
            // Анимация может вызывать проблемы с видимостью при частых обновлениях
            
            // Используем requestAnimationFrame для гарантии, что стили применены
            requestAnimationFrame(() => {
                // Проверяем размер после рендера
                const rect = token.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    // Принудительно устанавливаем размер еще раз с !important
                    token.style.setProperty('width', '36px', 'important');
                    token.style.setProperty('height', '36px', 'important');
                    token.style.setProperty('min-width', '36px', 'important');
                    token.style.setProperty('min-height', '36px', 'important');
                    token.style.setProperty('opacity', '1', 'important');
                    token.style.setProperty('visibility', 'visible', 'important');
                    token.style.setProperty('display', 'flex', 'important');
                    token.style.setProperty('z-index', '99999', 'important'); // МАКСИМАЛЬНЫЙ z-index
                    token.style.setProperty('transform', 'translateZ(0)', 'important');
                    token.style.setProperty('isolation', 'isolate', 'important');
                    
                    // Убеждаемся, что фишка в конце DOM
                    const trackElement = token.parentElement;
                    if (trackElement) {
                        const allChildren = Array.from(trackElement.children);
                        const tokenIndex = allChildren.indexOf(token);
                        if (tokenIndex >= 0 && tokenIndex < allChildren.length - 1) {
                            trackElement.appendChild(token);
                        }
                    }
                    this._warn('⚠️ Фишка имела нулевой размер после рендера, исправлено', {
                        player: player.username,
                        rect: { width: rect.width, height: rect.height }
                    });
                }
                
                // Убеждаемся, что фишка видна
                token.style.setProperty('opacity', '1', 'important');
                token.style.setProperty('visibility', 'visible', 'important');
                token.style.setProperty('display', 'flex', 'important');
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
     * НОВЫЙ ПОДХОД: Добавляем фишку как дочерний элемент клетки
     */
    positionTokenElement(token, baseCoords, offset, totalPlayers = 1, index = 0) {
        if (!token) {
            this._warn('positionTokenElement: token is null');
            return;
        }
        
        // ИСПРАВЛЕНО: Используем явную проверку числа, чтобы позиция 0 не заменялась на 23
        const pos = Number.isFinite(+token.dataset.position) ? +token.dataset.position : 0;
        const position = pos;
        const isInner = token.dataset.isInner === 'true';
        const trackElement = this.getTrackElement(isInner);
        
        if (!trackElement) {
            this._warn('positionTokenElement: trackElement не найден', { position, isInner });
            return;
        }
        
        const cell = trackElement.querySelector(`[data-position="${position}"]`);
        if (!cell) {
            this._warn('positionTokenElement: клетка не найдена, используем старый метод', { position, isInner });
            // Fallback на старый метод
            if (!baseCoords || !Number.isFinite(baseCoords.x) || !Number.isFinite(baseCoords.y)) {
                this._warn('positionTokenElement: invalid baseCoords', { baseCoords, offset });
                return;
            }
            
            const tokenSize = 36;
            const halfSize = tokenSize / 2;
            let left = baseCoords.x + offset.x - halfSize;
            let top = baseCoords.y + offset.y - halfSize;
            
            if (!Number.isFinite(left) || !Number.isFinite(top)) {
                this._warn('positionTokenElement: невалидные координаты', { left, top, baseCoords, offset });
                return;
            }
            
            token.style.setProperty('left', `${left}px`, 'important');
            token.style.setProperty('top', `${top}px`, 'important');
            token.style.setProperty('display', 'flex', 'important');
            token.style.setProperty('visibility', 'visible', 'important');
            token.style.setProperty('opacity', '1', 'important');
            token.style.setProperty('z-index', '99999', 'important');
            token.style.setProperty('position', 'absolute', 'important');
            token.style.setProperty('width', '36px', 'important');
            token.style.setProperty('height', '36px', 'important');
            return;
        }
        
        // НОВЫЙ ПОДХОД: Добавляем фишку в клетку
        // Убеждаемся, что клетка имеет position: relative
        const cellStyle = window.getComputedStyle(cell);
        if (cellStyle.position === 'static') {
            cell.style.setProperty('position', 'relative', 'important');
        }
        
        // Перемещаем фишку в клетку, если она еще не там
        if (token.parentElement !== cell) {
            cell.appendChild(token);
            this._info('Фишка перемещена в клетку', {
                playerId: token.dataset.playerId,
                position,
                cellId: cell.id || cell.dataset.position
            });
        }
        
        // Позиционируем фишку относительно клетки (центр клетки)
        const tokenSize = 36;
        const halfSize = tokenSize / 2;
        
        // Вычисляем смещение для нескольких фишек на одной клетке
        const cellRect = cell.getBoundingClientRect();
        const cellWidth = cellRect.width || 50;
        const cellHeight = cellRect.height || 50;
        
        // Центр клетки
        const centerX = cellWidth / 2;
        const centerY = cellHeight / 2;
        
        // Смещение для нескольких фишек
        const offsetX = offset.x || 0;
        const offsetY = offset.y || 0;
        
        const left = centerX + offsetX - halfSize;
        const top = centerY + offsetY - halfSize;
        
        // Логируем позиционирование для отладки
        this._debug('Позиционирование фишки в клетке', {
            playerId: token.dataset.playerId,
            position,
            cellSize: { width: cellWidth, height: cellHeight },
            center: { x: centerX, y: centerY },
            offset: { x: offsetX, y: offsetY },
            final: { left, top },
            totalPlayers
        });
        
        // Устанавливаем все стили
        token.style.setProperty('position', 'absolute', 'important');
        token.style.setProperty('left', `${left}px`, 'important');
        token.style.setProperty('top', `${top}px`, 'important');
        token.style.setProperty('width', `${tokenSize}px`, 'important');
        token.style.setProperty('height', `${tokenSize}px`, 'important');
        token.style.setProperty('min-width', `${tokenSize}px`, 'important');
        token.style.setProperty('min-height', `${tokenSize}px`, 'important');
        token.style.setProperty('max-width', `${tokenSize}px`, 'important');
        token.style.setProperty('max-height', `${tokenSize}px`, 'important');
        // КРИТИЧНО: Устанавливаем z-index с учетом индекса фишки, чтобы они не перекрывались
        // Фишки с большим индексом должны быть выше
        const zIndex = 99999 + (totalPlayers > 1 ? index : 0);
        token.style.setProperty('z-index', `${zIndex}`, 'important');
        token.style.setProperty('display', 'flex', 'important');
        token.style.setProperty('visibility', 'visible', 'important');
        token.style.setProperty('opacity', '1', 'important');
        token.style.setProperty('pointer-events', 'auto', 'important');
        token.style.setProperty('transform', 'translateZ(0)', 'important');
        token.style.setProperty('isolation', 'isolate', 'important');
        
        // Дополнительно: убеждаемся, что фишка не скрыта overflow
        if (cell && cell.style.overflow === 'hidden') {
            cell.style.setProperty('overflow', 'visible', 'important');
            this._debug('Установлен overflow: visible для клетки', { position, cellId: cell.id || cell.dataset.position });
        }
        
        // КРИТИЧНО: Проверяем видимость фишки сразу после установки координат
        requestAnimationFrame(() => {
            const rect = token.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(token);
            const isVisible = rect.width > 0 && rect.height > 0 && 
                            computedStyle.visibility !== 'hidden' && 
                            computedStyle.display !== 'none' &&
                            computedStyle.opacity !== '0' &&
                            (rect.left !== 0 || rect.top !== 0 || (rect.left === 0 && rect.top === 0 && rect.width > 0));
            
            if (!isVisible) {
                this._warn('⚠️ Фишка не видна после установки координат!', {
                    playerId: token.dataset.playerId,
                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top },
                    computedStyle: {
                        visibility: computedStyle.visibility,
                        display: computedStyle.display,
                        opacity: computedStyle.opacity,
                        position: computedStyle.position,
                        zIndex: computedStyle.zIndex,
                        left: computedStyle.left,
                        top: computedStyle.top
                    },
                    inlineStyle: {
                        left: token.style.left,
                        top: token.style.top,
                        position: token.style.position,
                        zIndex: token.style.zIndex
                    },
                    coords: { left, top, baseCoords, offset }
                });
                
                // Принудительно устанавливаем все стили еще раз
                token.style.setProperty('position', 'absolute', 'important');
                token.style.setProperty('left', `${left}px`, 'important');
                token.style.setProperty('top', `${top}px`, 'important');
                token.style.setProperty('width', '36px', 'important');
                token.style.setProperty('height', '36px', 'important');
                token.style.setProperty('z-index', '99999', 'important');
                token.style.setProperty('display', 'flex', 'important');
                token.style.setProperty('visibility', 'visible', 'important');
                token.style.setProperty('opacity', '1', 'important');
            } else {
                this._info('✅ Фишка видна после установки координат', {
                    playerId: token.dataset.playerId,
                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top }
                });
            }
        });
        
        this._info('✅ Координаты установлены для фишки', {
            playerId: token.dataset.playerId,
            left: `${left}px`,
            top: `${top}px`,
            baseCoords,
            offset,
            tokenInDOM: token.isConnected,
            hasParent: !!token.parentElement
        });
        
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
        
        // КРИТИЧНО: Убеждаемся, что родительский элемент имеет правильный position для абсолютного позиционирования
        const parentElement = token.parentElement;
        if (parentElement) {
            const parentPosition = window.getComputedStyle(parentElement).position;
            if (parentPosition === 'static') {
                // Устанавливаем position: relative для родителя, если он static
                parentElement.style.setProperty('position', 'relative', 'important');
                this._info('Установлен position: relative для родительского элемента трека', {
                    parentId: parentElement.id,
                    parentTag: parentElement.tagName,
                    wasPosition: parentPosition
                });
            } else {
                this._debug('Родительский элемент уже имеет position:', {
                    parentId: parentElement.id,
                    position: parentPosition
                });
            }
            
            // Дополнительно убеждаемся, что родитель видим
            const parentRect = parentElement.getBoundingClientRect();
            if (parentRect.width === 0 || parentRect.height === 0) {
                this._warn('⚠️ Родительский элемент трека имеет нулевой размер!', {
                    parentId: parentElement.id,
                    rect: { width: parentRect.width, height: parentRect.height }
                });
            }
        }
        
        // Принудительно устанавливаем все стили с !important через setProperty
        token.style.setProperty('position', 'absolute', 'important');
        token.style.setProperty('left', `${left}px`, 'important');
        token.style.setProperty('top', `${top}px`, 'important');
        token.style.setProperty('width', '36px', 'important');
        token.style.setProperty('height', '36px', 'important');
        token.style.setProperty('min-width', '36px', 'important');
        token.style.setProperty('min-height', '36px', 'important');
        token.style.setProperty('z-index', '99999', 'important'); // МАКСИМАЛЬНЫЙ z-index
        token.style.setProperty('display', 'flex', 'important');
        token.style.setProperty('visibility', 'visible', 'important');
        token.style.setProperty('opacity', '1', 'important');
        token.style.setProperty('pointer-events', 'auto', 'important');
        token.style.setProperty('transform', 'translateZ(0)', 'important'); // Создаем новый stacking context
        token.style.setProperty('isolation', 'isolate', 'important'); // Изолируем stacking context
        
        // Дополнительно устанавливаем через обычные свойства для совместимости
        token.style.position = 'absolute';
        token.style.left = `${left}px`;
        token.style.top = `${top}px`;
        token.style.width = '36px';
        token.style.height = '36px';
        token.style.minWidth = '36px';
        token.style.minHeight = '36px';
        token.style.zIndex = '99999'; // Максимальный z-index
        token.style.display = 'flex';
        token.style.visibility = 'visible';
        token.style.opacity = '1';
        token.style.pointerEvents = 'auto';
        
        // Проверяем видимость фишки после позиционирования
        requestAnimationFrame(() => {
            const rect = token.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(token);
            const isVisible = rect.width > 0 && rect.height > 0 && 
                            computedStyle.visibility !== 'hidden' && 
                            computedStyle.display !== 'none' &&
                            computedStyle.opacity !== '0';
            
            if (!isVisible) {
                this._warn('⚠️ Фишка не видна после позиционирования!', {
                    playerId: token.dataset.playerId,
                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top },
                    computedStyle: {
                        visibility: computedStyle.visibility,
                        display: computedStyle.display,
                        opacity: computedStyle.opacity,
                        position: computedStyle.position,
                        zIndex: computedStyle.zIndex
                    },
                    inlineStyle: {
                        left: token.style.left,
                        top: token.style.top,
                        position: token.style.position,
                        zIndex: token.style.zIndex
                    },
                    coords: { left, top, baseCoords, offset }
                });
                
                // Принудительно устанавливаем стили еще раз
                token.style.setProperty('position', 'absolute', 'important');
                token.style.setProperty('left', `${left}px`, 'important');
                token.style.setProperty('top', `${top}px`, 'important');
                token.style.setProperty('width', '32px', 'important');
                token.style.setProperty('height', '32px', 'important');
                token.style.setProperty('z-index', '50000', 'important');
                token.style.setProperty('display', 'flex', 'important');
                token.style.setProperty('visibility', 'visible', 'important');
                token.style.setProperty('opacity', '1', 'important');
            } else {
                this._debug('✅ Фишка видна после позиционирования', {
                    playerId: token.dataset.playerId,
                    rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top }
                });
            }
        });
        
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
            token.style.zIndex = 50000 + Math.abs(offset.x + offset.y); /* Фишки поверх */
            token.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.4)';
            token.style.border = '2px solid rgba(255, 255, 255, 0.6)';
        } else {
            token.style.zIndex = '50000'; /* Базовый z-index */
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
    console.debug('🎲 PlayerTokens: Класс определен, экспортируем в window...');
}
window.PlayerTokens = PlayerTokens;
if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('🎲 PlayerTokens: Экспорт завершен, window.PlayerTokens =', !!window.PlayerTokens);
}
