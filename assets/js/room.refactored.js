/**
 * Room Page Controller v2.0.0 - Refactored
 * Управление страницей настройки комнаты
 * Использует централизованное управление состоянием и оптимизацию
 */

// Инициализация утилит
let roomLogger, performanceOptimizer, playerStateManager;

// Глобальные переменные (упрощенные)
let roomService;
let currentRoom = null;

// Конфигурация мечт
const DREAMS_CONFIG = [
    {
        id: 'dream_house',
        title: 'Купить дом мечты',
        description: 'Собственный дом с садом и бассейном',
        cost: 500000,
        icon: '🏠'
    },
    {
        id: 'dream_car',
        title: 'Купить автомобиль мечты',
        description: 'Спортивный автомобиль премиум-класса',
        cost: 150000,
        icon: '🚗'
    },
    {
        id: 'dream_travel',
        title: 'Путешествие по миру',
        description: 'Посетить 50 стран мира',
        cost: 100000,
        icon: '✈️'
    },
    {
        id: 'dream_business',
        title: 'Открыть свой бизнес',
        description: 'Создать успешную компанию',
        cost: 300000,
        icon: '💼'
    },
    {
        id: 'dream_education',
        title: 'Получить образование',
        description: 'Обучиться в лучшем университете мира',
        cost: 80000,
        icon: '🎓'
    },
    {
        id: 'antarctica_trip',
        title: 'Посетить Антарктиду',
        description: 'Увидеть самый загадочный континент планеты',
        cost: 150000,
        icon: '🧊'
    }
];

// Конфигурация токенов
const TOKENS_CONFIG = [
    { id: 'lion', name: 'Лев', icon: '🦁' },
    { id: 'eagle', name: 'Орел', icon: '🦅' },
    { id: 'fox', name: 'Лиса', icon: '🦊' },
    { id: 'bear', name: 'Медведь', icon: '🐻' },
    { id: 'tiger', name: 'Тигр', icon: '🐅' },
    { id: 'wolf', name: 'Волк', icon: '🐺' },
    { id: 'elephant', name: 'Слон', icon: '🐘' },
    { id: 'shark', name: 'Акула', icon: '🦈' },
    { id: 'owl', name: 'Сова', icon: '🦉' },
    { id: 'dolphin', name: 'Дельфин', icon: '🐬' }
];

/**
 * Инициализация страницы
 */
async function initializePage() {
    try {
        // Инициализируем утилиты
        initializeUtils();
        
        // Инициализируем сервисы
        await initializeServices();
        
        // Загружаем данные
        await loadRoomData();
        
        // Настраиваем UI
        setupUI();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        roomLogger.info('Страница комнаты инициализирована');
    } catch (error) {
        roomLogger.error('Ошибка инициализации страницы', error);
        showNotification('Ошибка загрузки страницы', 'error');
    }
}

/**
 * Инициализация утилит
 */
function initializeUtils() {
    roomLogger = window.roomLogger || new window.Logger({ prefix: 'Room', level: 'info' });
    performanceOptimizer = window.performanceOptimizer;
    playerStateManager = window.playerStateManager;
    
    if (!playerStateManager) {
        throw new Error('PlayerStateManager не инициализирован');
    }
}

/**
 * Инициализация сервисов
 */
async function initializeServices() {
    try {
        roomService = new RoomService(window.logger || null, window.errorHandler || null);
        window.roomService = roomService;
        roomLogger.info('Сервисы инициализированы');
    } catch (error) {
        roomLogger.error('Ошибка инициализации сервисов', error);
        throw error;
    }
}

/**
 * Загрузка данных комнаты
 */
async function loadRoomData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id');
        
        if (!roomId) {
            throw new Error('ID комнаты не указан');
        }
        
        roomLogger.info('Загрузка данных комнаты', { roomId });
        
        const room = await roomService.getRoomById(roomId);
        if (!room) {
            throw new Error('Комната не найдена');
        }
        
        currentRoom = room;
        playerStateManager.setCurrentRoom(room);
        
        // Загружаем информацию о пользователе
        displayUserInfo();
        
        // Загружаем мечты
        loadDreams();
        
        // Загружаем токены
        loadTokens();
        
        // Обновляем UI
        updateRoomUI();
        
        roomLogger.info('Данные комнаты загружены', { 
            roomName: room.name, 
            playersCount: room.players?.length || 0 
        });
        
    } catch (error) {
        roomLogger.error('Ошибка загрузки данных комнаты', error);
        throw error;
    }
}

