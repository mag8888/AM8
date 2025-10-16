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
        this.initializePlayerList();
        this.renderCurrentPlayerInfo();
        
        console.log('✅ PlayersPanel v2.0: Инициализирован');
    }
    
    /**
     * Инициализация PlayerList
     */
    initializePlayerList() {
        if (!this.gameStateManager) {
            console.warn('⚠️ PlayersPanel: GameStateManager не найден');
            return;
        }
        
        // Создаем PlayerList с настройками для боковой панели
        this.playerList = new PlayerList('players-list', {
            showBalance: true,
            showStatus: true,
            showToken: true,
            showOrder: false,
            showCurrentUser: false, // Текущий пользователь отображается отдельно
            filterCurrentUser: true, // Исключаем текущего пользователя из списка
            sortBy: 'status'
        });
        
        // Подписываемся на обновления GameStateManager
        this.gameStateManager.on('state:updated', (state) => {
            this.updateFromGameState(state);
        });
        
        this.gameStateManager.on('turn:changed', (data) => {
            this.handleTurnChanged(data);
        });
        
        this.gameStateManager.on('players:updated', (data) => {
            this.handlePlayersUpdated(data);
        });
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
        
        console.log('✅ PlayersPanel v2.0: Отрендерен');
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
        
        // Обновляем информацию об активном игроке
        this.updateActivePlayerInfo(state.activePlayer);
        
        // Обновляем кнопки управления
        this.updateControlButtons(state);
    }
    
    /**
     * Обработка смены хода
     * @param {Object} data - Данные смены хода
     */
    handleTurnChanged(data) {
        console.log('🔄 PlayersPanel: Смена хода', data);
        
        // Подсвечиваем активного игрока
        if (this.playerList && data.activePlayer) {
            this.playerList.highlightActivePlayer(data.activePlayer.id);
        }
        
        // Обновляем информацию об активном игроке
        this.updateActivePlayerInfo(data.activePlayer);
    }
    
    /**
     * Обработка обновления игроков
     * @param {Object} data - Данные обновления игроков
     */
    handlePlayersUpdated(data) {
        console.log('👥 PlayersPanel: Игроки обновлены', data);
        
        // Обновляем счетчик игроков
        if (data.players) {
            this.updatePlayersCount(data.players.length);
        }
    }
    
    /**
     * Обновление счетчика игроков
     * @param {number} count - Количество игроков
     */
    updatePlayersCount(count) {
        const playersCount = document.getElementById('players-count');
        if (playersCount) {
            playersCount.textContent = `${count}/4`;
        }
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
     * Обновление кнопок управления
     * @param {Object} state - Состояние игры
     */
    updateControlButtons(state) {
        const rollBtn = document.getElementById('roll-dice');
        const passBtn = document.getElementById('pass-turn');
        
        if (rollBtn) {
            rollBtn.disabled = !state.canRoll;
        }
        
        if (passBtn) {
            passBtn.disabled = !state.canEndTurn;
        }
    }
    
    /**
     * Получение ID текущего пользователя
     * @returns {string|null} ID пользователя
     */
    getCurrentUserId() {
        if (this.currentUser) {
            return this.currentUser.id || this.currentUser.userId || this.currentUser.username;
        }
        
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                this.currentUser = bundle.currentUser;
                return this.currentUser?.id || this.currentUser?.userId || this.currentUser?.username;
            }
            
            // Fallback к localStorage
            const userRaw = localStorage.getItem('aura_money_user');
            if (userRaw) {
                this.currentUser = JSON.parse(userRaw);
                return this.currentUser?.id || this.currentUser?.userId || this.currentUser?.username;
            }
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка получения ID пользователя:', error);
        }
        
        return null;
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
            const currentUser = this.getCurrentUserFromStorage();
            
            if (currentUser) {
                const tokenEmoji = PlayerStatusUtils.getPlayerToken(currentUser);
                const avatarHtml = tokenEmoji; // Всегда используем эмодзи токен
                
                currentPlayerInfoContainer.innerHTML = `
                    <div class="current-user-card">
                        <div class="user-avatar">${avatarHtml}</div>
                        <div class="user-details">
                            <span class="user-name">${PlayerStatusUtils.getPlayerDisplayName(currentUser)}</span>
                            <span class="user-status">В игре</span>
                        </div>
                    </div>
                `;
                
                this.currentUser = currentUser;
                console.log('✅ PlayersPanel: Информация о текущем пользователе отрисована:', currentUser.username);
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
    
    /**
     * Получение текущего пользователя из хранилища
     * @returns {Object|null} Данные пользователя
     */
    getCurrentUserFromStorage() {
        try {
            // Пытаемся получить из sessionStorage
            const bundleRaw = sessionStorage.getItem('am_player_bundle');
            if (bundleRaw) {
                const bundle = JSON.parse(bundleRaw);
                return bundle?.currentUser || null;
            }
            
            // Fallback к localStorage
            const storedUser = localStorage.getItem('aura_money_user');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
        } catch (error) {
            console.error('❌ PlayersPanel: Ошибка получения пользователя из хранилища:', error);
        }
        
        return null;
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
            
            .panel-header {
                grid-area: header;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 1rem;
                border-bottom: 2px solid rgba(99, 102, 241, 0.2);
                position: relative;
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
            
            .no-players-message {
                text-align: center;
                color: #a0a0a0;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
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
            
            .player-item.active .player-avatar {
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
                flex-direction: row;
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
     * Бросок кубика
     */
    rollDice() {
        // Эмитим событие для TurnService
        if (this.eventBus) {
            this.eventBus.emit('dice:roll', {});
        }
    }

    /**
     * Передача хода
     */
    passTurn() {
        // Эмитим событие для TurnService
        if (this.eventBus) {
            this.eventBus.emit('turn:pass', {});
        }
    }
    
    /**
     * Показать статистику
     */
    showStats() {
        console.log('📊 PlayersPanel: Показ статистики');
        // Здесь можно добавить логику показа статистики
    }

    /**
     * Уничтожение компонента
     */
    destroy() {
        if (this.playerList) {
            this.playerList.destroy();
        }
        
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
