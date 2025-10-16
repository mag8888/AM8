/**
 * PlayerTokens v1.0.0
 * Компонент для отображения фишек игроков на игровом поле
 */

console.log('🎯 PlayerTokens: Файл загружается...');

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
        
        // Принудительно обновляем фишки через небольшую задержку
        setTimeout(() => {
            this.forceUpdate();
        }, 1000);
        
        console.log('✅ PlayerTokens: Инициализирован');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('game:playersUpdated', (data) => {
                console.log('🎯 PlayerTokens: Получено событие game:playersUpdated', data);
                this.updateTokens(data.players);
            });
            
            this.eventBus.on('player:positionUpdated', (data) => {
                console.log('🎯 PlayerTokens: Получено событие player:positionUpdated', data);
                this.updateTokenPosition(data.playerId, data.position, data.player.isInner);
            });
            
            this.eventBus.on('game:started', () => {
                console.log('🎯 PlayerTokens: Получено событие game:started');
                // При старте игры рендерим фишки всех игроков
                if (this.gameState && this.gameState.players) {
                    this.renderTokens(this.gameState.players);
                }
            });
            
            // Добавляем слушатель для обновления игроков из GameStateManager
            this.eventBus.on('players:updated', (data) => {
                console.log('🎯 PlayerTokens: Получено событие players:updated', data);
                this.updateTokens(data.players);
            });
        } else {
            console.warn('⚠️ PlayerTokens: EventBus не найден');
        }
    }
    
    /**
     * Добавление стилей для фишек
     */
    addStyles() {
        if (document.getElementById('player-tokens-styles')) {
            console.log('🎯 PlayerTokens: Стили уже добавлены');
            return;
        }
        
        console.log('🎯 PlayerTokens: Добавляем стили для фишек');
        const styles = document.createElement('style');
        styles.id = 'player-tokens-styles';
        styles.textContent = `
            .player-token {
                position: absolute;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
                font-weight: bold;
                border: 3px solid rgba(255, 255, 255, 0.9);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
                z-index: 200;
                pointer-events: none;
                backdrop-filter: blur(5px);
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
     * Получение игроков из GameStateManager
     */
    getPlayers() {
        if (this.gameState && this.gameState.players) {
            return this.gameState.players;
        }
        return [];
    }
    
    /**
     * Рендер фишек для всех игроков
     */
    renderTokens(players) {
        console.log('🎯 PlayerTokens: renderTokens вызван с игроками:', players);
        
        if (!players || players.length === 0) {
            // Пытаемся получить игроков из GameState
            players = this.getPlayers();
            console.log('🎯 PlayerTokens: Получены игроки из GameState:', players);
            if (!players || players.length === 0) {
                console.warn('⚠️ PlayerTokens: Нет игроков для отображения');
                return;
            }
        }
        
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
        console.log('🎯 PlayerTokens: createTokensAtPosition', { players, position, isInner });
        
        const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
        const trackElement = document.querySelector(trackSelector);
        
        if (!trackElement) {
            console.warn('⚠️ PlayerTokens: Трек не найден:', trackSelector);
            return;
        }
        
        // Проверяем размеры трека
        const trackRect = trackElement.getBoundingClientRect();
        console.log('🎯 PlayerTokens: Трек найден:', {
            element: trackElement,
            selector: trackSelector,
            width: trackRect.width,
            height: trackRect.height,
            x: trackRect.x,
            y: trackRect.y,
            isVisible: trackRect.width > 0 && trackRect.height > 0
        });
        
        // Находим клетку по позиции
        const cell = trackElement.querySelector(`[data-position="${position}"]`);
        if (!cell) {
            console.warn('⚠️ PlayerTokens: Клетка не найдена для позиции:', position);
            return;
        }
        
        const cellRect = cell.getBoundingClientRect();
        
        // Рассчитываем базовую позицию (центр клетки)
        const baseX = cellRect.left - trackRect.left + cellRect.width / 2;
        const baseY = cellRect.top - trackRect.top + cellRect.height / 2;
        
        // Создаем фишки со смещением
        players.forEach((player, index) => {
            const token = this.createPlayerToken(player, index, players.length);
            
            // Рассчитываем смещение для множественных фишек
            const offset = this.calculateOffset(index, players.length);
            
            token.style.left = `${baseX + offset.x - 16}px`; // -16 для центрирования (32px/2)
            token.style.top = `${baseY + offset.y - 16}px`;
            
            trackElement.appendChild(token);
            this.tokens.set(player.id, token);
            
            // Запускаем анимацию появления
            this.animateTokenAppearance(token);
            
            // Проверяем видимость фишки
            setTimeout(() => {
                const rect = token.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(token);
                console.log(`🎯 PlayerTokens: Проверка видимости фишки ${player.username}:`, {
                    isVisible: rect.width > 0 && rect.height > 0,
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    position: computedStyle.position,
                    left: computedStyle.left,
                    top: computedStyle.top,
                    zIndex: computedStyle.zIndex,
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        x: rect.x,
                        y: rect.y
                    }
                });
            }, 100);
            
            console.log(`🎯 PlayerTokens: Фишка ${player.username} создана на позиции ${position}`);
        });
    }
    
    /**
     * Создание DOM элемента фишки
     */
    createPlayerToken(player, index, totalPlayers) {
        console.log(`🎯 PlayerTokens: createPlayerToken для ${player.username}:`, {
            player: player,
            token: player.token,
            position: player.position,
            isInner: player.isInner
        });
        
        const token = document.createElement('div');
        token.className = `player-token ${player.isInner ? 'inner' : 'outer'}`;
        token.dataset.playerId = player.id;
        token.dataset.playerName = player.username;
        token.setAttribute('data-position', player.position || 0); // Добавляем атрибут позиции
        
        // Используем иконку фишки вместо текста
        const tokenIcon = this.getTokenIcon(player.token);
        token.textContent = tokenIcon;
        
        // Добавляем информацию о игроке в title
        token.title = `${player.username} - $${player.money || 0}`;
        
        console.log(`🎯 PlayerTokens: Создана фишка для ${player.username}:`, {
            className: token.className,
            textContent: token.textContent,
            dataPosition: token.getAttribute('data-position')
        });
        
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
        
        const icon = tokenIcons[tokenId] || '🎯';
        console.log(`🎯 PlayerTokens: getTokenIcon(${tokenId}) = ${icon}`);
        return icon;
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
        const radius = 12; // Радиус смещения в пикселях (увеличен для больших токенов)
        
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    }
    
    /**
     * Обновление позиции фишки с анимацией
     */
    updateTokenPosition(playerId, newPosition, isInner) {
        const token = this.tokens.get(playerId);
        if (!token) {
            console.warn('⚠️ PlayerTokens: Фишка не найдена для игрока:', playerId);
            return;
        }
        
        // Получаем текущую позицию из атрибута data-position
        const currentPosition = parseInt(token.getAttribute('data-position')) || 0;
        
        console.log(`🎯 PlayerTokens: Движение фишки ${playerId} с позиции ${currentPosition} на ${newPosition}`);
        
        // Если позиция не изменилась, ничего не делаем
        if (currentPosition === newPosition) {
            console.log('🎯 PlayerTokens: Позиция не изменилась, пропускаем движение');
            return;
        }
        
        // Выполняем пошаговое движение
        this.moveTokenStepByStep(token, playerId, currentPosition, newPosition, isInner);
    }
    
    /**
     * Пошаговое движение фишки с задержкой
     */
    moveTokenStepByStep(token, playerId, fromPosition, toPosition, isInner) {
        const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
        const trackElement = document.querySelector(trackSelector);
        
        if (!trackElement) {
            console.warn('⚠️ PlayerTokens: Трек не найден:', trackSelector);
            return;
        }
        
        const maxPosition = isInner ? 23 : 43; // Максимальные позиции для треков
        const steps = [];
        
        // Рассчитываем шаги движения
        let currentPos = fromPosition;
        while (currentPos !== toPosition) {
            currentPos = (currentPos + 1) % (maxPosition + 1);
            steps.push(currentPos);
        }
        
        console.log(`🎯 PlayerTokens: Шаги движения для ${playerId}:`, steps);
        
        // Выполняем каждый шаг с задержкой
        let stepIndex = 0;
        const moveToNextStep = () => {
            if (stepIndex >= steps.length) {
                console.log(`🎯 PlayerTokens: Движение фишки ${playerId} завершено`);
                return;
            }
            
            const stepPosition = steps[stepIndex];
            const cell = trackElement.querySelector(`[data-position="${stepPosition}"]`);
            
            if (cell) {
                const cellRect = cell.getBoundingClientRect();
                const trackRect = trackElement.getBoundingClientRect();
                
                // Рассчитываем позицию
                const newX = cellRect.left - trackRect.left + cellRect.width / 2 - 12;
                const newY = cellRect.top - trackRect.top + cellRect.height / 2 - 12;
                
                // Получаем текущую позицию фишки
                const currentX = parseFloat(token.style.left) || 0;
                const currentY = parseFloat(token.style.top) || 0;
                
                // Анимируем движение к следующей клетке
                this.animateTokenMovement(token, currentX, currentY, newX, newY);
                
                // Обновляем атрибут позиции
                token.setAttribute('data-position', stepPosition);
                
                console.log(`🎯 PlayerTokens: Шаг ${stepIndex + 1}/${steps.length}: позиция ${stepPosition}`);
                
                stepIndex++;
                
                // Переходим к следующему шагу через 500мс
                setTimeout(moveToNextStep, 500);
            } else {
                console.warn('⚠️ PlayerTokens: Клетка не найдена для позиции:', stepPosition);
                stepIndex++;
                setTimeout(moveToNextStep, 100);
            }
        };
        
        // Начинаем движение
        moveToNextStep();
    }
    
    /**
     * Анимация движения фишки
     */
    animateTokenMovement(token, fromX, fromY, toX, toY) {
        // Добавляем класс для анимации
        token.classList.add('moving');
        
        // Создаем keyframes для анимации
        const keyframes = [
            { 
                left: `${fromX}px`, 
                top: `${fromY}px`,
                transform: 'scale(1)'
            },
            { 
                left: `${(fromX + toX) / 2}px`, 
                top: `${(fromY + toY) / 2}px`,
                transform: 'scale(1.2)'
            },
            { 
                left: `${toX}px`, 
                top: `${toY}px`,
                transform: 'scale(1)'
            }
        ];
        
        // Выполняем анимацию
        token.animate(keyframes, {
            duration: 800,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
        }).onfinish = () => {
            // Устанавливаем финальную позицию
            token.style.left = `${toX}px`;
            token.style.top = `${toY}px`;
            
            // Убираем класс анимации
            token.classList.remove('moving');
        };
    }
    
    /**
     * Анимация появления фишки
     */
    animateTokenAppearance(token) {
        const keyframes = [
            { 
                opacity: '0',
                transform: 'scale(0) rotate(0deg)'
            },
            { 
                opacity: '1',
                transform: 'scale(1.2) rotate(180deg)'
            },
            { 
                opacity: '1',
                transform: 'scale(1) rotate(360deg)'
            }
        ];
        
        token.animate(keyframes, {
            duration: 600,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            fill: 'forwards'
        });
    }
    
    /**
     * Обновление всех фишек
     */
    updateTokens(players) {
        this.clearTokens();
        this.renderTokens(players);
    }
    
    /**
     * Принудительное обновление фишек из GameState
     */
    forceUpdate() {
        const players = this.getPlayers();
        this.updateTokens(players);
    }
}

console.log('🎯 PlayerTokens: Класс определен, экспортируем в window...');
window.PlayerTokens = PlayerTokens;
console.log('🎯 PlayerTokens: Экспорт завершен, window.PlayerTokens =', !!window.PlayerTokens);
