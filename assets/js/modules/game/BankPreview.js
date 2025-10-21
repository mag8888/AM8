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
                // Обновляем только если данные действительные (не нулевые или не fallback)
                const currentData = this.extractBankDataFromGameState(this.gameStateManager._state);
                if (currentData && currentData.balance > 0) {
                    setTimeout(() => {
                        this.updatePreviewDataFromState(this.gameStateManager._state);
                    }, 200);
                }
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

        // Снапшот последнего валидного состояния банка
        this._lastBankSnapshot = null;
        this._renderVersion = 0;
        this._restoring = false;
        
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

        this._renderVersion += 1;
        this.previewElement.setAttribute('data-render-version', String(this._renderVersion));
        this.restoreLastSnapshot();
        
        // Загружаем данные НЕМЕДЛЕННО при создании превью
        this.loadInitialData();
        
        // Убираем проблематичный setTimeout для Safari
        // Данные будут загружены через синхронизацию с BankModuleServer
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
            
            // ПРИОРИТЕТ 1: GameStateManager (актуальные данные игры) - только если данные валидны
            let gamestateData = null;
            if (this.gameStateManager && this.gameStateManager._state && this.gameStateManager._state.players && this.gameStateManager._state.players.length > 0) {
                gamestateData = this.extractBankDataFromGameState(this.gameStateManager._state);
                if (gamestateData && (gamestateData.balance > 0 || gamestateData.income > 0)) {
                    bankData = gamestateData;
                    console.log('✅ BankPreview: Начальные данные из GameStateManager (валидные)');
                }
            } 
            
            // ПРИОРИТЕТ 2: BankModule (если GameState данные невалидны или отсутствуют)
            if (!bankData || (bankData.balance === 0 && bankData.income === 0)) {
                if (this.bankModule && this.bankModule.bankState && this.bankModule.bankState.balance > 0) {
                    bankData = this.bankModule.bankState;
                    console.log('✅ BankPreview: Начальные данные из BankModuleServer (GameState невалидны)');
                }
            }
            
            // ПРИОРИТЕТ 3: Fallback данные
            if (!bankData || (bankData.balance === 0 && bankData.income === 0)) {
                bankData = this.getFallbackBankData();
                console.log('🔄 BankPreview: Используем fallback данные для начального отображения');
            }
            
            if (bankData && this.previewElement) {
                this.updatePreviewUI(bankData);
            } else if (!bankData) {
                // Если нет данных, принудительно показываем fallback
                const fallbackData = this.getFallbackBankData();
                if (this.previewElement) {
                    this.updatePreviewUI(fallbackData);
                }
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
            console.log('🏦 BankPreview: Попытка открытия банка...');
            
            // Получаем банк из window.app или пытаемся найти в DOM
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
                console.log('🏦 BankPreview: BankModule из app.modules:', !!this.bankModule);
            }
            
            // Если не найден через app, ищем через PlayersPanel
            if (!this.bankModule) {
                const playersPanel = document.querySelector('#players-panel');
                if (playersPanel && playersPanel._playersPanelInstance) {
                    this.bankModule = playersPanel._playersPanelInstance.bankModule;
                    console.log('🏦 BankPreview: BankModule из PlayersPanel:', !!this.bankModule);
                }
            }
            
            // Дополнительный поиск через глобальные объекты
            if (!this.bankModule) {
                if (window.app && window.app.getModule) {
                    this.bankModule = window.app.getModule('bankModuleServer') || window.app.getModule('bankModule');
                    console.log('🏦 BankPreview: BankModule через getModule:', !!this.bankModule);
                }
            }
            
            if (this.bankModule && typeof this.bankModule.open === 'function') {
                console.log('🏦 BankPreview: Открываем банк...');
                this.bankModule.open();
                console.log('✅ BankPreview: Банк открыт успешно');
            } else {
                console.warn('⚠️ BankPreview: BankModule не найден, пытаемся создать через PlayersPanel');
                
                // Попытка создать BankModule через PlayersPanel
                if (window.app && window.app.getModule) {
                    const playersPanel = window.app.getModule('playersPanel');
                    if (playersPanel && typeof playersPanel.openBankModule === 'function') {
                        console.log('🏦 BankPreview: Используем PlayersPanel.openBankModule');
                        playersPanel.openBankModule();
                    } else {
                        console.error('❌ BankPreview: Не удалось найти способ открытия банка');
                        if (window.showNotification) {
                            window.showNotification('Ошибка открытия банка. Попробуйте обновить страницу.', 'error');
                        }
                    }
                }
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
            
            // ПРИОРИТЕТ 1: GameStateManager (актуальные данные игры) - только если данные валидны
            let gamestateData = null;
            if (this.gameStateManager && this.gameStateManager._state && this.gameStateManager._state.players && this.gameStateManager._state.players.length > 0) {
                gamestateData = this.extractBankDataFromGameState(this.gameStateManager._state);
                // Используем данные из GameState только если они валидны (баланс > 0 или есть другие данные)
                if (gamestateData && (gamestateData.balance > 0 || gamestateData.income > 0)) {
                    bankData = gamestateData;
                    console.log('✅ BankPreview: Используем валидные данные из GameStateManager');
                }
            } 
            
            // ПРИОРИТЕТ 2: BankModule (если GameState данные невалидны или отсутствуют)
            if ((!bankData || (bankData.balance === 0 && bankData.income === 0)) && this.bankModule && this.bankModule.bankState) {
                const moduleState = this.bankModule.bankState;
                const moduleLoaded = moduleState.loaded !== false;
                if (moduleLoaded && (moduleState.balance > 0 || moduleState.income > 0 || moduleState.netIncome > 0)) {
                    bankData = moduleState;
                    console.log('✅ BankPreview: Используем данные из BankModuleServer (GameState данные невалидны)');
                }
            }
            
            // ПРИОРИТЕТ 3: Fallback данные (если все остальные источники невалидны)
            if (!bankData || (bankData.balance === 0 && bankData.income === 0)) {
                bankData = this.getFallbackBankData();
            }
            
            if (bankData) {
                this.updatePreviewUI(bankData);
            } else {
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
            
            if (this.bankModule && this.bankModule.bankState && this.bankModule.bankState.loaded !== false) {
                bankData = this.bankModule.bankState;
            } else if (state && state.players) {
                // Используем переданное состояние без дополнительных запросов
                bankData = this.extractBankDataFromGameState(state);
                // console.log('✅ BankPreview: Обновляем данные из переданного состояния');
            }
            
            if (bankData) {
                this.updatePreviewUI(bankData);
            } else {
                // Используем fallback данные вместо нулей для лучшего UX
                this.updatePreviewUI(this.getFallbackBankData());
            }
        } catch (error) {
            console.warn('⚠️ BankPreview: Ошибка обновления данных из состояния:', error);
        } finally {
            this._isUpdating = false;
        }
    }

    /**
     * Обновление данных превью напрямую из BankModule (вызывается BankModuleServer)
     */
    updateFromBankModule(bankState) {
        if (!this.previewElement || !bankState || this._isUpdating) {
            return;
        }

        if (!bankState || bankState.loaded === false) {
            return;
        }

        const normalized = this._normalizeBankData(bankState);
        const incomingValid = this._isValidSnapshot(normalized);

        if (!incomingValid && this._isValidSnapshot(this._lastBankSnapshot)) {
            console.log('🔄 BankPreview: Сохраняем отображение — новые данные нулевые');
            return;
        }

        console.log('🔄 BankPreview: Получены данные от BankModuleServer:', normalized);
        this.updatePreviewUI(normalized);
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
        if (!this.previewElement || !bankData) {
            return;
        }

        const normalized = this._normalizeBankData(bankData);
        const incomingValid = this._isValidSnapshot(normalized);
        const currentSnapshot = this._lastBankSnapshot;
        const currentValid = this._isValidSnapshot(currentSnapshot);
        const snapshotsEqual = this._compareSnapshots(currentSnapshot, normalized);

        // Предотвращаем перезапись валидных данных нулевыми снапшотами,
        // если только мы не восстанавливаем DOM после перерендера.
        if (!this._restoring && currentValid && !incomingValid) {
            console.log('🔄 BankPreview: Сохраняем прежние данные, новые значения пустые');
            return;
        }

        if (!this._restoring && snapshotsEqual) {
            return;
        }

        if (incomingValid) {
            console.log('✅ BankPreview: Обновляем UI с новыми данными:', JSON.stringify(normalized));
        }

        this._lastBankSnapshot = normalized;
        this._lastDisplayedData = JSON.stringify(normalized);

        const updateElement = (selector, value, formatter = (v) => `$${this.formatNumber(v)}`) => {
            const element = this.previewElement.querySelector(selector);
            if (!element) {
                console.warn(`⚠️ BankPreview: Элемент ${selector} не найден`);
                return;
            }
            element.textContent = formatter(value);
        };

        updateElement('#bank-preview-balance', normalized.balance);
        updateElement('#bank-preview-income', normalized.income);
        updateElement('#bank-preview-expenses', normalized.expenses);
        updateElement('#bank-preview-net-income', normalized.netIncome, (v) => `$${this.formatNumber(v)}/мес`);
        updateElement('#bank-preview-credit', normalized.credit);
        updateElement('#bank-preview-max-credit', normalized.maxCredit);

        const creditElement = this.previewElement.querySelector('#bank-preview-credit');
        if (creditElement) {
            creditElement.style.color = normalized.credit > 0 ? '#ef4444' : '#10b981';
        }
    }

    /**
     * Восстановление последнего валидного снапшота после повторного рендера
     */
    restoreLastSnapshot() {
        if (!this.previewElement || !this._lastBankSnapshot) {
            return;
        }

        this._restoring = true;
        try {
            this.updatePreviewUI(this._lastBankSnapshot);
        } finally {
            this._restoring = false;
        }
    }

    /**
     * Нормализация входящих данных
     * @private
     */
    _normalizeBankData(data = {}) {
        const toNumber = (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
        };

        return {
            balance: toNumber(data.balance),
            income: toNumber(data.income),
            expenses: toNumber(data.expenses),
            netIncome: toNumber(data.netIncome),
            credit: toNumber(data.credit),
            maxCredit: toNumber(data.maxCredit)
        };
    }

    /**
     * Проверка, содержит ли снапшот значимые данные
     * @private
     */
    _isValidSnapshot(snapshot) {
        if (!snapshot) {
            return false;
        }

        return snapshot.balance > 0 ||
            snapshot.income > 0 ||
            snapshot.netIncome > 0 ||
            snapshot.credit > 0;
    }

    /**
     * Сравнение двух снапшотов
     * @private
     */
    _compareSnapshots(a, b) {
        if (!a || !b) {
            return false;
        }

        return a.balance === b.balance &&
            a.income === b.income &&
            a.expenses === b.expenses &&
            a.netIncome === b.netIncome &&
            a.credit === b.credit &&
            a.maxCredit === b.maxCredit;
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
        // Очищаем все возможные таймеры для предотвращения утечек памяти
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
            this.renderDebounceTimer = null;
        }
        
        if (this._updateStateDebounceTimer) {
            clearTimeout(this._updateStateDebounceTimer);
            this._updateStateDebounceTimer = null;
        }
        
        // Отписываемся от GameStateManager
        if (this.gameStateManager && typeof this.gameStateManager.off === 'function' && this._stateUpdatedCallback) {
            this.gameStateManager.off('state:updated', this._stateUpdatedCallback);
        }
        
        // Отписываемся от EventBus
        if (this.eventBus && typeof this.eventBus.off === 'function') {
            this.eventBus.off('bank:update', this._bankUpdateCallback);
        }
        
        // Отключаем MutationObserver
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Очищаем ссылки на элементы
        if (this.previewElement && this.previewElement.parentNode) {
            this.previewElement.parentNode.removeChild(this.previewElement);
            this.previewElement = null;
        }
        
        // Сбрасываем все флаги и данные
        this._isUpdating = false;
        this._initialDataLoaded = false;
        this._isLoadingInitialData = false;
        this._lastDisplayedData = null;
        this._lastBankSnapshot = null;
        this._lastExtractedData = null;
        
        // СБРОС ФЛАГОВ ДЛЯ КОНТРОЛИРУЕМОЙ РЕИНИЦИАЛИЗАЦИИ
        this._eventListenersSetup = false;
        this._eventBusSubscribed = false;
        this._stateUpdatedCallback = null;
        this._bankUpdateCallback = null;
        
        // Очищаем ссылки на модули
        this.bankModule = null;
        this.gameStateManager = null;
        this.eventBus = null;
        
        console.log('🏦 BankPreview: Полностью уничтожен (все ресурсы очищены)');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.BankPreview = BankPreview;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankPreview;
}
