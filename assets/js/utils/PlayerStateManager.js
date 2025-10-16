/**
 * PlayerStateManager v1.0.0
 * Централизованное управление состоянием игроков
 * Устраняет дублирование логики между модулями
 */

class PlayerStateManager {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.selectedToken = null;
        this.dreamData = {
            id: '',
            title: '',
            description: '',
            cost: 0,
            icon: ''
        };
        
        this.listeners = new Map();
        this.cache = new Map();
        
        this.init();
    }
    
    /**
     * Инициализация
     */
    init() {
        this.loadCurrentUser();
        this.loadDreamData();
        this.loadSelectedToken();
    }
    
    /**
     * Загрузка текущего пользователя
     */
    loadCurrentUser() {
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                this.currentUser = bundle.currentUser;
                return;
            }
            
            // Fallback к localStorage
            const userRaw = localStorage.getItem('currentUser') || localStorage.getItem('aura_money_user');
            if (userRaw) {
                this.currentUser = JSON.parse(userRaw);
            }
            
            // Если currentUser не найден, создаем fallback
            if (!this.currentUser || !this.currentUser.username) {
                this.currentUser = {
                    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    username: 'player1',
                    name: 'Игрок 1',
                    avatar: '👤'
                };
            }
        } catch (error) {
            console.error('❌ PlayerStateManager: Ошибка загрузки пользователя:', error);
            this.currentUser = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                username: 'player1',
                name: 'Игрок 1',
                avatar: '👤'
            };
        }
    }
    
    /**
     * Загрузка данных мечты
     */
    loadDreamData() {
        try {
            const dreamRaw = localStorage.getItem('selected_dream');
            if (dreamRaw) {
                this.dreamData = JSON.parse(dreamRaw);
            }
        } catch (error) {
            console.warn('⚠️ PlayerStateManager: Ошибка загрузки мечты:', error);
        }
    }
    
    /**
     * Загрузка выбранного токена
     */
    loadSelectedToken() {
        this.selectedToken = localStorage.getItem('selected_token') || null;
    }
    
    /**
     * Получение текущего пользователя
     * @returns {Object|null} Данные пользователя
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     */
    getCurrentUserId() {
        return this.currentUser?.id || this.currentUser?.userId;
    }
    
    /**
     * Получение текущей комнаты
     * @returns {Object|null} Данные комнаты
     */
    getCurrentRoom() {
        return this.currentRoom;
    }
    
    /**
     * Установка текущей комнаты
     * @param {Object} room - Данные комнаты
     */
    setCurrentRoom(room) {
        this.currentRoom = room;
        this.notifyListeners('roomChanged', room);
    }
    
    /**
     * Получение выбранного токена
     * @returns {string|null} Токен
     */
    getSelectedToken() {
        return this.selectedToken;
    }
    
    /**
     * Установка выбранного токена
     * @param {string} token - Токен
     */
    setSelectedToken(token) {
        this.selectedToken = token;
        localStorage.setItem('selected_token', token);
        this.notifyListeners('tokenChanged', token);
    }
    
    /**
     * Получение данных мечты
     * @returns {Object} Данные мечты
     */
    getDreamData() {
        return this.dreamData;
    }
    
    /**
     * Установка данных мечты
     * @param {Object} dream - Данные мечты
     */
    setDreamData(dream) {
        this.dreamData = dream;
        localStorage.setItem('selected_dream', JSON.stringify(dream));
        this.notifyListeners('dreamChanged', dream);
    }
    
    /**
     * Проверка, готов ли игрок к игре
     * @returns {boolean} Готов ли игрок
     */
    isPlayerReady() {
        const isDreamComplete = this.dreamData.id && 
                               this.dreamData.title && 
                               this.dreamData.description && 
                               this.dreamData.cost > 0;
        const isTokenSelected = !!this.selectedToken;
        
        return isDreamComplete && isTokenSelected;
    }
    
    /**
     * Получение состояния игрока в комнате
     * @returns {Object|null} Состояние игрока
     */
    getPlayerInRoom() {
        if (!this.currentRoom || !this.currentUser) return null;
        
        return this.currentRoom.players.find(p => 
            p.userId === this.currentUser.id || 
            p.username === this.currentUser.username ||
            p.id === this.currentUser.id
        );
    }
    
    /**
     * Проверка, является ли игрок текущим пользователем
     * @param {Object} player - Данные игрока
     * @returns {boolean} Является ли текущим пользователем
     */
    isCurrentUser(player) {
        if (!this.currentUser || !player) return false;
        
        return player.id === this.currentUser.id ||
               player.userId === this.currentUser.id ||
               player.username === this.currentUser.username ||
               (player.username && this.currentUser.username && 
                player.username === this.currentUser.username);
    }
    
    /**
     * Получение пакета данных игрока для API
     * @returns {Object} Пакет данных
     */
    getPlayerBundle() {
        if (!this.currentUser) {
            throw new Error('Текущий пользователь не определен');
        }
        
        let userId = this.currentUser.id || this.currentUser.userId;
        if (!userId && this.currentUser.username) {
            userId = `user_${this.currentUser.username}_${Date.now()}`;
        }
        
        return {
            userId: userId,
            username: this.currentUser.username || this.currentUser.name,
            name: this.currentUser.name || this.currentUser.username,
            avatar: this.currentUser.avatar || '',
            token: this.selectedToken || '',
            dream: this.dreamData.id ? {
                id: this.dreamData.id,
                title: this.dreamData.title || '',
                description: this.dreamData.description || '',
                cost: Number(this.dreamData.cost) || 0
            } : null,
            isReady: this.isPlayerReady()
        };
    }
    
    /**
     * Валидация пакета данных игрока
     * @param {Object} bundle - Пакет данных
     * @returns {Object} Результат валидации
     */
    validatePlayerBundle(bundle) {
        if (!bundle?.userId || !bundle?.username) {
            return { isValid: false, message: 'Не удалось определить пользователя' };
        }
        if (!bundle?.token) {
            return { isValid: false, message: 'Выберите фишку' };
        }
        if (!bundle?.dream || !bundle.dream.id || !bundle.dream.title || !bundle.dream.cost) {
            return { isValid: false, message: 'Заполните мечту полностью' };
        }
        
        return { isValid: true };
    }
    
    /**
     * Подписка на изменения состояния
     * @param {string} event - Событие
     * @param {Function} callback - Обработчик
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Отписка от изменений состояния
     * @param {string} event - Событие
     * @param {Function} callback - Обработчик
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    /**
     * Уведомление слушателей
     * @param {string} event - Событие
     * @param {*} data - Данные
     */
    notifyListeners(event, data) {
        if (!this.listeners.has(event)) return;
        
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ PlayerStateManager: Ошибка в обработчике ${event}:`, error);
            }
        });
    }
    
    /**
     * Кэширование данных
     * @param {string} key - Ключ
     * @param {*} data - Данные
     * @param {number} ttl - Время жизни в мс
     */
    setCache(key, data, ttl = 5000) {
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl
        });
    }
    
    /**
     * Получение данных из кэша
     * @param {string} key - Ключ
     * @returns {*} Данные или null
     */
    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() > cached.expires) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Сброс состояния
     */
    reset() {
        this.currentUser = null;
        this.currentRoom = null;
        this.selectedToken = null;
        this.dreamData = {
            id: '',
            title: '',
            description: '',
            cost: 0,
            icon: ''
        };
        this.clearCache();
    }
}

// Создаем глобальный экземпляр
const playerStateManager = new PlayerStateManager();

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.PlayerStateManager = PlayerStateManager;
    window.playerStateManager = playerStateManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerStateManager;
}
