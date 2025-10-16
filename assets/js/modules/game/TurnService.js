/**
 * TurnService v1.0.0
 * Клиентский сервис управления ходами игроков
 * Централизует все действия хода (бросок, перемещение, завершение) и эмитит события
 */

class TurnService extends EventTarget {
    constructor({ state, roomApi, diceService, movementService, gameStateManager }) {
        super();
        
        // Проверка обязательных зависимостей
        if (!state) {
            throw new Error('TurnService: state instance is required');
        }
        if (!roomApi) {
            throw new Error('TurnService: RoomApi instance is required');
        }
        
        this.state = state;
        this.roomApi = roomApi;
        this.diceService = diceService;
        this.movementService = movementService;
        this.gameStateManager = gameStateManager || null;
        this.listeners = new Map();
        this.lastRollValue = null;
        
        console.log('🎮 TurnService: Инициализирован');
    }
    
    /**
     * Бросок кубика с событиями
     * @param {Object} options - Опции броска
     * @param {string} options.diceChoice - 'single' или 'double'
     * @param {boolean} options.isReroll - Повторный бросок (default: false)
     * @returns {Promise<Object>} Результат броска
     */
    async roll(options = {}) {
        const { diceChoice = 'single', isReroll = false } = options;
        const roomId = this.state.getRoomId();
        
        if (!roomId) {
            throw new Error('TurnService.roll: roomId is missing');
        }
        
        // Проверяем, что это ход текущего пользователя
        if (!this.isMyTurn()) {
            console.warn('⚠️ TurnService: Не ваш ход, бросок кубика заблокирован');
            throw new Error('Not your turn');
        }

        let response;
        try {
            // Эмит начала броска
            this.emit('roll:start', { diceChoice, isReroll });
            response = await this.roomApi.rollDice(roomId, diceChoice, isReroll);
            this._applyServerState(response?.state);

            const serverValue = Number(response?.diceResult?.value);
            if (Number.isFinite(serverValue)) {
                this.lastRollValue = serverValue;
                if (this.diceService && typeof this.diceService.setLastRoll === 'function') {
                    this.diceService.setLastRoll({
                        value: serverValue,
                        diceCount: response?.diceResult?.diceCount || 1
                    });
                }
            } else {
                this.lastRollValue = null;
            }

            // Эмит успешного результата
            const payload = { ...response, serverValue: this.lastRollValue };
            this.emit('roll:success', payload);

            console.log('🎮 TurnService: Кубик брошен успешно, значение =', this.lastRollValue);

            const autoMoveValue = this.lastRollValue;
            const shouldAutoMove = options.autoMove !== false && Number.isFinite(autoMoveValue) && payload?.state?.canMove !== false;
            if (shouldAutoMove) {
                try {
                    await this.move(autoMoveValue);
                } catch (moveError) {
                    console.error('⚠️ TurnService: Автоматическое перемещение не удалось:', moveError);
                }
            }

            return payload;
        } catch (error) {
            // Эмит ошибки
            this.emit('roll:error', error);
            console.error('❌ TurnService: Ошибка броска кубика:', error);
            throw error;
        } finally {
            // Всегда эмитим завершение
            this.emit('roll:finish', { diceChoice, isReroll });
        }
    }
    
