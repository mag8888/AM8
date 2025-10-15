/**
 * Navigation Handler - Безопасная обработка навигации
 * Версия: 1.0.0
 */

class NavigationHandler {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('✅ NavigationHandler: Инициализирован');
    }

    setupEventListeners() {
        // Обработка навигационных кнопок
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-route]');
            if (target) {
                e.preventDefault();
                const route = target.getAttribute('data-route');
                this.navigate(route);
            }
        });

        // Обработка переключения табов
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-tab]');
            if (target) {
                const tab = target.getAttribute('data-tab');
                this.switchTab(tab);
            }
        });

        // Обработка быстрых аккаунтов
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-username]');
            if (target) {
                const username = target.getAttribute('data-username');
                const password = target.getAttribute('data-password');
                this.fillAccount(username, password);
            }
        });
    }

    navigate(route) {
        try {
            if (typeof router !== 'undefined' && router.navigate) {
                router.navigate(route);
            } else {
                console.warn('Router не доступен, используем fallback навигацию');
                this.fallbackNavigation(route);
            }
        } catch (error) {
            console.error('Ошибка навигации:', error);
            this.fallbackNavigation(route);
        }
    }

    fallbackNavigation(route) {
        // Fallback навигация если router недоступен
        const pages = {
            '/': 'home-page',
            '/auth': 'auth-page',
            '/lobby': 'lobby-page',
            '/rooms': 'rooms-page'
        };

        const pageId = pages[route];
        if (pageId) {
            this.showPage(pageId);
        }
    }

    showPage(pageId) {
        // Скрыть все страницы
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => {
            page.classList.remove('active');
        });

        // Показать нужную страницу
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    switchTab(tabName) {
        // Переключение между табами авторизации
        const tabs = document.querySelectorAll('[data-tab]');
        const forms = document.querySelectorAll('.auth-form');

        // Убираем активный класс со всех табов
        tabs.forEach(tab => tab.classList.remove('active'));
        forms.forEach(form => form.classList.remove('active'));

        // Добавляем активный класс к выбранному табу
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeForm = document.getElementById(`${tabName}-form`);

        if (activeTab) activeTab.classList.add('active');
        if (activeForm) activeForm.classList.add('active');
    }

    fillAccount(username, password) {
        // Заполнение формы авторизации
        const usernameField = document.getElementById('login-username');
        const passwordField = document.getElementById('login-password');

        if (usernameField && passwordField) {
            usernameField.value = username;
            passwordField.value = password;

            // Визуальная обратная связь
            usernameField.style.borderColor = '#10b981';
            passwordField.style.borderColor = '#10b981';

            setTimeout(() => {
                usernameField.style.borderColor = '';
                passwordField.style.borderColor = '';
            }, 2000);

            console.log(`✅ NavigationHandler: Заполнен аккаунт ${username}`);
        }
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    window.navigationHandler = new NavigationHandler();
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationHandler;
}
