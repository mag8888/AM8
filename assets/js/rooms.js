/**
 * Rooms Page Controller v1.0.1
 * Управление страницей выбора и создания комнат
 */

// Глобальные переменные
let roomService;
let router;
let selectedRoom = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Rooms: Инициализация страницы комнат');
    
    initializeServices();
    setupEventListeners();
    loadRooms();
    loadStats();
    displayUserInfo();
    
    // Запускаем периодическое обновление списка комнат
    startRoomsPolling();
});

/**
 * Запуск периодического обновления списка комнат
 */
function startRoomsPolling() {
    // Обновляем список комнат каждые 10 секунд (увеличено для уменьшения нагрузки)
    setInterval(async () => {
        try {
            await refreshRoomsList();
        } catch (error) {
            console.error('❌ Rooms: Ошибка периодического обновления:', error);
        }
    }, 10000);
    
    // Также обновляем при фокусе на окне (когда пользователь возвращается)
    window.addEventListener('focus', async () => {
        try {
            console.log('🔄 Rooms: Обновление при фокусе окна');
            await refreshRoomsList();
        } catch (error) {
            console.error('❌ Rooms: Ошибка обновления при фокусе:', error);
        }
    });
    
    // Обновляем при видимости страницы (когда пользователь переключается между вкладками)
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            try {
                console.log('🔄 Rooms: Обновление при возвращении на вкладку');
                await refreshRoomsList();
            } catch (error) {
                console.error('❌ Rooms: Ошибка обновления при видимости:', error);
            }
        }
    });
    
    console.log('🔄 Rooms: Запущено периодическое обновление списка комнат');
}

/**
 * Обновление списка комнат
 */
async function refreshRoomsList() {
    try {
        const rooms = await roomService.getAllRooms();
        
        // Получаем текущее состояние комнат
        const currentRoomsContainer = document.querySelector('.rooms-list');
        const currentRooms = Array.from(currentRoomsContainer?.querySelectorAll('.room-card') || []);
        const currentRoomsData = currentRooms.map(card => ({
            id: card.dataset.roomId,
            players: card.querySelector('.players-list')?.children.length || 0,
            status: card.querySelector('.room-status')?.textContent || 'Неизвестно'
        }));
        
        // Проверяем изменения
        const hasChanges = checkRoomsChanges(currentRoomsData, rooms);
        
        if (hasChanges.hasNewRooms || hasChanges.hasRemovedRooms || hasChanges.hasStatusChanges || hasChanges.hasPlayerChanges) {
            console.log('🔄 Rooms: Обнаружены изменения в списке комнат:', hasChanges);
            
            // Обновляем список комнат с анимацией для новых комнат
            renderRooms(rooms, hasChanges.hasNewRooms);
            
            // Обновляем счетчик комнат
            const roomsCount = document.getElementById('rooms-count');
            if (roomsCount) {
                roomsCount.textContent = `${rooms.length} комнат`;
            }
            
            // Обновляем статистику
            await loadStats();
            
            // Показываем уведомления
            if (hasChanges.hasNewRooms) {
                const newRoomsCount = rooms.length - currentRoomsData.length;
                showNotification(`Появилась${newRoomsCount > 1 ? 'сь новые комнаты' : ' новая комната'}! Всего комнат: ${rooms.length}`, 'success');
            }
            
            if (hasChanges.hasRemovedRooms) {
                showNotification('Некоторые комнаты были удалены', 'info');
            }
            
            if (hasChanges.hasStatusChanges) {
                console.log('🔄 Rooms: Изменился статус комнат');
            }
            
            if (hasChanges.hasPlayerChanges) {
                console.log('🔄 Rooms: Изменилось количество игроков в комнатах');
            }
        }
        
    } catch (error) {
        console.error('❌ Rooms: Ошибка обновления списка комнат:', error);
    }
}

/**
 * Проверка изменений в списке комнат
 */
