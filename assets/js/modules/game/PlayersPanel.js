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
        
        console.log('✅ PlayersPanel: Инициализирован');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (this.eventBus) {
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
                <div class="panel-header">
                    <h3>👥 Игроки в комнате</h3>
                    <div class="players-count" id="players-count">0/4</div>
                </div>
                
                <div class="players-list" id="players-list">
                    <div class="no-players-message">
                        <p>Нет игроков</p>
                        <p>Ожидание подключения</p>
                    </div>
                </div>
                
                <div class="game-controls">
                    <div class="dice-controls">
                        <button class="btn btn-primary" id="roll-dice" disabled>
                            🎲 Бросить кубик
                        </button>
                        <button class="btn btn-secondary" id="pass-turn" disabled>
                            ➡️ Передать ход
                        </button>
                    </div>
                    
                    <div class="turn-info">
                        <div class="turn-item">
                            <span class="label">Ход:</span>
                            <span class="value" id="current-turn">Ожидание</span>
                        </div>
                        <div class="turn-item">
                            <span class="label">Кубик:</span>
                            <span class="value" id="dice-result">-</span>
                        </div>
                    </div>
                    
                    <div class="turn-history">
                        <h4>Ход 1</h4>
                        <div class="player-info">
                            <span class="label">Игрок:</span>
                            <span class="value" id="current-player">Загрузка...</span>
                        </div>
                    </div>
                    
                    <button class="btn btn-secondary" id="view-stats">
                        📊 Просмотр статистики
                    </button>
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
                background: rgba(255, 255, 255, 0.05);
                border-radius: 1rem;
                padding: 1.5rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                color: #ffffff;
                max-width: 350px;
                width: 100%;
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .panel-header h3 {
                margin: 0;
                font-size: 1.2rem;
                color: #ffffff;
            }
            
            .players-count {
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
                padding: 0.25rem 0.75rem;
                border-radius: 0.5rem;
                font-weight: 600;
                font-size: 0.9rem;
            }
            
            .players-list {
                margin-bottom: 1.5rem;
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
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 0.5rem;
                transition: all 0.3s ease;
            }
            
            .player-item:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            .player-item.active {
                background: rgba(59, 130, 246, 0.1);
                border-color: #3b82f6;
            }
            
            .player-avatar {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
                border: 2px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
            }
            
            .player-item:hover .player-avatar {
                border-color: rgba(255, 255, 255, 0.4);
                background: rgba(255, 255, 255, 0.15);
            }
            
            .player-info {
                flex: 1;
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
                color: #10b981;
                font-weight: 600;
                font-size: 0.8rem;
            }
            
            .game-controls {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .dice-controls {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .dice-controls .btn {
                flex: 1;
                min-width: 120px;
            }
            
            .turn-info {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                padding: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
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
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                padding: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
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
                padding: 0.75rem 1rem;
                border: none;
                border-radius: 0.75rem;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
            }
            
            .btn-primary:hover:not(:disabled) {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            
            .btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.3);
            }
            
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
                box-shadow: none !important;
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
        
        // Обновляем счетчик
        playersCount.textContent = `${players.length}/4`;
        
        // Получаем текущего активного игрока
        const activePlayer = this.getCurrentActivePlayer(players);
        
        if (players.length === 0) {
            playersList.innerHTML = `
                <div class="no-players-message">
                    <p>Нет игроков</p>
                    <p>Ожидание подключения</p>
                </div>
            `;
        } else {
            playersList.innerHTML = players.map((player, index) => {
                const isActive = activePlayer && activePlayer.id === player.id;
                const statusText = this.getPlayerStatusText(player, isActive, index);
                
                return `
                    <div class="player-item ${isActive ? 'active' : ''}" data-player-id="${player.id}">
                        <div class="player-avatar">${this.getTokenIcon(player.token)}</div>
                        <div class="player-info">
                            <p class="player-name">${player.username || `Игрок ${index + 1}`}</p>
                            <p class="player-status">${statusText}</p>
                        </div>
                        <div class="player-money">$${player.money || 0}</div>
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
}

window.PlayersPanel = PlayersPanel;
