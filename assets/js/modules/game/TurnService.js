/**
 * TurnService v1.0.0
 * Клиентский сервис управления ходами игроков
 * Централизует все действия хода (бросок, перемещение, завершение) и эмитит события
 */

class TurnService extends EventTarget {
    constructor({ state, roomApi, diceService, movementService }) {
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
        this.listeners = new Map();
        
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
        
        try {
            // Эмит начала броска
            this.emit('roll:start', { diceChoice, isReroll });
            
            // Используем DiceService для локального броска
            if (this.diceService) {
                const rollOptions = {
                    forceSingle: diceChoice === 'single',
                    forceDouble: diceChoice === 'double'
                };
                
                const rollResult = this.diceService.roll(rollOptions);
                
                // Вызываем API для синхронизации с сервером
                const response = await this.roomApi.rollDice(roomId, diceChoice, isReroll);
                
                // Применяем состояние от сервера
                if (response.state && this.state.applyState) {
                    this.state.applyState(response.state);
                }
                
                // Используем MovementService для движения фишки
                if (this.movementService && rollResult.total > 0) {
                    const activePlayer = this.state.getActivePlayer();
                    if (activePlayer) {
                        this.movementService.movePlayer(activePlayer.id, rollResult.total);
                    }
                }
                
                // Эмит успешного результата
                this.emit('roll:success', { ...response, localRoll: rollResult });
                
                console.log('🎮 TurnService: Кубик брошен успешно');
                return { ...response, localRoll: rollResult };
            } else {
                // Fallback к API без DiceService
                const response = await this.roomApi.rollDice(roomId, diceChoice, isReroll);
                
                if (response.state && this.state.applyState) {
                    this.state.applyState(response.state);
                }
                
                this.emit('roll:success', response);
                
                console.log('🎮 TurnService: Кубик брошен успешно');
                return response;
            }
            
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
        
        // Валидация steps
        if (!Number.isFinite(steps) || steps <= 0) {
            throw new Error('TurnService.move: invalid steps value');
        }
        
        try {
            // Эмит начала перемещения
            this.emit('move:start', { steps });
            
            // Вызов API
            const response = await this.roomApi.move(roomId, steps);
            
            // Применение состояния от сервера
            if (response.state && this.state.applyState) {
                this.state.applyState(response.state);
            }
            
            // Эмит успешного результата
            this.emit('move:success', response);
            
            console.log(`🎮 TurnService: Игрок перемещен на ${steps} шагов`);
            return response;
            
        } catch (error) {
            // Эмит ошибки
            this.emit('move:error', error);
            console.error('❌ TurnService: Ошибка перемещения:', error);
            throw error;
        } finally {
            // Всегда эмитим завершение
            this.emit('move:finish', { steps });
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
            
            // Применение состояния от сервера
            if (response.state && this.state.applyState) {
                this.state.applyState(response.state);
            }
            
            // Эмит успешного результата
            this.emit('end:success', response);
            
            console.log('🎮 TurnService: Ход завершен успешно');
            return response;
            
        } catch (error) {
            // Эмит ошибки
            this.emit('end:error', error);
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
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.TurnService = TurnService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnService;
}
