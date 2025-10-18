/**
 * PlayersPanel v2.0.0 - Рефакторенная версия
 * Компонент для отображения списка игроков в боковой панели
 * Использует GameStateManager и PlayerList для унификации
 */

class PlayersPanel {
    constructor(config = {}) {
        this.gameStateManager = config.gameStateManager || null;
        this.eventBus = config.eventBus || null;
        this.containerId = config.containerId || 'players-panel';
        
        // Создаем PlayerList для отображения игроков
        this.playerList = null;
        this.currentUser = null;
        this._lastStateKey = null;
        
        // Создаем BankModule при инициализации
        this.bankModule = null;
        
        console.log('👥 PlayersPanel v2.0: Инициализация');
        this.init();
    }
    
    /**
     * Инициализация компонента
     */
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('❌ PlayersPanel: Контейнер не найден:', this.containerId);
            return;
        }
        
        this.setupEventListeners();
        this.render();
        
        // Создаем BankModule при инициализации
        this.createBankModule();
        
        // Инициализируем отображение из текущего состояния игры
        if (this.gameStateManager && typeof this.gameStateManager.getState === 'function') {
            try {
                const state = this.gameStateManager.getState();
                this.updateFromGameState(state || {});
            } catch (_) {}
        }
        
        // Принудительно загружаем игроков через 1 секунду после инициализации
        setTimeout(() => {
            this.forceLoadPlayers();
        }, 1000);
        
        console.log('✅ PlayersPanel v2.0: Инициализирован');
    }
    
    /**
     * Создание BankModule
     */
    createBankModule() {
        if (this.bankModule) {
            return; // Уже создан
        }
        
        if (!window.BankModule) {
            console.warn('⚠️ PlayersPanel: BankModule не загружен');
            return;
        }
        
        try {
            // Получаем необходимые модули из app
            const app = window.app;
            if (!app) {
                console.warn('⚠️ PlayersPanel: App не найден');
                return;
            }
            
            const gameState = app.getModule('gameState');
            const eventBus = app.getEventBus();
            const roomApi = app.getModule('roomApi');
            const professionSystem = app.getModule('professionSystem');
            
            this.bankModule = new window.BankModule({
                gameState: gameState,
                eventBus: eventBus,
                roomApi: roomApi,
                professionSystem: professionSystem,
                gameStateManager: this.gameStateManager
            });
            
            // Сохраняем в app для доступа из других модулей
            app.modules.set('bankModule', this.bankModule);
            
            console.log('🏦 PlayersPanel: BankModule создан при инициализации');
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка создания BankModule:', error);
        }
    }
    
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Обратная совместимость с существующими событиями
            this.eventBus.on('game:started', (data) => {
                if (data && Array.isArray(data.players)) {
                    this.gameStateManager?.updateFromServer({ players: data.players });
                }
            });
            
            this.eventBus.on('game:playersUpdated', (data) => {
                if (data && Array.isArray(data.players)) {
                    this.gameStateManager?.updateFromServer({ players: data.players });
                }
            });
            
            this.eventBus.on('game:activePlayerChanged', (data) => {
                if (data && data.activePlayer) {
                    this.gameStateManager?.updateFromServer({ activePlayer: data.activePlayer });
                }
            });
            
            // Обработчик для обновления кубика
            this.eventBus.on('dice:rolled', (data) => {
                if (data && data.value !== undefined) {
                    this.updateDiceResult(data.value);
                }
            });
        }

        // Подписываемся на обновления состояния игры
        if (this.gameStateManager && typeof this.gameStateManager.on === 'function') {
            this.gameStateManager.on('state:updated', (state) => {
                this.updateFromGameState(state || {});
            });
            this.gameStateManager.on('turn:changed', (data) => {
                this.handleTurnChanged(data || {});
            });
            this.gameStateManager.on('players:updated', (players) => {
                this.onPlayersUpdated(players);
            });
            this.gameStateManager.on('game:playersUpdated', (players) => {
                this.onPlayersUpdated(players);
            });
        }
        
        // Подписываемся на push-уведомления для принудительного обновления
        if (this.eventBus && typeof this.eventBus.on === 'function') {
            this.eventBus.on('push:message', (message) => {
                if (message.type === 'turn_changed' || message.type === 'game_state_updated') {
                    console.log('🎯 PlayersPanel: Получено push-уведомление о смене хода');
                    // Принудительно обновляем состояние
                    if (this.gameStateManager && typeof this.gameStateManager.forceUpdate === 'function') {
                        this.gameStateManager.forceUpdate();
                    }
                }
            });
        } else {
            console.warn('⚠️ PlayersPanel: eventBus недоступен для push-уведомлений');
        }
        
        // Обработчик клика для кнопки банка
        const bankButton = document.getElementById('open-bank');
        if (bankButton) {
            bankButton.addEventListener('click', () => {
                console.log('🏦 PlayersPanel: Клик по кнопке банка');
                this.openBankModule();
            });
            console.log('✅ PlayersPanel: Обработчик клика для банка привязан');
        } else {
            console.warn('⚠️ PlayersPanel: Кнопка банка не найдена');
        }
    }
    
    /**
     * Обработка обновления игроков
     * @param {Array} players - Список игроков
     */
    onPlayersUpdated(players) {
        console.log('👥 PlayersPanel: Игроки обновлены', players);
        if (this.playerList) {
            // Проверяем, что players является массивом
            if (Array.isArray(players)) {
                this.playerList.updatePlayers(players);
            } else {
                console.warn('PlayersPanel: players не является массивом:', typeof players, players);
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
     * Рендер компонента
     */
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="players-panel">
                <div class="panel-grid">
                    <section class="game-controls">
                        <div class="dice-controls">
                            <!-- Кнопка броска кубика управляется через TurnController -->
                            <div class="dice-display">
                                <div id="dice-result" class="dice-value">🎲</div>
                                <div class="dice-label">Результат броска</div>
                            </div>
                            <button class="btn btn-secondary" id="pass-turn" type="button" disabled>
                                <span class="btn-icon">➡️</span>
                                <span class="btn-text">Передать ход</span>
                            </button>
                        </div>
                        
                        <div class="turn-info">
                            <div class="player-info">
                                <span class="label">Ход:</span>
                                <span class="value" id="current-player">Загрузка...</span>
                            </div>
                            <div class="player-info">
                                <span class="label">Кубик:</span>
                                <span class="value" id="dice-result">🎲</span>
                            </div>
                        </div>
                        
                        <div class="bank-section">
                            <button class="btn btn-bank" id="open-bank" type="button">
                                <span class="btn-icon">🏦</span>
                                <span class="btn-text">Банк</span>
                            </button>
                        </div>
                    </section>
                    
                    <!-- Секция игроков -->
                    <section class="players-section">
                        <div class="players-header">
                            <h3 class="players-title">👥 Игроки в комнате</h3>
                            <span class="players-count" id="players-count">0/4</span>
                        </div>
                        <div class="players-list" id="players-list">
                            <!-- Игроки будут добавлены динамически -->
                        </div>
                    </section>
                </div>
            </div>
        `;
        
        // Добавляем стили
        this.addStyles();
        
        // Настраиваем обработчики
        this.setupControls();
        
        // Привязываем обработчик клика для кнопки банка
        const bankButton = document.getElementById('open-bank');
        if (bankButton) {
            // Удаляем старый обработчик, если есть
            bankButton.removeEventListener('click', this.openBankModule);
            // Добавляем новый обработчик
            bankButton.addEventListener('click', () => {
                console.log('🏦 PlayersPanel: Клик по кнопке банка (из render)');
                this.openBankModule();
            });
            console.log('✅ PlayersPanel: Обработчик клика для банка привязан в render');
        }
        
        console.log('✅ PlayersPanel v2.0: Отрендерен');
    }
    
    /**
     * Обновление от GameStateManager
     * @param {Object} state - Состояние игры
     */
    updateFromGameState(state) {
        // Throttling: обновляем только если состояние действительно изменилось
        const stateKey = JSON.stringify({
            activePlayer: state.activePlayer?.id,
            canRoll: state.canRoll,
            canMove: state.canMove,
            canEndTurn: state.canEndTurn,
            lastDiceResult: state.lastDiceResult?.total,
            playersCount: state.players?.length || 0
        });
        
        if (this._lastStateKey === stateKey) {
            return; // Состояние не изменилось, пропускаем обновление
        }
        this._lastStateKey = stateKey;
        
        // Обновляем информацию об активном игроке
        this.updateActivePlayerInfo(state.activePlayer);
        
        // Обновляем кнопки управления
        this.updateControlButtons(state);

        // Обновляем результат кубика, если есть данные
        if (state && Object.prototype.hasOwnProperty.call(state, 'lastDiceResult')) {
            const diceResultValue = state.lastDiceResult && typeof state.lastDiceResult === 'object'
                ? state.lastDiceResult.value ?? state.lastDiceResult.total
                : state.lastDiceResult;
            this.updateDiceResult(diceResultValue);
        }
        
        // Обновляем список игроков
        if (state.players && Array.isArray(state.players) && state.players.length > 0) {
            this.updatePlayersList(state.players);
        } else {
            // Если игроки не переданы или пустые, пытаемся получить их принудительно
            this.forceLoadPlayers();
        }
    }
    
    /**
     * Принудительная загрузка игроков
     */
    forceLoadPlayers() {
        const roomId = window.location.hash.split('roomId=')[1];
        if (!roomId) return;
        
        console.log('🔧 PlayersPanel: Принудительная загрузка игроков для комнаты:', roomId);
        
        fetch(`/api/rooms/${roomId}/game-state`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.state && data.state.players && data.state.players.length > 0) {
                    console.log('🔧 PlayersPanel: Получены игроки принудительно:', data.state.players);
                    this.updatePlayersList(data.state.players);
                    
                    // Также обновляем GameStateManager
                    const gameStateManager = window.app?.services?.get('gameStateManager');
                    if (gameStateManager) {
                        gameStateManager.updateFromServer(data.state);
                    }
                }
            })
            .catch(err => console.error('❌ PlayersPanel: Ошибка принудительной загрузки игроков:', err));
    }
    
    /**
     * Обработка смены хода
     * @param {Object} data - Данные смены хода
     */
    handleTurnChanged(data) {
        console.log('🔄 PlayersPanel: Смена хода', data);
        
        // Обновляем информацию об активном игроке
        this.updateActivePlayerInfo(data.activePlayer);
    }
    
    /**
     * Обновление списка игроков
     * @param {Array} players - Массив игроков
     */
    updatePlayersList(players = []) {
        const playersList = document.getElementById('players-list');
        const playersCount = document.getElementById('players-count');
        
        if (!playersList || !playersCount) return;
        
        // Обновляем счетчик игроков
        playersCount.textContent = `${players.length}/4`;
        
        // Очищаем список
        playersList.innerHTML = '';
        
        // Добавляем каждого игрока
        players.forEach((player, index) => {
            const playerElement = this.createPlayerElement(player, index);
            playersList.appendChild(playerElement);
        });
        
        console.log('👥 PlayersPanel: Обновлен список игроков', players.length);
        
        // Синхронизируем баланс с банком, если он открыт
        this.syncBalanceWithBank(players);
    }
    
    /**
     * Синхронизация баланса игроков с банком
     * @param {Array} players - Массив игроков
     */
    syncBalanceWithBank(players) {
        if (!this.bankModule) return;
        
        try {
            // Получаем текущего пользователя
            const currentUserId = this.getCurrentUserId();
            if (!currentUserId) return;
            
            // Находим текущего игрока в списке
            const currentPlayer = players.find(p => 
                p.id === currentUserId || 
                p.userId === currentUserId || 
                p.username === currentUserId
            );
            
            if (currentPlayer && this.bankModule.updatePlayerBalance) {
                // Обновляем баланс в банке
                this.bankModule.updatePlayerBalance(currentPlayer);
                console.log('💰 PlayersPanel: Баланс синхронизирован с банком:', currentPlayer.balance || currentPlayer.money);
            }
        } catch (error) {
            console.warn('⚠️ PlayersPanel: Ошибка синхронизации баланса:', error);
        }
    }
    
    /**
     * Создание элемента игрока
     * @param {Object} player - Данные игрока
     * @param {number} index - Индекс игрока
     * @returns {HTMLElement} Элемент игрока
     */
    createPlayerElement(player, index) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        
        // Получаем баланс из разных возможных источников
        const balance = player.balance || player.money || player.cash || 0;
        
        playerDiv.innerHTML = `
            <div class="player-avatar">
                <span class="player-icon">🎯</span>
            </div>
            <div class="player-info">
                <div class="player-name">${player.username || 'Игрок ' + (index + 1)}</div>
                <div class="player-status ${player.isActive ? 'active' : 'inactive'}">
                    ${player.isActive ? 'Активен' : 'Ожидание'}
                </div>
                <div class="player-balance">$${balance}</div>
            </div>
            <div class="player-token">
                <span class="token-icon">🎲</span>
            </div>
        `;
        
        return playerDiv;
    }
    
    /**
     * Обработка обновления игроков
     * @param {Object} data - Данные обновления игроков
     */
    handlePlayersUpdated(data) {
        console.log('👥 PlayersPanel: Игроки обновлены', data);
        // Игроки больше не отображаются в этом компоненте
    }
    
    /**
     * Обновление информации об активном игроке
     * @param {Object} activePlayer - Активный игрок
     */
    updateActivePlayerInfo(activePlayer) {
        const currentPlayer = document.getElementById('current-player');
        if (currentPlayer) {
            if (activePlayer) {
                currentPlayer.textContent = PlayerStatusUtils.getPlayerDisplayName(activePlayer);
            } else {
                currentPlayer.textContent = 'Загрузка...';
            }
        }
    }
    
    /**
     * Открытие банк модуля
     */
    openBankModule() {
        try {
            // Используем уже созданный BankModule
            if (this.bankModule) {
                this.bankModule.open();
                console.log('🏦 PlayersPanel: Банк модуль открыт');
            } else {
                console.warn('⚠️ PlayersPanel: BankModule не создан, создаем...');
                this.createBankModule();
                if (this.bankModule) {
                    this.bankModule.open();
                } else {
                    console.error('❌ PlayersPanel: Не удалось создать BankModule');
                }
            }
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка открытия банка:', error);
        }
    }
    
    /**
     * Обновление результата кубика
     * @param {number} result - Результат броска
     */
    updateDiceResult(result) {
        const diceResult = document.getElementById('dice-result');
        if (diceResult) {
            const numericValue = typeof result === 'object'
                ? Number(result?.value ?? result?.total)
                : Number(result);
            if (Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 6) {
                const diceEmoji = this.getDiceEmoji(numericValue);
                diceResult.textContent = `${diceEmoji} ${numericValue}`;
            } else {
                diceResult.textContent = '🎲';
            }
        }
    }

    /**
     * Получение эмодзи для значения кубика
     * @param {number} value - Значение кубика (1-6)
     * @returns {string} Эмодзи кубика
     */
    getDiceEmoji(value) {
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return diceEmojis[value - 1] || '⚀';
    }
    
    /**
     * Обновление кнопок управления
     * @param {Object} state - Состояние игры
     */
    updateControlButtons(state) {
        // Удаляем кнопку roll-dice - управление через TurnController
        const passBtn = document.getElementById('pass-turn');
        
        // Проверяем, мой ли это ход
        const currentUserId = this.getCurrentUserId();
        const activePlayer = state.activePlayer;
        
        // Расширенная проверка isMyTurn
        let isMyTurn = false;
        if (activePlayer && currentUserId) {
            isMyTurn = 
                activePlayer.id === currentUserId ||
                activePlayer.userId === currentUserId ||
                activePlayer.username === currentUserId ||
                (activePlayer.username && currentUserId && activePlayer.username === currentUserId);
        }
        
        if (passBtn) {
            // Кнопка передачи хода активна ТОЛЬКО если это мой ход И можно завершить ход
            const shouldBeDisabled = !isMyTurn || !state.canEndTurn;
            passBtn.disabled = shouldBeDisabled;
            
            // Добавляем визуальную индикацию
            if (isMyTurn && state.canEndTurn) {
                passBtn.classList.add('active');
            } else {
                passBtn.classList.remove('active');
            }
        }
        
        console.log('🎯 PlayersPanel: Обновлены кнопки управления:', {
            currentUserId,
            activePlayerId: activePlayer?.id,
            activePlayerUsername: activePlayer?.username,
            activePlayerUserId: activePlayer?.userId,
            isMyTurn,
            canRoll: state.canRoll,
            canEndTurn: state.canEndTurn,
            passBtnDisabled: passBtn?.disabled,
            shouldBeDisabled: !isMyTurn || !state.canEndTurn,
            turnCheckDetails: {
                idMatch: activePlayer?.id === currentUserId,
                userIdMatch: activePlayer?.userId === currentUserId,
                usernameMatch: activePlayer?.username === currentUserId
            }
        });
    }
    
    /**
     * Обработка завершения хода
     */
    async handleEndTurn() {
        try {
            // Получаем TurnService через window.app
            const app = window.app;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            
            if (!turnService) {
                console.warn('⚠️ PlayersPanel: TurnService не найден');
                return;
            }
            
            // Проверяем права на завершение хода
            if (!turnService.canEndTurn()) {
                console.warn('⚠️ PlayersPanel: Нельзя завершить ход');
                return;
            }
            
            // Проверяем, что это действительно мой ход (используем ту же логику, что и TurnService)
            const currentUserId = this.getCurrentUserId();
            const state = turnService.getState();
            
            if (!state || !state.activePlayer) {
                console.warn('⚠️ PlayersPanel: Нет активного игрока');
                return;
            }
            
            const activePlayer = state.activePlayer;
            const isMyTurn = 
                activePlayer.id === currentUserId ||
                activePlayer.userId === currentUserId ||
                (activePlayer.username && currentUserId && activePlayer.username === currentUserId);
            
            if (!isMyTurn) {
                console.warn('⚠️ PlayersPanel: Не ваш ход - завершение хода заблокировано', {
                    activePlayer: activePlayer.username || activePlayer.id,
                    currentUserId
                });
                return;
            }
            
            console.log('🎯 PlayersPanel: Завершаем ход для текущего пользователя');
            await turnService.endTurn();
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка завершения хода:', error);
        }
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     */
    getCurrentUserId() {
        try {
            // Используем ту же логику, что и TurnService
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                const userId = bundle?.currentUser?.id || bundle?.currentUser?.userId;
                if (userId) {
                    console.log('🔍 PlayersPanel: ID пользователя из bundle:', userId);
                    return userId;
                }
            }
            
            // Пытаемся получить из localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                const userId = user?.id || user?.userId;
                if (userId) {
                    console.log('🔍 PlayersPanel: ID пользователя из localStorage:', userId);
                    return userId;
                }
            }
            
            // Пытаемся получить из глобального объекта app
            if (window.app && window.app.getModule) {
                const userModel = window.app.getModule('userModel');
                if (userModel && userModel.getCurrentUser) {
                    const currentUser = userModel.getCurrentUser();
                    if (currentUser && (currentUser.id || currentUser.userId)) {
                        const userId = currentUser.id || currentUser.userId;
                        console.log('🔍 PlayersPanel: ID пользователя из userModel:', userId);
                        return userId;
                    }
                }
            }
            
            console.warn('⚠️ PlayersPanel: Не удалось получить ID пользователя');
            return null;
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка получения ID пользователя:', error);
            return null;
        }
    }
    
    
    /**
     * Добавление стилей (копируем из оригинального PlayersPanel)
     */
    addStyles() {
        if (document.getElementById('players-panel-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'players-panel-styles';
        styles.textContent = `
            .players-panel {
                background: linear-gradient(145deg, rgba(20, 25, 40, 0.95), rgba(15, 20, 35, 0.95));
                border-radius: 1.5rem;
                padding: 2rem;
                border: 2px solid rgba(99, 102, 241, 0.3);
                backdrop-filter: blur(20px);
                color: #ffffff;
                max-width: 400px;
                width: 100%;
                box-shadow: 
                    0 20px 40px rgba(0, 0, 0, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                position: relative;
                overflow: hidden;
                height: fit-content;
                max-height: calc(100vh - 120px);
            }
            
            .panel-grid {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                height: 100%;
            }
            
            
            .game-controls {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .dice-controls {
                display: flex;
                gap: 1rem;
                flex-direction: row;
            }

            /* Увеличенный кубик в верхнем блоке */
            .dice-display #dice-result {
                font-size: 9rem;
                line-height: 1;
            }

            .dice-controls .btn {
                flex: 1;
                min-width: 140px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .turn-info {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
                border-radius: 1rem;
                padding: 1.5rem;
                border: 2px solid rgba(99, 102, 241, 0.2);
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }
            
            .turn-info .player-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
            }
            
            .turn-info .player-info:last-child {
                margin-bottom: 0;
            }
            
            .turn-info .label {
                color: #a0a0a0;
                font-size: 0.9rem;
            }
            
            .turn-info .value {
                color: #ffffff;
                font-weight: 600;
                font-size: 0.9rem;
            }

            /* Увеличенный кубик в нижней панели "Кубик:" */
            .turn-info .player-info .value#dice-result {
                font-size: 3rem;
                font-weight: 800;
                color: #22c55e;
            }
            
            
            .btn {
                padding: 1rem 1.5rem;
                border: none;
                border-radius: 1rem;
                font-weight: 700;
                font-size: 0.95rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(10px);
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: 2px solid rgba(99, 102, 241, 0.3);
                box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
            }
            
            .btn-primary:hover:not(:disabled) {
                background: linear-gradient(135deg, #8b5cf6, #a855f7);
                transform: translateY(-3px);
                box-shadow: 0 12px 35px rgba(99, 102, 241, 0.5);
                border-color: rgba(99, 102, 241, 0.6);
            }
            
            .btn-secondary {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1));
                color: #ffffff;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
                border-color: rgba(255, 255, 255, 0.4);
                transform: translateY(-3px);
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
            }
            
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
                box-shadow: none !important;
            }
            
            .bank-section {
                margin-top: 15px;
                display: flex;
                justify-content: center;
            }
            
            .btn-bank {
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                border: 1px solid rgba(139, 92, 246, 0.3);
                color: white;
                font-weight: 600;
                padding: 12px 24px;
                border-radius: 10px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            }
            
            .btn-bank:hover {
                background: linear-gradient(135deg, #7c3aed, #6d28d9);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
            }
            
            .btn-bank:active {
                transform: translateY(0);
            }
            
            /* Стили для списка игроков */
            .players-section {
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .players-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .players-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0;
            }
            
            .players-count {
                background: rgba(99, 102, 241, 0.2);
                color: #6366f1;
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.875rem;
                font-weight: 500;
                border: 1px solid rgba(99, 102, 241, 0.3);
            }
            
            .players-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .player-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }
            
            .player-item:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            .player-avatar {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .player-icon {
                font-size: 1.25rem;
            }
            
            .player-info {
                flex: 1;
                min-width: 0;
            }
            
            .player-name {
                font-weight: 600;
                color: #ffffff;
                font-size: 0.875rem;
                margin-bottom: 0.25rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .player-status {
                font-size: 0.75rem;
                font-weight: 500;
                margin-bottom: 0.25rem;
            }
            
            .player-status.active {
                color: #10b981;
            }
            
            .player-status.inactive {
                color: #6b7280;
            }
            
            .player-balance {
                font-size: 0.75rem;
                color: #fbbf24;
                font-weight: 600;
            }
            
            .player-token {
                flex-shrink: 0;
            }
            
            .token-icon {
                font-size: 1rem;
                opacity: 0.7;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Настройка элементов управления
     * Примечание: PlayersPanel теперь только отображает UI, управление ходами через TurnController
     */
    setupControls() {
        // PlayersPanel больше не управляет броском кубика и ходами
        // Эта функциональность полностью делегирована TurnController
        console.log('ℹ️ PlayersPanel: UI контроллеры не настраиваются - используется TurnController');
        
        // Обработчик кнопки банка
        const openBankBtn = this.container.querySelector('#open-bank');
        if (openBankBtn) {
            openBankBtn.addEventListener('click', () => {
                this.openBankModule();
            });
        }
        
        // Обработчик кнопки "Передать ход"
        const passTurnBtn = this.container.querySelector('#pass-turn');
        if (passTurnBtn) {
            passTurnBtn.addEventListener('click', () => {
                this.handleEndTurn();
            });
        }
        
        // Подписываемся на события TurnService для обновления UI
        try {
            const app = window.app;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            if (turnService && typeof turnService.on === 'function') {
                turnService.on('roll:start', () => {
                    this._showRollingAnimation();
                });
                turnService.on('roll:success', (response) => {
                    const serverValue = response && (response.serverValue ?? response.diceResult?.value);
                    const localValue = response && response.localRoll && (response.localRoll.value || response.localRoll.total);
                    const value = serverValue ?? localValue ?? null;
                    if (value != null) this.updateDiceResult(value);
                });
                turnService.on('roll:finish', () => {
                    this._hideRollingAnimation();
                });
            }
        } catch (e) {
            console.warn('⚠️ PlayersPanel: Не удалось подписаться на события TurnService', e);
        }
    }

    // Псевдо-анимация броска в текстовом поле "Кубик:"
    _showRollingAnimation() {
        const el = document.getElementById('dice-result');
        if (!el) return;
        
        // Добавляем класс для анимации
        el.classList.add('rolling');
        
        const seq = ['⚀','⚁','⚂','⚃','⚄','⚅'];
        let i = 0;
        this._rollingTimer && clearInterval(this._rollingTimer);
        this._rollingTimer = setInterval(() => {
            el.textContent = seq[i % seq.length];
            i++;
        }, 90);
    }
    
    _hideRollingAnimation() {
        if (this._rollingTimer) {
            clearInterval(this._rollingTimer);
            this._rollingTimer = null;
        }
        
        // Убираем класс анимации
        const el = document.getElementById('dice-result');
        if (el) {
            el.classList.remove('rolling');
        }
    }
    
    /**
     * Уничтожение компонента
     */
    destroy() {
        console.log('👥 PlayersPanel v2.0: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
window.PlayersPanel = PlayersPanel;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayersPanel;
}
