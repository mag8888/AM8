// Service Worker для push-уведомлений
console.log('🔔 Service Worker: Загружен');

// Обработка push-событий
self.addEventListener('push', function(event) {
    console.log('🔔 Service Worker: Получено push-событие', event);
    
    if (event.data) {
        const data = event.data.json();
        console.log('🔔 Service Worker: Данные push-события', data);
        
        const options = {
            body: data.message || 'Новое уведомление',
            icon: '/assets/images/icon-192x192.png',
            badge: '/assets/images/badge-72x72.png',
            vibrate: [200, 100, 200],
            data: data.data || {},
            actions: data.actions || [],
            tag: data.tag || 'game-notification',
            requireInteraction: data.requireInteraction || false,
            silent: data.silent || false
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Aura Money', options)
        );
    }
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', function(event) {
    console.log('🔔 Service Worker: Клик по уведомлению', event);
    
    event.notification.close();
    
    if (event.action === 'open_game') {
        // Открываем игру
        event.waitUntil(
            clients.openWindow('/index.html#game?roomId=' + event.notification.data.roomId)
        );
    } else if (event.action === 'open_rooms') {
        // Открываем список комнат
        event.waitUntil(
            clients.openWindow('/pages/rooms.html')
        );
    } else {
        // Обычный клик - открываем главную страницу
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Обработка закрытия уведомления
self.addEventListener('notificationclose', function(event) {
    console.log('🔔 Service Worker: Уведомление закрыто', event);
});

// Обработка ошибок
self.addEventListener('error', function(event) {
    console.error('🔔 Service Worker: Ошибка', event);
});

// Обработка активации
self.addEventListener('activate', function(event) {
    console.log('🔔 Service Worker: Активирован');
    event.waitUntil(self.clients.claim());
});

// Обработка установки
self.addEventListener('install', function(event) {
    console.log('🔔 Service Worker: Установлен');
    self.skipWaiting();
});
