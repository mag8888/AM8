/**
 * Главное приложение Aura Money v1.0.0
 * Управление навигацией и инициализация компонентов
 */

class App {
    constructor() {
        this.router = null;
        this.boardLayout = null;
        this.eventBus = null;
        this.gameState = null;
        this.currentUser = null;
        
        console.log('🚀 App: Инициализация приложения');
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
        // Инициализируем компоненты игры
        this.initGameComponents();
        
        // Инициализируем роутер
        this.initRouter();
            
            // Настраиваем навигацию
            this.setupNavigation();
            
            // Проверяем авторизацию
            this.checkAuthentication();
            
            console.log('✅ App: Приложение инициализировано');
        } catch (error) {
            console.error('❌ App: Ошибка инициализации:', error);
        }
    }

    /**
     * Инициализация роутера
     */
    initRouter() {
        console.log('🗺️ App: Инициализация роутера');
        
        this.router = new window.Router();
        
        // Регистрируем маршруты
        this.router.route('/', () => {
            this.showPage('game-page');
            this.updateNavigation('/');
            // Автоматически выбираем комнату при загрузке главной страницы
            this.autoSelectRoom();
        }, 'Главная');
        
        this.router.route('/rooms', () => {
            this.showPlaceholder('Переход к комнатам...');
            setTimeout(() => {
                window.location.href = 'pages/rooms.html';
            }, 500);
        }, 'Комнаты');
        
        this.router.route('/auth', () => {
            this.showPlaceholder('Переход к авторизации...');
            setTimeout(() => {
                window.location.href = 'auth/';
            }, 500);
        }, 'Авторизация');
        
        this.router.route('/game', (state) => {
            this.showPage('game-page');
            this.updateNavigation('/');
            this.handleGameRoute(state);
        }, 'Игра');
        
        // Устанавливаем маршрут по умолчанию
        this.router.defaultRoute = '/';
        
        // Сохраняем роутер в глобальной области
        window.router = this.router;
        
        console.log('✅ App: Роутер инициализирован');
    }

    /**
     * Инициализация игровых компонентов
     */
    initGameComponents() {
        console.log('🎮 App: Инициализация игровых компонентов');
        
        try {
            // Создаем EventBus
            this.eventBus = new window.EventBus();
            
            // Создаем GameState
            this.gameState = new window.GameState();
            
            // Инициализируем BoardLayout
            this.boardLayout = new window.BoardLayout({
                outerTrackSelector: '#outer-track',
                innerTrackSelector: '#inner-track',
                gameState: this.gameState,
                eventBus: this.eventBus
            });
            
            console.log('✅ App: Игровые компоненты инициализированы');
        } catch (error) {
            console.error('❌ App: Ошибка инициализации игровых компонентов:', error);
            // Продолжаем работу без игровых компонентов
            this.eventBus = null;
            this.gameState = null;
            this.boardLayout = null;
        }
    }

    /**
     * Настройка навигации
     */
    setupNavigation() {
        console.log('🧭 App: Настройка навигации');
        
        // Обработчики для навигационных ссылок
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.dataset.route;
                if (route && this.router) {
                    this.router.navigate(route);
                }
            });
        });
        
        // Обработчик для кнопки авторизации
        const authButton = document.getElementById('auth-button');
        if (authButton) {
            authButton.addEventListener('click', () => {
                if (this.router) {
                    this.router.navigate('/auth');
                } else {
                    window.location.href = 'auth/';
                }
            });
        }
        
        // Обработчики для кнопок на главной странице
        const selectRoomBtn = document.querySelector('button[onclick*="router.navigate(\'/rooms\')"]');
        if (selectRoomBtn) {
            selectRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.router) {
                    this.router.navigate('/rooms');
                } else {
                    window.location.href = 'pages/rooms.html';
                }
            });
        }
        
        const authBtnMain = document.querySelector('button[onclick*="router.navigate(\'/auth\')"]');
        if (authBtnMain) {
            authBtnMain.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.router) {
                    this.router.navigate('/auth');
                } else {
                    window.location.href = 'auth/';
                }
            });
        }
        
        console.log('✅ App: Навигация настроена');
    }

    /**
     * Проверка авторизации
     */
    checkAuthentication() {
        console.log('🔐 App: Проверка авторизации');
        
        try {
            // Проверяем наличие данных пользователя в localStorage
            const userData = localStorage.getItem('aura_money_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.updateUserInterface();
                console.log('👤 App: Пользователь авторизован:', this.currentUser.username);
            } else {
                console.log('👤 App: Пользователь не авторизован');
            }
        } catch (error) {
            console.error('❌ App: Ошибка проверки авторизации:', error);
        }
    }

    /**
     * Обновление интерфейса пользователя
     */
    updateUserInterface() {
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const authButton = document.getElementById('auth-button');
        
        if (this.currentUser) {
            // Показываем информацию о пользователе
            if (userInfo) userInfo.style.display = 'flex';
            if (userAvatar) userAvatar.textContent = this.currentUser.name?.charAt(0).toUpperCase() || 'U';
            if (userName) userName.textContent = this.currentUser.name || this.currentUser.username || 'Пользователь';
            
            // Меняем кнопку на "Выйти"
            if (authButton) {
                authButton.textContent = 'Выйти';
                authButton.onclick = () => this.logout();
            }
        } else {
            // Скрываем информацию о пользователе
            if (userInfo) userInfo.style.display = 'none';
            
            // Возвращаем кнопку "Войти"
            if (authButton) {
                authButton.textContent = 'Войти';
                authButton.onclick = () => this.router.navigate('/auth');
            }
        }
    }

    /**
     * Выход из системы
     */
    logout() {
        console.log('🚪 App: Выход из системы');
        
        // Очищаем данные пользователя
        localStorage.removeItem('aura_money_user');
        localStorage.removeItem('aura_money_token');
        
        this.currentUser = null;
        this.updateUserInterface();
        
        // Переходим на главную страницу
        this.router.navigate('/');
        
        // Показываем уведомление
        this.showNotification('Вы вышли из системы', 'info');
    }

    /**
     * Показать страницу
     */
    showPage(pageId) {
        // Скрываем все страницы
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        
        // Показываем нужную страницу
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    /**
     * Показать заглушку
     */
    showPlaceholder(message) {
        this.showPage('placeholder-page');
        
        const placeholder = document.querySelector('#placeholder-page');
        if (placeholder) {
            placeholder.innerHTML = `
                <div style="padding: 4rem 2rem; text-align: center; color: #a0a0a0;">
                    <h2>🔄 ${message}</h2>
                    <p>Пожалуйста, подождите...</p>
                </div>
            `;
        }
    }

    /**
     * Обновление навигации
     */
    updateNavigation(activeRoute) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const route = link.dataset.route;
            if (route === activeRoute) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Обработка игрового маршрута
     */
    handleGameRoute(state) {
        console.log('🎮 App: Обработка игрового маршрута', state);
        
        if (state && state.roomId) {
            // Загружаем данные комнаты
            this.loadRoomData(state.roomId);
        }
    }

    /**
     * Загрузка данных комнаты
     */
    async loadRoomData(roomId) {
        try {
            console.log('🏠 App: Загрузка данных комнаты:', roomId);
            
            // Загружаем данные комнаты через API
            const response = await fetch(`/api/rooms/${roomId}`);
            if (response.ok) {
                const roomData = await response.json();
                console.log('✅ App: Данные комнаты загружены:', roomData);
                
                // Сохраняем данные комнаты в глобальной области
                window.currentRoom = roomData.data;
                
                // Обновляем интерфейс
                this.updateGameInterface(roomData.data);
            } else {
                console.error('❌ App: Ошибка загрузки комнаты:', response.status);
                this.showNotification('Комната не найдена', 'error');
            }
        } catch (error) {
            console.error('❌ App: Ошибка загрузки данных комнаты:', error);
            this.showNotification('Ошибка загрузки комнаты', 'error');
        }
    }

    /**
     * Автоматический выбор комнаты
     */
    async autoSelectRoom() {
        try {
            console.log('🏠 App: Автоматический выбор комнаты');
            
            // Получаем список комнат
            const response = await fetch('/api/rooms');
            if (response.ok) {
                const roomsData = await response.json();
                const rooms = roomsData.data || [];
                
                if (rooms.length > 0) {
                    // Выбираем первую доступную комнату
                    const availableRoom = rooms.find(room => !room.isStarted && !room.isFull);
                    
                    if (availableRoom) {
                        console.log('✅ App: Автоматически выбрана комната:', availableRoom.id);
                        await this.loadRoomData(availableRoom.id);
                        this.showNotification(`Автоматически выбрана комната: ${availableRoom.name}`, 'success');
                    } else {
                        console.log('⚠️ App: Нет доступных комнат');
                        this.showNotification('Нет доступных комнат', 'warning');
                    }
                } else {
                    console.log('⚠️ App: Комнаты не найдены');
                    this.showNotification('Комнаты не найдены', 'warning');
                }
            } else {
                console.error('❌ App: Ошибка получения списка комнат');
            }
        } catch (error) {
            console.error('❌ App: Ошибка автоматического выбора комнаты:', error);
        }
    }

    /**
     * Обновление интерфейса игры
     */
    updateGameInterface(roomData) {
        try {
            console.log('🎮 App: Обновление интерфейса игры');
            
            // Скрываем приветственное сообщение
            const centerContent = document.querySelector('.center-content');
            if (centerContent) {
                centerContent.innerHTML = `
                    <h2>🎮 Комната: ${roomData.name}</h2>
                    <p>Игроков: ${roomData.playerCount}/${roomData.maxPlayers}</p>
                    <div class="center-actions">
                        <button class="btn btn-primary" onclick="window.location.href='pages/rooms.html'">
                            🏠 Управление комнатой
                        </button>
                        <button class="btn btn-secondary" onclick="window.app.startGame()">
                            🚀 Начать игру
                        </button>
                    </div>
                `;
            }
            
            console.log('✅ App: Интерфейс игры обновлен');
        } catch (error) {
            console.error('❌ App: Ошибка обновления интерфейса:', error);
        }
    }

    /**
     * Запуск игры
     */
    startGame() {
        try {
            console.log('🚀 App: Запуск игры');
            
            if (window.currentRoom) {
                // Здесь можно добавить логику запуска игры
                this.showNotification('Игра запущена!', 'success');
            } else {
                this.showNotification('Сначала выберите комнату', 'error');
            }
        } catch (error) {
            console.error('❌ App: Ошибка запуска игры:', error);
        }
    }

    /**
     * Показать уведомление
     */
    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Стили для уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: '100px',
            right: '20px',
            background: type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: '10000',
            fontSize: '0.9rem',
            fontWeight: '500',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease'
        });
        
        // Добавляем анимацию
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Добавляем уведомление на страницу
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Получение текущего пользователя
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Установка текущего пользователя
     */
    setCurrentUser(user) {
        this.currentUser = user;
        this.updateUserInterface();
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск приложения Aura Money');
    window.app = new App();
});

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.App = App;
}
