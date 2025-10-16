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
        // Инициализируем отображение из текущего состояния игры
        if (this.gameStateManager && typeof this.gameStateManager.getState === 'function') {
            try {
                const state = this.gameStateManager.getState();
                this.updateFromGameState(state || {});
            } catch (_) {}
        }
        
        console.log('✅ PlayersPanel v2.0: Инициализирован');
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

        // Подписываемся на обновления состояния игры
        if (this.gameStateManager && typeof this.gameStateManager.on === 'function') {
            this.gameStateManager.on('state:updated', (state) => {
                this.updateFromGameState(state || {});
            });
            this.gameStateManager.on('turn:changed', (data) => {
                this.handleTurnChanged(data || {});
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
                    <section class="game-controls">
                        <div class="dice-controls">
                            <button class="btn btn-primary" id="roll-dice" disabled>
                                <span class="btn-icon">🎲</span>
                                <span class="btn-text">Бросить кубик</span>
                            </button>
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
        
        // Обновляем информацию об активном игроке
        this.updateActivePlayerInfo(data.activePlayer);
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
     * Обновление результата кубика
     * @param {number} result - Результат броска
     */
    updateDiceResult(result) {
        const diceResult = document.getElementById('dice-result');
        if (diceResult) {
            if (result && typeof result === 'number' && result >= 1 && result <= 6) {
                const diceEmoji = this.getDiceEmoji(result);
                diceResult.textContent = `${diceEmoji} ${result}`;
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
                // Блокируем повторные клики
                rollDiceBtn.disabled = true;
                // Показываем анимацию броска
                this._showRollingAnimation();
                // Публичное превью значения (по желанию UI может слушать это событие)
                const preview = Math.floor(Math.random() * 6) + 1;
                if (this.eventBus && typeof this.eventBus.emit === 'function') {
                    this.eventBus.emit('ui:dice:preview', { value: preview });
                }
                this.updateDiceResult(preview);
                // Запускаем бросок через сервис/сервер
                this.rollDice();
            });
        }

        const passTurnBtn = document.getElementById('pass-turn');
        if (passTurnBtn) {
            passTurnBtn.addEventListener('click', (e) => {
                // На всякий случай предотвращаем любое дефолтное поведение и всплытие
                try { e.preventDefault && e.preventDefault(); } catch (_) {}
                try { e.stopPropagation && e.stopPropagation(); } catch (_) {}
                this.passTurn();
                return false;
            }, { passive: false });
        }
        
        // Подписываемся на события TurnService
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
                    const btn = document.getElementById('roll-dice');
                    if (btn) btn.disabled = false;
                });
            }
        } catch (_) {}
    }

    // Псевдо-анимация броска в текстовом поле "Кубик:"
    _showRollingAnimation() {
        const el = document.getElementById('dice-result');
        if (!el) return;
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
    }
    
    /**
     * Бросок кубика
     */
    rollDice() {
        try {
            // Пытаемся вызвать реальный TurnService напрямую
            const app = window.app;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            if (turnService && typeof turnService.roll === 'function') {
                console.log('🎲 PlayersPanel: rollDice → TurnService.roll()');
                turnService.roll({ diceChoice: 'single' }).catch(err => console.error('❌ PlayersPanel: Ошибка броска через TurnService', err));
                return;
            }
            // Fallback: эмит в EventBus для обратной совместимости
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                console.log('🎲 PlayersPanel: rollDice → eventBus.emit("dice:roll")');
                this.eventBus.emit('dice:roll', {});
            } else {
                console.warn('⚠️ PlayersPanel: TurnService и EventBus недоступны — действие проигнорировано');
            }
        } catch (e) {
            console.error('❌ PlayersPanel: rollDice ошибка', e);
        }
    }

    /**
     * Передача хода
     */
    passTurn() {
        try {
            const app = window.app;
            const turnService = app && app.getModule ? app.getModule('turnService') : null;
            if (turnService && typeof turnService.endTurn === 'function') {
                console.log('➡️ PlayersPanel: passTurn → TurnService.endTurn()');
                turnService.endTurn().catch(err => console.error('❌ PlayersPanel: Ошибка завершения хода', err));
                return;
            }
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                console.log('➡️ PlayersPanel: passTurn → eventBus.emit("turn:pass")');
                this.eventBus.emit('turn:pass', {});
            } else {
                console.warn('⚠️ PlayersPanel: TurnService и EventBus недоступны — действие проигнорировано');
            }
        } catch (e) {
            console.error('❌ PlayersPanel: passTurn ошибка', e);
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
