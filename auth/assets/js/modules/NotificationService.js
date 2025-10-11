/**
 * NotificationService - Сервис управления уведомлениями
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

export class NotificationService {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.animationDuration = 300;
        
        this.init();
    }

    /**
     * Инициализация сервиса
     */
    init() {
        this.container = document.getElementById('notifications');
        if (!this.container) {
            console.warn('⚠️ NotificationService: Контейнер уведомлений не найден');
            return;
        }
        
        console.log('✅ NotificationService: Инициализирован');
    }

    /**
     * Показать уведомление
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления (success, error, warning, info)
     * @param {Object} options - Дополнительные опции
     * @returns {string} ID уведомления
     */
    show(message, type = 'info', options = {}) {
        const id = this.generateId();
        const config = {
            duration: options.duration || this.defaultDuration,
            closable: options.closable !== false,
            autoClose: options.autoClose !== false,
            icon: options.icon || this.getDefaultIcon(type),
            title: options.title || '',
            actions: options.actions || [],
            ...options
        };

        const notification = this.createNotification(id, message, type, config);
        this.addNotification(id, notification);

        // Автоматическое закрытие
        if (config.autoClose && config.duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, config.duration);
        }

        return id;
    }

    /**
     * Показать уведомление об успехе
     * @param {string} message - Сообщение
     * @param {Object} options - Дополнительные опции
     * @returns {string} ID уведомления
     */
    success(message, options = {}) {
        return this.show(message, 'success', {
            title: 'Успешно',
            ...options
        });
    }

    /**
     * Показать уведомление об ошибке
     * @param {string} message - Сообщение
     * @param {Object} options - Дополнительные опции
     * @returns {string} ID уведомления
     */
    error(message, options = {}) {
        return this.show(message, 'error', {
            title: 'Ошибка',
            duration: 8000, // Ошибки показываем дольше
            ...options
        });
    }

    /**
     * Показать предупреждение
     * @param {string} message - Сообщение
     * @param {Object} options - Дополнительные опции
     * @returns {string} ID уведомления
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', {
            title: 'Внимание',
            duration: 6000,
            ...options
        });
    }

    /**
     * Показать информационное сообщение
     * @param {string} message - Сообщение
     * @param {Object} options - Дополнительные опции
     * @returns {string} ID уведомления
     */
    info(message, options = {}) {
        return this.show(message, 'info', {
            title: 'Информация',
            ...options
        });
    }

    /**
     * Скрыть уведомление
     * @param {string} id - ID уведомления
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.classList.add('closing');
        
        setTimeout(() => {
            this.removeNotification(id);
        }, this.animationDuration);
    }

    /**
     * Скрыть все уведомления
     */
    hideAll() {
        this.notifications.forEach((_, id) => {
            this.hide(id);
        });
    }

    /**
     * Создать элемент уведомления
     * @param {string} id - ID уведомления
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления
     * @param {Object} config - Конфигурация
     * @returns {HTMLElement} Элемент уведомления
     */
    createNotification(id, message, type, config) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = id;

        // Иконка
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = config.icon;

        // Контент
        const content = document.createElement('div');
        content.className = 'notification-content';

        // Заголовок
        if (config.title) {
            const title = document.createElement('div');
            title.className = 'notification-title';
            title.textContent = config.title;
            content.appendChild(title);
        }

        // Сообщение
        const messageEl = document.createElement('div');
        messageEl.className = 'notification-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);

        // Действия
        if (config.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'notification-actions';
            
            config.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `notification-action ${action.type || 'secondary'}`;
                button.textContent = action.label;
                button.onclick = () => {
                    if (action.callback) {
                        action.callback(id);
                    }
                    if (action.close !== false) {
                        this.hide(id);
                    }
                };
                actions.appendChild(button);
            });
            
            content.appendChild(actions);
        }

        // Кнопка закрытия
        if (config.closable) {
            const closeButton = document.createElement('button');
            closeButton.className = 'notification-close';
            closeButton.innerHTML = '×';
            closeButton.onclick = () => this.hide(id);
            notification.appendChild(closeButton);
        }

        notification.appendChild(icon);
        notification.appendChild(content);

        return notification;
    }

    /**
     * Добавить уведомление в контейнер
     * @param {string} id - ID уведомления
     * @param {HTMLElement} notification - Элемент уведомления
     */
    addNotification(id, notification) {
        if (!this.container) return;

        // Ограничиваем количество уведомлений
        if (this.notifications.size >= this.maxNotifications) {
            const firstId = this.notifications.keys().next().value;
            this.hide(firstId);
        }

        this.notifications.set(id, notification);
        this.container.appendChild(notification);

        // Анимация появления
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
    }

    /**
     * Удалить уведомление из контейнера
     * @param {string} id - ID уведомления
     */
    removeNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification || !this.container) return;

        this.container.removeChild(notification);
        this.notifications.delete(id);
    }

    /**
     * Получить иконку по умолчанию для типа
     * @param {string} type - Тип уведомления
     * @returns {string} HTML иконки
     */
    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Генерация уникального ID
     * @returns {string} Уникальный ID
     */
    generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Показать уведомление о загрузке
     * @param {string} message - Сообщение
     * @returns {string} ID уведомления
     */
    loading(message = 'Загрузка...') {
        return this.show(message, 'info', {
            title: 'Загрузка',
            icon: '⏳',
            autoClose: false,
            closable: false
        });
    }

    /**
     * Показать прогресс
     * @param {string} message - Сообщение
     * @param {number} progress - Прогресс (0-100)
     * @returns {string} ID уведомления
     */
    progress(message, progress = 0) {
        const id = this.generateId();
        const notification = this.createProgressNotification(id, message, progress);
        this.addNotification(id, notification);
        return id;
    }

    /**
     * Создать уведомление с прогрессом
     * @param {string} id - ID уведомления
     * @param {string} message - Сообщение
     * @param {number} progress - Прогресс
     * @returns {HTMLElement} Элемент уведомления
     */
    createProgressNotification(id, message, progress) {
        const notification = document.createElement('div');
        notification.className = 'notification info progress';
        notification.dataset.id = id;

        const content = document.createElement('div');
        content.className = 'notification-content';

        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = 'Прогресс';

        const messageEl = document.createElement('div');
        messageEl.className = 'notification-message';
        messageEl.textContent = message;

        const progressBar = document.createElement('div');
        progressBar.className = 'notification-progress';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'notification-progress-fill';
        progressFill.style.width = `${progress}%`;

        progressBar.appendChild(progressFill);

        const progressText = document.createElement('div');
        progressText.className = 'notification-progress-text';
        progressText.textContent = `${Math.round(progress)}%`;

        content.appendChild(title);
        content.appendChild(messageEl);
        content.appendChild(progressBar);
        content.appendChild(progressText);

        notification.appendChild(content);
        return notification;
    }

    /**
     * Обновить прогресс уведомления
     * @param {string} id - ID уведомления
     * @param {number} progress - Новый прогресс
     * @param {string} message - Новое сообщение
     */
    updateProgress(id, progress, message) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const progressFill = notification.querySelector('.notification-progress-fill');
        const progressText = notification.querySelector('.notification-progress-text');
        const messageEl = notification.querySelector('.notification-message');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }

        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }

        if (messageEl && message) {
            messageEl.textContent = message;
        }

        // Автоматически закрываем при завершении
        if (progress >= 100) {
            setTimeout(() => {
                this.hide(id);
            }, 1000);
        }
    }

    /**
     * Показать уведомление с действиями
     * @param {string} message - Сообщение
     * @param {Array} actions - Массив действий
     * @param {Object} options - Дополнительные опции
     * @returns {string} ID уведомления
     */
    confirm(message, actions = [], options = {}) {
        return this.show(message, 'info', {
            title: 'Подтверждение',
            icon: '❓',
            actions,
            autoClose: false,
            ...options
        });
    }

    /**
     * Показать toast уведомление
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления
     * @param {number} duration - Длительность показа
     * @returns {string} ID уведомления
     */
    toast(message, type = 'info', duration = 3000) {
        return this.show(message, type, {
            duration,
            closable: false,
            title: ''
        });
    }
}

// Создаем глобальный экземпляр сервиса
export const notificationService = new NotificationService();

// Экспортируем для использования в других модулях
export default notificationService;
