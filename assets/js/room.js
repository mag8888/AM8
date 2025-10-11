/**
 * Room Page Controller v1.0.0
 * Управление страницей настройки комнаты
 */

// Глобальные переменные
let roomService;
let notificationService;
let currentRoom = null;
let currentUser = null;
let selectedToken = null;
let dreamData = {
    title: '',
    description: '',
    cost: 0
};

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
    loadTokens();
});

/**
 * Инициализация сервисов
 */
function initializeServices() {
    try {
        // Инициализируем сервисы
        roomService = new RoomService();
        notificationService = window.notificationService;
        
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
    
    // Поля формы мечты
    const dreamTitle = document.getElementById('dream-title');
    const dreamDescription = document.getElementById('dream-description');
    const dreamCost = document.getElementById('dream-cost');
    
    if (dreamTitle) {
        dreamTitle.addEventListener('input', updateDreamData);
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
            showNotification('Комната не найдена', 'error');
            setTimeout(() => {
                window.location.href = 'rooms.html';
            }, 2000);
            return;
        }
        
        currentRoom = room;
        updateRoomInfo();
        
        // Присоединяемся к комнате если еще не присоединены
        await joinRoomIfNeeded();
        
    } catch (error) {
        console.error('❌ Room: Ошибка загрузки данных комнаты:', error);
        showNotification('Ошибка загрузки данных комнаты', 'error');
    }
}

/**
 * Присоединение к комнате если необходимо
 */
async function joinRoomIfNeeded() {
    try {
        if (!currentRoom || !currentUser) return;
        
        // Проверяем, есть ли пользователь в комнате
        const isInRoom = currentRoom.players.some(player => player.userId === currentUser.id);
        
        if (!isInRoom) {
            console.log('🏠 Room: Присоединение к комнате');
            
            const playerData = {
                userId: currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar || '',
                isReady: false,
                dream: null,
                token: null
            };
            
            await roomService.joinRoom(currentRoom.id, playerData);
            showNotification('Вы присоединились к комнате', 'success');
        }
    } catch (error) {
        console.error('❌ Room: Ошибка присоединения к комнате:', error);
        showNotification('Ошибка присоединения к комнате', 'error');
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
    if (roomCreator) roomCreator.textContent = currentRoom.creatorName;
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
        
        const avatar = player.avatar || player.username.charAt(0).toUpperCase();
        const status = player.isReady ? 'Готов' : 'Готовится';
        
        playerItem.innerHTML = `
            <div class="player-avatar">${avatar}</div>
            <div class="player-info">
                <div class="player-name">${player.username}</div>
                <div class="player-status">${status}</div>
            </div>
        `;
        
        playersList.appendChild(playerItem);
    });
}

/**
 * Обновление кнопки "Начать игру"
 */
function updateStartGameButton() {
    const startGameButton = document.getElementById('start-game');
    if (!startGameButton || !currentRoom || !currentUser) return;
    
    const isHost = currentRoom.creatorId === currentUser.id;
    const canStart = currentRoom.players.length >= currentRoom.minPlayers && 
                     currentRoom.players.every(player => player.isReady);
    
    startGameButton.disabled = !isHost || !canStart || currentRoom.isStarted;
    
    if (currentRoom.isStarted) {
        startGameButton.textContent = '🎮 Игра начата';
    } else if (!isHost) {
        startGameButton.textContent = '⏳ Ожидание хоста';
    } else if (!canStart) {
        startGameButton.textContent = '👥 Ждем игроков';
    } else {
        startGameButton.textContent = '🚀 Начать игру';
    }
}

/**
 * Отображение информации о пользователе
 */
