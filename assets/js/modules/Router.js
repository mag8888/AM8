/**
 * Router v1.0.0
 * Система маршрутизации для навигации между страницами
 */
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = '/';
        this.container = null;
        
        // Привязка методов
        this.boundHandlePopState = this.handlePopState.bind(this);
        
        console.log('🗺️ Router: Инициализация маршрутизации');
        this.init();
    }

    /**
     * Инициализация роутера
     */
    init() {
        // Находим контейнер для страниц
        this.container = document.getElementById('page-container') || document.body;
        
        // Настраиваем обработчик истории браузера
        window.addEventListener('popstate', this.boundHandlePopState);
        
        // Обрабатываем текущий URL только если есть маршруты
        setTimeout(() => {
            if (this.routes.size > 0) {
                this.handleCurrentRoute();
            }
        }, 100);
        
        console.log('✅ Router: Маршрутизация инициализирована');
    }

    /**
     * Регистрация маршрута
     * @param {string} path - Путь маршрута
     * @param {Function} handler - Обработчик маршрута
     * @param {string} title - Заголовок страницы
     */
    route(path, handler, title = '') {
        this.routes.set(path, {
            handler,
            title,
            path
        });
        
        console.log(`🗺️ Router: Зарегистрирован маршрут ${path}`);
    }

    /**
     * Переход на маршрут
     * @param {string} path - Путь для перехода
     * @param {Object} state - Состояние для передачи
     */
    navigate(path, state = {}) {
        console.log(`🗺️ Router: Переход на ${path}`);
        
        // Проверяем существование маршрута
        if (!this.routes.has(path)) {
            console.error(`❌ Router: Маршрут ${path} не найден`);
            
            // Предотвращаем бесконечный цикл
            if (path !== this.defaultRoute && this.routes.has(this.defaultRoute)) {
                this.navigate(this.defaultRoute);
            } else {
                console.error(`❌ Router: Default маршрут ${this.defaultRoute} также не найден`);
                // Если нет доступных маршрутов, просто останавливаемся
            }
            return;
        }

        const route = this.routes.get(path);
        
        // Обновляем URL без перезагрузки страницы
        const url = path === '/' ? '/' : path;
        window.history.pushState({ ...state, route: path }, route.title, url);
        
        // Выполняем переход
        this.executeRoute(path, state);
    }

    /**
     * Выполнение маршрута
     * @param {string} path - Путь маршрута
     * @param {Object} state - Состояние
     */
    executeRoute(path, state = {}) {
        const route = this.routes.get(path);
        if (!route) {
            console.error(`❌ Router: Маршрут ${path} не найден`);
            return;
        }

        this.currentRoute = path;
        
        // Извлекаем параметры из URL
        const urlParams = this.getParams(path);
        const routeState = { ...state, ...urlParams };
        
        // Обновляем заголовок страницы
        if (route.title) {
            document.title = `${route.title} - Aura Money`;
        }

        // Выполняем обработчик маршрута
        try {
            route.handler(routeState);
            console.log(`✅ Router: Переход на ${path} выполнен`);
        } catch (error) {
            console.error(`❌ Router: Ошибка выполнения маршрута ${path}:`, error);
        }
    }

    /**
     * Обработчик изменения истории браузера
     * @param {PopStateEvent} event
     */
    handlePopState(event) {
        const state = event.state || {};
        const path = state.route || this.getCurrentPath();
        
        console.log(`🗺️ Router: Обработка истории браузера - ${path}`);
        this.executeRoute(path, state);
    }

    /**
     * Получение текущего пути
     * @returns {string}
     */
    getCurrentPath() {
        // Проверяем хеш для маршрутов типа #game
        const hash = window.location.hash;
        if (hash) {
            // Извлекаем путь из хеша (например, #game?roomId=123 -> /game)
            const hashPath = hash.split('?')[0].substring(1); // убираем #
            if (hashPath && this.routes.has('/' + hashPath)) {
                return '/' + hashPath;
            }
        }
        
        const path = window.location.pathname;
        return path === '/' ? this.defaultRoute : path;
    }

    /**
     * Обработка текущего маршрута при загрузке
     */
    handleCurrentRoute() {
        const currentPath = this.getCurrentPath();
        
        // Если маршрут не зарегистрирован, переходим на default
        if (!this.routes.has(currentPath)) {
            console.log(`🗺️ Router: Маршрут ${currentPath} не найден, переход на ${this.defaultRoute}`);
            
            // Предотвращаем бесконечный цикл
            if (this.routes.has(this.defaultRoute)) {
                this.navigate(this.defaultRoute);
            } else {
                console.error(`❌ Router: Default маршрут ${this.defaultRoute} не зарегистрирован`);
                // Если нет доступных маршрутов, просто останавливаемся
            }
            return;
        }

        this.executeRoute(currentPath);
    }

    /**
     * Получение текущего маршрута
     * @returns {string}
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Проверка активного маршрута
     * @param {string} path
     * @returns {boolean}
     */
    isActiveRoute(path) {
        return this.currentRoute === path;
    }

    /**
     * Замена текущего маршрута без добавления в историю
     * @param {string} path
     * @param {Object} state
     */
    replace(path, state = {}) {
        console.log(`🗺️ Router: Замена маршрута на ${path}`);
        
        if (!this.routes.has(path)) {
            console.error(`❌ Router: Маршрут ${path} не найден`);
            return;
        }

        const route = this.routes.get(path);
        window.history.replaceState({ ...state, route: path }, route.title, path);
        this.executeRoute(path, state);
    }

    /**
     * Очистка контейнера страниц
     */
    clearContainer() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Получение параметров из URL
     * @param {string} path
     * @returns {Object}
     */
    getParams(path) {
        const params = {};
        const url = new URL(window.location.href);
        
        // Параметры query string
        url.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        
        // Параметры из хеша (например, #game?roomId=123)
        const hash = window.location.hash;
        if (hash && hash.includes('?')) {
            const hashParams = hash.split('?')[1];
            const hashUrlParams = new URLSearchParams(hashParams);
            for (const [key, value] of hashUrlParams) {
                params[key] = value;
            }
        }
        
        return params;
    }

    /**
     * Разрушение роутера
     */
    destroy() {
        window.removeEventListener('popstate', this.boundHandlePopState);
        this.routes.clear();
        this.currentRoute = null;
        this.container = null;
        
        console.log('🗺️ Router: Роутер разрушен');
    }
}

// Экспорт для использования
if (typeof window !== 'undefined') {
    window.Router = Router;
}
