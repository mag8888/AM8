/**
 * TurnManager v1.0.0
 * ---------------------------------------------------------------------------
 * Централизованный контроллер хода:
 *  - управляет активным игроком и синхронизацией с GameStateManager
 *  - оркестрирует бросок кубика на сервере и перемещение фишек
 *  - выполняет анимацию движения с задержкой 0.5 сек на клетку
 *  - оповещает UI через EventBus и собственные события
 */

class TurnManager extends EventTarget {
    /**
     * @param {Object} options
     * @param {TurnService} options.turnService
     * @param {MovementService} options.movementService
     * @param {GameStateManager} options.gameStateManager
     * @param {EventBus} [options.eventBus]
     * @param {number} [options.stepDelayMs=500]
     */
    constructor({ turnService, movementService, gameStateManager, eventBus = null, stepDelayMs = 500 } = {}) {
        super();

        if (!turnService || typeof turnService.on !== 'function') {
            throw new Error('TurnManager: turnService with event support is required');
        }
        if (!movementService || typeof movementService.movePlayer !== 'function') {
            throw new Error('TurnManager: movementService with movePlayer() is required');
        }
        if (!gameStateManager || typeof gameStateManager.on !== 'function') {
            throw new Error('TurnManager: gameStateManager with on() is required');
        }

        this.turnService = turnService;
        this.movementService = movementService;
        this.gameStateManager = gameStateManager;
        this.eventBus = eventBus;
        this.stepDelayMs = Number.isFinite(Number(stepDelayMs)) ? Number(stepDelayMs) : 500;

        this._subscriptions = [];
        this._stateSnapshot = null;
        this._prevStateSnapshot = null;
        this._hasInitialSync = false;
        this._isRolling = false;
        this._isMoving = false;
        this._destroyed = false;
        this._lastLocalMove = null;

        this._outerTrackSize = Number(this.movementService.outerTrackSize) || 44;
        this._innerTrackSize = Number(this.movementService.innerTrackSize) || 24;

        this._init();
    }

    /**
     * Текущий активный игрок
     * @returns {Object|null}
     */
    getActivePlayer() {
        return this._stateSnapshot?.activePlayer || null;
    }

    /**
     * @returns {boolean}
     */
    get canRoll() {
        return Boolean(this._stateSnapshot?.canRoll);
    }

    /**
     * @returns {boolean}
     */
    get canMove() {
        return Boolean(this._stateSnapshot?.canMove);
    }

    /**
     * @returns {boolean}
     */
    get canEndTurn() {
        return Boolean(this._stateSnapshot?.canEndTurn);
    }

    /**
     * Флаг, выполняется ли бросок
     */
    get isRolling() {
        return this._isRolling;
    }

    /**
     * Флаг, выполняется ли перемещение
     */
    get isMoving() {
        return this._isMoving;
    }

    /**
     * Выполнить бросок кубика (генерация на сервере) и перемещение фишки
     * @param {Object} [options]
     * @param {string} [options.diceChoice='single']
     * @returns {Promise<{ value: number, response: Object }>}
     */
    async rollDice(options = {}) {
        if (!this.turnService.isMyTurn()) {
            throw new Error('TurnManager.rollDice: not your turn');
        }
        if (this._isRolling || this._isMoving) {
            throw new Error('TurnManager.rollDice: action already in progress');
        }

        const diceChoice = options.diceChoice || 'single';
        this._isRolling = true;
        this._emitState();

        try {
            const response = await this.turnService.roll({
                diceChoice,
                autoMove: false // движение возьмём под контроль TurnManager
            });

            const serverValue = this._extractDiceValue(response);
            if (Number.isFinite(serverValue)) {
                this._updateLastDice(serverValue);
                this._emitDiceRolled(serverValue);
                await this.moveActivePlayer(serverValue, { requireMyTurn: true, reason: 'dice-roll' });
            }

            return { value: serverValue, response };
        } finally {
            this._isRolling = false;
            this._emitState();
        }
    }

