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
        
        // Callback для подписки на GameStateManager
        this._stateUpdatedCallback = null;
        
        // Флаги для предотвращения множественных подписок
        this._eventListenersSetup = false;
        this._eventBusSubscribed = false;
        this._initialDataLoaded = false;
        this._isLoadingInitialData = false;
        this._lastExtractedData = null;
        this._lastExtractedTimestamp = 0;
        this._updateStateDebounceTimer = null;
        this._lastDisplayedData = null;
        
        // ПОДПИСКИ В КОНСТРУКТОРЕ - выполняется только один раз
        this._setupGameStateManagerSubscription();
        
        this.init();
    }
    
    /**
     * Статический метод для получения или создания единственного экземпляра BankPreview
     */
    static getInstance(config = {}) {
        // Проверяем, есть ли уже экземпляр в window.app.modules
        if (window.app && window.app.modules && window.app.modules.get('bankPreview')) {
            const existingInstance = window.app.modules.get('bankPreview');
            console.log('🔄 BankPreview: Используем существующий экземпляр (синглтон)');
            return existingInstance;
        }
        
        // Создаем новый экземпляр
        const instance = new BankPreview(config);
        
        // Сохраняем в window.app.modules для синглтон поведения
        if (window.app && window.app.modules) {
            window.app.modules.set('bankPreview', instance);
            console.log('✨ BankPreview: Создан новый экземпляр и сохранен как синглтон');
        }
        
        return instance;
    }
    
    /**
     * Настройка подписки на GameStateManager в конструкторе (только один раз)
     */
    _setupGameStateManagerSubscription() {
        if (this.gameStateManager && typeof this.gameStateManager.on === 'function' && !this._stateUpdatedCallback) {
            this._stateUpdatedCallback = (state) => {
                // Используем debounced версию для предотвращения спама
                if (this._updateStateDebounceTimer) {
                    clearTimeout(this._updateStateDebounceTimer);
                }
                this._updateStateDebounceTimer = setTimeout(() => {
                    this.updatePreviewDataFromState(state);
                    this._updateStateDebounceTimer = null;
                }, 1000); // Увеличиваем до 1 секунды для предотвращения мигания
            };
            
            this.gameStateManager.on('state:updated', this._stateUpdatedCallback);
            console.log('🔄 BankPreview: Подписан на обновления GameStateManager (конструктор)');
            
            // Проверяем есть ли уже данные в GameStateManager при подписке
            if (this.gameStateManager._state && this.gameStateManager._state.players) {
                console.log('🔄 BankPreview: Найдены существующие данные, обновляем сразу');
                // Убираем setTimeout чтобы избежать дополнительных обновлений
                // setTimeout(() => {
                //     this.updatePreviewDataFromState(this.gameStateManager._state);
                // }, 100);
            }
        }
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
        
        // ИНИЦИАЛИЗАЦИЯ: Периодические обновления теперь централизованы через GameStateManager
        // Локальные setInterval убраны для предотвращения множественных API запросов
        this.updateInterval = null;
        this.cleanupInterval = null;
        
        console.log('🔄 BankPreview: Периодические обновления будут управляться через GameStateManager');
        
        // Debounced версия updatePreviewData для предотвращения множественных вызовов
        this.updatePreviewDataDebounced = null;
        if (window.CommonUtils && window.CommonUtils.debounce) {
            this.updatePreviewDataDebounced = window.CommonUtils.debounce(() => {
                this.updatePreviewData();
            }, 2000);
        }
        
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
        
        // Загружаем данные НЕМЕДЛЕННО при создании превью
        this.loadInitialData();
        
        // Убираем дополнительный setTimeout который может вызывать мигание
        // setTimeout(() => {
        //     this.updatePreviewData();
        // }, 500);
    }

    /**
     * Загрузка начальных данных сразу при создании превью
     */
    loadInitialData() {
        // Предотвращаем множественные вызовы
        if (this._initialDataLoaded || this._isLoadingInitialData) {
            return;
        }
        
        this._isLoadingInitialData = true;
        console.log('🏦 BankPreview: Загружаем начальные данные');
        
        try {
            // Сначала пытаемся получить данные из BankModuleServer
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
            }
            
            let bankData = null;
            
            // ПРИОРИТЕТ 1: GameStateManager (актуальные данные игры)
            if (this.gameStateManager && this.gameStateManager._state && this.gameStateManager._state.players && this.gameStateManager._state.players.length > 0) {
                bankData = this.extractBankDataFromGameState(this.gameStateManager._state);
                // console.log('✅ BankPreview: Получены данные из GameStateManager (приоритет)');
            } 
            // ПРИОРИТЕТ 2: BankModule (только если есть реальные данные, не нули)
            else if (this.bankModule && this.bankModule.bankState && this.bankModule.bankState.balance > 0) {
                bankData = this.bankModule.bankState;
                console.log('✅ BankPreview: Получены данные из существующего BankModule (не нулевые)');
            } 
            // ПРИОРИТЕТ 3: Fallback данные
            else {
                bankData = this.getFallbackBankData();
                console.log('🔄 BankPreview: Используем fallback данные для начального отображения');
            }
            
            if (bankData && this.previewElement) {
                this.updatePreviewUI(bankData);
            }
        } catch (error) {
            console.warn('⚠️ BankPreview: Ошибка загрузки начальных данных:', error);
            // В случае ошибки показываем fallback данные
            const fallbackData = this.getFallbackBankData();
            if (this.previewElement) {
                this.updatePreviewUI(fallbackData);
            }
        } finally {
            // Сбрасываем флаги
            this._isLoadingInitialData = false;
            this._initialDataLoaded = true;
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (!this.previewElement || this._eventListenersSetup) return;
        
        // Клик по превью открывает банк
        this.previewElement.addEventListener('click', (e) => {
            e.preventDefault();
            this.openBank();
        });
        
        // Отмечаем, что обработчики настроены
        this._eventListenersSetup = true;
        
        // Подписываемся на события банка если есть eventBus (только один раз)
        if (this.eventBus && !this._eventBusSubscribed) {
            this.eventBus.on('bank:updated', () => {
                // Используем debounced версию для предотвращения спама
                if (this.updatePreviewDataDebounced) {
                    this.updatePreviewDataDebounced();
                } else {
                    this.updatePreviewData();
                }
            });
            
            // Подписываемся на события обновления карт, чтобы перерендерить превью (убрана задержка)
            this.eventBus.on('cards:updated', () => {
                requestAnimationFrame(() => {
                    this.render();
                });
            });
            
            this._eventBusSubscribed = true;
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
                // НЕ делаем дополнительных API запросов при открытии банка
                // BankModuleServer сам загрузит данные при открытии
                this.bankModule.open();
                console.log('🏦 BankPreview: Банк открыт (используем существующие данные)');
            } else {
                console.warn('⚠️ BankPreview: BankModule не найден для открытия');
            }
        } catch (error) {
            console.error('❌ BankPreview: Ошибка открытия банка:', error);
            // Показываем пользователю friendly сообщение вместо технической ошибки
            if (window.showNotification) {
                window.showNotification('Временные проблемы с сетью, попробуйте позже', 'warning');
            }
        }
    }

    /**
     * Обновление данных превью
     */
    async updatePreviewData() {
        if (!this.previewElement) return;
        
        // Предотвращаем множественные одновременные вызовы
        if (this._isUpdating) {
            return;
        }
        
        this._isUpdating = true;
        
        try {
            // Пытаемся получить данные из BankModuleServer
            let bankData = null;
            
            // Получаем модуль банка
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
            }
            
            // ПРИОРИТЕТ 1: GameStateManager (актуальные данные игры)
            if (this.gameStateManager && this.gameStateManager._state && this.gameStateManager._state.players && this.gameStateManager._state.players.length > 0) {
                bankData = this.extractBankDataFromGameState(this.gameStateManager._state);
                // console.log('✅ BankPreview: Используем кэшированные данные из GameStateManager (приоритет)');
            } 
            // ПРИОРИТЕТ 2: BankModule (только если есть реальные данные, не нули)
            else if (this.bankModule && this.bankModule.bankState && this.bankModule.bankState.balance > 0) {
                bankData = this.bankModule.bankState;
                // console.log('✅ BankPreview: Используем данные из BankModule (не нулевые)');
            } 
            // ПРИОРИТЕТ 3: Fallback данные
            else {
                // console.log('🔄 BankPreview: Используем fallback данные (без API запросов)');
                bankData = this.getFallbackBankData();
            }
            
            if (bankData) {
                this.updatePreviewUI(bankData);
            } else {
                // Используем fallback данные вместо нулей
                console.log('🔄 BankPreview: Нет данных, используем fallback');
                this.updatePreviewUI(this.getFallbackBankData());
            }
        } catch (error) {
            console.warn('⚠️ BankPreview: Ошибка обновления данных:', error);
            // В случае ошибки также используем fallback данные
            this.updatePreviewUI(this.getFallbackBankData());
        } finally {
            this._isUpdating = false;
        }
    }

    /**
     * Обновление данных превью из переданного состояния (без дополнительных API запросов)
     */
    updatePreviewDataFromState(state) {
        if (!this.previewElement || this._isUpdating) return;
        
        this._isUpdating = true;
        
        try {
            let bankData = null;
            
            // Сначала пытаемся получить данные из BankModuleServer
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
            }
            
            if (this.bankModule && this.bankModule.bankState) {
                bankData = this.bankModule.bankState;
                // console.log('✅ BankPreview: Обновляем данные из BankModule');
            } else if (state && state.players) {
                // Используем переданное состояние без дополнительных запросов
                bankData = this.extractBankDataFromGameState(state);
                // console.log('✅ BankPreview: Обновляем данные из переданного состояния');
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
            console.warn('⚠️ BankPreview: Ошибка обновления данных из состояния:', error);
        } finally {
            this._isUpdating = false;
        }
    }

    /**
     * Извлечение данных банка из состояния игры
     */
    extractBankDataFromGameState(gameState) {
        // Кэширование для предотвращения повторных вычислений
        const now = Date.now();
        if (this._lastExtractedData && (now - this._lastExtractedTimestamp) < 1000) {
            // console.log('🚀 BankPreview: Используем кэшированные данные extractBankDataFromGameState');
            return this._lastExtractedData;
        }
        
        const currentUser = this.getCurrentUser();
        // Убираем избыточное логирование для уменьшения спама
        // console.log('🔍 BankPreview: extractBankDataFromGameState - currentUser:', currentUser);
        // console.log('🔍 BankPreview: extractBankDataFromGameState - gameState.players:', gameState.players?.length);
        
        if (!currentUser || !gameState.players) {
            console.warn('⚠️ BankPreview: Нет currentUser или players в gameState');
            return null;
        }
        
        const currentPlayer = gameState.players.find(p => 
            p.id === currentUser.id || 
            p.userId === currentUser.id || 
            p.username === currentUser.username
        );
        
        // console.log('🔍 BankPreview: Найденный currentPlayer:', currentPlayer);
        
        if (!currentPlayer) {
            console.warn('⚠️ BankPreview: currentPlayer не найден в gameState.players');
            return null;
        }
        
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
        let bankData;
        if (currentPlayer.profession === 'Предприниматель' || !currentPlayer.profession) {
            bankData = {
                balance: balance,
                income: 10000,
                expenses: 6200,
                netIncome: 3800,
                credit: currentPlayer.currentLoan || 0,
                maxCredit: 38000
            };
        } else {
            // Для других профессий используем их данные
            bankData = {
                balance: balance,
                income: currentPlayer.totalIncome || currentPlayer.salary || 5000,
                expenses: currentPlayer.monthlyExpenses || 2000,
                netIncome: (currentPlayer.totalIncome || currentPlayer.salary || 5000) - (currentPlayer.monthlyExpenses || 2000),
                credit: currentPlayer.currentLoan || 0,
                maxCredit: Math.max(((currentPlayer.totalIncome || currentPlayer.salary || 5000) - (currentPlayer.monthlyExpenses || 2000)) * 10, 0)
            };
        }
        
        // console.log('💰 BankPreview: Извлеченные данные банка:', bankData);
        
        // Сохраняем в кэш
        this._lastExtractedData = bankData;
        this._lastExtractedTimestamp = Date.now();
        
        return bankData;
    }

    /**
     * Получение fallback данных банка
     */
    getFallbackBankData() {
        const currentUser = this.getCurrentUser();
        
        // Возвращаем стандартные данные для предпринимателя
        return {
            balance: 5000, // Стартовый баланс
            income: 10000,
            expenses: 6200,
            netIncome: 3800,
            credit: 0,
            maxCredit: 38000
        };
    }

    /**
     * Обновление UI превью
     */
    updatePreviewUI(bankData) {
        if (!this.previewElement || !bankData) return;
        
        // Проверяем, изменились ли данные - предотвращаем мигание UI
        const dataString = JSON.stringify({
            balance: bankData.balance || 0,
            income: bankData.income || 0,
            expenses: bankData.expenses || 0,
            netIncome: bankData.netIncome || 0,
            credit: bankData.credit || 0,
            maxCredit: bankData.maxCredit || 0
        });
        
        if (this._lastDisplayedData === dataString) {
            // Данные не изменились, пропускаем обновление UI
            return;
        }
        
        this._lastDisplayedData = dataString;
        
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
        // Очищаем интервалы (если они были созданы)
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Отписываемся от GameStateManager
        if (this.gameStateManager && typeof this.gameStateManager.off === 'function' && this._stateUpdatedCallback) {
            this.gameStateManager.off('state:updated', this._stateUpdatedCallback);
        }
        
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }
        
        if (this._updateStateDebounceTimer) {
            clearTimeout(this._updateStateDebounceTimer);
            this._updateStateDebounceTimer = null;
        }
        
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Сбрасываем флаг обновления
        this._isUpdating = false;
        
        // СБРОС ФЛАГОВ ДЛЯ КОНТРОЛИРУЕМОЙ РЕИНИЦИАЛИЗАЦИИ
        this._eventListenersSetup = false;
        this._eventBusSubscribed = false;
        this._stateUpdatedCallback = null;
        
        if (this.previewElement && this.previewElement.parentNode) {
            this.previewElement.parentNode.removeChild(this.previewElement);
        }
        
        console.log('🏦 BankPreview: Уничтожен (флаги сброшены для реинициализации)');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.BankPreview = BankPreview;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankPreview;
}