    /**
     * Перемещение игрока
     * @param {number} steps - Количество шагов (1-12)
     * @returns {Promise<Object>} Результат перемещения
     */
    async move(steps) {
        const roomId = this.state.getRoomId();
        
        if (!roomId) {
            throw new Error('TurnService.move: roomId is missing');
        }
        
        // Проверяем, что это ход текущего пользователя
        if (!this.isMyTurn()) {
            console.warn('⚠️ TurnService: Не ваш ход, перемещение заблокировано');
            throw new Error('Not your turn');
        }
        
        const targetSteps = Number.isFinite(Number(steps)) && Number(steps) > 0
            ? Number(steps)
            : this.lastRollValue;
        
        // Валидация steps
        if (!Number.isFinite(targetSteps) || targetSteps <= 0) {
            throw new Error('TurnService.move: invalid steps value');
        }
        
        try {
            // Эмит начала перемещения
            this.emit('move:start', { steps: targetSteps });
            
            // Вызов API
            const response = await this.roomApi.move(roomId, targetSteps);
            this._applyServerState(response?.state);
            
            // Эмит успешного результата
            this.emit('move:success', response);
            console.log('✅ move:success', { roomId, steps: targetSteps, server: true, moveResult: response.moveResult });
            console.log(`🎮 TurnService: Игрок перемещен на ${targetSteps} шагов`);
            this.lastRollValue = null;
            return response;
            
        } catch (error) {
            // Эмит ошибки
            this.emit('move:error', error);
            console.error('❌ move:error', { roomId, steps: targetSteps, error });
            console.error('❌ TurnService: Ошибка перемещения:', error);
            
            // Локальный fallback движения, чтобы не блокировать UX
            try {
                const currentState = typeof this.state.getState === 'function' ? this.state.getState() : null;
                const players = Array.isArray(currentState?.players) ? currentState.players.slice() : [];
                const activePlayer = currentState?.activePlayer || (players.length ? players[currentState.currentPlayerIndex || 0] : null);
                if (activePlayer) {
                    // Предпочтительно задействовать MovementService, если он есть
                    if (this.movementService && typeof this.movementService.movePlayer === 'function') {
                        try {
                            this.movementService.movePlayer(activePlayer.id || activePlayer.userId, targetSteps);
                        } catch (e) {
                            console.warn('⚠️ Fallback MovementService.movePlayer error, continue with simple applyState:', e);
                        }
                    }
                    
                    // Простейшая модель позиции (внутренний круг 12 клеток, как на сервере)
                    const maxInner = 12;
                    const nextPlayers = players.map(p => {
                        if ((p.id || p.userId) === (activePlayer.id || activePlayer.userId)) {
                            const prev = Number(p.position) || 0;
                            const next = (prev + Number(targetSteps)) % maxInner;
                            return { ...p, position: next };
                        }
                        return p;
                    });
                    
                    const fallbackState = {
                        ...currentState,
                        players: nextPlayers,
                        canRoll: false,
                        canMove: false,
                        canEndTurn: true
                    };
                    this._applyServerState(fallbackState);
                    
                    const fallbackResponse = { success: true, moveResult: { steps: Number(targetSteps) || 0 }, state: fallbackState, fallback: true };
                    this.emit('move:success', fallbackResponse);
                    console.log('✅ move:success', { roomId, steps: targetSteps, server: false, fallback: true });
                    this.lastRollValue = null;
                    return fallbackResponse;
                }
            } catch (fallbackError) {
                console.error('❌ TurnService: Fallback movement failed:', fallbackError);
            }
            
            // Если даже fallback не удался — пробрасываем ошибку дальше
            throw error;
        } finally {
            // Всегда эмитим завершение
            this.emit('move:finish', { steps: targetSteps });
        }
    }
    
    /**
     * Завершение хода
     * @returns {Promise<Object>} Результат завершения хода
     */
    async endTurn() {
        const roomId = this.state.getRoomId();
        
        if (!roomId) {
            throw new Error('TurnService.endTurn: roomId is missing');
        }
        
        try {
            // Эмит начала завершения хода
            this.emit('end:start');
            
            // Вызов API
            const response = await this.roomApi.endTurn(roomId);
            this._applyServerState(response?.state);
            
            // Эмит успешного результата
            this.emit('end:success', response);
            
            console.log('✅ end:success', { roomId, activePlayer: response?.state?.activePlayer });
            console.log('🎮 TurnService: Ход завершен успешно');
            this.lastRollValue = null;
            return response;
            
        } catch (error) {
            // Эмит ошибки
            this.emit('end:error', error);
            console.error('❌ end:error', { roomId, error });
            console.error('❌ TurnService: Ошибка завершения хода:', error);
            throw error;
        } finally {
            // Всегда эмитим завершение
            this.emit('end:finish');
        }
    }
    
