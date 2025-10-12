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
        this.innerTrackSize = 23; // Количество клеток внутреннего трека
        
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
            this.movePlayer(this.gameState.activePlayer.id, rollResult.total);
        }
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
            track: 'outer', // Начинаем с внешнего трека
            position: 0,    // Первая клетка (Паспортный доход)
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
    movePlayer(playerId, steps) {
        if (this.isMoving) {
            console.warn('🚀 MovementService: Движение уже выполняется');
            return null;
        }
        
        const currentPosition = this.playerPositions.get(playerId);
        if (!currentPosition) {
            console.error(`🚀 MovementService: Позиция игрока ${playerId} не найдена`);
            this.initializePlayerPosition(playerId);
            return this.movePlayer(playerId, steps);
        }
        
        this.isMoving = true;
        
        // Создаем объект движения
        const movement = {
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
        
        // Отправляем события
        this.emitMovementEvents(movement);
        
        this.isMoving = false;
        this.currentMovement = null;
        
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
    emitMovementEvents(movement) {
        if (this.eventBus) {
            // Основное событие движения
            this.eventBus.emit('movement:completed', movement);
            
            // Событие для каждой клетки в пути
            movement.path.forEach((stepPosition, index) => {
                this.eventBus.emit('movement:step', {
                    playerId: movement.playerId,
                    step: index + 1,
                    position: stepPosition,
                    isFinal: index === movement.path.length - 1
                });
            });
            
            // Событие о попадании на финальную клетку
            const finalPosition = movement.endPosition;
            this.eventBus.emit('movement:landed', {
                playerId: movement.playerId,
                position: finalPosition,
                cellData: this.getCellData(finalPosition)
            });
        }
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
