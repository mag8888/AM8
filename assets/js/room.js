/**
 * Room Page Controller v1.0.0
 * Управление страницей настройки комнаты
 */

// ==================== КОНСТАНТЫ ====================
const CONFIG = {
    CACHE_MAX_AGE: 5 * 60 * 1000, // 5 минут
    POLLING_INTERVAL: 30000, // 30 секунд
    MIN_UPDATE_INTERVAL: 60000, // 60 секунд
    ERROR_RETRY_DELAY: 120000, // 120 секунд при ошибке
    REDIRECT_DELAY: 2000, // 2 секунды
    NOTIFICATION_TIMEOUT: 5000 // 5 секунд
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let roomService;
let currentRoom = null;
let currentUser = null;
let selectedToken = null;
let dreamData = {
    title: '',
    description: '',
    cost: 0
};

// Управление таймерами
const timers = {
    polling: null,
    redirect: null,
    notification: null
};

// ==================== УТИЛИТЫ ====================

/**
 * Логгер для room.js (использует глобальный Logger если доступен)
 */
const RoomLogger = {
    isDevelopment: false, // Всегда production режим - используем только Railway
    
    log(message, ...args) {
        if (window.Logger && typeof window.Logger.log === 'function') {
            window.Logger.log(message, ...args);
        } else if (this.isDevelopment) {
            console.log(message, ...args);
        }
    },
    
    warn(message, ...args) {
        if (window.Logger && typeof window.Logger.warn === 'function') {
            window.Logger.warn(message, ...args);
        } else {
            console.warn(message, ...args);
        }
    },
    
    error(message, ...args) {
        if (window.Logger && typeof window.Logger.error === 'function') {
            window.Logger.error(message, ...args);
        } else {
            console.error(message, ...args);
        }
    },
    
    debug(message, ...args) {
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug(message, ...args);
        } else if (this.isDevelopment) {
            console.log(`🔍 ${message}`, ...args);
        }
    }
};

/**
 * Безопасный setTimeout с автоматической очисткой
 */
function safeSetTimeout(callback, delay, timerKey) {
    // Очищаем предыдущий таймер, если он существует
    if (timerKey && timers[timerKey]) {
        clearTimeout(timers[timerKey]);
    }
    
    const timeoutId = setTimeout(() => {
        if (timerKey) {
            timers[timerKey] = null;
        }
        callback();
    }, delay);
    
    if (timerKey) {
        timers[timerKey] = timeoutId;
    }
    
    return timeoutId;
}

/**
 * Очистка всех таймеров
 */
function clearAllTimers() {
    Object.keys(timers).forEach(key => {
        if (timers[key]) {
            if (typeof timers[key] === 'number') {
                clearTimeout(timers[key]);
            } else {
                clearInterval(timers[key]);
            }
            timers[key] = null;
        }
    });
    RoomLogger.debug('Room: Все таймеры очищены');
}

// Конфигурация мечт (реальные мечты из игры)
const DREAMS_CONFIG = [
    {
        id: 'dream_house',
        name: 'Построить дом мечты для семьи',
        description: 'Создать идеальный дом для всей семьи',
        cost: 100000,
        icon: '🏠'
    },
    {
        id: 'antarctica_trip',
        name: 'Посетить Антарктиду',
        description: 'Увидеть самый загадочный континент планеты',
        cost: 150000,
        icon: '🧊'
    },
    {
        id: 'mountain_peaks',
        name: 'Подняться на все высочайшие вершины мира',
        description: 'Покорить все самые высокие горы планеты',
        cost: 500000,
        icon: '🏔️'
    },
    {
        id: 'bestseller_author',
        name: 'Стать автором книги-бестселлера',
        description: 'Написать книгу, которая изменит жизни людей',
        cost: 300000,
        icon: '📚'
    },
    {
        id: 'yacht_mediterranean',
        name: 'Жить год на яхте в Средиземном море',
        description: 'Провести целый год в путешествии по Средиземному морю',
        cost: 300000,
        icon: '⛵'
    },
    {
        id: 'world_festival',
        name: 'Организовать мировой фестиваль',
        description: 'Создать фестиваль, который соберет людей со всего мира',
        cost: 200000,
        icon: '🎪'
    },
    {
        id: 'retreat_center',
        name: 'Построить ретрит-центр',
        description: 'Создать место для духовного развития и отдыха',
        cost: 500000,
        icon: '🧘'
    },
    {
        id: 'talent_fund',
        name: 'Создать фонд поддержки талантов',
        description: 'Помочь молодым талантам реализовать свой потенциал',
        cost: 300000,
        icon: '⭐'
    },
    {
        id: 'sailing_around_world',
        name: 'Кругосветное плавание на паруснике',
        description: 'Обогнуть весь мир на собственном паруснике',
        cost: 200000,
        icon: '⛵'
    },
    {
        id: 'private_jet',
        name: 'Купить частный самолёт',
        description: 'Приобрести собственный реактивный самолет',
        cost: 1000000,
        icon: '🛩️'
    },
    {
        id: 'supercar_collection',
        name: 'Купить коллекцию суперкаров',
        description: 'Собрать коллекцию самых престижных автомобилей',
        cost: 1000000,
        icon: '🏎️'
    },
    {
        id: 'feature_film',
        name: 'Снять полнометражный фильм',
        description: 'Создать собственный художественный фильм',
        cost: 500000,
        icon: '🎬'
    },
    {
        id: 'thought_leader',
        name: 'Стать мировым лидером мнений',
        description: 'Влиять на глобальные решения и изменения',
        cost: 1000000,
        icon: '🌍'
    },
    {
        id: 'white_yacht',
        name: 'Белоснежная Яхта',
        description: 'Приобрести роскошную белоснежную яхту',
        cost: 300000,
        icon: '🛥️'
    },
    {
        id: 'space_flight',
        name: 'Полёт в космос',
        description: 'Отправиться в космическое путешествие',
        cost: 250000,
        icon: '🚀'
    }
];

// Конфигурация фишек (10 животных)
const TOKENS_CONFIG = [
    {
        id: 'lion',
        name: 'Лев',
        icon: '🦁',
        description: 'Царь зверей, лидер по натуре и мастер стратегии'
    },
    {
        id: 'eagle',
        name: 'Орел',
        icon: '🦅',
        description: 'Орлиный взгляд на инвестиции, видит возможности сверху'
    },
    {
        id: 'fox',
        name: 'Лиса',
        icon: '🦊',
        description: 'Хитрая и умная, всегда найдет выгодную сделку'
    },
    {
        id: 'bear',
        name: 'Медведь',
        icon: '🐻',
        description: 'Сильный и надежный, консервативный инвестор'
    },
    {
        id: 'tiger',
        name: 'Тигр',
        icon: '🐅',
        description: 'Быстрый и решительный, атакующий стиль инвестирования'
    },
    {
        id: 'wolf',
        name: 'Волк',
        icon: '🐺',
        description: 'Командный игрок, работает в стае для большей прибыли'
    },
    {
        id: 'elephant',
        name: 'Слон',
        icon: '🐘',
        description: 'Мудрый и терпеливый, долгосрочные инвестиции'
    },
    {
        id: 'shark',
        name: 'Акула',
        icon: '🦈',
        description: 'Агрессивный трейдер, чувствует запах прибыли'
    },
    {
        id: 'owl',
        name: 'Сова',
        icon: '🦉',
        description: 'Мудрая и проницательная, анализирует рынок ночью'
    },
    {
        id: 'dolphin',
        name: 'Дельфин',
        icon: '🐬',
        description: 'Общительный и умный, строит сеть деловых связей'
    }
];

// Функция инициализации
function initializeRoomPage() {
    console.log('🏠 Room: Инициализация страницы комнаты');
    
    // Сначала показываем кэшированные данные для мгновенного отображения
    try {
    loadCachedRoomData();
    } catch (e) {
        console.warn('⚠️ Room: Ошибка loadCachedRoomData:', e);
    }
    
    // Критически важные функции выполняем сразу
    try {
    displayUserInfo();
    } catch (e) {
        console.warn('⚠️ Room: Ошибка displayUserInfo:', e);
    }
    
    try {
        console.log('🔍 Room: Вызываем loadDreams из initializeRoomPage');
    loadDreams();
    } catch (e) {
        console.error('❌ Room: Ошибка loadDreams:', e);
    }
    
    try {
        console.log('🔍 Room: Вызываем loadTokens из initializeRoomPage');
    loadTokens();
    } catch (e) {
        console.error('❌ Room: Ошибка loadTokens:', e);
    }
    
    // Остальные функции выполняем асинхронно
    requestIdleCallback(() => {
        initializeServices();
        setupEventListeners();
        
        // Затем загружаем актуальные данные с сервера
        loadRoomData();
        
        // Отложенное обновление кнопок после загрузки всех данных
        setTimeout(() => {
            console.log('🔄 Room: Отложенное обновление кнопок');
            updateStartGameButton();
            updateReadyStatus();
        }, 1000);
        
        // Запускаем периодическое обновление данных комнаты для получения изменений в реальном времени
        startRoomDataPolling();
    });
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRoomPage);
} else {
    // DOM уже загружен, вызываем сразу
    initializeRoomPage();
}

// Fallback для requestIdleCallback
if (!window.requestIdleCallback) {
    window.requestIdleCallback = (callback) => {
        return setTimeout(callback, 1);
    };
}

// Единая функция перехода к игровому полю без обратного редиректа в комнату
function navigateToGameBoard(roomId) {
    try {
        console.log('🎮 Room: navigateToGameBoard вызвана с roomId:', roomId);
        console.log('🎮 Room: Данные перед переходом:', {
            currentUser: currentUser,
            currentRoom: currentRoom,
            dreamData: dreamData,
            selectedToken: selectedToken,
            players: currentRoom?.players
        });
        
        // Формируем и сохраняем пакет игрока и комнаты для игрового поля
        const bundle = {
            roomId,
            currentUser: {
                id: currentUser?.id,
                username: currentUser?.username,
                name: currentUser?.name,
                avatar: currentUser?.avatar || ''
            },
            player: buildPlayerBundle({ user: currentUser, dream: dreamData, token: selectedToken, isReady: true }),
            players: (currentRoom?.players || []).map((p, index) => {
                // Определяем токен игрока
                let playerToken = p.token;
                if (!playerToken) {
                    // Если это текущий пользователь, используем выбранный токен
                    if (p.username === currentUser?.username || p.userId === currentUser?.id) {
                        playerToken = selectedToken;
                    } else {
                        // Для других игроков используем fallback токены
                        const fallbackTokens = ['🦁', '🦅', '🦊', '🐻', '🐅', '🐺', '🐘', '🦈', '🦉', '🐬'];
                        playerToken = fallbackTokens[index % fallbackTokens.length];
                    }
                }
                
                return {
                    id: p.userId || p.id || `player${index+1}`,
                    username: p.username || p.name || `Игрок ${index+1}`,
                    token: playerToken,
                    dream: p.dream || null,
                    isReady: !!p.isReady,
                    position: 23, // Стартовая позиция - клетка #24 внутреннего трека
                    isInner: true, // Начинаем с внутреннего трека
                    money: p.money || 5000
                };
            })
        };
        
        console.log('🎮 Room: Сохраняем bundle в sessionStorage:', bundle);
        if (typeof CommonUtils !== 'undefined' && CommonUtils.sessionStorage) {
        CommonUtils.sessionStorage.set('am_player_bundle', bundle);
        } else {
            // Fallback на прямой sessionStorage
            try {
                sessionStorage.setItem('am_player_bundle', JSON.stringify(bundle));
            } catch (e) {
                console.warn('⚠️ Room: Не удалось сохранить bundle:', e);
            }
        }
        
        console.log('🎮 Room: Переходим к игровому полю...');
        // Переходим на игровую доску SPA
        window.location.href = `../index.html#game?roomId=${roomId}`;
    } catch (e) {
        window.location.href = `../index.html#game?roomId=${roomId}`;
    }
}

/**
 * Запуск периодического обновления данных комнаты с оптимизацией
 */
/**
 * Запуск периодического обновления данных комнаты
 */
