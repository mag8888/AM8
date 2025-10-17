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
            
            // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительно сохраняем игроков
            this.players = [];
            this.players.push(...serverState.players);
            
            console.log('🏗️ GameStateManager: Игроки обновлены, итого:', this.players.length);
            console.log('🏗️ GameStateManager: this.players после обновления:', this.players);
            console.log('🏗️ GameStateManager: this.players === serverState.players:', this.players === serverState.players);
            console.log('🏗️ GameStateManager: this.players[0]:', this.players[0]);
            
            // Дополнительная проверка - принудительно устанавливаем игроков
            if (this.players.length === 0) {
                console.log('🚨 GameStateManager: КРИТИЧЕСКАЯ ОШИБКА - игроки не сохранились!');
                this.players = [...serverState.players];
                console.log('🚨 GameStateManager: Принудительно восстановили игроков:', this.players.length);
            }
            
            // Принудительно обновляем состояние
            console.log('🔍 GameStateManager: Принудительно обновляем состояние...');
            console.log('🔍 GameStateManager: this.players перед emit:', this.players);
            console.log('🔍 GameStateManager: this.players.length перед emit:', this.players?.length);
        } else {
            console.log('🔍 GameStateManager: serverState.players не является массивом или пустой:', serverState.players);
            
            // Если игроки не переданы, но у нас есть старые данные, сохраняем их
            if (this.players && this.players.length > 0) {
                console.log('🔍 GameStateManager: Сохраняем существующих игроков:', this.players.length);
            } else {
                console.log('🔍 GameStateManager: Нет игроков для сохранения');
            }
        }
        
        // Принудительно обновляем состояние
        console.log('🔍 GameStateManager: Принудительно обновляем состояние...');
        console.log('🔍 GameStateManager: this.players перед emit:', this.players);
        console.log('🔍 GameStateManager: this.players.length перед emit:', this.players?.length);
        
        // Принудительно устанавливаем игроков
        if (Array.isArray(serverState.players) && serverState.players.length > 0) {
            this.players = [...serverState.players];
            console.log('🔍 GameStateManager: Принудительно установили this.players:', this.players);
        }
        
        // Дополнительная проверка и принудительное обновление
        if (Array.isArray(serverState.players) && serverState.players.length > 0) {
            console.log('🔍 GameStateManager: Дополнительная проверка - устанавливаем игроков напрямую');
            this.players = serverState.players.slice(); // Создаем копию массива
            console.log('🔍 GameStateManager: this.players после дополнительной установки:', this.players);
            console.log('🔍 GameStateManager: this.players.length после дополнительной установки:', this.players.length);
        }
        
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
            console.log('🔍 GameStateManager: Отправляем событие state:updated');
            this.notifyListeners('state:updated', this.getState());
        }
        
        // Принудительно обновляем состояние в любом случае
        console.log('🔍 GameStateManager: Принудительно отправляем событие state:updated');
        this.notifyListeners('state:updated', this.getState());
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительно обновляем PlayersPanel
        if (this.players && this.players.length > 0) {
            console.log('🔧 GameStateManager: Принудительно обновляем PlayersPanel с', this.players.length, 'игроками');
            const playersPanel = window.app?.modules?.get('playersPanel');
            if (playersPanel && typeof playersPanel.updatePlayersList === 'function') {
                playersPanel.updatePlayersList(this.players);
                console.log('✅ GameStateManager: PlayersPanel обновлен принудительно');
            }
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
        console.log('🔍 GameStateManager: getState() вызван');
        console.log('🔍 GameStateManager: this.players в getState():', this.players);
        console.log('🔍 GameStateManager: this.players.length в getState():', this.players?.length);
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительно восстанавливаем игроков если они потеряны
        if (!this.players || this.players.length === 0) {
            console.log('🚨 GameStateManager: КРИТИЧЕСКАЯ ОШИБКА - игроки потеряны в getState()!');
            
            // Пытаемся восстановить из кэша или принудительно загрузить
            const roomId = window.location.hash.split('roomId=')[1];
            if (roomId) {
                console.log('🔧 GameStateManager: Принудительно загружаем игроков для комнаты:', roomId);
                fetch(`/api/rooms/${roomId}/game-state`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.state && data.state.players && data.state.players.length > 0) {
                            console.log('🔧 GameStateManager: Восстановили игроков:', data.state.players.length);
                            this.players = [...data.state.players];
                            
                            // Принудительно обновляем PlayersPanel
                            const playersPanel = window.app?.modules?.get('playersPanel');
                            if (playersPanel && typeof playersPanel.updatePlayersList === 'function') {
                                playersPanel.updatePlayersList(this.players);
                                console.log('✅ GameStateManager: PlayersPanel обновлен после восстановления');
                            }
                        }
                    })
                    .catch(err => console.error('❌ GameStateManager: Ошибка восстановления игроков:', err));
            }
        }
        
        const state = {
            players: this.players || [],
            activePlayer: this.activePlayer,
            roomId: this.roomId,
            gameState: this.gameState,
            canRoll: this.gameState.canRoll,
            canMove: this.gameState.canMove,
            canEndTurn: this.gameState.canEndTurn,
            lastDiceResult: this.gameState.lastDiceResult,
            gameStarted: this.gameState.gameStarted
        };
        
        console.log('🔍 GameStateManager: возвращаем состояние:', state);
        return state;
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
        
        const listenersCount = this.listeners.get(event).size;
        console.log(`🏗️ GameStateManager: Подписка на событие: ${event}, всего слушателей: ${listenersCount}`);
        console.trace('🏗️ GameStateManager: Stack trace подписки');
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
        const listenersCount = this.listeners.has(event) ? this.listeners.get(event).size : 0;
        console.log(`🏗️ GameStateManager: notifyListeners(${event})`, { listenersCount, data });
        
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
            
            // Автоматически переподписываем компоненты, если нет слушателей
            if (event === 'state:updated' && listenersCount === 0) {
                console.log('🔄 GameStateManager: Автоматическая переподписка компонентов');
                this.autoResubscribeComponents();
            }
        }
    }
    
    /**
     * Автоматическая переподписка компонентов
     */
    autoResubscribeComponents() {
        // Проверяем, есть ли глобальный объект app
        if (window.app && window.app.modules) {
            const turnController = window.app.modules.get('turnController');
            const playersPanel = window.app.modules.get('playersPanel');
            
            if (turnController && typeof turnController.setupEventListeners === 'function') {
                console.log('🔄 GameStateManager: Переподписываем TurnController');
                turnController.setupEventListeners();
            }
            
            if (playersPanel && typeof playersPanel.setupEventListeners === 'function') {
                console.log('🔄 GameStateManager: Переподписываем PlayersPanel');
                playersPanel.setupEventListeners();
            }
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
