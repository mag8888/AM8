/**
 * BankModuleServer v2.0.0
 * Новый банковский модуль, загружающий все данные с сервера
 * Полностью серверо-ориентированный подход
 */

class BankModuleServer {
    constructor(config = {}) {
        this.config = config;
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.roomApi = config.roomApi || null;
        this.professionSystem = config.professionSystem || null;
        this.gameStateManager = config.gameStateManager || null;
        
        // Состояние банка (загружается с сервера)
        this.bankState = {
            roomId: null,
            playerId: null,
            balance: 0,
            income: 0,
            expenses: 0,
            netIncome: 0,
            salary: 0,
            credit: 0,
            maxCredit: 0,
            players: [],
            transactions: []
        };
        
        // UI элементы
        this.ui = null;
        this.isOpen = false;
        this.isLoading = false;
        this._isTransferring = false;
        this._isTakingLoan = false;
        this._isRepayingLoan = false;
        this._lastDataLoad = 0;
        this._dataCacheTimeout = 30000; // 30 секунд кэш
        
        // Кэш DOM элементов для оптимизации производительности
        this._elementCache = new Map();
        
        console.log('🏦 BankModuleServer: Инициализирован (v2.0.0)');
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
            // Пробуем получить пользователя из разных источников
            let userData = localStorage.getItem('currentUser');
            if (!userData) {
                userData = sessionStorage.getItem('am_player_bundle');
            }
            
            if (userData) {
                const user = JSON.parse(userData);
                this.bankState.playerId = user.id || user.userId;
                this.bankState.roomId = user.roomId || this._getCurrentRoomId();
                console.log('✅ BankModuleServer: Пользователь инициализирован:', {
                    playerId: this.bankState.playerId,
                    roomId: this.bankState.roomId
                });
            } else {
                console.warn('⚠️ BankModuleServer: Данные пользователя не найдены');
            }
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка инициализации пользователя:', error);
        }
    }
    
    /**
     * Получение ID комнаты из URL
     */
    _getCurrentRoomId() {
        const hash = window.location.hash;
        const match = hash.match(/roomId=([^&]+)/);
        return match ? match[1] : null;
    }

    /**
     * Получение данных с сервера
     */
    async loadServerData(force = false) {
        if (this.isLoading) return;
        
        // Проверяем кэш для избежания лишних запросов
        const now = Date.now();
        if (!force && (now - this._lastDataLoad) < this._dataCacheTimeout) {
            console.log('🚀 BankModuleServer: Используем кэшированные данные');
            this.updateUIFromServer();
            return;
        }
        
        this.isLoading = true;
        this.showLoadingState(true);
        
        try {
            const roomId = this.getRoomId();
            if (!roomId) {
                throw new Error('Room ID не найден');
            }
            
            console.log('🌐 BankModuleServer: Загружаем данные с сервера для комнаты:', roomId);
            
            // Загружаем только состояние игры, баланс получаем из него
            const gameStateData = await this.fetchGameState(roomId, force);
            
            if (gameStateData) {
                // Обновляем состояние банка данными из gameState
                this.updateBankStateFromServer(gameStateData, null);
                
                // Загружаем историю операций
                await this.loadTransactionsHistory();
                
                console.log('✅ BankModuleServer: Данные загружены с сервера');
            } else {
                console.warn('⚠️ BankModuleServer: Не удалось загрузить данные с сервера, используем локальные');
                this.loadLocalData();
            }
            
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка загрузки данных:', error);
            
            // Показываем уведомление только для критических ошибок
            if (!error.message?.includes('Load failed') && 
                !error.message?.includes('Таймаут') &&
                error.name !== 'TypeError') {
                this.showNotification('Ошибка загрузки данных с сервера', 'error');
            }
            
            // Fallback: пытаемся получить данные из локального GameStateManager
            this.loadLocalData();
        } finally {
            this.isLoading = false;
            this.showLoadingState(false);
            this._lastDataLoad = Date.now();
        }
    }
    
    /**
     * Загрузка состояния игры с сервера
     */
    async fetchGameState(roomId, force = false) {
        const manager = this.gameStateManager || window.app?.services?.get('gameStateManager');
        if (manager && typeof manager.fetchGameState === 'function') {
            return await manager.fetchGameState(roomId, force);
        }

        if (window.CommonUtils && !window.CommonUtils.gameStateLimiter.setRequestPending(roomId)) {
            console.log('🚫 BankModuleServer: Пропускаем запрос из-за глобального rate limiting или concurrent request');
            return null;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(`/api/rooms/${roomId}/game-state`, {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('⚠️ BankModuleServer: Комната не найдена, используем локальные данные');
                    return null;
                }
                throw new Error(`Ошибка загрузки состояния игры: ${response.status}`);
            }

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.warn('⚠️ BankModuleServer: Ошибка парсинга JSON ответа:', jsonError);
                return null;
            }

            if (!data.success) {
                throw new Error(data.message || 'Ошибка получения данных игры');
            }

            return data.state;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn('⚠️ BankModuleServer: Таймаут загрузки данных, используем локальные данные');
                return null;
            }

            if (error.message?.includes('Load failed') || error.name === 'TypeError') {
                console.warn('⚠️ BankModuleServer: Сетевая ошибка, используем локальные данные');
                return null;
            }

            throw error;
        } finally {
            if (window.CommonUtils) {
                window.CommonUtils.gameStateLimiter.clearRequestPending(roomId);
            }
        }
    }
    
    /**
     * Загрузка локальных данных как fallback
     */
    loadLocalData() {
        try {
            console.log('🔄 BankModuleServer: Загружаем локальные данные как fallback');
            
            // Пытаемся получить данные из GameStateManager
            if (this.gameStateManager && typeof this.gameStateManager.getState === 'function') {
                const localState = this.gameStateManager.getState();
                if (localState && localState.players && localState.players.length > 0) {
                    console.log('✅ BankModuleServer: Получены локальные данные из GameStateManager');
                    this.updateBankStateFromServer({ players: localState.players }, null);
                    return;
                }
            }
            
            // Если GameStateManager недоступен, показываем уведомление
            this.showNotification('Данные недоступны, попробуйте открыть банк позже', 'warning');
            
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка загрузки локальных данных:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }
    
    /**
     * Обновление состояния банка данными с сервера
     */
    updateBankStateFromServer(gameState, balanceData) {
        const currentUser = this.getCurrentUserSync();
        if (!currentUser) {
            console.warn('⚠️ BankModuleServer: Текущий пользователь не найден');
            return;
        }
        
        console.log('🔍 BankModuleServer: Поиск игрока для пользователя:', {
            userId: currentUser.id,
            username: currentUser.username,
            players: gameState.players?.map(p => ({ id: p.id, userId: p.userId, username: p.username }))
        });
        
        // Находим данные текущего игрока по разным полям
        let currentPlayer = gameState.players?.find(p => 
            p.id === currentUser.id || 
            p.userId === currentUser.id || 
            p.username === currentUser.username ||
            (p.userId && p.userId.toString() === currentUser.id.toString())
        );
        
        // Если не найден по ID, пробуем найти по username из localStorage
        if (!currentPlayer && currentUser.username) {
            currentPlayer = gameState.players?.find(p => 
                p.username === currentUser.username ||
                p.name === currentUser.username
            );
        }
        
        if (!currentPlayer) {
            console.warn('⚠️ BankModuleServer: Текущий игрок не найден в данных игры', {
                currentUser,
                availablePlayers: gameState.players?.map(p => ({ id: p.id, userId: p.userId, username: p.username }))
            });
            // Используем первого игрока как fallback
            currentPlayer = gameState.players?.[0];
            if (currentPlayer) {
                console.log('🔧 BankModuleServer: Используем первого игрока как fallback:', currentPlayer.username);
            }
        }
        
        if (!currentPlayer) {
            console.error('❌ BankModuleServer: Нет игроков в игре');
            return;
        }
        
        // Обновляем состояние банка
        this.bankState.roomId = this.getRoomId();
        this.bankState.playerId = currentPlayer.id;
        // Получаем баланс с fallback на стартовый баланс
        let balance = (currentPlayer.money !== undefined && currentPlayer.money !== null) 
            ? currentPlayer.money 
            : ((currentPlayer.balance !== undefined && currentPlayer.balance !== null) 
                ? currentPlayer.balance 
                : 5000); // fallback только если значения undefined/null
        
        // Если баланс 0, устанавливаем стартовый баланс 5000
        if (balance === 0) {
            balance = 5000;
            console.log('💰 BankModuleServer: Баланс был 0, устанавливаем стартовый баланс 5000');
        }
        
        this.bankState.balance = balance;
        this.bankState.players = gameState.players || [];
        
        // Получаем данные профессии для расчета максимального кредита
        const professionId = currentPlayer.profession || 'entrepreneur';
        const professionDetails = this.professionSystem?.getProfessionDetails(professionId, {
            money: currentPlayer.money || 0,
            children: currentPlayer.children || 0,
            paidOffLoans: currentPlayer.paidOffLoans || {},
            extraIncome: currentPlayer.extraIncome || 0,
            currentLoan: currentPlayer.currentLoan || 0,
            otherMonthlyAdjustments: currentPlayer.otherMonthlyAdjustments || 0
        });
        
        // Пытаемся получить данные из ProfessionSystem
        if (professionDetails) {
            this.bankState.income = professionDetails.income?.total || 0;
            this.bankState.expenses = professionDetails.expenses?.total || 0;
            this.bankState.netIncome = professionDetails.netIncome?.netIncome || (this.bankState.income - this.bankState.expenses);
            this.bankState.salary = professionDetails.income?.salary || 0;
            
            // Проверяем, получены ли корректные данные
            if (this.bankState.income === 0 || this.bankState.expenses === 0) {
                console.log('⚠️ BankModuleServer: ProfessionSystem вернул нулевые значения, используем fallback');
                this.initEntrepreneurFallbackData(currentPlayer);
            } else {
                this.bankState.maxCredit = this.bankState.netIncome * 10;
            }
        } else {
            // Fallback значения для предпринимателя (если ProfessionSystem недоступен)
            console.log('⚠️ BankModuleServer: ProfessionSystem недоступен, используем fallback данные');
            this.initEntrepreneurFallbackData(currentPlayer);
        }
        
        // Финальная проверка и исправление значений предпринимателя
        this.ensureCorrectEntrepreneurValues();
        
        this.bankState.credit = currentPlayer.currentLoan || 0;
        this.bankState.currentPlayer = currentPlayer;
        
        console.log('📊 BankModuleServer: Состояние обновлено:', {
            balance: this.bankState.balance,
            netIncome: this.bankState.netIncome,
            maxCredit: this.bankState.maxCredit,
            credit: this.bankState.credit
        });
        
        this._syncPlayersWithGameState(gameState, currentPlayer);
    }
    
    /**
     * Синхронизируем игроков с GameStateManager и событийнной шиной,
     * чтобы банк и панель игроков использовали единый источник истины
     */
    _syncPlayersWithGameState(gameState, currentPlayer) {
        try {
            if (this.gameStateManager && typeof this.gameStateManager.updateFromServer === 'function') {
                const payload = {
                    players: this.bankState.players,
                    activePlayer: gameState?.activePlayer || currentPlayer,
                    currentPlayerIndex: gameState?.currentPlayerIndex,
                    roomId: this.bankState.roomId,
                    gameStarted: gameState?.gameStarted,
                    canRoll: gameState?.canRoll,
                    canMove: gameState?.canMove,
                    canEndTurn: gameState?.canEndTurn
                };
                this.gameStateManager.updateFromServer(payload);
            }
            
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                this.eventBus.emit('game:playersUpdated', {
                    players: this.bankState.players,
                    activePlayer: gameState?.activePlayer || currentPlayer
                });
            }
        } catch (error) {
            console.warn('⚠️ BankModuleServer: Не удалось синхронизировать игроков с GameStateManager', error);
        }
    }
    
    /**
     * Применяет изменения игрока локально и сообщает остальным модулям
     */
    _applyPlayerPatch(playerPatch) {
        if (!playerPatch) return;
        
        try {
            if (typeof playerPatch.money === 'number') {
                this.bankState.balance = playerPatch.money;
            }
            if (typeof playerPatch.currentLoan === 'number') {
                this.bankState.credit = playerPatch.currentLoan;
            }
            
            if (this.gameStateManager && typeof this.gameStateManager.updatePlayer === 'function') {
                this.gameStateManager.updatePlayer(playerPatch);
            }
            
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                const updatedPlayers = this.gameStateManager?.getPlayers?.() || this.bankState.players;
                this.eventBus.emit('game:playersUpdated', {
                    players: updatedPlayers,
                    activePlayer: this.gameStateManager?.getActivePlayer?.()
                });
            }
        } catch (error) {
            console.warn('⚠️ BankModuleServer: Не удалось применить обновление игрока', error);
        }
    }
    
    /**
     * Инициализация данных предпринимателя как fallback
     */
    initEntrepreneurFallbackData(currentPlayer) {
        console.log('🏢 BankModuleServer: Инициализация данных предпринимателя (fallback)');
        
        // 1. Зарплата предпринимателя - всегда $10,000 + пассивный доход $0 = $10,000
        const salary = 10000; // Стандартная зарплата предпринимателя
        const passiveIncome = currentPlayer.extraIncome || 0;
        this.bankState.income = salary + passiveIncome;
        this.bankState.salary = salary;
        
        // 2. Расходы по умолчанию для предпринимателя
        const childCount = currentPlayer.children || 0;
        const currentLoan = currentPlayer.currentLoan || 0;
        
        // Базовые расходы предпринимателя
        this.bankState.expenses = this.calculateEntrepreneurExpenses(currentLoan, childCount);
        
        // 3. PAYDAY = Денежный поток = доходы - расходы
        this.bankState.netIncome = this.bankState.income - this.bankState.expenses;
        
        // 4. Максимальный кредит = чистый доход × 10
        this.bankState.maxCredit = Math.max(this.bankState.netIncome * 10, 0);
        
        console.log('💰 BankModuleServer: Данные предпринимателя инициализированы:', {
            income: this.bankState.income,
            expenses: this.bankState.expenses,
            netIncome: this.bankState.netIncome,
            maxCredit: this.bankState.maxCredit
        });
    }
    
    /**
     * Расчет расходов предпринимателя
     */
    calculateEntrepreneurExpenses(currentLoan = 0, childCount = 0) {
        // Базовые расходы предпринимателя:
        // 2.1 Налоги: $1,300 (13%) - погасить нельзя
        const taxes = 1300;
        
        // 2.2 Прочие расходы: $1,500 - погасить нельзя  
        const otherExpenses = 1500;
        
        // 2.3 Кредит на авто: $700 (можно погасить 14,000)
        const autoLoan = 700;
        
        // 2.4 Образовательный кредит: $500 (можно погасить 10,000)
        const educationLoan = 500;
        
        // 2.5 Кредитные карты: $1,000 (можно погасить 20,000)
        const creditCards = 1000;
        
        // 2.6 Ипотека студия: $1,200 - $48,000
        const mortgage = 1200;
        
        // 2.7 Расходы на ребенка: $500 × количество детей (максимум 3)
        const childExpenses = Math.min(childCount, 3) * 500;
        
        // 2.8 Банк кредит: 10% от взятого кредита
        const bankLoanExpenses = Math.floor(currentLoan * 0.1);
        
        // Итого расходы: $6,200 + расходы на детей + банковские расходы по кредиту
        const totalExpenses = taxes + otherExpenses + autoLoan + educationLoan + 
                             creditCards + mortgage + childExpenses + bankLoanExpenses;
        
        console.log('💸 BankModuleServer: Расчет расходов:', {
            taxes,
            otherExpenses,
            autoLoan,
            educationLoan,
            creditCards,
            mortgage,
            childExpenses,
            bankLoanExpenses,
            totalExpenses
        });
        
        return totalExpenses;
    }
    
    /**
     * Проверка корректности значений предпринимателя
     */
    ensureCorrectEntrepreneurValues() {
        // Проверяем и исправляем значения предпринимателя если они неправильные
        const needsCorrection = this.bankState.income === 0 || 
                               this.bankState.expenses === 0 || 
                               this.bankState.income !== 10000 || 
                               this.bankState.maxCredit === 0 && this.bankState.netIncome > 0;
        
        if (needsCorrection) {
            console.log('🔧 BankModuleServer: Исправление значений предпринимателя:', {
                current: {
                    income: this.bankState.income,
                    expenses: this.bankState.expenses,
                    netIncome: this.bankState.netIncome,
                    maxCredit: this.bankState.maxCredit
                }
            });
            
            // Доходы: зарплата $10,000 + пассивный доход $0 = $10,000
            this.bankState.income = 10000;
            this.bankState.salary = 10000;
            
            // Расходы: $6,200 (базовые) + возможные дополнительные
            this.bankState.expenses = 6200;
            
            // PAYDAY = $10,000 - $6,200 = $3,800
            this.bankState.netIncome = 3800;
            
            // Максимальный кредит = $3,800 × 10 = $38,000
            this.bankState.maxCredit = 38000;
            
            console.log('✅ BankModuleServer: Значения исправлены на правильные');
        }
        
        console.log('✅ BankModuleServer: Финальные значения предпринимателя:', {
            income: this.bankState.income,
            expenses: this.bankState.expenses,
            netIncome: this.bankState.netIncome,
            maxCredit: this.bankState.maxCredit,
            payday: this.bankState.netIncome
        });
    }
    
    /**
     * Получение элемента DOM с кэшированием для оптимизации производительности
     */
    getCachedElement(selector) {
        if (!this._elementCache.has(selector)) {
            const element = this.ui ? this.ui.querySelector(selector) : null;
            this._elementCache.set(selector, element);
        }
        return this._elementCache.get(selector);
    }

    /**
     * Обновление UI данными с сервера
     */
    updateUIFromServer() {
        if (!this.ui) {
            // Очищаем кэш если UI недоступен
            this._elementCache.clear();
            return;
        }

        // Используем DocumentFragment для батчевого обновления
        const updates = [];
        
        // Обновляем баланс
        const balanceElement = this.getCachedElement('#bank-balance');
        if (balanceElement) {
            balanceElement.textContent = `$${CommonUtils.formatNumber(this.bankState.balance)}`;
        }
        
        // Обновляем доходы
        const incomeElement = this.getCachedElement('#bank-income');
        if (incomeElement) {
            incomeElement.textContent = `$${CommonUtils.formatNumber(this.bankState.income)}`;
        }
        
        // Обновляем расходы
        const expensesElement = this.getCachedElement('#bank-expenses');
        if (expensesElement) {
            expensesElement.textContent = `$${CommonUtils.formatNumber(this.bankState.expenses)}`;
        }
        
        // Обновляем чистый доход
        const netIncomeElement = this.getCachedElement('#bank-net-income');
        if (netIncomeElement) {
            netIncomeElement.textContent = `$${CommonUtils.formatNumber(this.bankState.netIncome)}/мес`;
        }
        
        // Обновляем зарплату (если есть отдельный элемент)
        const salaryElement = this.getCachedElement('#bank-salary');
        if (salaryElement) {
            salaryElement.textContent = `$${CommonUtils.formatNumber(this.bankState.salary)}/мес`;
        }
        
        // Обновляем кредитный баланс
        const creditElement = this.getCachedElement('#bank-credit');
        if (creditElement) {
            creditElement.textContent = `$${CommonUtils.formatNumber(this.bankState.credit)}`;
            creditElement.style.color = this.bankState.credit > 0 ? '#ef4444' : '#10b981';
            creditElement.style.fontWeight = this.bankState.credit > 0 ? 'bold' : 'normal';
        }
        
        // Обновляем максимальный кредит
        const maxCreditElement = this.getCachedElement('#bank-max-credit');
        if (maxCreditElement) {
            maxCreditElement.textContent = `$${CommonUtils.formatNumber(this.bankState.maxCredit)}`;
        }
        
        // Обновляем мини-блок кредита
        const loanBalance = this.getCachedElement('#loan-balance');
        if (loanBalance) {
            loanBalance.textContent = `$${CommonUtils.formatNumber(this.bankState.credit)}`;
            loanBalance.style.color = this.bankState.credit > 0 ? '#ef4444' : '#10b981';
            loanBalance.style.fontWeight = this.bankState.credit > 0 ? 'bold' : 'normal';
        }
        
        const loanMax = this.getCachedElement('#loan-max');
        if (loanMax) {
            loanMax.textContent = `$${CommonUtils.formatNumber(this.bankState.maxCredit)}`;
            loanMax.style.color = '#10b981';
            loanMax.style.fontWeight = 'bold';
        }
        
        // Обновляем список игроков
        this.updatePlayersList();
        
        // Обновляем историю операций
        this.updateTransactionsHistory();
        
        console.log('🔄 BankModuleServer: UI обновлен данными с сервера');
    }
    
    /**
     * Обновление списка игроков данными с сервера
     */
    updatePlayersList() {
        const recipientSelect = this.getCachedElement('#transfer-recipient');
        if (!recipientSelect) return;
        
        // Используем DocumentFragment для батчевого обновления
        const fragment = document.createDocumentFragment();
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите игрока';
        fragment.appendChild(defaultOption);
        
        // Добавляем игроков (исключая текущего)
        this.bankState.players.forEach(player => {
            if (player.id !== this.bankState.playerId) {
                const option = document.createElement('option');
                option.value = player.id;
                const balance = player.balance || player.money || 0;
                option.textContent = `${player.username || player.name} ($${CommonUtils.formatNumber(balance)})`;
                fragment.appendChild(option);
            }
        });
        
        // Заменяем содержимое за один вызов
        recipientSelect.innerHTML = '';
        recipientSelect.appendChild(fragment);
        
        console.log(`👥 BankModuleServer: Обновлен список игроков: ${this.bankState.players.length} игроков`);
    }
    
    /**
     * Создание UI банк модуля
     */
    createUI() {
        // Проверяем, не создан ли уже UI
        if (this.ui && document.body.contains(this.ui)) {
            console.log('🏦 BankModuleServer: UI уже существует');
            return;
        }

        // Добавляем стили только один раз
        if (!document.querySelector('#bank-module-server-styles')) {
            this.addStyles();
        }

        // Используем тот же HTML, что и в оригинальном модуле
        const bankModuleHTML = `
            <div id="bank-module-server" class="bank-module" style="display: none;">
                <div class="bank-overlay"></div>
                <div class="bank-container">
                    <div class="bank-header">
                        <div class="bank-title">
                            <span class="bank-icon">🏦</span>
                            <span>Банковские операции</span>
                            <span class="server-badge">СЕРВЕР</span>
                        </div>
                        <button class="bank-close" id="bank-close-server">✕</button>
                    </div>
                    
                    <div class="bank-content">
                        <div class="bank-left">
                            <div class="bank-status">
                                <div class="bank-status-header">
                                    <span class="bank-icon">🏦</span>
                                    <span>Банк</span>
                                    <span class="status-badge active">Активен</span>
                                    <button class="refresh-btn" id="refresh-server-data">🔄</button>
                                </div>
                                
                                <div class="current-balance">
                                    <div class="balance-amount" id="bank-balance">$0</div>
                                    <div class="balance-description">Доступно для операций</div>
                                </div>
                                
                                <div class="financial-summary">
                                    <div class="summary-item">
                                        <span class="summary-icon income">📈</span>
                                        <span class="summary-label">Доход:</span>
                                        <span class="summary-value income" id="bank-income">$0</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-icon expense">📉</span>
                                        <span class="summary-label">Расходы:</span>
                                        <span class="summary-value expense" id="bank-expenses">$0</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-icon net">💎</span>
                                        <span class="summary-label">Чистый доход:</span>
                                        <span class="summary-value net" id="bank-net-income">$0/мес</span>
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
                                        <span class="credit-value max" id="bank-max-credit">$0</span>
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
                                        <button class="transfer-btn" id="transfer-execute-server">
                                            <span class="btn-icon">✈</span>
                                            <span>ВЫПОЛНИТЬ ПЕРЕВОД</span>
                                        </button>
                                        <button class="transfer-reset" id="transfer-reset-server">СБРОСИТЬ</button>
                                    </div>
                                    
                                    <div class="loan-inline" style="margin-top:12px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.1)">
                                        <label for="loan-amount-server">Кредит (шаг 1000)</label>
                                        <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
                                            <input type="number" id="loan-amount-server" class="form-input" placeholder="0" min="0" step="1000">
                                            <button class="transfer-btn" id="loan-take-server" style="min-width:120px">ВЗЯТЬ</button>
                                            <button class="transfer-reset" id="loan-repay-server" style="min-width:120px">ПОГАСИТЬ</button>
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
                                    <span class="new-badge" id="new-transactions-server">0</span>
                                </div>
                                
                                <div class="transactions-list" id="transactions-list-server">
                                    <div class="loading-indicator" id="loading-indicator">
                                        <div class="loading-text">Загрузка данных с сервера...</div>
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
        
        // Используем requestAnimationFrame для более плавного создания UI
        requestAnimationFrame(() => {
            this.ui = document.getElementById('bank-module-server');
            if (!this.ui) {
                console.error('❌ BankModuleServer: Не удалось найти созданный UI элемент');
                return;
            }
            
            // Настраиваем обработчики
            this.setupEventListeners();
            console.log('🏦 BankModuleServer: UI создан и настроен');
        });
    }
    
    /**
     * Добавление CSS стилей (копируем из оригинального модуля + дополнительные)
     */
    addStyles() {
        // Проверяем, не добавлены ли уже стили
        if (document.querySelector('#bank-module-server-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'bank-module-server-styles';
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
                border-radius: 0;
                border: 2px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                width: 100vw;
                max-width: 100vw;
                height: 100vh;
                max-height: 100vh;
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
            
            .server-badge {
                background: #10b981;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .refresh-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            
            .refresh-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .loading-indicator {
                text-align: center;
                padding: 40px;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .loading-text {
                font-size: 1.1rem;
            }
            
            /* Копируем остальные стили из оригинального модуля */
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
                flex-direction: column;
                flex: 1;
                width: 100%;
                height: calc(100vh - 84px);
                overflow-y: auto;
            }
            
            .bank-left,
            .bank-right {
                width: 100%;
                padding: 24px clamp(16px, 4vw, 32px);
                border-right: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                overflow: visible;
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            
            .bank-right {
                border-bottom: none;
                flex: 1;
                padding-top: 0;
            }
            
            .bank-status {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                padding: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;
                flex: 1;
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
            
            .summary-value.net {
                color: #10b981;
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
            
            .transfer-section, .transactions-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                padding: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .transfer-section {
                flex: 0 0 auto;
            }
            
            .transactions-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
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
            
            .loan-inline input.form-input { 
                max-width: 160px; 
            }
            
            .transactions-list {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
            }
            
            .transaction-item {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .transaction-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
            
            .transaction-icon {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
            }
            
            .transaction-icon.transfer {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
            }
            
            .transaction-icon.transfer-in {
                background: rgba(34, 197, 94, 0.2);
                color: #4ade80;
            }
            
            .transaction-icon.transfer-out {
                background: rgba(239, 68, 68, 0.2);
                color: #f87171;
            }
            
            .transaction-icon.credit-take {
                background: rgba(168, 85, 247, 0.2);
                color: #a78bfa;
            }
            
            .transaction-icon.credit-repay {
                background: rgba(34, 197, 94, 0.2);
                color: #4ade80;
            }
            
            .transaction-icon.default {
                background: rgba(156, 163, 175, 0.2);
                color: #d1d5db;
            }
            
            .transaction-info {
                flex: 1;
            }
            
            .transaction-type {
                font-weight: 600;
                color: #ffffff;
                margin-bottom: 2px;
            }
            
            .transaction-participant {
                font-size: 0.85rem;
                color: rgba(156, 163, 175, 0.9);
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
            
            .transaction-details {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.8rem;
                color: rgba(156, 163, 175, 0.8);
            }
            
            .transaction-time {
                font-weight: 500;
            }
            
            .transaction-description {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .no-transactions {
                text-align: center;
                padding: 40px 20px;
                color: rgba(156, 163, 175, 0.8);
            }
            
            .no-transactions-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            
            .no-transactions-text {
                font-weight: 600;
                margin-bottom: 8px;
                color: rgba(156, 163, 175, 0.9);
            }
            
            .no-transactions-subtext {
                font-size: 0.9rem;
                opacity: 0.7;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (!this.ui) return;
        
        // Закрытие модуля
        const closeBtn = this.ui.querySelector('#bank-close-server');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('🏦 BankModuleServer: Клик по кнопке закрытия');
                this.close();
            });
        } else {
            console.warn('⚠️ BankModuleServer: Кнопка закрытия не найдена');
        }
        
        // Обновление данных с сервера
        const refreshBtn = this.ui.querySelector('#refresh-server-data');
        refreshBtn.addEventListener('click', () => this.loadServerData(true));
        
        // Переводы
        const transferExecute = this.ui.querySelector('#transfer-execute-server');
        transferExecute.addEventListener('click', () => this.executeTransfer());
        
        const transferReset = this.ui.querySelector('#transfer-reset-server');
        transferReset.addEventListener('click', () => this.resetTransferForm());
        
        // Кредиты
        const loanTake = this.ui.querySelector('#loan-take-server');
        const loanRepay = this.ui.querySelector('#loan-repay-server');
        if (loanTake) loanTake.addEventListener('click', () => this.takeCreditInline());
        if (loanRepay) loanRepay.addEventListener('click', () => this.repayCreditInline());
        
        console.log('🏦 BankModuleServer: Обработчики настроены');
    }
    
    /**
     * Показ состояния загрузки
     */
    showLoadingState(show) {
        const loadingIndicator = this.ui?.querySelector('#loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
        
        const refreshBtn = this.ui?.querySelector('#refresh-server-data');
        if (refreshBtn) {
            refreshBtn.disabled = show;
            refreshBtn.textContent = show ? '⏳' : '🔄';
        }
    }
    
    /**
     * Открытие банк модуля
     */
    async open() {
        try {
            // Проверяем и создаем UI если нужно
            if (!this.ui || !document.body.contains(this.ui)) {
                console.log('🏦 BankModuleServer: UI не найден, создаем...');
                this.createUI();
                
                // Используем более быстрое ожидание с requestAnimationFrame
                await new Promise(resolve => {
                    const checkUI = () => {
                        if (this.ui && document.body.contains(this.ui)) {
                            resolve();
                        } else {
                            requestAnimationFrame(checkUI);
                        }
                    };
                    requestAnimationFrame(checkUI);
                });
                
                // Fallback timeout для экстремальных случаев
                if (!this.ui || !document.body.contains(this.ui)) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (!this.ui || !document.body.contains(this.ui)) {
                        console.error('❌ BankModuleServer: Не удалось создать UI');
                        return;
                    }
                }
            }
            
            // Убеждаемся, что обработчики событий настроены
            if (this.ui && !this.ui.hasAttribute('data-listeners-setup')) {
                console.log('🏦 BankModuleServer: Настраиваем обработчики событий...');
                this.setupEventListeners();
                this.ui.setAttribute('data-listeners-setup', 'true');
            }
            
            // Показываем UI сразу для быстрого отклика
            this.ui.style.display = 'flex';
            this.isOpen = true;
            
            // Очищаем кэш элементов, так как UI теперь доступен
            this._elementCache.clear();
            
            // Показываем локальные данные немедленно для отзывчивости
            requestAnimationFrame(() => {
                this.updateUIFromServer();
                
                // Затем загружаем актуальные данные в фоне (неблокирующе)
                setTimeout(() => {
                    this.loadServerData(true).then(() => {
                        this.updateUIFromServer();
                        console.log('✅ BankModuleServer: Данные банка загружены с сервера');
                    }).catch(error => {
                        console.warn('⚠️ BankModuleServer: Ошибка фоновой загрузки данных:', error);
                    });
                }, 50); // Уменьшили задержку для быстрой загрузки
            });
            
            console.log('🏦 BankModuleServer: Открыт');
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка открытия банка:', error);
        }
    }
    
    /**
     * Закрытие банк модуля
     */
    close() {
        try {
            console.log('🏦 BankModuleServer: Закрытие модуля...');
            
            if (this.ui) {
                this.ui.style.display = 'none';
                this.isOpen = false;
                console.log('✅ BankModuleServer: Модуль закрыт успешно');
            } else {
                console.warn('⚠️ BankModuleServer: UI не найден при закрытии');
            }
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка при закрытии:', error);
        }
    }
    
    /**
     * Выполнение перевода через сервер
     */
    async executeTransfer() {
        // Защита от множественных вызовов
        if (this._isTransferring) {
            console.log('🔄 BankModuleServer: Перевод уже выполняется...');
            return;
        }
        
        const recipientId = this.ui.querySelector('#transfer-recipient')?.value;
        const amountStr = this.ui.querySelector('#transfer-amount')?.value;
        const amount = parseInt(amountStr);
        
        if (!recipientId || !amountStr || isNaN(amount) || amount <= 0) {
            this.showNotification('Заполните все поля корректно', 'error');
            this._isTransferring = false;
            return;
        }
        
        this._isTransferring = true;
        
        if (amount > this.bankState.balance) {
            this.showNotification('Недостаточно средств', 'error');
            this._isTransferring = false;
            return;
        }
        
        try {
            const response = await fetch('/api/bank/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: this.bankState.roomId,
                    fromPlayerId: this.bankState.playerId,
                    toPlayerId: recipientId,
                    amount: amount,
                    description: `Перевод через BankModuleServer`
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Перевод $${CommonUtils.formatNumber(amount)} выполнен`, 'success');
                
                // Добавляем операцию в историю
                const recipient = this.bankState.players.find(p => p.id === recipientId);
                this.addTransaction({
                    type: 'transfer',
                    amount: -amount, // Отрицательная сумма для отправителя
                    recipient: recipient,
                    sender: { id: this.bankState.playerId, username: this.getCurrentUserSync()?.username },
                    description: `Перевод для ${recipient?.username || recipient?.name || 'игрока'}`
                });
                
                this.resetTransferForm();
                
                // Перезагружаем данные с сервера (принудительно, так как данные изменились)
                await this.loadServerData(true);
                this.updateUIFromServer();
            } else {
                this.showNotification(result.message || 'Ошибка выполнения перевода', 'error');
            }
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка перевода:', error);
            this.showNotification('Ошибка выполнения перевода', 'error');
        } finally {
            this._isTransferring = false;
        }
    }
    
    /**
     * Взятие кредита через сервер
     */
    async takeCreditInline() {
        if (this._isTakingLoan) {
            this.showNotification('Операция кредита уже выполняется', 'warning');
            return;
        }
        
        const amountInput = this.ui.querySelector('#loan-amount-server');
        const amount = Math.max(0, Math.floor((parseInt(amountInput.value) || 0) / 1000) * 1000);
        
        if (amount <= 0) {
            this.showNotification('Сумма кредита должна быть больше 0', 'error');
            return;
        }
        
        const maxAmount = this.bankState.maxCredit - this.bankState.credit;
        if (amount > maxAmount) {
            this.showNotification(`Превышен лимит кредита. Доступно: $${CommonUtils.formatNumber(maxAmount)}`, 'error');
            return;
        }
        
        this._isTakingLoan = true;
        try {
            const response = await fetch('/api/bank/loan/take', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: this.bankState.roomId,
                    playerId: this.bankState.playerId,
                    amount: amount
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Кредит $${CommonUtils.formatNumber(amount)} взят успешно`, 'success');
                
                if (result.data?.player) {
                    this._applyPlayerPatch(result.data.player);
                }
                
                // Добавляем операцию в историю
                this.addTransaction({
                    type: 'credit',
                    amount: amount,
                    description: `Взят кредит на сумму $${CommonUtils.formatNumber(amount)}`
                });
                
                amountInput.value = '';
                
                // Перезагружаем данные с сервера (принудительно, так как данные изменились)
                await this.loadServerData(true);
                this.updateUIFromServer();
            } else {
                this.showNotification(result.message || 'Ошибка взятия кредита', 'error');
            }
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка взятия кредита:', error);
            this.showNotification('Ошибка взятия кредита', 'error');
        } finally {
            this._isTakingLoan = false;
        }
    }
    
    /**
     * Погашение кредита через сервер
     */
    async repayCreditInline() {
        if (this._isRepayingLoan) {
            this.showNotification('Погашение уже выполняется', 'warning');
            return;
        }
        
        const amountInput = this.ui.querySelector('#loan-amount-server');
        const amount = Math.max(0, Math.floor((parseInt(amountInput.value) || 0) / 1000) * 1000);
        
        if (amount <= 0) {
            this.showNotification('Сумма погашения должна быть больше 0', 'error');
            return;
        }
        
        if (amount > this.bankState.balance) {
            this.showNotification('Недостаточно средств для погашения', 'error');
            return;
        }
        
        if (amount > this.bankState.credit) {
            this.showNotification(`Нельзя погасить больше, чем задолжано. Задолженность: $${CommonUtils.formatNumber(this.bankState.credit)}`, 'error');
            return;
        }
        
        this._isRepayingLoan = true;
        try {
            const response = await fetch('/api/bank/loan/repay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: this.bankState.roomId,
                    playerId: this.bankState.playerId,
                    amount: amount
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Кредит погашен на $${CommonUtils.formatNumber(amount)}`, 'success');
                
                if (result.data?.player) {
                    this._applyPlayerPatch(result.data.player);
                }
                
                // Добавляем операцию в историю
                this.addTransaction({
                    type: 'credit',
                    amount: -amount, // Отрицательная сумма для погашения
                    description: `Погашен кредит на сумму $${CommonUtils.formatNumber(amount)}`
                });
                
                amountInput.value = '';
                
                // Перезагружаем данные с сервера (принудительно, так как данные изменились)
                await this.loadServerData(true);
                this.updateUIFromServer();
            } else {
                this.showNotification(result.message || 'Ошибка погашения кредита', 'error');
            }
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка погашения кредита:', error);
            this.showNotification('Ошибка погашения кредита', 'error');
        } finally {
            this._isRepayingLoan = false;
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
     * Получение ID комнаты
     */
    getRoomId() {
        try {
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            return urlParams.get('roomId');
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка получения ID комнаты:', error);
            return null;
        }
    }
    
    /**
     * Получение текущего пользователя (асинхронная версия)
     */
    async getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                return JSON.parse(userData);
            }
            
            const token = localStorage.getItem('authToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return {
                    id: payload.userId || payload.id,
                    username: payload.username || payload.email
                };
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ BankModuleServer: Ошибка получения пользователя:', error);
            return null;
        }
    }
    
    /**
     * Получение текущего пользователя (синхронная версия)
     */
    getCurrentUserSync() {
        try {
            // Сначала пробуем sessionStorage (там может быть ID игрока)
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                if (bundle.userId || bundle.id || bundle.username) {
                    console.log('🔍 BankModuleServer: Пользователь из sessionStorage:', bundle);
                    return {
                        id: bundle.userId || bundle.id,
                        username: bundle.username || bundle.currentUser?.username
                    };
                }
            }
            
            // Затем localStorage
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                console.log('🔍 BankModuleServer: Пользователь из localStorage:', user);
                return user;
            }
            
            // И наконец токен
            const token = localStorage.getItem('authToken');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const user = {
                    id: payload.userId || payload.id,
                    username: payload.username || payload.email
                };
                console.log('🔍 BankModuleServer: Пользователь из токена:', user);
                return user;
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ BankModuleServer: Ошибка получения пользователя:', error);
            return null;
        }
    }
    
    /**
     * Форматирование чисел (использует CommonUtils)
     */
    // formatNumber удален - используется CommonUtils.formatNumber
    
    /**
     * Показ уведомлений
     */
    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            return window.showNotification(message, type);
        }
        if (window.notificationManager) {
            return window.notificationManager.show(message, type);
        }
        console.warn('NotificationManager не доступен:', message);
    }
    
    /**
     * Загрузка истории операций с сервера
     */
    async loadTransactionsHistory() {
        try {
            const roomId = this.getRoomId();
            if (!roomId) {
                console.warn('⚠️ BankModuleServer: Room ID не найден для загрузки истории');
                return;
            }

            // Получаем ID игрока
            const playerId = this.bankState.playerId || this.getCurrentUserSync()?.id;
            if (!playerId) {
                console.warn('⚠️ BankModuleServer: Player ID не найден для загрузки истории');
                this.bankState.transactions = [];
                return;
            }

            // Загружаем историю операций с сервера
            const response = await fetch(`/api/bank/transactions/${roomId}/${playerId}`);
            if (!response.ok) {
                console.warn('⚠️ BankModuleServer: Не удалось загрузить историю операций:', response.status);
                this.bankState.transactions = [];
                return;
            }

            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data.transactions)) {
                this.bankState.transactions = data.data.transactions;
                console.log('📋 BankModuleServer: История операций загружена:', this.bankState.transactions.length);
            } else if (data.success && Array.isArray(data.transactions)) {
                // Fallback для старого формата
                this.bankState.transactions = data.transactions;
                console.log('📋 BankModuleServer: История операций загружена (fallback):', this.bankState.transactions.length);
            } else {
                this.bankState.transactions = [];
            }
        } catch (error) {
            console.error('❌ BankModuleServer: Ошибка загрузки истории операций:', error);
            this.bankState.transactions = [];
        }
    }

    /**
     * Обновление отображения истории операций
     */
    updateTransactionsHistory() {
        const transactionsList = this.ui?.querySelector('#transactions-list-server');
        if (!transactionsList) return;

        // Очищаем список
        transactionsList.innerHTML = '';

        if (!this.bankState.transactions || this.bankState.transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="no-transactions">
                    <div class="no-transactions-icon">📋</div>
                    <div class="no-transactions-text">История операций пуста</div>
                    <div class="no-transactions-subtext">Выполненные операции появятся здесь</div>
                </div>
            `;
            return;
        }

        // Сортируем по дате (новые сначала)
        const sortedTransactions = [...this.bankState.transactions].sort((a, b) => 
            new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
        );

        // Рендерим каждую операцию
        sortedTransactions.forEach((transaction, index) => {
            const transactionElement = this.createTransactionElement(transaction, index);
            transactionsList.appendChild(transactionElement);
        });

        // Обновляем счетчик в заголовке
        const badgeElement = this.ui?.querySelector('#new-transactions-server');
        if (badgeElement) {
            badgeElement.textContent = this.bankState.transactions.length.toString();
        }

        console.log(`📋 BankModuleServer: Отображено ${this.bankState.transactions.length} операций`);
    }

    /**
     * Создание элемента операции для отображения
     */
    createTransactionElement(transaction, index) {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        
        const { type, amount, recipient, sender, timestamp, description } = transaction;
        
        // Определяем иконку и цвет по типу операции
        let icon = '💰';
        let colorClass = '';
        let typeText = '';
        
        switch (type) {
            case 'transfer':
            case 'перевод':
                icon = '💸';
                colorClass = 'transfer';
                typeText = 'Перевод';
                break;
            case 'credit':
            case 'кредит':
                icon = '💳';
                colorClass = amount > 0 ? 'credit-take' : 'credit-repay';
                typeText = amount > 0 ? 'Взят кредит' : 'Погашен кредит';
                break;
            case 'payment':
            case 'платеж':
                icon = '💵';
                colorClass = 'payment';
                typeText = 'Платеж';
                break;
            default:
                icon = '💰';
                colorClass = 'default';
                typeText = type || 'Операция';
        }

        // Форматируем дату и время
        const date = new Date(timestamp || transaction.createdAt);
        const timeStr = date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Получаем информацию о получателе/отправителе
        let participantText = '';
        if (type === 'transfer' || type === 'перевод') {
            if (recipient && this.bankState.playerId === recipient.id) {
                participantText = `от ${sender?.username || sender?.name || 'Неизвестно'}`;
                colorClass = 'transfer-in';
            } else {
                participantText = `для ${recipient?.username || recipient?.name || 'Неизвестно'}`;
                colorClass = 'transfer-out';
            }
        }

        const amountText = amount ? `$${CommonUtils.formatNumber(Math.abs(amount))}` : '';
        const amountClass = amount > 0 ? 'positive' : amount < 0 ? 'negative' : '';

        div.innerHTML = `
            <div class="transaction-header">
                <div class="transaction-icon ${colorClass}">${icon}</div>
                <div class="transaction-info">
                    <div class="transaction-type">${typeText}</div>
                    <div class="transaction-participant">${participantText}</div>
                </div>
                <div class="transaction-amount ${amountClass}">${amountText}</div>
            </div>
            <div class="transaction-details">
                <div class="transaction-time">${timeStr}</div>
                ${description ? `<div class="transaction-description">${description}</div>` : ''}
            </div>
        `;

        return div;
    }

    /**
     * Добавление новой операции в историю (для локального обновления)
     */
    addTransaction(transaction) {
        if (!this.bankState.transactions) {
            this.bankState.transactions = [];
        }

        // Добавляем timestamp если его нет
        if (!transaction.timestamp && !transaction.createdAt) {
            transaction.timestamp = new Date().toISOString();
        }

        this.bankState.transactions.unshift(transaction);
        
        // Ограничиваем количество операций в истории (например, последние 50)
        if (this.bankState.transactions.length > 50) {
            this.bankState.transactions = this.bankState.transactions.slice(0, 50);
        }

        // Обновляем отображение
        this.updateTransactionsHistory();
        
        console.log('📋 BankModuleServer: Добавлена новая операция в историю:', transaction);
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        if (this.ui && this.ui.parentNode) {
            this.ui.parentNode.removeChild(this.ui);
        }
        this.ui = null;
        console.log('🏦 BankModuleServer: Уничтожен');
    }
}

// Экспорт для глобального использования
window.BankModuleServer = BankModuleServer;
