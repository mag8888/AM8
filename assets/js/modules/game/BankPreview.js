/**
 * BankPreview v1.0.0
 * -----------------------------------------------------------------------------
 * Компонент для отображения превью банка на главном экране игровой комнаты.
 * Показывает краткую финансовую информацию и переводит к полному банку.
 */

class BankPreview {
    constructor(config = {}) {
        this.containerSelector = config.containerSelector || '#card-decks-panel';
        this.eventBus = config.eventBus || null;
        this.gameStateManager = config.gameStateManager || null;
        this.bankModule = null;
        
        this.container = null;
        this.previewElement = null;
        
        this.init();
    }

    /**
     * Инициализация компонента
     */
    init() {
        this.container = document.querySelector(this.containerSelector);
        
        if (!this.container) {
            console.warn('⚠️ BankPreview: Контейнер не найден:', this.containerSelector);
            return;
        }
        
        // Рендерим сразу для немедленного отображения
        this.render();
        
        // setupEventListeners будет вызван в render()
        
        // Обновляем данные каждые 30 секунд для снижения нагрузки
        this.updateInterval = setInterval(() => {
            this.updatePreviewData();
        }, 30000);
        
        // Следим за изменениями в контейнере (если CardDeckPanel перезаписывает содержимое)
        this.observeContainer();
        
        console.log('🏦 BankPreview: Инициализирован');
    }

    /**
     * Рендер превью банка
     */
    render() {
        if (!this.container) return;
        
        // Создаем элемент превью банка
        this.previewElement = document.createElement('div');
        this.previewElement.className = 'bank-preview-card';
        this.previewElement.innerHTML = `
            <div class="bank-preview-header">
                <div class="bank-preview-icon">🏦</div>
                <div class="bank-preview-title">Банк</div>
                <div class="bank-preview-status">Активен</div>
            </div>
            
            <div class="bank-preview-balance">
                <div class="bank-preview-balance-amount" id="bank-preview-balance">$0</div>
                <div class="bank-preview-balance-label">Доступно для операций</div>
            </div>
            
            <div class="bank-preview-summary">
                <div class="bank-preview-item">
                    <span class="bank-preview-item-icon">📈</span>
                    <span class="bank-preview-item-label">Доход:</span>
                    <span class="bank-preview-item-value" id="bank-preview-income">$0</span>
                </div>
                <div class="bank-preview-item">
                    <span class="bank-preview-item-icon">📉</span>
                    <span class="bank-preview-item-label">Расходы:</span>
                    <span class="bank-preview-item-value" id="bank-preview-expenses">$0</span>
                </div>
                <div class="bank-preview-item">
                    <span class="bank-preview-item-icon">💎</span>
                    <span class="bank-preview-item-label">Чистый доход:</span>
                    <span class="bank-preview-item-value" id="bank-preview-net-income">$0/мес</span>
                </div>
            </div>
            
            <div class="bank-preview-credit">
                <div class="bank-preview-item">
                    <span class="bank-preview-item-icon">💳</span>
                    <span class="bank-preview-item-label">Кредит:</span>
                    <span class="bank-preview-item-value" id="bank-preview-credit">$0</span>
                </div>
                <div class="bank-preview-item">
                    <span class="bank-preview-item-label">Макс. кредит:</span>
                    <span class="bank-preview-item-value" id="bank-preview-max-credit">$0</span>
                </div>
            </div>
        `;
        
        // Добавляем стили если их еще нет
        this.addStyles();
        
        // Проверяем, есть ли уже банк превью в контейнере
        const existingPreview = this.container.querySelector('.bank-preview-card');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        // Вставляем превью в начало контейнера
        this.container.insertBefore(this.previewElement, this.container.firstChild);
        
        // Настраиваем обработчики событий после создания элемента
        this.setupEventListeners();
        
        // Загружаем данные
        this.updatePreviewData();
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (!this.previewElement) return;
        
        // Клик по превью открывает банк
        this.previewElement.addEventListener('click', (e) => {
            e.preventDefault();
            this.openBank();
        });
        
        // Подписываемся на события банка если есть eventBus
        if (this.eventBus) {
            this.eventBus.on('bank:updated', () => {
                this.updatePreviewData();
            });
            
            // Подписываемся на события обновления карт, чтобы перерендерить превью (убрана задержка)
            this.eventBus.on('cards:updated', () => {
                requestAnimationFrame(() => {
                    this.render();
                });
            });
        }
    }

