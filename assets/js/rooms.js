/**
 * Rooms Page Controller v1.0.1
 * Управление страницей выбора и создания комнат
 */

// Глобальные переменные
let roomService;
let router;
let selectedRoom = null;

// Флаги для предотвращения множественных одновременных запросов
let isLoadingRooms = false;
let isLoadingStats = false;
let lastRoomsRequest = 0;
let lastStatsRequest = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 секунд минимум между запросами

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Rooms: Инициализация страницы комнат');
    
    // Очищаем localStorage от старых данных комнат
    if (localStorage.getItem('aura_money_dynamic_rooms')) {
        console.log('🧹 Очищаем localStorage от старых данных комнат');
        localStorage.removeItem('aura_money_dynamic_rooms');
    }
    
    initializeServices();
    setupEventListeners();
    loadRooms();
    loadStats();
    updateUserInfo();
    
    // Запускаем периодическое обновление списка комнат
    startRoomsPolling();
});

/**
 * Запуск периодического обновления списка комнат
 */
function startRoomsPolling() {
    let lastRefreshAttempt = 0;
    const minRefreshInterval = 10000; // Уменьшаем до 10 секунд для быстрого отклика
    
    // Обновляем список комнат каждые 120 секунд для полного избежания rate limiting
    setInterval(async () => {
        const now = Date.now();
        if (now - lastRefreshAttempt < minRefreshInterval) {
            console.log('⏳ Rooms: Пропускаем обновление - слишком часто');
            return;
        }
        
        try {
            lastRefreshAttempt = now;
            await refreshRoomsList();
        } catch (error) {
            console.error('❌ Rooms: Ошибка периодического обновления:', error);
            handleRefreshError(error);
        }
    }, 45000); // Уменьшаем интервал до 45 секунд для быстрого отклика
    
    // Также обновляем при фокусе на окне (когда пользователь возвращается)
    window.addEventListener('focus', async () => {
        const now = Date.now();
        if (now - lastRefreshAttempt < minRefreshInterval) {
            console.log('⏳ Rooms: Пропускаем обновление при фокусе - слишком часто');
            return;
        }
        
        try {
            console.log('🔄 Rooms: Обновление при фокусе окна');
            lastRefreshAttempt = now;
            await refreshRoomsList();
        } catch (error) {
            console.error('❌ Rooms: Ошибка обновления при фокусе:', error);
            handleRefreshError(error);
        }
    });
    
    // Обновляем при видимости страницы (когда пользователь переключается между вкладками)
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            const now = Date.now();
            if (now - lastRefreshAttempt < minRefreshInterval) {
                console.log('⏳ Rooms: Пропускаем обновление при видимости - слишком часто');
                return;
            }
            
            try {
                console.log('🔄 Rooms: Обновление при возвращении на вкладку');
                lastRefreshAttempt = now;
                await refreshRoomsList();
            } catch (error) {
                console.error('❌ Rooms: Ошибка обновления при видимости:', error);
                handleRefreshError(error);
            }
        }
    });
    
    console.log('🔄 Rooms: Запущено периодическое обновление списка комнат');
}

/**
 * Обработка ошибок обновления с акцентом на 429 (Rate Limited)
 */
function handleRefreshError(error) {
    if (error.message && error.message.includes('429')) {
        console.warn('⏳ Rooms: Rate limited - слишком много запросов. Используем кэшированные данные.');
        
        // Показываем предупреждение пользователю только один раз
        if (!window.rateLimitWarningShown) {
            showNotification('Сервер временно перегружен. Данные могут быть устаревшими.', 'warning');
            window.rateLimitWarningShown = true;
            
            // Сбрасываем предупреждение через 30 секунд
            setTimeout(() => {
                window.rateLimitWarningShown = false;
            }, 30000);
        }
    } else if (error.message && error.message.includes('Rate limited')) {
        console.warn('⏳ Rooms: Rate limited с backoff. Ждем...');
    }
}

/**
 * Обновление списка комнат
 */