function checkRoomsChanges(currentRooms, newRooms) {
    const changes = {
        hasNewRooms: false,
        hasRemovedRooms: false,
        hasStatusChanges: false,
        hasPlayerChanges: false
    };
    
    // Проверяем количество комнат
    if (newRooms.length > currentRooms.length) {
        changes.hasNewRooms = true;
    } else if (newRooms.length < currentRooms.length) {
        changes.hasRemovedRooms = true;
    }
    
    // Проверяем изменения в существующих комнатах
    currentRooms.forEach(currentRoom => {
        const newRoom = newRooms.find(room => room.id === currentRoom.id);
        if (newRoom) {
            // Проверяем изменения статуса
            const currentStatus = currentRoom.status;
            const newStatus = getRoomStatus(newRoom);
            if (currentStatus !== newStatus) {
                changes.hasStatusChanges = true;
            }
            
            // Проверяем изменения количества игроков
            const currentPlayerCount = currentRoom.players;
            const newPlayerCount = newRoom.playerCount || 0;
            if (currentPlayerCount !== newPlayerCount) {
                changes.hasPlayerChanges = true;
            }
        }
    });
    
    return changes;
}

/**
 * Инициализация сервисов
 */
function initializeServices() {
    try {
        // Инициализируем сервисы с правильными параметрами
        roomService = new RoomService(window.logger || null, window.errorHandler || null);
        // notificationService и userModel доступны глобально как window.notificationService и window.userModel
        
        // Получаем роутер из глобальной области
        if (window.router) {
            router = window.router;
        } else {
            console.warn('⚠️ Rooms: Роутер не найден, создаем локальный');
            router = new Router();
        }
        
        console.log('✅ Rooms: Сервисы инициализированы');
    } catch (error) {
        console.error('❌ Rooms: Ошибка инициализации сервисов:', error);
        showNotification('Ошибка инициализации страницы', 'error');
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Кнопки управления
    const refreshBtn = document.getElementById('refresh-rooms');
    const backBtn = document.getElementById('back-to-auth');
    const createRoomBtn = document.getElementById('create-room-btn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshRoomsWithAnimation);
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // На отдельной странице используем прямую навигацию
            window.location.href = '/auth';
        });
    }
    
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', showCreateRoomModal);
    }
    
    // Модальное окно создания комнаты
    const createModal = document.getElementById('create-room-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelCreateBtn = document.getElementById('cancel-create');
    const createRoomForm = document.getElementById('create-room-form');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideCreateRoomModal);
    }
    
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', hideCreateRoomModal);
    }
    
    if (createRoomForm) {
        createRoomForm.addEventListener('submit', handleCreateRoom);
    }
    
    // Модальное окно присоединения к комнате
    const joinModal = document.getElementById('join-room-modal');
    const closeJoinBtn = document.getElementById('close-join-modal');
    const cancelJoinBtn = document.getElementById('cancel-join');
    const joinRoomForm = document.getElementById('join-room-form');
    
    if (closeJoinBtn) {
        closeJoinBtn.addEventListener('click', hideJoinRoomModal);
    }
    
    if (cancelJoinBtn) {
        cancelJoinBtn.addEventListener('click', hideJoinRoomModal);
    }
    
    if (joinRoomForm) {
        joinRoomForm.addEventListener('submit', handleJoinRoom);
    }
    
    // Закрытие модальных окон по клику вне их
    if (createModal) {
        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) {
                hideCreateRoomModal();
            }
        });
    }
    
    if (joinModal) {
        joinModal.addEventListener('click', (e) => {
            if (e.target === joinModal) {
                hideJoinRoomModal();
            }
        });
    }
    
    console.log('✅ Rooms: Обработчики событий настроены');
}

/**
 * Загрузка списка комнат
 */
async function loadRooms() {
    try {
        showLoadingState();
        
        const rooms = await roomService.getAllRooms();
        renderRooms(rooms);
        
        // Обновляем счетчик комнат
        const roomsCount = document.getElementById('rooms-count');
        if (roomsCount) {
            roomsCount.textContent = `${rooms.length} комнат`;
        }
        
    } catch (error) {
        console.error('❌ Rooms: Ошибка загрузки комнат:', error);
        showErrorState('Ошибка загрузки комнат');
        showNotification('Не удалось загрузить список комнат', 'error');
    }
}

/**
 * Загрузка статистики
 */
async function loadStats() {
    try {
        const stats = await roomService.getStats();
        renderStats(stats);
    } catch (error) {
        console.error('❌ Rooms: Ошибка загрузки статистики:', error);
    }
}

/**
 * Отображение состояния загрузки
 */
