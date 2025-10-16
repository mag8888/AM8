/**
 * TurnController v2.0.0 - Рефакторенная версия
 * UI контроллер для управления ходами игроков
 * Использует GameStateManager и PlayerList для унификации
 */

class TurnController {
    constructor(turnService, playerTokenRenderer, gameStateManager) {
        this.turnService = turnService;
        this.playerTokenRenderer = playerTokenRenderer;
        this.gameStateManager = gameStateManager;
        this.ui = null;
        this.isRolling = false;
        this.isMoving = false;
        this.isMobile = window.innerWidth <= 768;
        
        // Создаем PlayerList для отображения игроков
        this.playerList = null;
        
        console.log('🎮 TurnController v2.0: Инициализация, isMobile:', this.isMobile, 'window.innerWidth:', window.innerWidth);
        this.init();
        console.log('🎮 TurnController v2.0: Инициализирован');
    }
    
    /**
     * Инициализация контроллера
     */
    init() {
        this.createUI();
        this.setupEventListeners();
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
        this.playerList = new PlayerList('turn-controller-players', {
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
    }
    
    /**
     * Создание UI элементов
     */
    createUI() {
        console.log('🎮 TurnController v2.0: Создание UI, isMobile:', this.isMobile);
        
        // Создаем контейнер для меню ходов
        const turnMenu = document.createElement('div');
        turnMenu.className = 'turn-menu';
        turnMenu.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 1rem;
            width: 100%;
            max-width: 600px;
        `;
        
        turnMenu.innerHTML = `
            <!-- Кнопка броска кубика в верхней части -->
            <div class="dice-roll-section">
                <button id="roll-dice-btn" class="action-btn btn-dice">
                    <span class="btn-icon">🎲</span>
                    <span class="btn-text">Бросить кубик</span>
                </button>
            </div>
            
            <!-- Карточки в горизонтальном расположении -->
            <div class="cards-container">
                <!-- ИГРОВЫЕ ОПЕРАЦИИ -->
                <div class="game-operations-card">
                    <div class="game-overview">
                        <div class="overview-row">
                            <span>Ход:</span>
                            <span class="turn-info">Ожидание...</span>
                        </div>
                        <div class="overview-row">
                            <span>Кубик:</span>
                            <span class="dice-info" style="color: #10b981;">⚀</span>
                        </div>
                    </div>
                    
                    <div class="players-section">
                        <div class="players-header">
                            <h3>👥 Игроки в комнате</h3>
                            <div class="players-count">2/4</div>
                        </div>
                        <div class="players-list" id="turn-controller-players">
                            <!-- Список игроков будет генерироваться динамически -->
                            <div class="player-item active">
                                <div class="player-avatar">🎯</div>
                                <div class="player-details">
                                    <div class="player-name">Загрузка...</div>
                                    <div class="player-status">Активен</div>
                                    <div class="player-balance">$0</div>
                                </div>
                                <div class="player-turn-indicator">🎲</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <div id="dice-result" class="dice-result" style="display: none;">
                            <div class="dice-value">⚀</div>
                            <div class="dice-text">Выпало: <span class="dice-number">1</span></div>
                        </div>
                        
                        <div id="move-actions" class="move-actions" style="display: none;">
                            <div class="move-title">Выберите количество шагов:</div>
                            <div class="move-buttons">
                                <button class="move-btn" data-steps="1">1</button>
                                <button class="move-btn" data-steps="2">2</button>
                                <button class="move-btn" data-steps="3">3</button>
                                <button class="move-btn" data-steps="4">4</button>
                                <button class="move-btn" data-steps="5">5</button>
                                <button class="move-btn" data-steps="6">6</button>
                            </div>
                        </div>
                        
                        <button id="end-turn-btn" class="action-btn btn-end" style="display: none;">
                            <span class="btn-icon">➡️</span>
                            <span class="btn-text">Завершить ход</span>
                        </button>
                    </div>
                </div>
                
                <!-- СТАТУС ИГРЫ -->
                <div class="game-status-card">
                    <div class="status-display">
                        <div class="status-main">
                            <div class="status-value">Ход 1</div>
                            <div class="status-subtitle">Игрок: <span class="current-player">Загрузка...</span></div>
                        </div>
                    </div>
                    
                    <div class="status-actions">
                        <div class="status-item">
                            <span class="status-icon">📊</span>
                            <span class="status-text">Просмотр статистики</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем стили для темного дизайна в стиле банковских операций
        const style = document.createElement('style');
        style.textContent = `
            /* Секция броска кубика */
            .dice-roll-section {
                width: 100%;
                display: flex;
                justify-content: center;
                margin-bottom: 1rem;
            }

            /* Контейнер для карточек */
            .cards-container {
                display: flex;
                flex-direction: row;
                gap: 1rem;
                width: 100%;
            }

            /* Карточки меню */
            .game-operations-card, .game-status-card {
                background: rgba(20, 20, 35, 0.95);
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 12px;
                padding: 1.5rem;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                flex: 1;
                min-width: 280px;
            }
            
            /* Заголовки карточек */
            .card-header h3 {
                margin: 0 0 1rem 0;
                color: #ffffff;
                font-size: 1rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            /* Обзор игры */
            .game-overview {
                margin-bottom: 1rem;
            }
            
            .overview-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }
            
            .overview-row span:first-child {
                color: #d1d5db;
            }

            /* Бейдж хода */
            .turn-info {
                padding: 0.25rem 0.6rem;
                border-radius: 999px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.12);
                color: #e5e7eb;
                font-weight: 700;
                letter-spacing: 0.2px;
            }
            .turn-info.my-turn {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                border-color: rgba(34,197,94,0.6);
                color: #0b1b10;
                box-shadow: 0 0 0 2px rgba(34,197,94,0.25), 0 8px 20px rgba(34,197,94,0.35);
            }

            /* Подсветка кнопки броска на своём ходу */
            .btn-dice.my-turn {
                box-shadow: 0 0 0 2px rgba(34,197,94,0.35), 0 10px 22px rgba(34,197,94,0.45);
                animation: breathe 1.8s ease-in-out infinite;
            }
            @keyframes breathe {
                0%,100% { transform: translateY(0); filter: brightness(1); }
                50% { transform: translateY(-1px); filter: brightness(1.08); }
            }
            
            /* Секция игроков */
            .players-section {
                margin-bottom: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(34, 197, 94, 0.3);
                overflow: hidden;
            }
            
            .players-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: rgba(34, 197, 94, 0.1);
                border-bottom: 1px solid rgba(34, 197, 94, 0.2);
            }
            
            .players-header h3 {
                margin: 0;
                font-size: 0.9rem;
                font-weight: 600;
                color: #22c55e;
            }
            
            .players-count {
                font-size: 0.8rem;
                color: #d1d5db;
                background: rgba(255, 255, 255, 0.1);
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
            }
            
            .players-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .player-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                transition: all 0.2s ease;
            }
            
            .player-item:last-child {
                border-bottom: none;
            }
            
            .player-item.active {
                background: rgba(34, 197, 94, 0.1);
                border-left: 3px solid #22c55e;
            }
            
            .player-item.waiting {
                opacity: 0.7;
            }
            
            .player-display {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .player-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            }
            
            .player-details {
                flex: 1;
            }
            
            .player-name {
                color: #ffffff;
                font-weight: 600;
                font-size: 0.95rem;
            }
            
            .player-status {
                color: #10b981;
                font-size: 0.8rem;
                margin-top: 0.25rem;
            }
            
            .player-balance {
                color: #fbbf24;
                font-size: 0.9rem;
                font-weight: 700;
                margin-top: 0.25rem;
            }
            
            .player-turn-indicator {
                font-size: 1.2rem;
                opacity: 0.6;
                transition: all 0.2s ease;
            }
            
            .player-item.active .player-turn-indicator {
                opacity: 1;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            /* Кнопки действий */
            .action-buttons {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .action-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
            }
            
            .btn-dice {
                background: linear-gradient(135deg, #10b981, #059669);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            
            .btn-dice:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
            }
            
            .btn-end {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }
            
            .btn-end:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
            }
            
            .action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .btn-icon {
                font-size: 1.1rem;
            }
            
            /* Результат броска */
            .dice-result {
                text-align: center;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            
            .dice-value {
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
            }
            
            .dice-text {
                color: #d1d5db;
                font-size: 0.9rem;
            }
            
            /* Действия перемещения */
            .move-actions {
                margin-top: 0.5rem;
            }
            
            .move-title {
                color: #d1d5db;
                font-size: 0.9rem;
                margin-bottom: 0.75rem;
                text-align: center;
            }
            
            .move-buttons {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.5rem;
            }
            
            .move-btn {
                padding: 0.5rem;
                border: none;
                border-radius: 6px;
                background: rgba(107, 114, 128, 0.8);
                color: white;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
            }
            
            .move-btn:hover {
                background: rgba(75, 85, 99, 0.9);
                transform: scale(1.05);
            }
            
            .move-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            /* Статус игры */
            .status-display {
                margin-bottom: 1rem;
            }
            
            .status-main {
                text-align: center;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            }
            
            .status-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 0.5rem;
            }
            
            .status-subtitle {
                color: #d1d5db;
                font-size: 0.9rem;
            }
            
            .status-actions {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .status-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .status-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .status-icon {
                font-size: 1.1rem;
            }
            
            .status-text {
                color: #d1d5db;
                font-size: 0.9rem;
            }
            
            /* Анимации */
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .rolling {
                animation: pulse 1s infinite;
            }
            
            /* На больших экранах - вертикальное расположение */
            @media (min-width: 1200px) {
                .turn-menu {
                    flex-direction: column;
                    max-width: 350px;
                }
                
                .cards-container {
                    flex-direction: column;
                }
                
                .game-operations-card, .game-status-card {
                    min-width: auto;
                    width: 100%;
                }
            }

            /* Мобильная адаптация */
            @media (max-width: 768px) {
                .turn-menu {
                    flex-direction: column;
                    max-width: 100%;
                }
                
                .cards-container {
                    flex-direction: column;
                }
                
                .game-operations-card, .game-status-card {
                    min-width: auto;
                    width: 100%;
                }
                
                .game-operations-card, .game-status-card {
                    padding: 1rem;
                }
                
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Добавляем в DOM
        const controlPanel = document.getElementById('players-panel');
        if (controlPanel) {
            controlPanel.appendChild(turnMenu);
            this.ui = turnMenu;
        } else {
            console.error('❌ TurnController: Контейнер players-panel не найден');
            document.body.appendChild(turnMenu);
            this.ui = turnMenu;
        }
        
        console.log('🎮 TurnController v2.0: UI создан и добавлен в DOM');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Бросок кубика
        const rollBtn = this.ui.querySelector('#roll-dice-btn');
        rollBtn.addEventListener('click', () => this.handleRollDice());
        
        // Кнопки перемещения
        const moveBtns = this.ui.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const steps = parseInt(btn.dataset.steps);
                this.handleMove(steps);
            });
        });
        
        // Завершение хода
        const endTurnBtn = this.ui.querySelector('#end-turn-btn');
        endTurnBtn.addEventListener('click', () => this.handleEndTurn());
        
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
    }
    
    /**
     * Обновление от GameStateManager
     * @param {Object} state - Состояние игры
     */
    updateFromGameState(state) {
        if (!this.playerList) return;
        
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
     * Обновление информации о ходе
     * @param {Object} state - Состояние игры
     */
    updateTurnInfo(state) {
        const turnInfo = this.ui.querySelector('.turn-info');
        if (turnInfo) {
            const currentUserId = this.getCurrentUserId();
            const currentUsername = this.getCurrentUsername();
            const isMyTurn = state.activePlayer && (
                state.activePlayer.id === currentUserId ||
                (state.activePlayer.username && currentUsername && state.activePlayer.username === currentUsername)
            );
            const playerToken = this.getPlayerToken(state.activePlayer);
            if (isMyTurn) {
                turnInfo.innerHTML = `${playerToken} Ваш ход`;
                turnInfo.classList.add('my-turn');
                const rollBtn = this.ui.querySelector('.btn-dice');
                if (rollBtn) rollBtn.classList.add('my-turn');
            } else if (state.activePlayer) {
                turnInfo.innerHTML = `${playerToken} Ход ${PlayerStatusUtils.getPlayerDisplayName(state.activePlayer)}`;
                turnInfo.classList.remove('my-turn');
                const rollBtn = this.ui.querySelector('.btn-dice');
                if (rollBtn) rollBtn.classList.remove('my-turn');
            } else {
                turnInfo.innerHTML = 'Ожидание';
                turnInfo.classList.remove('my-turn');
                const rollBtn = this.ui.querySelector('.btn-dice');
                if (rollBtn) rollBtn.classList.remove('my-turn');
            }
        }
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
            rollBtn.disabled = !state.canRoll || this.isRolling;
        }
        
        if (endTurnBtn) {
            endTurnBtn.disabled = !state.canEndTurn;
        }
        
        // Обновляем кнопки перемещения
        const moveBtns = this.ui.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => {
            btn.disabled = !state.canMove || this.isMoving;
        });
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     */
    getCurrentUserId() {
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
        if (this.isRolling) return;
        console.log('🎲 TurnController: click roll, canRoll =', this.turnService ? this.turnService.canRoll() : 'n/a');
        try {
            await this.turnService.roll({ diceChoice: 'single' });
        } catch (error) {
            console.error('❌ TurnController: Ошибка броска кубика:', error);
        }
    }
    
    /**
     * Обработка перемещения
     */
    async handleMove(steps) {
        if (this.isMoving || !this.turnService.canMove()) return;
        
        try {
            await this.turnService.move(steps);
        } catch (error) {
            console.error('❌ TurnController: Ошибка перемещения:', error);
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
        const diceResultEl = this.ui.querySelector('#dice-result');
        const diceValueEl = this.ui.querySelector('.dice-value');
        const diceNumberEl = this.ui.querySelector('.dice-number');
        const moveActions = this.ui.querySelector('#move-actions');

        // Универсально достаём значение броска: сервер или локальный
        const serverValue = response && response.diceResult && response.diceResult.value;
        const localValue = response && response.localRoll && (response.localRoll.value || response.localRoll.total);
        const value = serverValue ?? localValue ?? null;

        // Показываем результат броска (если значение неизвестно — ставим ?)
        diceResultEl.style.display = 'block';
        const valueEmoji = this.getDiceEmoji(Math.max(1, Math.min(6, Number(value) || 1)));
        diceValueEl.textContent = valueEmoji;
        diceNumberEl.textContent = value != null ? String(value) : '?';
        
        // Показываем кнопки перемещения
        moveActions.style.display = 'block';
        
        this.updateStatus(`Выпало: ${value != null ? value : '?'}`);
    }
    
    onRollError(error) {
        console.error('❌ TurnController: Ошибка броска кубика:', error);
        this.updateStatus('Ошибка броска кубика');
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
        endTurnBtn.style.display = 'block';
        
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
        endTurnBtn.style.display = 'none';
        
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
        const playerStatus = this.ui.querySelector('.player-status');
        if (playerStatus) {
            playerStatus.textContent = message;
        }
        
        // Обновляем статус в обзоре игры
        const turnInfo = this.ui.querySelector('.turn-info');
        if (turnInfo) {
            turnInfo.textContent = message;
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