async function refreshRoomsList() {
    // Предотвращаем множественные одновременные запросы
    const now = Date.now();
    if (isLoadingRooms || (now - lastRoomsRequest < MIN_REQUEST_INTERVAL)) {
        console.log('⏳ Rooms: Пропускаем обновление - запрос уже выполняется или слишком часто');
        return;
    }
    
    isLoadingRooms = true;
    lastRoomsRequest = now;
    
    try {
        console.log('🔄 Rooms: Начинаем обновление списка комнат');
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
            
            // Обновляем статистику только при значительных изменениях
            // чтобы не создавать лишнюю нагрузку на сервер
            if (hasChanges.hasNewRooms || hasChanges.hasRemovedRooms) {
                try {
                    await loadStats();
                } catch (statsError) {
                    console.warn('⚠️ Rooms: Ошибка обновления статистики:', statsError);
                    // Игнорируем ошибки статистики при обновлении списка комнат
                }
            }
            
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
        
        // При ошибке 429 не обновляем UI, просто логируем
        if (error.message && (error.message.includes('429') || error.message.includes('Rate limited'))) {
            console.warn('⏳ Rooms: Обновление пропущено из-за rate limiting');
            // Не показываем ошибку пользователю при периодическом обновлении
        }
    } finally {
        // Всегда сбрасываем флаг загрузки
        isLoadingRooms = false;
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
        } else if (window.Router) {
            console.log('✅ Rooms: Используем глобальный класс Router');
            router = new window.Router();
        } else {
            console.warn('⚠️ Rooms: Класс Router не найден, создаем пустой объект');
            router = { navigate: () => {}, route: () => {} }; // Fallback
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
    const quickCreateBtn = document.getElementById('quick-create-room');
    const quickRefreshBtn = document.getElementById('quick-refresh');
    const logoutBtn = document.getElementById('logout-btn');
    
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
    
    if (quickCreateBtn) {
        quickCreateBtn.addEventListener('click', showCreateRoomModal);
        console.log('✅ Обработчик для quick-create-room добавлен');
    } else {
        console.warn('⚠️ Кнопка quick-create-room не найдена');
    }
    
    if (quickRefreshBtn) {
        quickRefreshBtn.addEventListener('click', refreshRoomsWithAnimation);
        console.log('✅ Обработчик для quick-refresh добавлен');
    } else {
        console.warn('⚠️ Кнопка quick-refresh не найдена');
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
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
    
    // Обработчики для динамически создаваемых кнопок
    setupDynamicEventListeners();
    
    console.log('✅ Rooms: Обработчики событий настроены');
}

/**
 * Настройка обработчиков для динамически создаваемых элементов
 */
function setupDynamicEventListeners() {
    // Используем делегирование событий для динамических кнопок
    const roomsList = document.getElementById('rooms-list');
    if (roomsList) {
        roomsList.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;
            
            const action = button.dataset.action;
            const roomId = button.dataset.roomId;
            
            switch (action) {
                case 'start-game':
                    startGame(roomId);
                    break;
                case 'join-room':
                    // Быстрое присоединение: сразу в комнату для выбора мечты и фишки
                    if (typeof window.quickJoinRoom === 'function') {
                        window.quickJoinRoom(roomId);
                    } else {
                        console.error('❌ quickJoinRoom is not defined on window');
                    }
                    break;
                case 'view-details':
                    viewRoomDetails(roomId);
                    break;
            }
        });
    }
    
    // Обработчики для кнопок в empty state
    document.addEventListener('click', (e) => {
        if (e.target.id === 'retry-load-rooms') {
            loadRooms();
        } else if (e.target.id === 'create-room-from-empty') {
            showCreateRoomModal();
        }
    });
}

/**
 * Быстрое присоединение к комнате и переход на страницу комнаты
 */