/**
 * Отображение информации о пользователе
 */
function displayUserInfo() {
    const currentUser = playerStateManager.getCurrentUser();
    if (!currentUser) {
        roomLogger.warn('Пользователь не авторизован');
        showAuthRequired();
        return;
    }
    
    const userAvatar = document.getElementById('room-user-avatar');
    const userName = document.getElementById('room-user-name');
    
    if (userAvatar && userName) {
        const username = currentUser.username || currentUser.name || 'User';
        const firstLetter = username.charAt(0).toUpperCase();
        userAvatar.textContent = firstLetter;
        userName.textContent = username;
        
        roomLogger.info('Информация о пользователе отображена', { username });
    }
}

/**
 * Загрузка мечт
 */
function loadDreams() {
    const dreamsContainer = document.getElementById('dreams-container');
    if (!dreamsContainer) return;
    
    dreamsContainer.innerHTML = '';
    
    DREAMS_CONFIG.forEach(dream => {
        const dreamCard = createDreamCard(dream);
        dreamsContainer.appendChild(dreamCard);
    });
    
    roomLogger.info('Мечты загружены', { count: DREAMS_CONFIG.length });
}

/**
 * Создание карточки мечты
 */
function createDreamCard(dream) {
    const card = document.createElement('div');
    card.className = 'dream-card';
    card.dataset.dreamId = dream.id;
    
    card.innerHTML = `
        <div class="dream-icon">${dream.icon}</div>
        <div class="dream-content">
            <h4 class="dream-title">${dream.title}</h4>
            <p class="dream-description">${dream.description}</p>
            <div class="dream-cost">$${dream.cost.toLocaleString()}</div>
        </div>
    `;
    
    card.addEventListener('click', () => handleDreamSelection(dream));
    
    return card;
}

/**
 * Обработка выбора мечты
 */
