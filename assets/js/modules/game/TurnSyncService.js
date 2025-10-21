/**
 * TurnSyncService v1.0.0
 * Синхронизация ходов между клиентами
 * Отправляет push-уведомления о смене хода
 */

class TurnSyncService {
    constructor({ turnService, roomApi, eventBus }) {
        this.turnService = turnService;
        this.roomApi = roomApi;
        this.eventBus = eventBus;
        this.roomId = null;
        this.currentUserId = null;
        this.syncInterval = null;
        
        console.log('🔄 TurnSyncService: Инициализирован');
        this.init();
    }
    
    /**
     * Инициализация сервиса
     */
    init() {
        // Получаем данные комнаты и пользователя
        this.roomId = this._getRoomId();
        this.currentUserId = this._getCurrentUserId();
        
        if (!this.roomId) {
            console.warn('⚠️ TurnSyncService: roomId не найден');
            return;
        }
        
        // Подписываемся на события смены хода
        this.setupEventListeners();
        
        // Запускаем периодическую синхронизацию
        this.startSync();
        
        console.log('✅ TurnSyncService: Настроен для комнаты', this.roomId);
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (!this.turnService) return;
        
        // Слушаем события завершения хода
        this.turnService.on('end:success', (response) => {
            this.handleTurnEnd(response);
        });
        
        // Слушаем события перемещения
        this.turnService.on('move:success', (response) => {
            this.handleMoveSuccess(response);
        });
        
        // Слушаем события броска кубика
        this.turnService.on('roll:success', (response) => {
            this.handleRollSuccess(response);
        });
    }
    
    /**
     * Обработка завершения хода
     */
    handleTurnEnd(response) {
        console.log('🔄 TurnSyncService: Ход завершен, отправляем уведомления');
        
        // Отправляем push-уведомление о смене хода
        this.sendTurnChangeNotification(response);
        
        // Обновляем состояние у всех клиентов
        this.broadcastGameStateUpdate();
    }
    
    /**
     * Обработка успешного перемещения
     */
    handleMoveSuccess(response) {
        console.log('🔄 TurnSyncService: Перемещение выполнено');
        
        // Отправляем уведомление о перемещении
        this.sendMoveNotification(response);
    }
    
    /**
     * Обработка успешного броска кубика
     */
    handleRollSuccess(response) {
        console.log('🔄 TurnSyncService: Кубик брошен');
        
        // Отправляем уведомление о броске
        this.sendRollNotification(response);
    }
    
    /**
     * Отправка уведомления о смене хода
     */
    async sendTurnChangeNotification(response) {
        try {
            if (!this.roomId || !this.currentUserId) return;
            
            const notification = {
                type: 'turn_changed',
                data: {
                    roomId: this.roomId,
                    previousPlayer: response.previousPlayer,
                    currentPlayer: response.state?.activePlayer,
                    turnNumber: response.state?.turnNumber || 1,
                    timestamp: new Date().toISOString()
                },
                from: this.currentUserId,
                to: 'all_players'
            };
            
            // Отправляем через API
            await this.roomApi.sendNotification(this.roomId, notification);
            
            console.log('📢 TurnSyncService: Уведомление о смене хода отправлено');
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка отправки уведомления о смене хода:', error);
        }
    }
    
    /**
     * Отправка уведомления о перемещении
     */
    async sendMoveNotification(response) {
        try {
            if (!this.roomId || !this.currentUserId) return;
            
            const notification = {
                type: 'player_moved',
                data: {
                    roomId: this.roomId,
                    player: response.state?.activePlayer,
                    steps: response.moveResult?.steps,
                    newPosition: response.state?.players?.find(p => p.id === response.state?.activePlayer?.id)?.position,
                    timestamp: new Date().toISOString()
                },
                from: this.currentUserId,
                to: 'all_players'
            };
            
            await this.roomApi.sendNotification(this.roomId, notification);
            
            console.log('📢 TurnSyncService: Уведомление о перемещении отправлено');
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка отправки уведомления о перемещении:', error);
        }
    }
    
    /**
     * Отправка уведомления о броске кубика
     */
    async sendRollNotification(response) {
        try {
            if (!this.roomId || !this.currentUserId) return;
            
            const notification = {
                type: 'dice_rolled',
                data: {
                    roomId: this.roomId,
                    player: response.state?.activePlayer,
                    diceValue: response.serverValue || response.diceResult?.value,
                    timestamp: new Date().toISOString()
                },
                from: this.currentUserId,
                to: 'all_players'
            };
            
            await this.roomApi.sendNotification(this.roomId, notification);
            
            console.log('📢 TurnSyncService: Уведомление о броске кубика отправлено');
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка отправки уведомления о броске:', error);
        }
    }
    
    /**
     * Широковещательное обновление состояния игры
     */
    async broadcastGameStateUpdate() {
        try {
            if (!this.roomId) return;
            
            const state = this.turnService.getState();
            if (!state) return;
            
            const notification = {
                type: 'game_state_updated',
                data: {
                    roomId: this.roomId,
                    state: state,
                    timestamp: new Date().toISOString()
                },
                from: this.currentUserId,
                to: 'all_players'
            };
            
            await this.roomApi.sendNotification(this.roomId, notification);
            
            console.log('📢 TurnSyncService: Состояние игры обновлено');
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка обновления состояния игры:', error);
        }
    }
    
