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
        
        // Инициализируем модуль профессий
        this.professionModule = new ProfessionModule();
        
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
     * Получить игрока по ID
     * @param {string} playerId 
     * @returns {Object|null}
     */
    getPlayerById(playerId) {
        return this.players.find(player => player.id === playerId) || null;
    }

    /**
     * Применить профессию к игроку
     * @param {string} playerId 
     * @param {string} professionId 
     * @returns {boolean}
     */
    applyProfessionToPlayer(playerId, professionId) {
        const player = this.getPlayerById(playerId);
        if (!player) {
            console.error('❌ GameState: Игрок не найден:', playerId);
            return false;
        }

        const updatedPlayer = this.professionModule.applyProfessionToPlayer(player, professionId);
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        
        if (playerIndex !== -1) {
            this.players[playerIndex] = updatedPlayer;
            console.log('✅ GameState: Профессия применена к игроку:', player.username, professionId);
            
            // Уведомляем о изменении игрока
            if (this.eventBus) {
                this.eventBus.emit('player:professionChanged', {
                    player: updatedPlayer,
                    professionId: professionId
                });
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Получить доступные профессии
     * @returns {Array}
     */
    getAvailableProfessions() {
        return this.professionModule.getActiveProfessions();
    }

    /**
     * Погасить долг игрока
     * @param {string} playerId 
     * @param {string} debtId 
     * @param {number} amount 
     * @returns {boolean}
     */
    payOffPlayerDebt(playerId, debtId, amount) {
        const player = this.getPlayerById(playerId);
        if (!player) {
            console.error('❌ GameState: Игрок не найден:', playerId);
            return false;
        }

        if (player.money < amount) {
            console.error('❌ GameState: Недостаточно денег для погашения долга');
            return false;
        }

        const updatedPlayer = this.professionModule.payOffDebt(player, debtId, amount);
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        
        if (playerIndex !== -1) {
            this.players[playerIndex] = updatedPlayer;
            console.log('✅ GameState: Долг погашен:', player.username, debtId, amount);
            
            // Уведомляем о изменении игрока
            if (this.eventBus) {
                this.eventBus.emit('player:debtPaid', {
                    player: updatedPlayer,
                    debtId: debtId,
                    amount: amount
                });
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Добавить ребенка игроку
     * @param {string} playerId 
     * @returns {boolean}
     */
    addChildToPlayer(playerId) {
        const player = this.getPlayerById(playerId);
        if (!player) {
            console.error('❌ GameState: Игрок не найден:', playerId);
            return false;
        }

        const updatedPlayer = this.professionModule.addChild(player);
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        
        if (playerIndex !== -1) {
            this.players[playerIndex] = updatedPlayer;
            console.log('✅ GameState: Добавлен ребенок игроку:', player.username);
            
            // Уведомляем о изменении игрока
            if (this.eventBus) {
                this.eventBus.emit('player:childAdded', {
                    player: updatedPlayer
                });
            }
            
            return true;
        }
        
        return false;
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
    
    /**
     * Получить список всех игроков
     * @returns {Array} Массив игроков
     */
    getPlayers() {
        return this.players;
    }
    
    /**
     * Добавить тестовых игроков для демонстрации
     */
    addTestPlayers() {
        // Проверяем, есть ли уже игроки
        if (this.players.length > 0) {
            console.log('👥 GameState: Игроки уже добавлены, пропускаем');
            return;
        }
        
        this.players = [
            {
                id: 'player1',
                username: 'TestUser',
                token: 'eagle',
                position: 0,
                isInner: true, // Начинаем с малого круга
                money: 5000,
                salary: 5000,
                totalIncome: 0,
                monthlyExpenses: 2000,
                assets: [],
                dreams: []
            },
            {
                id: 'player2',
                username: 'Roman',
                token: 'fox',
                position: 0,
                isInner: true, // Начинаем с малого круга
                money: 3000,
                salary: 4000,
                totalIncome: 0,
                monthlyExpenses: 1500,
                assets: [],
                dreams: []
            }
        ];
        
        console.log('🎮 GameState: Добавлены тестовые игроки', this.players);
        
        if (this.eventBus) {
            this.eventBus.emit('game:playersUpdated', {
                players: this.players
            });
        }
    }
    
    /**
     * Загрузка игроков из комнаты
     */
    async loadPlayersFromRoom(roomData) {
        try {
            console.log('🏠 GameState: Загрузка игроков из комнаты:', roomData);
            
            if (roomData && roomData.players && roomData.players.length > 0) {
                this.players = roomData.players.map((player, index) => ({
                    id: player.userId || `player${index + 1}`,
                    username: player.username || `Игрок ${index + 1}`,
                    position: 0, // Все игроки начинают с клетки 1 малого круга (позиция 0)
                    isInner: true, // Начинаем с малого круга
                    money: 5000,
                    salary: 5000,
                    totalIncome: 0,
                    token: player.token || '🎯',
                    isReady: player.isReady || false,
                    dream: player.dream || null,
                    monthlyExpenses: 2000,
                    assets: [],
                    dreams: player.dream ? [player.dream] : []
                }));
                
                console.log('✅ GameState: Игроки загружены из комнаты:', this.players.length);
                
                // Уведомляем о загрузке игроков
                if (this.eventBus) {
                    this.eventBus.emit('game:playersUpdated', {
                        players: this.players
                    });
                }
            } else {
                console.log('⚠️ GameState: Данные комнаты не найдены, добавляем тестовых игроков');
                this.addTestPlayers();
            }
        } catch (error) {
            console.error('❌ GameState: Ошибка загрузки игроков из комнаты:', error);
            this.addTestPlayers();
        }
    }

    /**
     * Переместить игрока на новую позицию
     * @param {string} playerId - ID игрока
     * @param {number} newPosition - Новая позиция
     * @param {boolean} isInner - На внутреннем круге
     */
    movePlayer(playerId, newPosition, isInner = false) {
        const player = this.getPlayerById(playerId);
        if (!player) {
            console.warn('⚠️ GameState: Игрок не найден для перемещения:', playerId);
            return;
        }

        const oldPosition = player.position;
        const oldIsInner = player.isInner;

        // Обновляем позицию игрока
        player.position = newPosition;
        player.isInner = isInner;

        console.log(`🎯 GameState: Игрок ${player.username} перемещен с позиции ${oldPosition} на позицию ${newPosition} (${isInner ? 'внутренний' : 'внешний'} круг)`);

        // Эмитируем событие о перемещении
        if (this.eventBus) {
            this.eventBus.emit('player:moved', {
                playerId,
                player,
                oldPosition,
                newPosition,
                oldIsInner,
                isInner
            });

            // Также эмитируем событие обновления позиции для PlayerTokens
            this.eventBus.emit('player:positionUpdated', {
                playerId,
                position: newPosition,
                player
            });
        }
    }

    /**
     * Получить игроков на определенной позиции
     * @param {number} position - Позиция
     * @param {boolean} isInner - На внутреннем круге
     * @returns {Array} Массив игроков на позиции
     */
    getPlayersAtPosition(position, isInner = false) {
        return this.players.filter(player => 
            player.position === position && player.isInner === isInner
        );
    }

    /**
     * Переместить игрока на несколько позиций вперед
     * @param {string} playerId - ID игрока
     * @param {number} steps - Количество шагов
     */
    movePlayerForward(playerId, steps) {
        const player = this.getPlayerById(playerId);
        if (!player) {
            console.warn('⚠️ GameState: Игрок не найден для перемещения:', playerId);
            return;
        }

        let newPosition = player.position + steps;
        let newIsInner = player.isInner;

        // Логика перехода с малого круга на большой
        if (player.isInner && newPosition >= 12) {
            // Переходим на большой круг
            newIsInner = false;
            newPosition = newPosition - 12; // Корректируем позицию для большого круга
        } else if (!player.isInner && newPosition >= 44) {
            // Обходим большой круг
            newPosition = newPosition % 44;
        } else if (player.isInner && newPosition >= 12) {
            // Обходим малый круг
            newPosition = newPosition % 12;
        }

        this.movePlayer(playerId, newPosition, newIsInner);
    }
}

window.GameState = GameState;