function showLoadingState() {
    const roomsList = document.getElementById('rooms-list');
    if (roomsList) {
        roomsList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Загрузка комнат...</p>
            </div>
        `;
    }
}

/**
 * Отображение состояния ошибки
 */
function showErrorState(message) {
    const roomsList = document.getElementById('rooms-list');
    if (roomsList) {
        roomsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Произошла ошибка</h3>
                <p>${message}</p>
                <button class="btn btn-secondary btn-lg" onclick="loadRooms()">
                    🔄 Попробовать снова
                </button>
            </div>
        `;
    }
}

/**
 * Отображение пустого состояния
 */
function showEmptyState() {
    const roomsList = document.getElementById('rooms-list');
    if (roomsList) {
        roomsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏠</div>
                <h3>Нет доступных комнат</h3>
                <p>Создайте новую комнату или подождите, пока кто-то создаст комнату для игры.</p>
                <button class="btn btn-primary btn-lg" onclick="showCreateRoomModal()">
                    ➕ Создать комнату
                </button>
            </div>
        `;
    }
}

/**
 * Отрисовка списка комнат
 */
function renderRooms(rooms, animateNewRooms = false) {
    const roomsList = document.getElementById('rooms-list');
    if (!roomsList) {
        return;
    }
    
    if (!rooms || rooms.length === 0) {
        showEmptyState();
        return;
    }
    
    // Получаем текущие ID комнат для определения новых
    const currentRoomIds = Array.from(roomsList.querySelectorAll('.room-card'))
        .map(card => card.dataset.roomId);
    
    const roomsHTML = rooms.map(room => {
        const isNewRoom = animateNewRooms && !currentRoomIds.includes(room.id);
        return createRoomCard(room, isNewRoom);
    }).join('');
    
    roomsList.innerHTML = roomsHTML;
    
    // Добавляем анимации для новых комнат
    if (animateNewRooms) {
        const newRoomCards = roomsList.querySelectorAll('.room-card.new-room');
        newRoomCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.remove('new-room');
            }, 500 + (index * 100)); // Задержка для последовательной анимации
        });
    }
    
    console.log(`✅ Rooms: Отрисовано ${rooms.length} комнат`);
}

/**
 * Создание карточки комнаты
 */
function createRoomCard(room, isNewRoom = false) {
    const status = getRoomStatus(room);
    const statusClass = getRoomStatusClass(room);
    const animationClass = isNewRoom ? 'new-room' : '';
    
    return `
        <div class="room-card ${statusClass} ${animationClass}" data-room-id="${room.id}">
            <div class="room-header">
                <h3 class="room-name">${escapeHtml(room.name)}</h3>
                <span class="room-status ${status}">${getStatusText(status)}</span>
            </div>
            
            <div class="room-info">
                <div class="room-creator">👑 ${escapeHtml(room.creator || room.creatorName || 'Неизвестный хост')}</div>
                <div class="room-details">
                    <span class="room-detail players">${room.playerCount}/${room.maxPlayers}</span>
                    <span class="room-detail time">${room.turnTime}с</span>
                    ${room.assignProfessions ? '<span class="room-detail professions">Профессии</span>' : ''}
                </div>
            </div>
            
            ${room.players && room.players.length > 0 ? `
                <div class="room-players">
                    <div class="players-list">
                        ${room.players.map(player => `
                            <span class="player-tag ${player.isHost ? 'host' : ''}">
                                ${escapeHtml(player.name)}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="room-actions">
                ${createRoomActions(room)}
            </div>
        </div>
    `;
}

/**
 * Создание действий для комнаты
 */
function createRoomActions(room) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return '<button class="room-action view" disabled>Войдите в систему</button>';
    }
    
    const canJoin = roomService.canJoinRoom(currentUser.id, room);
    const canStart = roomService.canStartGame(currentUser.id, room);
    const isInRoom = roomService.getPlayer(currentUser.id, room) !== null;
    
    let actions = '';
    
    if (isInRoom) {
        if (canStart) {
            actions += `<button class="room-action join" onclick="startGame('${room.id}')">Начать игру</button>`;
        } else {
            actions += `<button class="room-action view" disabled>Вы в комнате</button>`;
        }
    } else if (canJoin) {
        actions += `<button class="room-action join" onclick="showJoinRoomModal('${room.id}')">Присоединиться</button>`;
    } else {
        actions += `<button class="room-action view" disabled>${getJoinDisabledReason(room)}</button>`;
    }
    
    actions += `<button class="room-action view" onclick="viewRoomDetails('${room.id}')">Подробнее</button>`;
    
    return actions;
}

/**
 * Получение статуса комнаты
 */
function getRoomStatus(room) {
    if (room.isStarted) {
        return 'started';
    } else if (room.isFull) {
        return 'full';
    } else if (room.canStart) {
        return 'ready';
    } else {
        return 'waiting';
    }
}

/**
 * Получение CSS класса статуса
 */
function getRoomStatusClass(room) {
    const status = getRoomStatus(room);
    const classes = [];
    
    if (status === 'started') {
        classes.push('started');
    } else if (status === 'ready') {
        classes.push('ready-to-start');
    } else if (status === 'full') {
        classes.push('full');
    }
    
    return classes.join(' ');
}

/**
 * Получение текста статуса
 */
function getStatusText(status) {
    const statusTexts = {
        'waiting': 'Ожидание',
        'ready': 'Готово',
        'started': 'Игра',
        'full': 'Заполнено'
    };
    
    return statusTexts[status] || 'Неизвестно';
}

/**
 * Получение причины недоступности присоединения
 */
function getJoinDisabledReason(room) {
    if (room.isFull) {
        return 'Комната заполнена';
    } else if (room.isStarted) {
        return 'Игра началась';
    } else {
        return 'Недоступно';
    }
}

/**
 * Отрисовка статистики
 */
function renderStats(stats) {
    const elements = {
        'total-rooms': stats.totalRooms || 0,
        'active-rooms': stats.activeRooms || 0,
        'started-games': stats.startedGames || 0,
        'total-players': stats.totalPlayers || 0
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

/**
 * Показать модальное окно создания комнаты
 */
function showCreateRoomModal() {
    const modal = document.getElementById('create-room-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Фокус на поле названия
        const nameInput = document.getElementById('room-name');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }
}

/**
 * Скрыть модальное окно создания комнаты
 */
function hideCreateRoomModal() {
    const modal = document.getElementById('create-room-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Очистка формы
        const form = document.getElementById('create-room-form');
        if (form) {
            form.reset();
            clearFormErrors();
        }
    }
}

/**
 * Показать модальное окно присоединения к комнате
 */
function showJoinRoomModal(roomId) {
    const room = roomService.getCachedRooms().find(r => r.id === roomId);
    if (!room) {
        showNotification('Комната не найдена', 'error');
        return;
    }
    
    selectedRoom = room;
    
    const modal = document.getElementById('join-room-modal');
    if (modal) {
        // Заполняем информацию о комнате
        const nameElement = document.getElementById('join-room-name');
        const playersElement = document.getElementById('join-room-players');
        const maxPlayersElement = document.getElementById('join-room-max-players');
        const timeElement = document.getElementById('join-room-turn-time');
        
        if (nameElement) nameElement.textContent = room.name;
        if (playersElement) playersElement.textContent = `Игроков: ${room.playerCount}`;
        if (maxPlayersElement) maxPlayersElement.textContent = `Максимум: ${room.maxPlayers}`;
        if (timeElement) timeElement.textContent = `Время хода: ${room.turnTime}с`;
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Заполняем поле имени данными пользователя и фокус
        const nameInput = document.getElementById('player-name');
        if (nameInput) {
            // Получаем данные пользователя из localStorage
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.username) {
                nameInput.value = currentUser.username;
                console.log('👤 Rooms: Заполнено имя пользователя:', currentUser.username);
            } else {
                console.log('⚠️ Rooms: Данные пользователя не найдены');
            }
            
            setTimeout(() => nameInput.focus(), 100);
        }
    }
}

/**
 * Скрыть модальное окно присоединения к комнате
 */
function hideJoinRoomModal() {
    const modal = document.getElementById('join-room-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Очистка формы
        const form = document.getElementById('join-room-form');
        if (form) {
            form.reset();
        }
        
        selectedRoom = null;
    }
}

/**
 * Обработка создания комнаты
 */
async function handleCreateRoom(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const roomData = {
        name: formData.get('name').trim(),
        maxPlayers: parseInt(formData.get('maxPlayers')),
        turnTime: parseInt(formData.get('turnTime')),
        assignProfessions: formData.get('assignProfessions') === 'on'
    };
    
    // Валидация
    if (!validateRoomData(roomData)) {
        return;
    }
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showNotification('Ошибка: пользователь не авторизован', 'error');
        return;
    }
    
    const creator = {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar
    };
    
    try {
        showButtonLoading('create-room-submit', true);
        
        const room = await roomService.createRoom(roomData, creator);
        
        hideCreateRoomModal();
        showNotification('Комната создана успешно!', 'success');
        
        // Перезагружаем список комнат
        await loadRooms();
        
        // Принудительно обновляем список комнат для других пользователей
        await forceRefreshRooms();
        
        // Отправляем уведомление другим игрокам о новой комнате (для будущего использования)
        // await sendRoomNotification('room_created', { roomId: room.id, roomName: room.name });
        
        // Переходим к игре
        setTimeout(() => {
            navigateToGame(room);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Rooms: Ошибка создания комнаты:', error);
        showNotification(error.message || 'Ошибка создания комнаты', 'error');
    } finally {
        showButtonLoading('create-room-submit', false);
    }
}

/**
 * Обработка присоединения к комнате
 */
async function handleJoinRoom(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const playerName = formData.get('name').trim();
    
    if (!playerName) {
        showNotification('Введите ваше имя', 'error');
        return;
    }
    
    if (!selectedRoom) {
        showNotification('Комната не выбрана', 'error');
        return;
    }
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showNotification('Ошибка: пользователь не авторизован', 'error');
        return;
    }
    
    const player = {
        userId: currentUser.id,
        name: playerName,
        username: currentUser.username,
        avatar: currentUser.avatar
    };
    
    try {
        showButtonLoading('join-room-submit', true);
        
        const room = await roomService.joinRoom(selectedRoom.id, player);
        
        hideJoinRoomModal();
        showNotification('Вы присоединились к комнате!', 'success');
        
        // Перезагружаем список комнат
        await loadRooms();
        
        // Принудительно обновляем список комнат для других пользователей
        await forceRefreshRooms();
        
        // Если игра может начаться и мы хост, предлагаем начать
        if (roomService.canStartGame(currentUser.id, room)) {
            setTimeout(() => {
                if (confirm('Хотите начать игру сейчас?')) {
                    startGame(room.id);
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Rooms: Ошибка присоединения к комнате:', error);
        showNotification(error.message || 'Ошибка присоединения к комнате', 'error');
    } finally {
        showButtonLoading('join-room-submit', false);
    }
}

/**
 * Запуск игры
 */
async function startGame(roomId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showNotification('Ошибка: пользователь не авторизован', 'error');
        return;
    }
    
    // Переходим на страницу комнаты для настройки перед началом игры
    window.location.href = `room.html?id=${roomId}`;
}

/**
 * Просмотр деталей комнаты
 */
function viewRoomDetails(roomId) {
    const room = roomService.getCachedRooms().find(r => r.id === roomId);
    if (!room) {
        showNotification('Комната не найдена', 'error');
        return;
    }
    
    // Переходим на страницу комнаты
    window.location.href = `room.html?id=${roomId}`;
}

/**
 * Переход к игре
 */
function navigateToGame(room) {
    console.log('🎮 Rooms: Переход к игре в комнате:', room.id);
    
    // Сохраняем текущую комнату
    roomService.setCurrentRoom(room);
    
    // Переходим на страницу конфигурации комнаты
    window.location.href = `room.html?id=${room.id}`;
}

/**
 * Валидация данных комнаты
 */
function validateRoomData(roomData) {
    let isValid = true;
    
    // Очищаем предыдущие ошибки
    clearFormErrors();
    
    if (!roomData.name || roomData.name.length < 3) {
        showFieldError('room-name-error', 'Название должно содержать минимум 3 символа');
        isValid = false;
    }
    
    if (roomData.name && roomData.name.length > 50) {
        showFieldError('room-name-error', 'Название не должно превышать 50 символов');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Показать ошибку поля
 */
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

/**
 * Очистить ошибки формы
 */
function clearFormErrors() {
    const errorElements = document.querySelectorAll('.field-error');
    errorElements.forEach(element => {
        element.textContent = '';
        element.classList.remove('show');
    });
}

/**
 * Показать состояние загрузки кнопки
 */
function showButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = 'Загрузка...';
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }
}

/**
 * Показать уведомление
 */
function showNotification(message, type = 'info') {
    if (window.notificationService) {
        window.notificationService.show(message, type);
    } else {
        // Fallback уведомление
        alert(message);
    }
}

/**
 * Получение текущего пользователя из localStorage
 */
function getCurrentUser() {
    try {
        // Поддерживаем оба формата хранения пользователя
        const raw = localStorage.getItem('currentUser') || localStorage.getItem('aura_money_user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        return user;
    } catch (error) {
        console.error('❌ Rooms: Ошибка получения пользователя:', error);
        return null;
    }
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Отображение информации о пользователе
 */
function displayUserInfo() {
    try {
        // Пытаемся получить информацию о пользователе из localStorage
        const storedUser = localStorage.getItem('currentUser') || localStorage.getItem('aura_money_user');
        const storedToken = localStorage.getItem('aura_money_token') || 'ok'; // для статического режима токен может отсутствовать
        
        if (storedUser && storedToken) {
            const user = JSON.parse(storedUser);
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');
            
            if (userAvatar && userName) {
                // Устанавливаем первую букву имени пользователя
                const username = user.username || user.name || user.email || 'User';
                const firstLetter = username.charAt(0).toUpperCase();
                userAvatar.textContent = firstLetter;
                
                // Устанавливаем имя пользователя
                userName.textContent = username || 'Пользователь';
                
                console.log('✅ Rooms: Информация о пользователе отображена:', user.username);
            }
            // Обновляем пользовательскую статистику в sidebar
            updateUserStatsInSidebar(user);
        } else {
            console.log('⚠️ Rooms: Пользователь не авторизован');
            // Можно добавить кнопку входа или перенаправление
        }
    } catch (error) {
        console.error('❌ Rooms: Ошибка отображения информации о пользователе:', error);
    }
}

/**
 * Обновление пользовательской статистики в sidebar
 */
function updateUserStatsInSidebar(user) {
    try {
        // Получаем статистику пользователя
        const stats = user.stats || {
            gamesPlayed: 0,
            wins: 0,
            level: 1,
            rating: 1200
        };
        
        // Обновляем элементы в sidebar
        const userGames = document.getElementById('user-games');
        const userWins = document.getElementById('user-wins');
        const userLevel = document.getElementById('user-level');
        const userRating = document.getElementById('user-rating');
        
        if (userGames) userGames.textContent = stats.gamesPlayed || 0;
        if (userWins) userWins.textContent = stats.wins || 0;
        if (userLevel) userLevel.textContent = stats.level || 1;
        if (userRating) userRating.textContent = stats.rating || 1200;
        
        console.log('✅ Rooms: Пользовательская статистика обновлена в sidebar:', stats);
    } catch (error) {
        console.error('❌ Rooms: Ошибка обновления пользовательской статистики:', error);
    }
}

/**
 * Принудительное обновление списка комнат
 */
async function forceRefreshRooms() {
    try {
        console.log('🔄 Rooms: Принудительное обновление списка комнат');
        
        // Очищаем кеш комнат в RoomService
        if (roomService && typeof roomService.clearCache === 'function') {
            roomService.clearCache();
        }
        
        // Загружаем свежие данные
        await refreshRoomsList();
        
        console.log('✅ Rooms: Принудительное обновление завершено');
    } catch (error) {
        console.error('❌ Rooms: Ошибка принудительного обновления:', error);
    }
}

/**
 * Обновить список комнат с анимацией
 */
async function refreshRoomsWithAnimation() {
    const roomsList = document.getElementById('rooms-list');
    if (!roomsList) return;
    
    // Добавляем класс анимации
    roomsList.classList.add('refreshing');
    
    try {
        await refreshRoomsList();
    } finally {
        // Убираем класс анимации через короткое время
        setTimeout(() => {
            roomsList.classList.remove('refreshing');
        }, 500);
    }
}

// Экспорт функций для глобального доступа
window.loadRooms = loadRooms;
window.showCreateRoomModal = showCreateRoomModal;
window.showJoinRoomModal = showJoinRoomModal;
window.startGame = startGame;
window.viewRoomDetails = viewRoomDetails;
window.displayUserInfo = displayUserInfo;
window.forceRefreshRooms = forceRefreshRooms;
window.refreshRoomsWithAnimation = refreshRoomsWithAnimation;
