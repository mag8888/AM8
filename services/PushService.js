/**
 * Сервис для отправки push-уведомлений всем подключенным клиентам
 * Версия: 1.0.0
 * Дата: 12 октября 2024
 */

class PushService {
    constructor() {
        this.connectedClients = new Map(); // Map<clientId, {socket, lastPing, userInfo}>
        this.pushQueue = []; // Очередь уведомлений для offline клиентов
        this.isInitialized = false;
        
        console.log('📡 PushService: Инициализация...');
        this.init();
    }

    /**
     * Инициализация сервиса
     */
    init() {
        try {
            // Инициализируем периодическую очистку
            this.startCleanupInterval();
            
            this.isInitialized = true;
            console.log('✅ PushService: Инициализация завершена');
        } catch (error) {
            console.error('❌ PushService: Ошибка инициализации:', error);
            throw error;
        }
    }

    /**
     * Регистрация нового клиента
     * @param {string} clientId - Уникальный ID клиента
     * @param {Object} clientInfo - Информация о клиенте
     */
    registerClient(clientId, clientInfo = {}) {
        this.connectedClients.set(clientId, {
            id: clientId,
            registeredAt: new Date(),
            lastPing: Date.now(),
            userInfo: clientInfo,
            isActive: true
        });
        
        console.log(`📱 PushService: Клиент ${clientId} зарегистрирован`);
        console.log(`📊 PushService: Всего подключенных клиентов: ${this.connectedClients.size}`);
    }

    /**
     * Отключение клиента
     * @param {string} clientId - ID клиента
     */
    unregisterClient(clientId) {
        if (this.connectedClients.has(clientId)) {
            this.connectedClients.delete(clientId);
            console.log(`📱 PushService: Клиент ${clientId} отключен`);
            console.log(`📊 PushService: Всего подключенных клиентов: ${this.connectedClients.size}`);
        }
    }

    /**
     * Отправка push-уведомления всем подключенным клиентам
     * @param {string} type - Тип уведомления
     * @param {Object} data - Данные уведомления
     * @param {string} excludeClientId - ID клиента для исключения
     */
    async broadcastPush(type, data, excludeClientId = null) {
        try {
            const pushData = {
                type,
                data,
                timestamp: new Date().toISOString(),
                id: this.generatePushId()
            };

            console.log(`📡 PushService: Отправка broadcast push (${type}) для ${this.connectedClients.size} клиентов`);

            // Отправляем всем подключенным клиентам
            for (const [clientId, clientInfo] of this.connectedClients.entries()) {
                if (excludeClientId && clientId === excludeClientId) {
                    continue; // Пропускаем исключенного клиента
                }

                try {
                    await this.sendPushToClient(clientId, pushData);
                } catch (error) {
                    console.error(`❌ PushService: Ошибка отправки push клиенту ${clientId}:`, error);
                    // Удаляем неактивного клиента
                    this.unregisterClient(clientId);
                }
            }

            console.log(`✅ PushService: Broadcast push отправлен успешно`);
            return pushData;
        } catch (error) {
            console.error('❌ PushService: Ошибка broadcast push:', error);
            throw error;
        }
    }

    /**
     * Отправка push-уведомления конкретному клиенту
     * @param {string} clientId - ID клиента
     * @param {Object} pushData - Данные push-уведомления
     */
    async sendPushToClient(clientId, pushData) {
        const clientInfo = this.connectedClients.get(clientId);
        if (!clientInfo || !clientInfo.isActive) {
            throw new Error(`Клиент ${clientId} не найден или неактивен`);
        }

        // Обновляем время последнего ping
        clientInfo.lastPing = Date.now();
        
        // В реальном приложении здесь был бы WebSocket
        // Пока используем симуляцию через API endpoint
        console.log(`📱 PushService: Push отправлен клиенту ${clientId}:`, pushData.type);
        
        return true;
    }

    /**
     * Генерация уникального ID для push-уведомления
     */
    generatePushId() {
        return `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Получение списка активных клиентов
     */
    getActiveClients() {
        const activeClients = [];
        for (const [clientId, clientInfo] of this.connectedClients.entries()) {
            if (clientInfo.isActive) {
                activeClients.push({
                    id: clientId,
                    registeredAt: clientInfo.registeredAt,
                    userInfo: clientInfo.userInfo
                });
            }
        }
        return activeClients;
    }

    /**
     * Запуск периодической очистки неактивных клиентов
     */
    startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            const timeout = 5 * 60 * 1000; // 5 минут
            
            for (const [clientId, clientInfo] of this.connectedClients.entries()) {
                if (now - clientInfo.lastPing > timeout) {
                    console.log(`🧹 PushService: Удаление неактивного клиента ${clientId}`);
                    this.unregisterClient(clientId);
                }
            }
        }, 60000); // Проверяем каждую минуту
    }

    /**
     * Получение статистики сервиса
     */
    getStats() {
        return {
            connectedClients: this.connectedClients.size,
            isInitialized: this.isInitialized,
            queueSize: this.pushQueue.length
        };
    }
}

module.exports = PushService;
