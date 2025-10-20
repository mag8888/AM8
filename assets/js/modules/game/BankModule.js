/**
 * BankModule v1.0.0
 * Банковский модуль для управления финансами игроков
 * Включает систему зарплаты, переводы между игроками и кредиты
 */

class BankModule {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.roomApi = config.roomApi || null;
        this.professionSystem = config.professionSystem || null;
        this.gameStateManager = config.gameStateManager || null;
        this.currentUserId = null;
        this.currentRoomId = this._getCurrentRoomId();
        
        // Состояние банка
        this.bankState = {
            balance: 0,
            income: 0,
            expenses: 0,
            salary: 0,
            credit: 0,
            maxCredit: 10000,
            transactions: []
        };
        
        // UI элементы
        this.ui = null;
        this.isOpen = false;
        
        // Кэш DOM элементов для производительности
        this.domCache = {
            balanceElement: null,
            incomeElement: null,
            expensesElement: null,
            creditElement: null,
            transactionsList: null,
            newBadge: null
        };
        
        console.log('🏦 BankModule: Инициализирован');
        this.init();
    }
    
    /**
     * Инициализация модуля
     */
    init() {
        this.initCurrentUser();
        this.createUI();
        this.setupEventListeners();
    }
    
    /**
     * Обновление баланса игрока
     * @param {Object} player - Данные игрока
     */
    updatePlayerBalance(player) {
        if (!player) return;
        
        try {
            // Обновляем баланс в состоянии банка
            const balance = player.balance || player.money || player.cash || 0;
            this.bankState.balance = balance;
            
            // Обновляем UI, если банк открыт
            if (this.isOpen && this.ui) {
                this.updateBalanceDisplay();
            }
            
            console.log('💰 BankModule: Баланс игрока обновлен:', balance);
        } catch (error) {
            console.warn('⚠️ BankModule: Ошибка обновления баланса:', error);
        }
    }
    
    /**
     * Обновление отображения баланса в UI
     */
    updateBalanceDisplay() {
        if (!this.ui) return;
        
        const balanceElement = this.ui.querySelector('.bank-balance-amount');
        if (balanceElement) {
            balanceElement.textContent = `$${this.bankState.balance.toLocaleString()}`;
        }
    }
    
    /**
     * Инициализация текущего пользователя
     */
    initCurrentUser() {
        try {
            // Пробуем получить пользователя из разных источников
            let userData = localStorage.getItem('currentUser');
            if (!userData) {
                userData = localStorage.getItem('aura_money_user');
            }
            
            if (userData) {
                const user = JSON.parse(userData);
                this.currentUserId = user.id;
                console.log('🏦 BankModule: Текущий пользователь найден:', user.username, user.id);
            } else {
                console.warn('⚠️ BankModule: Пользователь не найден в localStorage');
            }
        } catch (error) {
            console.warn('⚠️ BankModule: Ошибка получения пользователя:', error);
        }
    }
    
    /**
     * Создание UI банк модуля
     */
    createUI() {
        const bankModuleHTML = `
            <div id="bank-module" class="bank-module" style="display: none;">
                <div class="bank-overlay"></div>
                <div class="bank-container">
                    <div class="bank-header">
                        <div class="bank-title">
                            <span class="bank-icon">🏦</span>
                            <span>Банковские операции</span>
                        </div>
                        <button class="bank-close" id="bank-close">✕</button>
                    </div>
                    
                    <div class="bank-content">
                        <div class="bank-left">
                            <div class="bank-status">
                                <div class="bank-status-header">
                                    <span class="bank-icon">🏦</span>
                                    <span>Банк</span>
                                    <span class="status-badge active">Активен</span>
                                </div>
                                
                                <div class="current-balance">
                                    <div class="balance-amount" id="bank-balance">$3 000</div>
                                    <div class="balance-description">Доступно для операций</div>
                                </div>
                                
                                <div class="financial-summary">
                                    <div class="summary-item">
                                        <span class="summary-icon income">📈</span>
                                        <span class="summary-label">Доход:</span>
                                        <span class="summary-value income" id="bank-income">$10 000</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-icon expense">📉</span>
                                        <span class="summary-label">Расходы:</span>
                                        <span class="summary-value expense" id="bank-expenses">$6 200</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-icon payday">💰</span>
                                        <span class="summary-label">PAYDAY:</span>
                                        <span class="summary-value payday" id="bank-salary">$10 000/мес</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-icon net">💎</span>
                                        <span class="summary-label">Чистый доход:</span>
                                        <span class="summary-value net" id="bank-net-income">$3 800/мес</span>
                                    </div>
                                </div>
                                
                                <div class="profession-details" id="profession-details">
                                    <div class="profession-header">
                                        <span class="profession-icon">💼</span>
                                        <span class="profession-name">Предприниматель</span>
                                        <span class="profession-title">Владелец бизнеса</span>
                                    </div>
                                    
                                    <div class="expenses-breakdown">
                                        <div class="expense-item">
                                            <span class="expense-label">Налоги (13%):</span>
                                            <span class="expense-amount">$1 300</span>
                                            <span class="expense-status no-payoff">Нельзя погасить</span>
                                        </div>
                                        <div class="expense-item">
                                            <span class="expense-label">Прочие расходы:</span>
                                            <span class="expense-amount">$1 500</span>
                                            <span class="expense-status no-payoff">Нельзя погасить</span>
                                        </div>
                                        <div class="expense-item">
                                            <span class="expense-label">Кредит на авто:</span>
                                            <span class="expense-amount">$700</span>
                                            <button class="payoff-btn" data-loan="carLoan">Погасить $14 000</button>
                                        </div>
                                        <div class="expense-item">
                                            <span class="expense-label">Образовательный кредит:</span>
                                            <span class="expense-amount">$500</span>
                                            <button class="payoff-btn" data-loan="educationLoan">Погасить $10 000</button>
                                        </div>
                                        <div class="expense-item">
                                            <span class="expense-label">Кредитные карты:</span>
                                            <span class="expense-amount">$1 000</span>
                                            <button class="payoff-btn" data-loan="creditCards">Погасить $20 000</button>
                                        </div>
                                        <div class="expense-item">
                                            <span class="expense-label">Ипотека студия:</span>
                                            <span class="expense-amount">$1 200</span>
                                            <button class="payoff-btn" data-loan="mortgage">Погасить $48 000</button>
                                        </div>
                                        <div class="expense-item">
                                            <span class="expense-label">Расходы на детей:</span>
                                            <span class="expense-amount" id="children-expense">$0</span>
                                            <button class="add-child-btn" id="add-child">Добавить ребенка</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="credit-info">
                                    <div class="credit-item">
                                        <span class="credit-icon">💳</span>
                                        <span class="credit-label">Кредит:</span>
                                        <span class="credit-value" id="bank-credit">$0</span>
                                    </div>
                                    <div class="credit-item">
                                        <span class="credit-label">Макс. кредит:</span>
                                        <span class="credit-value max" id="bank-max-credit">$10 000</span>
                                    </div>
                                    <div class="credit-actions"><!-- скрыто --></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bank-right">
                            <div class="transfer-section">
                                <div class="section-title">
                                    <span class="section-icon">💸</span>
                                    <span>Перевод средств</span>
                                </div>
                                
                                <div class="transfer-form">
                                    <div class="form-group">
                                        <label for="transfer-recipient">Получатель</label>
                                        <select id="transfer-recipient" class="form-select">
                                            <option value="">Выберите игрока</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="transfer-amount">Сумма ($)</label>
                                        <div class="amount-input">
                                            <input type="number" id="transfer-amount" class="form-input" placeholder="0" min="1">
                                            <button class="amount-eye" id="amount-eye">👁</button>
                                        </div>
                                    </div>
                                    
                                    <div class="transfer-actions">
                                        <button class="transfer-btn" id="transfer-execute">
                                            <span class="btn-icon">✈</span>
                                            <span>ВЫПОЛНИТЬ ПЕРЕВОД</span>
                                        </button>
                                        <button class="transfer-reset" id="transfer-reset">СБРОСИТЬ</button>
                                    </div>
                                    <div class="loan-inline" style="margin-top:12px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.1)">
                                        <label for="loan-amount">Кредит (шаг 1000)</label>
                                        <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
                                            <input type="number" id="loan-amount" class="form-input" placeholder="0" min="0" step="1000">
                                            <button class="transfer-btn" id="loan-take" style="min-width:120px">ВЗЯТЬ</button>
                                            <button class="transfer-reset" id="loan-repay" style="min-width:120px">ПОГАСИТЬ</button>
                                        </div>
                                        <div style="margin-top:8px;opacity:.85;display:flex;gap:16px">
                                            <div>Баланс: <span id="loan-balance">$0</span></div>
                                            <div>Макс.: <span id="loan-max">$0</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="transactions-section">
                                <div class="section-title">
                                    <span class="section-icon">🕐</span>
                                    <span>История операций</span>
                                    <span class="new-badge" id="new-transactions">0</span>
                                </div>
                                
                                <div class="transactions-list" id="transactions-list">
                                    <div class="transaction-item">
                                        <div class="transaction-info">
                                            <div class="transaction-title">Начальный баланс профессии</div>
                                            <div class="transaction-details">Банк → Игрок</div>
                                            <div class="transaction-time">08.09.2025, 08:59:18</div>
                                        </div>
                                        <div class="transaction-amount positive">+$3 000</div>
                                        <div class="transaction-status completed">Завершено</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем HTML в body
        document.body.insertAdjacentHTML('beforeend', bankModuleHTML);
        this.ui = document.getElementById('bank-module');
        
        // Инициализируем кэш DOM элементов для производительности
        this.initializeDOMCache();
        
        // Добавляем стили
        this.addStyles();
        
        console.log('🏦 BankModule: UI создан');
    }
    
    /**
     * Добавление CSS стилей
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .bank-module {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .bank-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
            }
            
            .bank-container {
                position: relative;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
                border-radius: 20px;
                border: 2px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                width: 96%;
                max-width: 1400px;
                height: 92%;
                max-height: none;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .bank-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(255, 255, 255, 0.05);
            }
            
            .bank-title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.5rem;
                font-weight: 600;
                color: white;
            }
            
            .bank-icon {
                font-size: 1.8rem;
            }
            
            .bank-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }
            
            .bank-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .bank-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .bank-left {
                flex: 1;
                padding: 30px;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                overflow-y: auto;
            }
            
            .bank-right {
                flex: 1;
                padding: 30px;
                overflow-y: auto;
            }
            
            .bank-status {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                padding: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .bank-status-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 25px;
            }
            
            .status-badge {
                background: #10b981;
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
                margin-left: auto;
            }
            
            .current-balance {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .balance-amount {
                font-size: 3rem;
                font-weight: 700;
                color: #10b981;
                margin-bottom: 8px;
            }
            
            .balance-description {
                color: rgba(255, 255, 255, 0.7);
                font-size: 1rem;
            }
            
            .financial-summary {
                margin-bottom: 30px;
            }
            
            .summary-item {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 15px;
            }
            
            .summary-icon {
                font-size: 1.2rem;
            }
            
            .summary-label {
                color: white;
                font-weight: 500;
                min-width: 80px;
            }
            
            .summary-value {
                font-weight: 600;
                margin-left: auto;
            }
            
            .summary-value.income {
                color: #10b981;
            }
            
            .summary-value.expense {
                color: #ef4444;
            }
            
            .summary-value.payday {
                color: #f59e0b;
            }
            
            .credit-info {
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 20px;
            }
            
            .credit-item {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 15px;
            }
            
            .credit-icon {
                font-size: 1.2rem;
            }
            
            .credit-label {
                color: white;
                font-weight: 500;
                min-width: 100px;
            }
            
            .credit-value {
                font-weight: 600;
                margin-left: auto;
            }
            
            .credit-value.max {
                color: #8b5cf6;
            }
            
            .credit-actions {
                display: flex;
                gap: 12px;
                margin-top: 20px;
            }
            
            .credit-status-btn {
                background: #10b981;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
            }
            
            .credit-take-btn {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .transfer-section, .transactions-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                padding: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 20px;
            }
            
            .section-title {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                font-size: 1.2rem;
                font-weight: 600;
                color: white;
            }
            
            .section-icon {
                font-size: 1.4rem;
            }
            
            .new-badge {
                background: #8b5cf6;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
                margin-left: auto;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                color: white;
                font-weight: 500;
                margin-bottom: 8px;
            }
            
            .form-select, .form-input {
                width: 100%;
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: white;
                font-size: 1rem;
            }
            
            .form-select:focus, .form-input:focus {
                outline: none;
                border-color: #10b981;
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
            }
            
            .amount-input {
                position: relative;
            }
            
            .amount-eye {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 1.2rem;
            }
            
            .transfer-actions {
                display: flex;
                gap: 12px;
            }
            
            .transfer-btn {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .transfer-reset {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
            }
            .loan-inline input.form-input { max-width: 160px; }
            
            .transactions-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .transaction-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                margin-bottom: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .transaction-info {
                flex: 1;
            }
            
            .transaction-title {
                color: white;
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .transaction-details {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9rem;
                margin-bottom: 2px;
            }
            
            .transaction-time {
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.8rem;
            }
            
            .transaction-amount {
                font-weight: 700;
                font-size: 1.1rem;
            }
            
            .transaction-amount.positive {
                color: #10b981;
            }
            
            .transaction-amount.negative {
                color: #ef4444;
            }
            
            .transaction-status {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
            }
            
            .transaction-status.completed {
                background: #10b981;
                color: white;
            }
            
            .transaction-status.pending {
                background: #f59e0b;
                color: white;
            }
            
            .transaction-status.failed {
                background: #ef4444;
                color: white;
            }
            
            .profession-details {
                margin-top: 25px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .profession-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .profession-icon {
                font-size: 1.4rem;
            }
            
            .profession-name {
                color: white;
                font-weight: 600;
                font-size: 1.1rem;
            }
            
            .profession-title {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9rem;
                margin-left: auto;
            }
            
            .expenses-breakdown {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .expense-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .expense-label {
                color: white;
                font-weight: 500;
                min-width: 140px;
                font-size: 0.9rem;
            }
            
            .expense-amount {
                color: #ef4444;
                font-weight: 600;
                min-width: 80px;
                text-align: right;
            }
            
            .expense-status {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
                margin-left: auto;
            }
            
            .expense-status.no-payoff {
                background: rgba(107, 114, 128, 0.3);
                color: #9ca3af;
            }
            
            .payoff-btn {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-left: auto;
            }
            
            .payoff-btn:hover {
                background: linear-gradient(135deg, #059669, #047857);
                transform: translateY(-1px);
            }
            
            .payoff-btn:disabled {
                background: rgba(107, 114, 128, 0.3);
                color: #9ca3af;
                cursor: not-allowed;
                transform: none;
            }
            
            .add-child-btn {
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-left: auto;
            }
            
            .add-child-btn:hover {
                background: linear-gradient(135deg, #7c3aed, #6d28d9);
                transform: translateY(-1px);
            }
            
            .add-child-btn:disabled {
                background: rgba(107, 114, 128, 0.3);
                color: #9ca3af;
                cursor: not-allowed;
                transform: none;
            }
            
            .summary-value.net {
                color: #10b981;
            }
            
            /* Адаптивность */
            @media (max-width: 768px) {
                .bank-container {
                    width: 95%;
                    height: 90%;
                }
                
                .bank-content {
                    flex-direction: column;
                }
                
                .bank-left, .bank-right {
                    flex: none;
                    border-right: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .balance-amount {
                    font-size: 2.5rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Инициализация кэша DOM элементов для производительности
     */
    initializeDOMCache() {
        if (!this.ui) return;
        
        // Кэшируем часто используемые элементы
        this.domCache.balanceElement = this.ui.querySelector('#bank-balance');
        this.domCache.incomeElement = this.ui.querySelector('#bank-income');
        this.domCache.expensesElement = this.ui.querySelector('#bank-expenses');
        this.domCache.creditElement = this.ui.querySelector('#bank-credit');
        this.domCache.transactionsList = this.ui.querySelector('#transactions-list');
        this.domCache.newBadge = this.ui.querySelector('#new-transactions');
        
        console.log('🏦 BankModule: DOM кэш инициализирован');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Добавляем слушатель событий для обновления данных банка
        if (this.eventBus) {
            this.eventBus.on('game:playersUpdated', () => {
                if (this.isOpen) {
                    // Немедленное обновление без задержки для ускорения
                    this.updateBankData();
                }
            });
            
            this.eventBus.on('bank:balanceUpdated', () => {
                if (this.isOpen) {
                    // Немедленное обновление без задержки для ускорения
                    this.updateBankData();
                }
            });
        }
        // Закрытие модуля
        const closeBtn = this.ui.querySelector('#bank-close');
        closeBtn.addEventListener('click', async () => await this.close());
        
        // Закрытие по клику на overlay
        const overlay = this.ui.querySelector('.bank-overlay');
        overlay.addEventListener('click', async () => await this.close());
        
        // Переводы
        const transferExecute = this.ui.querySelector('#transfer-execute');
        transferExecute.addEventListener('click', async () => await this.executeTransfer());
        
        const transferReset = this.ui.querySelector('#transfer-reset');
        transferReset.addEventListener('click', () => this.resetTransferForm());
        
        // Кредиты
        const creditTake = this.ui.querySelector('#credit-take');
        if (creditTake) creditTake.addEventListener('click', () => this.takeCredit());
        const loanTake = this.ui.querySelector('#loan-take');
        const loanRepay = this.ui.querySelector('#loan-repay');
        if (loanTake) loanTake.addEventListener('click', async () => await this.takeCreditInline());
        if (loanRepay) loanRepay.addEventListener('click', async () => await this.repayCreditInline());
        
        // Погашение кредитов
        const payoffButtons = this.ui.querySelectorAll('.payoff-btn');
        payoffButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const loanType = e.target.dataset.loan;
                await this.payOffLoan(loanType);
            });
        });
        
        // Добавление ребенка
        const addChildBtn = this.ui.querySelector('#add-child');
        if (addChildBtn) {
            addChildBtn.addEventListener('click', async () => await this.addChild());
        }
        
        console.log('🏦 BankModule: Обработчики настроены');
    }

    async takeCreditInline() {
        let amount = Math.max(0, Math.floor((parseInt(this.ui.querySelector('#loan-amount').value)||0)/1000)*1000);
        
        // Получаем текущего игрока с fallback логикой
        let player = await this.getCurrentUserPlayer();
        if (!player) {
            player = await this.getCurrentUserPlayerWithFallback();
        }
        
        if (!player) {
            this.showNotification('Ошибка: Текущий игрок не найден', 'error');
            return;
        }
        
        const profId = player?.profession || 'entrepreneur';
        const ps = this.professionSystem;
        
        // Ограничение: не больше доступного лимита (maxLoan - currentLoan)
        const details = ps?.getProfessionDetails?.(profId, {
            money: player.balance || player.money || 0,
            children: player.children || 0,
            paidOffLoans: player.paidOffLoans || {},
            extraIncome: player.extraIncome || 0,
            currentLoan: player.currentLoan || 0,
            otherMonthlyAdjustments: player.otherMonthlyAdjustments || 0
        });
        
        // Максимальный кредит = Чистый доход * 10
        const netIncome = details?.netIncome?.netIncome || 0;
        const maxLoan = netIncome * 10;
        const currentLoan = player.currentLoan || 0;
        const available = Math.max(0, maxLoan - currentLoan);
        
        if (available <= 0) {
            this.showNotification(`Кредитный лимит исчерпан. Максимум: $${this.formatNumber(maxLoan)}`, 'error');
            return;
        }
        
        amount = Math.min(amount, available);
        
        // Обновим поле ввода фактическим разрешённым значением
        const input = this.ui.querySelector('#loan-amount');
        if (input) input.value = String(amount);
        
        if (amount <= 0) {
            this.showNotification('Сумма кредита должна быть больше 0', 'error');
            return;
        }
        
        // Серверный вызов
        const roomId = this.getRoomId?.() || this._getCurrentRoomId?.();
        let res = null;
        
        try {
            const response = await fetch('/api/bank/loan/take', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId: player.id, amount })
            });
            res = await response.json();
        } catch (e) { 
            console.error('❌ BankModule: Ошибка API кредита:', e);
            res = null; 
        }
        
        if (res?.success) {
            // Берем актуального игрока из ответа
            Object.assign(player, res.data.player);
            
            // Синхронизируем поля баланса
            player.balance = player.money;
            
            this.addTransaction('Кредит', `Взят кредит $${this.formatNumber(amount)}`, amount, 'completed');
            
            // Уведомим слушателей об изменении баланса
            this.eventBus?.emit('bank:balanceUpdated', { userId: player.id, delta: amount });
            
            // Синхронизируем в GameState и рассылаем обновление
            try {
                if (this.gameState && typeof this.gameState.updatePlayer === 'function') {
                    this.gameState.updatePlayer(player.id, player);
                }
                if (this.eventBus) {
                    this.eventBus.emit('game:playersUpdated', { players: this.gameState.getPlayers?.() || [] });
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка синхронизации GameState:', e);
            }
            
            this.updateBankData();
            this.showNotification(`Кредит $${this.formatNumber(amount)} взят успешно`, 'success');
            
            const input = this.ui.querySelector('#loan-amount');
            if (input) input.value = '';
        } else {
            this.showNotification(res?.message || 'Ошибка взятия кредита', 'error');
        }
    }

    async repayCreditInline() {
        const amount = Math.max(0, Math.floor((parseInt(this.ui.querySelector('#loan-amount').value)||0)/1000)*1000);
        if (amount <= 0) {
            this.showNotification('Сумма погашения должна быть больше 0', 'error');
            return;
        }
        
        // Получаем текущего игрока с fallback логикой
        let player = await this.getCurrentUserPlayer();
        if (!player) {
            player = await this.getCurrentUserPlayerWithFallback();
        }
        
        if (!player) {
            this.showNotification('Ошибка: Текущий игрок не найден', 'error');
            return;
        }
        
        // Проверяем достаточность средств для погашения
        const currentBalance = player.balance || player.money || 0;
        if (currentBalance < amount) {
            this.showNotification(`Недостаточно средств для погашения. Доступно: $${this.formatNumber(currentBalance)}`, 'error');
            return;
        }
        
        // Проверяем, есть ли кредит для погашения
        const currentLoan = player.currentLoan || 0;
        if (currentLoan <= 0) {
            this.showNotification('У вас нет активных кредитов для погашения', 'error');
            return;
        }
        
        const actualAmount = Math.min(amount, currentLoan);
        
        // Серверный вызов
        const roomId = this.getRoomId?.() || this._getCurrentRoomId?.();
        let res = null;
        
        try {
            const response = await fetch('/api/bank/loan/repay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId: player.id, amount: actualAmount })
            });
            res = await response.json();
        } catch (e) { 
            console.error('❌ BankModule: Ошибка API погашения кредита:', e);
            res = null; 
        }
        
        if (res?.success) {
            Object.assign(player, res.data.player);
            
            // Синхронизируем поля баланса
            player.balance = player.money;
            
            this.addTransaction('Погашение кредита', `Погашено $${this.formatNumber(actualAmount)}`, -actualAmount, 'completed');
            this.eventBus?.emit('bank:balanceUpdated', { userId: player.id, delta: -actualAmount });
            
            try {
                if (this.gameState && typeof this.gameState.updatePlayer === 'function') {
                    this.gameState.updatePlayer(player.id, player);
                }
                if (this.eventBus) {
                    this.eventBus.emit('game:playersUpdated', { players: this.gameState.getPlayers?.() || [] });
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка синхронизации GameState:', e);
            }
            
            this.updateBankData();
            this.showNotification(`Кредит погашен на $${this.formatNumber(actualAmount)}`, 'success');
            
            const input = this.ui.querySelector('#loan-amount');
            if (input) input.value = '';
        } else {
            this.showNotification(res?.message || 'Ошибка погашения кредита', 'error');
        }
    }
    
    /**
     * Открытие банк модуля
     */
    async open() {
        if (this.ui) {
            // Проверяем, что текущий пользователь найден
            let currentPlayer = await this.getCurrentUserPlayer();
            
            // Если не найден, пытаемся исправить currentUserId
            if (!currentPlayer) {
                console.log('🔧 BankModule: getCurrentUserPlayer вернул null, пробуем fallback...');
                
                const gameStateManager = window.app?.services?.get('gameStateManager');
                const state = gameStateManager?.getState();
                const players = state?.players || [];
                
                console.log('🔧 BankModule: Игроки в игре:', players.map(p => ({ id: p.id, username: p.username })));
                
                // Ищем по username из localStorage
                try {
                    const userData = localStorage.getItem('currentUser');
                    if (userData) {
                        const user = JSON.parse(userData);
                        console.log('🔧 BankModule: Пользователь из localStorage:', user);
                        
                        const player = players.find(p => p.username === user.username);
                        if (player) {
                            console.log('🔧 BankModule: Исправляем currentUserId с', this.currentUserId, 'на', player.id);
                            this.currentUserId = player.id;
                            currentPlayer = player;
                            console.log('✅ BankModule: currentPlayer найден через fallback:', currentPlayer.username);
                        } else {
                            console.warn('⚠️ BankModule: Игрок с username', user.username, 'не найден в списке игроков');
                        }
                    } else {
                        console.warn('⚠️ BankModule: currentUser не найден в localStorage');
                    }
                } catch (e) {
                    console.warn('⚠️ BankModule: Ошибка исправления currentUserId:', e);
                }
            }
            
            // Если все еще не найден, пробуем использовать первого игрока
            if (!currentPlayer) {
                const gameStateManager = window.app?.services?.get('gameStateManager');
                const state = gameStateManager?.getState();
                const players = state?.players || [];
                
                if (players.length > 0) {
                    currentPlayer = players[0];
                    console.log('🔧 BankModule: Используем первого игрока как fallback:', currentPlayer.username);
                    this.currentUserId = currentPlayer.id;
                }
            }
            
            if (!currentPlayer) {
                console.warn('⚠️ BankModule: Нельзя открыть банк - текущий пользователь не найден');
                return;
            }
            
            this.ui.style.display = 'flex';
            this.isOpen = true;
            
            // Принудительно обновляем данные и загружаем с сервера
            console.log('🔄 BankModule: Начинаем загрузку данных банка...');
            await this.updateBankData();
            await this.loadPlayers();
            
            // Принудительно обновляем UI элементы сразу
            this.forceUpdateBankUI(currentPlayer);
            
            // Дополнительное обновление с requestAnimationFrame для лучшей производительности
            requestAnimationFrame(async () => {
                if (this.isOpen) {
                    console.log('🔄 BankModule: Выполняем дополнительное обновление данных...');
                    await this.updateBankData();
                    this.forceUpdateBankUI(currentPlayer);
                    console.log('✅ BankModule: Дополнительное обновление данных выполнено');
                }
            });
            
            console.log('🏦 BankModule: Открыт для пользователя:', currentPlayer.username);
        }
    }
    
    /**
     * Закрытие банк модуля
     */
    async close() {
        if (this.ui) {
            this.ui.style.display = 'none';
            this.isOpen = false;
            console.log('🏦 BankModule: Закрыт');
            // При закрытии убеждаемся, что локальные изменения кредита/баланса зафиксированы в GameState
            try {
                const player = await this.getCurrentUserPlayer();
                if (player && this.gameState && typeof this.gameState.updatePlayer === 'function') {
                    this.gameState.updatePlayer(player.id, player);
                }
            } catch (_) {}
        }
    }
    
    /**
     * Обновление данных банка
     */
    async updateBankData() {
        if (!this.gameState) {
            console.warn('⚠️ BankModule: GameState недоступен для обновления данных');
            return;
        }
        
        // Получаем текущего пользователя браузера, а не активного игрока
        let currentPlayer = await this.getCurrentUserPlayer();
        if (!currentPlayer) {
            console.log('🔧 BankModule: getCurrentUserPlayer вернул null, пробуем fallback...');
            currentPlayer = await this.getCurrentUserPlayerWithFallback();
        }
        
        if (!currentPlayer) {
            console.warn('⚠️ BankModule: Текущий пользователь не найден - пробуем получить из GameStateManager...');
            
            // Пробуем получить данные из GameStateManager напрямую
            const gameStateManager = window.app?.services?.get('gameStateManager');
            if (gameStateManager) {
                const state = gameStateManager.getState();
                const players = state?.players || [];
                
                // Ищем по username из localStorage
                try {
                    const userData = localStorage.getItem('currentUser') || sessionStorage.getItem('am_player_bundle');
                    if (userData) {
                        const userDataParsed = JSON.parse(userData);
                        const username = userDataParsed?.username || userDataParsed?.currentUser?.username;
                        
                        if (username) {
                            currentPlayer = players.find(p => p.username === username);
                            if (currentPlayer) {
                                console.log('✅ BankModule: Найден игрок через GameStateManager:', currentPlayer.username);
                                this.currentUserId = currentPlayer.id;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ BankModule: Ошибка получения данных из GameStateManager:', e);
                }
            }
            
            if (!currentPlayer) {
                console.warn('⚠️ BankModule: Не удалось получить текущего пользователя - пропускаем обновление');
                return;
            }
        }
        
        // Получаем roomId для серверных запросов
        const roomId = this._getCurrentRoomId() || this.gameState?.getRoomId?.() || window.location.hash.split('roomId=')[1];
        let serverPlayerData = null;
        
        // Загружаем актуальные данные игрока с сервера
        if (roomId && currentPlayer.id) {
            // Проверяем глобальный rate limiter для game-state
            if (window.CommonUtils && !window.CommonUtils.canMakeGameStateRequest(roomId)) {
                console.log('🚫 BankModule: Пропускаем запрос из-за глобального rate limiting');
                return;
            }
            
            // Устанавливаем флаг pending в глобальном limiter
            if (window.CommonUtils && !window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
                console.log('🚫 BankModule: Не удалось установить pending (race condition)');
                return;
            }
            
            try {
                console.log('🌐 BankModule: Загружаем данные игрока с сервера...', { roomId, playerId: currentPlayer.id });
                
                const response = await fetch(`/api/rooms/${roomId}/game-state`);
                if (response.ok) {
                    const gameStateData = await response.json();
                    if (gameStateData.success && gameStateData.state?.players) {
                        // Находим данные текущего игрока на сервере
                        serverPlayerData = gameStateData.state.players.find(p => 
                            p.id === currentPlayer.id || 
                            p.username === currentPlayer.username ||
                            (currentPlayer.userId && p.userId === currentPlayer.userId)
                        );
                        
                        if (serverPlayerData) {
                            console.log('✅ BankModule: Данные игрока загружены с сервера:', {
                                id: serverPlayerData.id,
                                balance: serverPlayerData.balance || serverPlayerData.money,
                                currentLoan: serverPlayerData.currentLoan,
                                username: serverPlayerData.username
                            });
                            
                            // Обновляем локальные данные игрока серверными данными
                            Object.assign(currentPlayer, serverPlayerData);
                            
                            // Синхронизируем с GameState
                            if (this.gameState && typeof this.gameState.updatePlayer === 'function') {
                                this.gameState.updatePlayer(currentPlayer.id, currentPlayer);
                            }
                        } else {
                            console.warn('⚠️ BankModule: Серверные данные игрока не найдены:', {
                                searchId: currentPlayer.id,
                                searchUsername: currentPlayer.username,
                                availablePlayers: gameStateData.state.players.map(p => ({ id: p.id, username: p.username }))
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ BankModule: Ошибка загрузки данных с сервера:', error);
            } finally {
                // Очищаем флаг pending в глобальном limiter
                if (window.CommonUtils) {
                    window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
                }
            }
        }
        
        // Убеждаемся, что у игрока есть правильные поля для баланса
        const playerBalance = currentPlayer.balance ?? currentPlayer.money ?? currentPlayer.cash ?? 0;
        currentPlayer.money = playerBalance;
        currentPlayer.balance = playerBalance;
        
        console.log('🏦 BankModule: Обновляем данные для пользователя:', {
            id: currentPlayer.id,
            username: currentPlayer.username,
            money: currentPlayer.money,
            balance: currentPlayer.balance,
            currentLoan: currentPlayer.currentLoan || 0,
            rawData: {
                balance: currentPlayer.balance,
                money: currentPlayer.money,
                cash: currentPlayer.cash,
                totalIncome: currentPlayer.totalIncome,
                salary: currentPlayer.salary,
                monthlyExpenses: currentPlayer.monthlyExpenses
            }
        });
        
        // Получаем данные профессии
        const professionId = currentPlayer.profession || 'entrepreneur';
        const professionDetails = this.professionSystem ? 
            this.professionSystem.getProfessionDetails(professionId, {
                money: playerBalance,
                children: currentPlayer.children || 0,
                paidOffLoans: currentPlayer.paidOffLoans || {},
                extraIncome: currentPlayer.extraIncome || 0,
                currentLoan: currentPlayer.currentLoan || 0,
                otherMonthlyAdjustments: currentPlayer.otherMonthlyAdjustments || 0
            }) : null;
        
        // Обновляем баланс с принудительным обновлением
        const balanceElement = this.ui.querySelector('#bank-balance');
        if (balanceElement) {
            const displayBalance = Math.max(0, playerBalance); // Убеждаемся, что баланс не отрицательный
            balanceElement.textContent = `$${this.formatNumber(displayBalance)}`;
            balanceElement.style.color = displayBalance >= 0 ? '#10b981' : '#ef4444'; // Зеленый/красный
            console.log('💰 BankModule: Обновлен баланс:', displayBalance, 'Элемент найден:', !!balanceElement);
        } else {
            console.warn('⚠️ BankModule: Элемент #bank-balance не найден в UI');
        }
        
        // Обновляем доходы (из профессии или из игрока)
        const incomeElement = this.ui.querySelector('#bank-income');
        if (incomeElement) {
            let totalIncome = 0;
            if (professionDetails && professionDetails.income) {
                totalIncome = professionDetails.income.total || professionDetails.income.salary || 0;
            } else {
                totalIncome = currentPlayer.totalIncome || currentPlayer.salary || 0;
            }
            incomeElement.textContent = `$${this.formatNumber(totalIncome)}`;
            console.log('📈 BankModule: Обновлен доход:', totalIncome);
        }
        
        // Обновляем расходы (из профессии или из игрока)
        const expensesElement = this.ui.querySelector('#bank-expenses');
        if (expensesElement) {
            let totalExpenses = 0;
            if (professionDetails && professionDetails.expenses) {
                totalExpenses = professionDetails.expenses.total || 0;
            } else {
                totalExpenses = currentPlayer.monthlyExpenses || 0;
            }
            expensesElement.textContent = `$${this.formatNumber(totalExpenses)}`;
            console.log('📉 BankModule: Обновлены расходы:', totalExpenses);
        }
        
        // Обновляем зарплату (из профессии или из игрока)
        const salaryElement = this.ui.querySelector('#bank-salary');
        if (salaryElement) {
            let salary = 0;
            if (professionDetails && professionDetails.income) {
                salary = professionDetails.income.salary || professionDetails.income.total || 0;
            } else {
                salary = currentPlayer.salary || currentPlayer.totalIncome || 0;
            }
            salaryElement.textContent = `$${this.formatNumber(salary)}/мес`;
            console.log('💰 BankModule: Обновлена зарплата:', salary);
        }
        
        // Обновляем кредит (текущий остаток)
        const creditElement = this.ui.querySelector('#bank-credit');
        if (creditElement) {
            const currentLoan = currentPlayer.currentLoan || 0;
            creditElement.textContent = `$${this.formatNumber(currentLoan)}`;
            
            // Добавляем визуальную индикацию кредита
            if (currentLoan > 0) {
                creditElement.style.color = '#ef4444'; // Красный для активного кредита
                creditElement.style.fontWeight = 'bold';
            } else {
                creditElement.style.color = '#10b981'; // Зеленый для отсутствия кредита
                creditElement.style.fontWeight = 'normal';
            }
        }
        
        // Обновляем максимальный кредит
        const maxCreditElement = this.ui.querySelector('#bank-max-credit');
        if (maxCreditElement) {
            const maxLoan = professionDetails?.loan?.maxLoan || 0;
            maxCreditElement.textContent = `$${this.formatNumber(maxLoan)}`;
        }

        // Обновляем мини-индикаторы в правом блоке кредита
        const loanBalance = this.ui.querySelector('#loan-balance');
        if (loanBalance) {
            const currentLoan = currentPlayer.currentLoan || 0;
            loanBalance.textContent = `$${this.formatNumber(currentLoan)}`;
            
            // Добавляем визуальную индикацию
            if (currentLoan > 0) {
                loanBalance.style.color = '#ef4444'; // Красный для активного кредита
                loanBalance.style.fontWeight = 'bold';
            } else {
                loanBalance.style.color = '#10b981'; // Зеленый для отсутствия кредита
                loanBalance.style.fontWeight = 'normal';
            }
            console.log('💳 BankModule: Обновлен баланс кредита:', currentLoan);
        }
        
        const loanMax = this.ui.querySelector('#loan-max');
        if (loanMax) {
            // Максимальный кредит = Чистый доход * 10
            let netIncome = 0;
            
            // Пытаемся получить чистый доход из разных источников
            if (professionDetails && professionDetails.netIncome) {
                netIncome = professionDetails.netIncome.netIncome || 0;
            } else if (professionDetails) {
                const totalIncome = professionDetails.income?.total || professionDetails.income?.salary || 0;
                const totalExpenses = professionDetails.expenses?.total || 0;
                netIncome = Math.max(0, totalIncome - totalExpenses);
            }
            
            // Fallback: вычисляем из уже обновленных значений на странице
            if (netIncome === 0) {
                try {
                    const incomeText = incomeElement?.textContent?.replace(/[$,]/g, '') || '0';
                    const expensesText = expensesElement?.textContent?.replace(/[$,]/g, '') || '0';
                    const incomeValue = parseInt(incomeText) || 0;
                    const expensesValue = parseInt(expensesText) || 0;
                    netIncome = Math.max(0, incomeValue - expensesValue);
                } catch (e) {
                    console.warn('⚠️ BankModule: Ошибка вычисления чистого дохода:', e);
                }
            }
            
            // Дополнительный fallback: используем данные игрока напрямую
            if (netIncome === 0 && currentPlayer) {
                const playerIncome = currentPlayer.totalIncome || currentPlayer.salary || 0;
                const playerExpenses = currentPlayer.monthlyExpenses || 0;
                netIncome = Math.max(0, playerIncome - playerExpenses);
            }
            
            const maxLoan = Math.max(netIncome * 10, 1000); // Минимум $1000 кредита
            loanMax.textContent = `$${this.formatNumber(maxLoan)}`;
            
            // Принудительно добавляем визуальное выделение
            loanMax.style.color = '#10b981';
            loanMax.style.fontWeight = 'bold';
            
            console.log('🏦 BankModule: Обновлен максимальный кредит:', {
                netIncomeFromProfession: professionDetails?.netIncome?.netIncome || 0,
                calculatedNetIncome: netIncome,
                maxLoan: maxLoan,
                playerIncome: currentPlayer.totalIncome || currentPlayer.salary || 0,
                playerExpenses: currentPlayer.monthlyExpenses || 0,
                textContent: loanMax.textContent
            });
        }
        
        // Обновляем чистый доход с улучшенной логикой
        const netIncomeElement = this.ui.querySelector('#bank-net-income');
        if (netIncomeElement) {
            let netIncome = 0;
            if (professionDetails && professionDetails.netIncome) {
                netIncome = professionDetails.netIncome.netIncome || 0;
            } else {
                // Вычисляем чистый доход из доходов и расходов
                const incomeValue = incomeElement ? parseInt(incomeElement.textContent.replace(/[$,]/g, '')) || 0 : 0;
                const expensesValue = expensesElement ? parseInt(expensesElement.textContent.replace(/[$,]/g, '')) || 0 : 0;
                netIncome = Math.max(0, incomeValue - expensesValue);
            }
            netIncomeElement.textContent = `$${this.formatNumber(netIncome)}/мес`;
            console.log('💎 BankModule: Обновлен чистый доход:', netIncome);
        }
        
        // Обновляем детальную информацию о профессии
        if (professionDetails) {
            this.updateProfessionDetails(professionDetails, currentPlayer);
        }
        
        // Сохраняем детали профессии для использования в других методах
        this.currentProfessionDetails = professionDetails;
        
        // Загружаем сохраненные транзакции
        this.loadTransactions();
        
        console.log('🏦 BankModule: Данные обновлены с учетом профессии');
    }
    
    /**
     * Обновление детальной информации о профессии
     */
    updateProfessionDetails(professionDetails, player) {
        if (!professionDetails || !this.ui) return;
        
        // Обновляем заголовок профессии
        const professionName = this.ui.querySelector('.profession-name');
        const professionTitle = this.ui.querySelector('.profession-title');
        if (professionName) professionName.textContent = professionDetails.profession.name;
        if (professionTitle) professionTitle.textContent = professionDetails.profession.title;
        
        // Обновляем расходы на детей
        const childrenExpense = this.ui.querySelector('#children-expense');
        if (childrenExpense && professionDetails.children) {
            childrenExpense.textContent = `$${this.formatNumber(professionDetails.children.monthlyExpense)}`;
        }
        
        // Обновляем кнопки погашения кредитов
        const payoffButtons = this.ui.querySelectorAll('.payoff-btn');
        payoffButtons.forEach(btn => {
            const loanType = btn.dataset.loan;
            const loan = professionDetails.expenses[loanType];
            
            if (loan && loan.amount > 0) {
                btn.textContent = `Погасить $${this.formatNumber(loan.payOffAmount)}`;
                btn.disabled = !this.professionSystem.canPayOffLoan('entrepreneur', loanType, player.money || 0);
            } else {
                btn.textContent = 'Погашено';
                btn.disabled = true;
            }
        });
        
        // Обновляем кнопку добавления ребенка
        const addChildBtn = this.ui.querySelector('#add-child');
        if (addChildBtn && professionDetails.children) {
            addChildBtn.disabled = !professionDetails.children.canHaveMore;
            if (professionDetails.children.canHaveMore) {
                addChildBtn.textContent = `Добавить ребенка (+$${this.formatNumber(professionDetails.children.nextChildExpense - professionDetails.children.monthlyExpense)}/мес)`;
            } else {
                addChildBtn.textContent = 'Максимум детей';
            }
        }
    }
    
    /**
     * Загрузка списка игроков для переводов
     */
    async loadPlayers() {
        const recipientSelect = this.ui.querySelector('#transfer-recipient');
        if (!recipientSelect) return;
        
        let players = [];
        
        // Получаем roomId для загрузки данных с сервера
        const roomId = this._getCurrentRoomId() || this.gameState?.getRoomId?.();
        
        // Загружаем актуальные данные игроков с сервера
        if (roomId) {
            // Проверяем глобальный rate limiter для game-state
            if (window.CommonUtils && !window.CommonUtils.canMakeGameStateRequest(roomId)) {
                console.log('🚫 BankModule: Пропускаем запрос из-за глобального rate limiting');
                return;
            }
            
            // Устанавливаем флаг pending в глобальном limiter
            if (window.CommonUtils && !window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
                console.log('🚫 BankModule: Не удалось установить pending (race condition)');
                return;
            }
            
            try {
                console.log('🌐 BankModule: Загружаем список игроков с сервера...', { roomId });
                
                const response = await fetch(`/api/rooms/${roomId}/game-state`);
                if (response.ok) {
                    const gameStateData = await response.json();
                    if (gameStateData.success && gameStateData.state?.players) {
                        players = gameStateData.state.players;
                        console.log('✅ BankModule: Игроки загружены с сервера:', players.length);
                        
                        // Обновляем локальный GameState серверными данными
                        if (this.gameState && typeof this.gameState.updatePlayers === 'function') {
                            this.gameState.updatePlayers(players);
                        } else if (this.gameStateManager && typeof this.gameStateManager.updateFromServer === 'function') {
                            // Обновляем через gameStateManager правильным методом
                            this.gameStateManager.updateFromServer({
                                players: players
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ BankModule: Ошибка загрузки игроков с сервера, используем локальные данные:', error);
            } finally {
                // Очищаем флаг pending в глобальном limiter
                if (window.CommonUtils) {
                    window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
                }
            }
        }
        
        // Fallback: пытаемся получить игроков из локального GameState
        if (players.length === 0) {
            if (this.gameState && typeof this.gameState.getPlayers === 'function') {
                players = this.gameState.getPlayers();
            } else if (this.gameStateManager) {
                // Fallback через gameStateManager
                const state = this.gameStateManager.getState();
                players = state?.players || [];
            } else {
                // Fallback через window.app
                const gameStateManager = window.app?.services?.get('gameStateManager');
                if (gameStateManager) {
                    const state = gameStateManager.getState();
                    players = state?.players || [];
                }
            }
        }
        
        // Получаем текущего пользователя
        let currentUser = null;
        let currentUserId = null;
        
        // Пытаемся получить текущего пользователя из разных источников
        if (typeof this.getCurrentUser === 'function') {
            currentUser = this.getCurrentUser();
            currentUserId = currentUser?.id;
        } else if (window.app && window.app.getCurrentUser) {
            currentUser = window.app.getCurrentUser();
            currentUserId = currentUser?.id;
        } else if (window.gameStateManager) {
            const state = window.gameStateManager.getState();
            currentUser = state?.currentUser;
            currentUserId = currentUser?.id;
        }
        
        // Fallback: получаем из localStorage
        if (!currentUserId) {
            try {
                const userData = localStorage.getItem('currentUser');
                if (userData) {
                    const user = JSON.parse(userData);
                    currentUserId = user.id;
                    console.log('🔧 BankModule: currentUserId получен из localStorage:', currentUserId);
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка получения currentUserId из localStorage:', e);
            }
        }
        
        // Очищаем список
        recipientSelect.innerHTML = '<option value="">Выберите игрока</option>';
        
        // Добавляем игроков (исключая текущего)
        players.forEach(player => {
            if (player.id !== currentUserId) {
                const option = document.createElement('option');
                option.value = player.id;
                const balance = player.balance || player.money || 0;
                option.textContent = `${player.username || player.name} ($${this.formatNumber(balance)})`;
                recipientSelect.appendChild(option);
            }
        });
        
        console.log('🏦 BankModule: Список игроков загружен:', players.length, 'игроков');
    }
    
    /**
     * Выполнение перевода
     */
    async executeTransfer() {
        const recipientId = this.ui.querySelector('#transfer-recipient').value;
        const amount = parseInt(this.ui.querySelector('#transfer-amount').value);
        
        if (!recipientId || !amount || amount <= 0) {
            this.showNotification('Заполните все поля корректно', 'error');
            return;
        }
        
        // Получаем GameState с fallback логикой
        if (!this.gameState) {
            const gameStateManager = window.app?.services?.get('gameStateManager');
            if (gameStateManager) {
                console.log('🔧 BankModule: Используем GameStateManager как fallback для GameState');
                // Создаем временный объект с методами GameState
                this.gameState = {
                    getPlayers: () => {
                        const state = gameStateManager.getState();
                        return state.players || [];
                    },
                    getRoomId: () => {
                        const roomId = window.location.hash.split('roomId=')[1];
                        return roomId;
                    }
                };
            } else {
                this.showNotification('Ошибка: GameState недоступен', 'error');
                return;
            }
        }
        
        // Получаем текущего игрока с fallback логикой
        let currentPlayer = await this.getCurrentUserPlayer();
        if (!currentPlayer) {
            currentPlayer = await this.getCurrentUserPlayerWithFallback();
        }
        
        if (!currentPlayer) {
            this.showNotification('Ошибка: Текущий игрок не найден', 'error');
            return;
        }
        
        // Проверяем, что не переводим себе
        if (currentPlayer.id === recipientId) {
            this.showNotification('Нельзя переводить самому себе', 'error');
            return;
        }
        
        if (currentPlayer.money < amount) {
            this.showNotification('Недостаточно средств', 'error');
            return;
        }
        
        // Показываем загрузку
        const transferBtn = this.ui.querySelector('#transfer-execute');
        const originalText = transferBtn.textContent;
        transferBtn.disabled = true;
        transferBtn.textContent = 'Выполняется...';
        
        try {
            // Выполняем перевод через сервер
            const success = await this.performTransfer(recipientId, amount);
            
            if (success) {
                this.showNotification(`Перевод $${this.formatNumber(amount)} выполнен`, 'success');
                this.resetTransferForm();
                await this.updateBankData();
                await this.loadPlayers();
                
                const recipient = this.gameState.getPlayers().find(p => p.id === recipientId);
                console.log('🏦 BankModule: Добавляем транзакцию перевода:', {
                    recipient: recipient?.username || recipientId,
                    amount: -amount
                });
                this.addTransaction(
                    `Перевод игроку ${recipient?.username || recipientId}`,
                    `Переведено $${this.formatNumber(amount)}`,
                    -amount,
                    'completed'
                );
            } else {
                this.showNotification('Ошибка выполнения перевода', 'error');
            }
        } catch (error) {
            console.error('❌ BankModule: Ошибка перевода:', error);
            this.showNotification('Ошибка выполнения перевода', 'error');
        } finally {
            // Восстанавливаем кнопку
            transferBtn.disabled = false;
            transferBtn.textContent = originalText;
        }
    }
    
    /**
     * Выполнение перевода через серверный API
     */
    async performTransfer(recipientId, amount) {
        // Получаем GameState с fallback логикой
        if (!this.gameState) {
            const gameStateManager = window.app?.services?.get('gameStateManager');
            if (gameStateManager) {
                console.log('🔧 BankModule: Используем GameStateManager как fallback для GameState в performTransfer');
                this.gameState = {
                    getPlayers: () => {
                        const state = gameStateManager.getState();
                        return state.players || [];
                    },
                    getRoomId: () => {
                        const roomId = window.location.hash.split('roomId=')[1];
                        return roomId;
                    }
                };
            } else {
                console.warn('⚠️ BankModule: GameState недоступен для performTransfer');
                return false;
            }
        }
        
        if (!this.currentRoomId) {
            this.currentRoomId = this.gameState.getRoomId();
        }
        
        if (!this.currentRoomId) {
            console.warn('⚠️ BankModule: RoomId недоступен для performTransfer');
            return false;
        }
        
        // Получаем текущего игрока с fallback логикой
        let currentPlayer = await this.getCurrentUserPlayer();
        if (!currentPlayer) {
            currentPlayer = await this.getCurrentUserPlayerWithFallback();
        }
        
        if (!currentPlayer) {
            console.warn('⚠️ BankModule: Не удалось получить текущего игрока для перевода');
            return false;
        }
        
        const recipient = this.gameState.getPlayers().find(p => p.id === recipientId);
        
        if (!recipient) {
            console.warn('⚠️ BankModule: Получатель не найден:', recipientId);
            return false;
        }
        
        // Проверяем достаточность средств
        const currentBalance = currentPlayer.balance || currentPlayer.money || 0;
        if (currentBalance < amount) {
            this.showNotification(`Недостаточно средств. Доступно: $${this.formatNumber(currentBalance)}`, 'error');
            return false;
        }
        
        try {
            // Выполняем запрос к серверу
            const response = await fetch('/api/bank/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: this.currentRoomId,
                    fromPlayerId: currentPlayer.id,
                    toPlayerId: recipientId,
                    amount: amount,
                    description: `Перевод от ${currentPlayer.username} к ${recipient.username}`
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Ошибка выполнения перевода');
            }
            
            // Обновляем локальные данные с серверными
            currentPlayer.balance = result.data.fromPlayerBalance;
            currentPlayer.money = result.data.fromPlayerBalance; // Синхронизируем оба поля
            recipient.balance = result.data.toPlayerBalance;
            recipient.money = result.data.toPlayerBalance; // Синхронизируем оба поля
            
            // Обновляем GameState
            if (this.gameState && typeof this.gameState.updatePlayer === 'function') {
                this.gameState.updatePlayer(currentPlayer.id, currentPlayer);
                this.gameState.updatePlayer(recipient.id, recipient);
            }
            
            // Уведомляем другие модули об обновлении
            if (this.eventBus) {
                this.eventBus.emit('bank:transferCompleted', {
                    fromPlayer: currentPlayer,
                    toPlayer: recipient,
                    amount: amount,
                    transaction: result.data.transaction
                });
                
                // Уведомляем об обновлении игроков
                this.eventBus.emit('game:playersUpdated', {
                    players: this.gameState.getPlayers()
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка API перевода:', error);
            this.showNotification(`Ошибка перевода: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Сброс формы перевода
     */
    resetTransferForm() {
        this.ui.querySelector('#transfer-recipient').value = '';
        this.ui.querySelector('#transfer-amount').value = '';
    }
    
    /**
     * Взятие кредита
     */
    takeCredit() {
        this.showNotification('Функция кредитов в разработке', 'info');
    }
    
    /**
     * Погашение кредита
     */
    async payOffLoan(loanType) {
        if (!this.professionSystem || !this.gameState) {
            this.showNotification('Система профессий недоступна', 'error');
            return;
        }
        
        // Получаем текущего игрока с fallback логикой
        let currentPlayer = await this.getCurrentUserPlayer();
        if (!currentPlayer) {
            currentPlayer = await this.getCurrentUserPlayerWithFallback();
        }
        
        if (!currentPlayer) {
            this.showNotification('Текущий игрок не найден', 'error');
            return;
        }
        
        const payOffResult = this.professionSystem.payOffLoan('entrepreneur', loanType, {
            money: currentPlayer.money || 0,
            paidOffLoans: currentPlayer.paidOffLoans || {}
        });
        
        if (!payOffResult || !payOffResult.success) {
            this.showNotification(payOffResult?.message || 'Не удалось погасить кредит', 'error');
            return;
        }
        
        // Обновляем данные игрока
        if (!currentPlayer.paidOffLoans) {
            currentPlayer.paidOffLoans = {};
        }
        currentPlayer.paidOffLoans[loanType] = true;
        currentPlayer.money -= payOffResult.payOffAmount;
        
        // Обновляем UI
        this.updateBankData();
        
        // Добавляем транзакцию
        this.addTransaction(
            `Погашение ${this.getLoanDisplayName(loanType)}`,
            `Погашен кредит на $${this.formatNumber(payOffResult.payOffAmount)}`,
            -payOffResult.payOffAmount,
            'completed'
        );
        
        this.showNotification(
            `Кредит погашен! Экономия: $${this.formatNumber(payOffResult.monthlySavings)}/мес`,
            'success'
        );
    }
    
    /**
     * Добавление ребенка
     */
    async addChild() {
        if (!this.professionSystem || !this.gameState) {
            this.showNotification('Система профессий недоступна', 'error');
            return;
        }
        
        // Получаем текущего игрока с fallback логикой
        let currentPlayer = await this.getCurrentUserPlayer();
        if (!currentPlayer) {
            currentPlayer = await this.getCurrentUserPlayerWithFallback();
        }
        
        if (!currentPlayer) {
            this.showNotification('Текущий игрок не найден', 'error');
            return;
        }
        
        const addChildResult = this.professionSystem.addChild('entrepreneur', {
            children: currentPlayer.children || 0
        });
        
        if (!addChildResult || !addChildResult.success) {
            this.showNotification(addChildResult?.message || 'Не удалось добавить ребенка', 'error');
            return;
        }
        
        // Обновляем данные игрока
        currentPlayer.children = addChildResult.newChildrenCount;
        
        // Обновляем UI
        this.updateBankData();
        
        this.showNotification(
            `Ребенок добавлен! Дополнительные расходы: $${this.formatNumber(addChildResult.additionalMonthlyExpense)}/мес`,
            'info'
        );
    }
    
    /**
     * Получение отображаемого названия кредита
     */
    getLoanDisplayName(loanType) {
        const names = {
            carLoan: 'Кредит на авто',
            educationLoan: 'Образовательный кредит',
            creditCards: 'Кредитные карты',
            mortgage: 'Ипотека студия'
        };
        return names[loanType] || loanType;
    }
    
    /**
     * Добавление транзакции в историю
     */
    addTransaction(title, details, amount, status = 'completed') {
        console.log('🏦 BankModule: Добавляем транзакцию:', { title, details, amount, status });
        
        if (!this.ui) {
            console.warn('⚠️ BankModule: UI не найден для добавления транзакции');
            return;
        }
        
        const transactionsList = this.ui.querySelector('#transactions-list');
        if (!transactionsList) {
            console.warn('⚠️ BankModule: Список транзакций не найден');
            return;
        }
        
        // Сохраняем транзакцию в состоянии
        this.bankState.transactions.unshift({
            title,
            details,
            amount,
            status,
            timestamp: new Date().toISOString()
        });
        
        // Ограничиваем количество транзакций (последние 50)
        if (this.bankState.transactions.length > 50) {
            this.bankState.transactions = this.bankState.transactions.slice(0, 50);
        }
        
        // Обновляем счетчик новых транзакций (используем кэш)
        if (this.domCache.newBadge) {
            this.domCache.newBadge.textContent = String(this.bankState.transactions.length);
        }
        
        // Перерисовываем список из состояния (во избежание дублей)
        this.loadTransactions();
        
        console.log('✅ BankModule: Транзакция добавлена в UI и состояние');
    }
    
    /**
     * Загрузка сохраненных транзакций
     */
    loadTransactions() {
        if (!this.ui) return;
        
        // Используем кэшированный элемент
        const transactionsList = this.domCache.transactionsList || this.ui.querySelector('#transactions-list');
        if (!transactionsList) return;
        
        // Очищаем существующие транзакции полностью
        const existingTransactions = transactionsList.querySelectorAll('.transaction-item');
        existingTransactions.forEach((item) => item.remove());
        
        // Добавляем сохраненные транзакции
        this.bankState.transactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            const date = new Date(transaction.timestamp);
            const timeString = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            transactionItem.innerHTML = `
                <div class="transaction-info">
                    <div class="transaction-title">${transaction.title}</div>
                    <div class="transaction-details">${transaction.details}</div>
                    <div class="transaction-time">${timeString}</div>
                </div>
                <div class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">${transaction.amount > 0 ? '+' : ''}$${this.formatNumber(transaction.amount)}</div>
                <div class="transaction-status ${transaction.status}">${transaction.status === 'completed' ? 'Завершено' : transaction.status}</div>
            `;
            
            // Добавляем после первой транзакции (начальный баланс)
            const firstTransaction = transactionsList.querySelector('.transaction-item');
            if (firstTransaction) {
                firstTransaction.insertAdjacentElement('afterend', transactionItem);
            } else {
                transactionsList.appendChild(transactionItem);
            }
        });
        
        console.log('🏦 BankModule: Загружено транзакций:', this.bankState.transactions.length);
    }
    
    /**
     * Fallback метод для получения текущего игрока
     */
    async getCurrentUserPlayerWithFallback() {
        console.log('🔧 BankModule: Используем fallback логику для получения игрока...');
        
        const gameStateManager = window.app?.services?.get('gameStateManager');
        const state = gameStateManager?.getState();
        const players = state?.players || [];
        
        console.log('🔧 BankModule: Игроки в игре:', players.map(p => ({ id: p.id, username: p.username })));
        
        // Ищем по username из localStorage
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                console.log('🔧 BankModule: Пользователь из localStorage:', user);
                
                const player = players.find(p => p.username === user.username);
                if (player) {
                    console.log('✅ BankModule: Игрок найден через fallback по username:', player.username);
                    this.currentUserId = player.id;
                    return player;
                }
            }
        } catch (e) {
            console.warn('⚠️ BankModule: Ошибка fallback логики:', e);
        }
        
        // Если не найден по username, используем первого игрока
        if (players.length > 0) {
            const player = players[0];
            console.log('🔧 BankModule: Используем первого игрока как fallback:', player.username);
            this.currentUserId = player.id;
            return player;
        }
        
        console.warn('⚠️ BankModule: Fallback логика не смогла найти игрока');
        return null;
    }

    /**
     * Получение текущего пользователя (синхронная версия)
     */
    getCurrentUser() {
        // Используем общую утилиту, если доступна
        if (window.CommonUtils) {
            return window.CommonUtils.getCurrentUser();
        }
        
        // Fallback - старая логика для обратной совместимости
        try {
            // Пытаемся получить из localStorage
            const token = localStorage.getItem('authToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return {
                    id: payload.userId || payload.id,
                    email: payload.email,
                    username: payload.username || payload.email
                };
            }
        } catch (error) {
            console.warn('⚠️ BankModule: Ошибка получения пользователя из токена:', error);
        }
        
        // Fallback - пытаемся получить из GameStateManager
        if (window.gameStateManager) {
            const state = window.gameStateManager.getState();
            return state?.currentUser || null;
        }
        
        return null;
    }

    /**
     * Получение текущего пользователя браузера (не активного игрока)
     */
    async getCurrentUserPlayer() {
        if (!this.gameState) return null;
        
        // Автоматически исправляем currentUserId если он не соответствует игрокам в игре
        if (this.currentUserId) {
            const gameStateManager = window.app?.services?.get('gameStateManager');
            const state = gameStateManager?.getState();
            const players = state?.players || [];
            
            // Проверяем, есть ли игрок с таким ID
            let player = players.find(p => p.id === this.currentUserId);
            
            // Если не найден по ID, ищем по username из localStorage
            if (!player) {
                try {
                    const userData = localStorage.getItem('currentUser');
                    if (userData) {
                        const user = JSON.parse(userData);
                        player = players.find(p => p.username === user.username);
                        if (player) {
                            console.log('🔧 BankModule: Автоматически исправляем currentUserId с', this.currentUserId, 'на', player.id);
                            this.currentUserId = player.id;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ BankModule: Ошибка автоматического исправления currentUserId:', e);
                }
            }
        }
        
        // Подписываемся на события GameStateManager для получения актуальных данных
        if (this.gameStateManager && !this._subscribedToGameStateManager) {
            this.gameStateManager.on('players:updated', (players) => {
                console.log('🔍 BankModule: Получены обновленные игроки от GameStateManager:', players);
            });
            this.gameStateManager.on('state:updated', (state) => {
                console.log('🔍 BankModule: Получено обновленное состояние от GameStateManager:', state);
            });
            this._subscribedToGameStateManager = true;
        }
        
        // Получаем ID текущего пользователя из различных источников
        let currentUserId = null;
        
        // 1. Из sessionStorage (приоритетный источник)
        try {
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                currentUserId = bundle.userId || bundle.id || bundle.username || bundle.currentUser?.id || bundle.currentUser?.username;
                console.log('🔍 BankModule: ID из sessionStorage:', currentUserId, bundle);
            }
        } catch (e) {
            console.warn('⚠️ BankModule: Ошибка чтения sessionStorage:', e);
        }
        
        // 2. Из localStorage (пробуем разные ключи)
        if (!currentUserId) {
            try {
                // Сначала пробуем currentUser (основной источник)
                let userData = localStorage.getItem('currentUser');
                if (!userData) {
                    userData = localStorage.getItem('aura_money_user');
                }
                
                if (userData) {
                    const user = JSON.parse(userData);
                    currentUserId = user.id || user.userId || user.username;
                    console.log('🔍 BankModule: ID из localStorage:', currentUserId, user);
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка чтения localStorage:', e);
            }
        }
        
        // 3. Из window.app
        if (!currentUserId && window.app) {
            try {
                const userModel = window.app.getModule('userModel');
                if (userModel) {
                    currentUserId = userModel.getId() || userModel.getUsername();
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка получения userModel:', e);
            }
        }
        
        if (!currentUserId) {
            console.warn('⚠️ BankModule: Не удалось определить ID текущего пользователя');
            // Попробуем использовать активного игрока как fallback
            let activePlayer = null;
            if (this.gameStateManager) {
                const state = this.gameStateManager.getState();
                activePlayer = state.activePlayer;
            } else {
                activePlayer = this.gameState.getActivePlayer();
            }
            
            if (activePlayer) {
                console.log('🔍 BankModule: Используем активного игрока как fallback:', activePlayer.username);
                return activePlayer;
            }
            return null;
        }
        
        console.log('🔍 BankModule: Поиск игрока с ID:', currentUserId);
        
        // Получаем игроков из различных источников
        let players = [];
        
        // 1. Попробуем получить из GameStateManager
        if (this.gameStateManager) {
            const state = this.gameStateManager.getState();
            players = state.players || [];
            console.log('🔍 BankModule: Игроки из GameStateManager:', players);
            
            // Если игроки пустые, пробуем еще раз без задержки для лучшей производительности
            if (players.length === 0) {
                console.log('🔍 BankModule: Игроки пустые, пробуем получить обновленное состояние...');
                const updatedState = this.gameStateManager.getState();
                players = updatedState.players || [];
                console.log('🔍 BankModule: Игроки после обновления:', players);
            }
        }
        
        // 2. Если игроки пустые, попробуем получить из GameState
        if (players.length === 0) {
            players = this.gameState.getPlayers();
            console.log('🔍 BankModule: Игроки из GameState:', players);
        }
        
        // 3. Если все еще пустые, попробуем получить напрямую от сервера
        if (players.length === 0) {
            console.log('🔍 BankModule: Запрашиваем данные напрямую от сервера...');
            try {
                const response = await fetch(`/api/rooms/${this.gameState.getRoomId()}/state`);
                if (response.ok) {
                    const serverState = await response.json();
                    players = serverState.players || [];
                    console.log('🔍 BankModule: Игроки получены от сервера:', players);
                }
            } catch (error) {
                console.warn('⚠️ BankModule: Ошибка получения данных от сервера:', error);
            }
        }
        
        console.log('🔍 BankModule: Доступные игроки:', players.map(p => ({
            id: p.id,
            username: p.username,
            userId: p.userId
        })));
        
        // Находим игрока по ID (проверяем все возможные поля)
        let player = players.find(p => 
            p.id === currentUserId || 
            p.username === currentUserId ||
            p.userId === currentUserId
        );
        
        console.log('🔍 BankModule: Результат поиска по ID:', player ? 'найден' : 'не найден');
        
        // Если не найден по ID, пытаемся найти по username из localStorage
        if (!player) {
            try {
                // Сначала пробуем currentUser из localStorage
                let userData = localStorage.getItem('currentUser');
                if (!userData) {
                    userData = localStorage.getItem('aura_money_user');
                }
                
                if (userData) {
                    const user = JSON.parse(userData);
                    const username = user.username;
                    console.log('🔍 BankModule: Поиск по username из localStorage:', username);
                    if (username) {
                        player = players.find(p => p.username === username);
                        console.log('🔍 BankModule: Результат поиска по username из localStorage:', player ? 'найден' : 'не найден');
                    }
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка чтения localStorage для поиска по username:', e);
            }
        }
        
        // Если все еще не найден, пытаемся найти по username из sessionStorage
        if (!player) {
            try {
                const bundleRaw = sessionStorage.getItem('am_player_bundle');
                if (bundleRaw) {
                    const bundle = JSON.parse(bundleRaw);
                    const username = bundle.username || bundle.currentUser?.username;
                    console.log('🔍 BankModule: Поиск по username из sessionStorage:', username);
                    if (username) {
                        player = players.find(p => p.username === username);
                        console.log('🔍 BankModule: Результат поиска по username из sessionStorage:', player ? 'найден' : 'не найден');
                    }
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка поиска по username:', e);
            }
        }
        
        // Если все еще не найден, пытаемся найти по активному игроку
        if (!player) {
            let activePlayer = null;
            if (this.gameStateManager) {
                const state = this.gameStateManager.getState();
                activePlayer = state.activePlayer;
            } else {
                activePlayer = this.gameState.getActivePlayer();
            }
            
            if (activePlayer) {
                console.log('🔍 BankModule: Пробуем использовать активного игрока:', activePlayer.username);
                player = activePlayer;
            }
        }
        
        // Если все еще не найден, берем первого игрока как fallback
        if (!player && players.length > 0) {
            player = players[0];
            console.warn('⚠️ BankModule: Используем первого игрока как fallback:', player.username);
        }
        
        if (!player) {
            console.warn('⚠️ BankModule: Игрок с ID не найден:', currentUserId);
            console.log('🔍 BankModule: Доступные игроки:', players.map(p => ({
                id: p.id,
                username: p.username,
                userId: p.userId
            })));
            return null;
        }
        
        console.log('✅ BankModule: Найден текущий пользователь:', {
            id: player.id,
            username: player.username,
            money: player.money
        });
        
        return player;
    }

    /**
     * Получение ID текущей комнаты
     */
    _getCurrentRoomId() {
        try {
            // Пытаемся получить из URL
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            const roomId = urlParams.get('roomId');
            if (roomId) return roomId;
            
            // Пытаемся получить из sessionStorage
            const roomData = sessionStorage.getItem('am_current_room');
            if (roomData) {
                const parsed = JSON.parse(roomData);
                return parsed.id || parsed.roomId;
            }
            
            console.warn('⚠️ BankModule: ID комнаты не найден');
            return null;
        } catch (error) {
            console.error('❌ BankModule: Ошибка получения ID комнаты:', error);
            return null;
        }
    }
    
    /**
     * Форматирование чисел (использует CommonUtils)
     */
    formatNumber(num) {
        // Используем общую утилиту, если доступна
        if (window.CommonUtils) {
            return window.CommonUtils.formatNumber(num);
        }
        // Fallback для обратной совместимости
        return new Intl.NumberFormat('ru-RU').format(num);
    }
    
    /**
     * Показ уведомлений
     */
    showNotification(message, type = 'info') {
        // TODO: Интегрировать с системой уведомлений
        console.log(`🏦 BankModule: ${type.toUpperCase()} - ${message}`);
        
        // Простое уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10001;
            font-weight: 600;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    /**
     * Принудительное обновление UI банка
     */
    forceUpdateBankUI(currentPlayer) {
        if (!this.ui || !currentPlayer) {
            console.warn('⚠️ BankModule: Нельзя обновить UI - нет элементов или данных игрока');
            return;
        }
        
        console.log('🔄 BankModule: Принудительное обновление UI для:', currentPlayer.username);
        
        // Принудительно обновляем баланс (используем кэш)
        if (this.domCache.balanceElement) {
            const balance = currentPlayer.balance ?? currentPlayer.money ?? currentPlayer.cash ?? 0;
            this.domCache.balanceElement.textContent = `$${this.formatNumber(balance)}`;
            this.domCache.balanceElement.style.color = balance >= 0 ? '#10b981' : '#ef4444';
            console.log('💰 forceUpdateBankUI: Обновлен баланс:', balance);
        }
        
        // Принудительно обновляем доходы (используем кэш)
        if (this.domCache.incomeElement) {
            const income = currentPlayer.totalIncome ?? currentPlayer.salary ?? 0;
            this.domCache.incomeElement.textContent = `$${this.formatNumber(income)}`;
            console.log('📈 forceUpdateBankUI: Обновлен доход:', income);
        }
        
        // Принудительно обновляем расходы (используем кэш)
        if (this.domCache.expensesElement) {
            const expenses = currentPlayer.monthlyExpenses ?? 0;
            this.domCache.expensesElement.textContent = `$${this.formatNumber(expenses)}`;
            console.log('📉 forceUpdateBankUI: Обновлены расходы:', expenses);
        }
        
        // Принудительно обновляем кредит (используем кэш)
        if (this.domCache.creditElement) {
            const credit = currentPlayer.currentLoan ?? 0;
            this.domCache.creditElement.textContent = `$${this.formatNumber(credit)}`;
            this.domCache.creditElement.style.color = credit > 0 ? '#ef4444' : '#10b981';
            console.log('💳 forceUpdateBankUI: Обновлен кредит:', credit);
        }
    }
    
    /**
     * Уничтожение модуля
     */
    destroy() {
        if (this.ui && this.ui.parentNode) {
            this.ui.parentNode.removeChild(this.ui);
        }
        this.ui = null;
        console.log('🏦 BankModule: Уничтожен');
    }
}

// Экспорт для глобального использования
window.BankModule = BankModule;

