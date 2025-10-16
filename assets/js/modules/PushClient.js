/**
 * PushClient v1.0.0
 * Клиент для обработки push-уведомлений в реальном времени
 * Обеспечивает синхронизацию состояния между клиентами
 */

class PushClient {
    constructor(gameStateManager, options = {}) {
        this.gameStateManager = gameStateManager;
        this.options = {
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            enableLogging: true,
            ...options
        };
        
        this.eventSource = null;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.roomId = null;
        
        console.log('📡 PushClient: Инициализирован');
    }
    
    /**
     * Подключение к push-уведомлениям
     * @param {string} roomId - ID комнаты
     */
    connect(roomId) {
        this.roomId = roomId;
        
        if (this.eventSource) {
            this.disconnect();
        }
        
        try {
            // Регистрируем клиента на сервере
            this.registerClient(roomId).then(() => {
                this.setupEventSource();
            }).catch(error => {
                console.error('❌ PushClient: Ошибка регистрации:', error);
                this.scheduleReconnect();
            });
        } catch (error) {
            console.error('❌ PushClient: Ошибка подключения:', error);
            this.scheduleReconnect();
        }
    }
    
    /**
     * Регистрация клиента на сервере
     * @param {string} roomId - ID комнаты
     */
    async registerClient(roomId) {
        const clientId = this.generateClientId();
        const userInfo = this.getCurrentUserInfo();
        
        const response = await fetch('/api/rooms/push/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId,
                userInfo: {
                    ...userInfo,
                    roomId
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        this.clientId = clientId;
        console.log('📡 PushClient: Клиент зарегистрирован:', clientId);
    }
    
    /**
     * Настройка EventSource для получения push-уведомлений
     */
    setupEventSource() {
        if (!this.roomId) {
            console.error('❌ PushClient: roomId не установлен');
            return;
        }
        
        try {
            // В реальном приложении здесь был бы WebSocket или Server-Sent Events
            // Пока используем polling для демонстрации
            this.startPolling();
            
            console.log('📡 PushClient: Подключен к push-уведомлениям');
        } catch (error) {
            console.error('❌ PushClient: Ошибка настройки EventSource:', error);
            this.scheduleReconnect();
        }
    }
    
    /**
     * Запуск polling для получения обновлений
     * В реальном приложении здесь был бы WebSocket
     */
    startPolling() {
        this.pollingInterval = setInterval(async () => {
            try {
                await this.checkForUpdates();
            } catch (error) {
                console.error('❌ PushClient: Ошибка polling:', error);
            }
        }, 2000); // Проверяем каждые 2 секунды
        
        this.isConnected = true;
    }
    
    /**
     * Проверка обновлений с сервера
     */
    async checkForUpdates() {
        if (!this.roomId) return;
        
        try {
            // Получаем текущее состояние игры
            const response = await fetch(`/api/rooms/${this.roomId}/game-state`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.state) {
                    this.handleServerUpdate(data.state);
                }
            }
        } catch (error) {
            console.error('❌ PushClient: Ошибка получения обновлений:', error);
        }
    }
    
    /**
     * Обработка обновления от сервера
     * @param {Object} serverState - Состояние с сервера
     */
    handleServerUpdate(serverState) {
        // Обновляем GameStateManager
        this.gameStateManager.updateFromServer(serverState);
        
        if (this.options.enableLogging) {
            console.log('📡 PushClient: Получено обновление от сервера');
        }
    }
    
    /**
     * Обработка push-события
     * @param {Object} eventData - Данные события
     */
    handlePushEvent(eventData) {
        const { type, data } = eventData;
        
        switch (type) {
            case 'turn_changed':
                this.handleTurnChanged(data);
                break;
            case 'player_joined':
                this.handlePlayerJoined(data);
                break;
            case 'player_left':
                this.handlePlayerLeft(data);
                break;
            case 'dice_rolled':
                this.handleDiceRolled(data);
                break;
            case 'player_moved':
                this.handlePlayerMoved(data);
                break;
            case 'game_started':
                this.handleGameStarted(data);
                break;
            default:
                console.log('📡 PushClient: Неизвестное событие:', type);
        }
    }
    
    /**
     * Обработка смены хода
     * @param {Object} data - Данные события
     */
    handleTurnChanged(data) {
        console.log('📡 PushClient: Смена хода:', data);
        // GameStateManager уже обновлен через handleServerUpdate
    }
    
    /**
     * Обработка присоединения игрока
     * @param {Object} data - Данные события
     */
    handlePlayerJoined(data) {
        console.log('📡 PushClient: Игрок присоединился:', data);
        this.gameStateManager.addPlayer(data.player);
    }
    
    /**
     * Обработка выхода игрока
     * @param {Object} data - Данные события
     */
    handlePlayerLeft(data) {
        console.log('📡 PushClient: Игрок вышел:', data);
        this.gameStateManager.removePlayer(data.playerId);
    }
    
    /**
     * Обработка броска кубика
     * @param {Object} data - Данные события
     */
    handleDiceRolled(data) {
        console.log('📡 PushClient: Кубик брошен:', data);
        this.gameStateManager.updateDiceResult({ value: data.diceValue });
    }
    
    /**
     * Обработка движения игрока
     * @param {Object} data - Данные события
     */
    handlePlayerMoved(data) {
        console.log('📡 PushClient: Игрок переместился:', data);
        // Обновляем позицию игрока
        const player = this.gameStateManager.getPlayerById(data.activePlayer.id);
        if (player) {
            player.position = data.newPosition;
            this.gameStateManager.updatePlayer(player);
        }
    }
    
    /**
     * Обработка начала игры
     * @param {Object} data - Данные события
     */
    handleGameStarted(data) {
        console.log('📡 PushClient: Игра началась:', data);
        this.gameStateManager.updateFromServer({
            gameStarted: true,
            players: data.players,
            activePlayer: data.activePlayer
        });
    }
    
    /**
     * Планирование переподключения
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            console.error('❌ PushClient: Максимальное количество попыток переподключения достигнуто');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`📡 PushClient: Переподключение через ${this.options.reconnectInterval}ms (попытка ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect(this.roomId);
        }, this.options.reconnectInterval);
    }
    
    /**
     * Отключение от push-уведомлений
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        this.isConnected = false;
        
        // Отменяем регистрацию на сервере
        if (this.clientId) {
            this.unregisterClient();
        }
        
        console.log('📡 PushClient: Отключен');
    }
    
    /**
     * Отмена регистрации клиента
     */
    async unregisterClient() {
        if (!this.clientId) return;
        
        try {
            await fetch('/api/rooms/push/unregister', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.clientId
                })
            });
            
            console.log('📡 PushClient: Клиент отменен');
        } catch (error) {
            console.error('❌ PushClient: Ошибка отмены регистрации:', error);
        }
    }
    
    /**
     * Генерация уникального ID клиента
     * @returns {string} ID клиента
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Получение информации о текущем пользователе
     * @returns {Object} Информация о пользователе
     */
    getCurrentUserInfo() {
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle.currentUser || {};
            }
            
            // Fallback к localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                return JSON.parse(userRaw);
            }
        } catch (error) {
            console.error('❌ PushClient: Ошибка получения информации о пользователе:', error);
        }
        
        return {};
    }
    
    /**
     * Проверка состояния подключения
     * @returns {boolean} Подключен ли клиент
     */
    isConnected() {
        return this.isConnected;
    }
    
    /**
     * Уничтожение клиента
     */
    destroy() {
        this.disconnect();
        console.log('📡 PushClient: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.PushClient = PushClient;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PushClient;
}
