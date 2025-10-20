/**
 * TurnController v2.0.0 - Рефакторенная версия
 * UI контроллер для управления ходами игроков
 * Использует GameStateManager и PlayerList для унификации
 */

class TurnController {
    constructor(turnService, playerTokenRenderer, gameStateManager, eventBus = null) {
        this.turnService = turnService;
        this.playerTokenRenderer = playerTokenRenderer;
        this.gameStateManager = gameStateManager;
        this.eventBus = eventBus;
        this.ui = null;
        this.isRolling = false;
        this.isMoving = false;
        this.isMobile = window.innerWidth <= 768;
        this._lastStateKey = null;
        this._eventListenersSetup = false; // Флаг для избежания повторной настройки
        this._setupAttempts = 0; // Счетчик попыток настройки обработчиков
        
        // Создаем PlayerList для отображения игроков
        this.playerList = null;
        
        if (window.logWithStack) {
            window.logWithStack('🎮 TurnController v2.0: Инициализация, isMobile: ' + this.isMobile + ', window.innerWidth: ' + window.innerWidth, null, 'log');
        } else {
            console.log('🎮 TurnController v2.0: Инициализация, isMobile:', this.isMobile, 'window.innerWidth:', window.innerWidth);
        }
        
        // НЕ вызываем this.init() сразу в конструкторе
        // Это позволит PlayersPanel сначала отрендериться
        // init() будет вызван позже явно или через bindToExistingUI
        console.log('🎮 TurnController v2.0: Конструктор завершен, init() будет вызван позже');
    }
    
    /**
     * Инициализация контроллера
     */
    init() {
        this.createUI(); // createUI() вызовет bindToExistingUI(), который сам найдет правильное время для setupEventListeners()
        this.initializePlayerList();
        this.updateUI();
    }
    
    /**
     * Инициализация PlayerList
     */
    initializePlayerList() {
        if (!this.gameStateManager) {
            console.warn('⚠️ TurnController: GameStateManager не найден');
            return;
        }
        
        // Создаем PlayerList с настройками для игрового меню
        // Используем контейнер из PlayersPanel
        this.playerList = new PlayerList('players-list', {
            showBalance: true,
            showStatus: true,
            showToken: true,
            showOrder: false,
            showCurrentUser: true,
            filterCurrentUser: false, // Показываем всех игроков включая текущего
            sortBy: 'status'
        });
        
        // Подписываемся на обновления GameStateManager
        this.gameStateManager.on('state:updated', (state) => {
            this.updateFromGameState(state);
        });
        
        this.gameStateManager.on('turn:changed', (data) => {
            this.handleTurnChanged(data);
        });
        
        // Подписываемся на push-уведомления для принудительного обновления
        if (this.eventBus && typeof this.eventBus.on === 'function') {
            this.eventBus.on('push:message', (message) => {
                if (message.type === 'turn_changed' || message.type === 'game_state_updated') {
                    console.log('🎯 TurnController: Получено push-уведомление о смене хода');
                    // Принудительно обновляем состояние
                    if (this.gameStateManager && typeof this.gameStateManager.forceUpdate === 'function') {
                        this.gameStateManager.forceUpdate();
                    }
                }
            });
        } else {
            console.warn('⚠️ TurnController: eventBus недоступен для push-уведомлений');
        }
    }
    
    /**
     * Создание UI элементов - теперь только привязка к существующим элементам PlayersPanel
     */
    createUI() {
        console.log('🎮 TurnController v2.0: Привязка к существующим элементам UI');
        
        // Вместо создания новых элементов, привязываемся к существующим из PlayersPanel
        this.bindToExistingUI();
        
        // Сохраняем ссылку на UI (будет null, так как не создаем новые элементы)
        this.ui = null;
        
        console.log('🎮 TurnController v2.0: Привязка к UI завершена');
    }
    
    /**
     * Привязка к существующим элементам UI из PlayersPanel
     */
    bindToExistingUI() {
        console.log('🎮 TurnController: Начинаем привязку к существующим элементам UI');
        // Сбрасываем счетчик попыток и флаг для новой попытки
        this._setupAttempts = 0;
        this._eventListenersSetup = false;
        
        // Запускаем setupEventListeners, который сам будет пытаться найти элементы
        this.setupEventListeners();
    }
    
