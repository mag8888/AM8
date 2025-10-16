/**
 * PlayersPanel v1.0.0
 * Компонент для отображения списка игроков в боковой панели
 */

class PlayersPanel {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.containerId = config.containerId || 'game-control-panel';
        
        console.log('👥 PlayersPanel: Инициализация');
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
        // Первичная отрисовка текущего пользователя и списка игроков
        this.renderCurrentPlayerInfo();
        try {
            const initialPlayers = (this.gameState && Array.isArray(this.gameState.players)) ? this.gameState.players : [];
            if (initialPlayers.length) {
                this.updatePlayers(initialPlayers);
            }
        } catch(_) {}
        
        console.log('✅ PlayersPanel: Инициализирован');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('game:started', (data) => {
                if (data && Array.isArray(data.players)) {
                    this.updatePlayers(data.players);
                }
                this.renderCurrentPlayerInfo();
            });
            this.eventBus.on('game:playersUpdated', (data) => {
                this.updatePlayers(data.players);
            });
            
            this.eventBus.on('game:activePlayerChanged', (data) => {
                this.updateActivePlayer(data.activePlayer);
            });
            
            this.eventBus.on('game:turnChanged', (data) => {
                this.updateAllPlayerStatuses();
            });
            
            this.eventBus.on('game:stateUpdated', (data) => {
                this.updateAllPlayerStatuses();
            });
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
                    <header class="panel-header">
                        <h3>👥 Игроки в комнате</h3>
                        <div class="players-count" id="players-count">0/4</div>
                    </header>
                    
                    <section id="current-user-profile" class="current-user-profile">
                        <!-- Информация о текущем пользователе будет здесь -->
                    </section>
                    
                    <main class="players-list" id="players-list">
                        <div class="no-players-message">
                            <p>Нет игроков</p>
                            <p>Ожидание подключения</p>
                        </div>
                    </main>
                    
                    <section class="game-controls">
                        <div class="dice-controls">
                            <button class="btn btn-primary" id="roll-dice" disabled>
                                <span class="btn-icon">🎲</span>
                                <span class="btn-text">Бросить кубик</span>
                            </button>
                            <button class="btn btn-secondary" id="pass-turn" disabled>
                                <span class="btn-icon">➡️</span>
                                <span class="btn-text">Передать ход</span>
                            </button>
                        </div>
                        
                        <div class="turn-history">
                            <h4>📊 Игровая статистика</h4>
                            <div class="player-info">
                                <span class="label">Активный игрок:</span>
                                <span class="value" id="current-player">Загрузка...</span>
                            </div>
                        </div>
                        
