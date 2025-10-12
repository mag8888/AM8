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
});

/**
 * Инициализация сервисов
 */
function initializeServices() {
    try {
        // Инициализируем сервисы
        roomService = new RoomService();
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
        
        // Обновляем кнопку старт после загрузки данных
        updateStartGameButton();
        
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
    if (!startGameButton) return;
    
    // Если нет данных о комнате или пользователе, показываем кнопку как неактивную
    if (!currentRoom || !currentUser) {
        startGameButton.disabled = true;
        startGameButton.textContent = '🚀 Начать игру';
        return;
    }
    
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
                    <button class="btn btn-primary" onclick="window.location.href='../auth/'">
                        Войти в систему
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.href='rooms.html'">
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
            
            console.log('✅ Room: Фишка выбрана:', tokenId);
            
            // Отправляем уведомление другим игрокам о выборе фишки
            await sendPushNotification('token_selected', {
                playerName: currentUser.username,
                tokenId: tokenId,
                tokenName: selectedCard.textContent.trim(),
                roomId: currentRoom.id
            });
            
            // Обновляем статус готовности
            updateReadyStatus();
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
    const isReady = isDreamComplete && isTokenSelected;
    
    readyButton.disabled = !isReady;
    
    const hint = document.querySelector('.ready-hint');
    if (hint) {
        if (isReady) {
            hint.textContent = 'Вы готовы к игре!';
            hint.style.color = '#10b981';
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
        
        // Отправляем push-уведомление хосту о готовности игрока
        await sendPushNotification('player_ready', {
            playerName: currentUser.username,
            roomId: currentRoom.id,
            readyPlayersCount: currentRoom.players.filter(p => p.isReady).length + 1,
            totalPlayersCount: currentRoom.players.length
        });
        
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
            updatePlayersList();
            updateStartGameButton();
            updateTokensAvailability(); // Обновляем доступность фишек
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
            // Переходим на главную страницу с данными о комнате
            const roomId = currentRoom.id;
            window.location.href = `../index.html#game?roomId=${roomId}`;
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
/**
 * Проверка уникальности фишки
 */
async function checkTokenUniqueness(tokenId) {
    try {
        if (!currentRoom || !currentUser) return true;
        
        // Проверяем, не выбрана ли эта фишка другими игроками
        const isTokenTaken = currentRoom.players.some(player => 
            player.userId !== currentUser.id && player.token === tokenId
        );
        
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
        
        // Создаем уведомление для хоста
        const hostId = currentRoom.creatorId;
        if (hostId === currentUser.id) return; // Не отправляем себе
        
        const notification = {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            from: currentUser.id,
            to: hostId
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
 * Обновление доступности фишек
 */
function updateTokensAvailability() {
    if (!currentRoom || !currentRoom.players) return;
    
    const takenTokens = currentRoom.players
        .filter(player => player.userId !== currentUser.id && player.token)
        .map(player => player.token);
    
    // Обновляем визуальное состояние фишек
    const tokenCards = document.querySelectorAll('.token-card');
    tokenCards.forEach(card => {
        const tokenId = card.dataset.tokenId;
        const isTaken = takenTokens.includes(tokenId);
        
        if (isTaken) {
            card.classList.add('taken');
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        } else {
            card.classList.remove('taken');
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        }
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

// Экспорт функций для глобального доступа
window.loadRoomData = loadRoomData;
window.displayUserInfo = displayUserInfo;
window.selectToken = selectToken;
window.toggleReadyStatus = toggleReadyStatus;
