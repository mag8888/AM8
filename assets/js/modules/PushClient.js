/**
 * PushClient - клиент для работы с push-уведомлениями
 */
class PushClient {
    constructor(config = {}) {
        this.serverUrl = config.serverUrl || window.location.origin;
        this.registration = null;
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.isSubscribed = false;
        
        console.log('🔔 PushClient: Инициализация', {
            isSupported: this.isSupported,
            serverUrl: this.serverUrl
        });
        
        this.init();
    }
    
    async init() {
        if (!this.isSupported) {
            console.warn('⚠️ PushClient: Push-уведомления не поддерживаются');
            return;
        }
        
        try {
            // Регистрируем Service Worker
            this.registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ PushClient: Service Worker зарегистрирован');
            
            // Проверяем существующую подписку
            this.subscription = await this.registration.pushManager.getSubscription();
            this.isSubscribed = !!this.subscription;
            
            console.log('🔔 PushClient: Состояние подписки', {
                isSubscribed: this.isSubscribed,
                subscription: this.subscription
            });
            
            // Если есть подписка, регистрируем её на сервере
            if (this.isSubscribed) {
                await this.registerWithServer();
            }
            
        } catch (error) {
            console.error('❌ PushClient: Ошибка инициализации', error);
        }
    }
    
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push-уведомления не поддерживаются');
        }
        
        try {
            const permission = await Notification.requestPermission();
            console.log('🔔 PushClient: Разрешение на уведомления', permission);
            
            if (permission === 'granted') {
                return true;
            } else {
                console.warn('⚠️ PushClient: Разрешение на уведомления отклонено');
                return false;
            }
        } catch (error) {
            console.error('❌ PushClient: Ошибка запроса разрешения', error);
            return false;
        }
    }
    
    async subscribe() {
        if (!this.isSupported || !this.registration) {
            throw new Error('Push-уведомления не поддерживаются или Service Worker не зарегистрирован');
        }
        
        try {
            // Запрашиваем разрешение
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                throw new Error('Разрешение на уведомления не получено');
            }
            
            // Создаем подписку
            this.subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.getVapidPublicKey())
            });
            
            this.isSubscribed = true;
            console.log('✅ PushClient: Подписка создана', this.subscription);
            
            // Регистрируем подписку на сервере
            await this.registerWithServer();
            
            return this.subscription;
            
        } catch (error) {
            console.error('❌ PushClient: Ошибка подписки', error);
            throw error;
        }
    }
    
    async unsubscribe() {
        if (!this.subscription) {
            console.log('🔔 PushClient: Нет активной подписки');
            return;
        }
        
        try {
            const success = await this.subscription.unsubscribe();
            if (success) {
                this.isSubscribed = false;
                this.subscription = null;
                console.log('✅ PushClient: Подписка отменена');
                
                // Уведомляем сервер об отмене подписки
                await this.unregisterFromServer();
            }
            
            return success;
        } catch (error) {
            console.error('❌ PushClient: Ошибка отмены подписки', error);
            throw error;
        }
    }
    
    async registerWithServer() {
        if (!this.subscription) {
            console.warn('⚠️ PushClient: Нет подписки для регистрации');
            return;
        }
        
        try {
            const response = await fetch(`${this.serverUrl}/api/rooms/push/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: this.subscription,
                    userInfo: this.getUserInfo()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ PushClient: Зарегистрирован на сервере', result);
            } else {
                console.error('❌ PushClient: Ошибка регистрации на сервере', result);
            }
            
            return result;
        } catch (error) {
            console.error('❌ PushClient: Ошибка регистрации на сервере', error);
            throw error;
        }
    }
    
    async unregisterFromServer() {
        try {
            const response = await fetch(`${this.serverUrl}/api/rooms/push/unregister`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: this.subscription
                })
            });
            
            const result = await response.json();
            console.log('🔔 PushClient: Отрегистрирован с сервера', result);
            
            return result;
        } catch (error) {
            console.error('❌ PushClient: Ошибка отрегистрации с сервера', error);
            throw error;
        }
    }
    
    getUserInfo() {
        // Получаем информацию о пользователе из localStorage или sessionStorage
        const userData = localStorage.getItem('am_user_data') || sessionStorage.getItem('am_user_data');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (error) {
                console.warn('⚠️ PushClient: Ошибка парсинга данных пользователя', error);
            }
        }
        
        return {
            userId: 'anonymous',
            username: 'Гость'
        };
    }
    
    getVapidPublicKey() {
        // В реальном приложении это должно быть в конфигурации
        return 'BPg1aJO5Pg7_EPKPWWofjMaqb5L5gVeaT5qwBQfAUxIAZ8FWdnbs810bZqJ6WoC5hzH3t9NwV7Y3J42ZqfDKUDM';
    }
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // Методы для отправки уведомлений
    async sendNotification(title, message, options = {}) {
        if (!this.isSubscribed) {
            console.warn('⚠️ PushClient: Нет подписки для отправки уведомления');
            return;
        }
        
        try {
            const response = await fetch(`${this.serverUrl}/api/rooms/push/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    message,
                    ...options
                })
            });
            
            const result = await response.json();
            console.log('🔔 PushClient: Уведомление отправлено', result);
            
            return result;
        } catch (error) {
            console.error('❌ PushClient: Ошибка отправки уведомления', error);
            throw error;
        }
    }
    
    // Получение статистики
    async getStats() {
        try {
            const response = await fetch(`${this.serverUrl}/api/rooms/push/stats`);
            const result = await response.json();
            console.log('🔔 PushClient: Статистика', result);
            
            return result;
        } catch (error) {
            console.error('❌ PushClient: Ошибка получения статистики', error);
            throw error;
        }
    }
}

// Экспортируем класс
window.PushClient = PushClient;