                        <button class="btn btn-secondary" id="view-stats">
                            <span class="btn-icon">📈</span>
                            <span class="btn-text">Подробная статистика</span>
                        </button>
                    </section>
                </div>
            </div>
        `;
        
        // Добавляем стили
        this.addStyles();
        
        // Настраиваем обработчики
        this.setupControls();
        
        console.log('✅ PlayersPanel: Отрендерен');
    }
    
    /**
     * Добавление стилей
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
                display: grid;
                grid-template-columns: 1fr;
                grid-template-rows: auto auto 1fr auto;
                grid-template-areas: 
                    "header"
                    "current-user"
                    "players"
                    "controls";
                gap: 1.5rem;
                height: 100%;
            }
            
            .players-panel::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
            }
            
            .panel-header {
                grid-area: header;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 1rem;
                border-bottom: 2px solid rgba(99, 102, 241, 0.2);
                position: relative;
            }
            
            .panel-header::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                width: 50px;
                height: 2px;
                background: linear-gradient(90deg, #6366f1, #8b5cf6);
                border-radius: 1px;
            }
            
            .panel-header h3 {
                margin: 0;
                font-size: 1.3rem;
                color: #ffffff;
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .players-count {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
                color: #ffffff;
                padding: 0.4rem 1rem;
                border-radius: 1rem;
                font-weight: 700;
                font-size: 0.9rem;
                border: 1px solid rgba(99, 102, 241, 0.4);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
                backdrop-filter: blur(10px);
            }
            
            .current-user-profile {
                grid-area: current-user;
                padding: 0;
            }

            .current-user-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
                border-radius: 1rem;
                padding: 1rem 1.25rem;
                border: 2px solid rgba(99, 102, 241, 0.3);
                box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2);
                backdrop-filter: blur(10px);
                position: relative;
                overflow: hidden;
            }
            
            .current-user-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
            }

            .current-user-card .user-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: var(--accent-primary);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                font-weight: bold;
            }

            .current-user-card .user-details {
                display: flex;
                flex-direction: column;
            }

            .current-user-card .user-name {
                font-size: 1.1rem;
                font-weight: 600;
                color: white;
            }

            .current-user-card .user-status {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.7);
            }

            .players-list {
                grid-area: players;
                overflow-y: auto;
                max-height: 300px;
                padding-right: 0.5rem;
            }
            
            .players-list::-webkit-scrollbar {
                width: 6px;
            }
            
            .players-list::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }
            
            .players-list::-webkit-scrollbar-thumb {
                background: rgba(99, 102, 241, 0.5);
                border-radius: 3px;
            }
            
            .players-list::-webkit-scrollbar-thumb:hover {
                background: rgba(99, 102, 241, 0.7);
            }
            
            .no-players-message {
                text-align: center;
                color: #a0a0a0;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .no-players-message p {
                margin: 0.25rem 0;
                font-size: 0.9rem;
            }
            
            .player-item {
                display: grid;
                grid-template-columns: auto 1fr auto;
                grid-template-areas: "avatar info money";
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
                border-radius: 1rem;
                border: 2px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 0.75rem;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(10px);
                min-height: 80px;
            }
            
            .player-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transition: left 0.5s ease;
            }
            
            .player-item:hover::before {
                left: 100%;
            }
            
            .player-item:hover {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
                border-color: rgba(99, 102, 241, 0.4);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }
            
            .player-item.active {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2));
                border-color: #6366f1;
                box-shadow: 
                    0 0 25px rgba(99, 102, 241, 0.4),
                    0 0 50px rgba(99, 102, 241, 0.2);
                transform: scale(1.02);
                animation: activePlayerPulse 2s ease-in-out infinite;
            }
            
            @keyframes activePlayerPulse {
                0%, 100% {
                    box-shadow: 
                        0 0 25px rgba(99, 102, 241, 0.4),
                        0 0 50px rgba(99, 102, 241, 0.2);
                }
                50% {
                    box-shadow: 
                        0 0 35px rgba(99, 102, 241, 0.6),
                        0 0 70px rgba(99, 102, 241, 0.3);
                }
            }
            
            .active-avatar {
                animation: avatarGlow 2s ease-in-out infinite;
            }
            
            @keyframes avatarGlow {
                0%, 100% {
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }
                50% {
                    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
                }
            }
            
            .player-avatar {
                grid-area: avatar;
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.6rem;
                border: 3px solid rgba(99, 102, 241, 0.4);
                transition: all 0.4s ease;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
                position: relative;
                z-index: 2;
            }
            
            .player-item:hover .player-avatar {
                border-color: rgba(255, 255, 255, 0.6);
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(139, 92, 246, 0.5));
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            }
            
            .player-info {
                grid-area: info;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .player-name {
                color: #ffffff;
                font-weight: 600;
                font-size: 0.9rem;
                margin: 0;
            }
            
            .player-status {
                color: #a0a0a0;
                font-size: 0.8rem;
                margin: 0;
            }
            
            .player-money {
                grid-area: money;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
                padding: 0.5rem 0.75rem;
                border-radius: 0.75rem;
                border: 1px solid rgba(16, 185, 129, 0.3);
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
                white-space: nowrap;
            }
            
            .money-icon {
                font-size: 1rem;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            }
            
            .money-amount {
                color: #10b981;
                font-weight: 700;
                font-size: 0.9rem;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .game-controls {
                grid-area: controls;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .dice-controls {
                display: flex;
                gap: 1rem;
                flex-direction: row; /* Горизонтальное расположение */
                margin-bottom: 1.5rem;
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
            
            .turn-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .turn-item:last-child {
                margin-bottom: 0;
            }
            
            .turn-item .label {
                color: #a0a0a0;
                font-size: 0.9rem;
            }
            
            .turn-item .value {
                color: #ffffff;
                font-weight: 600;
                font-size: 0.9rem;
            }
            
            .turn-history {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.05));
                border-radius: 1rem;
                padding: 1.5rem;
                border: 2px solid rgba(99, 102, 241, 0.2);
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }
            
            .turn-history h4 {
                margin: 0 0 0.5rem 0;
                color: #ffffff;
                font-size: 1rem;
            }
            
            .player-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .player-info .label {
                color: #a0a0a0;
                font-size: 0.9rem;
            }
            
            .player-info .value {
                color: #ffffff;
                font-weight: 600;
                font-size: 0.9rem;
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
            
            .btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.6s ease;
            }
            
            .btn:hover::before {
                left: 100%;
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
            
            /* Мобильная адаптация */
            @media (max-width: 768px) {
                .players-panel {
                    padding: 1.5rem;
                    max-width: 100%;
                    margin: 0 0.5rem;
                }
                
                .panel-header h3 {
                    font-size: 1.1rem;
                }
                
                .player-avatar {
                    width: 40px;
                    height: 40px;
                    font-size: 1.4rem;
                }
                
                .btn {
                    padding: 0.8rem 1.2rem;
                    font-size: 0.9rem;
                }
                
                .dice-controls {
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .dice-controls .btn {
                    width: 100%;
                    min-width: auto;
                    padding: 0.8rem 1rem;
                }
                
                .player-money {
                    padding: 0.4rem 0.6rem;
                    gap: 0.4rem;
                }
                
                .money-amount {
                    font-size: 0.8rem;
                }
            }
            
            @media (max-width: 480px) {
                .players-panel {
                    padding: 1rem;
                    margin: 0 0.25rem;
                }
                
                .player-item {
                    padding: 0.75rem;
                    gap: 0.75rem;
                }
                
                .player-avatar {
                    width: 35px;
                    height: 35px;
                    font-size: 1.2rem;
                }
                
                .btn {
                    padding: 0.7rem 1rem;
                    font-size: 0.85rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Настройка элементов управления
     */
    setupControls() {
        const rollDiceBtn = document.getElementById('roll-dice');
        if (rollDiceBtn) {
            rollDiceBtn.addEventListener('click', () => {
                this.rollDice();
            });
        }

        const passTurnBtn = document.getElementById('pass-turn');
        if (passTurnBtn) {
            passTurnBtn.addEventListener('click', () => {
                this.passTurn();
            });
        }
        
        const viewStatsBtn = document.getElementById('view-stats');
        if (viewStatsBtn) {
            viewStatsBtn.addEventListener('click', () => {
                this.showStats();
            });
        }
    }
    
    /**
     * Обновление списка игроков
     */
    updatePlayers(players) {
        const playersList = document.getElementById('players-list');
        const playersCount = document.getElementById('players-count');
        
        if (!playersList || !playersCount) return;
        // Обновляем счетчик (всех игроков в комнате)
        playersCount.textContent = `${players.length}/4`;

        // Определяем текущего пользователя, чтобы не дублировать его в списке
        const me = this.getCurrentUserFromStorage();

        // Список для отрисовки: только другие игроки
        const others = Array.isArray(players)
            ? players.filter(p => {
                if (!me) return true;
                return (p.id && p.id !== me.id) && (p.username && p.username !== me.username);
            })
            : [];

        // Получаем текущего активного игрока
        // Активный игрок определяется по GameState (который установлен детерминированно)
        const activePlayer = this.getCurrentActivePlayer(players);

        if (others.length === 0) {
            playersList.innerHTML = `
                <div class="no-players-message">
                    <p>Ждём других игроков</p>
                    <p>Пригласите друзей или дождитесь подключения</p>
                </div>
            `;
        } else {
            playersList.innerHTML = others.map((player, index) => {
                const isActive = activePlayer && activePlayer.id === player.id;
                const statusText = isActive ? '🎯 Ход игрока' : (player.isReady ? '✅ Готов' : '⏳ Готовится');
                
                return `
                    <div class="player-item ${isActive ? 'active' : ''}" data-player-id="${player.id}">
                        <div class="player-avatar ${isActive ? 'active-avatar' : ''}">${this.getTokenIcon(player.token)}</div>
                        <div class="player-info">
                            <p class="player-name">${player.username || `Игрок ${index + 1}`}</p>
                            <p class="player-status">${statusText}</p>
                        </div>
                        <div class="player-money">
                            <span class="money-icon">💰</span>
                            <span class="money-amount">$${player.money || 0}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        console.log('👥 PlayersPanel: Игроки обновлены:', players.length);
    }
    
    /**
     * Обновление активного игрока
     */
    updateActivePlayer(activePlayer) {
        const playerItems = document.querySelectorAll('.player-item');
        const currentPlayer = document.getElementById('current-player');
        const currentTurn = document.getElementById('current-turn');
        
        playerItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.playerId === activePlayer.id) {
                item.classList.add('active');
            }
        });
        
        if (currentPlayer) {
            currentPlayer.textContent = activePlayer.username || 'Неизвестный игрок';
        }
        
        if (currentTurn) {
            currentTurn.textContent = 'Активен';
        }
        
        // Обновляем статусы всех игроков
        this.updateAllPlayerStatuses();
        
        console.log('🎯 PlayersPanel: Активный игрок обновлен:', activePlayer.username);
    }

    /**
     * Получить текущего активного игрока
     */
    getCurrentActivePlayer(players) {
        // Сначала проверяем gameState
        if (this.gameState && this.gameState.gameState && this.gameState.gameState.activePlayer) {
            return this.gameState.gameState.activePlayer;
        }
        
        // Если нет активного игрока в gameState, используем первый игрок
        if (players.length > 0) {
            return players[0];
        }
        
        return null;
    }

    /**
     * Получить текст статуса игрока
     */
    getPlayerStatusText(player, isActive, index) {
        if (isActive) {
            return '🎯 Ваш ход';
        }
        
        // Проверяем, готов ли игрок
        if (!player.isReady) {
            return '⏳ Готовится';
        }
        
        // Если игрок готов, показываем порядок очереди
        const players = this.gameState ? this.gameState.players : [];
        const playerIndex = players.findIndex(p => p.id === player.id);
        
        if (playerIndex >= 0) {
            return `⏭️ Ход ${playerIndex + 1}`;
        }
        
        return '✅ Готов';
    }

    /**
     * Текущий пользователь (из sessionStorage bundle либо localStorage)
     */
    getCurrentUserFromStorage() {
        try {
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                if (bundle && bundle.currentUser) return bundle.currentUser;
            }
        } catch(_) {}
        try {
            const stored = localStorage.getItem('aura_money_user') || localStorage.getItem('currentUser');
            return stored ? JSON.parse(stored) : null;
        } catch(_) { return null; }
    }

    /**
     * Обновить статусы всех игроков
     */
    updateAllPlayerStatuses() {
        if (!this.gameState || !this.gameState.players) return;
        
        const players = this.gameState.players;
        const activePlayer = this.getCurrentActivePlayer(players);
        
        const playerItems = document.querySelectorAll('.player-item');
        playerItems.forEach(item => {
            const playerId = item.dataset.playerId;
            const player = players.find(p => p.id === playerId);
            const statusElement = item.querySelector('.player-status');
            
            if (player && statusElement) {
                const isActive = activePlayer && activePlayer.id === playerId;
                statusElement.textContent = this.getPlayerStatusText(player, isActive, players.indexOf(player));
            }
        });
    }
    
    /**
     * Бросок кубика
     */
    rollDice() {
        if (this.gameState) {
            const roll = this.gameState.rollDice();
            const diceResult = document.getElementById('dice-result');
            if (diceResult) {
                diceResult.textContent = roll;
            }
        }
    }

    /**
     * Передача хода
     */
    passTurn() {
        if (this.gameState) {
            this.gameState.passTurnToNextPlayer();
            console.log('➡️ PlayersPanel: Ход передан следующему игроку');
        }
    }
    
    /**
     * Получить иконку токена
     */
    getTokenIcon(tokenId) {
        const tokenIcons = {
            'lion': '🦁',
            'eagle': '🦅', 
            'fox': '🦊',
            'bear': '🐻',
            'tiger': '🐅',
            'wolf': '🐺',
            'elephant': '🐘',
            'shark': '🦈',
            'owl': '🦉',
            'dolphin': '🐬'
        };
        
        return tokenIcons[tokenId] || '🎯';
    }
    
    /**
     * Показать статистику
     */
    showStats() {
        console.log('📊 PlayersPanel: Показ статистики');
        // Здесь можно добавить логику показа статистики
    }

    /**
     * Отрисовка информации о текущем пользователе
     */
    renderCurrentPlayerInfo() {
        const currentPlayerInfoContainer = document.getElementById('current-user-profile');
        if (!currentPlayerInfoContainer) {
            console.warn('⚠️ PlayersPanel: Контейнер для информации о текущем пользователе не найден.');
            return;
        }

        try {
            // Пытаемся получить PlayerBundle из sessionStorage, чтобы взять фишку и имя
            let bundleUser = null;
            try {
                const bundleRaw = sessionStorage.getItem('am_player_bundle');
                if (bundleRaw) {
                    const bundle = JSON.parse(bundleRaw);
                    bundleUser = bundle?.currentUser || null;
                    // Найдём игрока из игрового состояния для получения token
                    if (!bundleUser?.token && this.gameState && Array.isArray(this.gameState.players)) {
                        const found = this.gameState.players.find(p => p.id === bundleUser?.id || p.username === bundleUser?.username);
                        if (found) {
                            bundleUser.token = found.token;
                        }
                    }
                }
            } catch(_) {}

            // Фолбэк к localStorage
            if (!bundleUser) {
                const storedUser = localStorage.getItem('aura_money_user');
                if (storedUser) bundleUser = JSON.parse(storedUser);
            }

            if (bundleUser) {
                const tokenEmoji = this.getTokenIcon(bundleUser.token);
                const avatarHtml = tokenEmoji !== '🎯' ? tokenEmoji : (bundleUser.username ? bundleUser.username.charAt(0).toUpperCase() : 'U');
                currentPlayerInfoContainer.innerHTML = `
                    <div class="current-user-card">
                        <div class="user-avatar">${avatarHtml}</div>
                        <div class="user-details">
                            <span class="user-name">${bundleUser.username || 'Пользователь'}</span>
                            <span class="user-status">В игре</span>
                        </div>
                    </div>
                `;
                console.log('✅ PlayersPanel: Информация о текущем пользователе отрисована:', bundleUser.username);
            } else {
                currentPlayerInfoContainer.innerHTML = `
                    <div class="current-user-card">
                        <div class="user-avatar">G</div>
                        <div class="user-details">
                            <span class="user-name">Гость</span>
                            <span class="user-status">Не авторизован</span>
                        </div>
                    </div>
                `;
                console.warn('⚠️ PlayersPanel: Текущий пользователь не найден.');
            }
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка отображения информации о пользователе:', error);
            currentPlayerInfoContainer.innerHTML = `
                <div class="current-user-card">
                    <div class="user-avatar">?</div>
                    <div class="user-details">
                        <span class="user-name">Ошибка</span>
                        <span class="user-status">Не удалось загрузить</span>
                    </div>
                </div>
            `;
        }
    }
}

window.PlayersPanel = PlayersPanel;
