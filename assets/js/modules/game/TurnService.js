/**
 * TurnService v1.0.0
 * Клиентский сервис управления ходами игроков
 * Централизует все действия хода (бросок, перемещение, завершение) и эмитит события
 */

class TurnService extends EventTarget {
    constructor({ state, roomApi, diceService, movementService, gameStateManager, eventBus }) {
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
        this.eventBus = eventBus || null; // Добавляем eventBus для эмита событий
        this.listeners = new Map();
        this.lastRollValue = null;
        this._isRolling = false;
        this._isMoving = false;
        this._isEnding = false;
        this._lastIsMyTurnLog = null;
        this._cachedUserId = null;
        this._cachedUsername = null;
        
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

        if (this._isRolling) {
            console.warn('⚠️ TurnService: Бросок кубика уже выполняется');
            throw new Error('Dice roll already in progress');
        }

        // Защита от повторных кликов/спама: блокируем повторный roll на короткое время
        const now = Date.now();
        if (!this._lastRollAttemptTs) this._lastRollAttemptTs = 0;
        if (now - this._lastRollAttemptTs < 1000) {
            console.warn('⏳ TurnService: Повторный бросок слишком рано, игнорируем');
            throw new Error('Roll throttled');
        }
        this._lastRollAttemptTs = now;
        
        // Проверяем, что это ход текущего пользователя
        if (!this.isMyTurn()) {
            console.warn('⚠️ TurnService: Не ваш ход, бросок кубика заблокирован');
            throw new Error('Not your turn');
        }
        
        // Дополнительная проверка безопасности
        const currentUserId = this._getCurrentUserId();
        const currentUsername = this._getCurrentUsername();
        const state = this.getState();
        
        if (!state || !state.activePlayer) {
            console.warn('⚠️ TurnService: Нет активного игрока');
            throw new Error('No active player');
        }
        
        // Проверяем, что активный игрок действительно текущий пользователь
        const activePlayer = state.activePlayer;
        const isReallyMyTurn = 
            activePlayer.id === currentUserId ||
            activePlayer.userId === currentUserId ||
            (activePlayer.username && currentUsername && activePlayer.username === currentUsername);
        
        if (!isReallyMyTurn) {
            console.warn('⚠️ TurnService: Нарушение безопасности - попытка хода за другого игрока', {
                activePlayer: activePlayer.username || activePlayer.id,
                currentUser: currentUsername || currentUserId
            });
            throw new Error('Security violation: Not your turn');
        }

        let response;
        try {
            this._isRolling = true;
            // Эмит начала броска
            this.emit('roll:start', { diceChoice, isReroll });
            response = await this.roomApi.rollDice(roomId, diceChoice, isReroll);
            this._applyServerState(response?.state);
            
            // Сохраняем turnTimeRemaining из ответа сервера
            if (response?.turnTimeRemaining !== undefined && this.gameStateManager) {
                const currentState = this.gameStateManager.getState();
                if (currentState) {
                    currentState.turnTimeRemaining = response.turnTimeRemaining;
                }
            }

            // Обрабатываем результат броска - может быть один кубик или несколько
            const diceResult = response?.diceResult;
            let serverValue = null;
            let diceResults = null;
            
            if (diceResult) {
                // Если есть массив results, используем его
                if (Array.isArray(diceResult.results) && diceResult.results.length > 0) {
                    diceResults = diceResult.results;
                    serverValue = diceResult.total || diceResults.reduce((sum, val) => sum + val, 0);
                } else if (diceResult.value !== undefined) {
                    // Один кубик
                    serverValue = Number(diceResult.value);
                    diceResults = [serverValue];
                } else if (diceResult.total !== undefined) {
                    // Только сумма
                    serverValue = Number(diceResult.total);
                    diceResults = [serverValue];
                }
            }
            
            if (Number.isFinite(serverValue)) {
                this.lastRollValue = serverValue;
                if (this.diceService && typeof this.diceService.setLastRoll === 'function') {
                    this.diceService.setLastRoll({
                        value: serverValue,
                        results: diceResults,
                        diceCount: diceResult?.diceCount || diceResults?.length || 1,
                        total: serverValue
                    });
                }
            } else {
                this.lastRollValue = null;
            }

            // ИСПРАВЛЕНО: Сохраняем информацию о том, что это был наш ход ДО обновления GameStateManager
            // Это нужно для автоматического движения, так как сервер может изменить активного игрока в ответе
            const wasMyTurnBeforeUpdate = this.isMyTurn();
            
            // Эмит успешного результата
            const payload = { ...response, serverValue: this.lastRollValue, diceResult: diceResult };
            this.emit('roll:success', payload);
            
            // Эмит события для обновления кубика в нижней панели - передаем полный объект
            if (this.lastRollValue !== null) {
                this.emit('dice:rolled', { 
                    value: this.lastRollValue,
                    results: diceResults,
                    total: serverValue,
                    diceCount: diceResult?.diceCount || diceResults?.length || 1
                });
            }
            
            console.log('🎮 TurnService: Кубик брошен успешно, значение =', this.lastRollValue);

            const autoMoveValue = this.lastRollValue;
            const shouldAutoMove = options.autoMove !== false && Number.isFinite(autoMoveValue) && payload?.state?.canMove !== false;
            
            // ИСПРАВЛЕНО: Выполняем автоматическое движение ДО обновления GameStateManager
            // чтобы не потерять информацию о том, что это был наш ход
            if (shouldAutoMove && wasMyTurnBeforeUpdate) {
                try {
                    console.log('🎯 TurnService: Выполняем автоматическое движение для текущего пользователя');
                    await this.move(autoMoveValue, { requireMyTurn: false }); // requireMyTurn: false, так как мы уже проверили выше
                } catch (moveError) {
                    console.error('⚠️ TurnService: Автоматическое перемещение не удалось:', moveError);
                }
            } else if (shouldAutoMove && !wasMyTurnBeforeUpdate) {
                console.warn('⚠️ TurnService: Автоматическое движение заблокировано - не ваш ход');
            }
            
            // Обновляем GameStateManager ПОСЛЕ выполнения движения (если было)
            // Это гарантирует, что состояние обновится после всех действий
            if (response?.state && this.gameStateManager && typeof this.gameStateManager.updateFromServer === 'function') {
                this.gameStateManager.updateFromServer(response.state);
                console.log('🔄 TurnService: GameStateManager обновлен после броска кубика');
            }
            
            // Эмит события для обновления карточек и других компонентов
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                this.eventBus.emit('game:diceRolled', { value: this.lastRollValue, state: response?.state });
            }

            return payload;
        } catch (error) {
            // Эмит ошибки
            this.emit('roll:error', error);
            console.error('❌ TurnService: Ошибка броска кубика:', error);
            // Мягко подавляем HTTP 400 (не ваш ход/недоступно)
            const msg = String(error && (error.message || error))
                .toLowerCase();
            if (msg.includes('http 400') || msg.includes('not your turn')) {
                return { error: 'bad_request' };
            }
            throw error;
        } finally {
            this._isRolling = false;
            // Всегда эмитим завершение
            this.emit('roll:finish', { diceChoice, isReroll });
        }
    }
    
    /**
     * Перемещение игрока
     * @param {number} steps - Количество шагов (1-12)
     * @param {Object} options - Опции перемещения
     * @param {Object} options.player - Игрок для перемещения (опционально)
     * @returns {Promise<Object>} Результат перемещения
     */
    async move(steps, options = {}) {
        const roomId = this.state.getRoomId();
        
        if (!roomId) {
            throw new Error('TurnService.move: roomId is missing');
        }

        if (this._isMoving) {
            console.warn('⚠️ TurnService: Перемещение уже выполняется');
            throw new Error('Move already in progress');
        }
        
        // Проверяем права на выполнение действия
        const permissionCheck = this.canPerformAction({
            player: options.player,
            requireMyTurn: true,
            requireMyToken: !!options.player
        });
        
        if (!permissionCheck.canPerform) {
            console.warn('⚠️ TurnService: Действие заблокировано:', permissionCheck.reason);
            throw new Error(permissionCheck.reason);
        }
        
        const targetSteps = Number.isFinite(Number(steps)) && Number(steps) > 0
            ? Number(steps)
            : this.lastRollValue;
        
        // Валидация steps
        if (!Number.isFinite(targetSteps) || targetSteps <= 0) {
            throw new Error('TurnService.move: invalid steps value');
        }
        
        const stateSnapshot = this.getState();
        const playerContext = options.player || stateSnapshot?.activePlayer || null;
        const isInnerTrack = typeof options.isInner === 'boolean'
            ? options.isInner
            : (playerContext && typeof playerContext.isInner === 'boolean'
                ? Boolean(playerContext.isInner)
                : true);
        const trackId = isInnerTrack ? 'inner' : 'outer';

        try {
            this._isMoving = true;
            // Эмит начала перемещения
            this.emit('move:start', { steps: targetSteps });
            
            // Вызов API
            const response = await this.roomApi.move(roomId, targetSteps, {
                isInner: isInnerTrack,
                track: trackId
            });
            this._applyServerState(response?.state);
            
            // Сохраняем turnTimeRemaining из ответа сервера
            if (response?.turnTimeRemaining !== undefined && this.gameStateManager) {
                const currentState = this.gameStateManager.getState();
                if (currentState) {
                    currentState.turnTimeRemaining = response.turnTimeRemaining;
                }
            }
            
            // Эмит событий для обновления фишек через eventBus
            if (this.eventBus && response?.state?.players) {
                // Эмитим обновление позиций игроков
                const playerUpdates = response.state.players.map(player => ({
                    playerId: player.id || player.userId,
                    position: player.position,
                    player: player
                }));
                
                if (playerUpdates.length > 0) {
                    this.eventBus.emit('players:positionsUpdated', {
                        changes: playerUpdates,
                        players: response.state.players
                    });
                }
                
                // Также эмитим общее обновление игроков
                this.eventBus.emit('game:playersUpdated', {
                    players: response.state.players
                });
            }
            
            // Эмит успешного результата
            this.emit('move:success', response);
            
            // Обновляем GameStateManager после действия игрока (движение)
            if (response?.state && this.gameStateManager && typeof this.gameStateManager.updateFromServer === 'function') {
                this.gameStateManager.updateFromServer(response.state);
                console.log('🔄 TurnService: GameStateManager обновлен после движения игрока');
            }
            
            // Эмит события для обновления карточек и других компонентов
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                this.eventBus.emit('game:playerMoved', { state: response?.state, steps: targetSteps });
            }
            
            console.log('✅ move:success', { roomId, steps: targetSteps, server: true, moveResult: response.moveResult });
            console.log(`🎮 TurnService: Игрок перемещен на ${targetSteps} шагов`);
            this.lastRollValue = null;
            return response;
            
        } catch (error) {
            // Эмит ошибки
            this.emit('move:error', error);
            console.error('❌ move:error', { roomId, steps: targetSteps, error });
            console.error('❌ TurnService: Ошибка перемещения:', error);
            throw error;
        } finally {
            this._isMoving = false;
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

        if (this._isEnding) {
            console.warn('⚠️ TurnService: Завершение хода уже выполняется');
            throw new Error('End turn already in progress');
        }

        const permissionCheck = this.canPerformAction({ requireMyTurn: true });
        if (!permissionCheck.canPerform) {
            console.warn('⚠️ TurnService: Завершение хода запрещено', permissionCheck.reason);
            throw new Error(permissionCheck.reason || 'Not your turn');
        }

        if (!this.canEndTurn()) {
            throw new Error('TurnService.endTurn: cannot end turn right now');
        }
        
        try {
            this._isEnding = true;
            // Эмит начала завершения хода
            this.emit('end:start');
            
            // Вызов API
            const response = await this.roomApi.endTurn(roomId);
            this._applyServerState(response?.state);
            
            // Сохраняем turnTimeRemaining из ответа сервера
            if (response?.turnTimeRemaining !== undefined && this.gameStateManager) {
                const currentState = this.gameStateManager.getState();
                if (currentState) {
                    currentState.turnTimeRemaining = response.turnTimeRemaining;
                }
            }
            
            // Эмит успешного результата
            this.emit('end:success', response);
            
            // Обновляем GameStateManager после действия игрока (завершение хода)
            if (response?.state && this.gameStateManager && typeof this.gameStateManager.updateFromServer === 'function') {
                this.gameStateManager.updateFromServer(response.state);
                console.log('🔄 TurnService: GameStateManager обновлен после завершения хода');
            }
            
            // Эмит события для обновления карточек и других компонентов
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                this.eventBus.emit('game:turnEnded', { state: response?.state });
            }
            
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
            this._isEnding = false;
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
        if (typeof handler !== 'function') {
            return;
        }
        
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        const wrappedHandler = (customEvent) => {
            try {
                handler(customEvent?.detail);
            } catch (error) {
                console.error(`❌ TurnService: Ошибка в обработчике события ${event}:`, error);
            }
        };
        
        this.listeners.get(event).add({ original: handler, wrapped: wrappedHandler });
        this.addEventListener(event, wrappedHandler);
    }
    
    /**
     * Удаление слушателя события
     * @param {string} event - Название события
     * @param {Function} handler - Обработчик события
     */
    off(event, handler) {
        const handlers = this.listeners.get(event);
        if (!handlers || !handlers.size) {
            return;
        }
        
        for (const entry of handlers) {
            if (entry.original === handler) {
                this.removeEventListener(event, entry.wrapped);
                handlers.delete(entry);
                break;
            }
        }
        
        if (handlers.size === 0) {
            this.listeners.delete(event);
        }
    }
    
    /**
     * Эмит события
     * @param {string} event - Название события
     * @param {*} data - Данные события
     */
    emit(event, data) {
        const customEvent = new CustomEvent(event, { detail: data });
        this.dispatchEvent(customEvent);
    }
    
    /**
     * Получение текущего состояния игры
     * @returns {Object} Состояние игры
     */
    getState() {
        // Используем GameStateManager как основной источник состояния
        if (this.gameStateManager) {
            return this.gameStateManager.getState();
        }
        // Fallback на старый state
        return this.state ? this.state.getState() : null;
    }
    
    /**
     * Проверка возможности броска кубика
     * @returns {boolean} Можно ли бросить кубик
     */
    canRoll() {
        try {
            const state = this.getState();
            const isMyTurn = this.isMyTurn();
            
            // Если не мой ход, нельзя бросать
            if (!isMyTurn) {
                // ИСПРАВЛЕНО: Убрано избыточное логирование для уменьшения спама
                // console.log('🎲 TurnService.canRoll -> false (не мой ход)');
                return false;
            }
            
            // Проверяем состояние из GameStateManager (приоритет)
            if (this.gameStateManager) {
                const gameState = this.gameStateManager.getState();
                if (gameState) {
                    // Если canRoll явно false, запрещаем
                    if (gameState.canRoll === false) {
                        // ИСПРАВЛЕНО: Убрано избыточное логирование для уменьшения спама
                        // console.log('🎲 TurnService.canRoll -> false (state.canRoll === false)', { isMyTurn, stateCanRoll: gameState.canRoll, source: 'GameStateManager' });
                        return false;
                    }
                    // Если canRoll === true или undefined/null, разрешаем (если это мой ход)
                    if (gameState.canRoll === true || gameState.canRoll === undefined || gameState.canRoll === null) {
                        // ИСПРАВЛЕНО: Убрано избыточное логирование
                        // console.log('🎲 TurnService.canRoll -> true', { isMyTurn, stateCanRoll: gameState.canRoll, source: 'GameStateManager' });
                        return true;
                    }
                }
            }
            
            // Fallback: проверяем состояние из локального state
            if (state) {
                // Если canRoll явно false, запрещаем
                if (state.canRoll === false) {
                    // ИСПРАВЛЕНО: Убрано избыточное логирование
                    // console.log('🎲 TurnService.canRoll -> false (state.canRoll === false)', { isMyTurn, stateCanRoll: state.canRoll, source: 'localState' });
                    return false;
                }
                // Если canRoll === true или undefined/null, разрешаем (если это мой ход)
                if (state.canRoll === true || state.canRoll === undefined || state.canRoll === null) {
                    // ИСПРАВЛЕНО: Убрано избыточное логирование
                    // console.log('🎲 TurnService.canRoll -> true', { isMyTurn, stateCanRoll: state.canRoll, source: 'localState' });
                    return true;
                }
            }
            
            // Если состояние не готово, но это мой ход - разрешаем (для начального состояния)
            // ИСПРАВЛЕНО: Убрано избыточное логирование
            // console.log('🎲 TurnService.canRoll -> true (мой ход, состояние не готово)');
            return true;
        } catch (e) {
            console.warn('⚠️ TurnService.canRoll: ошибка при проверке:', e);
            return false; // Безопаснее запретить бросок при ошибке
        }
    }
    
    /**
     * Проверка возможности перемещения
     * @returns {boolean} Можно ли перемещаться
     */
    canMove() {
        const state = this.getState();
        if (state && state.canMove === true) {
            return true;
        }
        
        // Даем возможность двигаться в демо/одиночном режиме,
        // даже если GameState не успел отметить canMove = true
        const roomId = state?.roomId || this.state?.getRoomId?.();
        const playersCount = Array.isArray(state?.players) ? state.players.length : 0;
        if (!state || roomId === 'demo' || playersCount <= 1) {
            console.warn('⚠️ TurnService.canMove: Используем fallback (демо/одиночный режим)');
            return true;
        }
        
        return false;
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
                // В демо/одиночной игре разрешаем действия как "мой ход"
                const playersCount = Array.isArray(state?.players) ? state.players.length : 0;
                const roomId = state?.roomId || this.state?.getRoomId?.();
                if (roomId === 'demo' || playersCount <= 1) {
                    return true;
                }
                console.warn('⚠️ TurnService.isMyTurn: Нет активного игрока');
                return false;
            }
            
            // Получаем ID текущего пользователя
            const currentUserId = this._getCurrentUserId();
            const currentUsername = this._getCurrentUsername();
            
            // Сравниваем с активным игроком
            const activePlayer = state.activePlayer;
            
            // ИСПРАВЛЕНО: Приоритет проверки по userId, username только как fallback
            // Нормализуем значения для сравнения
            const normalizedActiveUserId = String(activePlayer.userId || activePlayer.id || '').trim();
            const normalizedActiveId = String(activePlayer.id || '').trim();
            const normalizedCurrentUserId = String(currentUserId || '').trim();
            const normalizedActiveUsername = String(activePlayer.username || '').trim();
            const normalizedCurrentUsername = String(currentUsername || '').trim();
            
            // ИСПРАВЛЕНО: Проверяем, что текущий userId есть среди игроков комнаты
            // Если userId не найден в списке игроков, это не наш ход
            let isCurrentUserInRoom = false;
            if (normalizedCurrentUserId !== '' && Array.isArray(state.players)) {
                isCurrentUserInRoom = state.players.some(player => {
                    const playerUserId = String(player.userId || player.id || '').trim();
                    return playerUserId === normalizedCurrentUserId;
                });
            }
            
            // Проверяем по userId (приоритет)
            const matchesUserId = normalizedActiveUserId === normalizedCurrentUserId && normalizedActiveUserId !== '';
            const matchesId = normalizedActiveId === normalizedCurrentUserId && normalizedActiveId !== '';
            
            // ИСПРАВЛЕНО: Проверка по username только если userId не найден у текущего пользователя
            // И только если текущий пользователь есть в комнате (проверка по username)
            const hasCurrentUserId = normalizedCurrentUserId !== '';
            const matchesUsername = !hasCurrentUserId && // Только если userId не найден
                !matchesUserId && !matchesId && 
                normalizedActiveUsername !== '' && 
                normalizedCurrentUsername !== '' &&
                normalizedActiveUsername === normalizedCurrentUsername &&
                // Дополнительная проверка: username должен совпадать с одним из игроков
                Array.isArray(state.players) && state.players.some(p => 
                    String(p.username || '').trim() === normalizedCurrentUsername
                );
            
            // ИСПРАВЛЕНО: Если userId есть, но не найден в комнате - это не наш ход
            const isMyTurn = (matchesUserId || matchesId || matchesUsername) && 
                (hasCurrentUserId ? isCurrentUserInRoom : true);
            
            // Разрешаем ход в демо/одиночном режиме для удобства тестирования
            const playersCount = Array.isArray(state.players) ? state.players.length : 0;
            const roomId = state?.roomId || this.state?.getRoomId?.();
            const demoOverride = (roomId === 'demo' || playersCount <= 1);
            if (!isMyTurn && demoOverride) {
                return true;
            }
            
            // Убираем избыточное логирование для предотвращения спама
            if (this._lastIsMyTurnLog !== isMyTurn) {
                console.log('🎯 TurnService.isMyTurn:', isMyTurn, { 
                    activePlayerId: activePlayer.id,
                    activePlayerUserId: activePlayer.userId,
                    activePlayerUsername: activePlayer.username,
                    currentUserId: currentUserId,
                    currentUsername: currentUsername,
                    matchesUserId,
                    matchesId,
                    matchesUsername,
                    reason: isMyTurn ? 'Ход совпадает' : 'Ход не совпадает'
                });
                this._lastIsMyTurnLog = isMyTurn;
            }
            
            return isMyTurn;
        } catch (error) {
            console.error('❌ TurnService.isMyTurn: Ошибка проверки хода:', error);
            return false;
        }
    }
    
    /**
     * Проверка, является ли указанный игрок текущим пользователем
     * @param {Object} player - Игрок для проверки
     * @returns {boolean} Мой ли это игрок
     */
    isMyToken(player) {
        try {
            if (!player) {
                console.warn('⚠️ TurnService.isMyToken: Игрок не указан');
                return false;
            }
            
            const currentUserId = this._getCurrentUserId();
            const currentUsername = this._getCurrentUsername();
            
            const isMyToken = 
                player.id === currentUserId ||
                player.userId === currentUserId ||
                (player.username && currentUsername && player.username === currentUsername);
            
            console.log('🎯 TurnService.isMyToken:', isMyToken, { 
                player: player.username || player.id, 
                currentUser: currentUsername || currentUserId 
            });
            
            return isMyToken;
        } catch (error) {
            console.error('❌ TurnService.isMyToken: Ошибка проверки токена:', error);
            return false;
        }
    }
    
    /**
     * Проверка, может ли текущий пользователь выполнить действие
     * @param {Object} options - Опции проверки
     * @param {Object} options.player - Игрок (для проверки токена)
     * @param {boolean} options.requireMyTurn - Требуется ли мой ход
     * @param {boolean} options.requireMyToken - Требуется ли мой токен
     * @returns {Object} Результат проверки
     */
    canPerformAction(options = {}) {
        const { player = null, requireMyTurn = true, requireMyToken = false } = options;
        
        const result = {
            canPerform: true,
            reason: null,
            checks: {
                myTurn: true,
                myToken: true
            }
        };
        
        // Проверяем ход
        if (requireMyTurn) {
            result.checks.myTurn = this.isMyTurn();
            if (!result.checks.myTurn) {
                result.canPerform = false;
                result.reason = 'Not your turn';
            }
        }
        
        // Проверяем токен
        if (requireMyToken && player) {
            result.checks.myToken = this.isMyToken(player);
            if (!result.checks.myToken) {
                result.canPerform = false;
                result.reason = 'Not your token';
            }
        }
        
        console.log('🔍 TurnService.canPerformAction:', result);
        return result;
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     * @private
     */
    _getCurrentUserId() {
        try {
            // Кэшируем результат для предотвращения спама
            if (this._cachedUserId) {
                return this._cachedUserId;
            }
            
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                const userId = bundle?.currentUser?.id || bundle?.currentUser?.userId;
                if (userId) {
                    this._cachedUserId = userId;
                    console.log('🔍 TurnService: ID пользователя из bundle:', userId);
                    return userId;
                }
            }
            
            // Пытаемся получить из localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                const userId = user?.id || user?.userId;
                if (userId) {
                    this._cachedUserId = userId;
                    console.log('🔍 TurnService: ID пользователя из localStorage:', userId);
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
                        this._cachedUserId = userId;
                        console.log('🔍 TurnService: ID пользователя из userModel:', userId);
                        return userId;
                    }
                }
            }
            
            console.warn('⚠️ TurnService: ID пользователя не найден');
            return null;
        } catch (error) {
            console.error('❌ TurnService: Ошибка получения ID пользователя:', error);
            return null;
        }
    }
    
    /**
     * Получение username текущего пользователя
     * @returns {string|null} Username пользователя
     * @private
     */
    _getCurrentUsername() {
        // ИСПРАВЛЕНО: Используем общую утилиту CommonUtils вместо дублирования логики
        if (window.CommonUtils && typeof window.CommonUtils.getCurrentUsername === 'function') {
            const username = window.CommonUtils.getCurrentUsername();
            if (username) {
                // Кэшируем результат
                this._cachedUsername = username;
                return username;
            }
        }
        
        // Fallback для обратной совместимости
        try {
            if (this._cachedUsername) {
                return this._cachedUsername;
            }
            
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                const username = bundle?.currentUser?.username || bundle?.currentUser?.name;
                if (username) {
                    this._cachedUsername = username;
                    return username;
                }
            }
            
            // Пытаемся получить из localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                const username = user?.username || user?.name;
                if (username) {
                    this._cachedUsername = username;
                    console.log('🔍 TurnService: Username из localStorage:', username);
                    return username;
                }
            }
            
            // Пытаемся получить из глобального объекта app
            if (window.app && window.app.getModule) {
                const userModel = window.app.getModule('userModel');
                if (userModel && userModel.getCurrentUser) {
                    const currentUser = userModel.getCurrentUser();
                    if (currentUser && (currentUser.username || currentUser.name)) {
                        const username = currentUser.username || currentUser.name;
                        this._cachedUsername = username;
                        console.log('🔍 TurnService: Username из userModel:', username);
                        return username;
                    }
                }
            }
            
            console.warn('⚠️ TurnService: Username пользователя не найден');
            return null;
        } catch (error) {
            console.error('❌ TurnService: Ошибка получения username пользователя:', error);
            return null;
        }
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
        for (const [event, handlers] of this.listeners.entries()) {
            handlers.forEach(({ wrapped }) => {
                this.removeEventListener(event, wrapped);
            });
        }
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
