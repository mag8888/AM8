/**
 * ModalUtils v1.0.0
 * Утилиты для создания стандартных модальных окон
 */

class ModalUtils {
    /**
     * Создание стандартного модального окна
     * @param {Object} options - Опции модального окна
     * @param {string} options.type - Тип модального окна (success, warning, error, info)
     * @param {string} options.title - Заголовок
     * @param {string} options.message - Сообщение
     * @param {Array} options.buttons - Массив кнопок
     * @param {Function} options.onClose - Функция закрытия
     * @returns {HTMLElement} - Элемент модального окна
     */
    static createModal(options = {}) {
        const {
            type = 'info',
            title = 'Уведомление',
            message = '',
            buttons = [],
            onClose = null
        } = options;

        // Создаем контейнер модального окна
        const modal = document.createElement('div');
        modal.className = `modal modal-${type}`;
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                ${buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${buttons.map(button => `
                            <button class="btn ${button.class || 'btn-secondary'}" 
                                    data-action="${button.action || 'close'}">
                                ${button.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Добавляем обработчики событий
        this.attachModalHandlers(modal, onClose);

        return modal;
    }

    /**
     * Показать информационное модальное окно
     * @param {string} title - Заголовок
     * @param {string} message - Сообщение
     * @param {Function} onClose - Функция закрытия
     */
    static showInfo(title, message, onClose = null) {
        const modal = this.createModal({
            type: 'info',
            title: `ℹ️ ${title}`,
            message,
            buttons: [{ text: 'OK', class: 'btn-primary', action: 'close' }],
            onClose
        });

        this.showModal(modal);
    }

    /**
     * Показать модальное окно успеха
     * @param {string} title - Заголовок
     * @param {string} message - Сообщение
     * @param {Function} onClose - Функция закрытия
     */
    static showSuccess(title, message, onClose = null) {
        const modal = this.createModal({
            type: 'success',
            title: `✅ ${title}`,
            message,
            buttons: [{ text: 'OK', class: 'btn-success', action: 'close' }],
            onClose
        });

        this.showModal(modal);
    }

    /**
     * Показать модальное окно предупреждения
     * @param {string} title - Заголовок
     * @param {string} message - Сообщение
     * @param {Function} onConfirm - Функция подтверждения
     * @param {Function} onCancel - Функция отмены
     */
    static showWarning(title, message, onConfirm = null, onCancel = null) {
        const modal = this.createModal({
            type: 'warning',
            title: `⚠️ ${title}`,
            message,
            buttons: [
                { text: 'Отмена', class: 'btn-secondary', action: 'cancel' },
                { text: 'Продолжить', class: 'btn-warning', action: 'confirm' }
            ],
            onClose: onCancel
        });

        this.attachConfirmHandlers(modal, onConfirm, onCancel);
        this.showModal(modal);
    }

    /**
     * Показать модальное окно ошибки
     * @param {string} title - Заголовок
     * @param {string} message - Сообщение
     * @param {Function} onClose - Функция закрытия
     */
    static showError(title, message, onClose = null) {
        const modal = this.createModal({
            type: 'error',
            title: `❌ ${title}`,
            message,
            buttons: [{ text: 'OK', class: 'btn-error', action: 'close' }],
            onClose
        });

        this.showModal(modal);
    }

    /**
     * Показать модальное окно подтверждения
     * @param {string} title - Заголовок
     * @param {string} message - Сообщение
     * @param {Function} onConfirm - Функция подтверждения
     * @param {Function} onCancel - Функция отмены
     */
    static showConfirm(title, message, onConfirm = null, onCancel = null) {
        const modal = this.createModal({
            type: 'info',
            title: `❓ ${title}`,
            message,
            buttons: [
                { text: 'Отмена', class: 'btn-secondary', action: 'cancel' },
                { text: 'Подтвердить', class: 'btn-primary', action: 'confirm' }
            ],
            onClose: onCancel
        });

        this.attachConfirmHandlers(modal, onConfirm, onCancel);
        this.showModal(modal);
    }

    /**
     * Показать модальное окно
     * @param {HTMLElement} modal - Элемент модального окна
     */
    static showModal(modal) {
        document.body.appendChild(modal);
        
        // Добавляем класс show с задержкой для анимации
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Блокируем скролл страницы
        document.body.style.overflow = 'hidden';
    }

    /**
     * Скрыть модальное окно
     * @param {HTMLElement} modal - Элемент модального окна
     */
    static hideModal(modal) {
        modal.classList.remove('show');
        
        // Удаляем элемент после анимации
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            document.body.style.overflow = '';
        }, 300);
    }

    /**
     * Прикрепить обработчики событий к модальному окну
     * @param {HTMLElement} modal - Элемент модального окна
     * @param {Function} onClose - Функция закрытия
     */
    static attachModalHandlers(modal, onClose) {
        // Кнопка закрытия
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            this.hideModal(modal);
            if (onClose) onClose();
        });

        // Клик по фону для закрытия
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modal);
                if (onClose) onClose();
            }
        });

        // Кнопки в футере
        const buttons = modal.querySelectorAll('.modal-footer .btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                if (action === 'close') {
                    this.hideModal(modal);
                    if (onClose) onClose();
                }
            });
        });
    }

    /**
     * Прикрепить обработчики для модального окна подтверждения
     * @param {HTMLElement} modal - Элемент модального окна
     * @param {Function} onConfirm - Функция подтверждения
     * @param {Function} onCancel - Функция отмены
     */
    static attachConfirmHandlers(modal, onConfirm, onCancel) {
        const buttons = modal.querySelectorAll('.modal-footer .btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.hideModal(modal);
                
                if (action === 'confirm' && onConfirm) {
                    onConfirm();
                } else if (action === 'cancel' && onCancel) {
                    onCancel();
                }
            });
        });
    }

    /**
     * Создать модальное окно с формой
     * @param {Object} options - Опции формы
     * @returns {HTMLElement} - Элемент модального окна
     */
    static createFormModal(options = {}) {
        const {
            title = 'Форма',
            fields = [],
            onSubmit = null,
            onCancel = null
        } = options;

        const formHTML = fields.map(field => `
            <div class="form-group">
                <label for="${field.id}">${field.label}</label>
                ${field.type === 'textarea' ? 
                    `<textarea id="${field.id}" name="${field.name}" ${field.required ? 'required' : ''} 
                             placeholder="${field.placeholder || ''}" rows="${field.rows || 3}"></textarea>` :
                    `<input type="${field.type || 'text'}" id="${field.id}" name="${field.name}" 
                           ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" 
                           ${field.value ? `value="${field.value}"` : ''}>`
                }
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.className = 'modal modal-info';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📝 ${title}</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="modal-form">
                        ${formHTML}
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" type="button" data-action="cancel">Отмена</button>
                    <button class="btn btn-primary" type="submit" form="modal-form">Отправить</button>
                </div>
            </div>
        `;

        // Добавляем обработчики
        this.attachFormHandlers(modal, onSubmit, onCancel);

        return modal;
    }

    /**
     * Прикрепить обработчики для модального окна с формой
     * @param {HTMLElement} modal - Элемент модального окна
     * @param {Function} onSubmit - Функция отправки формы
     * @param {Function} onCancel - Функция отмены
     */
    static attachFormHandlers(modal, onSubmit, onCancel) {
        const form = modal.querySelector('#modal-form');
        const cancelBtn = modal.querySelector('[data-action="cancel"]');

        // Отправка формы
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            this.hideModal(modal);
            if (onSubmit) onSubmit(data);
        });

        // Отмена
        cancelBtn.addEventListener('click', () => {
            this.hideModal(modal);
            if (onCancel) onCancel();
        });

        // Кнопка закрытия
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            this.hideModal(modal);
            if (onCancel) onCancel();
        });
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.ModalUtils = ModalUtils;
}