    /**
     * Создание старых элементов UI (закомментировано для избежания дублирования)
     */
    createOldUI() {
        console.log('🎮 TurnController v2.0: Создание UI (отключено для избежания дублирования)');
        return; // Отключено для избежания дублирования с PlayersPanel
        
        // Весь старый код UI полностью удален для избежания дублирования с PlayersPanel
        // Этот метод больше не создает собственный UI, а привязывается к существующим элементам
    }
    
    /**
     * Добавление UI в DOM с повторными попытками
     */
    addUIToDOM() {
        if (!this.ui) {
            console.warn('⚠️ TurnController: UI элемент не создан');
            return;
        }
        
        // Если UI уже в DOM, не добавляем повторно
        if (document.contains(this.ui)) {
            console.log('🎮 TurnController: UI уже в DOM');
            return;
        }
        
        // Пытаемся найти подходящий контейнер, избегая конфликта с PlayersPanel
        const playersPanel = document.getElementById('players-panel');
        const containers = [
            // Ищем специальный контейнер для TurnController или создаем его
            document.getElementById('turn-controller-container'),
            document.querySelector('.game-controls-container'),
            // Только если PlayersPanel еще не инициализирован, используем players-panel
            ...(playersPanel && !playersPanel.querySelector('.players-section') ? [playersPanel] : []),
            document.querySelector('main'),
            document.querySelector('#game-container'),
            document.body
        ].filter(Boolean);
        
        if (containers.length > 0) {
            const container = containers[0];
            container.appendChild(this.ui);
            console.log('🎮 TurnController: UI добавлен в контейнер:', container.tagName, container.id || container.className);
        } else {
            // Если контейнеры не найдены, ждем и пробуем снова
            console.log('🎮 TurnController: Контейнеры не найдены, повторная попытка через 100ms');
            setTimeout(() => this.addUIToDOM(), 100);
        }
    }
    
