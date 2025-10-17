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
     * Инициализация текущего пользователя
     */
    initCurrentUser() {
        try {
            const userData = localStorage.getItem('aura_money_user');
            if (userData) {
                const user = JSON.parse(userData);
                this.currentUserId = user.id;
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
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Закрытие модуля
        const closeBtn = this.ui.querySelector('#bank-close');
        closeBtn.addEventListener('click', () => this.close());
        
        // Закрытие по клику на overlay
        const overlay = this.ui.querySelector('.bank-overlay');
        overlay.addEventListener('click', () => this.close());
        
        // Переводы
        const transferExecute = this.ui.querySelector('#transfer-execute');
        transferExecute.addEventListener('click', () => this.executeTransfer());
        
        const transferReset = this.ui.querySelector('#transfer-reset');
        transferReset.addEventListener('click', () => this.resetTransferForm());
        
        // Кредиты
        const creditTake = this.ui.querySelector('#credit-take');
        if (creditTake) creditTake.addEventListener('click', () => this.takeCredit());
        const loanTake = this.ui.querySelector('#loan-take');
        const loanRepay = this.ui.querySelector('#loan-repay');
        if (loanTake) loanTake.addEventListener('click', () => this.takeCreditInline());
        if (loanRepay) loanRepay.addEventListener('click', () => this.repayCreditInline());
        
        // Погашение кредитов
        const payoffButtons = this.ui.querySelectorAll('.payoff-btn');
        payoffButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const loanType = e.target.dataset.loan;
                this.payOffLoan(loanType);
            });
        });
        
        // Добавление ребенка
        const addChildBtn = this.ui.querySelector('#add-child');
        if (addChildBtn) {
            addChildBtn.addEventListener('click', () => this.addChild());
        }
        
        console.log('🏦 BankModule: Обработчики настроены');
    }

    async takeCreditInline() {
        let amount = Math.max(0, Math.floor((parseInt(this.ui.querySelector('#loan-amount').value)||0)/1000)*1000);
        const player = this.getCurrentUserPlayer();
        const profId = player?.profession || 'entrepreneur';
        const ps = this.professionSystem;
        // Ограничение: не больше доступного лимита (maxLoan - currentLoan)
        const details = ps?.getProfessionDetails?.(profId, {
            money: player.money || 0,
            children: player.children || 0,
            paidOffLoans: player.paidOffLoans || {},
            extraIncome: player.extraIncome || 0,
            currentLoan: player.currentLoan || 0,
            otherMonthlyAdjustments: player.otherMonthlyAdjustments || 0
        });
        const maxLoan = details?.loan?.maxLoan || 0;
        const currentLoan = player.currentLoan || 0;
        const available = Math.max(0, maxLoan - currentLoan);
        amount = Math.min(amount, available);
        // Обновим поле ввода фактическим разрешённым значением
        const input = this.ui.querySelector('#loan-amount');
        if (input) input.value = String(amount);
        if (amount <= 0) return;
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
        } catch (e) { res = null; }
        if (res?.success) {
            // Берем актуального игрока из ответа
            Object.assign(player, res.data.player);
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
            } catch (_) {}
            this.updateBankData();
            const input = this.ui.querySelector('#loan-amount');
            if (input) input.value = '';
        }
    }

    async repayCreditInline() {
        const amount = Math.max(0, Math.floor((parseInt(this.ui.querySelector('#loan-amount').value)||0)/1000)*1000);
        if (amount <= 0) return;
        const player = this.getCurrentUserPlayer();
        const profId = player?.profession || 'entrepreneur';
        const ps = this.professionSystem;
        // Серверный вызов
        const roomId = this.getRoomId?.() || this._getCurrentRoomId?.();
        let res = null;
        try {
            const response = await fetch('/api/bank/loan/repay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId: player.id, amount })
            });
            res = await response.json();
        } catch (e) { res = null; }
        if (res?.success) {
            Object.assign(player, res.data.player);
            this.addTransaction('Погашение кредита', `Погашено $${this.formatNumber(amount)}`, -amount, 'completed');
            this.eventBus?.emit('bank:balanceUpdated', { userId: player.id, delta: -amount });
            try {
                if (this.gameState && typeof this.gameState.updatePlayer === 'function') {
                    this.gameState.updatePlayer(player.id, player);
                }
                if (this.eventBus) {
                    this.eventBus.emit('game:playersUpdated', { players: this.gameState.getPlayers?.() || [] });
                }
            } catch (_) {}
            this.updateBankData();
            const input = this.ui.querySelector('#loan-amount');
            if (input) input.value = '';
        }
    }
    
    /**
     * Открытие банк модуля
     */
    open() {
        if (this.ui) {
            // Проверяем, что текущий пользователь найден
            const currentPlayer = this.getCurrentUserPlayer();
            if (!currentPlayer) {
                console.warn('⚠️ BankModule: Нельзя открыть банк - текущий пользователь не найден');
                return;
            }
            
            this.ui.style.display = 'flex';
            this.isOpen = true;
            this.updateBankData();
            this.loadPlayers();
            console.log('🏦 BankModule: Открыт для пользователя:', currentPlayer.username);
        }
    }
    
    /**
     * Закрытие банк модуля
     */
    close() {
        if (this.ui) {
            this.ui.style.display = 'none';
            this.isOpen = false;
            console.log('🏦 BankModule: Закрыт');
            // При закрытии убеждаемся, что локальные изменения кредита/баланса зафиксированы в GameState
            try {
                const player = this.getCurrentUserPlayer();
                if (player && this.gameState && typeof this.gameState.updatePlayer === 'function') {
                    this.gameState.updatePlayer(player.id, player);
                }
            } catch (_) {}
        }
    }
    
    /**
     * Обновление данных банка
     */
    updateBankData() {
        if (!this.gameState) return;
        
        // Получаем текущего пользователя браузера, а не активного игрока
        const currentPlayer = this.getCurrentUserPlayer();
        if (!currentPlayer) {
            console.warn('⚠️ BankModule: Текущий пользователь не найден - пропускаем обновление');
            return;
        }
        
        console.log('🏦 BankModule: Обновляем данные для пользователя:', {
            id: currentPlayer.id,
            username: currentPlayer.username,
            money: currentPlayer.money
        });
        
        // Получаем данные профессии
            const professionId = currentPlayer.profession || 'entrepreneur';
        const professionDetails = this.professionSystem ? 
            this.professionSystem.getProfessionDetails(professionId, {
                money: currentPlayer.money || 0,
                children: currentPlayer.children || 0,
                paidOffLoans: currentPlayer.paidOffLoans || {},
                extraIncome: currentPlayer.extraIncome || 0,
                currentLoan: currentPlayer.currentLoan || 0,
                otherMonthlyAdjustments: currentPlayer.otherMonthlyAdjustments || 0
            }) : null;
        
        // Обновляем баланс
        const balanceElement = this.ui.querySelector('#bank-balance');
        if (balanceElement) {
            balanceElement.textContent = `$${this.formatNumber(currentPlayer.money || 0)}`;
        }
        
        // Обновляем доходы (из профессии или из игрока)
        const incomeElement = this.ui.querySelector('#bank-income');
        if (incomeElement) {
            const totalIncome = professionDetails ? professionDetails.income.total : (currentPlayer.totalIncome || 0);
            incomeElement.textContent = `$${this.formatNumber(totalIncome)}`;
        }
        
        // Обновляем расходы (из профессии или из игрока)
        const expensesElement = this.ui.querySelector('#bank-expenses');
        if (expensesElement) {
            const totalExpenses = professionDetails ? professionDetails.expenses.total : (currentPlayer.monthlyExpenses || 0);
            expensesElement.textContent = `$${this.formatNumber(totalExpenses)}`;
        }
        
        // Обновляем зарплату (из профессии или из игрока)
        const salaryElement = this.ui.querySelector('#bank-salary');
        if (salaryElement) {
            const salary = professionDetails ? professionDetails.income.salary : (currentPlayer.salary || 0);
            salaryElement.textContent = `$${this.formatNumber(salary)}/мес`;
        }
        
        // Обновляем кредит (текущий остаток)
        const creditElement = this.ui.querySelector('#bank-credit');
        if (creditElement) {
            creditElement.textContent = `$${this.formatNumber(currentPlayer.currentLoan || 0)}`;
        }
        
        // Обновляем максимальный кредит
        const maxCreditElement = this.ui.querySelector('#bank-max-credit');
        if (maxCreditElement) {
            const maxLoan = professionDetails?.loan?.maxLoan || 0;
            maxCreditElement.textContent = `$${this.formatNumber(maxLoan)}`;
        }

        // Обновляем мини-индикаторы в правом блоке кредита
        const loanBalance = this.ui.querySelector('#loan-balance');
        if (loanBalance) loanBalance.textContent = `$${this.formatNumber(currentPlayer.currentLoan || 0)}`;
        const loanMax = this.ui.querySelector('#loan-max');
        if (loanMax) loanMax.textContent = `$${this.formatNumber(professionDetails?.loan?.maxLoan || 0)}`;
        
        // Обновляем чистый доход
        const netIncomeElement = this.ui.querySelector('#bank-net-income');
        if (netIncomeElement && professionDetails) {
            netIncomeElement.textContent = `$${this.formatNumber(professionDetails.netIncome.netIncome)}/мес`;
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
    loadPlayers() {
        if (!this.gameState) return;
        
        const players = this.gameState.getPlayers();
        const recipientSelect = this.ui.querySelector('#transfer-recipient');
        
        if (!recipientSelect) return;
        
        // Очищаем список
        recipientSelect.innerHTML = '<option value="">Выберите игрока</option>';
        
        // Добавляем игроков (исключая текущего)
        players.forEach(player => {
            if (player.id !== this.currentUserId) {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = `${player.username || player.name} ($${this.formatNumber(player.money || 0)})`;
                recipientSelect.appendChild(option);
            }
        });
        
        console.log('🏦 BankModule: Список игроков загружен');
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
        
        if (!this.gameState) {
            this.showNotification('Ошибка: GameState недоступен', 'error');
            return;
        }
        
        const currentPlayer = this.getCurrentUserPlayer();
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
                this.updateBankData();
                this.loadPlayers();
                
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
        if (!this.gameState || !this.currentRoomId) return false;
        
        const currentPlayer = this.getCurrentUserPlayer();
        const recipient = this.gameState.getPlayers().find(p => p.id === recipientId);
        
        if (!recipient) return false;
        
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
            currentPlayer.money = result.data.fromPlayerBalance;
            recipient.money = result.data.toPlayerBalance;
            
            // Уведомляем другие модули об обновлении
            if (this.eventBus) {
                this.eventBus.emit('bank:transferCompleted', {
                    fromPlayer: currentPlayer,
                    toPlayer: recipient,
                    amount: amount,
                    transaction: result.data.transaction
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ BankModule: Ошибка API перевода:', error);
            throw error;
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
    payOffLoan(loanType) {
        if (!this.professionSystem || !this.gameState) {
            this.showNotification('Система профессий недоступна', 'error');
            return;
        }
        
        const currentPlayer = this.getCurrentUserPlayer();
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
    addChild() {
        if (!this.professionSystem || !this.gameState) {
            this.showNotification('Система профессий недоступна', 'error');
            return;
        }
        
        const currentPlayer = this.getCurrentUserPlayer();
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
        
        // Обновляем счетчик новых транзакций
        const newBadge = this.ui.querySelector('#new-transactions');
        if (newBadge) {
            newBadge.textContent = String(this.bankState.transactions.length);
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
        
        const transactionsList = this.ui.querySelector('#transactions-list');
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
     * Получение текущего пользователя браузера (не активного игрока)
     */
    getCurrentUserPlayer() {
        if (!this.gameState) return null;
        
        // Получаем ID текущего пользователя из различных источников
        let currentUserId = null;
        
        // 1. Из sessionStorage (приоритетный источник)
        try {
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                currentUserId = bundle.userId || bundle.id || bundle.username || bundle.currentUser?.id || bundle.currentUser?.username;
            }
        } catch (e) {
            console.warn('⚠️ BankModule: Ошибка чтения sessionStorage:', e);
        }
        
        // 2. Из localStorage
        if (!currentUserId) {
            try {
                const userData = localStorage.getItem('aura_money_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    currentUserId = user.id || user.userId || user.username;
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
            return null;
        }
        
        // Находим игрока по ID (проверяем все возможные поля)
        let player = this.gameState.getPlayers().find(p => 
            p.id === currentUserId || 
            p.username === currentUserId ||
            p.userId === currentUserId
        );
        
        // Если не найден по ID, пытаемся найти по username из sessionStorage
        if (!player) {
            try {
                const bundleRaw = sessionStorage.getItem('am_player_bundle');
                if (bundleRaw) {
                    const bundle = JSON.parse(bundleRaw);
                    const username = bundle.username || bundle.currentUser?.username;
                    if (username) {
                        player = this.gameState.getPlayers().find(p => p.username === username);
                    }
                }
            } catch (e) {
                console.warn('⚠️ BankModule: Ошибка поиска по username:', e);
            }
        }
        
        // Если все еще не найден, берем первого игрока как fallback
        if (!player && this.gameState.getPlayers().length > 0) {
            player = this.gameState.getPlayers()[0];
            console.warn('⚠️ BankModule: Используем первого игрока как fallback:', player.username);
        }
        
        if (!player) {
            console.warn('⚠️ BankModule: Игрок с ID не найден:', currentUserId);
            console.log('🔍 BankModule: Доступные игроки:', this.gameState.getPlayers().map(p => ({
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
     * Форматирование чисел
     */
    formatNumber(num) {
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
