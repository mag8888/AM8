/**
 * GameStateManager v2.0.0
 * ---------------------------------------------------------------------------
 * Centralised game state store used by UI modules and services.
 * Guarantees:
 *   - state is preserved between updates (optional persistence via storage)
 *   - `getState()` always returns a deep copy (consumers cannot mutate source)
 *   - granular change notifications (`state:updated`, `players:updated`, etc.)
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

        // КРИТИЧНО: Централизованный запросник для предотвращения race conditions
        this._lastFetchTime = 0;
        this._fetchInterval = 8000; // Минимум 8 секунд между запросами
        this._isUpdating = false;
        this._updateTimer = null;

        const roomIdFromHash = this._parseRoomIdFromHash();
        if (roomIdFromHash) {
            this._state.roomId = roomIdFromHash;
        }

        this._hydrateFromStorage();

        console.log('🏗️ GameStateManager: initialised', {
            roomId: this._state.roomId,
            players: this._state.players.length
        });
    }

    /**
     * Update state using payload from server.
     * @param {Object} serverState
     */
    updateFromServer(serverState = {}) {
        if (!serverState || typeof serverState !== 'object') {
            console.warn('⚠️ GameStateManager.updateFromServer: invalid payload', serverState);
            return;
        }

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
    }

    /**
     * ЕДИНСТВЕННЫЙ безопасный метод запроса game-state для предотвращения race conditions
     * @param {string} roomId - ID комнаты
     * @param {boolean} force - Принудительный запрос (игнорирует rate limiting)
     * @returns {Promise<Object|null>} - Состояние игры или null при ошибке
     */
    async fetchGameState(roomId, force = false) {
        // Быстрый возврат кэшированных данных для улучшения производительности
        if (!force && this._state && this._state.players && this._state.players.length > 0) {
            const timeSinceLastFetch = Date.now() - this._lastFetchTime;
            if (timeSinceLastFetch < 2000) { // Возвращаем кэш если данные свежие (2 секунды)
                console.log('🚀 GameStateManager: Возвращаем свежие кэшированные данные для быстрого отображения');
                return this._state;
            }
        }

        // Предотвращаем множественные одновременные запросы
        if (this._isUpdating && !force) {
            console.log('🚫 GameStateManager: Запрос уже выполняется');
            return null;
        }

        // Проверяем rate limiting через общую систему
        if (!force && window.CommonUtils) {
            if (!window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
                console.log('🚫 GameStateManager: Rate limiting активен');
                return null;
            }
        }

        this._isUpdating = true;

        try {
            // Добавляем таймаут для предотвращения долгих ожиданий
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут для быстрого переключения
            
            const response = await fetch(`/api/rooms/${roomId}/game-state`, {
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
                    console.log('✅ GameStateManager: Успешно обновлено состояние');
                    return gameStateData.state;
                }
            } else {
                console.warn('⚠️ GameStateManager: Неудачный запрос game-state:', response.status);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ GameStateManager: Запрос отменен по таймауту (5 сек)');
            } else {
                console.warn('⚠️ GameStateManager: Ошибка запроса game-state:', error);
            }
        } finally {
            this._isUpdating = false;
            if (window.CommonUtils) {
                window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
            }
        }

        return null;
    }

    /**
     * Безопасный запуск периодических обновлений
     * @param {string} roomId - ID комнаты
     * @param {number} interval - Интервал в миллисекундах (по умолчанию 45 секунд)
     */
    startPeriodicUpdates(roomId, interval = 45000) {
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
        }

        console.log(`🔄 GameStateManager: Запуск периодических обновлений каждые ${interval}ms`);
        this._updateTimer = setInterval(async () => {
            await this.fetchGameState(roomId);
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
        if (!playerId) return;
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
        if (!playerId) return;

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
        if (!this._state.players.length) return;
        const previous = this._cloneState(this._state);
        const next = this._cloneState(this._state);

        next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
        next.activePlayer = next.players[next.currentPlayerIndex] || null;
        next.updatedAt = Date.now();
        this._commitState(next, previous, { playersChanged: false, activePlayerChanged: true });
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
        this.notifyListeners('state:cleared', {});
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
        console.log('🏗️ GameStateManager: destroyed');
    }

    /**
     * Notify listeners (internal).
     * @param {string} event
     * @param {*} data
     */
    notifyListeners(event, data) {
        if (!this.listeners.has(event)) {
            return;
        }
        for (const callback of this.listeners.get(event)) {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ GameStateManager listener error (${event})`, error);
            }
        }
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    _commitState(next, previous, meta) {
        this._state = next;
        this._stateSnapshot = null;
        this._persistState();
        this._emitStateUpdate(previous, next, meta);
    }

    _emitStateUpdate(previous, current, meta) {
        const snapshot = this.getState();
        this.notifyListeners('state:updated', snapshot);

        if (meta.activePlayerChanged) {
            this.notifyListeners('turn:changed', {
                activePlayer: snapshot.activePlayer,
                previousPlayer: previous.activePlayer
            });
        }

        if (meta.playersChanged) {
            this.notifyListeners('players:updated', snapshot.players);
            this.notifyListeners('game:playersUpdated', snapshot.players);
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
            console.log('🏗️ GameStateManager: state restored from storage', {
                roomId: this._state.roomId,
                players: this._state.players.length
            });
        } catch (error) {
            console.warn('⚠️ GameStateManager: failed to hydrate state', error);
        }
    }

    _persistState() {
        if (!this._storage) return;
        try {
            const key = this._buildStorageKey();
            const payload = this._cloneState(this._state);
            this._storage.setItem(key, JSON.stringify(payload));
        } catch (error) {
            console.warn('⚠️ GameStateManager: failed to persist state', error);
        }
    }
}

if (typeof window !== 'undefined') {
    window.GameStateManager = GameStateManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateManager;
}