    /**
     * Настройка обработчиков событий для существующих элементов
     */
    setupEventListeners() {
        // Избегаем повторной настройки после успешной привязки
        if (this._eventListenersSetup) {
            console.log('🎮 TurnController: Обработчики уже настроены, пропускаем');
            return;
        }
        
        // Ограничиваем количество попыток
        this._setupAttempts = this._setupAttempts || 0;
        this._setupAttempts++;
        
        if (this._setupAttempts > 10) {
            console.error(`❌ TurnController: Превышено максимальное количество попыток настройки обработчиков (${this._setupAttempts}/10), прекращаем попытки`);
            return;
        }
        
        console.log(`🎮 TurnController: Привязка обработчиков (попытка ${this._setupAttempts}/10)`);
        
        // Больше не добавляем свой UI в DOM - работаем с существующими элементами
        const playersPanel = document.getElementById('players-panel');
        if (!playersPanel) {
            console.warn(`⚠️ TurnController: players-panel не найден (попытка ${this._setupAttempts}/10)`);
            // Дополнительная диагностика - проверяем, есть ли другие контейнеры
            const allPanels = document.querySelectorAll('[id*="panel"], [class*="panel"]');
            console.log('🔍 Доступные панели:', Array.from(allPanels).map(el => ({ id: el.id, className: el.className })));
            // Сокращаем задержку для ускорения инициализации
            setTimeout(() => this.setupEventListeners(), 100);
            return;
        }
        
        // Бросок кубика - ищем кнопку по ID (сначала внутри playersPanel, потом глобально)
        let rollBtn = playersPanel.querySelector('#roll-dice-btn');
        if (!rollBtn) {
            rollBtn = document.querySelector('#roll-dice-btn');
        }
        
        if (rollBtn) {
            // Удаляем старый обработчик, если есть
            rollBtn.removeEventListener('click', this.handleRollDice);
            rollBtn.addEventListener('click', () => this.handleRollDice());
            console.log('🎮 TurnController: Обработчик броска кубика привязан');
        } else {
            console.warn(`⚠️ TurnController: Кнопка броска кубика не найдена (попытка ${this._setupAttempts}/10)`);
            // Добавляем диагностику - проверяем, что есть в playersPanel
            console.log('🔍 TurnController: Диагностика playersPanel:');
            console.log('  - playersPanel элемент:', playersPanel);
            console.log('  - innerHTML length:', playersPanel?.innerHTML?.length || 0);
            console.log('  - все кнопки в playersPanel:', Array.from(playersPanel?.querySelectorAll('button') || []).map(btn => ({ id: btn.id, text: btn.textContent.trim() })));
            console.log('  - глобальная кнопка #roll-dice-btn:', !!document.querySelector('#roll-dice-btn'));
            
            // Не повторяем, если превышен лимит попыток - проверка уже сделана в начале метода
            if (this._setupAttempts < 10) {
                // Сокращаем задержку для ускорения инициализации
                setTimeout(() => this.setupEventListeners(), 100);
            } else {
                console.error(`❌ TurnController: Превышен лимит попыток поиска кнопки броска кубика (${this._setupAttempts}/10)`);
            }
            return;
        }
        
        // Кнопки перемещения (если есть)
        const moveBtns = playersPanel.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const steps = parseInt(btn.dataset.steps);
                this.handleMove(steps);
            });
        });
        
        // Завершение хода - ищем кнопку по ID (сначала внутри playersPanel, потом глобально)
        let endTurnBtn = playersPanel.querySelector('#pass-turn') ||
                         playersPanel.querySelector('#end-turn-btn');
        if (!endTurnBtn) {
            endTurnBtn = document.querySelector('#pass-turn') || 
                        document.querySelector('#end-turn-btn');
        }
        
        if (endTurnBtn) {
            // Удаляем старый обработчик, если есть
            endTurnBtn.removeEventListener('click', this.handleEndTurn);
            endTurnBtn.addEventListener('click', () => this.handleEndTurn());
            console.log('🎮 TurnController: Обработчик передачи хода привязан');
        } else {
            console.warn(`⚠️ TurnController: Кнопка передачи хода не найдена (попытка ${this._setupAttempts}/10)`);
            // Не повторяем, если превышен лимит попыток - проверка уже сделана в начале метода
            if (this._setupAttempts < 10) {
                // Сокращаем задержку для ускорения инициализации
                setTimeout(() => this.setupEventListeners(), 100);
            } else {
                console.error(`❌ TurnController: Превышен лимит попыток поиска кнопки передачи хода (${this._setupAttempts}/10)`);
            }
            return;
        }
        
        // Слушатели событий TurnService
        this.turnService.on('roll:start', () => this.onRollStart());
        this.turnService.on('roll:success', (response) => this.onRollSuccess(response));
        this.turnService.on('roll:error', (error) => this.onRollError(error));
        this.turnService.on('roll:finish', () => this.onRollFinish());
        
        this.turnService.on('move:start', () => this.onMoveStart());
        this.turnService.on('move:success', (response) => this.onMoveSuccess(response));
        this.turnService.on('move:error', (error) => this.onMoveError(error));
        this.turnService.on('move:finish', () => this.onMoveFinish());
        
        this.turnService.on('end:start', () => this.onEndStart());
        this.turnService.on('end:success', (response) => this.onEndSuccess(response));
        this.turnService.on('end:error', (error) => this.onEndError(error));
        this.turnService.on('end:finish', () => this.onEndFinish());
        
        // Слушатели событий GameStateManager
        if (this.gameStateManager) {
            this.gameStateManager.on('state:updated', (state) => this.updateFromGameState(state));
            this.gameStateManager.on('turn:changed', (data) => this.onTurnChanged(data));
            this.gameStateManager.on('players:updated', (players) => this.onPlayersUpdated(players));
            this.gameStateManager.on('game:playersUpdated', (players) => this.onPlayersUpdated(players));
        }
        
        // Отмечаем, что обработчики успешно настроены
        this._eventListenersSetup = true;
        console.log('✅ TurnController: Все обработчики событий успешно привязаны');
    }
    
    /**
     * Обработка смены хода
     * @param {Object} data - Данные о смене хода
     */
    onTurnChanged(data) {
        console.log('🎯 TurnController: Ход изменен', data);
        // Обновляем UI при смене хода
        if (this.gameStateManager) {
            const state = this.gameStateManager.getState();
            this.updateFromGameState(state);
        }
    }

    /**
     * Обработка обновления игроков
     * @param {Array} players - Список игроков
     */
    onPlayersUpdated(players) {
        console.log('🎯 TurnController: Игроки обновлены', players);
        if (this.playerList) {
            // Проверяем, что players является массивом
            if (Array.isArray(players)) {
                this.playerList.updatePlayers(players);
            } else {
                console.warn('TurnController: players не является массивом:', typeof players, players);
                // Fallback: получаем игроков из GameStateManager
                if (this.gameStateManager) {
                    const state = this.gameStateManager.getState();
                    const playersArray = state?.players || [];
                    if (Array.isArray(playersArray)) {
                        this.playerList.updatePlayers(playersArray);
                    }
                }
            }
        }
    }

    /**
     * Обновление от GameStateManager
     * @param {Object} state - Состояние игры
     */
    updateFromGameState(state) {
        if (!this.playerList) return;
        
        // Throttling: обновляем только если состояние действительно изменилось
        const stateKey = JSON.stringify({
            players: state.players?.length || 0,
            activePlayer: state.activePlayer?.id,
            canRoll: state.canRoll,
            canMove: state.canMove,
            canEndTurn: state.canEndTurn,
            lastDiceResult: state.lastDiceResult?.total
        });
        
        if (this._lastStateKey === stateKey) {
            return; // Состояние не изменилось, пропускаем обновление
        }
        this._lastStateKey = stateKey;
        
        // Обновляем список игроков
        this.playerList.updatePlayers(
            state.players || [],
            state.activePlayer,
            this.getCurrentUserId()
        );
        
        // Обновляем счетчик игроков
        this.updatePlayersCount(state.players?.length || 0);
        
        // Обновляем информацию о ходе
        this.updateTurnInfo(state);
        
        // Обновляем результат кубика
        this.updateDiceInfo(state.lastDiceResult);
        
        // Обновляем кнопки
        this.updateControlButtons(state);
    }
    
    /**
     * Обработка смены хода
     * @param {Object} data - Данные смены хода
     */
    handleTurnChanged(data) {
        console.log('🔄 TurnController: Смена хода', data);
        
        // Подсвечиваем активного игрока
        if (this.playerList && data.activePlayer) {
            this.playerList.highlightActivePlayer(data.activePlayer.id);
        }
        
        // Обновляем информацию о текущем игроке
        this.updateCurrentPlayer(data.activePlayer);
    }
    
    /**
     * Обновление счетчика игроков
     * @param {number} count - Количество игроков
     */
    updatePlayersCount(count) {
        const playersCount = this.ui.querySelector('.players-count');
        if (playersCount) {
            playersCount.textContent = `${count}/4`;
        }
    }
    
    /**
     * Проверка, является ли текущий пользователь активным игроком
     * @param {Object} state - Состояние игры
     * @returns {boolean} true, если это ход текущего пользователя
     */
    isMyTurnCheck(state) {
        if (window.CommonUtils) {
            return window.CommonUtils.isMyTurn(state.activePlayer);
        }
        
        // Fallback - старая логика
        const currentUserId = this.getCurrentUserId();
        const currentUsername = this.getCurrentUsername();
        return state.activePlayer && (
            state.activePlayer.id === currentUserId ||
            (state.activePlayer.username && currentUsername && state.activePlayer.username === currentUsername)
        );
    }

    /**
     * Обновление элемента turnInfo с устранением дублирования
     * @param {HTMLElement} turnInfo - Элемент для обновления
     * @param {Object} state - Состояние игры
     */
    updateTurnInfoElement(turnInfo, state) {
        const isMyTurn = this.isMyTurnCheck(state);
        const playerToken = this.getPlayerToken(state.activePlayer);
        
        if (isMyTurn) {
            turnInfo.innerHTML = `${playerToken} 🎯 ВАШ ХОД`;
            turnInfo.classList.add('my-turn');
            turnInfo.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            turnInfo.style.animation = 'pulse 2s infinite';
        } else if (state.activePlayer) {
            turnInfo.innerHTML = `${playerToken} Ход ${PlayerStatusUtils.getPlayerDisplayName(state.activePlayer)}`;
            turnInfo.classList.remove('my-turn');
            turnInfo.style.background = 'rgba(255,255,255,0.08)';
            turnInfo.style.animation = 'none';
        } else {
            turnInfo.innerHTML = '⏳ Ожидание...';
            turnInfo.classList.remove('my-turn');
            turnInfo.style.background = 'rgba(255,255,255,0.08)';
            turnInfo.style.animation = 'none';
        }
        
        // Обновляем кнопку броска кубика
        this.updateRollButton(state, isMyTurn);
    }

    /**
     * Обновление кнопки броска кубика
     * @param {Object} state - Состояние игры
     * @param {boolean} isMyTurn - Мой ли это ход
     */
    updateRollButton(state, isMyTurn) {
        const rollBtn = this.safeQuerySelector('.btn-dice');
        if (!rollBtn) return;
        
        if (isMyTurn) {
            rollBtn.classList.add('my-turn');
            rollBtn.style.boxShadow = '0 0 0 2px rgba(34,197,94,0.35), 0 10px 22px rgba(34,197,94,0.45)';
            rollBtn.disabled = !state.canRoll || this.isRolling;
        } else {
            rollBtn.classList.remove('my-turn');
            rollBtn.style.boxShadow = '';
            rollBtn.disabled = true; // Не мой ход - кнопка неактивна
        }
    }

    /**
     * Обновление информации о ходе
     * @param {Object} state - Состояние игры
     */
    updateTurnInfo(state) {
        // Ищем элемент turnInfo в UI или в документе
        let turnInfo = null;
        if (this.ui) {
            turnInfo = this.ui.querySelector('.turn-info');
        } else {
            turnInfo = document.querySelector('.turn-info');
        }
        
        if (!turnInfo) {
            return; // Элемент не найден, выходим
        }
        
        // Используем общий метод обновления элемента
        this.updateTurnInfoElement(turnInfo, state);
        
        // Обновляем визуальную индикацию в списке игроков
        this.updatePlayersTurnIndicators(state);
    }
    
    /**
     * Обновление индикаторов хода в списке игроков
     * @param {Object} state - Состояние игры
     */
    updatePlayersTurnIndicators(state) {
        if (!this.playerList) return;
        
        // Используем общие утилиты, если доступны
        const currentUserId = this.getCurrentUserId();
        const currentUsername = this.getCurrentUsername();
        
        // Обновляем все элементы игроков
        const playerItems = this.ui ? this.ui.querySelectorAll('.player-item') : document.querySelectorAll('.player-item');
        playerItems.forEach(item => {
            const playerName = item.querySelector('.player-name');
            if (!playerName) return;
            
            // Убираем все индикаторы
            item.classList.remove('active', 'my-turn', 'other-turn');
            
            // Проверяем, это ли активный игрок
            const isActivePlayer = state.activePlayer && (
                playerName.textContent.includes(state.activePlayer.username || state.activePlayer.name) ||
                playerName.textContent.includes(PlayerStatusUtils.getPlayerDisplayName(state.activePlayer))
            );
            
            // Проверяем, это ли текущий пользователь
            const isCurrentUser = playerName.textContent.includes(currentUsername || 'current user');
            
            if (isActivePlayer) {
                item.classList.add('active');
                if (isCurrentUser) {
                    item.classList.add('my-turn');
                    item.style.borderLeft = '3px solid #22c55e';
                    item.style.background = 'rgba(34, 197, 94, 0.1)';
                } else {
                    item.classList.add('other-turn');
                    item.style.borderLeft = '3px solid #f59e0b';
                    item.style.background = 'rgba(245, 158, 11, 0.1)';
                }
            } else {
                item.style.borderLeft = '3px solid transparent';
                item.style.background = '';
            }
        });
    }

    /**
     * Получение токена игрока (эмодзи фишки)
     * @param {Object} player - Игрок
     * @returns {string} Эмодзи токена
     */
    getPlayerToken(player) {
        if (!player) return '🎯';
        
        // Маппинг токенов по username (как на игровом поле)
        const tokenMap = {
            'test': '🦊',
            'roman': '🦅',
            'admin': '👑',
            'user': '👤'
        };
        
        return tokenMap[player.username] || '🎯';
    }
    
    /**
     * Обновление информации о кубике
     * @param {Object} diceResult - Результат броска
     */
    updateDiceInfo(diceResult) {
        if (diceResult) {
            const diceInfo = this.ui.querySelector('.dice-info');
            if (diceInfo) {
                diceInfo.textContent = this.getDiceEmoji(diceResult.value);
                diceInfo.style.color = '#10b981';
            }
        }
    }
    
    /**
     * Обновление информации о текущем игроке
     * @param {Object} activePlayer - Активный игрок
     */
    updateCurrentPlayer(activePlayer) {
        const currentPlayer = this.ui.querySelector('.current-player');
        if (currentPlayer) {
            if (activePlayer) {
                currentPlayer.textContent = PlayerStatusUtils.getPlayerDisplayName(activePlayer);
            } else {
                currentPlayer.textContent = 'Загрузка...';
            }
        }
    }
    
    /**
     * Обновление кнопок управления
     * @param {Object} state - Состояние игры
     */
    updateControlButtons(state) {
        const rollBtn = this.ui.querySelector('#roll-dice-btn');
        const endTurnBtn = this.ui.querySelector('#end-turn-btn');
        
        if (rollBtn) {
            // Кнопка броска активна только если это мой ход И можно бросать
            const isMyTurn = this.turnService ? this.turnService.isMyTurn() : false;
            rollBtn.disabled = !isMyTurn || !state.canRoll || this.isRolling;
        }
        
        if (endTurnBtn) {
            // Кнопка всегда видна, но активна только если это мой ход И можно завершить ход
            const isMyTurn = this.turnService ? this.turnService.isMyTurn() : false;
            endTurnBtn.disabled = !isMyTurn || !state.canEndTurn;
        }
        
        // Обновляем кнопки перемещения
        const moveBtns = this.ui.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => {
            // Кнопка активна только если это мой ход И можно двигаться
            const isMyTurn = this.turnService ? this.turnService.isMyTurn() : false;
            btn.disabled = !isMyTurn || !state.canMove || this.isMoving;
        });
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     */
    getCurrentUserId() {
        // Используем общую утилиту, если доступна
        if (window.CommonUtils) {
            return window.CommonUtils.getCurrentUserId();
        }
        
        // Fallback - старая логика для обратной совместимости
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle?.currentUser?.id;
            }
            
            // Fallback к localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                return user?.id;
            }
        } catch (error) {
            console.error('❌ TurnController: Ошибка получения ID пользователя:', error);
        }
        
        return null;
    }

    /**
     * Получение username текущего пользователя (fallback для сравнения активного хода)
     */
    getCurrentUsername() {
        // Используем общую утилиту, если доступна
        if (window.CommonUtils) {
            return window.CommonUtils.getCurrentUsername();
        }
        
        // Fallback - старая логика для обратной совместимости
        try {
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle?.currentUser?.username || bundle?.currentUser?.name || null;
            }
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                return user?.username || user?.name || null;
            }
        } catch (error) {
            console.error('❌ TurnController: Ошибка получения username пользователя:', error);
        }
        return null;
    }
    
    /**
     * Обработка броска кубика
     */
    async handleRollDice() {
        // Защита от множественных воздействий
        if (this.isRolling) {
            console.warn('⚠️ TurnController: Бросок кубика уже выполняется');
            return;
        }
        
        // Дополнительная проверка на уровне UI
        const rollBtn = this.ui.querySelector('#roll-dice-btn');
        if (rollBtn && rollBtn.disabled) {
            console.warn('⚠️ TurnController: Кнопка броска отключена');
            return;
        }
        
        // Проверяем права на бросок кубика
        const permissionCheck = this.turnService.canPerformAction({
            requireMyTurn: true
        });
        
        if (!permissionCheck.canPerform) {
            console.warn('⚠️ TurnController: Бросок кубика заблокирован:', permissionCheck.reason);
            this.showNotification(`❌ ${permissionCheck.reason === 'Not your turn' ? 'Не ваш ход!' : 'Действие заблокировано!'}`, 'error');
            return;
        }
        
        // Проверяем, что это действительно ход текущего пользователя
        if (!this.turnService.isMyTurn()) {
            console.warn('⚠️ TurnController: Не ваш ход - бросок кубика заблокирован');
            this.showNotification('❌ Не ваш ход!', 'error');
            return;
        }
        
        console.log('🎲 TurnController: Начинаем бросок кубика для текущего пользователя');
        try {
            await this.turnService.roll({ diceChoice: 'single' });
        } catch (error) {
            console.error('❌ TurnController: Ошибка броска кубика:', error);
            this.showNotification('❌ Ошибка броска кубика', 'error');
        }
    }
    
    /**
     * Показать уведомление
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления
     */
    showNotification(message, type = 'info') {
        // Пытаемся использовать глобальный сервис уведомлений
        if (window.notificationService && typeof window.notificationService.show === 'function') {
            window.notificationService.show(message, type);
        } else {
            // Fallback - показываем в консоли и создаем временное уведомление
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
            
            // Создаем временное уведомление
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
            `;
            notification.textContent = message;
            
            // Добавляем анимацию
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(notification);
            
            // Удаляем через 3 секунды
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 3000);
        }
    }
    
    /**
     * Обработка перемещения
     */
    async handleMove(steps) {
        // Защита от множественных воздействий
        if (this.isMoving) {
            console.warn('⚠️ TurnController: Перемещение уже выполняется');
            return;
        }
        
        // Дополнительная проверка на уровне UI
        const moveBtns = this.ui.querySelectorAll('.move-btn');
        const clickedBtn = Array.from(moveBtns).find(btn => parseInt(btn.dataset.steps) === steps);
        if (clickedBtn && clickedBtn.disabled) {
            console.warn('⚠️ TurnController: Кнопка перемещения отключена');
            return;
        }
        
        // Проверяем права на перемещение
        const permissionCheck = this.turnService.canPerformAction({
            requireMyTurn: true
        });
        
        if (!permissionCheck.canPerform) {
            console.warn('⚠️ TurnController: Перемещение заблокировано:', permissionCheck.reason);
            this.showNotification(`❌ ${permissionCheck.reason === 'Not your turn' ? 'Не ваш ход!' : 'Действие заблокировано!'}`, 'error');
            return;
        }
        
        // Проверяем, что это действительно ход текущего пользователя
        if (!this.turnService.isMyTurn()) {
            console.warn('⚠️ TurnController: Не ваш ход - перемещение заблокировано');
            this.showNotification('❌ Не ваш ход!', 'error');
            return;
        }
        
        if (!this.turnService.canMove()) {
            console.warn('⚠️ TurnController: Перемещение недоступно');
            this.showNotification('❌ Перемещение недоступно', 'error');
            return;
        }
        
        console.log('🎯 TurnController: Начинаем перемещение для текущего пользователя');
        try {
            await this.turnService.move(steps);
        } catch (error) {
            console.error('❌ TurnController: Ошибка перемещения:', error);
            this.showNotification('❌ Ошибка перемещения', 'error');
        }
    }
    
    /**
     * Обработка завершения хода
     */
    async handleEndTurn() {
        if (!this.turnService.canEndTurn()) return;
        
        try {
            await this.turnService.endTurn();
        } catch (error) {
            console.error('❌ TurnController: Ошибка завершения хода:', error);
        }
    }
    
    /**
     * События броска кубика
     */
    onRollStart() {
        this.isRolling = true;
        const rollBtn = this.ui.querySelector('#roll-dice-btn');
        rollBtn.disabled = true;
        rollBtn.textContent = '🎲 Бросаем...';
        rollBtn.classList.add('rolling');
        
        this.updateStatus('Бросаем кубик...');
    }
    
    onRollSuccess(response) {
        const moveActions = this.ui.querySelector('#move-actions');
        const endTurnBtn = this.ui.querySelector('#end-turn-btn');
        
        // Универсально достаём значение броска: сервер или локальный
        const serverValue = response && (response.serverValue ?? response.diceResult?.value);
        const localValue = response && response.localRoll && (response.localRoll.value || response.localRoll.total);
        const value = serverValue ?? localValue ?? null;

        // Обновляем отображение кубика в нижней панели (PlayersPanel)
        this.updateDiceInBottomPanel(value);
        
        // Показываем кнопки перемещения
        moveActions.style.display = response?.state?.canMove ? 'block' : 'none';
        
        // Активируем кнопку "Передать ход" после броска кубика
        if (endTurnBtn) {
            endTurnBtn.disabled = !this.turnService.canEndTurn();
        }
        
        this.updateStatus(`Выпало: ${value != null ? value : '?'}`);
    }
    
    /**
     * Обновление отображения кубика в нижней панели
     */
    updateDiceInBottomPanel(value) {
        // Обновляем через PlayersPanel
        const playersPanel = window.app?.getModule?.('playersPanel');
        if (playersPanel && typeof playersPanel.updateDiceResult === 'function') {
            playersPanel.updateDiceResult(value);
            console.log(`🎲 TurnController: Обновлен кубик через PlayersPanel: ${value}`);
        } else {
            // Fallback: прямое обновление элемента
            const bottomDiceElement = document.getElementById('dice-result');
            if (bottomDiceElement) {
                const valueEmoji = this.getDiceEmoji(Math.max(1, Math.min(6, Number(value) || 1)));
                bottomDiceElement.textContent = `${valueEmoji} ${value}`;
                console.log(`🎲 TurnController: Обновлен кубик напрямую: ${valueEmoji} ${value}`);
            } else {
                console.warn('⚠️ TurnController: Элемент dice-result в нижней панели не найден');
            }
        }
    }
    
    onRollError(error) {
        console.error('❌ TurnController: Ошибка броска кубика:', error);
        const rollBtn = this.ui.querySelector('#roll-dice-btn');
        if (rollBtn) {
            rollBtn.disabled = true;
            setTimeout(()=>{ rollBtn.disabled = false; }, 1200);
        }
        const message = (error && (error.message || error.toString() || ''));
        if (String(message).includes('HTTP 400') || String(message).toLowerCase().includes('not your turn')) {
            this.updateStatus('Не ваш ход или действие недоступно');
        } else {
            this.updateStatus('Ошибка броска кубика');
        }
    }
    
    onRollFinish() {
        this.isRolling = false;
        const rollBtn = this.ui.querySelector('#roll-dice-btn');
        rollBtn.disabled = false;
        rollBtn.textContent = '🎲 Бросить кубик';
        rollBtn.classList.remove('rolling');
        
        this.updateUI();
    }
    
    /**
     * События перемещения
     */
    onMoveStart() {
        this.isMoving = true;
        const moveBtns = this.ui.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => btn.disabled = true);
        
        this.updateStatus('Перемещаемся...');
    }
    
    onMoveSuccess(response) {
        const endTurnBtn = this.ui.querySelector('#end-turn-btn');
        const moveActions = this.ui.querySelector('#move-actions');
        if (moveActions) {
            moveActions.style.display = 'none';
        }
        
        // Активируем кнопку "Передать ход" после движения
        if (endTurnBtn) {
            endTurnBtn.disabled = !this.turnService.canEndTurn();
        }
        
        this.updateStatus(`Перемещены на ${response.moveResult.steps} шагов`);
    }
    
    onMoveError(error) {
        console.error('❌ TurnController: Ошибка перемещения:', error);
        this.updateStatus('Ошибка перемещения');
    }
    
    onMoveFinish() {
        this.isMoving = false;
        const moveBtns = this.ui.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => btn.disabled = false);
        
        this.updateUI();
    }
    
    /**
     * События завершения хода
     */
    onEndStart() {
        this.updateStatus('Завершаем ход...');
    }
    
    onEndSuccess(response) {
        // Скрываем элементы
        const diceResult = this.ui.querySelector('#dice-result');
        const moveActions = this.ui.querySelector('#move-actions');
        const endTurnBtn = this.ui.querySelector('#end-turn-btn');
        
        diceResult.style.display = 'none';
        moveActions.style.display = 'none';
        
        // Отключаем кнопку "Передать ход" после завершения хода
        if (endTurnBtn) {
            endTurnBtn.disabled = true;
        }
        
        this.updateStatus('Ход завершен');
        this.updateUI();
    }
    
    onEndError(error) {
        console.error('❌ TurnController: Ошибка завершения хода:', error);
        this.updateStatus('Ошибка завершения хода');
    }
    
    onEndFinish() {
        this.updateUI();
    }
    
    /**
     * Получение эмодзи для значения кубика
     */
    getDiceEmoji(value) {
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return diceEmojis[value - 1] || '⚀';
    }
    
    /**
     * Обновление UI (legacy метод для совместимости)
     */
    updateUI() {
        if (!this.gameStateManager) return;
        
        const state = this.gameStateManager.getState();
        this.updateFromGameState(state);
    }
    
    /**
     * Обновление статуса
     */
    updateStatus(message) {
        // Обновляем статус в секции игрока
        const playerStatus = this.safeQuerySelector('.player-status');
        if (playerStatus) {
            playerStatus.textContent = message;
        }
        
        // Обновляем статус в обзоре игры
        const turnInfo = this.safeQuerySelector('.turn-info');
        if (turnInfo) {
            turnInfo.textContent = message;
        }
    }
    
    /**
     * Безопасный поиск элемента с проверкой на null
     * @param {string} selector - CSS селектор
     * @returns {Element|null}
     */
    safeQuerySelector(selector) {
        // Используем общую утилиту, если доступна
        if (window.CommonUtils) {
            const context = this.ui || document;
            return window.CommonUtils.safeQuerySelector(selector, context);
        }
        
        // Fallback - старая логика для обратной совместимости
        try {
            if (!this.ui) {
                return document.querySelector(selector);
            }
            return this.ui.querySelector(selector);
        } catch (error) {
            console.warn('TurnController: Ошибка поиска элемента:', selector, error);
            return null;
        }
    }
    
    /**
     * Уничтожение контроллера
     */
    destroy() {
        if (this.playerList) {
            this.playerList.destroy();
        }
        
        if (this.ui) {
            this.ui.remove();
        }
        
        console.log('🎮 TurnController v2.0: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.TurnController = TurnController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnController;
}
