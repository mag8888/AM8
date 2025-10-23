/**
 * Room Page Controller v1.0.0
 * Управление страницей настройки комнаты
 */

// Глобальные переменные
let roomService;
let currentRoom = null;
let currentUser = null;
let selectedToken = null;
let dreamData = {
    title: '',
    description: '',
    cost: 0
};

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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Room: Инициализация страницы комнаты');
    
    // Сначала показываем кэшированные данные для мгновенного отображения
    loadCachedRoomData();
    
    // Критически важные функции выполняем сразу
    displayUserInfo();
    loadDreams();
    loadTokens();
    
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
});

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
                    position: 0,
                    isInner: true,
                    money: p.money || 5000
                };
            })
        };
        
        console.log('🎮 Room: Сохраняем bundle в sessionStorage:', bundle);
        sessionStorage.setItem('am_player_bundle', JSON.stringify(bundle));
        
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
function startRoomDataPolling() {
    let lastUpdate = 0;
    const minUpdateInterval = 60000; // Минимум 60 секунд между обновлениями
    
    // Обновляем данные комнаты с адаптивным интервалом
    setInterval(async () => {
        const now = Date.now();
        
        // Проверяем, не слишком ли часто обновляемся
        if (now - lastUpdate < minUpdateInterval) {
            console.log('⏳ Room: Пропускаем обновление, слишком рано');
            return;
        }
        
        if (currentRoom && currentUser) {
            try {
                await refreshRoomData();
                lastUpdate = now;
            } catch (error) {
                console.warn('⚠️ Room: Ошибка периодического обновления:', error);
                // При ошибке увеличиваем интервал еще больше
                lastUpdate = now + 120000; // Ждем еще 120 секунд
            }
        }
    }, 30000); // Проверяем каждые 30 секунд, но обновляем не чаще чем раз в 60
    
    console.log('🔄 Room: Запущено оптимизированное периодическое обновление данных комнаты');
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
                className: readyButton.className
            });
            
            // Проверяем, не заблокирована ли кнопка
            if (readyButton.disabled) {
                console.warn('⚠️ Room: Кнопка заблокирована, клик игнорируется');
                return;
            }
            
            event.preventDefault();
            event.stopPropagation();
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
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                const roomData = JSON.parse(cached);
                const cacheAge = Date.now() - (roomData.cachedAt || 0);
                const maxAge = 5 * 60 * 1000; // 5 минут
                
                if (cacheAge < maxAge) {
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
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
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

/**
 * Загрузка данных комнаты с оптимизацией
 */
async function loadRoomData() {
    try {
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
            console.warn('⚠️ Room: Комната не найдена в API, пробуем мок-данные');
            
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
        showNotification('Ошибка загрузки данных комнаты', 'error');
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
            
            if (currentPlayer && !currentPlayer.isReady) {
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
function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    if (!playersList || !currentRoom) return;
    
    playersList.innerHTML = '';
    
    currentRoom.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        // Используем name или username для отображения
        const playerName = player.name || player.username || 'Неизвестный игрок';
        const avatar = player.avatar || playerName.charAt(0).toUpperCase();
        // Определяем статус игрока более точно
        let status = 'Выбирает';
        if (Boolean(player.isReady)) {
            status = 'Готов';
        } else if (player.dream && player.token) {
            // Если мечта и фишка выбраны, но игрок еще не отметился как готов
            status = 'Готовится';
        } else {
            // Если что-то не выбрано
            status = 'Выбирает';
        }
        
        // Дополнительная отладка для понимания статуса игрока
        console.log('🔍 Room: Статус игрока:', {
            playerName: playerName,
            isReady: player.isReady,
            isReadyType: typeof player.isReady,
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
    // Правильно обрабатываем isReady - может быть boolean, string, или undefined
    const readyCount = currentRoom.players?.filter(p => Boolean(p.isReady)).length || 0;
    const minPlayers = currentRoom.minPlayers || 2; // Минимум 2 игрока для старта
    const allPlayersReady = currentRoom.players?.every(player => Boolean(player.isReady)) || false;
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
    
    // СЕКЦИЯ: Скрытие кнопки для не-хостов
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
    const dreamSelect = document.getElementById('dream-select');
    if (!dreamSelect) return;
    
    // Очищаем список (кроме первого элемента)
    dreamSelect.innerHTML = '<option value="">Выберите свою мечту...</option>';
    
    DREAMS_CONFIG.forEach(dream => {
        const option = document.createElement('option');
        option.value = dream.id;
        option.textContent = `${dream.icon} ${dream.name} - ${formatCurrency(dream.cost)}`;
        dreamSelect.appendChild(option);
    });
    
    console.log('✅ Room: Мечты загружены');
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
 * Форматирование валюты
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Загрузка фишек
 */
function loadTokens() {
    const tokensGrid = document.getElementById('tokens-grid');
    if (!tokensGrid) return;
    
    tokensGrid.innerHTML = '';
    
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
    const savedToken = localStorage.getItem('selected_token');
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
            localStorage.setItem('selected_token', tokenId);
            
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
    
    const isDreamSelected = dreamData && dreamData.id && dreamData.title;
    const isDreamComplete = isDreamSelected && dreamData.description && dreamData.cost > 0;
    const isTokenSelected = selectedToken !== null && selectedToken !== 'null';
    const canBeReady = isDreamComplete && isTokenSelected;
    
    console.log('🔍 Room: Проверка готовности:', {
        dreamData: dreamData,
        isDreamSelected: isDreamSelected,
        isDreamComplete: isDreamComplete,
        selectedToken: selectedToken,
        isTokenSelected: isTokenSelected,
        canBeReady: canBeReady
    });
    
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
    const isCurrentlyReady = currentPlayer ? Boolean(currentPlayer.isReady) : false;
    
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
    const actualReadyState = playerExists ? Boolean(currentPlayer.isReady) : false;
    
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
        console.log('🎮 Room: КЛИК ПО КНОПКЕ ГОТОВНОСТИ!');
        console.log('🎮 Room: Попытка переключения готовности:', {
            currentRoom: !!currentRoom,
            currentUser: !!currentUser,
            selectedToken: selectedToken,
            dreamData: dreamData
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
        
        if (!currentRoom || !currentUser || !selectedToken) {
            console.warn('⚠️ Room: Недостаточно данных для переключения готовности');
            window._toggleReadyStatusInProgress = false;
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
        const currentPlayer = currentRoom.players.find(p => p.userId === currentUser.id || p.username === currentUser.username);
        const isCurrentlyReady = currentPlayer ? Boolean(currentPlayer.isReady) : false;
        const newReadyState = !isCurrentlyReady;
        
        console.log('🔍 Room: Состояние игрока:', {
            currentPlayer: currentPlayer ? { id: currentPlayer.id, username: currentPlayer.username, isReady: currentPlayer.isReady } : null,
            isCurrentlyReady,
            newReadyState
        });
        
        // Формируем пакет игрока (PlayerBundle)
        console.log('🔍 Room: Формируем пакет игрока...');
        console.log('🔍 Room: currentUser для пакета:', currentUser);
        console.log('🔍 Room: dreamData для пакета:', dreamData);
        console.log('🔍 Room: selectedToken для пакета:', selectedToken);
        console.log('🔍 Room: newReadyState для пакета:', newReadyState);
        
        const playerData = buildPlayerBundle({
            user: currentUser,
            dream: dreamData,
            token: selectedToken,
            isReady: newReadyState
        });
        console.log('✅ Room: Пакет игрока сформирован:', playerData);

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
        
        // Обновляем игрока в комнате
        console.log('🔄 Room: Обновляем игрока в комнате...');
        try {
        await roomService.updatePlayerInRoom(currentRoom.id, playerData);
            console.log('✅ Room: Игрок обновлен в комнате');
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
            
            window._toggleReadyStatusInProgress = false;
            return;
        }
        
        // Показываем соответствующее уведомление
        if (newReadyState) {
            showNotification('Вы готовы к игре!', 'success');
            
            // Отправляем push-уведомление хосту о готовности игрока
            await sendPushNotification('player_ready', {
                playerName: currentUser.username,
                roomId: currentRoom.id,
                readyPlayersCount: currentRoom.players.filter(p => p.isReady).length + 1,
                totalPlayersCount: currentRoom.players.length
            });
        } else {
            showNotification('Вы больше не готовы к игре', 'info');
        }
        
        // Обновляем информацию о комнате
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
        
        // Восстанавливаем кнопку
        const readyButton = document.getElementById('ready-button');
        if (readyButton) {
            readyButton.disabled = false;
            // Текст кнопки будет обновлен в updateReadyStatus()
        }
    }
}

/**
 * Построение пакета данных игрока для сервера
 */
function buildPlayerBundle({ user, dream, token, isReady }) {
    console.log('🔍 Room: buildPlayerBundle - входные данные:', { user, dream, token, isReady });
    
    let userId = user?.id || user?.userId || null;
    const username = user?.username || user?.name || '';
    
    // Если userId отсутствует, генерируем его на основе username
    if (!userId && username) {
        userId = `user_${username}_${Date.now()}`;
        console.log('🔧 Room: buildPlayerBundle - сгенерирован userId:', userId);
    }
    
    console.log('🔍 Room: buildPlayerBundle - извлеченные данные:', { userId, username });
    
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
    
    if (!bundle?.userId || !bundle?.username) {
        console.log('❌ Room: validatePlayerBundle - отсутствует userId или username:', {
            userId: bundle?.userId,
            username: bundle?.username
        });
        return { isValid: false, message: 'Не удалось определить пользователя' };
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
        
        const room = await roomService.getRoomById(currentRoom.id);
        if (room) {
            const previousReadyCount = currentRoom.players ? currentRoom.players.filter(p => p.isReady).length : 0;
            const newReadyCount = room.players ? room.players.filter(p => p.isReady).length : 0;
            const wasNotStarted = !currentRoom.isStarted;
            const isNowStarted = room.isStarted;
            
            currentRoom = room;
            updateRoomInfo();
            updatePlayersList();
            updateStartGameButton();
            updateTokensAvailability(); // Обновляем доступность фишек
            updateReadyStatus(); // Обновляем состояние кнопки готовности
            
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
                const readyPlayers = room.players.filter(p => p.isReady);
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
        readyCount.textContent = currentRoom ? currentRoom.players.filter(p => p.isReady).length : 0;
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
        
        console.log('🏠 Room: Начало игры');
        console.log('🔍 Room: Отладка данных для запуска игры:', {
            currentUser: currentUser,
            currentRoom: currentRoom,
            userId: currentUser.id,
            creatorId: currentRoom.creatorId
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
    if (window.notificationService) {
        window.notificationService.show(message, type);
    } else {
        // Fallback уведомление
        alert(message);
    }
}

// Экспорт функций и переменных для глобального доступа
window.loadRoomData = loadRoomData;
window.displayUserInfo = displayUserInfo;
window.selectToken = selectToken;
window.toggleReadyStatus = toggleReadyStatus;

// Экспорт переменных для отладки
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

window.selectToken = selectToken;
window.toggleReadyStatus = toggleReadyStatus;

// Экспорт переменных для отладки
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