async function quickJoinRoom(roomId) {
    try {
        if (!roomId) return;
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showNotification('Сначала войдите в систему', 'warning');
            window.location.href = '/auth';
            return;
        }

        // Минимальные данные игрока (полный PlayerBundle будет выбран в комнате)
        const playerData = {
            userId: currentUser.id,
            username: currentUser.username,
            name: currentUser.name || currentUser.username,
            avatar: currentUser.avatar || '',
            token: '',
            dream: '',
            dreamCost: 0,
            dreamDescription: '',
            isReady: false
        };

        try {
            // joinRoom(roomId, player)
            await roomService.joinRoom(roomId, playerData);
        } catch (_) {
            // Игнорируем ошибку, если уже в комнате или игра начата — просто переходим
        }

        console.log('🎮 Rooms: Переход в комнату после быстрого присоединения:', roomId);
        window.location.href = `room.html?id=${roomId}`;
    } catch (error) {
        console.error('❌ Rooms: Ошибка быстрого присоединения:', error);
        showNotification('Не удалось присоединиться к комнате', 'error');
    }
}

// Экспортируем в глобальную область на всякий случай (для обработчиков делегирования и возможного inline-использования)
if (typeof window !== 'undefined') {
    window.quickJoinRoom = quickJoinRoom;
}

/**
 * Загрузка списка комнат
 */
