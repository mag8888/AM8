/**
 * RoomService v2.0.0 - Refactored
 * Клиентский сервис для работы с игровыми комнатами
 * 
 * Основные улучшения:
 * - Устранено дублирование комнат
 * - Улучшена архитектура управления данными
 * - Добавлена система кэширования
 * - Оптимизирована инициализация
 */
class RoomService {
    constructor() {
        this._initializeConfiguration();
        this._initializeState();
        this._initializeData();
    }

    /**
     * Инициализация конфигурации сервиса
     * @private
     */
    _initializeConfiguration() {
        const isLocal = this._isLocalEnvironment();
        
        this.config = {
            isLocal,
            baseUrl: isLocal ? 'http://localhost:3002/api/rooms' : 'https://am8-production.up.railway.app/api/rooms',
            useMockData: false, // Используем реальный API для работы с сервером
            localStorageKey: 'aura_money_dynamic_rooms',
            cacheTimeout: 120000, // Увеличиваем до 120 секунд для устранения перегрузки
            maxRetries: 3,
            useDynamicRooms: false // Отключаем динамические комнаты, используем серверную БД
        };
        
        // Дублируем для совместимости
        this.useMockData = false;

        console.log(`🏠 RoomService v2.0.0: Инициализация ${isLocal ? 'локального' : 'продакшн'} режима`);
    }

    /**
     * Инициализация состояния сервиса
     * @private
     */
    _initializeState() {
        this.state = {
            currentRoom: null,
            rooms: [],
            lastUpdate: null,
            isLoading: false,
            error: null
        };
        this.roomsCacheKey = 'am_rooms_cache_v1';
        
        // Rate limiting для предотвращения HTTP 429 - оптимизирован для производительности
        this.requestQueue = {
            lastRequest: 0,
            minInterval: 10000, // Увеличиваем до 10 секунд для полного избежания rate limiting
            backoffMultiplier: 1.3, // Более мягкий рост backoff
            maxBackoff: 15000, // Уменьшаем максимум до 15 секунд
            currentBackoff: 0,
            rateLimitedUntil: 0,
            // Система приоритетов
            priorities: {
                CRITICAL: 0,    // Игровые действия (бросок, ход)
                HIGH: 1,        // Состояние игры, банк
                NORMAL: 2,      // Список комнат, статистика
                LOW: 3          // Фоновые обновления
            }
        };
    }

    /**
     * Инициализация данных (мок-данные + localStorage)
     * @private
     */
    _initializeData() {
        if (this.config.useMockData) {
            this._initializeMockData();
            this._loadPersistedRooms();
        }
    }

