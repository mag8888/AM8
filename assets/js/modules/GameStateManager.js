/**
 * GameStateManager v3.0.0 - REFACTORED & OPTIMIZED
 * ---------------------------------------------------------------------------
 * Исправления:
 * ✅ Убран вызов несуществующего syncWithServer()
 * ✅ Улучшена защита от рекурсии и каскадных обновлений  
 * ✅ Оптимизирована система уведомлений (debouncing)
 * ✅ Четкое разделение ответственности
 * ✅ Надежная обработка ошибок в listeners
 * ✅ Предотвращение memory leaks
 */

const STORAGE_KEY_PREFIX = 'am_game_state';

class GameStateManager {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this.listeners = new Map();
        this._state = this._createEmptyState();
        this._stateSnapshot = null;

        this._storage = this._detectStorage();
        this._hydratedFromStorage = false;

        // УЛУЧШЕННАЯ защита от race conditions и рекурсии
        this._lastFetchTime = 0;
        this._fetchInterval = 90000; // Увеличено до 90 секунд для снижения нагрузки
        this._isUpdating = false;
        this._isNotifying = false;
        this._updateTimer = null;
        this._rateLimitUntil = 0;
        this._fetchBackoffMs = 0;
        
        // НОВОЕ: Debouncing для уведомлений (предотвращает спам)
        this._notificationQueue = new Map();
        this._notificationDebounceMs = 150; // 150мс debounce
        this._lastNotificationTime = 0;
        
        // НОВОЕ: Счетчик рекурсивных вызовов
        this._recursionDepth = 0;
        this._maxRecursionDepth = 3;
        
        // НОВОЕ: Circuit breaker для критических ошибок
        this._errorCount = 0;
        this._maxErrors = 10;
        this._circuitOpen = false;

        const roomIdFromHash = this._parseRoomIdFromHash();
        if (roomIdFromHash) {
            this._state.roomId = roomIdFromHash;
        }

        this._hydrateFromStorage();