    /**
     * Перемещение активной фишки на указанное количество клеток
     * @param {number} steps
     * @param {Object} [options]
     * @param {boolean} [options.requireMyTurn=true]
     * @param {string} [options.reason]
     * @returns {Promise<Object>} Ответ сервера
     */
    async moveActivePlayer(steps, options = {}) {
        const normalizedSteps = Number(steps);
        if (!Number.isFinite(normalizedSteps) || normalizedSteps <= 0) {
            throw new Error('TurnManager.moveActivePlayer: invalid steps value');
        }
        if (this._isMoving) {
            throw new Error('TurnManager.moveActivePlayer: movement already in progress');
        }

        const activePlayer = this.getActivePlayer();
        if (!activePlayer) {
            throw new Error('TurnManager.moveActivePlayer: active player not resolved');
        }

        if (options.requireMyTurn !== false && !this.turnService.isMyTurn()) {
            throw new Error('TurnManager.moveActivePlayer: not your turn');
        }

        this._isMoving = true;
        this._emitMovementEvent('turn:movementStarted', {
            player: activePlayer,
            steps: normalizedSteps,
            reason: options.reason || 'manual'
        });

        try {
            const response = await this.turnService.move(normalizedSteps, {
                player: activePlayer,
                requireMyTurn: options.requireMyTurn !== false
            });

            // Запоминаем локальное движение, чтобы не дублировать анимацию при обновлении состояния
            this._lastLocalMove = {
                playerId: activePlayer.id,
                steps: normalizedSteps,
                at: Date.now()
            };

            await this._animatePlayer(activePlayer.id, normalizedSteps);

            return response;
        } finally {
            this._isMoving = false;
            this._emitMovementEvent('turn:movementCompleted', {
                player: activePlayer,
                steps: normalizedSteps
            });
            this._emitState();
        }
    }

    /**
     * Завершение текущего хода
     * @returns {Promise<Object>}
     */
    async endTurn() {
        if (this._isRolling || this._isMoving) {
            throw new Error('TurnManager.endTurn: action in progress');
        }
        if (!this.turnService.isMyTurn()) {
            throw new Error('TurnManager.endTurn: not your turn');
        }
        if (!this.canEndTurn) {
            throw new Error('TurnManager.endTurn: cannot end turn yet');
        }

        const response = await this.turnService.endTurn();
        this._emitMovementEvent('turn:ended', {
            activePlayer: response?.state?.activePlayer || null
        });
        return response;
    }

    /**
     * Подписка на события TurnManager
     * @param {string} event
     * @param {Function} handler
     */
    on(event, handler) {
        if (typeof handler !== 'function') {
            return;
        }
        const wrapped = (data) => handler(data?.detail ?? data);
        this.addEventListener(event, wrapped);
        this._subscriptions.push({ target: this, event, handler: wrapped, original: handler });
    }

