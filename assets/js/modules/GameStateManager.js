/**
 * GameStateManager v1.0.0
 * Централизованное управление состоянием игры
 * Единый источник истины для всех компонентов UI
 */

class GameStateManager {
    constructor() {
        this.players = [];
        this.activePlayer = null;
        this.roomId = null;
        this.gameState = {
            canRoll: false,
            canMove: false,
            canEndTurn: false,
            lastDiceResult: null,
            gameStarted: false
        };
        this.listeners = new Map();
        
        console.log('🏗️ GameStateManager: Инициализирован');
    }
    
    /**
     * Установка roomId
     * @param {string} roomId - ID комнаты
     */
    setRoomId(roomId) {
        this.roomId = roomId;
        console.log('🏗️ GameStateManager: RoomId установлен:', roomId);
    }
    
    /**
     * Обновление состояния от сервера
     * @param {Object} serverState - Состояние с сервера
     */
    updateFromServer(serverState) {
        const oldState = this.getState();
        
        const oldPlayersKey = JSON.stringify((oldState.players || []).map(p => (p && (p.id || p.userId || p.username)) || null));

        console.log('🔍 GameStateManager: updateFromServer вызван с serverState:', serverState);
        console.log('🔍 GameStateManager: serverState.players:', serverState.players);
        console.log('🔍 GameStateManager: Array.isArray(serverState.players):', Array.isArray(serverState.players));
        console.log('🔍 GameStateManager: serverState.players type:', typeof serverState.players);
        console.log('🔍 GameStateManager: serverState.players constructor:', serverState.players?.constructor?.name);

        // Обновляем игроков (с фильтрацией дубликатов)
        if (Array.isArray(serverState.players) && serverState.players.length > 0) {
            console.log('🔍 GameStateManager: Обрабатываем массив игроков, длина:', serverState.players.length);
            
            // Простое решение: напрямую копируем игроков
            this.players = serverState.players.map((player, idx) => {
                if (!player) return null;
                return {
                    ...player,
                    id: player.id || player.userId || `player_${idx}`
                };
            }).filter(player => player !== null);
            
            console.log('🏗️ GameStateManager: Игроки обновлены, итого:', this.players.length);
            console.log('🏗️ GameStateManager: this.players после обновления:', this.players);
        } else {
            console.log('🔍 GameStateManager: serverState.players не является массивом или пустой:', serverState.players);
        }
        
        // Принудительно обновляем состояние
        console.log('🔍 GameStateManager: Принудительно обновляем состояние...');
        console.log('🔍 GameStateManager: this.players перед emit:', this.players);
        console.log('🔍 GameStateManager: this.players.length перед emit:', this.players?.length);
        
        const newPlayersKey = JSON.stringify((this.players || []).map(p => (p && (p.id || p.userId || p.username)) || null));
        const playersChanged = oldPlayersKey !== newPlayersKey;
        
        // Обновляем активного игрока
        if (serverState.activePlayer) {
            this.activePlayer = serverState.activePlayer;
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
        if (serverState.lastDiceResult) {
            this.gameState.lastDiceResult = serverState.lastDiceResult;
        }
        if (serverState.gameStarted !== undefined) {
            this.gameState.gameStarted = serverState.gameStarted;
        }
        
        // Уведомляем подписчиков только если состояние действительно изменилось
        if (playersChanged || this.hasGameStateChanged(oldState)) {
            this.notifyListeners('state:updated', this.getState());
        }
        
        // Специальные события
        if (serverState.activePlayer && (!oldState.activePlayer || oldState.activePlayer.id !== serverState.activePlayer.id)) {
            this.notifyListeners('turn:changed', {
                activePlayer: serverState.activePlayer,
                previousPlayer: oldState.activePlayer
            });
        }
        
        if (playersChanged) {
            console.log('🏗️ GameStateManager: Отправляем событие players:updated', this.players);
            this.notifyListeners('players:updated', {
                players: this.players,
                added: (this.players?.length || 0) > (oldState.players?.length || 0)
            });
            
            // Уведомляем о необходимости обновить фишки
            console.log('🏗️ GameStateManager: Отправляем событие game:playersUpdated', this.players);
            this.notifyListeners('game:playersUpdated', {
                players: this.players
            });
        }
        
        console.log('🏗️ GameStateManager: Состояние обновлено от сервера');
    }
    
    /**
     * Проверка изменения игрового состояния
     * @param {Object} oldState - Предыдущее состояние
     * @returns {boolean} - Изменилось ли состояние
     */
    hasGameStateChanged(oldState) {
        const oldGameState = oldState.gameState || {};
        const newGameState = this.gameState || {};
        
        return oldGameState.canRoll !== newGameState.canRoll ||
               oldGameState.canMove !== newGameState.canMove ||
               oldGameState.canEndTurn !== newGameState.canEndTurn ||
               oldGameState.gameStarted !== newGameState.gameStarted ||
               JSON.stringify(oldGameState.lastDiceResult) !== JSON.stringify(newGameState.lastDiceResult) ||
               (oldState.activePlayer && this.activePlayer && oldState.activePlayer.id !== this.activePlayer.id);
    }
    
    /**
     * Добавление игрока
     * @param {Object} player - Данные игрока
     */
    addPlayer(player) {
        const existingIndex = this.players.findIndex(p => p.id === player.id);
        if (existingIndex >= 0) {
            this.players[existingIndex] = player;
        } else {
            this.players.push(player);
        }
        
        this.notifyListeners('player:added', { player });
        // state:updated будет отправлен автоматически через updateFromServer
        
        console.log('🏗️ GameStateManager: Игрок добавлен:', player.username);
    }
    
    /**
     * Обновление игрока
     * @param {Object} player - Обновленные данные игрока
     */
    updatePlayer(player) {
        const index = this.players.findIndex(p => p.id === player.id);
        if (index >= 0) {
            this.players[index] = { ...this.players[index], ...player };
            this.notifyListeners('player:updated', { player: this.players[index] });
            // state:updated будет отправлен автоматически через updateFromServer
            
            console.log('🏗️ GameStateManager: Игрок обновлен:', player.username);
        }
    }
    
    /**
     * Удаление игрока
     * @param {string} playerId - ID игрока
     */
    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index >= 0) {
            const player = this.players[index];
            this.players.splice(index, 1);
            
            this.notifyListeners('player:removed', { player });
            // state:updated будет отправлен автоматически через updateFromServer
            
            console.log('🏗️ GameStateManager: Игрок удален:', player.username);
        }
    }
    
    /**
     * Обновление результата броска кубика
     * @param {Object} diceResult - Результат броска
     */
    updateDiceResult(diceResult) {
        this.gameState.lastDiceResult = diceResult;
        this.notifyListeners('dice:rolled', { diceResult });
        // state:updated будет отправлен автоматически через updateFromServer
        
        console.log('🏗️ GameStateManager: Результат кубика обновлен:', diceResult);
    }
    
    /**
     * Получение текущего состояния
     * @returns {Object} Текущее состояние
     */
    getState() {
        return {
            players: this.players,
            activePlayer: this.activePlayer,
            roomId: this.roomId,
            gameState: this.gameState,
            canRoll: this.gameState.canRoll,
            canMove: this.gameState.canMove,
            canEndTurn: this.gameState.canEndTurn,
            lastDiceResult: this.gameState.lastDiceResult,
            gameStarted: this.gameState.gameStarted
        };
    }
    
    /**
     * Получение игроков
     * @returns {Array} Массив игроков
     */
    getPlayers() {
        return this.players;
    }
    
    /**
     * Получение активного игрока
     * @returns {Object|null} Активный игрок
     */
    getActivePlayer() {
        return this.activePlayer;
    }
    
    /**
     * Получение игрока по ID
     * @param {string} playerId - ID игрока
     * @returns {Object|null} Игрок
     */
    getPlayerById(playerId) {
        return this.players.find(p => p.id === playerId) || null;
    }
    
    /**
     * Проверка, является ли игрок активным
     * @param {string} playerId - ID игрока
     * @returns {boolean} Активен ли игрок
     */
    isPlayerActive(playerId) {
        return this.activePlayer && this.activePlayer.id === playerId;
    }
    
    /**
     * Подписка на события
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        console.log(`🏗️ GameStateManager: Подписка на событие: ${event}`);
    }
    
    /**
     * Отписка от событий
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
        
        console.log(`🏗️ GameStateManager: Отписка от события: ${event}`);
    }
    
    /**
     * Уведомление подписчиков
     * @param {string} event - Название события
     * @param {*} data - Данные события
     */
    notifyListeners(event, data) {
        console.log(`🏗️ GameStateManager: notifyListeners(${event})`, { listenersCount: this.listeners.has(event) ? this.listeners.get(event).length : 0, data });
        
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ GameStateManager: Ошибка в обработчике ${event}:`, error);
                }
            });
        } else {
            console.warn(`⚠️ GameStateManager: Нет слушателей для события ${event}`);
        }
    }
    
    /**
     * Очистка состояния
     */
    clear() {
        this.players = [];
        this.activePlayer = null;
        this.roomId = null;
        this.gameState = {
            canRoll: false,
            canMove: false,
            canEndTurn: false,
            lastDiceResult: null,
            gameStarted: false
        };
        
        this.notifyListeners('state:cleared', {});
        console.log('🏗️ GameStateManager: Состояние очищено');
    }
    
    /**
     * Уничтожение менеджера
     */
    destroy() {
        this.listeners.clear();
        this.clear();
        console.log('🏗️ GameStateManager: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.GameStateManager = GameStateManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateManager;
}
