/**
 * GameState - управление состоянием игры
 */
class GameState {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameStarted = false;
        this.lastDiceRoll = null;
        this.roomId = null;
        this.gameState = {
            canRoll: false,
            canMove: false,
            canEndTurn: false,
            activePlayer: null,
            lastDiceResult: null
        };
        
        console.log('✅ GameState инициализирован');
    }

    /**
     * Начать новую игру
     * @param {Array} players - Массив игроков
     */
    startGame(players = [{ 
        name: 'Игрок 1', 
        position: 0, 
        isInner: false, 
        money: 5000,
        salary: 5000,
        totalIncome: 0,
        monthlyExpenses: 2000,
        assets: [],
        dreams: []
    }]) {
        this.players = players;
        this.currentPlayerIndex = 0;
        this.gameStarted = true;
        this.lastDiceRoll = null;
        
        console.log('🎮 GameState: Игра начата', this.players);
        
        if (this.eventBus) {
            this.eventBus.emit('game:started', {
                players: this.players
            });
        }
    }

    /**
     * Бросить кубик
     * @returns {number} - Результат броска
     */
    rollDice() {
        const roll = Math.floor(Math.random() * 6) + 1;
        this.lastDiceRoll = roll;
        
        console.log('🎲 GameState: Бросок кубика =', roll);
        
        if (this.eventBus) {
            this.eventBus.emit('dice:rolled', {
                roll: roll,
                player: this.getCurrentPlayer()
            });
        }
        
        return roll;
    }

    /**
     * Переместить текущего игрока
     * @param {number} steps - Количество шагов
     */
    moveCurrentPlayer(steps) {
        const player = this.getCurrentPlayer();
        if (!player) {
            console.error('❌ GameState: Нет активного игрока');
            return;
        }

        const oldPosition = player.position;
        const oldIsInner = player.isInner;
        
        // Простая логика перемещения (без учета переходов между треками)
        const maxPosition = player.isInner ? 
            window.SMALL_CIRCLE_CELLS.length - 1 : 
            window.BIG_CIRCLE_CELLS.length - 1;
        
        player.position = (player.position + steps) % (maxPosition + 1);
        
        console.log(`🚶 GameState: ${player.name} переместился с ${oldPosition} на ${player.position}`);
        
        if (this.eventBus) {
            this.eventBus.emit('player:moved', {
                player: player,
                oldPosition: oldPosition,
                oldIsInner: oldIsInner,
                position: player.position,
                isInner: player.isInner
            });
        }
    }

    /**
     * Получить текущего игрока
     * @returns {Object} - Данные игрока
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Переключить на следующего игрока
     */
    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        const player = this.getCurrentPlayer();
        console.log(`👤 GameState: Ход игрока ${player.name}`);
        
        if (this.eventBus) {
            this.eventBus.emit('player:changed', {
                player: player,
                index: this.currentPlayerIndex
            });
        }
    }

    /**
     * Обновить деньги игрока
     * @param {number} amount - Сумма (положительная или отрицательная)
     */
    updatePlayerMoney(amount) {
        const player = this.getCurrentPlayer();
        if (!player) {
            return;
        }

        const oldMoney = player.money;
        player.money += amount;
        
        console.log(`💰 GameState: ${player.name} деньги: ${oldMoney} → ${player.money}`);
        
        if (this.eventBus) {
            this.eventBus.emit('player:money-changed', {
                player: player,
                oldMoney: oldMoney,
                newMoney: player.money,
                change: amount
            });
        }
    }

    /**
     * Получить состояние игры
     * @returns {Object} - Текущее состояние
     */
    getState() {
        return {
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayer: this.getCurrentPlayer(),
            gameStarted: this.gameStarted,
            lastDiceRoll: this.lastDiceRoll,
            ...this.gameState
        };
    }
    
    /**
     * Установить ID комнаты
     * @param {string} roomId - ID комнаты
     */
    setRoomId(roomId) {
        this.roomId = roomId;
        console.log('🏠 GameState: Установлен ID комнаты:', roomId);
    }
    
    /**
     * Получить ID комнаты
     * @returns {string} ID комнаты
     */
    getRoomId() {
        return this.roomId;
    }
    
    /**
     * Применить состояние от сервера
     * @param {Object} serverState - Состояние от сервера
     */
    applyState(serverState) {
        if (serverState.players) {
            this.players = serverState.players;
        }
        
        if (serverState.currentPlayerIndex !== undefined) {
            this.currentPlayerIndex = serverState.currentPlayerIndex;
        }
        
        if (serverState.gameStarted !== undefined) {
            this.gameStarted = serverState.gameStarted;
        }
        
        if (serverState.lastDiceRoll !== undefined) {
            this.lastDiceRoll = serverState.lastDiceRoll;
        }
        
        // Обновляем игровое состояние
        if (serverState.canRoll !== undefined) {
            this.gameState.canRoll = serverState.canRoll;
        }
        
        if (serverState.canMove !== undefined) {
            this.gameState.canMove = serverState.canMove;
        }
        
        if (serverState.canEndTurn !== undefined) {
            this.gameState.canEndTurn = serverState.canEndTurn;
        }
        
        if (serverState.activePlayer) {
            this.gameState.activePlayer = serverState.activePlayer;
        }
        
        if (serverState.lastDiceResult) {
            this.gameState.lastDiceResult = serverState.lastDiceResult;
        }
        
        console.log('🔄 GameState: Состояние обновлено от сервера');
        
        // Эмитим событие обновления
        if (this.eventBus) {
            this.eventBus.emit('game:stateUpdated', this.getState());
        }
    }
    
    /**
     * Получить активного игрока
     * @returns {Object} Активный игрок
     */
    getActivePlayer() {
        return this.gameState.activePlayer || this.getCurrentPlayer();
    }
    
    /**
     * Обновить позицию игрока
     * @param {string} playerId - ID игрока
     * @param {number} position - Новая позиция
     */
    updatePlayerPosition(playerId, position) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.position = position;
            console.log(`📍 GameState: Позиция игрока ${playerId} обновлена на ${position}`);
            
            if (this.eventBus) {
                this.eventBus.emit('player:positionUpdated', {
                    playerId,
                    position,
                    player
                });
            }
        }
    }
    
    /**
     * Установить активного игрока
     * @param {string} playerId - ID игрока
     */
    setActivePlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            this.gameState.activePlayer = player;
            this.currentPlayerIndex = this.players.findIndex(p => p.id === playerId);
            
            console.log(`🎯 GameState: Активный игрок установлен: ${playerId}`);
            
            if (this.eventBus) {
                this.eventBus.emit('game:activePlayerChanged', {
                    activePlayer: player,
                    playerIndex: this.currentPlayerIndex
                });
            }
        }
    }
}

window.GameState = GameState;