    /**
     * Регистрация слушателя события
     * @param {string} event - Название события
     * @param {Function} handler - Обработчик события
     */
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        
        // Также используем встроенный EventTarget
        this.addEventListener(event, handler);
    }
    
    /**
     * Удаление слушателя события
     * @param {string} event - Название события
     * @param {Function} handler - Обработчик события
     */
    off(event, handler) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(handler);
        }
        
        // Также удаляем из встроенного EventTarget
        this.removeEventListener(event, handler);
    }
    
    /**
     * Эмит события
     * @param {string} event - Название события
     * @param {*} data - Данные события
     */
    emit(event, data) {
        // Эмит через встроенный EventTarget
        const customEvent = new CustomEvent(event, { detail: data });
        this.dispatchEvent(customEvent);
        
        // Также вызываем обработчики напрямую для совместимости
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ TurnService: Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Получение текущего состояния игры
     * @returns {Object} Состояние игры
     */
    getState() {
        return this.state.getState();
    }
    
    /**
     * Проверка возможности броска кубика
     * @returns {boolean} Можно ли бросить кубик
     */
    canRoll() {
        try {
            const state = this.getState();
            const can = state && state.canRoll === true;
            console.log('🎲 TurnService.canRoll ->', can, state);
            return can;
        } catch (e) {
            console.warn('⚠️ TurnService.canRoll: no state yet');
            return true; // позволяем бросок, если состояние не готово
        }
    }
    
    /**
     * Проверка возможности перемещения
     * @returns {boolean} Можно ли перемещаться
     */
    canMove() {
        const state = this.getState();
        return state && state.canMove === true;
    }
    
    /**
     * Проверка возможности завершения хода
     * @returns {boolean} Можно ли завершить ход
     */
    canEndTurn() {
        const state = this.getState();
        return state && state.canEndTurn === true;
    }
    
    /**
     * Проверка, является ли текущий игрок активным (его ход)
     * @returns {boolean} Мой ли это ход
     */
    isMyTurn() {
        try {
            const state = this.getState();
            if (!state || !state.activePlayer) {
                console.warn('⚠️ TurnService.isMyTurn: Нет активного игрока');
                return false;
            }
            
            // Получаем ID текущего пользователя
            const currentUserId = this._getCurrentUserId();
            const currentUsername = this._getCurrentUsername();
            
            // Сравниваем с активным игроком
            const activePlayer = state.activePlayer;
            const isMyTurn = 
                activePlayer.id === currentUserId ||
                activePlayer.userId === currentUserId ||
                (activePlayer.username && currentUsername && activePlayer.username === currentUsername);
            
            console.log('🎯 TurnService.isMyTurn:', isMyTurn, { 
                activePlayer: activePlayer.username || activePlayer.id, 
                currentUser: currentUsername || currentUserId 
            });
            
            return isMyTurn;
        } catch (error) {
            console.error('❌ TurnService.isMyTurn: Ошибка проверки хода:', error);
            return false;
        }
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     * @private
     */
    _getCurrentUserId() {
        try {
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle?.currentUser?.id;
            }
            
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                return user?.id;
            }
        } catch (error) {
            console.error('❌ TurnService: Ошибка получения ID пользователя:', error);
        }
        return null;
    }
    
    /**
     * Получение username текущего пользователя
     * @returns {string|null} Username пользователя
     * @private
     */
    _getCurrentUsername() {
        try {
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle?.currentUser?.username || bundle?.currentUser?.name || null;
            }
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                return user?.username || user?.name || null;
            }
        } catch (error) {
            console.error('❌ TurnService: Ошибка получения username пользователя:', error);
        }
        return null;
    }
    
    /**
     * Получение активного игрока
     * @returns {Object} Активный игрок
     */
    getActivePlayer() {
        const state = this.getState();
        return state && state.activePlayer;
    }
    
    /**
     * Получение результата последнего броска
     * @returns {Object} Результат броска
     */
    getLastDiceResult() {
        const state = this.getState();
        return state && state.lastDiceResult;
    }
    
    /**
     * Очистка всех слушателей
     */
    destroy() {
        this.listeners.clear();
        console.log('🎮 TurnService: Уничтожен');
    }

    /**
     * Применение состояния от сервера к локальным менеджерам
     * @param {Object} serverState
     * @private
     */
    _applyServerState(serverState) {
        if (!serverState) return;
        if (this.state && typeof this.state.applyState === 'function') {
            this.state.applyState(serverState);
        }
        if (this.gameStateManager && typeof this.gameStateManager.updateFromServer === 'function') {
            this.gameStateManager.updateFromServer(serverState);
        }
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.TurnService = TurnService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnService;
}