function startRoomDataPolling() {
    // Останавливаем предыдущий таймер, если он существует
    if (timers.polling) {
        clearInterval(timers.polling);
    }
    
    let lastUpdate = 0;
    
    // Обновляем данные комнаты с адаптивным интервалом
    timers.polling = setInterval(async () => {
        const now = Date.now();
        
        // Проверяем, не слишком ли часто обновляемся
        if (now - lastUpdate < CONFIG.MIN_UPDATE_INTERVAL) {
            console.log('⏳ Room: Пропускаем обновление, слишком рано');
            return;
        }
        
        if (currentRoom && currentUser) {
            try {
                await refreshRoomData();
                
                // Проверяем, началась ли игра для автоматического перенаправления
                if (currentRoom.isStarted && currentRoom.status === 'playing') {
                    console.log('🎮 Room: Игра началась! Автоматическое перенаправление...');
                    stopRoomDataPolling(); // Останавливаем polling перед редиректом
                    navigateToGameBoard(currentRoom.id);
                    return;
                }
                
                lastUpdate = now;
            } catch (error) {
                console.warn('⚠️ Room: Ошибка периодического обновления:', error);
                // При ошибке увеличиваем интервал еще больше
                lastUpdate = now + CONFIG.ERROR_RETRY_DELAY;
            }
        }
    }, CONFIG.POLLING_INTERVAL);
    
    console.log('🔄 Room: Запущено оптимизированное периодическое обновление данных комнаты');
}

/**
 * Остановка периодического обновления данных комнаты
 */
function stopRoomDataPolling() {
    if (timers.polling) {
        clearInterval(timers.polling);
        timers.polling = null;
        console.log('🛑 Room: Периодическое обновление остановлено');
    }
}

/**
 * Инициализация сервисов
 */
function initializeServices() {
    try {
        // Инициализируем сервисы с правильными параметрами
        roomService = new RoomService(window.logger || null, window.errorHandler || null);
        // Экспортируем roomService глобально для отладки
        window.roomService = roomService;
        // notificationService доступен глобально как window.notificationService
        
        console.log('✅ Room: Сервисы инициализированы');
    } catch (error) {
        console.error('❌ Room: Ошибка инициализации сервисов:', error);
        showNotification('Ошибка инициализации страницы', 'error');
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Кнопка "Назад к комнатам"
    const backButton = document.getElementById('back-to-rooms');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'rooms.html';
        });
    }
    
    // Кнопка "Обновить"
    const refreshButton = document.getElementById('refresh-room');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            console.log('🔄 Room: Ручное обновление данных комнаты');
            refreshButton.disabled = true;
            refreshButton.textContent = '⏳ Обновляем...';
            
            try {
                await loadRoomData();
                showNotification('Данные комнаты обновлены', 'success');
            } catch (error) {
                console.error('❌ Room: Ошибка ручного обновления:', error);
                showNotification('Ошибка обновления данных', 'error');
            } finally {
                refreshButton.disabled = false;
                refreshButton.textContent = '🔄 Обновить';
            }
        });
    }
    
    // Кнопка "Начать игру"
    const startGameButton = document.getElementById('start-game');
    if (startGameButton) {
        startGameButton.addEventListener('click', showStartGameModal);
        // Скрываем кнопку по умолчанию до загрузки данных
        startGameButton.style.display = 'none';
    }
    
    // Кнопка "Я готов к игре!"
    const readyButton = document.getElementById('ready-button');
    if (readyButton) {
        readyButton.addEventListener('click', (event) => {
            console.log('🎯 Room: КЛИК ПО КНОПКЕ ГОТОВНОСТИ!');
            console.log('🔍 Room: Состояние кнопки:', {
                disabled: readyButton.disabled,
                text: readyButton.textContent,
                className: readyButton.className,
                dreamData: dreamData,
                selectedToken: selectedToken,
                currentUser: currentUser,
                currentRoom: currentRoom
            });
            
            // Проверяем, не заблокирована ли кнопка
            if (readyButton.disabled) {
                const isDreamComplete = dreamData && 
                    dreamData.id && 
                    dreamData.title && 
                    dreamData.description && 
                    typeof dreamData.cost === 'number' && 
                    dreamData.cost > 0;
                const isTokenSelected = selectedToken !== null && selectedToken !== 'null' && selectedToken !== '';
                
                let message = 'Кнопка заблокирована. ';
                if (!isDreamComplete) {
                    message += 'Выберите и заполните мечту (стоимость должна быть больше 0). ';
                }
                if (!isTokenSelected) {
                    message += 'Выберите фишку.';
                }
                
                console.warn('⚠️ Room: Кнопка заблокирована:', {
                    isDreamComplete,
                    isTokenSelected,
                    dreamData: dreamData,
                    selectedToken: selectedToken,
                    message: message
                });
                
                showNotification(message.trim(), 'warning');
                return;
            }
            
            event.preventDefault();
            event.stopPropagation();
            console.log('✅ Room: Вызываем toggleReadyStatus...');
            toggleReadyStatus();
        });
        console.log('✅ Room: Обработчик клика добавлен к кнопке готовности');
        
        // Дополнительная отладка для Chrome
        readyButton.addEventListener('mousedown', () => {
            console.log('🖱️ Room: Mouse down на кнопке готовности');
        });
        
        readyButton.addEventListener('mouseup', () => {
            console.log('🖱️ Room: Mouse up на кнопке готовности');
        });
        
        // Проверяем стили кнопки
        const computedStyle = window.getComputedStyle(readyButton);
        console.log('🔍 Room: Стили кнопки готовности:', {
            pointerEvents: computedStyle.pointerEvents,
            cursor: computedStyle.cursor,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            disabled: readyButton.disabled,
            opacity: computedStyle.opacity,
            visibility: computedStyle.visibility,
            display: computedStyle.display
        });
        
        // Проверяем, есть ли элементы поверх кнопки
        const rect = readyButton.getBoundingClientRect();
        const elementAtCenter = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
        console.log('🔍 Room: Элемент в центре кнопки:', elementAtCenter);
        console.log('🔍 Room: Это сама кнопка?', elementAtCenter === readyButton);
        
    } else {
        console.error('❌ Room: Кнопка ready-button не найдена!');
    }
    
    // Кнопки авторизации
    const authLoginBtn = document.getElementById('auth-login-btn');
    if (authLoginBtn) {
        authLoginBtn.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    }
    
    const authBackToRoomsBtn = document.getElementById('auth-back-to-rooms-btn');
    if (authBackToRoomsBtn) {
        authBackToRoomsBtn.addEventListener('click', () => {
            window.location.href = 'rooms.html';
        });
    }
    
    // Поля формы мечты
    const dreamSelect = document.getElementById('dream-select');
    const dreamDescription = document.getElementById('dream-description');
    const dreamCost = document.getElementById('dream-cost');
    
    if (dreamSelect) {
        dreamSelect.addEventListener('change', handleDreamSelection);
    }
    if (dreamDescription) {
        dreamDescription.addEventListener('input', updateDreamData);
    }
    if (dreamCost) {
        dreamCost.addEventListener('input', updateDreamData);
    }
    
    // Модальное окно
    const modal = document.getElementById('confirm-modal');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    
    if (modalClose) {
        modalClose.addEventListener('click', hideStartGameModal);
    }
    if (modalCancel) {
        modalCancel.addEventListener('click', hideStartGameModal);
    }
    if (modalConfirm) {
        modalConfirm.addEventListener('click', confirmStartGame);
    }
    
    // Закрытие модального окна по клику вне его
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideStartGameModal();
            }
        });
    }
    
    console.log('✅ Room: Обработчики событий настроены');
}

/**
 * Загрузка кэшированных данных комнаты для мгновенного отображения
 */
function loadCachedRoomData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id');
        
        if (!roomId) return;
        
        // Пытаемся загрузить кэшированные данные комнаты
        const cacheKey = `am_room_cache_${roomId}`;
        let cached = null;
        if (typeof CommonUtils !== 'undefined' && CommonUtils.storage) {
            cached = CommonUtils.storage.get(cacheKey);
        } else {
            // Fallback на прямой localStorage
            try {
                const cachedStr = localStorage.getItem(cacheKey);
                if (cachedStr) {
                    cached = JSON.parse(cachedStr);
                }
            } catch (e) {
                console.warn('⚠️ Room: Не удалось загрузить кэш:', e);
            }
        }
        
        if (cached) {
            try {
                // Проверяем тип данных - может быть объект или строка
                let roomData;
                if (typeof cached === 'string') {
                    roomData = JSON.parse(cached);
                } else if (typeof cached === 'object' && cached !== null) {
                    // Если это уже объект (из CommonUtils.storage), используем напрямую
                    roomData = cached;
                } else {
                    throw new Error('Неверный формат кэша');
                }
                
                const cacheAge = Date.now() - (roomData.cachedAt || 0);
                const maxAge = CONFIG.CACHE_MAX_AGE;
                
                if (cacheAge < maxAge && roomData.room) {
                    console.log('⚡ Room: Загружаем кэшированные данные комнаты');
                    currentRoom = roomData.room;
                    updateRoomInfo();
                    updatePlayersList();
                    return;
                } else {
                    console.log('⏰ Room: Кэш устарел, загружаем свежие данные');
                }
            } catch (error) {
                console.warn('⚠️ Room: Ошибка парсинга кэша:', error);
                // Очищаем поврежденный кэш
                try {
                    const cacheKey = `am_room_cache_${roomId}`;
                    if (typeof CommonUtils !== 'undefined' && CommonUtils.storage) {
                        CommonUtils.storage.remove(cacheKey);
                    } else {
                        localStorage.removeItem(cacheKey);
                    }
                } catch (e) {
                    // Игнорируем ошибки очистки
                }
            }
        }
        
        console.log('📦 Room: Кэш не найден, показываем skeleton UI');
        
    } catch (error) {
        console.error('❌ Room: Ошибка загрузки кэша:', error);
    }
}

/**
 * Сохранение данных комнаты в кэш
 */
function saveRoomToCache(room) {
    try {
        const cacheKey = `am_room_cache_${room.id}`;
        const cacheData = {
            room: room,
            cachedAt: Date.now()
        };
        if (typeof CommonUtils !== 'undefined' && CommonUtils.storage) {
        CommonUtils.storage.set(cacheKey, cacheData);
        } else {
            // Fallback на прямой localStorage
            try {
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } catch (e) {
                console.warn('⚠️ Room: Не удалось сохранить кэш:', e);
            }
        }
        console.log('💾 Room: Данные комнаты сохранены в кэш');
    } catch (error) {
        console.warn('⚠️ Room: Ошибка сохранения в кэш:', error);
    }
}

/**
 * Оптимизированная загрузка данных комнаты одним запросом
 */
