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
    
    initializeServices();
    setupEventListeners();
    loadRoomData();
    displayUserInfo();
    loadDreams();
    loadTokens();
    updateStartGameButton();
    
    // Запускаем периодическое обновление данных комнаты для получения изменений в реальном времени
    startRoomDataPolling();
});

// Единая функция перехода к игровому полю без обратного редиректа в комнату
function navigateToGameBoard(roomId) {
    try {
        // Помечаем флаг, чтобы индексная страница не переинициализировала комнаты
        sessionStorage.setItem('am_navigated_to_game', '1');
        // Идем сразу на полноценную страницу комнаты (игровая доска)
        window.location.href = `room.html?id=${roomId}`;
    } catch (e) {
        window.location.href = `room.html?id=${roomId}`;
    }
}

/**
 * Запуск периодического обновления данных комнаты
 */
function startRoomDataPolling() {
    // Обновляем данные комнаты каждые 10 секунд (увеличено для уменьшения нагрузки)
    setInterval(async () => {
        if (currentRoom && currentUser) {
            await refreshRoomData();
        }
    }, 10000);
    
    console.log('🔄 Room: Запущено периодическое обновление данных комнаты');
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
    
    // Кнопка "Начать игру"
    const startGameButton = document.getElementById('start-game');
    if (startGameButton) {
        startGameButton.addEventListener('click', showStartGameModal);
    }
    
    // Кнопка "Я готов к игре!"
    const readyButton = document.getElementById('ready-button');
    if (readyButton) {
        readyButton.addEventListener('click', toggleReadyStatus);
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
 * Загрузка данных комнаты
 */
async function loadRoomData() {
    try {
        // Получаем ID комнаты из URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id');
        
        if (!roomId) {
            showNotification('ID комнаты не указан', 'error');
            setTimeout(() => {
                window.location.href = 'rooms.html';
            }, 2000);
            return;
        }
        
        console.log('🏠 Room: Загрузка данных комнаты:', roomId);
        
        // Получаем данные комнаты
        const room = await roomService.getRoomById(roomId);
        
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
                setTimeout(() => {
                    window.location.href = 'rooms.html';
                }, 2000);
                return;
            }
        }
        
        currentRoom = room;
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
        } else {
            console.log('ℹ️ Room: Пользователь уже в комнате, обновляем данные');
            showNotification('Добро пожаловать обратно в комнату!', 'info');
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
        const status = player.isReady ? 'Готов' : 'Готовится';
        
        playerItem.innerHTML = `
            <div class="player-avatar">${avatar}</div>
            <div class="player-info">
                <div class="player-name">${playerName}</div>
                <div class="player-status">${status}</div>
            </div>
        `;
        
        // Кнопка удаления для хоста (кроме себя)
        const isHost = currentRoom.creatorId === currentUser?.id ||
                       currentRoom.creator === currentUser?.username ||
                       currentRoom.players.some(p => (p.userId === currentUser?.id || p.username === currentUser?.username) && (p.isCreator || p.isHost || p.role === 'creator'));
        const isSelf = player.userId === currentUser?.id || player.username === currentUser?.username;
        if (isHost && !isSelf) {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'btn btn-danger btn-sm';
            kickBtn.style.marginLeft = '8px';
            kickBtn.textContent = 'Удалить';
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
 * Обновление кнопки "Начать игру"
 */
function updateStartGameButton() {
    const startGameButton = document.getElementById('start-game');
    if (!startGameButton) return;
    
    // Если нет данных о комнате или пользователе, показываем кнопку как неактивную
    if (!currentRoom || !currentUser) {
        startGameButton.disabled = true;
        startGameButton.textContent = '🚀 Начать игру';
        return;
    }
    
    // Проверяем, является ли пользователь создателем комнаты
    const isHost = currentRoom.creatorId === currentUser.id || 
                   currentRoom.creator_id === currentUser.id ||
                   currentRoom.creator === currentUser.username ||
                   currentRoom.creator === currentUser.name ||
                   (currentRoom.players && currentRoom.players.some(p => 
                       (p.userId === currentUser.id || p.id === currentUser.id || p.username === currentUser.username) && 
                       (p.isCreator || p.role === 'creator' || p.isHost)
                   ));
    const playersCount = currentRoom.players.length;
    const readyCount = currentRoom.players.filter(p => p.isReady).length;
    const minPlayers = currentRoom.minPlayers || 1; // Тестовый режим: достаточно 1 игрока
    const allPlayersReady = currentRoom.players.every(player => player.isReady);
    // Тестовый режим: разрешаем старт при наличии хотя бы 1 готового игрока
    const canStart = (playersCount >= 1 && readyCount >= 1) || (playersCount >= minPlayers && allPlayersReady);
    
    // Дополнительная отладка
    console.log('🔍 Room: Отладка кнопки "Начать игру":', {
        isHost,
        playersCount,
        readyCount,
        minPlayers,
        allPlayersReady,
        canStart,
        creatorId: currentRoom.creatorId,
        currentUserId: currentUser.id,
        players: currentRoom.players.map(p => ({ name: p.name, isReady: p.isReady }))
    });
    
    // Логи для отладки (можно убрать в продакшене)
    if (playersCount >= minPlayers && !allPlayersReady) {
        console.log('🔍 Room: Ожидание готовности игроков:', {
            playersCount,
            minPlayers,
            allPlayersReady,
            readyPlayers: currentRoom.players.filter(p => p.isReady).length
        });
    }
    
    startGameButton.disabled = !isHost || !canStart || currentRoom.isStarted;
    
    if (currentRoom.isStarted) {
        startGameButton.textContent = '🎮 Игра начата';
    } else if (!isHost) {
        startGameButton.textContent = '⏳ Ожидание хоста';
    } else if (!canStart) {
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
            currentUser = JSON.parse(raw);
            
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
            }
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
        }
    } else {
        // Очищаем поля если ничего не выбрано
        dreamDescription.value = '';
        dreamCost.value = '';
        
        // Блокируем поля
        dreamDescription.setAttribute('readonly', 'readonly');
        dreamCost.setAttribute('readonly', 'readonly');
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
                    avatar: currentUser.avatar || '',
                    isReady: false, // Сбрасываем готовность при смене фишки
                    dream: dreamData,
                    token: selectedToken
                };
                
                await roomService.updatePlayerInRoom(currentRoom.id, playerData);
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
    
    const isDreamSelected = dreamData.id && dreamData.title;
    const isDreamComplete = isDreamSelected && dreamData.description && dreamData.cost > 0;
    const isTokenSelected = selectedToken !== null;
    const canBeReady = isDreamComplete && isTokenSelected;
    
    // Проверяем текущее состояние игрока
    const currentPlayer = currentRoom ? currentRoom.players.find(p => p.userId === currentUser?.id || p.username === currentUser?.username) : null;
    const isCurrentlyReady = currentPlayer ? currentPlayer.isReady : false;
    
    // Отладочная информация
    console.log('🔍 Room: Обновление кнопки готовности:', {
        isDreamComplete,
        isTokenSelected,
        canBeReady,
        isCurrentlyReady,
        currentPlayer: currentPlayer ? { name: currentPlayer.name, isReady: currentPlayer.isReady } : null,
        currentUser: currentUser ? { id: currentUser.id, username: currentUser.username } : null
    });
    
    // Активируем кнопку только если можно быть готовым
    readyButton.disabled = !canBeReady;
    
    // Обновляем текст кнопки в зависимости от состояния
    if (canBeReady) {
        if (isCurrentlyReady) {
            readyButton.innerHTML = '❌ Не готов';
            readyButton.className = 'btn btn-secondary btn-large';
        } else {
            readyButton.innerHTML = '✅ Готов к игре!';
            readyButton.className = 'btn btn-success btn-large';
        }
    } else {
        readyButton.innerHTML = '⏳ Выберите мечту и фишку';
        readyButton.className = 'btn btn-secondary btn-large';
    }
    
    const hint = document.querySelector('.ready-hint');
    if (hint) {
        if (canBeReady) {
            if (isCurrentlyReady) {
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
        if (!currentRoom || !currentUser || !selectedToken) return;
        
        const isDreamSelected = dreamData.id && dreamData.title;
        const isDreamComplete = isDreamSelected && dreamData.description && dreamData.cost > 0;
        if (!isDreamComplete) {
            showNotification('Сначала выберите и заполните данные о мечте', 'warning');
            return;
        }
        
        // Проверяем уникальность фишки
        const isTokenUnique = await checkTokenUniqueness(selectedToken);
        if (!isTokenUnique) {
            showNotification('Эта фишка уже выбрана другим игроком', 'error');
            return;
        }
        
        // Определяем текущее состояние игрока
        const currentPlayer = currentRoom.players.find(p => p.userId === currentUser.id || p.username === currentUser.username);
        const isCurrentlyReady = currentPlayer ? currentPlayer.isReady : false;
        const newReadyState = !isCurrentlyReady;
        
        // Формируем пакет игрока (PlayerBundle)
        const playerData = buildPlayerBundle({
            user: currentUser,
            dream: dreamData,
            token: selectedToken,
            isReady: newReadyState
        });

        const validation = validatePlayerBundle(playerData);
        if (!validation.isValid) {
            showNotification(validation.message || 'Проверьте данные игрока', 'error');
            return;
        }
        
        // Обновляем игрока в комнате
        await roomService.updatePlayerInRoom(currentRoom.id, playerData);
        
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
        await refreshRoomData();
        
        // Принудительно обновляем кнопку готовности
        updateReadyStatus();
        
    } catch (error) {
        console.error('❌ Room: Ошибка обновления статуса готовности:', error);
        showNotification('Ошибка обновления статуса', 'error');
    }
}

/**
 * Построение пакета данных игрока для сервера
 */
function buildPlayerBundle({ user, dream, token, isReady }) {
    return {
        userId: user?.id || user?.userId || null,
        username: user?.username || user?.name || '',
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
            await roomService.startGame(currentRoom.id, userId);
            
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
        if (!currentRoom || !currentUser) return true;
        
        // Проверяем, не выбрана ли эта фишка другими игроками
        // Используем username для поиска, как в updateTokensAvailability
        const isTokenTaken = currentRoom.players.some(player => {
            // Проверяем, что это не текущий пользователь
            const isNotCurrentUser = player.username !== currentUser.username && 
                                   player.name !== currentUser.username &&
                                   (currentUser.id ? player.userId !== currentUser.id : true);
            
            // И что фишка выбрана
            return isNotCurrentUser && player.token === tokenId;
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
    const isHost = currentRoom && currentRoom.creatorId === currentUser.id;
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