function displayUserInfo() {
    try {
        // Получаем текущего пользователя из localStorage
        const storedUser = localStorage.getItem('aura_money_user');
        const storedToken = localStorage.getItem('aura_money_token');
        
        if (storedUser && storedToken) {
            currentUser = JSON.parse(storedUser);
            
            const userAvatar = document.getElementById('room-user-avatar');
            const userName = document.getElementById('room-user-name');
            
            if (userAvatar && userName) {
                // Устанавливаем первую букву имени пользователя
                const firstLetter = currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'U';
                userAvatar.textContent = firstLetter;
                
                // Устанавливаем имя пользователя
                userName.textContent = currentUser.username || 'Пользователь';
                
                console.log('✅ Room: Информация о пользователе отображена:', currentUser.username);
            }
        } else {
            console.log('⚠️ Room: Пользователь не авторизован');
            // Перенаправляем на авторизацию
            setTimeout(() => {
                window.location.href = '../auth/';
            }, 2000);
        }
    } catch (error) {
        console.error('❌ Room: Ошибка отображения информации о пользователе:', error);
    }
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
            <div class="token-name">${token.name}</div>
            <div class="token-description">${token.description}</div>
        `;
        
        tokenCard.addEventListener('click', () => selectToken(token.id));
        tokensGrid.appendChild(tokenCard);
    });
    
    console.log('✅ Room: Фишки загружены');
}

/**
 * Выбор фишки
 */
function selectToken(tokenId) {
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
        
        console.log('✅ Room: Фишка выбрана:', tokenId);
        
        // Обновляем статус готовности
        updateReadyStatus();
    }
}

/**
 * Обновление данных мечты
 */
function updateDreamData() {
    const title = document.getElementById('dream-title').value.trim();
    const description = document.getElementById('dream-description').value.trim();
    const cost = parseInt(document.getElementById('dream-cost').value) || 0;
    
    dreamData = { title, description, cost };
    
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
    
    const isDreamComplete = dreamData.title && dreamData.description && dreamData.cost > 0;
    const isTokenSelected = selectedToken !== null;
    const isReady = isDreamComplete && isTokenSelected;
    
    readyButton.disabled = !isReady;
    
    const hint = document.querySelector('.ready-hint');
    if (hint) {
        if (isReady) {
            hint.textContent = 'Вы готовы к игре!';
            hint.style.color = '#10b981';
        } else {
            const missing = [];
            if (!isDreamComplete) missing.push('мечту');
            if (!isTokenSelected) missing.push('фишку');
            hint.textContent = `Заполните: ${missing.join(' и ')}`;
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
        
        const isDreamComplete = dreamData.title && dreamData.description && dreamData.cost > 0;
        if (!isDreamComplete) {
            showNotification('Сначала заполните данные о мечте', 'warning');
            return;
        }
        
        // Отправляем данные игрока
        const playerData = {
            userId: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar || '',
            isReady: true,
            dream: dreamData,
            token: selectedToken
        };
        
        // Обновляем игрока в комнате
        await roomService.updatePlayerInRoom(currentRoom.id, playerData);
        
        showNotification('Статус готовности обновлен', 'success');
        
        // Обновляем информацию о комнате
        await refreshRoomData();
        
    } catch (error) {
        console.error('❌ Room: Ошибка обновления статуса готовности:', error);
        showNotification('Ошибка обновления статуса', 'error');
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
            updateRoomInfo();
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
        
        await roomService.startGame(currentRoom.id, currentUser.id);
        
        showNotification('Игра начата!', 'success');
        
        // Переходим к игровой доске
        setTimeout(() => {
            window.location.href = '../';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Room: Ошибка начала игры:', error);
        showNotification('Ошибка начала игры', 'error');
        hideStartGameModal();
    }
}

/**
 * Показать уведомление
 */
function showNotification(message, type = 'info') {
    if (notificationService) {
        notificationService.show(message, type);
    } else {
        // Fallback уведомление
        alert(message);
    }
}

// Экспорт функций для глобального доступа
window.loadRoomData = loadRoomData;
window.displayUserInfo = displayUserInfo;
window.selectToken = selectToken;
window.toggleReadyStatus = toggleReadyStatus;
