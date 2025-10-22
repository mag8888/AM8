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
        
        // Флаги синхронизации
        this._isUpdating = false;
        this._isDestroyed = false;
        this._lastSyncTime = 0;
        this._lastExtractedData = null;
        this._lastExtractedTimestamp = 0;
        this._updateStateDebounceTimer = null;
        this._lastDisplayedData = null;
        this._lastLogTime = 0;
        this._lastRenderTime = 0;
        this._logThrottleInterval = 2000; // Логировать максимум раз в 2 секунды
        
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
                // Обновляем если данные валидны (даже если balance = 0)
                const currentData = this.extractBankDataFromGameState(this.gameStateManager._state);
                if (currentData && this._isValidSnapshot(currentData)) {
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
        
        // DEBOUNCING: не блокируем ПЕРВЫЙ render и случаи, когда элемента ещё нет
        const now = Date.now();
        const hasPreview = !!(this.previewElement || (this.container && this.container.querySelector && this.container.querySelector('.bank-preview-card')));
        if (hasPreview && this._lastRenderTime && (now - this._lastRenderTime) < 1000) {
            // Убираем спам логирование - debouncing работает нормально
            return;
        }
        this._lastRenderTime = now;
        
        // Проверяем, есть ли уже банк превью в контейнере
        const existingPreview = this.container.querySelector('.bank-preview-card');
        if (existingPreview) {
            // Убираем спам логирование - элемент переиспользуется нормально
            this.previewElement = existingPreview;
            return; // Не пересоздаем HTML, используем существующий
        }
        
        // Создаем элемент превью банка только если его нет
        this.previewElement = document.createElement('div');
        this.previewElement.className = 'bank-preview-card';
        // Убираем спам логирование - HTML создается нормально
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
        
        // Вставляем превью в начало контейнера
        this.container.insertBefore(this.previewElement, this.container.firstChild);
        
        // Проверяем, что элементы создались в DOM
        const balanceElement = this.previewElement.querySelector('#bank-preview-balance');
        const incomeElement = this.previewElement.querySelector('#bank-preview-income');
        // Убираем спам логирование - DOM элементы проверяются нормально
        
        // Сбрасываем флаг обработчиков чтобы переустановить их
        this._eventListenersSetup = false;
        
        // Настраиваем обработчики событий после создания элемента
        this.setupEventListeners();
        
        this._renderVersion += 1;
        this.previewElement.setAttribute('data-render-version', String(this._renderVersion));
        this.restoreLastSnapshot();
        
        // Загружаем данные НЕМЕДЛЕННО при создании превью
        this.loadInitialData();
        
        // ПРИНУДИТЕЛЬНАЯ ЗАГРУЗКА: Убираем setTimeout для производительности
        // Данные будут загружены через синхронизацию с BankModuleServer
        
        // Убираем проблематичный setTimeout для Safari
        // Данные будут загружены через синхронизацию с BankModuleServer
    }

    /**
     * Загрузка начальных данных сразу при создании превью
     */
    loadInitialData() {
        // Предотвращаем множественные вызовы только если данные уже загружены успешно
        if (this._initialDataLoaded) {
            return;
        }
        
        // Если уже загружается, ждем завершения
        if (this._isLoadingInitialData) {
            console.log('🔄 BankPreview: Данные уже загружаются, ждем завершения...');
            return;
        }
        
        this._isLoadingInitialData = true;
        // Убираем спам логирование - данные загружаются нормально
        
        try {
            // Сначала пытаемся получить данные из BankModuleServer
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
            }
            
            let bankData = null;
            
            // ПРИОРИТЕТ 1: GameStateManager (актуальные данные игры) - всегда используем если есть
            let gamestateData = null;
            if (this.gameStateManager && this.gameStateManager._state && this.gameStateManager._state.players && this.gameStateManager._state.players.length > 0) {
                gamestateData = this.extractBankDataFromGameState(this.gameStateManager._state);
                if (gamestateData && this._isValidSnapshot(gamestateData)) {
                    bankData = gamestateData;
                    console.log('✅ BankPreview: Начальные данные из GameStateManager (реальные данные игрока)');
                }
            } 
            
            // ПРИОРИТЕТ 2: BankModule (если GameState данные невалидны или отсутствуют)
            if (!this._isValidSnapshot(bankData)) {
                if (this.bankModule && this.bankModule.bankState && this._isValidSnapshot(this.bankModule.bankState)) {
                    bankData = this.bankModule.bankState;
                    console.log('✅ BankPreview: Начальные данные из BankModuleServer (GameState невалидны)');
                }
            }
            
            // ПРИОРИТЕТ 3: Fallback данные
            if (!this._isValidSnapshot(bankData)) {
                bankData = this.getFallbackBankData();
                console.log('🚨 BankPreview: ПРИЧИНА НУЛЕЙ - используем fallback данные для начального отображения');
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
        if (!this.previewElement) return;
        
        // Удаляем старые обработчики если они есть
        if (this._clickHandler) {
            this.previewElement.removeEventListener('click', this._clickHandler);
        }
        
        // Создаем новый обработчик клика для открытия банка
        this._clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏦 BankPreview: Клик по панели банка, открываем popup');
            this.openBank();
        };
        
        // Добавляем обработчик клика
        this.previewElement.addEventListener('click', this._clickHandler);
        
        // Делаем элемент кликабельным
        this.previewElement.style.cursor = 'pointer';
        
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
            console.log('🔄 BankPreview: updatePreviewData уже выполняется, пропускаем');
            return;
        }
        
        this._isUpdating = true;
        console.log('🔄 BankPreview: Начинаем updatePreviewData');
        
        try {
            // Пытаемся получить данные из BankModuleServer
            let bankData = null;
            
            // Получаем модуль банка
            const app = window.app;
            if (app && app.modules) {
                this.bankModule = app.modules.get('bankModuleServer') || app.modules.get('bankModule');
            }
            
            // ПРИОРИТЕТ 1: GameStateManager (актуальные данные игры) - всегда используем если есть
            let gamestateData = null;
            if (this.gameStateManager && this.gameStateManager._state && this.gameStateManager._state.players && this.gameStateManager._state.players.length > 0) {
                gamestateData = this.extractBankDataFromGameState(this.gameStateManager._state);
                // Используем данные из GameState если они валидны (даже если balance = 0)
                if (gamestateData && this._isValidSnapshot(gamestateData)) {
                    bankData = gamestateData;
                    console.log('✅ BankPreview: Используем реальные данные из GameStateManager');
                }
            } 
            
            // ПРИОРИТЕТ 2: BankModule (если GameState данные невалидны или отсутствуют)
            if (!this._isValidSnapshot(bankData) && this.bankModule && this.bankModule.bankState) {
                const moduleState = this.bankModule.bankState;
                const moduleLoaded = moduleState.loaded !== false;
                if (moduleLoaded && this._isValidSnapshot(moduleState)) {
                    bankData = moduleState;
                    console.log('✅ BankPreview: Используем данные из BankModuleServer (GameState данные невалидны)');
                }
            }
            
            // ПРИОРИТЕТ 3: Fallback данные (если все остальные источники невалидны)
            if (!this._isValidSnapshot(bankData)) {
                // АНТИ-ЗАТИРАНИЕ: Если есть реальные данные в _lastBankSnapshot - сохраняем их
                if (this._isValidSnapshot(this._lastBankSnapshot) && 
                    (this._lastBankSnapshot.balance > 0 || this._lastBankSnapshot.income > 0)) {
                    console.log('🔄 BankPreview: Сохраняем реальные данные из предыдущего состояния');
                    this.restoreLastSnapshot();
                    return;
                }
                bankData = this.getFallbackBankData();
                console.log('🚨 BankPreview: ПРИЧИНА НУЛЕЙ - используем fallback данные в updatePreviewData');
            }
            
            if (bankData) {
                this.updatePreviewUI(bankData);
            } else {
                console.log('🚨 BankPreview: ПРИЧИНА НУЛЕЙ - вызываем getFallbackBankData в else блоке updatePreviewData');
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
        if (!this.previewElement || this._isUpdating) {
            console.log('🔄 BankPreview: updatePreviewDataFromState пропущен - уже выполняется или нет элемента');
            return;
        }
        
        this._isUpdating = true;
        // Убираем спам логирование - метод вызывается часто
        
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
            
            if (this._isValidSnapshot(bankData)) {
                this.updatePreviewUI(bankData);
            } else {
                // АНТИ-ЗАТИРАНИЕ: Сохраняем реальные данные если они есть
                if (this._isValidSnapshot(this._lastBankSnapshot) && 
                    (this._lastBankSnapshot.balance > 0 || this._lastBankSnapshot.income > 0)) {
                    console.log('🔄 BankPreview: Сохраняем реальные данные (state данные пустые)');
                    this.restoreLastSnapshot();
                } else {
                    // Используем fallback данные только если валидных данных ещё не было
                    console.log('🚨 BankPreview: ПРИЧИНА НУЛЕЙ - используем fallback данные в updatePreviewDataFromState');
                    this.updatePreviewUI(this.getFallbackBankData());
                }
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
        const currentValid = this._isValidSnapshot(this._lastBankSnapshot);
        const snapshotsEqual = this._compareSnapshots(this._lastBankSnapshot, normalized);

        // Если текущие данные валидны и новые тоже валидны и одинаковы - не обновляем
        if (currentValid && incomingValid && snapshotsEqual) {
            return;
        }

        // АНТИ-ЗАТИРАНИЕ: Если текущие данные содержат реальные данные, а новые нулевые - сохраняем
        if (currentValid && !incomingValid && 
            (currentSnapshot.balance > 0 || currentSnapshot.income > 0)) {
            console.log('🔄 BankPreview: Сохраняем реальные данные — новые данные нулевые');
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
        
        // Убираем спам логирование - поиск игрока работает нормально
        
        if (!currentPlayer) {
            console.warn('⚠️ BankPreview: currentPlayer не найден в gameState.players');
            return null;
        }
        
        // Получаем реальный баланс игрока
        let balance = (currentPlayer.money !== undefined && currentPlayer.money !== null) 
            ? currentPlayer.money 
            : ((currentPlayer.balance !== undefined && currentPlayer.balance !== null) 
                ? currentPlayer.balance 
                : 0); // Используем 0 если значения undefined/null
        
        // Убираем спам логирование - баланс извлекается нормально
        
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
        
        // Убираем спам логирование - fallback данные используются редко
        
        // Возвращаем данные по умолчанию (если нет данных игрока)
        return {
            balance: 0, // Показываем 0 если нет данных
            income: 0,
            expenses: 0,
            netIncome: 0,
            credit: 0,
            maxCredit: 0
        };
    }

    /**
     * Обновление UI превью
     */
    updatePreviewUI(bankData) {
        // Если элемента ещё нет, делаем немедленный render без дебаунса и продолжаем
        if (!this.previewElement) {
            this.render();
        }
        if (!this.previewElement || !bankData) return;

        const normalized = this._normalizeBankData(bankData);
        const incomingValid = this._isValidSnapshot(normalized);
        const currentSnapshot = this._lastBankSnapshot;
        const currentValid = this._isValidSnapshot(currentSnapshot);
        const snapshotsEqual = this._compareSnapshots(currentSnapshot, normalized);

        // АНТИ-ЗАТИРАНИЕ: Строгая защита от переключения на нули
        if (incomingValid) {
            // Если новые данные содержат реальные данные игрока - всегда обновляем
            if (normalized.balance > 0 || normalized.income > 0) {
                // Убираем спам логирование - обновление работает нормально
            } else if (currentValid && (currentSnapshot.balance > 0 || currentSnapshot.income > 0)) {
                // СТРОГАЯ ЗАЩИТА: Если текущие данные содержат реальные данные, а новые нулевые - НЕ ОБНОВЛЯЕМ
                // Убираем спам логирование - защита работает нормально
                return;
            } else if (normalized.balance === 0 && normalized.income === 0) {
                // Если новые данные нулевые, но текущих данных нет - все равно не обновляем
                // Убираем спам логирование - защита работает нормально
                return;
            } else {
                // Убираем спам логирование - UI обновляется нормально
            }
        } else {
            console.log('⚠️ BankPreview: Пропускаем обновление - данные невалидны');
            return;
        }

        // Убираем спам логирование - данные обновляются нормально

        this._lastBankSnapshot = normalized;
        this._lastDisplayedData = JSON.stringify(normalized);

        const updateElement = (selector, value, formatter = (v) => `$${this.formatNumber(v)}`) => {
            const element = this.previewElement.querySelector(selector);
            if (!element) {
                console.error(`🚨 BankPreview: КРИТИЧЕСКАЯ ОШИБКА - элемент ${selector} не найден в DOM!`, {
                    previewElement: this.previewElement,
                    previewElementHTML: this.previewElement ? this.previewElement.outerHTML.substring(0, 500) : 'null'
                });
                return;
            }
            // Убираем спам логирование - элементы обновляются нормально
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

        // Считаем данные валидными если они есть (даже если balance = 0)
        // Главное чтобы это были реальные данные, а не undefined/null
        const hasValidTypes = typeof snapshot.balance === 'number' &&
               typeof snapshot.income === 'number' &&
               typeof snapshot.expenses === 'number' &&
               typeof snapshot.netIncome === 'number' &&
               typeof snapshot.credit === 'number' &&
               typeof snapshot.maxCredit === 'number';

        // Данные валидны если есть корректные типы (включая balance = 0)
        return hasValidTypes;
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
        
        // Очищаем обработчик клика
        if (this.previewElement && this._clickHandler) {
            this.previewElement.removeEventListener('click', this._clickHandler);
            this._clickHandler = null;
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
