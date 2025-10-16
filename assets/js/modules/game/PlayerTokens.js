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
        this.animatingTokens = new Set(); // Фишки, которые сейчас анимируются
        
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
            
            // Новое событие для массового обновления позиций
            this.eventBus.on('players:positionsUpdated', (data) => {
                console.log('🎯 PlayerTokens: Получено событие players:positionsUpdated', data);
                if (data.changes && Array.isArray(data.changes)) {
                    data.changes.forEach(change => {
                        if (change.playerId && change.position !== undefined) {
                            // Проверяем, не анимируется ли эта фишка
                            if (this.animatingTokens.has(change.playerId)) {
                                console.log(`🎯 PlayerTokens: Фишка ${change.playerId} анимируется, пропускаем обновление`);
                                return;
                            }
                            
                            const player = data.players.find(p => p.id === change.playerId);
                            if (player) {
                                this.updateTokenPosition(change.playerId, change.position, player.isInner);
                            }
                        }
                    });
                }
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
                z-index: 2000;
                pointer-events: none;
                backdrop-filter: blur(5px);
                transform: translate3d(0, 0, 0);
                will-change: transform, left, top;
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
        const normalized = this.normalizePlayers(players?.length ? players : this.getPlayers());
        if (!normalized.length) {
            this.clearTokens();
            return;
        }
        this.updateTokens(normalized);
    }
    
    /**
     * Создание DOM элемента фишки
     */
    createPlayerToken(player, index, totalPlayers) {
        const token = document.createElement('div');
        token.className = `player-token ${player.isInner ? 'inner' : 'outer'}`;
        token.dataset.playerId = player.id;
        token.dataset.playerName = player.username;
        token.setAttribute('data-position', player.position || 0); // Добавляем атрибут позиции
        token.style.zIndex = '2000';
        
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
        
        const icon = tokenIcons[tokenId] || '🎯';
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
        
        // Проверяем, не выполняется ли уже анимация для этой фишки
        if (this.animatingTokens.has(playerId)) {
            console.log('🎯 PlayerTokens: Фишка уже движется, пропускаем дублирующий вызов');
            return;
        }
        
        // Получаем текущую позицию из атрибута data-position
        const currentPosition = parseInt(token.getAttribute('data-position')) || 0;
        
        // Если позиция не изменилась, просто синхронизируем координаты
        if (currentPosition === newPosition) {
            this.moveTokenToPosition(token, playerId, newPosition, isInner);
            return;
        }
        
        // Проверяем, что разница в позициях не слишком большая (максимум 6 шагов)
        const positionDiff = Math.abs(newPosition - currentPosition);
        const maxDiff = 6;
        
        if (positionDiff > maxDiff) {
            console.log(`🎯 PlayerTokens: Слишком большое изменение позиции (${positionDiff}), мгновенное перемещение`);
            this.moveTokenToPosition(token, playerId, newPosition, isInner);
            return;
        }
        
        console.log(`🎯 PlayerTokens: Начинаем движение фишки ${playerId} с ${currentPosition} на ${newPosition}`);
        this.moveTokenStepByStep(token, playerId, currentPosition, newPosition, isInner);
    }
    
    /**
     * Мгновенное перемещение фишки на позицию (без анимации)
     */
    moveTokenToPosition(token, playerId, position, isInner) {
        const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
        const trackElement = document.querySelector(trackSelector);
        
        if (!trackElement) {
            console.warn('⚠️ PlayerTokens: Трек не найден:', trackSelector);
            return;
        }
        
        const cell = trackElement.querySelector(`[data-position="${position}"]`);
        if (!cell) {
            console.warn('⚠️ PlayerTokens: Клетка не найдена для позиции:', position);
            return;
        }
        
        const cellRect = cell.getBoundingClientRect();
        const trackRect = trackElement.getBoundingClientRect();
        
        // Рассчитываем позицию
        const newX = cellRect.left - trackRect.left + cellRect.width / 2 - 16;
        const newY = cellRect.top - trackRect.top + cellRect.height / 2 - 16;
        
        // Перемещаем фишку
        token.style.left = newX + 'px';
        token.style.top = newY + 'px';
        token.setAttribute('data-position', position);
        
        console.log(`🎯 PlayerTokens: Фишка ${playerId} мгновенно перемещена на позицию ${position}`);
    }
    
    /**
     * Пошаговое движение фишки с задержкой
     */
    moveTokenStepByStep(token, playerId, fromPosition, toPosition, isInner) {
        // Проверяем, не выполняется ли уже анимация для этой фишки
        if (this.animatingTokens.has(playerId)) {
            console.log('🎯 PlayerTokens: Фишка уже движется, отменяем предыдущую анимацию');
            return;
        }
        
        // Добавляем фишку в список анимирующихся
        this.animatingTokens.add(playerId);
        
        const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
        const trackElement = document.querySelector(trackSelector);
        
        if (!trackElement) {
            console.warn('⚠️ PlayerTokens: Трек не найден:', trackSelector);
            this.animatingTokens.delete(playerId);
            return;
        }
        
        const maxPosition = isInner ? 23 : 43; // Максимальные позиции для треков
        const steps = [];
        
        // Рассчитываем количество шагов для движения
        let stepsToMove = toPosition - fromPosition;
        if (stepsToMove < 0) {
            // Если движение через 0 (например, с 40 на 2)
            stepsToMove = (maxPosition + 1) - fromPosition + toPosition;
        }
        
        // Ограничиваем максимальное количество шагов (1-6)
        const maxSteps = 6;
        const actualSteps = Math.min(stepsToMove, maxSteps);
        
        console.log(`🎯 PlayerTokens: Движение с ${fromPosition} на ${toPosition}, шагов: ${actualSteps}`);
        
        // Рассчитываем шаги движения
        let currentPos = fromPosition;
        for (let i = 0; i < actualSteps; i++) {
            currentPos = (currentPos + 1) % (maxPosition + 1);
            steps.push(currentPos);
        }
        
        console.log(`🎯 PlayerTokens: Шаги движения для ${playerId}:`, steps);
        
        // Выполняем каждый шаг с задержкой
        let stepIndex = 0;
        const moveToNextStep = () => {
            if (stepIndex >= steps.length) {
                console.log(`🎯 PlayerTokens: Движение фишки ${playerId} завершено`);
                // Убираем фишку из списка анимирующихся
                this.animatingTokens.delete(playerId);
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
        const normalized = this.normalizePlayers(players);
        if (!normalized.length) {
            this.clearTokens();
            return;
        }
        
        const grouped = this.groupPlayersByPosition(normalized);
        const processed = new Set();
        
        grouped.forEach(({ position, isInner, players: playersAtPosition }) => {
            const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
            const trackElement = document.querySelector(trackSelector);
            if (!trackElement) return;
            
            const cell = trackElement.querySelector(`[data-position="${position}"]`);
            if (!cell) return;
            
            const trackRect = trackElement.getBoundingClientRect();
            const cellRect = cell.getBoundingClientRect();
            const baseCoords = {
                x: cellRect.left - trackRect.left + cellRect.width / 2,
                y: cellRect.top - trackRect.top + cellRect.height / 2
            };
            
            playersAtPosition.forEach((player, index) => {
                const token = this.ensureToken(player, index, playersAtPosition.length, trackElement);
                const offset = this.calculateOffset(index, playersAtPosition.length);
                this.positionTokenElement(token, baseCoords, offset);
                processed.add(player.id);
            });
        });
        
        this.tokens.forEach((token, playerId) => {
            if (!processed.has(playerId)) {
                if (token.parentNode) {
                    token.parentNode.removeChild(token);
                }
                this.tokens.delete(playerId);
            }
        });
    }
    
    /**
     * Принудительное обновление фишек из GameState
     */
    forceUpdate() {
        const players = this.getPlayers();
        this.updateTokens(players);
    }

    /**
     * Нормализация списка игроков (уникальные идентификаторы, позиции)
     */
    normalizePlayers(players = []) {
        const result = [];
        const seen = new Set();
        const source = Array.isArray(players) ? players : [];
        
        source.forEach((player, idx) => {
            if (!player) {
                return;
            }
            const key = player.id || player.userId || player.username || `player_${idx}`;
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            result.push({
                ...player,
                id: player.id || player.userId || key,
                position: Number(player.position) || 0,
                isInner: Boolean(player.isInner)
            });
        });
        
        return result;
    }

    /**
     * Группировка игроков по позиции и треку
     */
    groupPlayersByPosition(players) {
        const groups = new Map();
        players.forEach(player => {
            const groupKey = `${player.position}|${player.isInner ? 'inner' : 'outer'}`;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    position: player.position,
                    isInner: player.isInner,
                    players: []
                });
            }
            groups.get(groupKey).players.push(player);
        });
        return groups;
    }

    /**
     * Создает или обновляет фишку игрока и возвращает DOM-элемент
     */
    ensureToken(player, index, totalPlayers, trackElement) {
        let token = this.tokens.get(player.id);
        if (!token) {
            token = this.createPlayerToken(player, index, totalPlayers);
            trackElement.appendChild(token);
            this.tokens.set(player.id, token);
            this.animateTokenAppearance(token);
        } else {
            token.dataset.position = player.position;
            token.dataset.playerName = player.username;
            token.classList.toggle('inner', !!player.isInner);
            token.classList.toggle('outer', !player.isInner);
            token.textContent = this.getTokenIcon(player.token);
            token.title = `${player.username} - $${player.money || 0}`;
        }
        return token;
    }

    /**
     * Позиционирование фишки с учётом смещения
     */
    positionTokenElement(token, baseCoords, offset) {
        if (!token) return;
        const halfSize = 16; // половина ширины/высоты токена
        token.style.left = `${baseCoords.x + offset.x - halfSize}px`;
        token.style.top = `${baseCoords.y + offset.y - halfSize}px`;
    }
}

console.log('🎯 PlayerTokens: Класс определен, экспортируем в window...');
window.PlayerTokens = PlayerTokens;
console.log('🎯 PlayerTokens: Экспорт завершен, window.PlayerTokens =', !!window.PlayerTokens);