    /**
     * Открытие банка
     */
    openBank() {
        try {
            // Получаем банк из window.app или пытаемся найти в DOM
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
            }
            
            // Если не найден через app, ищем через PlayersPanel
            if (!this.bankModule) {
                const playersPanel = document.querySelector('#players-panel');
                if (playersPanel && playersPanel._playersPanelInstance) {
                    this.bankModule = playersPanel._playersPanelInstance.bankModule;
                }
            }
            
            if (this.bankModule && typeof this.bankModule.open === 'function') {
                this.bankModule.open();
                console.log('🏦 BankPreview: Банк открыт');
            } else {
                console.warn('⚠️ BankPreview: BankModule не найден для открытия');
            }
        } catch (error) {
            console.error('❌ BankPreview: Ошибка открытия банка:', error);
        }
    }

    /**
     * Обновление данных превью
     */
    async updatePreviewData() {
        if (!this.previewElement) return;
        
        try {
            // Пытаемся получить данные из BankModuleServer
            let bankData = null;
            
            // Получаем модуль банка
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
            }
            
            // Если есть банк модуль, получаем данные из него
            if (this.bankModule && this.bankModule.bankState) {
                bankData = this.bankModule.bankState;
            } else {
                // Fallback: получаем данные с сервера напрямую
                const roomId = this.getCurrentRoomId();
                if (roomId) {
                    // Проверяем глобальный rate limiter для game-state
                    if (window.CommonUtils && !window.CommonUtils.canMakeGameStateRequest(roomId)) {
                        console.log('🚫 BankPreview: Пропускаем запрос из-за глобального rate limiting');
                        return;
                    }
                    
                    // Устанавливаем флаг pending в глобальном limiter
                    if (window.CommonUtils) {
                        window.CommonUtils.gameStateLimiter.setRequestPending(roomId);
                    }
                    
                    try {
                        const response = await fetch(`/api/rooms/${roomId}/game-state`);
                        if (response.ok) {
                            const gameStateData = await response.json();
                            if (gameStateData.success && gameStateData.state?.players) {
                                bankData = this.extractBankDataFromGameState(gameStateData.state);
                            }
                        }
                    } finally {
                        // Очищаем флаг pending в глобальном limiter
                        if (window.CommonUtils) {
                            window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
                        }
                    }
                }
            }
            
            if (bankData) {
                this.updatePreviewUI(bankData);
            } else {
                // Показываем заглушку если данных нет
                this.updatePreviewUI({
                    balance: 0,
                    income: 0,
                    expenses: 0,
                    netIncome: 0,
                    credit: 0,
                    maxCredit: 0
                });
            }
        } catch (error) {
            console.warn('⚠️ BankPreview: Ошибка обновления данных:', error);
        }
    }

    /**
     * Извлечение данных банка из состояния игры
     */
    extractBankDataFromGameState(gameState) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || !gameState.players) return null;
        
        const currentPlayer = gameState.players.find(p => 
            p.id === currentUser.id || 
            p.userId === currentUser.id || 
            p.username === currentUser.username
        );
        
        if (!currentPlayer) return null;
        
        // Получаем баланс с fallback на стартовый баланс
        let balance = (currentPlayer.money !== undefined && currentPlayer.money !== null) 
            ? currentPlayer.money 
            : ((currentPlayer.balance !== undefined && currentPlayer.balance !== null) 
                ? currentPlayer.balance 
                : 5000); // fallback только если значения undefined/null
        
        // Если баланс 0, устанавливаем стартовый баланс 5000
        if (balance === 0) {
            balance = 5000;
            console.log('💰 BankPreview: Баланс был 0, устанавливаем стартовый баланс 5000');
        }
        
        // Используем данные предпринимателя по умолчанию если это предприниматель
        if (currentPlayer.profession === 'Предприниматель' || !currentPlayer.profession) {
            return {
                balance: balance,
                income: 10000,
                expenses: 6200,
                netIncome: 3800,
                credit: currentPlayer.currentLoan || 0,
                maxCredit: 38000
            };
        }
        
        // Для других профессий используем их данные
        return {
            balance: balance,
            income: currentPlayer.totalIncome || currentPlayer.salary || 5000,
            expenses: currentPlayer.monthlyExpenses || 2000,
            netIncome: (currentPlayer.totalIncome || currentPlayer.salary || 5000) - (currentPlayer.monthlyExpenses || 2000),
            credit: currentPlayer.currentLoan || 0,
            maxCredit: Math.max(((currentPlayer.totalIncome || currentPlayer.salary || 5000) - (currentPlayer.monthlyExpenses || 2000)) * 10, 0)
        };
    }

    /**
     * Обновление UI превью
     */
    updatePreviewUI(bankData) {
        if (!this.previewElement || !bankData) return;
        
        const updateElement = (id, value) => {
            const element = this.previewElement.querySelector(id);
            if (element) {
                element.textContent = typeof value === 'number' ? `$${this.formatNumber(value)}` : value;
            }
        };
        
        updateElement('#bank-preview-balance', bankData.balance || 0);
        updateElement('#bank-preview-income', bankData.income || 0);
        updateElement('#bank-preview-expenses', bankData.expenses || 0);
        updateElement('#bank-preview-net-income', `${bankData.netIncome || 0}/мес`);
        updateElement('#bank-preview-credit', bankData.credit || 0);
        updateElement('#bank-preview-max-credit', bankData.maxCredit || 0);
        
        // Обновляем цвет кредита
        const creditElement = this.previewElement.querySelector('#bank-preview-credit');
        if (creditElement) {
            creditElement.style.color = (bankData.credit || 0) > 0 ? '#ef4444' : '#10b981';
        }
    }

    /**
     * Получение ID текущей комнаты
     */
    getCurrentRoomId() {
        const hash = window.location.hash;
        const match = hash.match(/roomId=([^&]+)/);
        return match ? match[1] : null;
    }

    /**
     * Получение текущего пользователя
     */
    getCurrentUser() {
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                if (bundle.userId || bundle.id || bundle.username) {
                    return {
                        id: bundle.userId || bundle.id,
                        username: bundle.username || bundle.currentUser?.username
                    };
                }
            }
            
            // Fallback: localStorage
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                return JSON.parse(userData);
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ BankPreview: Ошибка получения пользователя:', error);
            return null;
        }
    }

    /**
     * Форматирование чисел
     */
    formatNumber(num) {
        if (typeof num !== 'number') return '0';
        return new Intl.NumberFormat('ru-RU').format(Math.floor(num));
    }

    /**
     * Добавление стилей
     */
    addStyles() {
        if (document.getElementById('bank-preview-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'bank-preview-styles';
        styles.textContent = `
            .bank-preview-card {
                background: linear-gradient(145deg, rgba(20, 25, 40, 0.95), rgba(15, 20, 35, 0.95));
                border-radius: 1rem;
                padding: 1rem;
                margin-bottom: 1rem;
                border: 2px solid rgba(99, 102, 241, 0.3);
                backdrop-filter: blur(20px);
                color: #ffffff;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }
            
            .bank-preview-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(99, 102, 241, 0.4);
                border-color: rgba(99, 102, 241, 0.5);
            }
            
            .bank-preview-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1rem;
            }
            
            .bank-preview-icon {
                font-size: 1.5rem;
            }
            
            .bank-preview-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: #ffffff;
                flex: 1;
                margin-left: 0.5rem;
            }
            
            .bank-preview-status {
                background: rgba(34, 197, 94, 0.2);
                color: #10b981;
                padding: 0.25rem 0.5rem;
                border-radius: 0.5rem;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .bank-preview-balance {
                text-align: center;
                margin-bottom: 1rem;
            }
            
            .bank-preview-balance-amount {
                font-size: 2rem;
                font-weight: 700;
                color: #10b981;
                line-height: 1;
            }
            
            .bank-preview-balance-label {
                font-size: 0.8rem;
                color: #a0a0a0;
                margin-top: 0.25rem;
            }
            
            .bank-preview-summary,
            .bank-preview-credit {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.5rem;
                padding: 0.75rem;
                margin-bottom: 0.5rem;
            }
            
            .bank-preview-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                font-size: 0.85rem;
            }
            
            .bank-preview-item:last-child {
                margin-bottom: 0;
            }
            
            .bank-preview-item-icon {
                margin-right: 0.5rem;
            }
            
            .bank-preview-item-label {
                color: #a0a0a0;
                flex: 1;
            }
            
            .bank-preview-item-value {
                color: #ffffff;
                font-weight: 600;
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Наблюдение за изменениями контейнера
     */
    observeContainer() {
        if (!this.container || !this.container.parentNode) return;
        
        // Debounce для избежания слишком частых перерендеров
        this.renderDebounceTimer = null;
        
        // Используем MutationObserver для отслеживания изменений в контейнере
        this.observer = new MutationObserver((mutations) => {
            // Проверяем только если есть изменения в дочерних элементах
            const hasChildListChanges = mutations.some(mutation => mutation.type === 'childList');
            if (!hasChildListChanges) return;
            
            // Проверяем, не удалили ли наш элемент превью
            const hasPreview = this.container.querySelector('.bank-preview-card');
            if (!hasPreview && this.previewElement) {
                // Debounce перерендер с requestAnimationFrame для лучшей производительности
                if (this.renderDebounceTimer) {
                    cancelAnimationFrame(this.renderDebounceTimer);
                }
                this.renderDebounceTimer = requestAnimationFrame(() => {
                    this.render();
                    this.renderDebounceTimer = null;
                });
            }
        });
        
        this.observer.observe(this.container, {
            childList: true,
            subtree: false,
            attributes: false // Отключаем отслеживание атрибутов для производительности
        });
    }

    /**
     * Уничтожение компонента
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }
        
        if (this.observer) {
            this.observer.disconnect();
        }
        
        if (this.previewElement && this.previewElement.parentNode) {
            this.previewElement.parentNode.removeChild(this.previewElement);
        }
        
        console.log('🏦 BankPreview: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.BankPreview = BankPreview;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankPreview;
}