    /**
     * Запуск периодической синхронизации
     */
    startSync() {
        // УНИФИЦИРОВАННЫЙ ИНТЕРВАЛ: 45 секунд для всех компонентов
        this.syncInterval = setInterval(() => {
            this.syncGameState();
        }, 45000); // Унифицирован до 45 секунд как в других компонентах
        
        console.log('🔄 TurnSyncService: Периодическая синхронизация запущена (интервал: 45 сек)');
    }
    
    /**
     * Синхронизация состояния игры
     */
    async syncGameState() {
        try {
            if (!this.roomId) return;
            
            // Проверяем, что roomApi имеет нужный метод
            if (!this.roomApi || typeof this.roomApi.getRoomState !== 'function') {
                console.warn('⚠️ TurnSyncService: roomApi.getRoomState недоступен');
                return;
            }
            
            // Получаем актуальное состояние с сервера
            const roomData = await this.roomApi.getRoomState(this.roomId);
            if (roomData && roomData.state) {
                // Обновляем локальное состояние
                if (this.turnService && typeof this.turnService._applyServerState === 'function') {
                    this.turnService._applyServerState(roomData.state);
                }
                
                console.log('🔄 TurnSyncService: Состояние синхронизировано');
            }
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка синхронизации:', error);
        }
    }
    
    /**
     * Обработка входящих уведомлений
     */
    handleIncomingNotification(notification) {
        try {
            console.log('📨 TurnSyncService: Получено уведомление:', notification.type);
            
            switch (notification.type) {
                case 'turn_changed':
                    this.handleTurnChangeNotification(notification.data);
                    break;
                case 'player_moved':
                    this.handlePlayerMoveNotification(notification.data);
                    break;
                case 'dice_rolled':
                    this.handleDiceRollNotification(notification.data);
                    break;
                case 'game_state_updated':
                    this.handleGameStateUpdate(notification.data);
                    break;
                default:
                    console.log('📨 TurnSyncService: Неизвестный тип уведомления:', notification.type);
            }
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка обработки уведомления:', error);
        }
    }
    
    /**
     * Обработка уведомления о смене хода
     */
    handleTurnChangeNotification(data) {
        console.log('🔄 TurnSyncService: Смена хода:', data);
        
        // Эмитим событие смены хода
        if (this.eventBus) {
            this.eventBus.emit('turn:changed', data);
        }
        
        // Показываем уведомление пользователю
        this.showTurnChangeNotification(data);
    }
    
    /**
     * Обработка уведомления о перемещении игрока
     */
    handlePlayerMoveNotification(data) {
        console.log('🔄 TurnSyncService: Игрок перемещен:', data);
        
        // Эмитим событие перемещения
        if (this.eventBus) {
            this.eventBus.emit('player:moved', data);
        }
    }
    
    /**
     * Обработка уведомления о броске кубика
     */
    handleDiceRollNotification(data) {
        console.log('🔄 TurnSyncService: Кубик брошен:', data);
        
        // Эмитим событие броска
        if (this.eventBus) {
            this.eventBus.emit('dice:rolled', data);
        }
    }
    
    /**
     * Обработка обновления состояния игры
     */
    handleGameStateUpdate(data) {
        console.log('🔄 TurnSyncService: Состояние игры обновлено');
        
        // Применяем новое состояние
        if (data.state) {
            this.turnService._applyServerState(data.state);
        }
    }
    
    /**
     * Показ уведомления о смене хода
     */
    showTurnChangeNotification(data) {
        const currentUserId = this._getCurrentUserId();
        const isMyTurn = data.currentPlayer && (
            data.currentPlayer.id === currentUserId ||
            data.currentPlayer.userId === currentUserId
        );
        
        if (isMyTurn) {
            this.showNotification('🎯 ВАШ ХОД! Бросайте кубик', 'success');
        } else if (data.currentPlayer) {
            this.showNotification(`Ход игрока: ${data.currentPlayer.username || data.currentPlayer.name}`, 'info');
        }
    }
    
    /**
     * Показ уведомления
     */
    showNotification(message, type = 'info') {
        if (window.notificationService && typeof window.notificationService.show === 'function') {
            window.notificationService.show(message, type);
        } else {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
        }
    }
    
    /**
     * Получение ID комнаты
     */
    _getRoomId() {
        try {
            // Пытаемся получить из URL
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            const roomId = urlParams.get('roomId');
            if (roomId) return roomId;
            
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle.roomId;
            }
            
            return null;
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка получения roomId:', error);
            return null;
        }
    }
    
    /**
     * Получение ID текущего пользователя
     */
    _getCurrentUserId() {
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                const userId = bundle?.currentUser?.id || bundle?.currentUser?.userId;
                if (userId) {
                    console.log('🔍 TurnSyncService: ID пользователя из bundle:', userId);
                    return userId;
                }
            }
            
            // Пытаемся получить из localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                const userId = user?.id || user?.userId;
                if (userId) {
                    console.log('🔍 TurnSyncService: ID пользователя из localStorage:', userId);
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
                        console.log('🔍 TurnSyncService: ID пользователя из userModel:', userId);
                        return userId;
                    }
                }
            }
            
            console.warn('⚠️ TurnSyncService: ID пользователя не найден');
            return null;
        } catch (error) {
            console.error('❌ TurnSyncService: Ошибка получения userId:', error);
            return null;
        }
    }
    
    /**
     * Остановка синхронизации
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        console.log('🔄 TurnSyncService: Синхронизация остановлена');
    }
    
    /**
     * Уничтожение сервиса
     */
    destroy() {
        this.stop();
        console.log('🔄 TurnSyncService: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.TurnSyncService = TurnSyncService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnSyncService;
}
