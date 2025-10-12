/**
 * PlayerTokens v1.0.0
 * Компонент для отображения фишек игроков на игровом поле
 */

class PlayerTokens {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.outerTrackSelector = config.outerTrackSelector || '#outer-track';
        this.innerTrackSelector = config.innerTrackSelector || '#inner-track';
        
        this.tokens = new Map(); // Хранение DOM элементов фишек
        
        console.log('🎯 PlayerTokens: Инициализация');
        this.init();
    }
    
    /**
     * Инициализация компонента
     */
    init() {
        this.setupEventListeners();
        this.addStyles();
        
        console.log('✅ PlayerTokens: Инициализирован');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('game:playersUpdated', (data) => {
                this.updateTokens(data.players);
            });
            
            this.eventBus.on('player:positionUpdated', (data) => {
                this.updateTokenPosition(data.playerId, data.position, data.player.isInner);
            });
            
            this.eventBus.on('game:playersUpdated', (data) => {
                this.clearTokens();
                this.renderTokens(data.players);
            });
        }
    }
    
    /**
     * Добавление стилей для фишек
     */
    addStyles() {
        if (document.getElementById('player-tokens-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'player-tokens-styles';
        styles.textContent = `
            .player-token {
                position: absolute;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: 600;
                border: 2px solid rgba(255, 255, 255, 0.8);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                z-index: 100;
                pointer-events: none;
            }
            
            .player-token:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            }
            
            .player-token.outer {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
            }
            
            .player-token.inner {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
            }
            
            .player-token.multiple {
                /* Стили для множественных фишек на одной клетке */
            }
            
            /* Анимация появления фишки */
            @keyframes tokenAppear {
                from {
                    opacity: 0;
                    transform: scale(0);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            .player-token.appearing {
                animation: tokenAppear 0.3s ease-out;
            }
            
            /* Анимация перемещения */
            @keyframes tokenMove {
                from {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.2);
                }
                to {
                    transform: scale(1);
                }
            }
            
            .player-token.moving {
                animation: tokenMove 0.5s ease-in-out;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Очистка всех фишек
     */
    clearTokens() {
        this.tokens.forEach((token) => {
            if (token.parentNode) {
                token.parentNode.removeChild(token);
            }
        });
        this.tokens.clear();
    }
    
    /**
     * Рендер фишек для всех игроков
     */
    renderTokens(players) {
        if (!players || players.length === 0) return;
        
        console.log('🎯 PlayerTokens: Рендер фишек для', players.length, 'игроков');
        
        // Группируем игроков по позиции для смещения
        const positionGroups = new Map();
        
        players.forEach((player, index) => {
            const position = player.position || 0;
            const isInner = player.isInner || false;
            
            if (!positionGroups.has(`${position}-${isInner}`)) {
                positionGroups.set(`${position}-${isInner}`, []);
            }
            positionGroups.get(`${position}-${isInner}`).push(player);
        });
        
        // Создаем фишки для каждой группы
        positionGroups.forEach((playersAtPosition, positionKey) => {
            const [position, isInner] = positionKey.split('-');
            this.createTokensAtPosition(playersAtPosition, parseInt(position), isInner === 'true');
        });
    }
    
    /**
     * Создание фишек на определенной позиции
     */
    createTokensAtPosition(players, position, isInner) {
        const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
        const trackElement = document.querySelector(trackSelector);
        
        if (!trackElement) {
            console.warn('⚠️ PlayerTokens: Трек не найден:', trackSelector);
            return;
        }
        
        // Находим клетку по позиции
        const cell = trackElement.querySelector(`[data-position="${position}"]`);
        if (!cell) {
            console.warn('⚠️ PlayerTokens: Клетка не найдена для позиции:', position);
            return;
        }
        
        const cellRect = cell.getBoundingClientRect();
        const trackRect = trackElement.getBoundingClientRect();
        
        // Рассчитываем базовую позицию (центр клетки)
        const baseX = cellRect.left - trackRect.left + cellRect.width / 2;
        const baseY = cellRect.top - trackRect.top + cellRect.height / 2;
        
        // Создаем фишки со смещением
        players.forEach((player, index) => {
            const token = this.createPlayerToken(player, index, players.length);
            
            // Рассчитываем смещение для множественных фишек
            const offset = this.calculateOffset(index, players.length);
            
            token.style.left = `${baseX + offset.x - 12}px`; // -12 для центрирования (24px/2)
            token.style.top = `${baseY + offset.y - 12}px`;
            
            // Добавляем класс для анимации
            token.classList.add('appearing');
            
            trackElement.appendChild(token);
            this.tokens.set(player.id, token);
            
            console.log(`🎯 PlayerTokens: Фишка ${player.username} создана на позиции ${position}`);
        });
    }
    
    /**
     * Создание DOM элемента фишки
     */
    createPlayerToken(player, index, totalPlayers) {
        const token = document.createElement('div');
        token.className = `player-token ${player.isInner ? 'inner' : 'outer'}`;
        token.dataset.playerId = player.id;
        token.dataset.playerName = player.username;
        
        // Используем иконку фишки вместо текста
        const tokenIcon = this.getTokenIcon(player.token);
        token.textContent = tokenIcon;
        
        // Добавляем информацию о игроке в title
        token.title = `${player.username} - $${player.money || 0}`;
        
        return token;
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
     * Расчет смещения для множественных фишек
     */
    calculateOffset(index, totalPlayers) {
        if (totalPlayers === 1) {
            return { x: 0, y: 0 };
        }
        
        // Располагаем фишки по кругу
        const angle = (index * 2 * Math.PI) / totalPlayers;
        const radius = 8; // Радиус смещения в пикселях
        
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    }
    
    /**
     * Обновление позиции фишки
     */
    updateTokenPosition(playerId, newPosition, isInner) {
        const token = this.tokens.get(playerId);
        if (!token) {
            console.warn('⚠️ PlayerTokens: Фишка не найдена для игрока:', playerId);
            return;
        }
        
        const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
        const trackElement = document.querySelector(trackSelector);
        
        if (!trackElement) {
            console.warn('⚠️ PlayerTokens: Трек не найден:', trackSelector);
            return;
        }
        
        const cell = trackElement.querySelector(`[data-position="${newPosition}"]`);
        if (!cell) {
            console.warn('⚠️ PlayerTokens: Клетка не найдена для позиции:', newPosition);
            return;
        }
        
        const cellRect = cell.getBoundingClientRect();
        const trackRect = trackElement.getBoundingClientRect();
        
        // Рассчитываем новую позицию
        const newX = cellRect.left - trackRect.left + cellRect.width / 2;
        const newY = cellRect.top - trackRect.top + cellRect.height / 2;
        
        // Добавляем класс для анимации перемещения
        token.classList.add('moving');
        
        // Обновляем позицию
        token.style.left = `${newX - 12}px`;
        token.style.top = `${newY - 12}px`;
        
        // Убираем класс анимации через некоторое время
        setTimeout(() => {
            token.classList.remove('moving');
        }, 500);
        
        console.log(`🎯 PlayerTokens: Фишка ${playerId} перемещена на позицию ${newPosition}`);
    }
    
    /**
     * Обновление всех фишек
     */
    updateTokens(players) {
        this.clearTokens();
        this.renderTokens(players);
    }
}

window.PlayerTokens = PlayerTokens;
