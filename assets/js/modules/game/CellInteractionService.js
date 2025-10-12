/**
 * CellInteractionService v1.0.0
 * -----------------------------------------------------------------------------
 * Сервис для обработки взаимодействия с клетками игрового поля
 */
class CellInteractionService {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.balanceManager = config.balanceManager || null;
        
        // Состояние взаимодействий
        this.activeInteraction = null;
        this.interactionHistory = [];
        
        // Обработчики для разных типов клеток
        this.cellHandlers = {
            'money': this.handleMoneyCell.bind(this),
            'dream': this.handleDreamCell.bind(this),
            'business': this.handleBusinessCell.bind(this),
            'loss': this.handleLossCell.bind(this),
            'chance': this.handleChanceCell.bind(this),
            'charity': this.handleCharityCell.bind(this),
            'market': this.handleMarketCell.bind(this),
            'family': this.handleFamilyCell.bind(this),
            'expense': this.handleExpenseCell.bind(this),
            'start': this.handleStartCell.bind(this)
        };
        
        console.log('🎯 CellInteractionService: Инициализация...');
        this.setupEventListeners();
        console.log('✅ CellInteractionService: Инициализация завершена');
    }
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('movement:landed', this.handleCellLanding.bind(this));
            this.eventBus.on('cell:clicked', this.handleCellClick.bind(this));
            this.eventBus.on('game:reset', this.reset.bind(this));
        }
    }
    
    /**
     * Обработка попадания на клетку
     */
    handleCellLanding(event) {
        const { playerId, position, cellData } = event;
        
        if (!cellData) {
            console.warn('🎯 CellInteractionService: Данные клетки не найдены');
            return;
        }
        
        console.log(`🎯 CellInteractionService: Игрок ${playerId} попал на клетку:`, cellData);
        
        // Создаем объект взаимодействия
        const interaction = {
            id: this.generateInteractionId(),
            playerId,
            position,
            cellData,
            timestamp: Date.now(),
            handled: false
        };
        
        this.activeInteraction = interaction;
        
        // Обрабатываем клетку в зависимости от типа
        this.processCellInteraction(interaction);
    }
    
    /**
     * Обработка клика по клетке
     */
    handleCellClick(event) {
        const { position, cellData } = event;
        
        if (!cellData) {
            console.warn('🎯 CellInteractionService: Данные клетки не найдены');
            return;
        }
        
        console.log('🎯 CellInteractionService: Клик по клетке:', cellData);
        
        // Показываем информацию о клетке
        this.showCellInfo(cellData);
    }
    
    /**
     * Обработка взаимодействия с клеткой
     */
    processCellInteraction(interaction) {
        const { cellData, playerId } = interaction;
        const cellType = cellData.type || 'unknown';
        
        // Получаем обработчик для типа клетки
        const handler = this.cellHandlers[cellType];
        
        if (handler) {
            try {
                handler(interaction);
            } catch (error) {
                console.error(`🎯 CellInteractionService: Ошибка обработки клетки типа ${cellType}:`, error);
                this.handleError(interaction, error);
            }
        } else {
            console.warn(`🎯 CellInteractionService: Неизвестный тип клетки: ${cellType}`);
            this.handleUnknownCell(interaction);
        }
        
        // Отмечаем как обработанную
        interaction.handled = true;
        this.addToHistory(interaction);
        
        // Отправляем событие о завершении взаимодействия
        if (this.eventBus) {
            this.eventBus.emit('cell:interaction_completed', interaction);
        }
    }
    
    /**
     * Обработка клетки денег (доход)
     */
    handleMoneyCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description, income } = cellData;
        
        // Применяем доход
        if (income > 0 && this.balanceManager) {
            this.balanceManager.updateBalance(playerId, income);
        }
        
        // Показываем модальное окно
        this.showModal({
            title: name,
            content: description,
            type: 'money',
            income: income,
            actions: [
                {
                    text: 'Получить доход',
                    type: 'primary',
                    action: () => {
                        if (income > 0 && this.balanceManager) {
                            this.balanceManager.updateBalance(playerId, income);
                        }
                        this.closeModal();
                    }
                }
            ]
        });
    }
    
    /**
     * Обработка клетки мечты
     */
    handleDreamCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description, price } = cellData;
        
        // Проверяем, может ли игрок купить мечту
        const canAfford = this.balanceManager ? 
            this.balanceManager.getBalance(playerId) >= price : false;
        
        this.showModal({
            title: name,
            content: description,
            type: 'dream',
            price: price,
            canAfford: canAfford,
            actions: [
                {
                    text: canAfford ? `Купить за $${price}` : 'Недостаточно средств',
                    type: canAfford ? 'primary' : 'disabled',
                    action: canAfford ? () => {
                        if (this.balanceManager) {
                            this.balanceManager.updateBalance(playerId, -price);
                        }
                        this.closeModal();
                        this.eventBus?.emit('dream:purchased', { playerId, dream: cellData });
                    } : null
                },
                {
                    text: 'Пропустить',
                    type: 'secondary',
                    action: () => this.closeModal()
                }
            ]
        });
    }
    
    /**
     * Обработка клетки бизнеса
     */
    handleBusinessCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description, price, rent } = cellData;
        
        // Проверяем, может ли игрок купить бизнес
        const canAfford = this.balanceManager ? 
            this.balanceManager.getBalance(playerId) >= price : false;
        
        this.showModal({
            title: name,
            content: description,
            type: 'business',
            price: price,
            rent: rent,
            canAfford: canAfford,
            actions: [
                {
                    text: canAfford ? `Купить за $${price}` : 'Недостаточно средств',
                    type: canAfford ? 'primary' : 'disabled',
                    action: canAfford ? () => {
                        if (this.balanceManager) {
                            this.balanceManager.updateBalance(playerId, -price);
                        }
                        this.closeModal();
                        this.eventBus?.emit('business:purchased', { playerId, business: cellData });
                    } : null
                },
                {
                    text: 'Пропустить',
                    type: 'secondary',
                    action: () => this.closeModal()
                }
            ]
        });
    }
    
    /**
     * Обработка клетки потерь
     */
    handleLossCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description, expense } = cellData;
        
        // Проверяем, может ли игрок заплатить
        const currentBalance = this.balanceManager ? 
            this.balanceManager.getBalance(playerId) : 0;
        const canAfford = currentBalance >= Math.abs(expense);
        
        this.showModal({
            title: name,
            content: description,
            type: 'loss',
            expense: expense,
            canAfford: canAfford,
            actions: [
                {
                    text: canAfford ? `Заплатить $${Math.abs(expense)}` : 'Банкротство',
                    type: canAfford ? 'danger' : 'warning',
                    action: () => {
                        if (canAfford && this.balanceManager) {
                            this.balanceManager.updateBalance(playerId, expense);
                        } else {
                            // Обработка банкротства
                            this.eventBus?.emit('player:bankruptcy', { playerId });
                        }
                        this.closeModal();
                    }
                }
            ]
        });
    }
    
    /**
     * Обработка клетки шанса
     */
    handleChanceCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description } = cellData;
        
        this.showModal({
            title: name,
            content: description,
            type: 'chance',
            actions: [
                {
                    text: 'Выбрать малую возможность',
                    type: 'primary',
                    action: () => {
                        this.closeModal();
                        this.eventBus?.emit('chance:small_opportunity', { playerId });
                    }
                },
                {
                    text: 'Выбрать большую возможность',
                    type: 'primary',
                    action: () => {
                        this.closeModal();
                        this.eventBus?.emit('chance:big_opportunity', { playerId });
                    }
                }
            ]
        });
    }
    
    /**
     * Обработка клетки благотворительности
     */
    handleCharityCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description, customData } = cellData;
        const donationPercent = customData?.donationPercent || 10;
        
        const currentBalance = this.balanceManager ? 
            this.balanceManager.getBalance(playerId) : 0;
        const donationAmount = Math.round(currentBalance * donationPercent / 100);
        
        this.showModal({
            title: name,
            content: description,
            type: 'charity',
            donationAmount: donationAmount,
            donationPercent: donationPercent,
            actions: [
                {
                    text: `Пожертвовать $${donationAmount}`,
                    type: 'primary',
                    action: () => {
                        if (this.balanceManager) {
                            this.balanceManager.updateBalance(playerId, -donationAmount);
                        }
                        this.eventBus?.emit('charity:double_dice_enabled');
                        this.closeModal();
                    }
                },
                {
                    text: 'Отказаться',
                    type: 'secondary',
                    action: () => this.closeModal()
                }
            ]
        });
    }
    
    /**
     * Обработка клетки рынка
     */
    handleMarketCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description } = cellData;
        
        this.showModal({
            title: name,
            content: description,
            type: 'market',
            actions: [
                {
                    text: 'Просмотреть предложения',
                    type: 'primary',
                    action: () => {
                        this.closeModal();
                        this.eventBus?.emit('market:show_offers', { playerId });
                    }
                }
            ]
        });
    }
    
    /**
     * Обработка клетки семьи
     */
    handleFamilyCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description } = cellData;
        
        this.showModal({
            title: name,
            content: description,
            type: 'family',
            actions: [
                {
                    text: 'Принять изменения',
                    type: 'primary',
                    action: () => {
                        this.closeModal();
                        this.eventBus?.emit('family:expense_increase', { playerId });
                    }
                }
            ]
        });
    }
    
    /**
     * Обработка клетки трат
     */
    handleExpenseCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description, customData } = cellData;
        const expenseRange = customData?.expenseRange || [100, 4000];
        
        // Генерируем случайную сумму трат
        const expense = Math.floor(Math.random() * (expenseRange[1] - expenseRange[0] + 1)) + expenseRange[0];
        
        const currentBalance = this.balanceManager ? 
            this.balanceManager.getBalance(playerId) : 0;
        const canAfford = currentBalance >= expense;
        
        this.showModal({
            title: name,
            content: description,
            type: 'expense',
            expense: expense,
            canAfford: canAfford,
            actions: [
                {
                    text: canAfford ? `Заплатить $${expense}` : 'Недостаточно средств',
                    type: canAfford ? 'danger' : 'disabled',
                    action: canAfford ? () => {
                        if (this.balanceManager) {
                            this.balanceManager.updateBalance(playerId, -expense);
                        }
                        this.closeModal();
                    } : null
                }
            ]
        });
    }
    
    /**
     * Обработка стартовой клетки
     */
    handleStartCell(interaction) {
        const { cellData, playerId } = interaction;
        const { name, description } = cellData;
        
        this.showModal({
            title: name,
            content: description,
            type: 'start',
            actions: [
                {
                    text: 'Продолжить',
                    type: 'primary',
                    action: () => this.closeModal()
                }
            ]
        });
    }
    
    /**
     * Обработка неизвестной клетки
     */
    handleUnknownCell(interaction) {
        const { cellData, playerId } = interaction;
        
        this.showModal({
            title: cellData.name || 'Неизвестная клетка',
            content: cellData.description || 'Описание не найдено',
            type: 'unknown',
            actions: [
                {
                    text: 'Продолжить',
                    type: 'primary',
                    action: () => this.closeModal()
                }
            ]
        });
    }
    
    /**
     * Обработка ошибки
     */
    handleError(interaction, error) {
        this.showModal({
            title: 'Ошибка',
            content: `Произошла ошибка при обработке клетки: ${error.message}`,
            type: 'error',
            actions: [
                {
                    text: 'Закрыть',
                    type: 'primary',
                    action: () => this.closeModal()
                }
            ]
        });
    }
    
    /**
     * Показ модального окна
     */
    showModal(config) {
        if (this.eventBus) {
            this.eventBus.emit('modal:show', config);
        }
    }
    
    /**
     * Закрытие модального окна
     */
    closeModal() {
        if (this.eventBus) {
            this.eventBus.emit('modal:close');
        }
    }
    
    /**
     * Показ информации о клетке
     */
    showCellInfo(cellData) {
        this.showModal({
            title: cellData.name,
            content: cellData.description,
            type: 'info',
            actions: [
                {
                    text: 'Закрыть',
                    type: 'primary',
                    action: () => this.closeModal()
                }
            ]
        });
    }
    
    /**
     * Добавление взаимодействия в историю
     */
    addToHistory(interaction) {
        this.interactionHistory.unshift(interaction);
        
        // Ограничиваем длину истории
        if (this.interactionHistory.length > 50) {
            this.interactionHistory = this.interactionHistory.slice(0, 50);
        }
    }
    
    /**
     * Генерация уникального ID для взаимодействия
     */
    generateInteractionId() {
        return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Получение истории взаимодействий
     */
    getHistory() {
        return [...this.interactionHistory];
    }
    
    /**
     * Получение текущего взаимодействия
     */
    getActiveInteraction() {
        return this.activeInteraction;
    }
    
    /**
     * Сброс состояния
     */
    reset() {
        this.activeInteraction = null;
        this.interactionHistory = [];
        console.log('🎯 CellInteractionService: Состояние сброшено');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.CellInteractionService = CellInteractionService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CellInteractionService;
}
