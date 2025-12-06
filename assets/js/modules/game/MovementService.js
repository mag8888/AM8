/**
 * MovementService v1.0.0
 * -----------------------------------------------------------------------------
 * Сервис для расчета движения фишек по игровому полю
 */
class MovementService {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        
        // Конфигурация поля
        this.outerTrackSize = 44; // Количество клеток внешнего трека
        this.innerTrackSize = 24; // Количество клеток внутреннего трека
        
        // Позиции игроков
        this.playerPositions = new Map();
        
        // Состояние движения
        this.isMoving = false;
        this.currentMovement = null;
        
        console.log('🚀 MovementService: Инициализация...');
        this.setupEventListeners();
        console.log('✅ MovementService: Инициализация завершена');
    }
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('dice:rolled', this.handleDiceRoll.bind(this));
            this.eventBus.on('game:player_joined', this.handlePlayerJoined.bind(this));
            this.eventBus.on('game:player_left', this.handlePlayerLeft.bind(this));
            this.eventBus.on('game:reset', this.reset.bind(this));
        }
    }
    
    /**
     * Обработка броска кубика
     */
    handleDiceRoll(rollResult) {
        if (this.gameState && this.gameState.activePlayer) {
            // ВАЖНО: Проверяем, что это ход текущего пользователя
            const currentUserId = this._getCurrentUserId();
            const activePlayer = this.gameState.activePlayer;
            
            const isMyTurn = 
                activePlayer.id === currentUserId ||
                activePlayer.userId === currentUserId ||
                (activePlayer.username && currentUserId && activePlayer.username === currentUserId);
            
            if (!isMyTurn) {
                console.warn('⚠️ MovementService: Автоматическое движение заблокировано - не ваш ход');
                return;
            }
            
            console.log('🎯 MovementService: Выполняем автоматическое движение для текущего пользователя');
            this.movePlayer(this.gameState.activePlayer.id, rollResult.total, {
                stepDelayMs: 500
            }).catch((error) => {
                console.error('❌ MovementService: Ошибка автоматического движения', error);
            });
        }
    }
    
    /**
     * Получение ID текущего пользователя
     */
    _getCurrentUserId() {
        try {
            // Из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle.userId || bundle.id || bundle.username || bundle.currentUser?.id || bundle.currentUser?.username;
            }
            
            // Из localStorage
            const userData = localStorage.getItem('aura_money_user');
            if (userData) {
                const user = JSON.parse(userData);
                return user.id || user.userId || user.username;
            }
            
            // Из window.app
            if (window.app) {
                const userModel = window.app.getModule('userModel');
                if (userModel) {
                    return userModel.getId() || userModel.getUsername();
                }
            }
        } catch (error) {
            console.warn('⚠️ MovementService: Ошибка получения ID пользователя:', error);
        }
        
        return null;
    }
    
    /**
     * Обработка присоединения игрока
     */
    handlePlayerJoined(player) {
        this.initializePlayerPosition(player.id);
    }
    
    /**
     * Обработка выхода игрока
     */
    handlePlayerLeft(playerId) {
        this.playerPositions.delete(playerId);
    }
    
    /**
     * Инициализация позиции игрока (стартовая позиция)
     */
    initializePlayerPosition(playerId) {
        const startPosition = {
            track: 'inner', // Начинаем с внутреннего трека
            position: 23,    // Клетка #24 (последняя клетка внутреннего трека)
            totalMoves: 0   // Общее количество ходов
        };
        
        this.playerPositions.set(playerId, startPosition);
        console.log(`🚀 MovementService: Инициализирована позиция игрока ${playerId}:`, startPosition);
        
        if (this.eventBus) {
            this.eventBus.emit('movement:position_initialized', {
                playerId,
                position: startPosition
            });
        }
    }
    
    /**
     * Движение игрока на указанное количество клеток
     */
    async movePlayer(playerId, steps, options = {}) {
        if (this.isMoving) {
            console.warn('🚀 MovementService: Движение уже выполняется', {
                currentMovement: this.currentMovement,
                playerId: playerId,
                requestedSteps: steps
            });
            throw new Error('Movement already in progress');
        }
        
        const currentPosition = this.playerPositions.get(playerId);
        if (!currentPosition) {
            console.error(`🚀 MovementService: Позиция игрока ${playerId} не найдена`);
            this.initializePlayerPosition(playerId);
            return this.movePlayer(playerId, steps, options);
        }
        
        this.isMoving = true;
        
        // Объявляем movement вне try, чтобы она была доступна для return
        let movement = null;
        
        // Устанавливаем таймаут для автоматического сброса флага (на случай зависания)
        const timeoutId = setTimeout(() => {
            if (this.isMoving) {
                console.warn('⚠️ MovementService: Движение зависло, принудительно сбрасываем флаг', {
                    playerId,
                    steps,
                    movement: this.currentMovement
                });
                this.isMoving = false;
                this.currentMovement = null;
            }
        }, 30000); // 30 секунд таймаут
        
        try {
        // Создаем объект движения
            movement = {
            id: this.generateMovementId(),
            playerId,
            steps,
            startPosition: { ...currentPosition },
            endPosition: null,
            path: [],
            timestamp: Date.now()
        };
        
        // Рассчитываем путь движения
        movement.path = this.calculatePath(currentPosition, steps);
        movement.endPosition = movement.path[movement.path.length - 1];
        
        // Обновляем позицию игрока
        this.playerPositions.set(playerId, movement.endPosition);
        this.currentMovement = movement;
        
        console.log(`🚀 MovementService: Игрок ${playerId} движется на ${steps} клеток:`, movement);
        
        const stepDelayMs = Number(options.stepDelayMs);
        await this.emitMovementEvents(movement, {
            stepDelayMs: Number.isFinite(stepDelayMs) && stepDelayMs > 0 ? stepDelayMs : 0
        });
        } catch (error) {
            console.error('❌ MovementService: Ошибка во время движения:', error);
            // При ошибке возвращаем позицию игрока к начальной
            if (movement && movement.startPosition) {
                this.playerPositions.set(playerId, movement.startPosition);
            } else if (this.currentMovement && this.currentMovement.startPosition) {
                this.playerPositions.set(playerId, this.currentMovement.startPosition);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        this.isMoving = false;
            const completedMovement = this.currentMovement;
        this.currentMovement = null;
            console.log(`✅ MovementService: Движение завершено для игрока ${playerId}`);
        }
        
        return movement;
    }
    
    /**
     * Расчет пути движения
     */
    calculatePath(startPosition, steps) {
        const path = [];
        let currentPos = { ...startPosition };
        
        for (let step = 0; step < steps; step++) {
            // Двигаемся на одну клетку
            currentPos = this.moveOneStep(currentPos);
            path.push({ ...currentPos });
        }
        
        return path;
    }
    
    /**
     * Движение на одну клетку
     */
    moveOneStep(position) {
        const newPosition = { ...position };
        newPosition.position++;
        newPosition.totalMoves++;
        
        // Проверяем переход между треками
        if (position.track === 'outer') {
            // На внешнем треке - проверяем переход на внутренний
            if (newPosition.position >= this.outerTrackSize) {
                // Переходим на внутренний трек
                newPosition.track = 'inner';
                newPosition.position = 0; // Начинаем с первой клетки внутреннего трека
                
                if (this.eventBus) {
                    this.eventBus.emit('movement:track_changed', {
                        playerId: this.getCurrentPlayerId(),
                        fromTrack: 'outer',
                        toTrack: 'inner',
                        position: newPosition
                    });
                }
            }
        } else if (position.track === 'inner') {
            // На внутреннем треке - проверяем завершение круга
            if (newPosition.position >= this.innerTrackSize) {
                // Завершаем внутренний круг, возвращаемся на внешний
                newPosition.track = 'outer';
                newPosition.position = 0;
                
                if (this.eventBus) {
                    this.eventBus.emit('movement:inner_circle_completed', {
                        playerId: this.getCurrentPlayerId(),
                        position: newPosition
                    });
                }
            }
        }
        
        return newPosition;
    }
    
    /**
     * Получение ID текущего игрока
     */
    getCurrentPlayerId() {
        if (this.gameState && this.gameState.activePlayer) {
            return this.gameState.activePlayer.id;
        }
        return null;
    }
    
    /**
     * Генерация уникального ID для движения
     */
    generateMovementId() {
        return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Отправка событий движения
     */
    emitMovementEvents(movement, options = {}) {
        if (!this.eventBus) {
            return Promise.resolve(movement);
        }

        const stepDelayMs = Number(options.stepDelayMs);
        const path = Array.isArray(movement.path) ? movement.path : [];

        // Событие начала движения
        this.eventBus.emit('movement:started', {
            playerId: movement.playerId,
            steps: movement.steps,
            path: movement.path,
            movement
        });

        if (!path.length || !Number.isFinite(stepDelayMs) || stepDelayMs <= 0) {
            path.forEach((stepPosition, index) => {
                this.eventBus.emit('movement:step', {
                    playerId: movement.playerId,
                    step: index + 1,
                    totalSteps: path.length,
                    position: stepPosition,
                    isFinal: index === path.length - 1
                });
            });

            this.eventBus.emit('movement:completed', movement);
            this.eventBus.emit('movement:landed', {
                playerId: movement.playerId,
                position: movement.endPosition,
                cellData: this.getCellData(movement.endPosition)
            });

            return Promise.resolve(movement);
        }

        return new Promise((resolve) => {
            const iterate = (index) => {
                const stepPosition = path[index];
                const isFinal = index === path.length - 1;

                this.eventBus.emit('movement:step', {
                    playerId: movement.playerId,
                    step: index + 1,
                    totalSteps: path.length,
                    position: stepPosition,
                    isFinal
                });

                if (isFinal) {
                    this.eventBus.emit('movement:completed', movement);
                    this.eventBus.emit('movement:landed', {
                        playerId: movement.playerId,
                        position: movement.endPosition,
                        cellData: this.getCellData(movement.endPosition)
                    });
                    resolve(movement);
                    return;
                }

                setTimeout(() => iterate(index + 1), stepDelayMs);
            };

            iterate(0);
        });
    }
    
    /**
     * Получение данных клетки по позиции
     */
    getCellData(position) {
        const { track, position: cellIndex } = position;
        
        if (track === 'outer') {
            return window.BoardConfig?.BIG_CIRCLE[cellIndex] || null;
        } else if (track === 'inner') {
            return window.BoardConfig?.SMALL_CIRCLE[cellIndex] || null;
        }
        
        return null;
    }
    
    /**
     * Получение позиции игрока
     */
    getPlayerPosition(playerId) {
        return this.playerPositions.get(playerId) || null;
    }
    
    /**
     * Получение всех позиций игроков
     */
    getAllPositions() {
        const positions = {};
        this.playerPositions.forEach((position, playerId) => {
            positions[playerId] = position;
        });
        return positions;
    }
    
    /**
     * Установка позиции игрока (для синхронизации)
     */
    setPlayerPosition(playerId, position) {
        this.playerPositions.set(playerId, position);
        
        if (this.eventBus) {
            this.eventBus.emit('movement:position_synced', {
                playerId,
                position
            });
        }
    }
    
    /**
     * Проверка, может ли игрок двигаться
     */
    canMove(playerId) {
        // Проверяем, не выполняется ли уже движение
        if (this.isMoving) {
            return false;
        }
        
        // Проверяем состояние игры
        if (this.gameState) {
            return this.gameState.canMove;
        }
        
        return true;
    }
    
    /**
     * Получение информации о текущем движении
     */
    getCurrentMovement() {
        return this.currentMovement;
    }
    
    /**
     * Сброс состояния
     */
    reset() {
        this.playerPositions.clear();
        this.isMoving = false;
        this.currentMovement = null;
        console.log('🚀 MovementService: Состояние сброшено');
    }
    
    /**
     * Получение статистики движения
     */
    getStats() {
        const stats = {
            totalPlayers: this.playerPositions.size,
            isMoving: this.isMoving,
            positions: this.getAllPositions()
        };
        
        return stats;
    }
    
    /**
     * Форматирование позиции для отображения
     */
    formatPosition(position) {
        if (!position) return 'Неизвестно';
        
        const { track, position: cellIndex, totalMoves } = position;
        const trackName = track === 'outer' ? 'Внешний' : 'Внутренний';
        
        return `${trackName} круг, клетка ${cellIndex + 1} (ходов: ${totalMoves})`;
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.MovementService = MovementService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MovementService;
}
