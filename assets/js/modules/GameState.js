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
            lastDiceRoll: this.lastDiceRoll
        };
    }
}

window.GameState = GameState;