async function loadRoomDataOptimized(roomId) {
    try {
        console.log('🚀 Room: Оптимизированная загрузка данных комнаты');
        
        // Пытаемся получить данные комнаты с дополнительной информацией одним запросом
        const response = await fetch(`/api/rooms/${roomId}?include=players,ready,status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // 60 секунд по умолчанию
                
                console.warn(`⚠️ Room: Rate limited, ожидание ${waitTime}мс`);
                
                // Показываем уведомление пользователю
                showNotification(`Слишком частые запросы. Повторим через ${Math.ceil(waitTime/1000)} секунд`, 'warning');
                
                // НЕ планируем автоматическую повторную попытку - пусть пользователь сам обновит
                console.log('🚫 Room: Автоматическая повторная попытка отключена для предотвращения спама');
                
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Ошибка получения комнаты');
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
        
    } catch (error) {
        console.error('❌ Room: Ошибка оптимизированной загрузки:', error);
        return null;
    }
}

// Флаг для предотвращения рекурсии при загрузке данных
let isLoadingRoomData = false;

/**
 * Загрузка данных комнаты с оптимизацией
 */
async function loadRoomData() {
    // Защита от рекурсии
    if (isLoadingRoomData) {
        console.warn('⚠️ Room: Загрузка данных уже выполняется, пропускаем повторный вызов');
        return;
    }
    
    try {
        isLoadingRoomData = true;
        
        // Получаем ID комнаты из URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id');
        
        if (!roomId) {
            showNotification('ID комнаты не указан', 'error');
            // Мгновенный редирект без задержки для избежания проблем с памятью
            window.location.href = 'rooms.html';
            return;
        }
        
        console.log('🏠 Room: Загрузка данных комнаты:', roomId);
        
        // Пытаемся загрузить данные комнаты с дополнительной информацией одним запросом
        const room = await loadRoomDataOptimized(roomId);
        
        if (!room) {
            console.warn('⚠️ Room: Комната не найдена в API');
            
            // Не используем мок-данные для реальных комнат - это может вызвать проблемы
            // Вместо этого показываем ошибку и предлагаем вернуться к списку комнат
            showNotification('Комната не найдена. Возможно, она была удалена.', 'error');
            
            // Редирект на страницу комнат через небольшую задержку
            safeSetTimeout(() => {
                window.location.href = 'rooms.html';
            }, CONFIG.REDIRECT_DELAY, 'redirect');
            
            isLoadingRoomData = false; // Сбрасываем флаг перед выходом
            return;
            
            // Старый код с мок-данными (закомментирован для предотвращения проблем)
            /*
            // Fallback на мок-данные
            const mockRooms = [
                {
                    id: 'room-demo-1',
                    name: 'Демо комната 1',
                    maxPlayers: 4,
                    playerCount: 2,
                    status: 'waiting',
                    isStarted: false,
                    isFull: false,
                    creator: 'demo_user',
                    turnTime: 30,
                    assignProfessions: true,
                    players: [
                        { id: 'p1', username: 'demo_user', name: 'demo_user', isHost: true },
                        { id: 'p2', username: 'player1', name: 'player1', isHost: false }
                    ],
                    createdAt: new Date(Date.now() - 60000).toISOString()
                },
                {
                    id: 'room-demo-2',
                    name: 'Турнирная комната',
                    maxPlayers: 6,
                    playerCount: 3,
                    status: 'waiting',
                    isStarted: false,
                    isFull: false,
                    creator: 'tournament_master',
                    turnTime: 60,
                    assignProfessions: false,
                    players: [
                        { id: 'p3', username: 'tournament_master', name: 'tournament_master', isHost: true },
                        { id: 'p4', username: 'player2', name: 'player2', isHost: false },
                        { id: 'p5', username: 'player3', name: 'player3', isHost: false }
                    ],
                    createdAt: new Date(Date.now() - 30000).toISOString()
                }
            ];
            
            const mockRoom = mockRooms.find(r => r.id === roomId);
            if (mockRoom) {
                console.log('✅ Room: Комната найдена в мок-данных:', mockRoom.name);
                room = mockRoom;
            } else {
                showNotification('Комната не найдена', 'error');
                // Мгновенный редирект без задержки для избежания проблем с памятью
                window.location.href = 'rooms.html';
                return;
            }
            */
        }
        
        currentRoom = room;
        
        // Сохраняем в кэш для быстрой загрузки в следующий раз
        saveRoomToCache(room);
        
        updateRoomInfo();
        
        // Проверяем, запущена ли игра
        if (room.isStarted && room.status === 'playing') {
            console.log('🎮 Room: Игра уже запущена');
            showNotification('Игра уже запущена! Переходим к игровому полю...', 'info');
            
            setTimeout(() => {
                const roomId = room.id;
                console.log('🎮 Room: Автоматический переход к игровой доске:', roomId);
                
                // Сохраняем данные пользователя для передачи на игровую доску
                const userData = {
                    ...currentUser,
                    roomId: roomId,
                    fromRoom: true
                };
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                navigateToGameBoard(roomId);
            }, 2000);
            return;
        }
        
        // Присоединяемся к комнате если еще не присоединены
        await joinRoomIfNeeded();
        
        // Обновляем кнопку старт после загрузки данных
        updateStartGameButton();
        
    } catch (error) {
        console.error('❌ Room: Ошибка загрузки данных комнаты:', error);
        // Проверяем, не является ли это ошибкой рекурсии
        if (error.message && error.message.includes('Maximum call stack')) {
            console.error('❌ Room: Обнаружена бесконечная рекурсия! Останавливаем загрузку.');
            showNotification('Ошибка загрузки данных. Пожалуйста, обновите страницу.', 'error');
        } else {
        showNotification('Ошибка загрузки данных комнаты', 'error');
        }
    } finally {
        // Сбрасываем флаг после завершения загрузки
        isLoadingRoomData = false;
    }
}

/**
 * Загрузка данных комнаты без попытки присоединения (для избежания рекурсии)
 */
async function loadRoomDataWithoutJoin() {
    try {
        const roomId = new URLSearchParams(window.location.search).get('id');
        
        if (!roomId) {
            console.warn('⚠️ Room: ID комнаты не указан');
            return;
        }
        
        console.log('🏠 Room: Загрузка данных комнаты без присоединения:', roomId);
        
        // Получаем данные комнаты
        const room = await roomService.getRoomById(roomId);
        
        if (!room) {
            console.warn('⚠️ Room: Комната не найдена в API');
            return;
        }
        
        currentRoom = room;
        updateRoomInfo();
        
        // Обновляем кнопку старт после загрузки данных
        updateStartGameButton();
        
    } catch (error) {
        console.error('❌ Room: Ошибка загрузки данных комнаты:', error);
    }
}

/**
 * Присоединение к комнате если необходимо
 */
async function joinRoomIfNeeded() {
    try {
        if (!currentRoom || !currentUser) return;
        
        // Проверяем, есть ли пользователь в комнате
        const isInRoom = currentRoom.players.some(player => player.userId === currentUser.id || player.username === currentUser.username);
        
        if (!isInRoom) {
            console.log('🏠 Room: Присоединение к комнате');
            
            // Убеждаемся, что у нас есть корректные данные пользователя
            const playerData = {
                userId: currentUser.id || currentUser.userId || 'unknown',
                username: currentUser.username || currentUser.name || 'unknown',
                name: currentUser.username || currentUser.name || 'unknown',
                avatar: currentUser.avatar || '',
                isReady: false,
                dream: null,
                token: null
            };
            
            console.log('🔍 Room: Данные игрока для присоединения:', playerData);
            
            await roomService.joinRoom(currentRoom.id, playerData);
            showNotification('Вы присоединились к комнате', 'success');
            
            // Принудительно обновляем данные комнаты и кнопку после присоединения
            console.log('🔄 Room: Принудительное обновление после присоединения к комнате');
            await refreshRoomData();
            setTimeout(() => {
                console.log('🔄 Room: Дополнительное обновление кнопки после присоединения');
                updateStartGameButton();
            }, 500);
        } else {
            console.log('ℹ️ Room: Пользователь уже в комнате, обновляем данные');
            
            // Проверяем текущее состояние игрока в комнате
            const currentPlayer = currentRoom.players?.find(p => 
                p.userId === currentUser.id || p.username === currentUser.username
            );
            
            if (currentPlayer && !isPlayerReady(currentPlayer)) {
                // Сбрасываем только если игрок действительно не готов
                console.log('🔄 Room: Игрок не готов, сбрасываем состояние');
                const resetData = {
                    userId: currentUser.id || currentUser.userId,
                    username: currentUser.username || currentUser.name,
                    name: currentUser.username || currentUser.name,
                    avatar: currentUser.avatar || '',
                    isReady: false,
                    dream: null,
                    token: null
                };
                console.log('🔄 Room: Данные для сброса готовности:', resetData);
                
                const resetResult = await roomService.updatePlayerInRoom(currentRoom.id, resetData);
                console.log('🔄 Room: Результат сброса готовности:', resetResult);
            } else {
                console.log('ℹ️ Room: Игрок уже готов, сохраняем состояние');
            }
            
            showNotification('Добро пожаловать обратно в комнату!', 'info');
            
            // Принудительно обновляем данные комнаты и кнопку
            console.log('🔄 Room: Принудительное обновление для существующего пользователя');
            await refreshRoomData();
            setTimeout(() => {
                console.log('🔄 Room: Дополнительное обновление кнопки для существующего пользователя');
                updateStartGameButton();
            }, 500);
        }
    } catch (error) {
        console.error('❌ Room: Ошибка присоединения к комнате:', error);
        
        // Если пользователь уже в комнате (409), не показываем ошибку
        if (error.message && (error.message.includes('409') || error.message.includes('ALREADY_JOINED'))) {
            console.log('ℹ️ Room: Пользователь уже в комнате, обновляем данные без повторного присоединения');
            // Обновляем данные комнаты БЕЗ попытки присоединения
            await loadRoomDataWithoutJoin();
        } else {
            showNotification('Ошибка присоединения к комнате', 'error');
        }
    }
}

/**
 * Обновление информации о комнате
 */
function updateRoomInfo() {
    if (!currentRoom) return;
    
    // Обновляем заголовок
    const roomTitle = document.getElementById('room-title');
    if (roomTitle) {
        roomTitle.textContent = `🏠 ${currentRoom.name}`;
    }
    
    // Обновляем информацию о комнате
    const roomName = document.getElementById('room-name');
    const roomCreator = document.getElementById('room-creator');
    const roomPlayers = document.getElementById('room-players');
    const roomStatus = document.getElementById('room-status');
    
    if (roomName) roomName.textContent = currentRoom.name;
    if (roomCreator) roomCreator.textContent = currentRoom.creator || currentRoom.creatorName || 'Неизвестный';
    if (roomPlayers) roomPlayers.textContent = `${currentRoom.playerCount}/${currentRoom.maxPlayers}`;
    if (roomStatus) {
        roomStatus.textContent = currentRoom.isStarted ? 'Игра начата' : 'Ожидание';
    }
    
    // Обновляем список игроков
    updatePlayersList();
    
    // Обновляем кнопку "Начать игру"
    updateStartGameButton();
}

/**
 * Обновление списка игроков
 */
// Единая функция для проверки готовности игрока
function isPlayerReady(player) {
    if (!player) return false;
    return player.isReady === true || 
           player.isReady === 'true' || 
           player.isReady === 1 || 
           String(player.isReady).toLowerCase() === 'true';
}

function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    if (!playersList || !currentRoom) {
        console.warn('⚠️ Room: updatePlayersList - нет playersList или currentRoom');
        return;
    }
    
    console.log('🔄 Room: updatePlayersList - обновляем список игроков, количество:', currentRoom.players?.length || 0);
    
    playersList.innerHTML = '';
    
    currentRoom.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        // Используем name или username для отображения
        const playerName = player.name || player.username || 'Неизвестный игрок';
        // Используем токен игрока для аватара, если доступен
        let avatar = player.avatar || playerName.charAt(0).toUpperCase();
        if (player.token && typeof window.PlayerStatusUtils !== 'undefined') {
            const tokenIcon = window.PlayerStatusUtils.getPlayerToken(player);
            if (tokenIcon && tokenIcon !== '🎲') {
                avatar = tokenIcon;
            }
        }
        // Определяем статус игрока более точно
        // Игрок считается готовым ТОЛЬКО если:
        // 1. isReady = true И
        // 2. dream выбран (имеет id и title) И
        // 3. token выбран
        const isReadyFlag = isPlayerReady(player);
        
        // Проверяем наличие мечты - может быть объектом или строкой
        let hasDream = false;
        if (player.dream) {
            if (typeof player.dream === 'object') {
                hasDream = !!(player.dream.id && player.dream.title);
            } else if (typeof player.dream === 'string') {
                hasDream = player.dream.trim() !== '';
            }
        }
        
        // Проверяем наличие фишки
        const hasToken = !!(player.token && player.token.trim() !== '' && player.token !== 'null');
        
        // Игрок действительно готов только если все три условия выполнены
        const isActuallyReady = isReadyFlag && hasDream && hasToken;
        
        let status = 'Выбирает';
        if (isActuallyReady) {
            // Игрок действительно готов: есть флаг готовности, мечта и фишка
            status = 'Готов';
        } else if (hasDream && hasToken && !isReadyFlag) {
            // Мечта и фишка выбраны, но игрок еще не отметился как готов
            status = 'Готовится';
        } else {
            // Что-то не выбрано или не готов
            status = 'Выбирает';
        }
        
        // Дополнительная отладка для понимания статуса игрока
        console.log('🔍 Room: Статус игрока:', {
            playerName: playerName,
            isReady: player.isReady,
            isReadyType: typeof player.isReady,
            isReadyFlag: isReadyFlag,
            hasDream: hasDream,
            hasToken: hasToken,
            isActuallyReady: isActuallyReady,
            dream: player.dream,
            token: player.token,
            status: status
        });
        
        playerItem.innerHTML = `
            <div class="player-avatar">${avatar}</div>
            <div class="player-info">
                <div class="player-name">${playerName}</div>
                <div class="player-status">${status}</div>
            </div>
        `;
        
        // Кнопка удаления для хоста (кроме себя)
        const isHost = isCurrentUserHost();
        const isSelf = player.userId === currentUser?.id || player.username === currentUser?.username;
        if (isHost && !isSelf) {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'btn btn-danger btn-sm kick-btn';
            kickBtn.style.marginLeft = '8px';
            kickBtn.textContent = '✖';
            kickBtn.title = 'Удалить игрока';
            kickBtn.addEventListener('click', () => kickPlayer(player));
            playerItem.querySelector('.player-info')?.appendChild(kickBtn);
        }
        
        playersList.appendChild(playerItem);
    });
}

/**
 * Удаление игрока (только хост)
 */
async function kickPlayer(player) {
    try {
        if (!currentRoom || !player) return;
        const confirmKick = confirm(`Удалить игрока ${player.name || player.username || 'игрок'} из комнаты?`);
        if (!confirmKick) return;

        await fetch(`/api/rooms/${currentRoom.id}/players/${player.userId || player.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        showNotification('Игрок удалён', 'success');
        await refreshRoomData();
    } catch (error) {
        console.error('❌ Room: Ошибка удаления игрока:', error);
        showNotification('Не удалось удалить игрока', 'error');
    }
}

/**
 * Проверка, является ли текущий пользователь хостом комнаты
 */
function isCurrentUserHost() {
    if (!currentRoom || !currentUser) {
        console.log('🔍 Room: isCurrentUserHost - нет данных:', {
            hasRoom: !!currentRoom,
            hasUser: !!currentUser
        });
        return false;
    }
    
    const userId = currentUser.id || currentUser.userId;
    const username = currentUser.username || currentUser.name;
    
    // Первый приоритет: проверим по creatorId
    if (currentRoom.creatorId === userId || currentRoom.creator_id === userId) {
        console.log('✅ Room: isCurrentUserHost - найден по creatorId:', {
            creatorId: currentRoom.creatorId,
            creator_id: currentRoom.creator_id,
            userId: userId
        });
        return true;
    }
    
    // Второй приоритет: проверим по username/name в creator
    if (currentRoom.creator === username) {
        console.log('✅ Room: isCurrentUserHost - найден по creator username:', {
            creator: currentRoom.creator,
            username: username
        });
        return true;
    }
    
    // Третий приоритет: проверим по флагам isHost в players
    if (currentRoom.players) {
        const hostPlayer = currentRoom.players.find(p => 
            (p.userId === userId || p.id === userId || p.username === username) && 
            (p.isHost === true || p.isCreator === true || p.role === 'creator')
        );
        if (hostPlayer) {
            console.log('✅ Room: isCurrentUserHost - найден по флагам в players:', {
                hostPlayer: {
                    userId: hostPlayer.userId,
                    id: hostPlayer.id,
                    username: hostPlayer.username,
                    isHost: hostPlayer.isHost,
                    isCreator: hostPlayer.isCreator,
                    role: hostPlayer.role
                }
            });
            return true;
        }
    }
    
    console.log('❌ Room: isCurrentUserHost - пользователь НЕ является хостом:', {
        currentUser: {
            id: userId,
            username: username
        },
        roomCreator: {
            creatorId: currentRoom.creatorId,
            creator_id: currentRoom.creator_id,
            creator: currentRoom.creator
        },
        players: currentRoom.players?.map(p => ({
            userId: p.userId,
            id: p.id,
            username: p.username,
            isHost: p.isHost,
            isCreator: p.isCreator,
            role: p.role
        }))
    });
    
    return false;
}

/**
 * Обновление кнопки "Начать игру"
 */
function updateStartGameButton() {
    const startGameButton = document.getElementById('start-game');
    if (!startGameButton) {
        console.warn('⚠️ Room: Кнопка start-game не найдена в DOM');
        return;
    }
    
    // Если нет данных о комнате или пользователе, скрываем кнопку
    if (!currentRoom || !currentUser) {
        console.log('🔍 Room: updateStartGameButton - нет данных:', {
            hasRoom: !!currentRoom,
            hasUser: !!currentUser,
            currentRoom: currentRoom,
            currentUser: currentUser
        });
        startGameButton.style.display = 'none';
        return;
    }
    
    // Проверяем, является ли пользователь создателем комнаты/хостом
    const isHost = isCurrentUserHost();
    
    console.log('🔍 Room: updateStartGameButton - проверка хоста:', {
        isHost,
        currentRoomData: {
            creatorId: currentRoom.creatorId,
            creator_id: currentRoom.creator_id,
            creator: currentRoom.creator,
            players: currentRoom.players?.map(p => ({
                userId: p.userId,
                id: p.id,
                username: p.username,
                isHost: p.isHost,
                isCreator: p.isCreator,
                role: p.role
            }))
        },
        currentUserData: {
            id: currentUser.id,
            userId: currentUser.userId,
            username: currentUser.username,
            name: currentUser.name
        }
    });
    const playersCount = currentRoom.players?.length || 0;
    
    // Используем ту же строгую проверку готовности, что и в updatePlayersList
    // Игрок считается готовым ТОЛЬКО если: isReady = true И dream выбран (с cost > 0) И token выбран
    const readyCount = currentRoom.players?.filter(player => {
        const isReadyFlag = isPlayerReady(player);
        
        // Проверяем наличие мечты - может быть объектом или строкой
        let hasDream = false;
        if (player.dream) {
            if (typeof player.dream === 'object') {
                hasDream = !!(player.dream.id && player.dream.title);
            } else if (typeof player.dream === 'string') {
                hasDream = player.dream.trim() !== '';
            }
        }
        
        // Проверяем наличие фишки
        const hasToken = !!(player.token && player.token.trim() !== '' && player.token !== 'null');
        
        return isReadyFlag && hasDream && hasToken;
    }).length || 0;
    
    const minPlayers = currentRoom.minPlayers || 2; // Минимум 2 игрока для старта
    const allPlayersReady = currentRoom.players?.every(player => {
        const isReadyFlag = isPlayerReady(player);
        
        // Проверяем наличие мечты - может быть объектом или строкой
        let hasDream = false;
        if (player.dream) {
            if (typeof player.dream === 'object') {
                hasDream = !!(player.dream.id && player.dream.title);
            } else if (typeof player.dream === 'string') {
                hasDream = player.dream.trim() !== '';
            }
        }
        
        // Проверяем наличие фишки
        const hasToken = !!(player.token && player.token.trim() !== '' && player.token !== 'null');
        
        return isReadyFlag && hasDream && hasToken;
    }) || false;
    
    // Игра может начаться только если есть минимум игроков и все игроки готовы
    const canStart = playersCount >= minPlayers && readyCount >= playersCount && readyCount > 0;
    
    console.log('🔍 Room: Кнопка "Начать игру" - состояние:', {
        isHost,
        playersCount,
        readyCount,
        minPlayers,
        canStart,
        currentRoomStarted: currentRoom.isStarted
    });
    
    // СЕКЦИЯ: Скрытие кнопки для не-хостов (только хост может начать игру)
    if (!isHost) {
        console.log('🚫 Room: Пользователь НЕ является хостом - скрываем кнопку "Начать игру"');
        startGameButton.style.display = 'none';
        startGameButton.style.visibility = 'hidden';
        // Дополнительная проверка через CSS класс
        startGameButton.classList.add('hidden');
        return;
    }
    
    console.log('✅ Room: Пользователь является хостом - показываем кнопку "Начать игру"');
    startGameButton.style.display = 'block';
    startGameButton.style.visibility = 'visible';
    // Убираем CSS класс скрытия
    startGameButton.classList.remove('hidden');
    
    startGameButton.disabled = !canStart || currentRoom.isStarted;
    
    if (currentRoom.isStarted) {
        startGameButton.textContent = '🎮 Игра начата';
    } else if (!canStart) {
        // Показываем сколько готово из общего количества игроков
        startGameButton.textContent = `👥 Ждем готовности (${readyCount}/${playersCount})`;
    } else {
        startGameButton.textContent = '🚀 Начать игру';
    }
}

/**
 * Отображение информации о пользователе
 */
function displayUserInfo() {
    try {
        // Получаем текущего пользователя из localStorage (поддерживаем оба формата)
        const raw = localStorage.getItem('currentUser') || localStorage.getItem('aura_money_user');
        const storedToken = localStorage.getItem('aura_money_token') || 'ok'; // для статического режима токен может отсутствовать
        
        if (raw) {
            try {
            currentUser = JSON.parse(raw);
            } catch (error) {
                console.error('❌ Room: Ошибка парсинга currentUser:', error);
                currentUser = null;
            }
        }
        
        // Если currentUser не найден или некорректный, создаем fallback
        if (!currentUser || !currentUser.username) {
            console.warn('⚠️ Room: currentUser не найден, создаем fallback');
            currentUser = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                username: 'player1',
                name: 'Игрок 1',
                avatar: '👤'
            };
            console.log('🔧 Room: Создан fallback currentUser:', currentUser);
        }
            
            const userAvatar = document.getElementById('room-user-avatar');
            const userName = document.getElementById('room-user-name');
            
            if (userAvatar && userName) {
                // Устанавливаем первую букву имени пользователя
                const username = currentUser.username || currentUser.name || currentUser.email || 'User';
                const firstLetter = username.charAt(0).toUpperCase();
                userAvatar.textContent = firstLetter;
                
                // Устанавливаем имя пользователя
                userName.textContent = username || 'Пользователь';
                
                console.log('✅ Room: Информация о пользователе отображена:', currentUser.username || currentUser.name);
                
                // Обновляем кнопку "Начать игру" после загрузки данных пользователя
                setTimeout(() => {
                    console.log('🔄 Room: Обновляем кнопку после загрузки пользователя');
                    updateStartGameButton();
                }, 100);
                
        } else {
            console.log('⚠️ Room: Пользователь не авторизован');
            showAuthRequired();
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Room: Ошибка отображения информации о пользователе:', error);
        showAuthRequired();
        return false;
    }
}

/**
 * Показать сообщение о необходимости авторизации
 */
function showAuthRequired() {
    // Скрываем основное содержимое
    const roomContent = document.querySelector('.room-content');
    if (roomContent) {
        roomContent.style.display = 'none';
    }
    
    // Показываем сообщение о необходимости авторизации
    const roomContainer = document.querySelector('.room-container');
    if (roomContainer) {
        const authMessage = document.createElement('div');
        authMessage.className = 'auth-required-message';
        authMessage.innerHTML = `
            <div class="auth-message-content">
                <div class="auth-icon">🔐</div>
                <h2>Требуется авторизация</h2>
                <p>Для входа в комнату необходимо авторизоваться</p>
                <div class="auth-actions">
                    <button class="btn btn-primary" id="auth-login-btn">
                        Войти в систему
                    </button>
                    <button class="btn btn-secondary" id="auth-back-to-rooms-btn">
                        Назад к комнатам
                    </button>
                </div>
            </div>
        `;
        
        roomContainer.appendChild(authMessage);
    }
    
    showNotification('Необходимо авторизоваться для входа в комнату', 'warning');
}

/**
 * Загрузка мечт в выпадающий список
 */
function loadDreams() {
    console.log('🔍 Room: loadDreams вызвана');
    const dreamSelect = document.getElementById('dream-select');
    if (!dreamSelect) {
        console.warn('⚠️ Room: Элемент dream-select не найден');
        return;
    }
    
    console.log('🔍 Room: DREAMS_CONFIG длина:', DREAMS_CONFIG ? DREAMS_CONFIG.length : 'не определена');
    
    // Очищаем список (кроме первого элемента)
    dreamSelect.innerHTML = '<option value="">Выберите свою мечту...</option>';
    
    if (!DREAMS_CONFIG || DREAMS_CONFIG.length === 0) {
        console.error('❌ Room: DREAMS_CONFIG пуст или не определен');
        return;
    }
    
    // Получаем список уже выбранных мечт другими игроками
    const takenDreamIds = getTakenDreamIds();
    console.log('🔍 Room: Занятые мечты:', takenDreamIds);
    
    DREAMS_CONFIG.forEach(dream => {
        const option = document.createElement('option');
        option.value = dream.id;
        option.textContent = `${dream.icon} ${dream.name} - ${formatCurrency(dream.cost)}`;
        
        // Блокируем мечты, которые уже выбраны другими игроками
        const isTaken = takenDreamIds.includes(dream.id);
        const isMyDream = dreamData && dreamData.id === dream.id;
        
        if (isTaken && !isMyDream) {
            option.disabled = true;
            option.textContent += ' (ЗАНЯТО)';
        }
        
        dreamSelect.appendChild(option);
    });
    
    console.log('✅ Room: Мечты загружены, добавлено опций:', DREAMS_CONFIG.length);
}

/**
 * Получить список ID мечт, которые уже выбраны другими игроками
 */
function getTakenDreamIds() {
    if (!currentRoom || !currentRoom.players || !currentUser) {
        return [];
    }
    
    const takenDreams = currentRoom.players
        .filter(player => {
            // Исключаем текущего игрока
            const isNotCurrentUser = player.userId !== currentUser.id && 
                                   player.username !== currentUser.username &&
                                   (currentUser.id ? player.userId !== currentUser.id : true);
            
            // Проверяем, что у игрока есть выбранная мечта
            const hasDream = player.dream && (
                (typeof player.dream === 'object' && player.dream.id) ||
                (typeof player.dream === 'string' && player.dream.trim() !== '')
            );
            
            return isNotCurrentUser && hasDream;
        })
        .map(player => {
            // Извлекаем ID мечты
            if (typeof player.dream === 'object' && player.dream.id) {
                return player.dream.id;
            }
            return null;
        })
        .filter(id => id !== null);
    
    console.log('🔍 Room: getTakenDreamIds - занятые мечты:', takenDreams);
    return takenDreams;
}

/**
 * Обработка выбора мечты
 */
function handleDreamSelection() {
    const dreamSelect = document.getElementById('dream-select');
    const dreamDescription = document.getElementById('dream-description');
    const dreamCost = document.getElementById('dream-cost');
    
    if (!dreamSelect || !dreamDescription || !dreamCost) return;
    
    const selectedDreamId = dreamSelect.value;
    
    if (selectedDreamId) {
        const dream = DREAMS_CONFIG.find(d => d.id === selectedDreamId);
        if (dream) {
            // Заполняем поля выбранной мечтой
            dreamDescription.value = dream.description;
            dreamCost.value = dream.cost;
            
            // Разблокируем поля для редактирования
            dreamDescription.removeAttribute('readonly');
            dreamCost.removeAttribute('readonly');
            
            console.log('✅ Room: Мечта выбрана:', dream.name);
            
            // Обновляем данные мечты
            dreamData = {
                id: dream.id,
                title: dream.name,
                description: dream.description,
                cost: dream.cost
            };
            
            // Обновляем статус готовности
            updateReadyStatus();
        }
    } else {
        // Очищаем поля если ничего не выбрано
        dreamDescription.value = '';
        dreamCost.value = '';
        
        // Блокируем поля
        dreamDescription.setAttribute('readonly', 'readonly');
        dreamCost.setAttribute('readonly', 'readonly');
        
        // Очищаем данные мечты
        dreamData = {};
        
        // Обновляем статус готовности
        updateReadyStatus();
    }
    
    // Обновляем данные мечты
    updateDreamData();
}

/**
 * Форматирование валюты (использует CommonUtils)
 */
function formatCurrency(amount) {
    if (typeof CommonUtils !== 'undefined' && CommonUtils.formatCurrency) {
    return CommonUtils.formatCurrency(amount);
    }
    // Fallback если CommonUtils еще не загружен
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$0';
    }
    const formatted = amount.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    return `$${formatted}`;
}

/**
 * Загрузка фишек
 */
function loadTokens() {
    console.log('🔍 Room: loadTokens вызвана');
    const tokensGrid = document.getElementById('tokens-grid');
    if (!tokensGrid) {
        console.warn('⚠️ Room: Элемент tokens-grid не найден');
        return;
    }
    
    console.log('🔍 Room: TOKENS_CONFIG длина:', TOKENS_CONFIG ? TOKENS_CONFIG.length : 'не определена');
    
    tokensGrid.innerHTML = '';
    
    if (!TOKENS_CONFIG || TOKENS_CONFIG.length === 0) {
        console.error('❌ Room: TOKENS_CONFIG пуст или не определен');
        return;
    }
    
    TOKENS_CONFIG.forEach(token => {
        const tokenCard = document.createElement('div');
        tokenCard.className = 'token-card';
        tokenCard.dataset.tokenId = token.id;
        
        tokenCard.innerHTML = `
            <div class="token-icon">${token.icon}</div>
        `;
        
        tokenCard.addEventListener('click', () => selectToken(token.id));
        tokensGrid.appendChild(tokenCard);
    });
    
    // Восстанавливаем выбранную фишку из localStorage
    let savedToken = null;
    if (typeof CommonUtils !== 'undefined' && CommonUtils.storage) {
        savedToken = CommonUtils.storage.get('selected_token');
    } else {
        // Fallback на прямой localStorage
        try {
            savedToken = localStorage.getItem('selected_token');
        } catch (e) {
            console.warn('⚠️ Room: Не удалось получить сохраненную фишку:', e);
        }
    }
    if (savedToken) {
        const savedCard = document.querySelector(`[data-token-id="${savedToken}"]`);
        if (savedCard) {
            savedCard.classList.add('selected');
            selectedToken = savedToken;
            console.log('✅ Room: Восстановлена выбранная фишка:', savedToken);
        }
    }
    
    console.log('✅ Room: Фишки загружены');
}

/**
 * Выбор фишки
 */
async function selectToken(tokenId) {
    try {
        // Проверяем уникальность фишки
        const isTokenUnique = await checkTokenUniqueness(tokenId);
        if (!isTokenUnique) {
            showNotification('Эта фишка уже выбрана другим игроком', 'error');
            return;
        }
        
        // Убираем выделение с предыдущей фишки
        const previousSelected = document.querySelector('.token-card.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Выделяем новую фишку
        const selectedCard = document.querySelector(`[data-token-id="${tokenId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            selectedToken = tokenId;
            
            // Сохраняем выбор в localStorage
            if (typeof CommonUtils !== 'undefined' && CommonUtils.storage) {
            CommonUtils.storage.set('selected_token', tokenId);
            } else {
                // Fallback на прямой localStorage
                try {
                    localStorage.setItem('selected_token', tokenId);
                } catch (e) {
                    console.warn('⚠️ Room: Не удалось сохранить выбранную фишку:', e);
                }
            }
            
            console.log('✅ Room: Фишка выбрана:', tokenId);
            console.log('✅ Room: Класс selected добавлен к элементу:', selectedCard);
            
            // Обновляем игрока в комнате с выбранной фишкой
            if (currentRoom && currentUser) {
                const playerData = {
                    userId: currentUser.id,
                    username: currentUser.username,
                    name: currentUser.name || currentUser.username,
                    avatar: currentUser.avatar || '',
                    isReady: false, // Сбрасываем готовность при смене фишки
                    dream: dreamData,
                    token: selectedToken
                };
                
                console.log('🔍 Room: selectToken - обновляем игрока с данными:', playerData);
                const updateResult = await roomService.updatePlayerInRoom(currentRoom.id, playerData);
                console.log('✅ Room: selectToken - игрок обновлен');
                console.log('🔍 Room: selectToken - ответ сервера:', {
                    success: updateResult.success,
                    room: updateResult.room,
                    players: updateResult.room?.players?.map(p => ({
                        name: p.name,
                        username: p.username,
                        isReady: p.isReady,
                        isReadyType: typeof p.isReady
                    }))
                });
            }
            
            // Отправляем уведомление другим игрокам о выборе фишки
            await sendPushNotification('token_selected', {
                playerName: currentUser.username,
                tokenId: tokenId,
                tokenName: selectedCard.textContent.trim(),
                roomId: currentRoom.id
            });
            
            // Обновляем статус готовности
            updateReadyStatus();
            
            showNotification(`Фишка ${tokenId} выбрана!`, 'success');
        }
    } catch (error) {
        console.error('❌ Room: Ошибка выбора фишки:', error);
        showNotification('Ошибка выбора фишки', 'error');
    }
}

/**
 * Обновление данных мечты
 */
function updateDreamData() {
    const dreamSelect = document.getElementById('dream-select');
    const description = document.getElementById('dream-description').value.trim();
    const cost = parseInt(document.getElementById('dream-cost').value) || 0;
    
    const selectedDreamId = dreamSelect ? dreamSelect.value : '';
    const selectedDream = selectedDreamId ? DREAMS_CONFIG.find(d => d.id === selectedDreamId) : null;
    
    dreamData = { 
        id: selectedDreamId,
        title: selectedDream ? selectedDream.name : '',
        description: description,
        cost: cost,
        icon: selectedDream ? selectedDream.icon : ''
    };
    
    console.log('✅ Room: Данные мечты обновлены:', dreamData);
    
    // Обновляем статус готовности
    updateReadyStatus();
}

/**
 * Обновление статуса готовности
 */
function updateReadyStatus() {
    const readyButton = document.getElementById('ready-button');
    if (!readyButton) return;
    
    // Проверяем, что dreamData существует и содержит необходимые поля
    const isDreamSelected = dreamData && 
                          typeof dreamData === 'object' &&
                          dreamData.id && 
                          dreamData.title && 
                          dreamData.title.trim() !== '';
    
    const isDreamComplete = isDreamSelected && 
                          dreamData.description && 
                          typeof dreamData.description === 'string' &&
                          dreamData.description.trim() !== '' &&
                          typeof dreamData.cost === 'number' && 
                          dreamData.cost > 0;
    const isTokenSelected = selectedToken !== null && selectedToken !== 'null' && selectedToken !== '';
    const canBeReady = Boolean(isDreamComplete && isTokenSelected);
    
    // Убеждаемся, что все значения определены для логирования
    const logData = {
        dreamData: dreamData || null,
        isDreamSelected: Boolean(isDreamSelected),
        isDreamComplete: Boolean(isDreamComplete),
        selectedToken: selectedToken || null,
        isTokenSelected: Boolean(isTokenSelected),
        canBeReady: Boolean(canBeReady)
    };
    
    console.log('🔍 Room: Проверка готовности:', logData);
    
    // Проверяем текущее состояние игрока
    const currentPlayer = currentRoom ? currentRoom.players.find(p => {
        const matches = p.userId === currentUser?.id || p.username === currentUser?.username;
        if (matches) {
            console.log('🔍 Room: Найден текущий игрок:', {
                player: p,
                currentUser: currentUser,
                matchType: p.userId === currentUser?.id ? 'userId' : 'username',
                playerIsReady: p.isReady,
                playerIsReadyType: typeof p.isReady
            });
        }
        return matches;
    }) : null;
    
    // Проверяем готовность игрока - только если он действительно готов
    const isCurrentlyReady = currentPlayer ? isPlayerReady(currentPlayer) : false;
    
    console.log('🔍 Room: Анализ готовности игрока:', {
        currentPlayer: currentPlayer ? {
            name: currentPlayer.name,
            username: currentPlayer.username,
            isReady: currentPlayer.isReady,
            isReadyType: typeof currentPlayer.isReady,
            isReadyValue: currentPlayer.isReady
        } : null,
        isCurrentlyReady,
        isCurrentlyReadyType: typeof isCurrentlyReady
    });
    
    // Если игрок не найден в комнате, считаем что он не готов
    const playerExists = currentPlayer !== null;
    // actualReadyState - реальное состояние готовности игрока в комнате
    const actualReadyState = playerExists ? isPlayerReady(currentPlayer) : false;
    
    // Отладочная информация
    console.log('🔍 Room: Обновление кнопки готовности:', {
        isDreamComplete,
        isTokenSelected,
        canBeReady,
        isCurrentlyReady,
        actualReadyState,
        playerExists,
        dreamData: dreamData,
        selectedToken: selectedToken,
        currentPlayer: currentPlayer ? { 
            name: currentPlayer.name, 
            username: currentPlayer.username,
            isReady: currentPlayer.isReady,
            userId: currentPlayer.userId,
            id: currentPlayer.id
        } : null,
        currentUser: currentUser ? { 
            id: currentUser.id, 
            username: currentUser.username,
            userId: currentUser.userId
        } : null,
        roomPlayers: currentRoom ? currentRoom.players.map(p => ({
            name: p.name,
            username: p.username,
            isReady: p.isReady,
            userId: p.userId,
            id: p.id
        })) : [],
        // Дополнительная отладка для понимания логики
        debug: {
            playerExists: playerExists,
            canBeReady: canBeReady,
            isCurrentlyReady: isCurrentlyReady,
            actualReadyState: actualReadyState,
            shouldShowNotReady: actualReadyState === true,
            shouldShowReady: actualReadyState === false && canBeReady === true,
            shouldShowSelectDream: canBeReady === false
        }
    });
    
    // Активируем кнопку только если можно быть готовым
    readyButton.disabled = !canBeReady;
    
    console.log('🔍 Room: Состояние кнопки готовности:', {
        disabled: readyButton.disabled,
        canBeReady: canBeReady,
        buttonText: readyButton.innerHTML,
        buttonClass: readyButton.className,
        isDreamComplete: isDreamComplete,
        isTokenSelected: isTokenSelected,
        dreamData: dreamData,
        selectedToken: selectedToken
    });
    
    // Обновляем текст кнопки в зависимости от состояния
    console.log('🔍 Room: Логика кнопки готовности:', {
        canBeReady: canBeReady,
        canBeReadyType: typeof canBeReady,
        actualReadyState: actualReadyState,
        actualReadyStateType: typeof actualReadyState
    });
    
    if (canBeReady === true) {
        // Если игрок может быть готов, показываем соответствующую кнопку
        if (actualReadyState === true) {
            readyButton.innerHTML = '✅ Готов к игре!';
            readyButton.className = 'btn btn-success btn-large';
            console.log('🔍 Room: Показываем "Готов к игре" - игрок готов');
        } else {
            readyButton.innerHTML = '✅ Я готов к игре!';
            readyButton.className = 'btn btn-primary btn-large';
            console.log('🔍 Room: Показываем "Я готов к игре" - игрок может быть готов');
        }
    } else {
        // Если игрок не может быть готов (не выбрал мечту или фишку)
        readyButton.innerHTML = '⏳ Выберите мечту и фишку';
        readyButton.className = 'btn btn-secondary btn-large';
        console.log('🔍 Room: Показываем "Выберите мечту и фишку" - не все выбрано');
    }
    
    const hint = document.querySelector('.ready-hint');
    if (hint) {
        if (canBeReady) {
            if (actualReadyState) {
                hint.textContent = 'Вы готовы к игре!';
                hint.style.color = '#10b981';
            } else {
                hint.textContent = 'Нажмите "Готов" для участия в игре';
                hint.style.color = '#3b82f6';
            }
        } else {
            const missing = [];
            if (!isDreamSelected) missing.push('мечту');
            if (!isTokenSelected) missing.push('фишку');
            hint.textContent = `Выберите: ${missing.join(' и ')}`;
            hint.style.color = '#a0a0a0';
        }
    }
}

/**
 * Переключение статуса готовности
 */
async function toggleReadyStatus() {
    try {
        console.log('🎮 Room: toggleReadyStatus вызвана!');
        console.log('🎮 Room: Попытка переключения готовности:', {
            currentRoom: !!currentRoom,
            currentRoomId: currentRoom?.id,
            currentUser: !!currentUser,
            currentUserId: currentUser?.id,
            currentUsername: currentUser?.username,
            selectedToken: selectedToken,
            dreamData: dreamData,
            hasDreamData: !!dreamData,
            dreamDataId: dreamData?.id,
            dreamDataTitle: dreamData?.title,
            dreamDataCost: dreamData?.cost
        });
        
        // Проверяем, что функция не вызывается дважды
        if (window._toggleReadyStatusInProgress) {
            console.warn('⚠️ Room: toggleReadyStatus уже выполняется, пропускаем');
            return;
        }
        window._toggleReadyStatusInProgress = true;
        
        // Отключаем кнопку во время обработки
        const readyButton = document.getElementById('ready-button');
        if (readyButton) {
            readyButton.disabled = true;
            readyButton.textContent = '⏳ Обрабатываем...';
        }
        
        if (!currentRoom || !currentUser) {
            console.error('❌ Room: Недостаточно данных для переключения готовности:', {
                hasCurrentRoom: !!currentRoom,
                hasCurrentUser: !!currentUser,
                currentRoomId: currentRoom?.id,
                currentUserId: currentUser?.id,
                currentUsername: currentUser?.username
            });
            showNotification('Ошибка: данные комнаты или пользователя не загружены', 'error');
            window._toggleReadyStatusInProgress = false;
            if (readyButton) {
                readyButton.disabled = false;
                updateReadyStatus();
            }
            return;
        }
        
        if (!selectedToken) {
            console.warn('⚠️ Room: Фишка не выбрана');
            showNotification('Сначала выберите фишку', 'warning');
            window._toggleReadyStatusInProgress = false;
            if (readyButton) {
                readyButton.disabled = false;
                updateReadyStatus();
            }
            return;
        }
        
        const isDreamSelected = dreamData.id && dreamData.title;
        const isDreamComplete = isDreamSelected && dreamData.description && dreamData.cost > 0;
        if (!isDreamComplete) {
            showNotification('Сначала выберите и заполните данные о мечте', 'warning');
            window._toggleReadyStatusInProgress = false;
            return;
        }
        
        // Проверяем уникальность фишки
        const isTokenUnique = await checkTokenUniqueness(selectedToken);
        if (!isTokenUnique) {
            showNotification('Эта фишка уже выбрана другим игроком', 'error');
            window._toggleReadyStatusInProgress = false;
            return;
        }
        
        // Определяем текущее состояние игрока
        console.log('🔍 Room: Поиск текущего игрока в комнате:', {
            currentUserId: currentUser.id,
            currentUsername: currentUser.username,
            roomPlayers: currentRoom.players.map(p => ({
                userId: p.userId,
                username: p.username,
                isReady: p.isReady
            }))
        });
        
        // Строгий поиск игрока: сначала по userId, затем по username
        // Это предотвращает обновление чужого статуса
        let currentPlayer = null;
        
        // Приоритет 1: поиск по userId (если есть)
        if (currentUser.id || currentUser.userId) {
            const userId = currentUser.id || currentUser.userId;
            currentPlayer = currentRoom.players.find(p => {
                const match = p.userId === userId;
                if (match) {
                    console.log('✅ Room: Найден игрок по userId:', {
                        player: p,
                        searchedUserId: userId,
                        playerUserId: p.userId
                    });
                }
                return match;
            });
        }
        
        // Приоритет 2: поиск по username (только если не найден по userId)
        if (!currentPlayer && currentUser.username) {
            currentPlayer = currentRoom.players.find(p => {
                const match = p.username === currentUser.username;
                if (match) {
                    console.log('✅ Room: Найден игрок по username:', {
                        player: p,
                        searchedUsername: currentUser.username,
                        playerUsername: p.username,
                        warning: 'Используется поиск по username - менее надежно!'
                    });
                }
                return match;
            });
        }
        
        // Проверка: убеждаемся, что найден правильный игрок
        if (currentPlayer) {
            console.log('✅ Room: Игрок найден для обновления:', {
                foundPlayer: {
                    userId: currentPlayer.userId,
                    username: currentPlayer.username,
                    isReady: currentPlayer.isReady
                },
                currentUser: {
                    id: currentUser.id || currentUser.userId,
                    username: currentUser.username
                },
                match: (currentPlayer.userId === (currentUser.id || currentUser.userId)) || 
                       (currentPlayer.username === currentUser.username)
            });
        } else {
            console.error('❌ Room: Игрок НЕ найден в комнате!', {
                currentUser: {
                    id: currentUser.id || currentUser.userId,
                    username: currentUser.username
                },
                roomPlayers: currentRoom.players.map(p => ({
                    userId: p.userId,
                    username: p.username
                }))
            });
        }
        
        const isCurrentlyReady = currentPlayer ? isPlayerReady(currentPlayer) : false;
        const newReadyState = !isCurrentlyReady;
        
        console.log('🔍 Room: Состояние игрока перед переключением:', {
            currentPlayer: currentPlayer ? { 
                id: currentPlayer.id, 
                username: currentPlayer.username, 
                userId: currentPlayer.userId,
                isReady: currentPlayer.isReady,
                isReadyType: typeof currentPlayer.isReady,
                isReadyRaw: currentPlayer.isReady
            } : null,
            isCurrentlyReady,
            isCurrentlyReadyType: typeof isCurrentlyReady,
            isPlayerReadyResult: currentPlayer ? isPlayerReady(currentPlayer) : 'no player',
            newReadyState,
            newReadyStateType: typeof newReadyState,
            action: newReadyState ? 'СТАНОВИМСЯ ГОТОВЫМИ' : 'СТАНОВИМСЯ НЕ ГОТОВЫМИ'
        });
        
        // Дополнительная проверка: если игрок не найден, считаем что он не готов
        if (!currentPlayer) {
            console.warn('⚠️ Room: Игрок не найден в комнате, считаем что не готов');
            // Если игрок не найден, значит он еще не присоединился, поэтому должен стать готовым
            // Но это не должно происходить, так как проверка была выше
        }
        
        // Формируем пакет игрока (PlayerBundle)
        // ВАЖНО: Используем userId из найденного игрока, чтобы обновить правильного игрока
        console.log('🔍 Room: Формируем пакет игрока...');
        console.log('🔍 Room: currentUser для пакета:', currentUser);
        console.log('🔍 Room: currentPlayer для пакета:', currentPlayer);
        console.log('🔍 Room: dreamData для пакета:', dreamData);
        console.log('🔍 Room: selectedToken для пакета:', selectedToken);
        console.log('🔍 Room: newReadyState для пакета:', newReadyState);
        
        // Используем userId из найденного игрока, если он есть
        // Это гарантирует, что обновим правильного игрока
        const userForBundle = currentPlayer ? {
            ...currentUser,
            id: currentPlayer.userId || currentPlayer.id || currentUser.id || currentUser.userId,
            userId: currentPlayer.userId || currentPlayer.id || currentUser.userId || currentUser.id,
            username: currentPlayer.username || currentUser.username
        } : currentUser;
        
        console.log('🔍 Room: userForBundle (с userId из найденного игрока):', {
            ...userForBundle,
            hasId: !!userForBundle.id,
            hasUserId: !!userForBundle.userId,
            idValue: userForBundle.id,
            userIdValue: userForBundle.userId,
            username: userForBundle.username
        });
        
        const playerData = buildPlayerBundle({
            user: userForBundle,
            dream: dreamData,
            token: selectedToken,
            isReady: newReadyState
        });
        console.log('✅ Room: Пакет игрока сформирован:', {
            ...playerData,
            userId: playerData.userId || playerData.id,
            username: playerData.username,
            isReady: playerData.isReady,
            hasDream: !!playerData.dream,
            token: playerData.token
        });

        console.log('🔍 Room: Валидируем пакет игрока...');
        const validation = validatePlayerBundle(playerData);
        console.log('🔍 Room: Результат валидации:', validation);
        if (!validation.isValid) {
            showNotification(validation.message || 'Проверьте данные игрока', 'error');
            window._toggleReadyStatusInProgress = false;
            return;
        }
        console.log('✅ Room: Пакет игрока прошел валидацию');
        
        console.log('🔍 Room: Данные игрока для обновления:', playerData);
        
        // СНАЧАЛА обновляем локальное состояние для мгновенного отображения
        // Используем того же игрока, что был найден выше
        if (currentRoom && currentRoom.players && currentPlayer) {
            const playerIndex = currentRoom.players.findIndex(p => 
                (p.userId && currentPlayer.userId && p.userId === currentPlayer.userId) ||
                (p.username && currentPlayer.username && p.username === currentPlayer.username && !p.userId)
            );
            if (playerIndex !== -1) {
                // Сохраняем старое значение для отката при ошибке
                const oldIsReady = currentRoom.players[playerIndex].isReady;
                currentRoom.players[playerIndex].isReady = newReadyState;
                console.log('✅ Room: Локальное состояние игрока обновлено ДО запроса к серверу:', {
                    playerIndex,
                    oldIsReady,
                    newReadyState,
                    player: currentRoom.players[playerIndex]
                });
                // Сразу обновляем UI
                updatePlayersList();
                updateReadyStatus();
            }
        }
        
        // Обновляем игрока в комнате на сервере
        console.log('🔄 Room: Обновляем игрока в комнате на сервере...');
        try {
        await roomService.updatePlayerInRoom(currentRoom.id, playerData);
            console.log('✅ Room: Игрок обновлен в комнате на сервере');
        } catch (error) {
            console.error('❌ Room: Ошибка обновления игрока в комнате:', error);
            
            // Проверяем, это rate limiting или другая ошибка
            if (error.message && error.message.includes('Rate limited')) {
                const retryAfter = error.retryAfter || 60;
                const retrySeconds = Math.ceil(retryAfter / 1000);
                showNotification(`Слишком частые запросы. Попробуйте через ${retrySeconds} секунд`, 'warning');
                console.log(`⏳ Room: Rate limited, следующая попытка через ${retrySeconds}с`);
            } else {
                showNotification('Ошибка обновления игрока', 'error');
            }
            
            // Откатываем локальное изменение при ошибке
            // Используем того же игрока, что был найден выше (currentPlayer)
            if (currentRoom && currentRoom.players && currentPlayer) {
                const playerIndex = currentRoom.players.findIndex(p => {
                    // Строгое сравнение: сначала по userId, затем по username
                    if (p.userId && currentPlayer.userId) {
                        return p.userId === currentPlayer.userId;
                    }
                    if (p.username && currentPlayer.username && !p.userId && !currentPlayer.userId) {
                        return p.username === currentPlayer.username;
                    }
                    return false;
                });
                if (playerIndex !== -1) {
                    // Откатываем к предыдущему состоянию
                    currentRoom.players[playerIndex].isReady = !newReadyState;
                    updatePlayersList();
                    updateReadyStatus();
                    console.log('🔄 Room: Откатили локальное изменение из-за ошибки для игрока:', {
                        playerIndex,
                        player: currentRoom.players[playerIndex],
                        searchedPlayer: currentPlayer
                    });
                }
            }
            
            window._toggleReadyStatusInProgress = false;
            return;
        }
        
        // Показываем соответствующее уведомление
        console.log('🔍 Room: Показываем уведомление, newReadyState:', newReadyState);
        if (newReadyState) {
            console.log('✅ Room: Игрок становится готовым');
            showNotification('Вы готовы к игре!', 'success');
            
            // Отправляем push-уведомление хосту о готовности игрока
            try {
            await sendPushNotification('player_ready', {
                playerName: currentUser.username,
                roomId: currentRoom.id,
                    readyPlayersCount: currentRoom.players.filter(isPlayerReady).length,
                totalPlayersCount: currentRoom.players.length
            });
            } catch (pushError) {
                console.warn('⚠️ Room: Ошибка отправки push-уведомления:', pushError);
                // Не критично, продолжаем
            }
        } else {
            console.log('❌ Room: Игрок становится не готовым');
            showNotification('Вы больше не готовы к игре', 'info');
        }
        
        // Обновляем информацию о комнате с сервера
        console.log('🔄 Room: Обновляем информацию о комнате...');
        await refreshRoomData();
        console.log('✅ Room: Информация о комнате обновлена');
        
        // Принудительно обновляем кнопку готовности
        console.log('🔄 Room: Обновляем кнопку готовности...');
        updateReadyStatus();
        console.log('✅ Room: Кнопка готовности обновлена');
        
        // Дополнительное обновление для синхронизации статуса
        setTimeout(async () => {
            console.log('🔄 Room: Дополнительное обновление для синхронизации статуса...');
            await refreshRoomData();
            updateReadyStatus();
            console.log('✅ Room: Дополнительное обновление завершено');
        }, 1000);
        
        console.log('🎉 Room: toggleReadyStatus завершена успешно!');
        
    } catch (error) {
        console.error('❌ Room: Ошибка обновления статуса готовности:', error);
        showNotification('Ошибка обновления статуса', 'error');
    } finally {
        // Очищаем флаг выполнения
        window._toggleReadyStatusInProgress = false;
        console.log('🔄 Room: Флаг _toggleReadyStatusInProgress сброшен');
        
        // Восстанавливаем кнопку и обновляем статус
        const readyButton = document.getElementById('ready-button');
        if (readyButton) {
            readyButton.disabled = false;
            console.log('✅ Room: Кнопка готовности разблокирована');
            // Принудительно обновляем статус кнопки
            updateReadyStatus();
        }
    }
}

/**
 * Построение пакета данных игрока для сервера
 */
function buildPlayerBundle({ user, dream, token, isReady }) {
    console.log('🔍 Room: buildPlayerBundle - входные данные:', { user, dream, token, isReady });
    
    // Используем существующий userId из currentUser, если он есть
    // НЕ генерируем новый userId, чтобы не создавать конфликты
    let userId = user?.id || user?.userId || null;
    const username = user?.username || user?.name || '';
    
    // Если userId отсутствует, используем username как идентификатор
    // Но предупреждаем об этом
    if (!userId && username) {
        console.warn('⚠️ Room: buildPlayerBundle - userId отсутствует, используем username как идентификатор');
        // НЕ генерируем новый userId - это может привести к обновлению чужого статуса
        // Вместо этого используем username
    }
    
    console.log('🔍 Room: buildPlayerBundle - извлеченные данные:', { 
        userId, 
        username,
        warning: !userId ? 'userId отсутствует - возможны проблемы с идентификацией' : 'OK'
    });
    
    return {
        userId: userId,
        username: username,
        avatar: user?.avatar || '',
        token: token || '',
        dream: dream?.id ? {
            id: dream.id,
            title: dream.title || '',
            description: dream.description || '',
            cost: Number(dream.cost) || 0
        } : null,
        isReady: !!isReady
    };
}

/**
 * Валидация пакета PlayerBundle
 */
function validatePlayerBundle(bundle) {
    console.log('🔍 Room: validatePlayerBundle - проверяем пакет:', bundle);
    
    // Проверяем наличие username (обязательно)
    if (!bundle?.username) {
        console.error('❌ Room: validatePlayerBundle - отсутствует username');
        return {
            isValid: false,
            message: 'Username обязателен'
        };
    }
    
    // userId может отсутствовать, если используется username для идентификации
    // Но username уже проверен выше, так что эта проверка избыточна
    // Оставляем только для логирования
    if (!bundle?.userId) {
        console.warn('⚠️ Room: validatePlayerBundle - userId отсутствует, используется username для идентификации');
    }
    if (!bundle?.token) {
        console.log('❌ Room: validatePlayerBundle - отсутствует token');
        return { isValid: false, message: 'Выберите фишку' };
    }
    if (!bundle?.dream || !bundle.dream.id || !bundle.dream.title || !bundle.dream.cost) {
        console.log('❌ Room: validatePlayerBundle - неполная мечта:', bundle?.dream);
        return { isValid: false, message: 'Заполните мечту полностью' };
    }
    
    console.log('✅ Room: validatePlayerBundle - пакет валиден');
    return { isValid: true };
}

/**
 * Обновление данных комнаты
 */
async function refreshRoomData() {
    try {
        if (!currentRoom) return;
        
        // Сохраняем локальное состояние текущего игрока перед обновлением
        // Используем строгий поиск: сначала по userId, затем по username
        let localPlayerState = null;
        if (currentUser && currentRoom.players) {
            let localPlayer = null;
            
            // Приоритет 1: поиск по userId
            if (currentUser.id || currentUser.userId) {
                const userId = currentUser.id || currentUser.userId;
                localPlayer = currentRoom.players.find(p => p.userId === userId);
            }
            
            // Приоритет 2: поиск по username (только если не найден по userId)
            if (!localPlayer && currentUser.username) {
                localPlayer = currentRoom.players.find(p => p.username === currentUser.username);
            }
            
            if (localPlayer) {
                localPlayerState = {
                    userId: localPlayer.userId,
                    username: localPlayer.username,
                    isReady: localPlayer.isReady,
                    token: localPlayer.token,
                    dream: localPlayer.dream
                };
                console.log('💾 Room: Сохранили локальное состояние игрока перед обновлением:', localPlayerState);
            }
        }
        
        const room = await roomService.getRoomById(currentRoom.id);
        if (room) {
            const previousReadyCount = currentRoom.players ? currentRoom.players.filter(isPlayerReady).length : 0;
            const newReadyCount = room.players ? room.players.filter(isPlayerReady).length : 0;
            const wasNotStarted = !currentRoom.isStarted;
            const isNowStarted = room.isStarted;
            
            // Восстанавливаем локальное состояние игрока, если оно было сохранено
            // Используем строгий поиск: сначала по userId, затем по username
            if (localPlayerState && room.players) {
                let serverPlayer = null;
                
                // Приоритет 1: поиск по userId
                if (localPlayerState.userId) {
                    serverPlayer = room.players.find(p => p.userId === localPlayerState.userId);
                }
                
                // Приоритет 2: поиск по username (только если не найден по userId)
                if (!serverPlayer && localPlayerState.username) {
                    serverPlayer = room.players.find(p => p.username === localPlayerState.username);
                }
                
                if (serverPlayer) {
                    // Если локальное состояние новее (isReady изменился), используем его
                    // Это предотвращает потерю изменений при быстром переключении
                    const serverIsReady = isPlayerReady(serverPlayer);
                    const localIsReady = isPlayerReady(localPlayerState);
                    
                    if (localIsReady !== serverIsReady) {
                        console.log('🔄 Room: Восстанавливаем локальное состояние готовности:', {
                            serverIsReady,
                            localIsReady,
                            using: localIsReady ? 'локальное (готов)' : 'локальное (не готов)'
                        });
                        serverPlayer.isReady = localPlayerState.isReady;
                    }
                }
            }
            
            currentRoom = room;
            updateRoomInfo();
            updatePlayersList();
            updateStartGameButton();
            updateTokensAvailability(); // Обновляем доступность фишек
            updateReadyStatus(); // Обновляем состояние кнопки готовности
            loadDreams(); // Обновляем список мечт с блокировкой выбранных
            
            // Проверяем, если игра только что началась
            if (wasNotStarted && isNowStarted) {
                console.log('🎮 Room: Игра началась! Переходим к игровому полю...');
                showNotification('Игра началась! Переходим к игровому полю...', 'success');
                
                setTimeout(() => {
                navigateToGameBoard(room.id);
                }, 2000);
                return;
            }
            
            // Показываем уведомление если количество готовых игроков изменилось
            if (newReadyCount > previousReadyCount) {
                const readyPlayers = room.players.filter(isPlayerReady);
                const lastReadyPlayer = readyPlayers[readyPlayers.length - 1];
                if (lastReadyPlayer && lastReadyPlayer.userId !== currentUser?.id) {
                    showNotification(`${lastReadyPlayer.username} готов к игре!`, 'success');
                }
            }
        }
    } catch (error) {
        console.error('❌ Room: Ошибка обновления данных комнаты:', error);
    }
}

/**
 * Показать модальное окно подтверждения начала игры
 */
function showStartGameModal() {
    const modal = document.getElementById('confirm-modal');
    const roomName = document.getElementById('modal-room-name');
    const readyCount = document.getElementById('modal-ready-count');
    const totalPlayers = document.getElementById('modal-total-players');
    
    if (modal && roomName && readyCount && totalPlayers) {
        roomName.textContent = currentRoom ? currentRoom.name : '';
        readyCount.textContent = currentRoom ? currentRoom.players.filter(isPlayerReady).length : 0;
        totalPlayers.textContent = currentRoom ? currentRoom.maxPlayers : 0;
        
        modal.classList.add('show');
    }
}

/**
 * Скрыть модальное окно
 */
function hideStartGameModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Подтверждение начала игры
 */
async function confirmStartGame() {
    try {
        if (!currentRoom || !currentUser) return;
        
        // Проверка, что пользователь является хостом
        const isHost = isCurrentUserHost();
        if (!isHost) {
            console.error('❌ Room: Только хост может начать игру');
            showNotification('Только создатель комнаты может начать игру', 'error');
            hideStartGameModal();
            return;
        }
        
        console.log('🏠 Room: Начало игры');
        console.log('🔍 Room: Отладка данных для запуска игры:', {
            currentUser: currentUser,
            currentRoom: currentRoom,
            userId: currentUser.id,
            creatorId: currentRoom.creatorId,
            isHost: isHost
        });
        
        // Принудительно обновляем данные комнаты перед запуском игры
        console.log('🔄 Room: Принудительное обновление данных комнаты перед запуском игры');
        await refreshRoomData();
        
        // Ищем текущего игрока в комнате для получения правильного ID
        const currentPlayer = currentRoom.players.find(player => 
            player.username === currentUser.username || 
            player.name === currentUser.username
        );
        
        // Определяем ID пользователя (UUID из БД) для запуска игры
        // Приоритет: игрок из списка комнаты -> явные поля создателя -> текущий пользователь
        let userId = null;
        const foundPlayer = currentRoom.players?.find(p => 
            p.username === currentUser.username || 
            p.name === currentUser.username ||
            p.userId === currentUser.id
        );
        if (foundPlayer) {
            userId = foundPlayer.userId || foundPlayer.id || null;
        }
        if (!userId) {
            userId = currentRoom.creatorUserId || currentRoom.creator_id || currentRoom.creatorId || null;
        }
        if (!userId) {
            // как крайний случай — используем currentUser.id, если он похож на UUID
            const maybeId = currentUser.id;
            const uuidLike = typeof maybeId === 'string' && /[a-f0-9\-]{8,}/i.test(maybeId);
            userId = uuidLike ? maybeId : null;
        }
        
        // Если всё ещё нет корректного userId — пробуем найти создателя среди игроков
        if (!userId && currentRoom.players) {
            const creatorPlayer = currentRoom.players.find(p => p.isCreator || p.role === 'creator' || p.isHost);
            if (creatorPlayer) userId = creatorPlayer.userId || creatorPlayer.id || null;
        }
        
        
        console.log('🔍 Room: Финальные данные для запуска игры:', {
            userId: userId,
            currentUser: currentUser,
            currentRoom: currentRoom,
            currentPlayer: currentPlayer,
            creatorId: currentRoom.creatorId,
            creator_id: currentRoom.creator_id,
            roomCreator: currentRoom.creator,
            roomCreatorId: currentRoom.creatorId
        });
        
        if (!userId) {
            throw new Error('Не удалось определить ID пользователя для запуска игры');
        }
        
        try {
            const startResult = await roomService.startGame(currentRoom.id, userId);
            
            if (!startResult.success) {
                throw new Error(startResult.message || 'Ошибка запуска игры');
            }
            
            // Отправляем уведомление всем игрокам о начале игры
            await sendPushNotification('game_started', {
                roomId: currentRoom.id,
                roomName: currentRoom.name,
                hostName: currentUser.username
            });
            
            showNotification('Игра начата! Переходим к игровому полю...', 'success');
            
            // Переходим к игровой доске
            setTimeout(() => {
                // Переходим на главную страницу с данными о комнате
                const roomId = currentRoom.id;
                console.log('🎮 Room: Переход к игровой доске:', roomId);
                
                // Сохраняем данные пользователя для передачи на игровую доску
                const userData = {
                    ...currentUser,
                    roomId: roomId,
                    fromRoom: true
                };
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                navigateToGameBoard(roomId);
            }, 2000);
            
        } catch (error) {
            // Если игра уже запущена, перенаправляем на игровую доску
            if (error.message && error.message.includes('уже запущена')) {
                console.log('🎮 Room: Игра уже запущена, перенаправляем на игровую доску');
                showNotification('Игра уже запущена! Переходим к игровому полю...', 'info');
                
                setTimeout(() => {
                    const roomId = currentRoom.id;
                    console.log('🎮 Room: Переход к игровой доске (игра уже запущена):', roomId);
                    
                    // Сохраняем данные пользователя для передачи на игровую доску
                    const userData = {
                        ...currentUser,
                        roomId: roomId,
                        fromRoom: true
                    };
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    
                    navigateToGameBoard(roomId);
                }, 2000);
            } else if (error.message && error.message.includes('Application failed to respond')) {
                // Ошибка 502 - сервер не отвечает, но игра может быть запущена
                console.warn('⚠️ Room: Сервер не отвечает, но продолжаем с игрой');
                showNotification('Сервер не отвечает, но игра может быть запущена. Переходим к игровому полю...', 'warning');
                
                setTimeout(() => {
                    const roomId = currentRoom.id;
                    console.log('🎮 Room: Переход к игровой доске (сервер не отвечает):', roomId);
                    
                    // Сохраняем данные пользователя для передачи на игровую доску
                    const userData = {
                        ...currentUser,
                        roomId: roomId,
                        fromRoom: true
                    };
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    
                    navigateToGameBoard(roomId);
                }, 2000);
            } else {
                throw error; // Перебрасываем другие ошибки
            }
        }
        
    } catch (error) {
        console.error('❌ Room: Ошибка начала игры:', error);
        showNotification('Ошибка начала игры', 'error');
        hideStartGameModal();
    }
}

/**
 * Показать уведомление
 */
/**
 * Проверка уникальности фишки
 */
async function checkTokenUniqueness(tokenId) {
    try {
        if (!currentRoom || !currentUser) {
            console.log('🔍 Room: checkTokenUniqueness - нет currentRoom или currentUser');
            return true;
        }
        
        console.log('🔍 Room: checkTokenUniqueness - проверяем фишку:', tokenId);
        console.log('🔍 Room: checkTokenUniqueness - currentUser:', currentUser);
        console.log('🔍 Room: checkTokenUniqueness - игроки в комнате:', currentRoom.players);
        
        // Проверяем, не выбрана ли эта фишка другими игроками
        const isTokenTaken = currentRoom.players.some(player => {
            // Проверяем, что это не текущий пользователь
            const isNotCurrentUser = player.username !== currentUser.username && 
                                   player.name !== currentUser.username &&
                                   (currentUser.id ? player.userId !== currentUser.id : true);
            
            // И что фишка выбрана
            const isTokenSelected = player.token === tokenId;
            
            console.log('🔍 Room: checkTokenUniqueness - проверяем игрока:', {
                player: player,
                isNotCurrentUser,
                isTokenSelected,
                playerToken: player.token,
                targetToken: tokenId
            });
            
            return isNotCurrentUser && isTokenSelected;
        });
        
        if (isTokenTaken) {
            console.log(`⚠️ Room: Фишка ${tokenId} уже выбрана другим игроком`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Room: Ошибка проверки уникальности фишки:', error);
        return false;
    }
}

/**
 * Отправка push-уведомления
 */
async function sendPushNotification(type, data) {
    try {
        if (!currentRoom || !currentUser) return;
        
        // Определяем получателей уведомления
        let recipients = [];
        
        if (type === 'game_started') {
            // Для уведомления о начале игры отправляем всем игрокам
            recipients = currentRoom.players
                .filter(player => player.userId !== currentUser.id)
                .map(player => player.userId);
        } else {
            // Для других уведомлений отправляем только хосту
            const hostId = currentRoom.creatorId;
            if (hostId === currentUser.id) return; // Не отправляем себе
            recipients = [hostId];
        }
        
        if (recipients.length === 0) return;
        
        const notification = {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            from: currentUser.id,
            to: recipients
        };
        
        // Отправляем через API (имитация push-уведомления)
        await fetch(`/api/rooms/${currentRoom.id}/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('aura_money_token')}`
            },
            body: JSON.stringify(notification)
        });
        
        console.log('📱 Room: Push-уведомление отправлено:', type);
        
    } catch (error) {
        console.error('❌ Room: Ошибка отправки push-уведомления:', error);
    }
}

/**
 * Обработка входящих push-уведомлений
 */
function handlePushNotification(notification) {
    try {
        console.log('📱 Room: Получено push-уведомление:', notification);
        
        switch (notification.type) {
            case 'player_ready':
                handlePlayerReadyNotification(notification.data);
                break;
            case 'token_selected':
                handleTokenSelectedNotification(notification.data);
                break;
            case 'game_started':
                handleGameStartedNotification(notification.data);
                break;
            default:
                console.log('📱 Room: Неизвестный тип уведомления:', notification.type);
        }
    } catch (error) {
        console.error('❌ Room: Ошибка обработки push-уведомления:', error);
    }
}

/**
 * Обработка уведомления о готовности игрока
 */
function handlePlayerReadyNotification(data) {
    const isHost = isCurrentUserHost();
    if (!isHost) return;
    
    // Обновляем кнопку "Начать игру"
    updateStartGameButton();
    
    // Показываем уведомление хосту
    showNotification(
        `${data.playerName} готов к игре! (${data.readyPlayersCount}/${data.totalPlayersCount})`, 
        'success'
    );
    
    // Если все игроки готовы, активируем кнопку "Старт"
    if (data.readyPlayersCount === data.totalPlayersCount) {
        showNotification('Все игроки готовы! Можно начинать игру!', 'success');
    }
}

/**
 * Обработка уведомления о выборе фишки
 */
function handleTokenSelectedNotification(data) {
    // Обновляем список доступных фишек
    updateTokensAvailability();
    
    // Показываем уведомление
    showNotification(`Фишка ${data.tokenName} выбрана игроком ${data.playerName}`, 'info');
}

/**
 * Обработка уведомления о начале игры
 */
function handleGameStartedNotification(data) {
    try {
        console.log('🎮 Room: Получено уведомление о начале игры:', data);
        
        // Проверяем, что это наша комната
        if (data.roomId !== currentRoom?.id) {
            console.log('⚠️ Room: Уведомление не для нашей комнаты');
            return;
        }
        
        // Показываем уведомление
        showNotification(`Игра начата! ${data.hostName} запустил игру "${data.roomName}"`, 'success');
        
        // Переходим к игровому полю через 2 секунды
        setTimeout(() => {
            console.log('🎮 Room: Переход к игровому полю...');
            navigateToGameBoard(data.roomId);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Room: Ошибка обработки уведомления о начале игры:', error);
    }
}

/**
 * Обновление доступности фишек
 */
function updateTokensAvailability() {
    if (!currentRoom || !currentRoom.players) return;
    
    // Получаем фишки, занятые другими игроками
    const takenTokens = currentRoom.players
        .filter(player => (player.userId !== currentUser.id && player.username !== currentUser.username) && player.token)
        .map(player => player.token);
    
    // Получаем фишку текущего пользователя
    // Используем username для поиска, так как userId может быть undefined
    const currentPlayer = currentRoom.players.find(player => {
        // Проверяем по username (основной способ)
        if (player.username === currentUser.username) return true;
        // Проверяем по userId (если есть)
        if (currentUser.id && player.userId === currentUser.id) return true;
        // Проверяем по name (альтернативный способ)
        if (player.name === currentUser.username) return true;
        return false;
    });
    
    const currentPlayerToken = currentPlayer?.token;
    
    // Обновляем визуальное состояние фишек
    const tokenCards = document.querySelectorAll('.token-card');
    tokenCards.forEach(card => {
        const tokenId = card.dataset.tokenId;
        const isTakenByOther = takenTokens.includes(tokenId);
        const isMyToken = tokenId === currentPlayerToken;
        
        // Убираем все предыдущие состояния
        card.classList.remove('taken', 'selected');
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        
        if (isTakenByOther) {
            // Фишка занята другим игроком
            card.classList.add('taken');
            card.style.opacity = '0.4';
            card.style.pointerEvents = 'none';
            console.log('🚫 Room: Фишка занята другим игроком:', tokenId);
        } else if (isMyToken) {
            // Это моя фишка
            card.classList.add('selected');
            selectedToken = tokenId; // Обновляем глобальную переменную
            console.log('✅ Room: Обновлено состояние моей фишки:', tokenId);
        }
    });
    
    console.log('🔄 Room: Обновлена доступность фишек. Занятые:', takenTokens, 'Моя:', currentPlayerToken);
    console.log('🔍 Room: Отладка поиска игрока:', {
        currentUser: currentUser,
        roomPlayers: currentRoom.players.map(p => ({ username: p.username, name: p.name, userId: p.userId, token: p.token })),
        foundPlayer: currentPlayer
    });
}

function showNotification(message, type = 'info') {
    // Избегаем рекурсии - используем notificationManager напрямую
    if (window.notificationManager && typeof window.notificationManager.show === 'function') {
        return window.notificationManager.show(message, type);
    }
    // Fallback на глобальную функцию, если notificationManager недоступен
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        return window.showNotification(message, type);
    }
    console.warn('NotificationManager не доступен:', message);
}

// Экспорт функций и переменных для глобального доступа
window.loadRoomData = loadRoomData;
window.displayUserInfo = displayUserInfo;
window.selectToken = selectToken;
window.toggleReadyStatus = toggleReadyStatus;
window.loadDreams = loadDreams;
window.loadTokens = loadTokens;

// Экспорт переменных для отладки (отключено - используем только Railway)
if (false) { // Отключено - production режим
Object.defineProperty(window, 'currentUser', {
    get: () => currentUser,
    configurable: true
});
Object.defineProperty(window, 'currentRoom', {
    get: () => currentRoom,
    configurable: true
});
Object.defineProperty(window, 'selectedToken', {
    get: () => selectedToken,
    configurable: true
});
Object.defineProperty(window, 'dreamData', {
    get: () => dreamData,
    configurable: true
});
}
