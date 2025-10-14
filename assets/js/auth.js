/**
 * Модуль проверки авторизации
 * Проверяет авторизацию пользователя и перенаправляет на главную страницу если не авторизован
 */

/**
 * Проверяет авторизацию пользователя
 * @returns {boolean} true если пользователь авторизован, false если нет
 */
function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        console.log('❌ Пользователь не авторизован, перенаправляем на авторизацию');
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const userData = JSON.parse(currentUser);
        const username = userData.username || userData.name || 'Пользователь';
        
        // Обновляем отображение юзернейма
        updateUsernameDisplay(username);
        
        console.log('✅ Пользователь авторизован:', username);
        return true;
    } catch (error) {
        console.error('Ошибка парсинга данных пользователя:', error);
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
        return false;
    }
}

/**
 * Обновляет отображение юзернейма на странице
 * @param {string} username - имя пользователя
 */
function updateUsernameDisplay(username) {
    // Обновляем в заголовке лобби
    const lobbyUsernameSpan = document.getElementById('lobby-current-username');
    if (lobbyUsernameSpan) {
        lobbyUsernameSpan.textContent = username;
    }
    
    // Обновляем в заголовке комнат
    const roomsUsernameSpan = document.getElementById('current-username');
    if (roomsUsernameSpan) {
        roomsUsernameSpan.textContent = username;
    }
    
    // Обновляем в заголовке комнаты
    const roomUsernameSpan = document.getElementById('room-current-username');
    if (roomUsernameSpan) {
        roomUsernameSpan.textContent = username;
    }
    
    // Обновляем в правом верхнем углу комнат
    const roomsUserNameElement = document.getElementById('user-name');
    if (roomsUserNameElement) {
        roomsUserNameElement.textContent = username;
    }
    
    // Обновляем в правом верхнем углу комнаты
    const roomUserNameElement = document.getElementById('room-user-name');
    if (roomUserNameElement) {
        roomUserNameElement.textContent = username;
    }
    
    // Обновляем аватар в комнатах
    const roomsUserAvatar = document.getElementById('user-avatar');
    if (roomsUserAvatar) {
        roomsUserAvatar.textContent = username.charAt(0).toUpperCase();
    }
    
    // Обновляем аватар в комнате
    const roomUserAvatar = document.getElementById('room-user-avatar');
    if (roomUserAvatar) {
        roomUserAvatar.textContent = username.charAt(0).toUpperCase();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', checkAuth);

// Проверка при изменении localStorage
window.addEventListener('storage', checkAuth);