async function loadRooms() {
    try {
        showLoadingState();
        
        const rooms = await roomService.getAllRooms();
        // Если API вернул пусто, используем последние сохранённые/мок-данные, чтобы не показывать 0 комнат
        const safeRooms = rooms && rooms.length > 0 ? rooms : (roomService.state?.rooms || roomService.mockRooms || []);
        renderRooms(safeRooms);
        
        // Обновляем счетчик комнат
        const roomsCount = document.getElementById('rooms-count');
        if (roomsCount) {
            roomsCount.textContent = `${(safeRooms || []).length} комнат`;
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
    // Предотвращаем множественные одновременные запросы статистики
    const now = Date.now();
    if (isLoadingStats || (now - lastStatsRequest < MIN_REQUEST_INTERVAL)) {
        console.log('⏳ Rooms: Пропускаем загрузку статистики - запрос уже выполняется или слишком часто');
        return;
    }
    
    isLoadingStats = true;
    lastStatsRequest = now;
    
    try {
        console.log('📊 Rooms: Загружаем статистику');
        const stats = await roomService.getStats();
        renderStats(stats);
    } catch (error) {
        console.error('❌ Rooms: Ошибка загрузки статистики:', error);
        
        // При ошибке 429 не показываем пользователю ошибку для статистики
        // просто используем значения по умолчанию
        if (error.message && (error.message.includes('429') || error.message.includes('Rate limited'))) {
            console.warn('⏳ Rooms: Статистика недоступна из-за rate limiting');
            // Используем статистику по умолчанию
            renderStats({
                totalRooms: 0,
                activeRooms: 0,
                gamesInProgress: 0,
                playersOnline: 0
            });
        }
    } finally {
        // Всегда сбрасываем флаг загрузки
        isLoadingStats = false;
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
                <button class="btn btn-secondary btn-lg" id="retry-load-rooms">
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
                <button class="btn btn-primary btn-lg" id="create-room-from-empty">
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
 * Обновление информации о пользователе
 */
function updateUserInfo() {
    try {
        const user = getCurrentUser();
        const username = user?.username || 'Пользователь';

        const usernameElement = document.getElementById('current-username');
        const userAvatarElement = document.getElementById('user-avatar');
        const userNameElement = document.getElementById('user-name');

        if (usernameElement) {
            usernameElement.textContent = username;
        }
        
        if (userAvatarElement) {
            userAvatarElement.textContent = (username || 'U').charAt(0).toUpperCase();
        }
        
        if (userNameElement) {
            userNameElement.textContent = username;
        }
        
        console.log('✅ Rooms: Информация о пользователе отображена:', username);
    } catch (error) {
        console.error('❌ Rooms: Ошибка обновления информации о пользователе:', error);
    }
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
    
    // Исправляем логику проверки нахождения в комнате
    const isInRoom = checkIfPlayerInRoom(currentUser, room);
    const canJoin = !isInRoom && roomService.canJoinRoom(currentUser.id, room);
    const canStart = isInRoom && roomService.canStartGame(currentUser.id, room);
    
    let actions = '';
    
    if (isInRoom) {
        if (canStart) {
            actions += `<button class="room-action join" data-action="start-game" data-room-id="${room.id}">Начать игру</button>`;
        } else {
            actions += `<button class="room-action view" disabled>Вы в комнате</button>`;
        }
    } else if (canJoin) {
        actions += `<button class="room-action join" data-action="join-room" data-room-id="${room.id}">Присоединиться</button>`;
    } else {
        actions += `<button class="room-action view" disabled>${getJoinDisabledReason(room)}</button>`;
    }
    
    actions += `<button class="room-action view" data-action="view-details" data-room-id="${room.id}">Подробнее</button>`;
    
    return actions;
}

/**
 * Проверка, находится ли игрок в комнате
 */
function checkIfPlayerInRoom(user, room) {
    if (!user || !room || !room.players) {
        return false;
    }
    
    // Проверяем по userId, id или username
    return room.players.some(player => 
        player.userId === user.id || 
        player.id === user.id || 
        player.username === user.username ||
        player.name === user.username
    );
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
        
        // Специальная обработка для 429 ошибок
        if (error.message && error.message.includes('429')) {
            showNotification('Сервер перегружен. Попробуйте создать комнату через несколько секунд.', 'error');
        } else if (error.message && error.message.includes('Rate limited')) {
            const retryTime = error.message.match(/(\d+)ms/);
            const time = retryTime ? Math.ceil(parseInt(retryTime[1]) / 1000) : 5;
            showNotification(`Слишком много запросов. Повторите через ${time} секунд.`, 'error');
        } else {
            showNotification(error.message || 'Ошибка создания комнаты', 'error');
        }
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
    if (!currentUser || !currentUser.id) {
        console.error('❌ Rooms: currentUser или currentUser.id отсутствует:', currentUser);
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
        showNotification('Вы присоединились к комнате! Переходим в комнату...', 'success');
        
        // Перезагружаем список комнат
        await loadRooms();
        
        // Принудительно обновляем список комнат для других пользователей
        await forceRefreshRooms();
        
        // Автоматически переходим в комнату мгновенно
        console.log('🎮 Rooms: Переход в комнату после присоединения:', selectedRoom.id);
        window.location.href = `room.html?id=${selectedRoom.id}`;
        
        // Если игра может начаться и мы хост, предлагаем начать
        const userId = currentUser.id; // Сохраняем ID в переменную для использования в setTimeout
        if (userId && roomService.canStartGame(userId, room)) {
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
        
        // Убеждаемся, что у пользователя есть все необходимые поля
        if (user && user.isLoggedIn) {
            return {
                id: user.id || user.userId || 'admin',
                username: user.username || user.name || 'admin',
                name: user.name || user.username || 'admin',
                email: user.email || '',
                avatar: user.avatar || '',
                isLoggedIn: true
            };
        }
        
        return null;
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

/**
 * Обработка выхода из системы с очисткой кеша
 */
async function handleLogout() {
    try {
        console.log('🚪 Rooms: Выход из системы...');
        
        // Показываем подтверждение
        const confirmed = confirm('Вы уверены, что хотите выйти из системы?');
        if (!confirmed) {
            return;
        }
        
        // Очищаем все данные авторизации из localStorage
        const keysToRemove = [
            'aura_money_token',
            'aura_money_user', 
            'currentUser',
            'aura_money_dynamic_rooms',
            'aura_money_rooms_cache',
            'aura_money_stats_cache'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        console.log('🧹 Rooms: Кеш сессии очищен');
        
        // Показываем уведомление
        showNotification('Вы вышли из системы', 'success');
        
        // Перенаправляем на страницу авторизации мгновенно
        window.location.href = '/auth';
        
    } catch (error) {
        console.error('❌ Rooms: Ошибка при выходе:', error);
        showNotification('Ошибка при выходе из системы', 'error');
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
