/**
 * ModalService v1.0.0
 * -----------------------------------------------------------------------------
 * Сервис для управления модальными окнами
 */
class ModalService {
    constructor(config = {}) {
        this.eventBus = config.eventBus || null;
        
        // Состояние модальных окон
        this.activeModal = null;
        this.modalHistory = [];
        this.modalStack = [];
        
        // Создаем контейнер для модальных окон
        this.createModalContainer();
        
        console.log('🪟 ModalService: Инициализация...');
        this.setupEventListeners();
        console.log('✅ ModalService: Инициализация завершена');
    }
    
    /**
     * Создание контейнера для модальных окон
     */
    createModalContainer() {
        // Проверяем, существует ли уже контейнер
        let container = document.getElementById('modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modal-container';
            container.className = 'modal-container';
            document.body.appendChild(container);
        }
        
        this.modalContainer = container;
    }
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('modal:show', this.showModal.bind(this));
            this.eventBus.on('modal:close', this.closeModal.bind(this));
            this.eventBus.on('modal:close_all', this.closeAllModals.bind(this));
        }
        
        // Обработка клавиши Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.activeModal) {
                this.closeModal();
            }
        });
        
        // Обработка клика по затемнению
        this.modalContainer.addEventListener('click', (event) => {
            if (event.target === this.modalContainer) {
                this.closeModal();
            }
        });
    }
    
    /**
     * Показ модального окна
     */
    showModal(config) {
        // Закрываем предыдущее модальное окно, если оно есть
        if (this.activeModal) {
            this.closeModal();
        }
        
        const modalId = this.generateModalId();
        const modal = this.createModalElement(modalId, config);
        
        // Добавляем модальное окно в контейнер
        this.modalContainer.appendChild(modal);
        
        // Сохраняем ссылку на активное модальное окно
        this.activeModal = {
            id: modalId,
            element: modal,
            config: config,
            timestamp: Date.now()
        };
        
        // Добавляем в стек
        this.modalStack.push(this.activeModal);
        
        // Показываем модальное окно с анимацией
        this.showWithAnimation(modal);
        
        console.log('🪟 ModalService: Показано модальное окно:', config.title);
    }
    
    /**
     * Создание элемента модального окна
     */
    createModalElement(id, config) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'game-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${id}-title`);
        
        // Создаем содержимое модального окна
        const content = this.createModalContent(id, config);
        modal.appendChild(content);
        
        return modal;
    }
    
    /**
     * Создание содержимого модального окна
     */
    createModalContent(id, config) {
        const { title, content, type, actions = [] } = config;
        
        const modalContent = document.createElement('div');
        modalContent.className = `modal-content modal-${type || 'default'}`;
        
        // Заголовок
        if (title) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            
            const titleElement = document.createElement('h2');
            titleElement.id = `${id}-title`;
            titleElement.className = 'modal-title';
            titleElement.textContent = title;
            
            header.appendChild(titleElement);
            modalContent.appendChild(header);
        }
        
        // Содержимое
        if (content) {
            const body = document.createElement('div');
            body.className = 'modal-body';
            
            const contentElement = document.createElement('div');
            contentElement.className = 'modal-text';
            contentElement.textContent = content;
            
            body.appendChild(contentElement);
            
            // Добавляем дополнительную информацию в зависимости от типа
            this.addTypeSpecificContent(body, config);
            
            modalContent.appendChild(body);
        }
        
        // Действия
        if (actions.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            
            actions.forEach((action, index) => {
                const button = document.createElement('button');
                button.className = `modal-button modal-button-${action.type || 'primary'}`;
                button.textContent = action.text;
                
                if (action.type === 'disabled') {
                    button.disabled = true;
                }
                
                if (action.action) {
                    button.addEventListener('click', () => {
                        try {
                            action.action();
                        } catch (error) {
                            console.error('🪟 ModalService: Ошибка в действии кнопки:', error);
                        }
                    });
                }
                
                footer.appendChild(button);
            });
            
            modalContent.appendChild(footer);
        }
        
        return modalContent;
    }
    
    /**
     * Добавление специфичного для типа содержимого
     */
    addTypeSpecificContent(body, config) {
        const { type } = config;
        
        switch (type) {
            case 'money':
                if (config.income) {
                    const incomeElement = document.createElement('div');
                    incomeElement.className = 'modal-income';
                    incomeElement.innerHTML = `<span class="income-amount">+$${config.income}</span>`;
                    body.appendChild(incomeElement);
                }
                break;
                
            case 'dream':
            case 'business':
                if (config.price) {
                    const priceElement = document.createElement('div');
                    priceElement.className = 'modal-price';
                    priceElement.innerHTML = `<span class="price-amount">$${config.price}</span>`;
                    body.appendChild(priceElement);
                }
                if (config.rent) {
                    const rentElement = document.createElement('div');
                    rentElement.className = 'modal-rent';
                    rentElement.innerHTML = `<span class="rent-amount">Доход: $${config.rent}/ход</span>`;
                    body.appendChild(rentElement);
                }
                break;
                
            case 'loss':
            case 'expense':
                if (config.expense) {
                    const expenseElement = document.createElement('div');
                    expenseElement.className = 'modal-expense';
                    expenseElement.innerHTML = `<span class="expense-amount">-$${Math.abs(config.expense)}</span>`;
                    body.appendChild(expenseElement);
                }
                break;
                
            case 'charity':
                if (config.donationAmount) {
                    const donationElement = document.createElement('div');
                    donationElement.className = 'modal-donation';
                    donationElement.innerHTML = `
                        <span class="donation-amount">$${config.donationAmount}</span>
                        <span class="donation-percent">(${config.donationPercent}% от дохода)</span>
                    `;
                    body.appendChild(donationElement);
                }
                break;
        }
    }
    
    /**
     * Показ модального окна с анимацией
     */
    showWithAnimation(modal) {
        // Добавляем класс для анимации
        modal.classList.add('modal-showing');
        
        // Принудительно перерисовываем
        modal.offsetHeight;
        
        // Запускаем анимацию
        modal.classList.add('modal-visible');
        
        // Убираем класс анимации через некоторое время
        setTimeout(() => {
            modal.classList.remove('modal-showing');
        }, 300);
    }
    
    /**
     * Скрытие модального окна с анимацией
     */
    hideWithAnimation(modal) {
        modal.classList.add('modal-hiding');
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
    
    /**
     * Закрытие модального окна
     */
    closeModal() {
        if (!this.activeModal) {
            return;
        }
        
        const modal = this.activeModal;
        
        // Добавляем в историю
        this.modalHistory.push(modal);
        
        // Удаляем из стека
        this.modalStack = this.modalStack.filter(m => m.id !== modal.id);
        
        // Скрываем с анимацией
        this.hideWithAnimation(modal.element);
        
        // Очищаем ссылку на активное модальное окно
        this.activeModal = null;
        
        // Если есть модальные окна в стеке, показываем следующее
        if (this.modalStack.length > 0) {
            const nextModal = this.modalStack[this.modalStack.length - 1];
            this.activeModal = nextModal;
            this.showWithAnimation(nextModal.element);
        }
        
        console.log('🪟 ModalService: Модальное окно закрыто');
        
        // Отправляем событие о закрытии
        if (this.eventBus) {
            this.eventBus.emit('modal:closed', modal.config);
        }
    }
    
    /**
     * Закрытие всех модальных окон
     */
    closeAllModals() {
        // Закрываем все модальные окна в стеке
        while (this.modalStack.length > 0) {
            this.closeModal();
        }
        
        // Очищаем контейнер
        this.modalContainer.innerHTML = '';
        
        console.log('🪟 ModalService: Все модальные окна закрыты');
    }
    
    /**
     * Генерация уникального ID для модального окна
     */
    generateModalId() {
        return `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Проверка, активно ли модальное окно
     */
    isModalActive() {
        return this.activeModal !== null;
    }
    
    /**
     * Получение активного модального окна
     */
    getActiveModal() {
        return this.activeModal;
    }
    
    /**
     * Получение истории модальных окон
     */
    getHistory() {
        return [...this.modalHistory];
    }
    
    /**
     * Получение стека модальных окон
     */
    getStack() {
        return [...this.modalStack];
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.ModalService = ModalService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalService;
}
