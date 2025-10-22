/**
 * CellPopup v1.0.0
 * Компонент для отображения попапов с описанием клеток
 */

class CellPopup {
    constructor(config = {}) {
        this.eventBus = config.eventBus || null;
        this.isVisible = false;
        this.currentCellData = null;
        
        console.log('📋 CellPopup: Инициализация');
        this.init();
        
        // Делаем экземпляр доступным глобально
        if (typeof window !== 'undefined') {
            window.cellPopup = this;
        }
    }
    
    /**
     * Инициализация компонента
     */
    init() {
        this.createPopupElement();
        this.setupEventListeners();
        this.addStyles();
        
        console.log('✅ CellPopup: Инициализирован');
    }
    
    /**
     * Создание DOM элемента попапа
     */
    createPopupElement() {
        // Удаляем существующий попап если есть
        const existingPopup = document.getElementById('cell-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        const popup = document.createElement('div');
        popup.id = 'cell-popup';
        popup.className = 'cell-popup';
        popup.innerHTML = `
            <div class="cell-popup-content">
                <div class="cell-popup-header">
                    <div class="cell-popup-title">
                        <span class="cell-popup-icon"></span>
                        <span class="cell-popup-name"></span>
                    </div>
                    <button class="cell-popup-close" type="button">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="cell-popup-body">
                    <div class="cell-popup-description"></div>
                    <div class="cell-popup-details"></div>
                </div>
                <div class="cell-popup-footer">
                    <div class="cell-popup-actions"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        this.popupElement = popup;
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Закрытие по клику на кнопку
        const closeBtn = this.popupElement.querySelector('.cell-popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Закрытие по клику на фон
        this.popupElement.addEventListener('click', (e) => {
            if (e.target === this.popupElement) {
                this.hide();
            }
        });
        
        // Закрытие по Escape - сохраняем ссылку для удаления
        this.boundHandleKeydown = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.boundHandleKeydown);
        
        // Обработчик для кнопок действий
        this.popupElement.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'close') {
                this.hide();
            } else if (action === 'start') {
                this.handleStartAction();
            } else if (action === 'dream') {
                this.handleDreamAction();
            } else if (action === 'profession') {
                this.handleProfessionAction();
            }
        });
    }
    
    /**
     * Добавление стилей для попапа
     */
    addStyles() {
        if (document.getElementById('cell-popup-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'cell-popup-styles';
        styles.textContent = `
            .cell-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .cell-popup.show {
                display: flex;
                opacity: 1;
            }
            
            .cell-popup-content {
                background: #1a1a2e;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                max-width: 500px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .cell-popup.show .cell-popup-content {
                transform: scale(1);
            }
            
            .cell-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .cell-popup-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .cell-popup-icon {
                font-size: 24px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }
            
            .cell-popup-name {
                font-size: 20px;
                font-weight: 600;
                color: #ffffff;
                font-family: 'Inter', sans-serif;
            }
            
            .cell-popup-close {
                background: none;
                border: none;
                color: #9ca3af;
                font-size: 24px;
                cursor: pointer;
                padding: 4px;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .cell-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
            }
            
            .cell-popup-body {
                padding: 20px 24px;
            }
            
            .cell-popup-description {
                font-size: 16px;
                line-height: 1.6;
                color: #e5e7eb;
                margin-bottom: 16px;
                font-family: 'Inter', sans-serif;
            }
            
            .cell-popup-details {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 16px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .detail-item:last-child {
                border-bottom: none;
            }
            
            .detail-label {
                color: #9ca3af;
                font-size: 14px;
                font-weight: 500;
            }
            
            .detail-value {
                color: #ffffff;
                font-size: 14px;
                font-weight: 600;
            }
            
            .cell-popup-footer {
                padding: 16px 24px 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .cell-popup-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .popup-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: 'Inter', sans-serif;
            }
            
            .popup-btn-primary {
                background: #3b82f6;
                color: #ffffff;
            }
            
            .popup-btn-primary:hover {
                background: #2563eb;
                transform: translateY(-1px);
            }
            
            .popup-btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #e5e7eb;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .popup-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.15);
                color: #ffffff;
            }
            
            /* Адаптивность */
            @media (max-width: 768px) {
                .cell-popup {
                    padding: 16px;
                }
                
                .cell-popup-content {
                    max-width: 100%;
                }
                
                .cell-popup-header,
                .cell-popup-body,
                .cell-popup-footer {
                    padding: 16px;
                }
                
                .cell-popup-name {
                    font-size: 18px;
                }
                
                .cell-popup-description {
                    font-size: 14px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Показать попап с данными клетки
     */
    show(cellData, position, isInner) {
        if (!cellData) return;
        
        this.currentCellData = { ...cellData, position, isInner };
        this.updatePopupContent(cellData, position, isInner);
        
        this.popupElement.classList.add('show');
        this.isVisible = true;
        
        // Блокируем скролл страницы
        document.body.style.overflow = 'hidden';
        
        console.log('📋 CellPopup: Показан попап для клетки', cellData.name);
    }
    
    /**
     * Скрыть попап
     */
    hide() {
        try {
            console.log('📋 CellPopup: Скрытие попапа...');
            
            if (this.popupElement) {
                this.popupElement.classList.remove('show');
            }
            
            this.isVisible = false;
            this.currentCellData = null;
            
            // Разблокируем скролл страницы
            document.body.style.overflow = '';
            
            console.log('✅ CellPopup: Попап скрыт успешно');
        } catch (error) {
            console.error('❌ CellPopup: Ошибка при скрытии попапа:', error);
        }
    }
    
    /**
     * Обновление содержимого попапа
     */
    updatePopupContent(cellData, position, isInner) {
        const icon = this.getCellIcon(cellData);
        const name = cellData.name || `Клетка ${position + 1}`;
        const description = this.getCellDescription(cellData);
        const details = this.getCellDetails(cellData, position, isInner);
        const actions = this.getCellActions(cellData);
        
        // Обновляем заголовок
        const iconEl = this.popupElement.querySelector('.cell-popup-icon');
        const nameEl = this.popupElement.querySelector('.cell-popup-name');
        
        if (iconEl) iconEl.textContent = icon;
        if (nameEl) nameEl.textContent = name;
        
        // Обновляем описание
        const descEl = this.popupElement.querySelector('.cell-popup-description');
        if (descEl) descEl.textContent = description;
        
        // Обновляем детали
        const detailsEl = this.popupElement.querySelector('.cell-popup-details');
        if (detailsEl) {
            detailsEl.innerHTML = details;
        }
        
        // Обновляем действия
        const actionsEl = this.popupElement.querySelector('.cell-popup-actions');
        if (actionsEl) {
            actionsEl.innerHTML = actions;
        }
    }
    
    /**
     * Получить иконку клетки
     */
    getCellIcon(cellData) {
        if (typeof window.getIconForType === 'function') {
            return window.getIconForType(cellData.type, cellData) || '🎯';
        }
        return cellData.icon || '🎯';
    }
    
    /**
     * Получить описание клетки
     */
    getCellDescription(cellData) {
        if (cellData.description) {
            return cellData.description;
        }
        
        const typeDescriptions = {
            'start': 'Начальная клетка. Здесь начинается игра для всех игроков.',
            'dream': 'Клетка мечты. Выберите свою мечту для достижения в игре.',
            'profession': 'Клетка профессии. Получите профессию и начните зарабатывать деньги.',
            'charity': 'Клетка благотворительности. Поделитесь частью своих средств.',
            'investment': 'Клетка инвестиций. Вложите деньги в различные активы.',
            'expense': 'Клетка расходов. Необходимо потратить деньги на обязательные платежи.',
            'income': 'Клетка дохода. Получите дополнительный доход.',
            'market': 'Клетка рынка. Купите или продайте активы.',
            'bank': 'Клетка банка. Возьмите кредит или сделайте вклад.',
            'chance': 'Клетка шанса. Случайное событие может изменить вашу жизнь.',
            'tax': 'Клетка налогов. Оплатите налоги с ваших доходов.',
            'child': 'Клетка семьи. У вас родился ребенок!',
            'house': 'Клетка недвижимости. Купите дом или квартиру.',
            'car': 'Клетка транспорта. Приобретите автомобиль.',
            'education': 'Клетка образования. Инвестируйте в свои знания.'
        };
        
        return typeDescriptions[cellData.type] || 'Особая клетка с уникальными возможностями.';
    }
    
    /**
     * Получить детали клетки
     */
    getCellDetails(cellData, position, isInner) {
        const details = [];
        
        // Основная информация
        details.push(`
            <div class="detail-item">
                <span class="detail-label">Позиция</span>
                <span class="detail-value">${position + 1}</span>
            </div>
        `);
        
        details.push(`
            <div class="detail-item">
                <span class="detail-label">Тип</span>
                <span class="detail-value">${this.getTypeName(cellData.type)}</span>
            </div>
        `);
        
        details.push(`
            <div class="detail-item">
                <span class="detail-label">Трек</span>
                <span class="detail-value">${isInner ? 'Малый круг' : 'Большой круг'}</span>
            </div>
        `);
        
        // Дополнительные параметры
        if (cellData.cost) {
            details.push(`
                <div class="detail-item">
                    <span class="detail-label">Стоимость</span>
                    <span class="detail-value">$${cellData.cost.toLocaleString()}</span>
                </div>
            `);
        }
        
        if (cellData.income) {
            details.push(`
                <div class="detail-item">
                    <span class="detail-label">Доход</span>
                    <span class="detail-value">$${cellData.income.toLocaleString()}</span>
                </div>
            `);
        }
        
        if (cellData.expense) {
            details.push(`
                <div class="detail-item">
                    <span class="detail-label">Расход</span>
                    <span class="detail-value">$${cellData.expense.toLocaleString()}</span>
                </div>
            `);
        }
        
        return details.join('');
    }
    
    /**
     * Получить действия для клетки
     */
    getCellActions(cellData) {
        const actions = [];
        
        // Общие действия
        actions.push(`
            <button class="popup-btn popup-btn-secondary" data-action="close">
                Закрыть
            </button>
        `);
        
        // Специфичные действия в зависимости от типа
        if (cellData.type === 'start') {
            actions.push(`
                <button class="popup-btn popup-btn-primary" data-action="start">
                    Начать игру
                </button>
            `);
        }
        
        if (cellData.type === 'dream') {
            actions.push(`
                <button class="popup-btn popup-btn-primary" data-action="dream">
                    Выбрать мечту
                </button>
            `);
        }
        
        if (cellData.type === 'profession') {
            actions.push(`
                <button class="popup-btn popup-btn-primary" data-action="profession">
                    Получить профессию
                </button>
            `);
        }
        
        return actions.join('');
    }
    
    /**
     * Получить название типа клетки
     */
    getTypeName(type) {
        const typeNames = {
            'start': 'Старт',
            'dream': 'Мечта',
            'profession': 'Профессия',
            'charity': 'Благотворительность',
            'investment': 'Инвестиции',
            'expense': 'Расходы',
            'income': 'Доход',
            'market': 'Рынок',
            'bank': 'Банк',
            'chance': 'Шанс',
            'tax': 'Налоги',
            'child': 'Семья',
            'house': 'Недвижимость',
            'car': 'Транспорт',
            'education': 'Образование'
        };
        
        return typeNames[type] || 'Особая';
    }
    
    /**
     * Обработчики действий
     */
    handleStartAction() {
        console.log('🚀 CellPopup: Действие "Начать игру"');
        this.hide();
        
        if (this.eventBus) {
            this.eventBus.emit('cell:startAction', this.currentCellData);
        }
    }
    
    handleDreamAction() {
        console.log('💭 CellPopup: Действие "Выбрать мечту"');
        this.hide();
        
        if (this.eventBus) {
            this.eventBus.emit('cell:dreamAction', this.currentCellData);
        }
    }
    
    handleProfessionAction() {
        console.log('💼 CellPopup: Действие "Получить профессию"');
        this.hide();
        
        if (this.eventBus) {
            this.eventBus.emit('cell:professionAction', this.currentCellData);
        }
    }
    
    /**
     * Уничтожение компонента - удаление всех слушателей и DOM элементов
     */
    destroy() {
        console.log('🗑️ CellPopup: Уничтожение компонента');
        
        // Удаляем обработчик Escape клавиши
        if (this.boundHandleKeydown) {
            document.removeEventListener('keydown', this.boundHandleKeydown);
            this.boundHandleKeydown = null;
        }
        
        // Скрываем попап если он виден
        if (this.isVisible) {
            this.hide();
        }
        
        // Удаляем DOM элемент
        if (this.popupElement && this.popupElement.parentNode) {
            this.popupElement.parentNode.removeChild(this.popupElement);
        }
        
        // Очищаем все ссылки
        this.popupElement = null;
        this.isVisible = false;
        this.currentCellData = null;
        this.eventBus = null;
    }
}

// Экспортируем в глобальную область
if (typeof window !== 'undefined') {
    window.CellPopup = CellPopup;
}