function handleDreamSelection(dream) {
    try {
        // Убираем выделение с предыдущей мечты
        document.querySelectorAll('.dream-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем новую мечту
        const selectedCard = document.querySelector(`[data-dream-id="${dream.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Сохраняем данные мечты
        playerStateManager.setDreamData(dream);
        
        // Обновляем кнопку готовности
        updateReadyStatus();
        
        roomLogger.info('Мечта выбрана', { dreamId: dream.id, title: dream.title });
        
    } catch (error) {
        roomLogger.error('Ошибка выбора мечты', error);
        showNotification('Ошибка выбора мечты', 'error');
    }
}

/**
 * Загрузка токенов
 */
function loadTokens() {
    const tokensContainer = document.getElementById('tokens-container');
    if (!tokensContainer) return;
    
    tokensContainer.innerHTML = '';
    
    TOKENS_CONFIG.forEach(token => {
        const tokenCard = createTokenCard(token);
        tokensContainer.appendChild(tokenCard);
    });
    
    // Восстанавливаем выбранный токен
    const selectedToken = playerStateManager.getSelectedToken();
    if (selectedToken) {
        const tokenCard = document.querySelector(`[data-token-id="${selectedToken}"]`);
        if (tokenCard) {
            tokenCard.classList.add('selected');
        }
    }
    
    roomLogger.info('Токены загружены', { count: TOKENS_CONFIG.length });
}

/**
 * Создание карточки токена
 */
function createTokenCard(token) {
    const card = document.createElement('div');
    card.className = 'token-card';
    card.dataset.tokenId = token.id;
    
    card.innerHTML = `
        <div class="token-icon">${token.icon}</div>
        <div class="token-name">${token.name}</div>
    `;
    
    card.addEventListener('click', () => handleTokenSelection(token.id));
    
    return card;
}

/**
 * Обработка выбора токена
 */
async function handleTokenSelection(tokenId) {
    try {
        // Проверяем уникальность токена
        const isTokenUnique = await checkTokenUniqueness(tokenId);
        if (!isTokenUnique) {
            showNotification('Эта фишка уже выбрана другим игроком', 'error');
            return;
        }
        
        // Убираем выделение с предыдущего токена
        document.querySelectorAll('.token-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем новый токен
        const selectedCard = document.querySelector(`[data-token-id="${tokenId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Сохраняем выбранный токен
        playerStateManager.setSelectedToken(tokenId);
        
        // Обновляем игрока в комнате
        await updatePlayerInRoom();
        
        // Обновляем кнопку готовности
        updateReadyStatus();
        
        roomLogger.info('Токен выбран', { tokenId });
        
    } catch (error) {
        roomLogger.error('Ошибка выбора токена', error);
        showNotification('Ошибка выбора токена', 'error');
    }
}

/**
 * Проверка уникальности токена
 */
async function checkTokenUniqueness(tokenId) {
    try {
        const currentRoom = playerStateManager.getCurrentRoom();
        const currentUser = playerStateManager.getCurrentUser();
        
        if (!currentRoom || !currentUser) return true;
        
        const isTokenTaken = currentRoom.players.some(player => {
            const isNotCurrentUser = !playerStateManager.isCurrentUser(player);
            return isNotCurrentUser && player.token === tokenId;
        });
        
        return !isTokenTaken;
        
    } catch (error) {
        roomLogger.error('Ошибка проверки уникальности токена', error);
        return false;
    }
}

/**
 * Обновление игрока в комнате
 */
async function updatePlayerInRoom() {
    try {
        const currentRoom = playerStateManager.getCurrentRoom();
        if (!currentRoom) return;
        
        const playerData = playerStateManager.getPlayerBundle();
        await roomService.updatePlayerInRoom(currentRoom.id, playerData);
        
        roomLogger.info('Игрок обновлен в комнате', { playerData });
        
    } catch (error) {
        roomLogger.error('Ошибка обновления игрока в комнате', error);
        throw error;
    }
}

/**
 * Обновление статуса готовности
 */
function updateReadyStatus() {
    const readyButton = document.getElementById('ready-button');
    if (!readyButton) return;
    
    const isPlayerReady = playerStateManager.isPlayerReady();
    const currentPlayer = playerStateManager.getPlayerInRoom();
    const isCurrentlyReady = currentPlayer ? Boolean(currentPlayer.isReady) : false;
    
    // Активируем кнопку только если можно быть готовым
    readyButton.disabled = !isPlayerReady;
    
    // Обновляем текст и стиль кнопки
    if (isCurrentlyReady) {
        readyButton.innerHTML = '❌ Не готов';
        readyButton.className = 'btn btn-secondary btn-large';
    } else {
        readyButton.innerHTML = '✅ Готов к игре!';
        readyButton.className = 'btn btn-success btn-large';
    }
}

/**
 * Переключение статуса готовности
 */
async function toggleReadyStatus() {
    try {
        const currentUser = playerStateManager.getCurrentUser();
        const currentRoom = playerStateManager.getCurrentRoom();
        const selectedToken = playerStateManager.getSelectedToken();
        const dreamData = playerStateManager.getDreamData();
        
        if (!currentRoom || !currentUser || !selectedToken) {
            roomLogger.warn('Недостаточно данных для переключения готовности');
            return;
        }
        
        // Проверяем, что мечта заполнена полностью
        const isDreamComplete = dreamData.id && dreamData.title && dreamData.description && dreamData.cost > 0;
        if (!isDreamComplete) {
            showNotification('Сначала выберите и заполните данные о мечте', 'warning');
            return;
        }
        
        // Проверяем уникальность токена
        const isTokenUnique = await checkTokenUniqueness(selectedToken);
        if (!isTokenUnique) {
            showNotification('Эта фишка уже выбрана другим игроком', 'error');
            return;
        }
        
        // Определяем новое состояние готовности
        const currentPlayer = playerStateManager.getPlayerInRoom();
        const isCurrentlyReady = currentPlayer ? Boolean(currentPlayer.isReady) : false;
        const newReadyState = !isCurrentlyReady;
        
        // Обновляем данные игрока
        const playerData = playerStateManager.getPlayerBundle();
        playerData.isReady = newReadyState;
        
        // Валидируем пакет данных
        const validation = playerStateManager.validatePlayerBundle(playerData);
        if (!validation.isValid) {
            showNotification(validation.message || 'Проверьте данные игрока', 'error');
            return;
        }
        
        // Обновляем игрока в комнате
        await roomService.updatePlayerInRoom(currentRoom.id, playerData);
        
        // Показываем уведомление
        if (newReadyState) {
            showNotification('Вы готовы к игре!', 'success');
        } else {
            showNotification('Вы больше не готовы к игре', 'info');
        }
        
        // Обновляем информацию о комнате
        await refreshRoomData();
        
        // Обновляем кнопку готовности
        updateReadyStatus();
        
        roomLogger.info('Статус готовности переключен', { newReadyState });
        
    } catch (error) {
        roomLogger.error('Ошибка переключения статуса готовности', error);
        showNotification('Ошибка обновления статуса', 'error');
    }
}

/**
 * Обновление UI комнаты
 */
function updateRoomUI() {
    if (!currentRoom) return;
    
    // Обновляем информацию о комнате
    updateRoomInfo();
    
    // Обновляем список игроков
    updatePlayersList();
    
    // Обновляем кнопки управления
    updateControlButtons();
    
    // Обновляем статус готовности
    updateReadyStatus();
}

/**
 * Обновление информации о комнате
 */
function updateRoomInfo() {
    const roomNameElement = document.getElementById('room-name');
    const roomIdElement = document.getElementById('room-id');
    
    if (roomNameElement) {
        roomNameElement.textContent = currentRoom.name || 'Без названия';
    }
    
    if (roomIdElement) {
        roomIdElement.textContent = currentRoom.id || '';
    }
}

/**
 * Обновление списка игроков
 */
function updatePlayersList() {
    const playersContainer = document.getElementById('players-list');
    if (!playersContainer || !currentRoom.players) return;
    
    playersContainer.innerHTML = '';
    
    currentRoom.players.forEach(player => {
        const playerElement = createPlayerElement(player);
        playersContainer.appendChild(playerElement);
    });
}

/**
 * Создание элемента игрока
 */
function createPlayerElement(player) {
    const element = document.createElement('div');
    element.className = 'player-item';
    
    const isCurrentUser = playerStateManager.isCurrentUser(player);
    const status = player.isReady ? 'Готов' : 'Готовится';
    
    element.innerHTML = `
        <div class="player-avatar">${player.avatar || player.name?.charAt(0) || 'U'}</div>
        <div class="player-info">
            <div class="player-name">${player.name || player.username || 'Неизвестный игрок'}</div>
            <div class="player-status">${status}</div>
        </div>
        ${isCurrentUser ? '<div class="current-user-badge">Вы</div>' : ''}
    `;
    
    return element;
}

/**
 * Обновление кнопок управления
 */
function updateControlButtons() {
    const startButton = document.getElementById('start-game-button');
    if (!startButton) return;
    
    const currentUser = playerStateManager.getCurrentUser();
    const isHost = currentRoom.creatorId === currentUser?.id || 
                   currentRoom.creator === currentUser?.username;
    
    const readyPlayers = currentRoom.players?.filter(p => p.isReady).length || 0;
    const totalPlayers = currentRoom.players?.length || 0;
    const allPlayersReady = readyPlayers >= 1 && readyPlayers === totalPlayers;
    
    startButton.disabled = !isHost || !allPlayersReady;
    
    if (allPlayersReady) {
        startButton.textContent = '🎮 Начать игру';
        startButton.className = 'btn btn-success btn-large';
    } else {
        startButton.textContent = `⏳ Ожидание готовности (${readyPlayers}/${totalPlayers})`;
        startButton.className = 'btn btn-secondary btn-large';
    }
}

/**
 * Обновление данных комнаты
 */
async function refreshRoomData() {
    try {
        if (!currentRoom) return;
        
        const room = await roomService.getRoomById(currentRoom.id);
        if (room) {
            currentRoom = room;
            playerStateManager.setCurrentRoom(room);
            updateRoomUI();
        }
        
    } catch (error) {
        roomLogger.error('Ошибка обновления данных комнаты', error);
    }
}

/**
 * Настройка UI
 */
function setupUI() {
    // Настраиваем периодическое обновление
    setInterval(refreshRoomData, 5000);
    
    // Восстанавливаем выбранную мечту
    const dreamData = playerStateManager.getDreamData();
    if (dreamData.id) {
        const dreamCard = document.querySelector(`[data-dream-id="${dreamData.id}"]`);
        if (dreamCard) {
            dreamCard.classList.add('selected');
        }
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Кнопка готовности
    const readyButton = document.getElementById('ready-button');
    if (readyButton) {
        readyButton.addEventListener('click', toggleReadyStatus);
    }
    
    // Кнопка начала игры
    const startButton = document.getElementById('start-game-button');
    if (startButton) {
        startButton.addEventListener('click', confirmStartGame);
    }
    
    // Обработчики для быстрых кнопок
    const quickCreateBtn = document.getElementById('quick-create-room');
    const quickRefreshBtn = document.getElementById('quick-refresh');
    
    if (quickCreateBtn) {
        quickCreateBtn.addEventListener('click', showCreateRoomModal);
    }
    
    if (quickRefreshBtn) {
        quickRefreshBtn.addEventListener('click', refreshRoomsWithAnimation);
    }
}

/**
 * Подтверждение начала игры
 */
async function confirmStartGame() {
    try {
        const currentUser = playerStateManager.getCurrentUser();
        const currentRoom = playerStateManager.getCurrentRoom();
        
        if (!currentRoom || !currentUser) {
            showNotification('Ошибка: пользователь или комната не найдены', 'error');
            return;
        }
        
        const userId = playerStateManager.getCurrentUserId();
        if (!userId) {
            throw new Error('Не удалось определить ID пользователя для запуска игры');
        }
        
        // Запускаем игру
        const startResult = await roomService.startGame(currentRoom.id, userId);
        
        if (!startResult.success) {
            throw new Error(startResult.message || 'Ошибка запуска игры');
        }
        
        showNotification('Игра начата! Переходим к игровому полю...', 'success');
        
        // Переходим к игровой доске
        setTimeout(() => {
            navigateToGameBoard(currentRoom.id);
        }, 2000);
        
    } catch (error) {
        if (error.message && error.message.includes('уже запущена')) {
            showNotification('Игра уже запущена! Переходим к игровому полю...', 'info');
            setTimeout(() => {
                navigateToGameBoard(currentRoom.id);
            }, 2000);
        } else if (error.message && error.message.includes('Application failed to respond')) {
            showNotification('Сервер не отвечает, но игра может быть запущена. Переходим к игровому полю...', 'warning');
            setTimeout(() => {
                navigateToGameBoard(currentRoom.id);
            }, 2000);
        } else {
            roomLogger.error('Ошибка начала игры', error);
            showNotification('Ошибка начала игры', 'error');
        }
    }
}

/**
 * Переход к игровому полю
 */
function navigateToGameBoard(roomId) {
    try {
        const currentUser = playerStateManager.getCurrentUser();
        const dreamData = playerStateManager.getDreamData();
        const selectedToken = playerStateManager.getSelectedToken();
        
        // Формируем пакет данных
        const bundle = {
            roomId,
            currentUser: {
                ...currentUser,
                roomId: roomId,
                fromRoom: true
            },
            dreamData,
            selectedToken,
            players: currentRoom?.players || []
        };
        
        // Сохраняем в sessionStorage
        sessionStorage.setItem('am_player_bundle', JSON.stringify(bundle));
        
        // Переходим к игровому полю
        window.location.href = `../index.html#game?roomId=${roomId}`;
        
        roomLogger.info('Переход к игровому полю', { roomId });
        
    } catch (error) {
        roomLogger.error('Ошибка перехода к игровому полю', error);
        showNotification('Ошибка перехода к игре', 'error');
    }
}

/**
 * Показать уведомление
 */
function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Показать требование авторизации
 */
function showAuthRequired() {
    showNotification('Требуется авторизация', 'warning');
    // Можно добавить редирект на страницу авторизации
}

/**
 * Показать модальное окно создания комнаты
 */
function showCreateRoomModal() {
    // Реализация модального окна
    console.log('Показать модальное окно создания комнаты');
}

/**
 * Обновить список комнат с анимацией
 */
function refreshRoomsWithAnimation() {
    // Реализация обновления с анимацией
    console.log('Обновить список комнат с анимацией');
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', initializePage);

// Экспорт функций для глобального доступа
window.toggleReadyStatus = toggleReadyStatus;
window.confirmStartGame = confirmStartGame;
window.navigateToGameBoard = navigateToGameBoard;
