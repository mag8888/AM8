/**
 * Клиентский сервис для получения push-уведомлений
 * Версия: 1.0.0
 * Дата: 12 октября 2024
 */

class PushClient {
    constructor({ gameState, eventBus }) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.clientId = null;
        this.isRegistered = false;
        this.pollingInterval = null;
        // Снижаем частоту опроса, чтобы уменьшить нагрузку и спам-запросы
        this.pollingIntervalMs = 5000; // 5 секунд
        this.retryCount = 0;
        this.maxRetries = 5;
        
        console.log('📱 PushClient: Инициализация...');
        this.init();
    }

    /**
     * Инициализация клиента
     */
    async init() {
        try {
            // Генерируем уникальный ID клиента
            this.clientId = this.generateClientId();
            
            // Регистрируемся для получения push-уведомлений
            await this.register();
            
            // Запускаем polling
            this.startPolling();
            
            console.log('✅ PushClient: Инициализация завершена');
        } catch (error) {
            console.error('❌ PushClient: Ошибка инициализации:', error);
        }
    }

    /**
     * Генерация уникального ID клиента
     */
    generateClientId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const userAgent = navigator.userAgent.substring(0, 10);
        
        return `client_${timestamp}_${random}_${userAgent}`;
    }

    /**
     * Регистрация клиента для получения push-уведомлений
     */
    async register() {
        try {
            const userInfo = this.getUserInfo();
            
            const response = await fetch('/api/push/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId: this.clientId,
                    userInfo: userInfo
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.isRegistered = true;
                this.retryCount = 0;
                console.log(`📱 PushClient: Клиент ${this.clientId} зарегистрирован`);
                
                // Уведомляем о регистрации
                this.eventBus.emit('push:registered', {
                    clientId: this.clientId,
                    stats: result.stats
                });
            } else {
                throw new Error(result.error || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('❌ PushClient: Ошибка регистрации:', error);
            this.isRegistered = false;
            throw error;
        }
    }

    /**
     * Получение информации о пользователе
     */
    getUserInfo() {
        const user = this.gameState.getCurrentUser();
        return {
            userId: user?.id || null,
            username: user?.username || 'Anonymous',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Запуск polling для получения push-уведомлений
     */
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForUpdates();
            } catch (error) {
                console.error('❌ PushClient: Ошибка polling:', error);
                this.handlePollingError(error);
            }
        }, this.pollingIntervalMs);

        console.log(`📱 PushClient: Polling запущен (${this.pollingIntervalMs}ms)`);
    }

    /**
     * Остановка polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('📱 PushClient: Polling остановлен');
        }
    }

    /**
     * Polling для получения обновлений
     */
    async pollForUpdates() {
        if (!this.isRegistered || !this.clientId) {
            return;
        }

        try {
            const response = await fetch(`/api/push/poll?clientId=${this.clientId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.retryCount = 0;
                
                // Проверяем статистику подключенных клиентов
                if (result.stats) {
                    this.eventBus.emit('push:stats_updated', result.stats);
                }
                // Сообщения очереди (если backend вернул messages)
                if (Array.isArray(result.messages)) {
                    result.messages.forEach(m => this.handlePushNotification(m));
                }
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Обработка ошибок polling
     */
    handlePollingError(error) {
        this.retryCount++;
        
        if (this.retryCount >= this.maxRetries) {
            console.error(`❌ PushClient: Превышено максимальное количество попыток (${this.maxRetries})`);
            this.stopPolling();
            
            // Попытка перерегистрации
            setTimeout(() => {
                this.reconnect();
            }, 5000);
        }
    }

    /**
     * Переподключение к push-сервису
     */
    async reconnect() {
        try {
            console.log('🔄 PushClient: Попытка переподключения...');
            
            // Останавливаем текущий polling
            this.stopPolling();
            
            // Перерегистрируемся
            await this.register();
            
            // Запускаем polling заново
            this.startPolling();
            
            console.log('✅ PushClient: Переподключение успешно');
        } catch (error) {
            console.error('❌ PushClient: Ошибка переподключения:', error);
            
            // Повторная попытка через 10 секунд
            setTimeout(() => {
                this.reconnect();
            }, 10000);
        }
    }

    /**
     * Отключение от push-сервиса
     */
    async unregister() {
        try {
            if (!this.clientId || !this.isRegistered) {
                return;
            }

            // Останавливаем polling
            this.stopPolling();

            const response = await fetch('/api/push/unregister', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId: this.clientId
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log(`📱 PushClient: Клиент ${this.clientId} отключен`);
                }
            }
        } catch (error) {
            console.error('❌ PushClient: Ошибка отключения:', error);
        } finally {
            this.isRegistered = false;
            this.clientId = null;
        }
    }

    /**
     * Отправка broadcast push-уведомления
     */
    async sendBroadcastPush(type, data, excludeSelf = false) {
        try {
            const response = await fetch('/api/push/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type,
                    data,
                    excludeClientId: excludeSelf ? this.clientId : null
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log(`📡 PushClient: Broadcast push отправлен (${type})`);
                return result;
            } else {
                throw new Error(result.error || 'Ошибка отправки push');
            }
        } catch (error) {
            console.error('❌ PushClient: Ошибка отправки broadcast push:', error);
            throw error;
        }
    }

    /**
     * Получение статистики push-сервиса
     */
    async getStats() {
        try {
            const response = await fetch('/api/push/stats', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                return result.stats;
            } else {
                throw new Error(result.error || 'Ошибка получения статистики');
            }
        } catch (error) {
            console.error('❌ PushClient: Ошибка получения статистики:', error);
            throw error;
        }
    }

    /**
     * Обработка push-уведомлений от сервера
     */
    handlePushNotification(pushData) {
        console.log(`📱 PushClient: Получено push-уведомление:`, pushData);

        // Передаем уведомление через EventBus
        this.eventBus.emit('push:notification', pushData);
        
        // Обрабатываем конкретные типы уведомлений
        switch (pushData.type) {
            case 'deal_card_revealed': {
                const dm = window.app?.getModule?.('dealModule');
                if (dm && pushData.data?.deckId && pushData.data?.card) {
                    dm.showCardAndDecide(pushData.data.deckId, pushData.data.card, pushData.data?.buyerId || null);
                }
                break;
            }
            case 'deal_rights_transferred': {
                // Можем подсветить кому передали право
                const dm = window.app?.getModule?.('dealModule');
                dm?.onRightsTransferred(pushData.data);
                this.eventBus.emit('deal:rights_transferred', pushData.data);
                break;
            }
            case 'room_created':
                this.handleRoomCreated(pushData.data);
                break;
            case 'room_updated':
                this.handleRoomUpdated(pushData.data);
                break;
            case 'player_joined':
                this.handlePlayerJoined(pushData.data);
                break;
            case 'player_left':
                this.handlePlayerLeft(pushData.data);
                break;
            case 'game_started':
                this.handleGameStarted(pushData.data);
                break;
            default:
                console.log(`📱 PushClient: Неизвестный тип push-уведомления: ${pushData.type}`);
        }
    }

    /**
     * Обработка уведомления о создании комнаты
     */
    handleRoomCreated(data) {
        console.log(`🏠 PushClient: Новая комната создана: ${data.roomName}`);
        
        // Уведомляем о новой комнате
        this.eventBus.emit('rooms:new_room', data);
        
        // Обновляем список комнат если мы на странице комнат
        if (typeof window.roomService !== 'undefined') {
            window.roomService.refreshRooms();
        }
    }

    /**
     * Обработка уведомления об обновлении комнаты
     */
    handleRoomUpdated(data) {
        console.log(`🏠 PushClient: Комната обновлена: ${data.roomId}`);
        this.eventBus.emit('rooms:room_updated', data);
    }

    /**
     * Обработка уведомления о присоединении игрока
     */
    handlePlayerJoined(data) {
        console.log(`👤 PushClient: Игрок присоединился: ${data.username}`);
        this.eventBus.emit('rooms:player_joined', data);
    }

    /**
     * Обработка уведомления об уходе игрока
     */
    handlePlayerLeft(data) {
        console.log(`👤 PushClient: Игрок покинул: ${data.username}`);
        this.eventBus.emit('rooms:player_left', data);
    }

    /**
     * Обработка уведомления о начале игры
     */
    handleGameStarted(data) {
        console.log(`🎮 PushClient: Игра началась в комнате: ${data.roomId}`);
        this.eventBus.emit('rooms:game_started', data);
    }

    /**
     * Уничтожение клиента
     */
    destroy() {
        console.log('🗑️ PushClient: Уничтожение клиента...');
        
        // Останавливаем polling
        this.stopPolling();
        
        // Отключаемся от сервиса
        this.unregister();
        
        console.log('✅ PushClient: Клиент уничтожен');
    }
}

// Экспортируем класс
window.PushClient = PushClient;