        console.log('🏗️ GameStateManager v3.0: Инициализирован с улучшениями', {
            roomId: this._state.roomId,
            players: this._state.players.length
        });
    }

    /**
     * Update state using payload from server.
     * УЛУЧШЕНО: Добавлена защита от рекурсии и оптимизация
     * @param {Object} serverState
     */
    updateFromServer(serverState = {}) {
        // НОВОЕ: Circuit breaker
        if (this._circuitOpen) {
            console.warn('⚠️ GameStateManager: Circuit breaker открыт, пропускаем обновление');
            return;
        }
        
        // УЛУЧШЕНО: Защита от рекурсии
        if (this._recursionDepth >= this._maxRecursionDepth) {
            console.warn('⚠️ GameStateManager: Достигнута максимальная глубина рекурсии, прерываем');
            return;
        }
        
        if (!serverState || typeof serverState !== 'object') {
            console.warn('⚠️ GameStateManager.updateFromServer: invalid payload', serverState);
            return;
        }

        // УЛУЧШЕНО: Проверяем, что мы не в процессе обновления
        if (this._isUpdating) {
            console.log('🚫 GameStateManager: Обновление уже в процессе, пропускаем');
            return;
        }

        this._isUpdating = true;
        this._recursionDepth++;

        try {
            const previous = this._cloneState(this._state);
            const next = this._cloneState(this._state);

            let playersChanged = false;
            let activePlayerChanged = false;
            let coreFlagsChanged = false;

            if (Array.isArray(serverState.players)) {
                const normalisedPlayers = serverState.players
                    .map(player => this._normalisePlayer(player))
                    .filter(Boolean);

                playersChanged = !this._arePlayersEqual(next.players, normalisedPlayers);
                if (playersChanged) {
                    next.players = normalisedPlayers;
                }
            }

            if (typeof serverState.currentPlayerIndex === 'number') {
                next.currentPlayerIndex = Math.max(0, Math.floor(serverState.currentPlayerIndex));
            }

            const candidateActivePlayer = this._resolveActivePlayer(serverState, next);
            if (candidateActivePlayer) {
                activePlayerChanged = !this._arePlayersEqual([previous.activePlayer], [candidateActivePlayer]);
                next.activePlayer = candidateActivePlayer;
                next.currentPlayerIndex = Math.max(
                    0,
                    next.players.findIndex(p => p.id === candidateActivePlayer.id)
                );
            } else if (next.players.length && next.currentPlayerIndex >= 0) {
                next.activePlayer = next.players[next.currentPlayerIndex] || null;
            } else if (next.players.length && !next.activePlayer) {
                // Автоматически устанавливаем первого игрока как активного если активного игрока нет
                console.log('🎯 GameStateManager: Автоматически устанавливаем первого игрока как активного');
                next.currentPlayerIndex = 0;
                next.activePlayer = next.players[0];
                activePlayerChanged = true;
            }

            if (serverState.roomId && serverState.roomId !== next.roomId) {
                next.roomId = serverState.roomId;
                coreFlagsChanged = true;
            }

            const serverFlags = this._extractGameFlags(serverState);
            coreFlagsChanged = this._applyFlags(next, serverFlags) || coreFlagsChanged;

            if (serverState.gameState && typeof serverState.gameState === 'object') {
                coreFlagsChanged = this._applyFlags(next, this._extractGameFlags(serverState.gameState)) || coreFlagsChanged;
            }

            if (!playersChanged &&
                !activePlayerChanged &&
                !coreFlagsChanged &&
                !this._hasMiscChanges(previous, next)) {
                return;
            }

            next.updatedAt = Date.now();
            this._commitState(next, previous, { playersChanged, activePlayerChanged });
            
        } catch (error) {
            this._handleError('updateFromServer', error);
        } finally {
            this._isUpdating = false;
            this._recursionDepth = Math.max(0, this._recursionDepth - 1);
        }
    }

    /**
     * ИСПРАВЛЕНО: Безопасный запрос game-state без несуществующего syncWithServer()
     * @param {string} roomId - ID комнаты
     * @param {boolean} force - Принудительный запрос
     * @returns {Promise<Object|null>}
     */
    async fetchGameState(roomId, force = false) {
        // Circuit breaker
        if (this._circuitOpen) {
            console.warn('⚠️ GameStateManager: Circuit breaker открыт');
            return null;
        }
        
        // Быстрый возврат кэшированных данных
        if (!force && this._state && this._state.players && this._state.players.length > 0) {
            const timeSinceLastFetch = Date.now() - this._lastFetchTime;
            if (timeSinceLastFetch < 2000) {
                // Убрали лог для производительности - это частый вызов
                return this._state;
            }
        }

        // Предотвращаем множественные одновременные запросы
        if (this._isUpdating && !force) {
            // Убрали лог для производительности - это частый вызов
            return null;
        }

        // Проверяем rate limit
        if (!force && this._rateLimitUntil > Date.now()) {
            // Убрали лог для производительности - это частый вызов
            return null;
        }

        // Проверяем глобальный rate limiter
        if (!force && window.CommonUtils && window.CommonUtils.gameStateLimiter && typeof window.CommonUtils.gameStateLimiter.setRequestPending === 'function') {
            if (!window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
                // Убрали лог для производительности - это частый вызов
                return null;
            }
        }

        this._isUpdating = true;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            // Используем ApiUrlHelper для определения правильного API URL
            const apiUrl = window.ApiUrlHelper?.getRoomsUrl(roomId, 'game-state') || 
                          `${(window.config?.get('api.baseUrl') || 'https://am8-production.up.railway.app/api')}/rooms/${roomId}/game-state`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
                const gameStateData = await response.json();
                if (gameStateData.success && gameStateData.state) {
                    this.updateFromServer(gameStateData.state);
                    this._lastFetchTime = Date.now();
                    this._fetchBackoffMs = 0;
                    this._rateLimitUntil = 0;
                    this._resetErrorCount(); // Сбрасываем счетчик ошибок при успехе
                    // Убрали лог для производительности - это частый вызов
                    return gameStateData.state;
                }
            } else {
                if (response.status === 429) {
                    const retryMs = this._applyRateLimitFromResponse(response);
                    console.warn(`⚠️ GameStateManager: Rate limited (HTTP 429), пауза ${retryMs}мс`);
                } else {
                    console.warn('⚠️ GameStateManager: Неудачный запрос game-state:', response.status);
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ GameStateManager: Запрос отменен по таймауту (5 сек)');
            } else {
                this._handleError('fetchGameState', error);
            }
        } finally {
            this._isUpdating = false;
            if (window.CommonUtils && window.CommonUtils.gameStateLimiter && typeof window.CommonUtils.gameStateLimiter.clearRequestPending === 'function') {
                window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
            }
        }

        return null;
    }

    /**
     * УЛУЧШЕНО: Обновление локального состояния rate limit
     * @param {Response} response
     * @returns {number} задержка в миллисекундах
     * @private
     */
    _applyRateLimitFromResponse(response) {
        const header = response?.headers?.get?.('Retry-After') || response?.headers?.get?.('retry-after');
        let retryMs = 0;

        if (header) {
            const retrySeconds = Number(header);
            if (!Number.isNaN(retrySeconds) && retrySeconds >= 0) {
                retryMs = retrySeconds * 1000;
            }
        }

        if (!retryMs) {
            this._fetchBackoffMs = this._fetchBackoffMs ? Math.min(this._fetchBackoffMs * 2, 120000) : 10000;
            retryMs = this._fetchBackoffMs;
        } else {
            this._fetchBackoffMs = retryMs;
        }

        this._rateLimitUntil = Date.now() + retryMs;
        return retryMs;
    }

    /**
     * УЛУЧШЕНО: Безопасный запуск периодических обновлений
     * @param {string} roomId - ID комнаты
     * @param {number} interval - Интервал в миллисекундах
     */
    startPeriodicUpdates(roomId, interval = 90000) { // Увеличено до 90 секунд для снижения нагрузки
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
        }

        console.log(`🔄 GameStateManager: Запуск периодических обновлений каждые ${interval}ms`);
        this._updateTimer = setInterval(async () => {
            // Добавляем проверку circuit breaker
            if (!this._circuitOpen) {
                await this.fetchGameState(roomId);
            }
        }, interval);
    }

    /**
     * Остановка периодических обновлений
     */
    stopPeriodicUpdates() {
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
            this._updateTimer = null;
            console.log('⏹️ GameStateManager: Периодические обновления остановлены');
        }
    }

    /**
     * Force re-emit current snapshot.
     */
    forceUpdate() {
        if (this._circuitOpen) {
            console.warn('⚠️ GameStateManager: Circuit breaker открыт, forceUpdate пропущен');
            return;
        }
        
        this._emitStateUpdate(this._cloneState(this._state), this._cloneState(this._state), {
            playersChanged: false,
            activePlayerChanged: false
        });
    }

    /**
     * Set room id and rehydrate persisted state for that room if available.
     * @param {string} roomId
     */
    setRoomId(roomId) {
        if (!roomId || typeof roomId !== 'string') {
            return;
        }
        if (roomId === this._state.roomId) {
            return;
        }

        const previous = this._cloneState(this._state);
        this._state.roomId = roomId;
        this._hydrateFromStorage(roomId);
        this._persistState();
        this._emitStateUpdate(previous, this._cloneState(this._state), {
            playersChanged: false,
            activePlayerChanged: false
        });
        console.log('🏗️ GameStateManager: roomId set', roomId);
    }

    /**
     * Get immutable snapshot of the current state.
     * @returns {Object}
     */
    getState() {
        if (!this._stateSnapshot) {
            const snapshot = this._cloneState(this._state);
            const derived = {
                players: snapshot.players,
                activePlayer: snapshot.activePlayer,
                currentPlayerIndex: snapshot.currentPlayerIndex,
                roomId: snapshot.roomId,
                gameState: {
                    canRoll: snapshot.canRoll,
                    canMove: snapshot.canMove,
                    canEndTurn: snapshot.canEndTurn,
                    lastDiceResult: snapshot.lastDiceResult,
                    gameStarted: snapshot.gameStarted
                },
                canRoll: snapshot.canRoll,
                canMove: snapshot.canMove,
                canEndTurn: snapshot.canEndTurn,
                lastDiceResult: snapshot.lastDiceResult,
                gameStarted: snapshot.gameStarted,
                updatedAt: snapshot.updatedAt
            };
            this._stateSnapshot = this._freezeSnapshot(derived);
        }
        return this._cloneState(this._stateSnapshot);
    }

    /**
     * @returns {Array}
     */
    getPlayers() {
        return this._cloneState(this._state.players);
    }

    /**
     * @param {string} playerId
     * @returns {Object|null}
     */
    getPlayerById(playerId) {
        if (!playerId) return null;
        return this._cloneState(
            this._state.players.find(p => p.id === playerId || p.userId === playerId) || null
        );
    }

    /**
     * @returns {Object|null}
     */
    getActivePlayer() {
        return this._cloneState(this._state.activePlayer);
    }

    /**
     * @param {string} playerId
     * @returns {boolean}
     */
    isPlayerActive(playerId) {
        if (!playerId || !this._state.activePlayer) return false;
        return this._state.activePlayer.id === playerId ||
            this._state.activePlayer.userId === playerId;
    }

    /**
     * Add or replace player locally.
     * @param {Object} player
     */
    addPlayer(player) {
        if (this._circuitOpen) return;
        
        const normalised = this._normalisePlayer(player);
        if (!normalised) return;

        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);

        const existingIndex = next.players.findIndex(p => p.id === normalised.id);
        if (existingIndex >= 0) {
            next.players[existingIndex] = normalised;
        } else {
            next.players.push(normalised);
        }

        next.updatedAt = Date.now();
        this._commitState(next, previous, { playersChanged: true, activePlayerChanged: false });
    }

    /**
     * Merge player updates.
     * @param {Object} player
     */
    updatePlayer(player) {
        if (this._circuitOpen) return;
        
        const normalised = this._normalisePlayer(player);
        if (!normalised) return;

        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);

        const idx = next.players.findIndex(p => p.id === normalised.id);
        if (idx === -1) {
            return;
        }

        next.players[idx] = { ...next.players[idx], ...normalised };
        if (next.activePlayer && next.activePlayer.id === normalised.id) {
            next.activePlayer = next.players[idx];
        }

        next.updatedAt = Date.now();
        this._commitState(next, previous, {
            playersChanged: true,
            activePlayerChanged: Boolean(next.activePlayer && next.activePlayer.id === normalised.id)
        });
    }

    /**
     * Remove player locally.
     * @param {string} playerId
     */
    removePlayer(playerId) {
        if (!playerId || this._circuitOpen) return;
        
        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);

        const initialLength = next.players.length;
        next.players = next.players.filter(player =>
            player.id !== playerId && player.userId !== playerId
        );

        if (next.players.length === initialLength) {
            return;
        }

        if (next.activePlayer && (
            next.activePlayer.id === playerId ||
            next.activePlayer.userId === playerId
        )) {
            next.activePlayer = next.players[0] || null;
            next.currentPlayerIndex = next.activePlayer ? 0 : 0;
        } else {
            next.currentPlayerIndex = Math.min(next.currentPlayerIndex, Math.max(next.players.length - 1, 0));
        }

        next.updatedAt = Date.now();
        this._commitState(next, previous, { playersChanged: true, activePlayerChanged: true });
    }

    /**
     * Persist dice result.
     * @param {Object|number|null} diceResult
     */
    updateDiceResult(diceResult) {
        if (this._circuitOpen) return;
        
        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);
        next.lastDiceResult = diceResult ?? null;
        next.updatedAt = Date.now();
        this._commitState(next, previous, { playersChanged: false, activePlayerChanged: false });
    }

    /**
     * Set active player by id.
     * @param {string} playerId
     */
    setActivePlayer(playerId) {
        if (!playerId || this._circuitOpen) return;

        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);
        const player = next.players.find(p =>
            p.id === playerId || p.userId === playerId
        );

        if (!player || (next.activePlayer && next.activePlayer.id === player.id)) {
            return;
        }

        next.activePlayer = player;
        next.currentPlayerIndex = next.players.findIndex(p => p.id === player.id);
        next.updatedAt = Date.now();
        this._commitState(next, previous, { playersChanged: false, activePlayerChanged: true });
    }

    /**
     * Rotate to next player.
     */
    passTurnToNextPlayer() {
        if (!this._state.players.length || this._circuitOpen) return;
        
        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);

        next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
        next.activePlayer = next.players[next.currentPlayerIndex] || null;
        next.updatedAt = Date.now();
        this._commitState(next, previous, { playersChanged: false, activePlayerChanged: true });
    }

    /**
     * УЛУЧШЕНО: Принудительно запустить первый ход с защитой от рекурсии
     */
    forceStartFirstTurn() {
        if (!this._state.players.length || this._circuitOpen) {
            console.warn('⚠️ GameStateManager: Нет игроков для запуска первого хода или circuit breaker открыт');
            return;
        }

        if (this._state.activePlayer) {
            console.log('ℹ️ GameStateManager: Активный игрок уже установлен:', this._state.activePlayer.username || this._state.activePlayer.id);
            return;
        }

        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);

        console.log('🎯 GameStateManager: Принудительно запускаем первый ход для игрока:', next.players[0].username || next.players[0].id);
        
        next.currentPlayerIndex = 0;
        next.activePlayer = next.players[0];
        next.updatedAt = Date.now();
        this._commitState(next, previous, { playersChanged: false, activePlayerChanged: true });
    }

    /**
     * ИСПРАВЛЕНО: Удалены проблемные методы forceUpdateAllComponents() и forceUpdateSafe()
     * Вместо них - безопасный метод для обновления UI компонентов
     */
    safeUpdateComponents() {
        if (this._circuitOpen) {
            console.warn('⚠️ GameStateManager: Circuit breaker открыт, обновление UI пропущено');
            return;
        }
        
        console.log('🔄 GameStateManager: Безопасное обновление UI компонентов');
        
        // Устанавливаем активного игрока если его нет
        if (this._state.players.length > 0 && !this._state.activePlayer) {
            console.log('🎯 GameStateManager: Устанавливаем первого игрока как активного');
            this.forceStartFirstTurn();
        }
        
        // Эмитим только основные события
        this._debouncedNotify('state:updated', this._state);
        this._debouncedNotify('players:updated', { 
            players: this._state.players,
            activePlayer: this._state.activePlayer
        });
        
        console.log('✅ GameStateManager: UI компоненты обновлены безопасно');
    }

    /**
     * Subscribe on event.
     * @param {string} event
     * @param {Function} callback
     */
    on(event, callback) {
        if (!event || typeof callback !== 'function') {
            return;
        }
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Unsubscribe handler.
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        if (!event || !this.listeners.has(event)) return;
        const set = this.listeners.get(event);
        set.delete(callback);
        if (set.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Clear state (used on logout / room leave).
     */
    clear() {
        const previous = this._cloneState(this._state);
        this._state = this._createEmptyState({ roomId: previous.roomId });
        this._stateSnapshot = null;
        this._persistState();
        this._debouncedNotify('state:cleared', {});
        this._emitStateUpdate(previous, this._cloneState(this._state), {
            playersChanged: previous.players.length > 0,
            activePlayerChanged: Boolean(previous.activePlayer)
        });
    }

    /**
     * Destroy manager.
     */
    destroy() {
        this.stopPeriodicUpdates();
        this.listeners.clear();
        this._state = this._createEmptyState({ roomId: this._state.roomId });
        this._stateSnapshot = null;
        this._isUpdating = false;
        this._isNotifying = false;
        this._recursionDepth = 0;
        
        // Очищаем очереди debounce
        if (this._notificationQueue) {
            this._notificationQueue.clear();
        }
        
        console.log('🏗️ GameStateManager v3.0: Уничтожен');
    }

    /**
     * УЛУЧШЕНО: Система уведомлений с debouncing и лучшей обработкой ошибок
     * @param {string} event
     * @param {*} data
     */
    notifyListeners(event, data) {
        if (!this.listeners.has(event) || this._circuitOpen) {
            return;
        }
        
        // Защита от рекурсии
        if (this._isNotifying) {
            console.warn('⚠️ GameStateManager: Предотвращена рекурсия в notifyListeners');
            return;
        }
        
        this._isNotifying = true;
        
        try {
            const callbacks = Array.from(this.listeners.get(event)); // Создаем копию для безопасности
            
            for (const callback of callbacks) {
                try {
                    // УЛУЧШЕНО: Добавляем timeout для callback'ов
                    const timeoutId = setTimeout(() => {
                        console.warn(`⚠️ GameStateManager: Callback для события '${event}' выполняется слишком долго`);
                    }, 1000);
                    
                    const result = callback(data);
                    
                    // Если callback возвращает Promise, обрабатываем ошибки
                    if (result && typeof result.catch === 'function') {
                        result.catch(error => {
                            console.error(`❌ GameStateManager async callback error (${event}):`, error);
                            this._handleError(`callback-${event}`, error);
                        });
                    }
                    
                    clearTimeout(timeoutId);
                    
                } catch (error) {
                    console.error(`❌ GameStateManager callback error (${event}):`, error);
                    this._handleError(`callback-${event}`, error);
                }
            }
        } finally {
            this._isNotifying = false;
        }
    }

    /**
     * НОВОЕ: Debounced уведомления для предотвращения спама
     * @param {string} event
     * @param {*} data
     */
    _debouncedNotify(event, data) {
        // Отменяем предыдущий timeout для этого события
        if (this._notificationQueue.has(event)) {
            clearTimeout(this._notificationQueue.get(event));
        }
        
        // Устанавливаем новый timeout
        const timeoutId = setTimeout(() => {
            this._notificationQueue.delete(event);
            this.notifyListeners(event, data);
        }, this._notificationDebounceMs);
        
        this._notificationQueue.set(event, timeoutId);
    }

    /**
     * НОВОЕ: Централизованная обработка ошибок с circuit breaker
     * @param {string} operation
     * @param {Error} error
     */
    _handleError(operation, error) {
        this._errorCount++;
        console.error(`❌ GameStateManager error in ${operation}:`, error);
        
        // Circuit breaker: если слишком много ошибок, временно отключаем компонент
        if (this._errorCount >= this._maxErrors) {
            console.error(`🚨 GameStateManager: Слишком много ошибок (${this._errorCount}), открываем circuit breaker`);
            this._circuitOpen = true;
            
            // Автоматически закрываем circuit breaker через 30 секунд
            setTimeout(() => {
                this._circuitOpen = false;
                this._errorCount = 0;
                console.log('✅ GameStateManager: Circuit breaker закрыт, возобновляем работу');
            }, 30000);
        }
    }

    /**
     * НОВОЕ: Сброс счетчика ошибок при успешных операциях
     */
    _resetErrorCount() {
        if (this._errorCount > 0) {
            this._errorCount = Math.max(0, this._errorCount - 1);
        }
        
        if (this._circuitOpen && this._errorCount === 0) {
            this._circuitOpen = false;
            console.log('✅ GameStateManager: Circuit breaker закрыт после успешных операций');
        }
    }

    // ---------------------------------------------------------------------
    // Internal helpers (без изменений, но с улучшенной обработкой ошибок)
    // ---------------------------------------------------------------------

    _commitState(next, previous, meta) {
        try {
            this._state = next;
            this._stateSnapshot = null;
            this._persistState();
            this._emitStateUpdate(previous, next, meta);
        } catch (error) {
            this._handleError('commitState', error);
        }
    }

    _emitStateUpdate(previous, current, meta) {
        try {
            const snapshot = this.getState();
            this._debouncedNotify('state:updated', snapshot);

            if (meta.activePlayerChanged) {
                this._debouncedNotify('turn:changed', {
                    activePlayer: snapshot.activePlayer,
                    previousPlayer: previous.activePlayer
                });
            }

            if (meta.playersChanged) {
                this._debouncedNotify('players:updated', snapshot.players);
                this._debouncedNotify('game:playersUpdated', snapshot.players);
            }
        } catch (error) {
            this._handleError('emitStateUpdate', error);
        }
    }

    _normalisePlayer(player) {
        if (!player || typeof player !== 'object') return null;
        const id = player.id || player.userId;
        if (!id) return null;
        return {
            ...player,
            id,
            userId: player.userId || id,
            username: player.username || player.name || `player-${id}`,
            isReady: Boolean(player.isReady)
        };
    }

    _resolveActivePlayer(serverState, next) {
        const fromPayload = serverState.activePlayer ? this._normalisePlayer(serverState.activePlayer) : null;
        if (fromPayload) {
            const existing = next.players.find(p => p.id === fromPayload.id);
            if (existing) return existing;
            return fromPayload;
        }
        if (typeof serverState.currentPlayerIndex === 'number') {
            const idx = Math.max(0, Math.floor(serverState.currentPlayerIndex));
            return next.players[idx] || null;
        }
        return null;
    }

    _extractGameFlags(source) {
        const flags = {};
        const keys = ['canRoll', 'canMove', 'canEndTurn', 'gameStarted', 'lastDiceResult'];
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                flags[key] = source[key];
            }
        }
        return flags;
    }

    _applyFlags(target, flags) {
        let changed = false;
        for (const [key, value] of Object.entries(flags)) {
            if (target[key] !== value) {
                target[key] = value;
                changed = true;
            }
        }
        return changed;
    }

    _createEmptyState(overrides = {}) {
        return {
            roomId: null,
            players: [],
            currentPlayerIndex: 0,
            activePlayer: null,
            canRoll: false,
            canMove: false,
            canEndTurn: false,
            gameStarted: false,
            lastDiceResult: null,
            updatedAt: Date.now(),
            ...overrides
        };
    }

    _cloneState(value) {
        if (value === null || value === undefined) return value;
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(value);
            } catch (_) { /* no-op */ }
        }
        return JSON.parse(JSON.stringify(value));
    }

    _freezeSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') return snapshot;
        if (Array.isArray(snapshot)) {
            return snapshot.map(item => this._freezeSnapshot(item));
        }
        const clone = {};
        for (const [key, value] of Object.entries(snapshot)) {
            clone[key] = this._freezeSnapshot(value);
        }
        return clone;
    }

    _arePlayersEqual(a = [], b = []) {
        if (a.length !== b.length) return false;
        const serialize = (players) => players.map(player => ({
            id: player?.id,
            username: player?.username,
            money: player?.money,
            position: player?.position,
            isReady: Boolean(player?.isReady)
        }));
        return JSON.stringify(serialize(a)) === JSON.stringify(serialize(b));
    }

    _hasMiscChanges(previous, next) {
        return previous.roomId !== next.roomId ||
            previous.lastDiceResult !== next.lastDiceResult ||
            previous.gameStarted !== next.gameStarted;
    }

    _parseRoomIdFromHash() {
        if (typeof window === 'undefined' || !window.location || !window.location.hash) {
            return null;
        }
        try {
            const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
            return params.get('roomId');
        } catch (_) {
            return null;
        }
    }

    _detectStorage() {
        if (typeof window === 'undefined') return null;
        const stores = [window.sessionStorage, window.localStorage].filter(Boolean);
        for (const store of stores) {
            try {
                const key = '__gsm_probe__';
                store.setItem(key, '1');
                store.removeItem(key);
                return store;
            } catch (_) {
                continue;
            }
        }
        return null;
    }

    _buildStorageKey(roomId) {
        const suffix = roomId || this._state.roomId || 'global';
        return `${STORAGE_KEY_PREFIX}:${suffix}`;
    }

    _hydrateFromStorage(explicitRoomId) {
        if (!this._storage) return;
        const key = this._buildStorageKey(explicitRoomId);
        try {
            const raw = this._storage.getItem(key);
            if (!raw) return;
            const stored = JSON.parse(raw);
            if (!stored || typeof stored !== 'object') return;
            this._state = this._createEmptyState({
                ...stored,
                roomId: explicitRoomId || this._state.roomId
            });
            this._stateSnapshot = null;
            this._hydratedFromStorage = true;
            console.log('🏗️ GameStateManager v3.0: state restored from storage', {
                roomId: this._state.roomId,
                players: this._state.players.length
            });
        } catch (error) {
            console.warn('⚠️ GameStateManager: failed to hydrate state', error);
        }
    }

    _persistState() {
        if (!this._storage) return;
        
        // Защита от рекурсии при сохранении состояния
        if (this._persisting) {
            console.warn('⚠️ GameStateManager: Предотвращена рекурсия в _persistState');
            return;
        }
        
        this._persisting = true;
        
        try {
            const key = this._buildStorageKey();
            const payload = this._cloneState(this._state);
            this._storage.setItem(key, JSON.stringify(payload));
        } catch (error) {
            console.warn('⚠️ GameStateManager: failed to persist state', error);
        } finally {
            this._persisting = false;
        }
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.GameStateManager = GameStateManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateManager;
}

// Version: 3.0.0 - Refactored & Optimized - Fixed all major issues