    /**
     * Отписка от события
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
        const index = this._subscriptions.findIndex(
            (entry) => entry.target === this && entry.event === event && entry.original === handler
        );
        if (index === -1) {
            return;
        }
        this.removeEventListener(event, this._subscriptions[index].handler);
        this._subscriptions.splice(index, 1);
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;

        for (const entry of this._subscriptions) {
            if (entry.target === this.turnService && typeof this.turnService.off === 'function') {
                this.turnService.off(entry.event, entry.handler);
            } else if (entry.target === this.gameStateManager && typeof this.gameStateManager.off === 'function') {
                this.gameStateManager.off(entry.event, entry.handler);
            } else if (entry.target === this && entry.handler) {
                this.removeEventListener(entry.event, entry.handler);
            } else if (this.eventBus && entry.target === this.eventBus && typeof this.eventBus.off === 'function') {
                this.eventBus.off(entry.event, entry.handler);
            }
        }
        this._subscriptions = [];
        console.log('🎯 TurnManager: destroyed');
    }

    // ---------------------------------------------------------------------
    // Internal logic
    // ---------------------------------------------------------------------

    _init() {
        this._bindTurnServiceEvents();
        this._bindGameStateEvents();
        this._bootstrapState();

        console.log('🎯 TurnManager: initialised', {
            stepDelayMs: this.stepDelayMs
        });
    }

    _bindTurnServiceEvents() {
        const add = (event, handler) => {
            const wrapped = (payload) => {
                if (this._destroyed) return;
                try {
                    handler.call(this, payload);
                } catch (error) {
                    console.error(`❌ TurnManager: handler error for ${event}`, error);
                }
            };
            this.turnService.on(event, wrapped);
            this._subscriptions.push({ target: this.turnService, event, handler: wrapped });
        };

        add('roll:start', this._onRollStart);
        add('roll:finish', this._onRollFinish);
        add('roll:success', this._onRollSuccess);
        add('roll:error', this._onRollError);

        add('move:start', this._onMoveStart);
        add('move:finish', this._onMoveFinish);
        add('move:success', this._onMoveSuccess);
        add('move:error', this._onMoveError);

        add('end:success', this._onEndTurnSuccess);
        add('end:error', this._onEndTurnError);
    }

    _bindGameStateEvents() {
        const add = (event, handler) => {
            const wrapped = (payload) => {
                if (this._destroyed) return;
                try {
                    handler.call(this, payload);
                } catch (error) {
                    console.error(`❌ TurnManager: GameState handler error for ${event}`, error);
                }
            };
            this.gameStateManager.on(event, wrapped);
            this._subscriptions.push({ target: this.gameStateManager, event, handler: wrapped });
        };

        add('state:updated', this._onStateUpdated);
        add('turn:changed', this._onTurnChanged);
    }

    _bootstrapState() {
        if (typeof this.gameStateManager.getState === 'function') {
            try {
                const snapshot = this.gameStateManager.getState();
                this._prevStateSnapshot = this._cloneState(snapshot);
                this._stateSnapshot = this._composeStateFromSnapshot(snapshot);
                this._primeMovementPositions(snapshot);
                this._emitState();
            } catch (error) {
                console.error('❌ TurnManager: failed to bootstrap state', error);
            }
        }
    }

    _onRollStart() {
        this._isRolling = true;
        this._emitState();
    }

    _onRollFinish() {
        this._isRolling = false;
        this._emitState();
    }

    _onRollSuccess(payload) {
        const value = this._extractDiceValue(payload);
        if (Number.isFinite(value)) {
            this._updateLastDice(value);
            this._emitDiceRolled(value, payload);
        }
    }

    _onRollError(error) {
        console.warn('⚠️ TurnManager: roll error', error);
        this._isRolling = false;
        this._emitState();
    }

    _onMoveStart() {
        this._isMoving = true;
        this._emitState();
    }

    _onMoveFinish() {
        this._isMoving = false;
        this._emitState();
    }

    _onMoveSuccess(payload) {
        if (!payload || !payload.state) {
            return;
        }
        const diceValue = this._extractDiceValue({
            diceResult: payload?.state?.lastDiceResult
        });
        if (Number.isFinite(diceValue)) {
            this._updateLastDice(diceValue);
        }
    }

    _onMoveError(error) {
        console.error('⚠️ TurnManager: move error', error);
        this._isMoving = false;
        this._emitState();
    }

    _onEndTurnSuccess(payload) {
        this._emitMovementEvent('turn:ended', {
            activePlayer: payload?.state?.activePlayer || null
        });
    }

    _onEndTurnError(error) {
        console.error('⚠️ TurnManager: end turn error', error);
    }

    _onStateUpdated(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') {
            return;
        }

        const previous = this._prevStateSnapshot;
        this._prevStateSnapshot = this._cloneState(snapshot);
        this._stateSnapshot = this._composeStateFromSnapshot(snapshot);
        this._emitState();

        // Первичная синхронизация позиций
        if (!this._hasInitialSync) {
            this._primeMovementPositions(snapshot);
            this._hasInitialSync = true;
            return;
        }

        this._syncPlayersWithMovement(snapshot, previous);
    }

    _onTurnChanged(data) {
        if (!data) {
            return;
        }
        this._emitMovementEvent('turn:activePlayerChanged', data);
    }

    _primeMovementPositions(snapshot) {
        if (!snapshot || !Array.isArray(snapshot.players)) {
            return;
        }
        snapshot.players.forEach((player) => {
            this._ensureMovementPosition(player, { force: true });
        });
    }

    _syncPlayersWithMovement(currentState, previousState) {
        const players = Array.isArray(currentState.players) ? currentState.players : [];
        const prevPlayers = (previousState && Array.isArray(previousState.players)) ? previousState.players : [];

        const previousMap = new Map(prevPlayers.map(player => [player.id || player.userId, player]));

        players.forEach((player) => {
            const playerId = player.id || player.userId;
            if (!playerId) {
                return;
            }

            const prev = previousMap.get(playerId);

            if (!prev) {
                this._ensureMovementPosition(player, { force: true });
                return;
            }

            const steps = this._calculateStepDelta(prev, player);

            if (steps <= 0) {
                // Обновляем позицию, если система ещё не знает о ней
                this._ensureMovementPosition(player);
                return;
            }

            // Проверяем, не локальное ли движение (мы уже проиграли анимацию)
            if (this._lastLocalMove &&
                this._lastLocalMove.playerId === playerId &&
                Math.abs(Date.now() - this._lastLocalMove.at) < 4000) {
                return;
            }

            // Запускаем анимацию для внешнего обновления
            this._animatePlayer(playerId, steps).catch((error) => {
                console.error('❌ TurnManager: failed to animate external movement', error);
                this._ensureMovementPosition(player, { force: true });
            });
        });
    }

    _ensureMovementPosition(player, options = {}) {
        if (!player) return;
        const playerId = player.id || player.userId;
        if (!playerId) return;

        const track = this._resolveTrack(player);
        const position = Number(player.position) || 0;
        const totalMoves = Number(player.totalMoves || player.total_moves || position) || 0;

        const currentPosition = this.movementService.getPlayerPosition(playerId);
        if (!options.force && currentPosition) {
            return;
        }

        this.movementService.setPlayerPosition(playerId, {
            track,
            position,
            totalMoves,
            isInner: track === 'inner'
        });
    }

    async _animatePlayer(playerId, steps) {
        if (!this.movementService || typeof this.movementService.movePlayer !== 'function') {
            return;
        }

        try {
            await this.movementService.movePlayer(playerId, steps, {
                stepDelayMs: this.stepDelayMs
            });
        } catch (error) {
            console.error('❌ TurnManager: movement animation failed', error);
            throw error;
        }
    }

    _calculateStepDelta(previousPlayer, currentPlayer) {
        if (!previousPlayer || !currentPlayer) {
            return 0;
        }

        const prevTrack = this._resolveTrack(previousPlayer);
        const currentTrack = this._resolveTrack(currentPlayer);

        const prevPosition = Number(previousPlayer.position) || 0;
        const currentPosition = Number(currentPlayer.position) || 0;

        if (prevTrack !== currentTrack) {
            // Простая эвристика при смене трека: проигрываем число выпавших шагов, если оно доступно
            if (Number.isFinite(this._stateSnapshot?.lastDiceValue)) {
                return Math.max(1, Math.min(12, this._stateSnapshot.lastDiceValue));
            }
            return Math.max(1, Math.abs(currentPosition - prevPosition) || 1);
        }

        const trackLength = currentTrack === 'inner' ? this._innerTrackSize : this._outerTrackSize;
        const deltaRaw = (currentPosition - prevPosition + trackLength) % trackLength;

        if (deltaRaw === 0 && currentPosition !== prevPosition) {
            return trackLength;
        }

        return deltaRaw;
    }

    _resolveTrack(player) {
        if (!player) return 'inner';
        if (player.track === 'outer' || player.track === 'inner') {
            return player.track;
        }
        if (typeof player.isInner === 'boolean') {
            return player.isInner ? 'inner' : 'outer';
        }
        return 'inner';
    }

    _composeStateFromSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') {
            return null;
        }
        const state = {
            players: snapshot.players || [],
            activePlayer: snapshot.activePlayer || null,
            canRoll: this._coerceBoolean(snapshot.canRoll ?? snapshot.gameState?.canRoll),
            canMove: this._coerceBoolean(snapshot.canMove ?? snapshot.gameState?.canMove),
            canEndTurn: this._coerceBoolean(snapshot.canEndTurn ?? snapshot.gameState?.canEndTurn),
            lastDiceValue: this._extractDiceValue(snapshot.lastDiceResult),
            updatedAt: snapshot.updatedAt || Date.now()
        };
        return state;
    }

    _coerceBoolean(value) {
        if (value === undefined || value === null) {
            return false;
        }
        return Boolean(value);
    }

    _extractDiceValue(source) {
        if (!source) return null;
        if (typeof source === 'number') {
            return Number(source);
        }
        if (typeof source === 'object') {
            if (Number.isFinite(source.serverValue)) {
                return Number(source.serverValue);
            }
            if (Number.isFinite(source.value)) {
                return Number(source.value);
            }
            if (Number.isFinite(source.total)) {
                return Number(source.total);
            }
            if (Array.isArray(source.results)) {
                return source.results.reduce((sum, val) => sum + Number(val || 0), 0);
            }
        }
        return null;
    }

    _updateLastDice(value) {
        if (!this._stateSnapshot) {
            this._stateSnapshot = {};
        }
        this._stateSnapshot.lastDiceValue = value;
        this._emitState();
    }

    _emitState() {
        const payload = {
            isRolling: this._isRolling,
            isMoving: this._isMoving,
            canRoll: this.canRoll,
            canMove: this.canMove,
            canEndTurn: this.canEndTurn,
            activePlayer: this.getActivePlayer(),
            lastDiceValue: this._stateSnapshot?.lastDiceValue ?? null
        };
        this.dispatchEvent(new CustomEvent('turn:state', { detail: payload }));
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('turn:state', payload);
        }
    }

    _emitDiceRolled(value, payload = null) {
        const detail = {
            value,
            player: this.getActivePlayer(),
            context: payload
        };
        this.dispatchEvent(new CustomEvent('turn:diceRolled', { detail }));
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('turn:diceRolled', detail);
        }
    }

    _emitMovementEvent(eventName, detail) {
        this.dispatchEvent(new CustomEvent(eventName, { detail }));
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit(eventName, detail);
        }
    }

    _cloneState(value) {
        if (value === null || value === undefined) {
            return value;
        }
        try {
            return structuredClone(value);
        } catch (_) {
            return JSON.parse(JSON.stringify(value));
        }
    }
}

// Экспорт модуля
if (typeof window !== 'undefined') {
    window.TurnManager = TurnManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnManager;
}

