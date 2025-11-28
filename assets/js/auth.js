/**
 * Модуль проверки авторизации
 * Проверяет авторизацию пользователя и перенаправляет на главную страницу если не авторизован
 */

// Кэш для результата проверки авторизации
let _authCache = {
    result: null,
    timestamp: 0,
    username: null
};
const AUTH_CACHE_DURATION = 5000; // Кэш на 5 секунд
let _checkAuthDebounceTimer = null;
const CHECK_AUTH_DEBOUNCE_MS = 1000; // Дебаунс 1 секунда

/**
 * Проверяет авторизацию пользователя с кэшированием и дебаунсингом
 * @returns {boolean} true если пользователь авторизован, false если нет
 */
function checkAuth() {
    const now = Date.now();
    
    // Проверяем кэш
    if (_authCache.result !== null && (now - _authCache.timestamp) < AUTH_CACHE_DURATION) {
        // Используем кэшированный результат, но обновляем UI только если нужно
        if (_authCache.username) {
            updateUsernameDisplay(_authCache.username);
        }
        return _authCache.result;
    }
    
    // Дебаунсинг - откладываем выполнение
    if (_checkAuthDebounceTimer) {
        clearTimeout(_checkAuthDebounceTimer);
    }
    
    _checkAuthDebounceTimer = setTimeout(() => {
        _checkAuthDebounceTimer = null;
        _performAuthCheck();
    }, CHECK_AUTH_DEBOUNCE_MS);
    
    // Возвращаем кэшированный результат, если есть
    return _authCache.result !== null ? _authCache.result : true;
}

/**
 * Выполняет фактическую проверку авторизации
 * @private
 */
function _performAuthCheck() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        // Очищаем кэш при отсутствии авторизации
        _authCache = { result: false, timestamp: Date.now(), username: null };
        console.log('❌ Пользователь не авторизован, перенаправляем на авторизацию');
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const userData = JSON.parse(currentUser);
        const username = userData.username || userData.name || 'Пользователь';
        
        // Обновляем кэш
        _authCache = {
            result: true,
            timestamp: Date.now(),
            username: username
        };
        
        // Обновляем отображение юзернейма
        updateUsernameDisplay(username);
        
        // Логируем только если результат изменился или кэш истек
        console.log('✅ Пользователь авторизован:', username);
        return true;
    } catch (error) {
        console.error('Ошибка парсинга данных пользователя:', error);
        localStorage.removeItem('currentUser');
        _authCache = { result: false, timestamp: Date.now(), username: null };
        window.location.href = '../index.html';
        return false;
    }
}

/**
 * Обновляет отображение юзернейма на странице
 * @param {string} username - имя пользователя
 */
function updateUsernameDisplay(username) {
    
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
