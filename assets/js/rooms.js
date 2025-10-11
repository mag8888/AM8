/**
 * Rooms Page Controller v1.0.0
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
});

/**
 * Инициализация сервисов
 */
function initializeServices() {
    try {
        // Инициализируем сервисы
        roomService = new RoomService();
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
        refreshBtn.addEventListener('click', loadRooms);
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (router) {
                router.navigate('/auth');
            } else {
                window.location.href = '/auth';
            }
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
                <h3>❌ Ошибка</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadRooms()">Попробовать снова</button>
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
                <h3>🏠 Нет доступных комнат</h3>
                <p>Создайте новую комнату или подождите, пока кто-то создаст комнату для игры.</p>
                <button class="btn btn-primary" onclick="showCreateRoomModal()">Создать комнату</button>
            </div>
        `;
    }
}

/**
 * Отрисовка списка комнат
 */
function renderRooms(rooms) {
    const roomsList = document.getElementById('rooms-list');
    if (!roomsList) {
        return;
    }
    
    if (!rooms || rooms.length === 0) {
        showEmptyState();
        return;
    }
    
    const roomsHTML = rooms.map(room => createRoomCard(room)).join('');
    roomsList.innerHTML = roomsHTML;
    
    console.log(`✅ Rooms: Отрисовано ${rooms.length} комнат`);
}

/**
 * Создание карточки комнаты
 */
function createRoomCard(room) {
    const status = getRoomStatus(room);
    const statusClass = getRoomStatusClass(room);
    
    return `
        <div class="room-card ${statusClass}" data-room-id="${room.id}">
            <div class="room-header">
                <h3 class="room-name">${escapeHtml(room.name)}</h3>
                <span class="room-status ${status}">${getStatusText(status)}</span>
            </div>
            
            <div class="room-info">
                <div class="room-creator">${escapeHtml(room.creatorName)}</div>
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
        
        // Фокус на поле имени
        const nameInput = document.getElementById('player-name');
        if (nameInput) {
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
    
    try {
        const room = await roomService.startGame(roomId, currentUser.id);
        
        showNotification('Игра запущена!', 'success');
        
        // Переходим к игре
        setTimeout(() => {
            navigateToGame(room);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Rooms: Ошибка запуска игры:', error);
        showNotification(error.message || 'Ошибка запуска игры', 'error');
    }
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
    
    // Показываем информацию о комнате
    const details = `
Комната: ${room.name}
Создатель: ${room.creatorName}
Игроков: ${room.playerCount}/${room.maxPlayers}
Время хода: ${room.turnTime} секунд
Статус: ${getStatusText(getRoomStatus(room))}
${room.assignProfessions ? 'Профессии назначаются автоматически' : 'Профессии выбираются вручную'}
    `.trim();
    
    alert(details);
}

/**
 * Переход к игре
 */
function navigateToGame(room) {
    console.log('🎮 Rooms: Переход к игре в комнате:', room.id);
    
    // Сохраняем текущую комнату
    roomService.setCurrentRoom(room);
    
    // Переходим на страницу игры
    if (router) {
        router.navigate('/game', { roomId: room.id });
    } else {
        window.location.href = '/';
    }
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
        const storedUser = localStorage.getItem('aura_money_user');
        if (!storedUser) {
            return null;
        }
        return JSON.parse(storedUser);
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
        const storedUser = localStorage.getItem('aura_money_user');
        const storedToken = localStorage.getItem('aura_money_token');
        
        if (storedUser && storedToken) {
            const user = JSON.parse(storedUser);
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');
            
            if (userAvatar && userName) {
                // Устанавливаем первую букву имени пользователя
                const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : 'U';
                userAvatar.textContent = firstLetter;
                
                // Устанавливаем имя пользователя
                userName.textContent = user.username || 'Пользователь';
                
                console.log('✅ Rooms: Информация о пользователе отображена:', user.username);
            }
        } else {
            console.log('⚠️ Rooms: Пользователь не авторизован');
            // Можно добавить кнопку входа или перенаправление
        }
    } catch (error) {
        console.error('❌ Rooms: Ошибка отображения информации о пользователе:', error);
    }
}

// Экспорт функций для глобального доступа
window.loadRooms = loadRooms;
window.showCreateRoomModal = showCreateRoomModal;
window.showJoinRoomModal = showJoinRoomModal;
window.startGame = startGame;
window.viewRoomDetails = viewRoomDetails;
window.displayUserInfo = displayUserInfo;
