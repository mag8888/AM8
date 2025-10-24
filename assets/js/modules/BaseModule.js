/**
 * BaseModule v1.0.0
 * Базовый класс для всех игровых модулей
 * Устраняет дублирование общих функций
 */

class BaseModule {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.gameStateManager = config.gameStateManager || null;
        this.roomApi = config.roomApi || null;
        
        // Общие свойства
        this.currentUserId = null;
        this.currentRoomId = null;
        this.isInitialized = false;
        
        console.log('🏗️ BaseModule: Инициализирован');
    }
    
    /**
     * Инициализация текущего пользователя
     */
    initCurrentUser() {
        try {
            // Пробуем получить пользователя из разных источников
            let userData = localStorage.getItem('currentUser');
            if (!userData) {
                userData = sessionStorage.getItem('am_player_bundle');
            }
            
            if (userData) {
                const user = JSON.parse(userData);
                this.currentUserId = user.id || user.userId;
                this.currentRoomId = user.roomId || this.getCurrentRoomId();
                console.log('✅ BaseModule: Пользователь инициализирован:', {
                    userId: this.currentUserId,
                    roomId: this.currentRoomId
                });
            } else {
                console.warn('⚠️ BaseModule: Данные пользователя не найдены');
            }
        } catch (error) {
            console.error('❌ BaseModule: Ошибка инициализации пользователя:', error);
        }
    }
    
    /**
     * Получение ID комнаты из URL
     */
    getCurrentRoomId() {
        // 1. Из URL hash
        const hash = window.location.hash;
        const hashMatch = hash.match(/roomId=([^&]+)/);
        if (hashMatch) return hashMatch[1];
        
        // 2. Из URL search params
        const searchParams = new URLSearchParams(window.location.search);
        const roomId = searchParams.get('roomId');
        if (roomId) return roomId;
        
        // 3. Из sessionStorage
        try {
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle.roomId;
            }
        } catch (e) {
            console.warn('⚠️ BaseModule: Ошибка получения roomId из sessionStorage:', e);
        }
        
        return null;
    }
    
    /**
     * Получение текущего пользователя из GameState
     */
    async getCurrentUserPlayer() {
        if (!this.gameState && !this.gameStateManager) return null;
        
        // Автоматически исправляем currentUserId если он не соответствует игрокам в игре
        if (this.currentUserId) {
            const gameStateManager = this.gameStateManager || window.app?.getModule?.('gameStateManager');
            const state = gameStateManager?.getState?.();
            const players = state?.players || [];
            
            // Проверяем, есть ли игрок с таким ID
            let player = players.find(p => p.id === this.currentUserId);
            
            // Если не найден по ID, ищем по username из localStorage
            if (!player) {
                try {
                    const userData = localStorage.getItem('currentUser');
                    if (userData) {
                        const user = JSON.parse(userData);
                        player = players.find(p => p.username === user.username);
                        if (player) {
                            console.log('🔧 BaseModule: Автоматически исправляем currentUserId с', this.currentUserId, 'на', player.id);
                            this.currentUserId = player.id;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ BaseModule: Ошибка автоматического исправления currentUserId:', e);
                }
            }
            
            return player;
        }
        
        return null;
    }
    
    /**
     * Получение текущего пользователя с fallback логикой
     */
    async getCurrentUserPlayerWithFallback() {
        console.log('🔧 BaseModule: Используем fallback логику для получения игрока...');
        
        const gameStateManager = this.gameStateManager || window.app?.getModule?.('gameStateManager');
        const state = gameStateManager?.getState?.();
        const players = state?.players || [];
        
        console.log('🔧 BaseModule: Игроки в игре:', players.map(p => ({ id: p.id, username: p.username })));
        
        // Ищем по username из localStorage
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                const player = players.find(p => p.username === user.username);
                if (player) {
                    console.log('✅ BaseModule: Найден игрок через fallback:', player.username);
                    this.currentUserId = player.id;
                    return player;
                }
            }
        } catch (e) {
            console.warn('⚠️ BaseModule: Ошибка fallback логики:', e);
        }
        
        return null;
    }
    
    /**
     * Форматирование числа с разделителями
     */
    formatNumber(num) {
        if (typeof num !== 'number') return '0';
        return num.toLocaleString('ru-RU');
    }
    
    /**
     * Показ уведомления
     */
    showNotification(message, type = 'info') {
        if (this.eventBus) {
            this.eventBus.emit('notification', { message, type });
        } else {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
        }
    }
    
    /**
     * Дебаунсинг для предотвращения частых вызовов
     */
    debounce(func, delay = 300) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * Проверка инициализации модуля
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            console.warn('⚠️ BaseModule: Модуль не инициализирован');
            return false;
        }
        return true;
    }
    
    /**
     * Уничтожение модуля
     */
    destroy() {
        this.gameState = null;
        this.eventBus = null;
        this.gameStateManager = null;
        this.roomApi = null;
        this.currentUserId = null;
        this.currentRoomId = null;
        this.isInitialized = false;
        console.log('🗑️ BaseModule: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.BaseModule = BaseModule;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseModule;
}

console.log('✅ BaseModule: Загружен');
