/**
 * Модуль для страницы лобби
 * Обрабатывает взаимодействие с комнатами и навигацию
 */

/**
 * Создание новой комнаты
 */
function createRoom() {
    // Переходим на страницу создания комнаты
    window.location.href = 'room.html';
}

/**
 * Присоединение к комнате
 * @param {string} roomId - ID комнаты
 */
function joinRoom(roomId) {
    alert(`Присоединение к комнате ${roomId}...`);
    // Переход в игровую комнату
    window.location.href = `../index.html?room=${roomId}`;
}

/**
 * Инициализация обработчиков событий
 */
function initializeEventHandlers() {
    // Кнопка создания комнаты
    const createRoomBtn = document.getElementById('create-room-btn');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', createRoom);
    }
    
    // Кнопка "Назад"
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
    
    // Комнаты для присоединения
    const roomCards = document.querySelectorAll('.room-card[data-room-id]');
    roomCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const roomId = card.getAttribute('data-room-id');
            if (roomId) {
                joinRoom(roomId);
            }
        });
    });
    
    // Кнопки "Присоединиться"
    const joinBtns = document.querySelectorAll('.join-btn');
    joinBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const roomCard = btn.closest('.room-card');
            if (roomCard) {
                const roomId = roomCard.getAttribute('data-room-id');
                if (roomId) {
                    joinRoom(roomId);
                }
            }
        });
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeEventHandlers);

// Обновление статистики каждые 5 секунд
setInterval(() => {
    // Здесь будет логика обновления статистики
}, 5000);
