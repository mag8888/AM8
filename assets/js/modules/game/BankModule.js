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
        this.currentUserId = null;
        this.currentRoomId = null;
        
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
                                        <span class="summary-value income" id="bank-income">$6 000</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-icon expense">📉</span>
                                        <span class="summary-label">Расходы:</span>
                                        <span class="summary-value expense" id="bank-expenses">$2 500</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-icon payday">💰</span>
                                        <span class="summary-label">PAYDAY:</span>
                                        <span class="summary-value payday" id="bank-salary">$3 500/мес</span>
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
                                    <div class="credit-actions">
                                        <button class="credit-status-btn" id="credit-status">✓ Без кредитов</button>
                                        <button class="credit-take-btn" id="credit-take">Взять</button>
                                    </div>
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
                width: 90%;
                max-width: 1200px;
                height: 80%;
                max-height: 800px;
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
        creditTake.addEventListener('click', () => this.takeCredit());
        
        console.log('🏦 BankModule: Обработчики настроены');
    }
    
    /**
     * Открытие банк модуля
     */
    open() {
        if (this.ui) {
            this.ui.style.display = 'flex';
            this.isOpen = true;
            this.updateBankData();
            this.loadPlayers();
            console.log('🏦 BankModule: Открыт');
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
        }
    }
    
    /**
     * Обновление данных банка
     */
    updateBankData() {
        if (!this.gameState) return;
        
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return;
        
        // Обновляем баланс
        const balanceElement = this.ui.querySelector('#bank-balance');
        if (balanceElement) {
            balanceElement.textContent = `$${this.formatNumber(currentPlayer.money || 0)}`;
        }
        
        // Обновляем доходы
        const incomeElement = this.ui.querySelector('#bank-income');
        if (incomeElement) {
            incomeElement.textContent = `$${this.formatNumber(currentPlayer.totalIncome || 0)}`;
        }
        
        // Обновляем расходы
        const expensesElement = this.ui.querySelector('#bank-expenses');
        if (expensesElement) {
            expensesElement.textContent = `$${this.formatNumber(currentPlayer.monthlyExpenses || 0)}`;
        }
        
        // Обновляем зарплату
        const salaryElement = this.ui.querySelector('#bank-salary');
        if (salaryElement) {
            salaryElement.textContent = `$${this.formatNumber(currentPlayer.salary || 0)}/мес`;
        }
        
        // Обновляем кредит
        const creditElement = this.ui.querySelector('#bank-credit');
        if (creditElement) {
            creditElement.textContent = `$${this.formatNumber(currentPlayer.credit || 0)}`;
        }
        
        // Обновляем максимальный кредит
        const maxCreditElement = this.ui.querySelector('#bank-max-credit');
        if (maxCreditElement) {
            maxCreditElement.textContent = `$${this.formatNumber(this.bankState.maxCredit)}`;
        }
        
        console.log('🏦 BankModule: Данные обновлены');
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
        
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) {
            this.showNotification('Ошибка: Текущий игрок не найден', 'error');
            return;
        }
        
        if (currentPlayer.money < amount) {
            this.showNotification('Недостаточно средств', 'error');
            return;
        }
        
        try {
            // Выполняем перевод
            const success = await this.performTransfer(recipientId, amount);
            
            if (success) {
                this.showNotification(`Перевод $${this.formatNumber(amount)} выполнен`, 'success');
                this.resetTransferForm();
                this.updateBankData();
                this.addTransaction('Перевод игроку', `Игрок → ${recipientId}`, amount, 'completed');
            } else {
                this.showNotification('Ошибка выполнения перевода', 'error');
            }
        } catch (error) {
            console.error('❌ BankModule: Ошибка перевода:', error);
            this.showNotification('Ошибка выполнения перевода', 'error');
        }
    }
    
    /**
     * Выполнение перевода (заглушка для API)
     */
    async performTransfer(recipientId, amount) {
        // TODO: Реализовать API вызов для перевода
        // Пока что обновляем локальное состояние
        
        if (!this.gameState) return false;
        
        const currentPlayer = this.gameState.getCurrentPlayer();
        const players = this.gameState.getPlayers();
        const recipient = players.find(p => p.id === recipientId);
        
        if (!recipient) return false;
        
        // Обновляем балансы
        currentPlayer.money -= amount;
        recipient.money += amount;
        
        // Эмитим событие обновления
        if (this.eventBus) {
            this.eventBus.emit('bank:transfer', {
                from: currentPlayer.id,
                to: recipientId,
                amount: amount
            });
        }
        
        return true;
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
     * Добавление транзакции в историю
     */
    addTransaction(title, details, amount, status = 'completed') {
        const transactionsList = this.ui.querySelector('#transactions-list');
        if (!transactionsList) return;
        
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        const now = new Date();
        const timeString = now.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        transactionItem.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-title">${title}</div>
                <div class="transaction-details">${details}</div>
                <div class="transaction-time">${timeString}</div>
            </div>
            <div class="transaction-amount ${amount > 0 ? 'positive' : 'negative'}">${amount > 0 ? '+' : ''}$${this.formatNumber(amount)}</div>
            <div class="transaction-status ${status}">${status === 'completed' ? 'Завершено' : status}</div>
        `;
        
        // Добавляем в начало списка
        transactionsList.insertBefore(transactionItem, transactionsList.firstChild);
        
        // Обновляем счетчик новых транзакций
        const newBadge = this.ui.querySelector('#new-transactions');
        if (newBadge) {
            const currentCount = parseInt(newBadge.textContent) || 0;
            newBadge.textContent = currentCount + 1;
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
