/**
 * Централизованная система уведомлений
 * Унифицированные методы для показа уведомлений
 */

class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    /**
     * Инициализация системы уведомлений
     */
    init() {
        // Создаем контейнер для уведомлений если его нет
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    /**
     * Показать уведомление
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления (success, error, warning, info)
     * @param {number} duration - Длительность показа (мс, 0 = не исчезает)
     * @param {Object} options - Дополнительные опции
     * @returns {string} - ID уведомления
     */
    show(message, type = 'info', duration = 5000, options = {}) {
        const id = CommonUtils.generateId();
        const notification = this.createNotification(id, message, type, options);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Автоматическое скрытие
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }
        
        console.log(`📢 NotificationManager: Показано уведомление [${type}]: ${message}`);
        return id;
    }

    /**
     * Создание элемента уведомления
     * @param {string} id - ID уведомления
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления
     * @param {Object} options - Дополнительные опции
     * @returns {HTMLElement} - Элемент уведомления
     */
    createNotification(id, message, type, options) {
        const notification = document.createElement('div');
        notification.id = id;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            max-width: 350px;
            word-wrap: break-word;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            position: relative;
            border-left: 4px solid ${this.getBorderColor(type)};
        `;
        
        // Иконка для типа уведомления
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 16px; flex-shrink: 0;">${icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${this.getTitle(type)}</div>
                    <div>${message}</div>
                </div>
                <button onclick="notificationManager.hide('${id}')" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 8px;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                    ×
                </button>
            </div>
        `;
        
        return notification;
    }

    /**
     * Получить цвет фона для типа уведомления
     * @param {string} type - Тип уведомления
     * @returns {string} - Цвет фона
     */
    getBackgroundColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
        };
        return colors[type] || colors.info;
    }

    /**
     * Получить цвет границы для типа уведомления
     * @param {string} type - Тип уведомления
     * @returns {string} - Цвет границы
     */
    getBorderColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    /**
     * Получить иконку для типа уведомления
     * @param {string} type - Тип уведомления
     * @returns {string} - Иконка
     */
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Получить заголовок для типа уведомления
     * @param {string} type - Тип уведомления
     * @returns {string} - Заголовок
     */
    getTitle(type) {
        const titles = {
            success: 'Успешно',
            error: 'Ошибка',
            warning: 'Предупреждение',
            info: 'Информация'
        };
        return titles[type] || titles.info;
    }

    /**
     * Скрыть уведомление
     * @param {string} id - ID уведомления
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;
        
        // Анимация исчезновения
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Скрыть все уведомления
     */
    hideAll() {
        for (const id of this.notifications.keys()) {
            this.hide(id);
        }
    }

    /**
     * Показать уведомление об успехе
     * @param {string} message - Текст уведомления
     * @param {number} duration - Длительность показа
     * @returns {string} - ID уведомления
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Показать уведомление об ошибке
     * @param {string} message - Текст уведомления
     * @param {number} duration - Длительность показа
     * @returns {string} - ID уведомления
     */
    error(message, duration = 0) {
        return this.show(message, 'error', duration);
    }

    /**
     * Показать предупреждение
     * @param {string} message - Текст уведомления
     * @param {number} duration - Длительность показа
     * @returns {string} - ID уведомления
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Показать информационное уведомление
     * @param {string} message - Текст уведомления
     * @param {number} duration - Длительность показа
     * @returns {string} - ID уведомления
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

// Создаем глобальный экземпляр менеджера уведомлений
window.notificationManager = new NotificationManager();

// Совместимость со старым API
window.showNotification = (message, type = 'info') => {
    return window.notificationManager.show(message, type);
};

console.log('✅ NotificationManager загружен');
