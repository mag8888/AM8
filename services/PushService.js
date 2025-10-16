/**
 * Сервис для отправки push-уведомлений всем подключенным клиентам
 * Версия: 2.0.0
 * Дата: 16 октября 2024
 */

const webpush = require('web-push');

class PushService {
    constructor() {
        this.connectedClients = new Map(); // Map<clientId, {subscription, userInfo, lastPing}>
        this.pushQueue = []; // Очередь уведомлений для offline клиентов
        this.isInitialized = false;
        
        // VAPID ключи для push-уведомлений
        this.vapidKeys = {
            publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa40HI8QyVgQmc0e2OmjQH_s0xXgJXJN3Hk1N7vKzdaT0HfQ7UG1qZJ0u7g2c',
            privateKey: 'your-private-key-here' // В реальном приложении должно быть в переменных окружения
        };
        
        console.log('📡 PushService: Инициализация...');
        this.init();
    }

    /**
     * Инициализация сервиса
     */
    init() {
        try {
            // Настраиваем web-push
            webpush.setVapidDetails(
                'mailto:admin@auramoney.com',
                this.vapidKeys.publicKey,
                this.vapidKeys.privateKey
            );
            
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
     * @param {Object} subscription - Push-подписка клиента
     * @param {Object} userInfo - Информация о пользователе
     */
    registerClient(clientId, subscription, userInfo = {}) {
        this.connectedClients.set(clientId, {
            id: clientId,
            subscription,
            userInfo,
            registeredAt: new Date(),
            lastPing: Date.now(),
            isActive: true
        });
        
        console.log(`📱 PushService: Клиент ${clientId} зарегистрирован`, {
            hasSubscription: !!subscription,
            userInfo
        });
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
     * Отправка реального push-уведомления через web-push
     * @param {string} title - Заголовок уведомления
     * @param {string} message - Сообщение уведомления
     * @param {Object} options - Дополнительные опции
     * @param {string} excludeClientId - ID клиента для исключения
     */
    async sendRealPushNotification(title, message, options = {}, excludeClientId = null) {
        try {
            const notificationPayload = JSON.stringify({
                title,
                message,
                icon: '/assets/images/icon-192x192.png',
                badge: '/assets/images/badge-72x72.png',
                vibrate: [200, 100, 200],
                data: options.data || {},
                actions: options.actions || [],
                tag: options.tag || 'game-notification',
                requireInteraction: options.requireInteraction || false,
                silent: options.silent || false
            });

            console.log(`📡 PushService: Отправка реального push-уведомления "${title}" для ${this.connectedClients.size} клиентов`);

            let successCount = 0;
            let errorCount = 0;

            // Отправляем всем подключенным клиентам
            for (const [clientId, clientInfo] of this.connectedClients.entries()) {
                if (excludeClientId && clientId === excludeClientId) {
                    continue; // Пропускаем исключенного клиента
                }

                if (!clientInfo.subscription) {
                    console.warn(`⚠️ PushService: У клиента ${clientId} нет подписки`);
                    continue;
                }

                try {
                    await webpush.sendNotification(clientInfo.subscription, notificationPayload);
                    successCount++;
                    console.log(`✅ PushService: Уведомление отправлено клиенту ${clientId}`);
                } catch (error) {
                    errorCount++;
                    console.error(`❌ PushService: Ошибка отправки уведомления клиенту ${clientId}:`, error);
                    
                    // Если подписка недействительна, удаляем клиента
                    if (error.statusCode === 410) {
                        console.log(`🗑️ PushService: Удаляем недействительную подписку клиента ${clientId}`);
                        this.unregisterClient(clientId);
                    }
                }
            }

            console.log(`✅ PushService: Реальное push-уведомление отправлено: ${successCount} успешно, ${errorCount} ошибок`);
            return { 
                success: true, 
                sentTo: successCount, 
                errors: errorCount,
                totalClients: this.connectedClients.size
            };

        } catch (error) {
            console.error('❌ PushService: Ошибка отправки реального push-уведомления:', error);
            return { success: false, error: error.message };
        }
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