    /**
     * Проверка локального окружения
     * @private
     */
    _isLocalEnvironment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '0.0.0.0';
    }

    /**
     * Инициализация базовых мок-данных
     * @private
     */
    _initializeMockData() {
        const now = Date.now();
        
        // Базовые комнаты - одинаковые для всех браузеров
        this.mockRooms = [
            this._createMockRoomObject({
                id: 'room-demo-1',
                name: 'Демо комната 1',
                maxPlayers: 4,
                playerCount: 2,
                creator: 'demo_user',
                turnTime: 30,
                assignProfessions: true,
                players: [
                    { id: 'p1', username: 'demo_user', name: 'demo_user', isHost: true },
                    { id: 'p2', username: 'player1', name: 'player1', isHost: false }
                ],
                createdAt: new Date(now - 60000).toISOString()
            }),
            this._createMockRoomObject({
                id: 'room-tournament-1',
                name: 'Турнирная комната',
                maxPlayers: 6,
                playerCount: 3,
                creator: 'tournament_master',
                turnTime: 60,
                assignProfessions: false,
                players: [
                    { id: 'p3', username: 'tournament_master', name: 'tournament_master', isHost: true },
                    { id: 'p4', username: 'player2', name: 'player2', isHost: false },
                    { id: 'p5', username: 'player3', name: 'player3', isHost: false }
                ],
                createdAt: new Date(now - 30000).toISOString()
            }),
            this._createMockRoomObject({
                id: 'room-public-1',
                name: 'Публичная комната',
                maxPlayers: 4,
                playerCount: 1,
                creator: 'public_host',
                turnTime: 45,
                assignProfessions: true,
                players: [
                    { id: 'p6', username: 'public_host', name: 'public_host', isHost: true }
                ],
                createdAt: new Date(now - 120000).toISOString()
            }),
            this._createMockRoomObject({
                id: 'room-fast-1',
                name: 'Быстрая игра',
                maxPlayers: 4,
                playerCount: 3,
                creator: 'speed_player',
                turnTime: 15,
                assignProfessions: false,
                players: [
                    { id: 'p7', username: 'speed_player', name: 'speed_player', isHost: true },
                    { id: 'p8', username: 'fast_user1', name: 'fast_user1', isHost: false },
                    { id: 'p9', username: 'fast_user2', name: 'fast_user2', isHost: false }
                ],
                createdAt: new Date(now - 90000).toISOString()
            })
        ];

        console.log('🏠 RoomService: Базовые мок-данные инициализированы (4 комнаты)');
    }

    /**
     * Создание объекта мок-комнаты с дефолтными значениями
     * @private
     */
    _createMockRoom(roomData) {
        return {
            id: roomData.id,
            name: roomData.name,
            maxPlayers: roomData.maxPlayers || 4,
            playerCount: roomData.playerCount || 0,
            status: roomData.status || 'waiting',
            isStarted: roomData.isStarted || false,
            isFull: roomData.isFull || false,
            creator: roomData.creator || 'unknown',
            turnTime: roomData.turnTime || 30,
            assignProfessions: roomData.assignProfessions || false,
            players: roomData.players || [],
            createdAt: roomData.createdAt || new Date().toISOString()
        };
    }

    /**
     * Загрузка сохраненных комнат из localStorage
     * @private
     */
    _loadPersistedRooms() {
        // Если динамические комнаты отключены, пропускаем загрузку
        if (!this.config.useDynamicRooms) {
            console.log('📂 RoomService: Динамические комнаты отключены');
            return;
        }

        try {
            const saved = localStorage.getItem(this.config.localStorageKey);
            if (!saved) {
                console.log('📂 RoomService: Нет сохраненных комнат в localStorage');
                return;
            }

            const persistedRooms = JSON.parse(saved);
            if (!Array.isArray(persistedRooms)) {
                console.warn('⚠️ RoomService: Неверный формат сохраненных комнат');
                return;
            }

            // Добавляем только новые комнаты (по ID)
            const existingIds = new Set(this.mockRooms.map(room => room.id));
            const newRooms = persistedRooms.filter(room => !existingIds.has(room.id));

            if (newRooms.length > 0) {
                this.mockRooms = [...newRooms, ...this.mockRooms];
                console.log(`📂 RoomService: Загружено ${newRooms.length} новых комнат из localStorage`);
            } else {
                console.log('📂 RoomService: Нет новых комнат для загрузки');
            }

        } catch (error) {
            console.error('❌ RoomService: Ошибка загрузки сохраненных комнат:', error);
        }
    }

    /**
     * Сохранение динамических комнат в localStorage
     * @private
     */
    _savePersistedRooms() {
        try {
            const dynamicRooms = this.mockRooms.filter(room => 
                room.id.startsWith('mock-room-')
            );
            
            localStorage.setItem(this.config.localStorageKey, JSON.stringify(dynamicRooms));
            console.log(`💾 RoomService: Сохранено ${dynamicRooms.length} динамических комнат`);
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка сохранения комнат:', error);
        }
    }

    /**
     * Получение списка всех комнат
     * @returns {Promise<Array>}
     */
    async getAllRooms() {
        try {
            console.log('🏠 RoomService: Получение списка комнат');
            
            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._getMockRooms();
            }

            // Пытаемся получить данные с API
            let rooms = await this._fetchRoomsFromAPI();
            if (!rooms || rooms.length === 0) {
                const cached = this._readRoomsCache();
                if (cached && cached.length) rooms = cached;
            }
            this.state.rooms = rooms;
            this.state.lastUpdate = Date.now();
            this._writeRoomsCache(rooms);
            return rooms;

        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнат:', error);
            
            // Проверяем, является ли ошибка rate limiting
            const isRateLimited = error.message && error.message.includes('Rate limited');
            
            if (isRateLimited) {
                console.log('⏳ RoomService: Rate limited, используем кэш вместо fallback');
            }
            
            // Пробуем кэш
            const cached = this._readRoomsCache();
            if (cached && cached.length) {
                console.log('🗂️ RoomService: Используем кэш комнат из localStorage');
                this.state.rooms = cached;
                this.state.lastUpdate = Date.now();
                return cached;
            }
            
            // Fallback на мок-данные только если нет кэша и это не rate limiting
            if (!isRateLimited) {
                console.log('🔄 RoomService: Fallback на мок-данные из-за ошибки API');
                return this._getMockRooms();
            } else {
                console.log('🚫 RoomService: Rate limited и нет кэша, возвращаем пустой массив');
                return [];
            }
        }
    }

    /**
     * Получение мок-комнат
     * @private
     */
    _getMockRooms() {
        // Сортируем комнаты по дате создания (новые вверху)
        const sortedRooms = [...this.mockRooms].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        this.state.rooms = sortedRooms;
        this.state.lastUpdate = Date.now();
        this._writeRoomsCache(sortedRooms);
        
        return sortedRooms;
    }

    /**
     * Получение комнат с API с защитой от rate limiting
     * @private
     */
    async _fetchRoomsFromAPI() {
        // Проверяем локальный rate limiting перед запросом
        await this._waitForRateLimit('NORMAL');
        
        // Проверяем глобальный rate limiter для RoomService
        if (window.CommonUtils && !window.CommonUtils.canMakeRoomsRequest()) {
            console.log('🚫 RoomService: Пропускаем запрос к rooms из-за глобального rate limiting');
            throw new Error('Rate limited by global limiter');
        }
        
        // Устанавливаем флаг pending в глобальном limiter
        if (window.CommonUtils) {
            window.CommonUtils.roomServiceLimiter.setRequestPending('rooms');
        }
        
        try {
            // Глобальный limiter уже проверил и дал разрешение, делаем запрос напрямую
            const response = await fetch(this.config.baseUrl, {
                method: 'GET',
            headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = this._parseRetryAfter(response);
                    const backoff = this._increaseBackoff(retryAfter);
                    console.warn('⚠️ RoomService: HTTP 429, увеличиваем задержку до', backoff, 'мс');
                    throw new Error(`Rate limited! Retry after ${backoff}ms`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Сбрасываем backoff при успешном запросе
            this._resetBackoff();
            const data = await response.json();
            
        if (!data.success) {
                throw new Error(data.message || 'Ошибка получения комнат');
            }
            
        // Преобразуем формат данных с сервера в формат клиента
        return data.data.map(room => ({
            id: room.id,
            name: room.name,
            description: room.description || '',
            maxPlayers: room.maxPlayers,
            playerCount: room.playerCount,
            status: room.status,
            isStarted: room.isStarted,
            isFull: room.isFull,
            creator: room.creator,
            turnTime: room.turnTime,
            assignProfessions: room.assignProfessions,
            players: room.players || [],
            createdAt: room.createdAt,
            updatedAt: room.updatedAt
        }));
        } finally {
            // Очищаем флаг pending в глобальном limiter
            if (window.CommonUtils) {
                window.CommonUtils.roomServiceLimiter.clearRequestPending('rooms');
            }
        }
    }

    /**
     * Ожидание для соблюдения rate limit с поддержкой приоритетов
     * @param {string} priority - Приоритет запроса
     * @private
     */
    async _waitForRateLimit(priority = 'NORMAL') {
        // Проверяем возможность выполнения запроса с учетом приоритета
        if (!this._canMakeRequest(priority)) {
            const priorityLevel = this.requestQueue.priorities[priority] || 2;
            const baseInterval = this.requestQueue.minInterval;
            const priorityMultiplier = Math.pow(2, priorityLevel);
            const requiredInterval = baseInterval * priorityMultiplier;
            const now = Date.now();
            const waitTime = requiredInterval - (now - this.requestQueue.lastRequest);
            
            if (waitTime > 0) {
                console.log(`⏳ RoomService: Приоритет ${priority}, ожидание ${waitTime}мс`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        // Проверяем rate limiting от сервера
        const now = Date.now();
        const nextAllowedByRateLimit = this.requestQueue.rateLimitedUntil || 0;
        
        if (now < nextAllowedByRateLimit) {
            const waitTime = nextAllowedByRateLimit - now;
            
            // Для критичных запросов ждем меньше
            if (priority === 'CRITICAL' && waitTime > 10000) {
                console.log(`⚠️ RoomService: Критичный запрос, игнорируем длительный rate limit (${waitTime}мс)`);
            } else if (waitTime <= 5000) {
                console.log(`⏳ RoomService: Короткое ожидание ${waitTime}мс`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                console.log(`⏳ RoomService: Rate limited. Следующая попытка через ${waitTime}мс`);
                this._scheduleRetry(waitTime);
                throw new Error(`Rate limited. Следующая попытка через ${waitTime}мс`);
            }
        }

        this.requestQueue.lastRequest = Date.now();
    }

    /**
     * Планировщик одиночной повторной попытки после лимита
     * @private
     */
    _scheduleRetry(waitMs) {
        if (this._retryTimer) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
        }
        this._retryTimer = setTimeout(() => {
            this._retryTimer = null;
            try { this.refreshRoomsList?.(); } catch (_) {}
            try { this.getStats?.(); } catch (_) {}
        }, Math.max(0, waitMs));
    }

    /**
     * Увеличение backoff при ошибках
     * @private
     */
    _increaseBackoff(preferredMs = 0) {
        let newBackoff = 0;
        
        if (preferredMs && preferredMs > 0) {
            // Если сервер указал конкретное время ожидания — ограничиваем разумными пределами
            const maxServerWait = 60000; // Максимум 60 секунд от сервера
            const minServerWait = 2000;  // Минимум 2 секунды от сервера
            newBackoff = Math.min(Math.max(preferredMs, minServerWait), maxServerWait);
            console.log(`🔄 RoomService: Сервер запросил ${preferredMs}мс, ограничиваем до ${newBackoff}мс`);
        } else if (this.requestQueue.currentBackoff === 0) {
            // Первая ошибка - минимальная задержка
            newBackoff = this.requestQueue.minInterval;
        } else {
            // Экспоненциальное увеличение с ограничением
            newBackoff = Math.min(
                this.requestQueue.currentBackoff * this.requestQueue.backoffMultiplier,
                this.requestQueue.maxBackoff
            );
        }

        this.requestQueue.currentBackoff = newBackoff;
        
        // Устанавливаем время окончания rate limit только если оно больше текущего времени
        const newRateLimitedUntil = Date.now() + newBackoff;
        if (newRateLimitedUntil > this.requestQueue.rateLimitedUntil) {
            this.requestQueue.rateLimitedUntil = newRateLimitedUntil;
        }
        
        return this.requestQueue.currentBackoff;
    }

    _resetBackoff() {
        this.requestQueue.currentBackoff = 0;
        this.requestQueue.rateLimitedUntil = 0;
    }

    /**
     * Проверка возможности выполнения запроса с учетом приоритета
     * @param {string} priority - Приоритет запроса
     * @returns {boolean}
     * @private
     */
    _canMakeRequest(priority = 'NORMAL') {
        const now = Date.now();
        const priorityLevel = this.requestQueue.priorities[priority] || 2;
        
        // Критичные запросы всегда разрешены (с минимальной задержкой)
        if (priorityLevel === 0) {
            const minCriticalDelay = 500; // 500мс для критичных запросов
            if (now - this.requestQueue.lastRequest < minCriticalDelay) {
                console.log(`⏳ RoomService: Критичный запрос, минимальная задержка ${minCriticalDelay}мс`);
                return false;
            }
            return true;
        }
        
        // Обычные проверки для остальных приоритетов
        const baseInterval = this.requestQueue.minInterval;
        const priorityMultiplier = Math.pow(2, priorityLevel); // 1, 2, 4, 8
        const requiredInterval = baseInterval * priorityMultiplier;
        
        if (now - this.requestQueue.lastRequest < requiredInterval) {
            console.log(`⏳ RoomService: Приоритет ${priority} (${priorityLevel}), требуется ${requiredInterval}мс`);
            return false;
        }
        
        return true;
    }

    _parseRetryAfter(response) {
        const header = response.headers?.get?.('Retry-After') || response.headers?.get?.('retry-after');
        if (!header) {
            return 0;
        }

        const retrySeconds = Number(header);
        if (Number.isNaN(retrySeconds)) {
            return 0;
        }

        return retrySeconds * 1000;
    }

    // КЭШ комнат
    _writeRoomsCache(rooms) {
        try { localStorage.setItem(this.roomsCacheKey, JSON.stringify(rooms || [])); } catch (_) {}
    }
    _readRoomsCache() {
        try { const raw = localStorage.getItem(this.roomsCacheKey); return raw ? JSON.parse(raw) : []; } catch (_) { return []; }
    }

    /**
     * Получение комнаты по ID
     * @param {string} roomId
     * @returns {Promise<Object>}
     */
    async getRoomById(roomId) {
        try {
            console.log('🏠 RoomService: Получение комнаты по ID:', roomId);
            
            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._findMockRoomById(roomId);
            }

            // Пытаемся получить с API
            const room = await this._fetchRoomFromAPI(roomId);
            return room;

        } catch (error) {
            console.error('❌ RoomService: Ошибка получения комнаты:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                return this._findMockRoomById(roomId);
            }
            
            return null;
        }
    }

    /**
     * Поиск мок-комнаты по ID
     * @private
     */
    _findMockRoomById(roomId) {
        const room = this.mockRooms.find(r => r.id === roomId);
        if (room) {
            console.log('✅ RoomService: Комната найдена в мок-данных:', room.name);
            return room;
        } else {
            console.warn('⚠️ RoomService: Комната не найдена в мок-данных');
            return null;
        }
    }

    /**
     * Получение комнаты с API
     * @private
     */
    async _fetchRoomFromAPI(roomId) {
        await this._waitForRateLimit();

        const response = await fetch(`${this.config.baseUrl}/${roomId}`, {
                method: 'GET',
            headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = this._parseRetryAfter(response);
                    const backoff = this._increaseBackoff(retryAfter);
                    console.warn('⚠️ RoomService: HTTP 429 при получении комнаты, увеличиваем задержку до', backoff, 'мс');
                    throw new Error(`Rate limited! Retry after ${backoff}ms`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this._resetBackoff();

            const data = await response.json();
            
        if (!data.success) {
                throw new Error(data.message || 'Комната не найдена');
            }
            
        // Преобразуем формат данных с сервера в формат клиента
        const room = data.data;
        return {
            id: room.id,
            name: room.name,
            description: room.description || '',
            maxPlayers: room.maxPlayers,
            playerCount: room.playerCount,
            status: room.status,
            isStarted: room.isStarted,
            isFull: room.isFull,
            creator: room.creator,
            turnTime: room.turnTime,
            assignProfessions: room.assignProfessions,
            players: room.players || [],
            createdAt: room.createdAt,
            updatedAt: room.updatedAt
        };
    }

    /**
     * Создание новой комнаты
     * @param {Object} roomData
     * @param {Object} creator
     * @returns {Promise<Object>}
     */
    async createRoom(roomData, creator) {
        try {
            console.log('🏠 RoomService: Создание комнаты:', roomData.name);
            
            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._createMockRoom(roomData, creator);
            }

            // Пытаемся создать через API
            const room = await this._createRoomViaAPI(roomData, creator);
            
            // Отправляем push-уведомление
            await this._sendRoomCreatedNotification(room, creator);
            
            return room;

        } catch (error) {
            console.error('❌ RoomService: Ошибка создания комнаты:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                console.log('🔄 RoomService: Fallback на создание мок-комнаты');
                return this._createMockRoom(roomData, creator);
            }
            
            throw error;
        }
    }

    /**
     * Создание объекта мок-комнаты
     * @param {Object} roomData - Данные комнаты
     * @param {Object} creator - Создатель комнаты
     * @returns {Object}
     * @private
     */
    _createMockRoomObject(roomData, creator) {
        const safeCreator = creator || {};
        
        return {
            id: roomData.id || 'mock-room-' + Date.now(),
            name: roomData.name || 'Новая комната',
            maxPlayers: roomData.maxPlayers || 4,
            playerCount: roomData.playerCount || 1,
            status: roomData.status || 'waiting',
            isStarted: roomData.isStarted || false,
            isFull: roomData.isFull || false,
            creator: roomData.creator || safeCreator.username || 'unknown',
            turnTime: roomData.turnTime || 30,
            assignProfessions: roomData.assignProfessions || false,
            players: roomData.players || [{
                id: safeCreator.id || 'creator-id',
                username: safeCreator.username || 'creator',
                name: safeCreator.username || 'creator',
                isHost: true
            }],
            createdAt: roomData.createdAt || new Date().toISOString()
        };
    }

    /**
     * Создание мок-комнаты
     * @private
     */
    _createMockRoom(roomData, creator) {
        // Обеспечиваем безопасность creator
        const safeCreator = creator || {};
        
        const newRoom = this._createMockRoomObject({
            id: 'mock-room-' + Date.now(),
            name: roomData.name || 'Новая комната',
            maxPlayers: roomData.maxPlayers || 4,
            playerCount: 1,
            creator: safeCreator.username || 'unknown',
            turnTime: roomData.turnTime || 30,
            assignProfessions: roomData.assignProfessions || false,
            players: [{
                id: safeCreator.id || 'creator-id',
                username: safeCreator.username || 'creator',
                name: safeCreator.username || 'creator',
                isHost: true
            }]
        });

        // Добавляем комнату в начало списка
        this.mockRooms.unshift(newRoom);
        
        // Сохраняем в localStorage
        this._savePersistedRooms();
        
        console.log('✅ RoomService: Мок-комната создана:', newRoom.name);
        
        return newRoom;
    }

    /**
     * Создание комнаты через API с защитой от rate limiting
     * @private
     */
    async _createRoomViaAPI(roomData, creator) {
        // Проверяем rate limiting
        await this._waitForRateLimit();
        
        const requestData = {
            name: roomData.name,
            description: roomData.description || '',
            maxPlayers: roomData.maxPlayers || 4,
            turnTime: roomData.turnTime || 30,
            assignProfessions: roomData.assignProfessions || false,
            creator: creator.username || creator.name || 'unknown'
        };

        const response = await fetch(this.config.baseUrl, {
                method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            if (response.status === 429) {
                const retryAfter = this._parseRetryAfter(response);
                const backoff = this._increaseBackoff(retryAfter);
                console.warn('⚠️ RoomService: HTTP 429 при создании комнаты, увеличиваем задержку до', backoff, 'мс');
                throw new Error(`Rate limited! Retry after ${backoff}ms`);
            }
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Сбрасываем backoff при успешном запросе
        this._resetBackoff();
        const data = await response.json();
            
        if (!data.success) {
            throw new Error(data.message || 'Ошибка создания комнаты');
        }

        // Преобразуем формат данных с сервера в формат клиента
        const room = data.data;
        return {
            id: room.id,
            name: room.name,
            description: room.description || '',
            maxPlayers: room.maxPlayers,
            playerCount: room.playerCount,
            status: room.status,
            isStarted: room.isStarted,
            isFull: room.isFull,
            creator: room.creator,
            turnTime: room.turnTime,
            assignProfessions: room.assignProfessions,
            players: room.players || [],
            createdAt: room.createdAt,
            updatedAt: room.updatedAt
        };
    }

    /**
     * Отправка уведомления о создании комнаты
     * @private
     */
    async _sendRoomCreatedNotification(room, creator) {
                try {
                    if (window.pushClient && typeof window.pushClient.sendBroadcastPush === 'function') {
                        await window.pushClient.sendBroadcastPush('room_created', {
                    roomId: room.id,
                    roomName: room.name,
                            creator: creator.username,
                    playerCount: room.playerCount,
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                            timestamp: new Date().toISOString()
                }, true);
                
                console.log('📡 RoomService: Push-уведомление отправлено');
            }
        } catch (error) {
            console.error('⚠️ RoomService: Ошибка отправки push-уведомления:', error);
        }
    }

    /**
     * Присоединение к комнате
     * @param {string} roomId
     * @param {Object} player
     * @returns {Promise<Object>}
     */
    async joinRoom(roomId, player) {
        try {
            console.log('🏠 RoomService: Присоединение к комнате:', roomId);
            
            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._joinMockRoom(roomId, player);
            }

            // Пытаемся присоединиться через API
            const room = await this._joinRoomViaAPI(roomId, player);
            this.state.currentRoom = room;
            
            return room;

        } catch (error) {
            console.error('❌ RoomService: Ошибка присоединения к комнате:', error);
            
            // Fallback на мок-данные
            if (this.config.useMockData) {
                return this._joinMockRoom(roomId, player);
            }
            
            throw error;
        }
    }

    /**
     * Присоединение к мок-комнате
     * @private
     */
    _joinMockRoom(roomId, player) {
        const room = this.mockRooms.find(r => r.id === roomId);
        if (!room) {
            throw new Error('Комната не найдена');
        }

        if (room.playerCount >= room.maxPlayers) {
            throw new Error('Комната заполнена');
        }

        // Проверяем, не присоединился ли уже игрок
        const existingPlayer = room.players.find(p => p.userId === player.userId);
        if (existingPlayer) {
            console.log('✅ RoomService: Игрок уже в комнате');
            this.state.currentRoom = room;
            return room;
        }

        // Добавляем игрока
        const newPlayer = {
            id: 'player-' + Date.now(),
            userId: player.userId,
            username: player.username,
            name: player.name,
            isHost: false
        };

        room.players.push(newPlayer);
        room.playerCount = room.players.length;
        
        this.state.currentRoom = room;
        this._savePersistedRooms();
        
        console.log('✅ RoomService: Присоединение к мок-комнате успешно:', room.name);
        
        return room;
    }

    /**
     * Присоединение к комнате через API
     * @private
     */
    async _joinRoomViaAPI(roomId, player) {
        await this._waitForRateLimit();

        const requestData = {
            player: {
                userId: player.userId,
                username: player.username || player.name || 'unknown',
                name: player.name || player.username || 'unknown',
                avatar: player.avatar || '',
                token: player.token || '',
                dream: player.dream || '',
                dreamCost: player.dreamCost || 0
            }
        };

        const response = await fetch(`${this.config.baseUrl}/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            if (response.status === 429) {
                const retryAfter = this._parseRetryAfter(response);
                const backoff = this._increaseBackoff(retryAfter);
                console.warn('⚠️ RoomService: HTTP 429 при присоединении к комнате, увеличиваем задержку до', backoff, 'мс');
                throw new Error(`Rate limited! Retry after ${backoff}ms`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        this._resetBackoff();

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Ошибка присоединения к комнате');
        }

        // После успешного присоединения получаем обновленную комнату
        return await this.getRoomById(roomId);
    }

    /**
     * Получение статистики комнат
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            console.log('🏠 RoomService: Получение статистики');

            // Используем мок-данные если настроено
            if (this.config.useMockData) {
                return this._getMockStats();
            }

            // Пытаемся получить с API
            const stats = await this._fetchStatsFromAPI();
            return stats;

        } catch (error) {
            console.error('❌ RoomService: Ошибка получения статистики:', error);
            
            // Проверяем, является ли ошибка rate limiting
            const isRateLimited = error.message && error.message.includes('Rate limited');
            
            if (isRateLimited) {
                console.log('⏳ RoomService: Статистика rate limited, используем кэшированные данные');
            }
            
            // Всегда возвращаем безопасный фолбэк, чтобы UI не ломался
            try {
                return this._getMockStats();
            } catch(_) {
                return { totalRooms: this.state.rooms?.length || 0, activeRooms: 0, gamesStarted: 0, playersOnline: 0 };
            }
        }
    }

    /**
     * Получение мок-статистики
     * @private
     */
    _getMockStats() {
        const stats = {
            totalRooms: this.mockRooms.length,
            activeRooms: this.mockRooms.filter(r => !r.isStarted).length,
            gamesStarted: this.mockRooms.filter(r => r.isStarted).length,
            playersOnline: this.mockRooms.reduce((sum, r) => sum + r.playerCount, 0)
        };
        
        console.log('🏠 RoomService: Использование мок-статистики');
        return stats;
    }

    /**
     * Получение статистики с API с защитой от rate limiting
     * @private
     */
    async _fetchStatsFromAPI() {
        // Проверяем локальный rate limiting перед запросом
        await this._waitForRateLimit('LOW');
        
        // Проверяем глобальный rate limiter для RoomService
        if (window.CommonUtils && !window.CommonUtils.canMakeStatsRequest()) {
            console.log('🚫 RoomService: Пропускаем запрос к stats из-за глобального rate limiting');
            throw new Error('Rate limited by global limiter');
        }
        
        // Устанавливаем флаг pending в глобальном limiter
        if (window.CommonUtils) {
            window.CommonUtils.roomServiceLimiter.setRequestPending('stats');
        }
        
        try {
            // Глобальный limiter уже проверил и дал разрешение, делаем запрос напрямую
            // Используем новый endpoint для статистики
            const baseUrl = this.config.baseUrl.replace('/api/rooms', '/api/stats');
            
            const response = await fetch(baseUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            if (response.status === 429) {
                const retryAfter = this._parseRetryAfter(response);
                const backoff = this._increaseBackoff(retryAfter);
                console.warn('⚠️ RoomService: HTTP 429 при получении статистики, увеличиваем задержку до', backoff, 'мс');
                throw new Error(`Rate limited! Retry after ${backoff}ms`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Сбрасываем backoff при успешном запросе
        this._resetBackoff();
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Ошибка получения статистики');
        }

        // Преобразуем формат данных с сервера в формат клиента
        const serverStats = data.data;
        return {
            totalRooms: serverStats.totalRooms || 0,
            activeRooms: serverStats.activeRooms || 0,
            gamesInProgress: serverStats.gamesInProgress || 0,
            playersOnline: serverStats.playersOnline || 0,
            totalUsers: serverStats.totalUsers || 0
        };
        } finally {
            // Очищаем флаг pending в глобальном limiter
            if (window.CommonUtils) {
                window.CommonUtils.roomServiceLimiter.clearRequestPending('stats');
            }
        }
    }

    /**
     * Запуск игры
     * @param {string} roomId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async startGame(roomId, userId) {
        try {
            console.log('🏠 RoomService: Запуск игры в комнате:', roomId);
            await this._waitForRateLimit('CRITICAL');
            
            const response = await fetch(`${this.config.baseUrl}/${roomId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = this._parseRetryAfter(response);
                    const backoff = this._increaseBackoff(retryAfter);
                    console.warn('⚠️ RoomService: HTTP 429 при запуске игры, увеличиваем задержку до', backoff, 'мс');
                    throw new Error(`Rate limited! Retry after ${backoff}ms`);
                }
                
                // Получаем детали ошибки от сервера
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                    console.error('❌ RoomService: Детали ошибки запуска игры:', errorData);
                } catch (e) {
                    console.error('❌ RoomService: Не удалось получить детали ошибки');
                }
                
                throw new Error(errorMessage);
            }

            this._resetBackoff();

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка запуска игры');
            }

            this.state.currentRoom = data.data;
            return data.data;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка запуска игры:', error);
            throw error;
        }
    }

    /**
     * Обновление комнаты
     * @param {string} roomId
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async updateRoom(roomId, updates) {
        try {
            console.log('🏠 RoomService: Обновление комнаты:', roomId);
            await this._waitForRateLimit();
            
            const response = await fetch(`${this.config.baseUrl}/${roomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = this._parseRetryAfter(response);
                    const backoff = this._increaseBackoff(retryAfter);
                    console.warn('⚠️ RoomService: HTTP 429 при обновлении комнаты, увеличиваем задержку до', backoff, 'мс');
                    throw new Error(`Rate limited! Retry after ${backoff}ms`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this._resetBackoff();

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка обновления комнаты');
            }

            this.state.currentRoom = data.data;
            return data.data;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка обновления комнаты:', error);
            throw error;
        }
    }

    /**
     * Удаление комнаты
     * @param {string} roomId
     * @returns {Promise<boolean>}
     */
    async deleteRoom(roomId) {
        try {
            console.log('🏠 RoomService: Удаление комнаты:', roomId);
            await this._waitForRateLimit();
            
            const response = await fetch(`${this.config.baseUrl}/${roomId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = this._parseRetryAfter(response);
                    const backoff = this._increaseBackoff(retryAfter);
                    console.warn('⚠️ RoomService: HTTP 429 при удалении комнаты, увеличиваем задержку до', backoff, 'мс');
                    throw new Error(`Rate limited! Retry after ${backoff}ms`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this._resetBackoff();

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка удаления комнаты');
            }

            if (this.state.currentRoom && this.state.currentRoom.id === roomId) {
                this.state.currentRoom = null;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка удаления комнаты:', error);
            throw error;
        }
    }

    /**
     * Обновление данных игрока в комнате
     * @param {string} roomId
     * @param {Object} playerData
     * @returns {Promise<Object>}
     */
    async updatePlayerInRoom(roomId, playerData) {
        try {
            console.log('🏠 RoomService: Обновление игрока в комнате:', roomId, playerData);
            
            // Если используем мок-данные, обновляем локально
            if (this.config.useMockData || this.useMockData) {
                console.log('🏠 RoomService: Использование мок-обновления игрока');
                return this._updatePlayerInMockRoom(roomId, playerData);
            }
            
            // Принимаем единый PlayerBundle с полями { userId, username, token, dream{ id,title,description,cost }, isReady }
            const requestData = {
                username: playerData.username || playerData.name || 'unknown',
                token: playerData.token || '',
                dream: playerData.dream?.id || '',
                dreamCost: playerData.dream?.cost || 0,
                dreamDescription: playerData.dream?.description || '',
                isReady: !!playerData.isReady
            };

            await this._waitForRateLimit();

            const response = await fetch(`${this.config.baseUrl}/${roomId}/player`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const retryAfter = this._parseRetryAfter(response);
                    const backoff = this._increaseBackoff(retryAfter);
                    console.warn('⚠️ RoomService: HTTP 429 при обновлении игрока, увеличиваем задержку до', backoff, 'мс');
                    throw new Error(`Rate limited! Retry after ${backoff}ms`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this._resetBackoff();

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Ошибка обновления игрока');
            }

            return data;
            
        } catch (error) {
            console.error('❌ RoomService: Ошибка обновления игрока:', error);
            throw error;
        }
    }

    /**
     * Обновление игрока в мок-комнате
     * @param {string} roomId
     * @param {Object} playerData
     * @returns {Promise<Object>}
     * @private
     */
    _updatePlayerInMockRoom(roomId, playerData) {
        console.log('🏠 RoomService: Обновление игрока в мок-комнате:', roomId, playerData);
        
        const room = this.mockRooms.find(r => r.id === roomId);
        if (!room) {
            throw new Error('Комната не найдена');
        }

        // Находим игрока в комнате
        // Ищем по userId, id или username
        const playerIndex = room.players.findIndex(p => 
            p.id === playerData.id || 
            p.userId === playerData.userId || 
            p.username === playerData.username
        );
        if (playerIndex === -1) {
            console.log('🔍 RoomService: Поиск игрока в комнате:', {
                roomId: roomId,
                playerData: playerData,
                roomPlayers: room.players.map(p => ({ id: p.id, userId: p.userId, username: p.username }))
            });
            throw new Error('Игрок не найден в комнате');
        }

        // Обновляем данные игрока
        const oldPlayer = room.players[playerIndex];
        room.players[playerIndex] = { ...room.players[playerIndex], ...playerData };
        
        // Сохраняем обновленную комнату
        this._savePersistedRooms();
        
        console.log('✅ RoomService: Игрок успешно обновлен в мок-комнате:', {
            oldToken: oldPlayer.token,
            newToken: playerData.token,
            player: room.players[playerIndex]
        });
        return {
            success: true,
            player: room.players[playerIndex],
            room: room
        };
    }

    // Геттеры для состояния
    getCurrentRoom() { return this.state.currentRoom; }
    setCurrentRoom(room) { this.state.currentRoom = room; }
    clearCurrentRoom() { this.state.currentRoom = null; }
    getCachedRooms() { return this.state.rooms; }

    // Утилитарные методы
    isHost(userId, room = null) {
        const targetRoom = room || this.state.currentRoom;
        if (!targetRoom || !targetRoom.players) return false;
        // 1) Прямой флаг isHost
        const hostPlayer = targetRoom.players.find(p => p.isHost);
        if (hostPlayer && hostPlayer.userId === userId) return true;
        // 2) Если флагов нет — считаем хостом создателя комнаты
        const me = targetRoom.players.find(p => p.userId === userId);
        if (!me) return false;
        if (targetRoom.creator && me.username && targetRoom.creator === me.username) return true;
        return false;
    }

    getPlayer(userId, room = null) {
        const targetRoom = room || this.state.currentRoom;
        if (!targetRoom || !targetRoom.players) return null;
        
        return targetRoom.players.find(p => p.userId === userId) || null;
    }

    canJoinRoom(userId, room) {
        if (!room || !userId) return false;
        // Разрешаем присоединение после старта (тестовый режим)
        if (room.isFull) return false;
        
        const existingPlayer = this.getPlayer(userId, room);
        return !existingPlayer;
    }

    canStartGame(userId, room = null) {
        const targetRoom = room || this.state.currentRoom;
        if (!targetRoom || !userId) return false;
        
        // В тестовом режиме разрешаем старт, если есть хотя бы 1 готовый игрок
        const readyCount = (targetRoom.players || []).filter(p => p.isReady).length;
        const canStartByReady = readyCount >= 1;
        return this.isHost(userId, targetRoom) && !targetRoom.isStarted && (targetRoom.canStart || canStartByReady);
    }

    /**
     * Очистка кэша и сброс состояния
     */
    clearCache() {
        this.state.rooms = [];
        this.state.lastUpdate = null;
        this.state.currentRoom = null;
        console.log('🧹 RoomService: Кэш очищен');
    }

    /**
     * Очистка всех данных из localStorage
     */
    clearPersistedData() {
        localStorage.removeItem(this.config.localStorageKey);
        console.log('🧹 RoomService: Сохраненные данные очищены');
    }
}

// Экспорт для использования
if (typeof window !== 'undefined') {
    window.RoomService = RoomService;
}

// Version: 1760438000 - Refactored v2.0.0
