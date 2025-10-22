/**
 * LoadingIndicator - Компонент для отображения индикаторов загрузки
 * Версия: 1.0.0
 */
class LoadingIndicator {
    constructor(config = {}) {
        this.container = config.container || document.body;
        this.position = config.position || 'center'; // 'center', 'top', 'bottom'
        this.size = config.size || 'medium'; // 'small', 'medium', 'large'
        this.message = config.message || 'Загрузка...';
        this.autoHide = config.autoHide !== false;
        this.hideDelay = config.hideDelay || 2000;
        
        this.element = null;
        this.isVisible = false;
        this.hideTimer = null;
    }

    /**
     * Показать индикатор загрузки
     * @param {string} message - Сообщение для отображения
     */
    show(message = null) {
        if (this.isVisible) {
            this.hide();
        }

        const displayMessage = message || this.message;
        this.element = this._createIndicator(displayMessage);
        this.container.appendChild(this.element);
        this.isVisible = true;

        // Автоматическое скрытие если включено
        if (this.autoHide) {
            this.hideTimer = setTimeout(() => {
                this.hide();
            }, this.hideDelay);
        }
    }

    /**
     * Скрыть индикатор загрузки
     */
    hide() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.isVisible = false;

        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }

    /**
     * Обновить сообщение индикатора
     * @param {string} message - Новое сообщение
     */
    updateMessage(message) {
        if (this.element) {
            const messageElement = this.element.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    /**
     * Создать HTML элемент индикатора
     * @private
     */
    _createIndicator(message) {
        const indicator = document.createElement('div');
        indicator.className = `loading-indicator loading-${this.position} loading-${this.size}`;
        indicator.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
            <div class="loading-message">${message}</div>
        `;

        // Добавляем стили если их еще нет
        this._addStyles();

        return indicator;
    }

    /**
     * Добавить CSS стили для индикатора
     * @private
     */
    _addStyles() {
        if (document.getElementById('loading-indicator-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'loading-indicator-styles';
        style.textContent = `
            .loading-indicator {
                position: fixed;
                z-index: 10000;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                backdrop-filter: blur(4px);
            }

            .loading-center {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }

            .loading-top {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .loading-bottom {
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .loading-small {
                padding: 12px 16px;
                font-size: 14px;
            }

            .loading-medium {
                padding: 20px 24px;
                font-size: 16px;
            }

            .loading-large {
                padding: 24px 32px;
                font-size: 18px;
            }

            .loading-spinner {
                margin-bottom: 12px;
            }

            .spinner {
                width: 24px;
                height: 24px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid #ffffff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .loading-small .spinner {
                width: 16px;
                height: 16px;
                border-width: 2px;
            }

            .loading-large .spinner {
                width: 32px;
                height: 32px;
                border-width: 4px;
            }

            .loading-message {
                text-align: center;
                font-weight: 500;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Статический метод для быстрого показа индикатора
     * @param {string} message - Сообщение
     * @param {Object} options - Опции
     */
    static show(message = 'Загрузка...', options = {}) {
        const indicator = new LoadingIndicator(options);
        indicator.show(message);
        return indicator;
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.LoadingIndicator = LoadingIndicator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingIndicator;
}

