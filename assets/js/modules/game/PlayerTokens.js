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
        this._forceUpdateTimer = null; // Дебаунсинг для forceUpdate
        this._isForceUpdating = false; // Флаг выполняющегося обновления
        
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
        }, 300); // Уменьшили с 1000ms до 300ms
        
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
                
                // Проверяем, не анимируется ли эта фишка
                if (this.animatingTokens.has(data.playerId)) {
                    console.log(`🎯 PlayerTokens: Фишка ${data.playerId} анимируется, пропускаем player:positionUpdated`);
                    return;
                }
                
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
                    
                    // Обновляем все позиции с учетом коллизий после обработки изменений
                    setTimeout(() => {
                        this.updateAllTokenPositions();
                    }, 100);
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
        // Сначала пробуем получить из локального gameState
        if (this.gameState && this.gameState.players) {
            return this.gameState.players;
        }
        
        // Пробуем получить из глобального GameStateManager
        if (window.app && window.app.getModule) {
            const gameStateManager = window.app.getModule('gameStateManager');
            if (gameStateManager && typeof gameStateManager.getState === 'function') {
                try {
                    const state = gameStateManager.getState();
                    if (state && state.players && Array.isArray(state.players)) {
                        console.log('🎯 PlayerTokens: Получены игроки из GameStateManager:', state.players.length);
                        return state.players;
                    }
                } catch (error) {
                    console.warn('⚠️ PlayerTokens: Ошибка получения состояния из GameStateManager:', error);
                }
            }
        }
        
        console.log('🎯 PlayerTokens: Игроки не найдены, возвращаем пустой массив');
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
        token.style.zIndex = '2000'; /* Фишки поверх */
        
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
     * Получить токен по умолчанию для игрока
     */
    getDefaultTokenForPlayer(player, index) {
        // Если у игрока уже есть выбранный токен, используем его
        if (player.token) {
            return player.token;
        }
        
        // Попробуем получить токен из localStorage если пользователь выбирал его
        const savedToken = localStorage.getItem(`player_token_${player.username || player.id}`);
        if (savedToken) {
            return savedToken;
        }
        
        // Массив доступных токенов по умолчанию
        const defaultTokens = ['lion', 'eagle', 'fox', 'bear', 'tiger', 'wolf', 'elephant', 'shark', 'owl', 'dolphin'];
        
        // Используем индекс игрока для выбора токена
        const tokenIndex = index % defaultTokens.length;
        return defaultTokens[tokenIndex];
    }
    
    /**
     * Расчет смещения для множественных фишек
     */
    calculateOffset(index, totalPlayers) {
        if (totalPlayers === 1) {
            return { x: 0, y: 0 };
        }
        
        // Конфигурация сдвига для разного количества фишек
        const offsetConfigs = {
            2: [
                { x: -8, y: 0 },
                { x: 8, y: 0 }
            ],
            3: [
                { x: -12, y: -6 },
                { x: 0, y: 6 },
                { x: 12, y: -6 }
            ],
            4: [
                { x: -12, y: -8 },
                { x: 12, y: -8 },
                { x: -12, y: 8 },
                { x: 12, y: 8 }
            ]
        };
        
        const config = offsetConfigs[totalPlayers] || offsetConfigs[4];
        const offset = config[index] || { x: 0, y: 0 };
        
        // Добавляем визуальную индикацию для множественных фишек
        if (totalPlayers > 1) {
            console.log(`🎯 PlayerTokens: Фишка ${index + 1}/${totalPlayers} сдвинута на (${offset.x}, ${offset.y})`);
        }
        
        return offset;
    }
    
    /**
     * Обновление позиции фишки с анимацией
     */
    updateTokenPosition(playerId, newPosition, isInner) {
        console.log(`🎯 PlayerTokens: updateTokenPosition вызван для ${playerId}, позиция ${newPosition}, анимируется: ${this.animatingTokens.has(playerId)}`);
        
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

        // Защита от устаревших обновлений, приходящих сразу после движения
        const nowTs = Date.now();
        const lastUpdateTs = parseInt(token.getAttribute('data-update-ts')) || 0;
        const currentPositionTsWindowMs = 1200; // окно защиты от отката
        const currentPosition = parseInt(token.getAttribute('data-position')) || 0;
        if (lastUpdateTs && (nowTs - lastUpdateTs) < currentPositionTsWindowMs) {
            const maxPosition = isInner ? 23 : 43;
            const isWrapAround = (currentPosition > newPosition) && ((currentPosition - newPosition) > 6) && (currentPosition === maxPosition || newPosition === 0);
            if (!isWrapAround && newPosition < currentPosition && (currentPosition - newPosition) <= 6) {
                console.log('🛡️ PlayerTokens: Игнорируем возможный откат позиции (устаревшее обновление)', {
                    playerId, currentPosition, newPosition, sinceMs: nowTs - lastUpdateTs
                });
                return;
            }
        }
        
        // Получаем текущую позицию из атрибута data-position
        // (поверх переменной currentPosition, объявленной выше)
        
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
        
        // Проверяем коллизии и сдвигаем фишки
        this.handleTokenCollisions(position, isInner);
        
        const cellRect = cell.getBoundingClientRect();
        const trackRect = trackElement.getBoundingClientRect();
        
        // Рассчитываем позицию с учетом сдвига
        const offset = this.getTokenOffset(playerId, position, isInner);
        const newX = cellRect.left - trackRect.left + cellRect.width / 2 - 16 + offset.x;
        const newY = cellRect.top - trackRect.top + cellRect.height / 2 - 16 + offset.y;
        
        // Перемещаем фишку
        token.style.left = newX + 'px';
        token.style.top = newY + 'px';
        token.setAttribute('data-position', position);
        token.setAttribute('data-update-ts', String(Date.now()));
        
        console.log(`🎯 PlayerTokens: Фишка ${playerId} мгновенно перемещена на позицию ${position} со сдвигом (${offset.x}, ${offset.y})`);
    }
    
    /**
     * Обработка коллизий фишек на одной клетке
     */
    handleTokenCollisions(position, isInner) {
        const trackSelector = isInner ? this.innerTrackSelector : this.outerTrackSelector;
        const trackElement = document.querySelector(trackSelector);
        
        if (!trackElement) return;
        
        // Находим все фишки на данной позиции
        const tokensOnPosition = [];
        this.tokens.forEach((token, playerId) => {
            const tokenPosition = parseInt(token.getAttribute('data-position')) || 0;
            const tokenIsInner = token.classList.contains('inner-track');
            
            if (tokenPosition === position && tokenIsInner === isInner) {
                tokensOnPosition.push({ token, playerId });
            }
        });
        
        // Если на позиции больше одной фишки, сдвигаем их
        if (tokensOnPosition.length > 1) {
            console.log(`🎯 PlayerTokens: Обнаружено ${tokensOnPosition.length} фишек на позиции ${position}, сдвигаем...`);
            this.arrangeTokensOnPosition(tokensOnPosition, position, isInner);
        }
    }
    
    /**
     * Расстановка фишек на одной позиции с сдвигом
     */
    arrangeTokensOnPosition(tokensOnPosition, position, isInner) {
        const cell = document.querySelector(`${isInner ? this.innerTrackSelector : this.outerTrackSelector} [data-position="${position}"]`);
        if (!cell) return;
        
        const cellRect = cell.getBoundingClientRect();
        const trackRect = document.querySelector(isInner ? this.innerTrackSelector : this.outerTrackSelector).getBoundingClientRect();
        
        // Конфигурация сдвига для разного количества фишек
        const offsetConfigs = {
            2: [
                { x: -8, y: 0 },
                { x: 8, y: 0 }
            ],
            3: [
                { x: -12, y: -6 },
                { x: 0, y: 6 },
                { x: 12, y: -6 }
            ],
            4: [
                { x: -12, y: -8 },
                { x: 12, y: -8 },
                { x: -12, y: 8 },
                { x: 12, y: 8 }
            ]
        };
        
        const config = offsetConfigs[tokensOnPosition.length] || offsetConfigs[4];
        
        tokensOnPosition.forEach(({ token, playerId }, index) => {
            const offset = config[index] || { x: 0, y: 0 };
            
            // Применяем сдвиг
            const newX = cellRect.left - trackRect.left + cellRect.width / 2 - 16 + offset.x;
            const newY = cellRect.top - trackRect.top + cellRect.height / 2 - 16 + offset.y;
            
            token.style.left = newX + 'px';
            token.style.top = newY + 'px';
            
            // Добавляем визуальную индикацию сдвига
            token.style.zIndex = 2000 + index; /* Фишки поверх */
            token.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
            
            console.log(`🎯 PlayerTokens: Фишка ${playerId} сдвинута на (${offset.x}, ${offset.y})`);
        });
    }
    
    /**
     * Получение сдвига для фишки
     */
    getTokenOffset(playerId, position, isInner) {
        // Находим все фишки на данной позиции
        const tokensOnPosition = [];
        this.tokens.forEach((token, id) => {
            const tokenPosition = parseInt(token.getAttribute('data-position')) || 0;
            const tokenIsInner = token.classList.contains('inner-track');
            
            if (tokenPosition === position && tokenIsInner === isInner) {
                tokensOnPosition.push({ token, playerId: id });
            }
        });
        
        // Если фишка одна, сдвиг не нужен
        if (tokensOnPosition.length <= 1) {
            return { x: 0, y: 0 };
        }
        
        // Находим индекс текущей фишки
        const currentIndex = tokensOnPosition.findIndex(t => t.playerId === playerId);
        if (currentIndex === -1) {
            return { x: 0, y: 0 };
        }
        
        // Конфигурация сдвига
        const offsetConfigs = {
            2: [
                { x: -8, y: 0 },
                { x: 8, y: 0 }
            ],
            3: [
                { x: -12, y: -6 },
                { x: 0, y: 6 },
                { x: 12, y: -6 }
            ],
            4: [
                { x: -12, y: -8 },
                { x: 12, y: -8 },
                { x: -12, y: 8 },
                { x: 12, y: 8 }
            ]
        };
        
        const config = offsetConfigs[tokensOnPosition.length] || offsetConfigs[4];
        return config[currentIndex] || { x: 0, y: 0 };
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
                
                // Проверяем коллизии и сдвигаем фишки
                this.handleTokenCollisions(stepPosition, isInner);
                
                // Рассчитываем позицию с учетом сдвига
                const offset = this.getTokenOffset(playerId, stepPosition, isInner);
                const newX = cellRect.left - trackRect.left + cellRect.width / 2 - 12 + offset.x;
                const newY = cellRect.top - trackRect.top + cellRect.height / 2 - 12 + offset.y;
                
                // Получаем текущую позицию фишки
                const currentX = parseFloat(token.style.left) || 0;
                const currentY = parseFloat(token.style.top) || 0;
                
                // Анимируем движение к следующей клетке
                this.animateTokenMovement(token, currentX, currentY, newX, newY);
                
                // Обновляем атрибут позиции
                token.setAttribute('data-position', stepPosition);
                token.setAttribute('data-update-ts', String(Date.now()));
                
                console.log(`🎯 PlayerTokens: Шаг ${stepIndex + 1}/${steps.length}: позиция ${stepPosition} со сдвигом (${offset.x}, ${offset.y})`);
                
                stepIndex++;
                
                // Переходим к следующему шагу через 200мс для быстрого отображения
                setTimeout(moveToNextStep, 200);
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
                this.positionTokenElement(token, baseCoords, offset, playersAtPosition.length);
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
        // Проверяем, не выполняется ли уже обновление
        if (this._isForceUpdating || this._forceUpdateTimer) {
            console.log('🎯 PlayerTokens: Пропускаем forceUpdate - уже выполняется или запланировано', this._isForceUpdating ? '(выполняется)' : '(запланировано)');
            return;
        }
        
        // Логируем источник вызова для отладки
        const stack = new Error().stack;
        const caller = stack ? stack.split('\n')[2]?.trim() : 'unknown';
        console.log('🎯 PlayerTokens: forceUpdate вызван из:', caller);
        
        // Устанавливаем флаг сразу, чтобы заблокировать параллельные вызовы
        this._isForceUpdating = true;
        
        // Дебаунсинг для предотвращения множественных одновременных вызовов
        this._forceUpdateTimer = setTimeout(() => {
            this._performForceUpdate();
            this._forceUpdateTimer = null;
            // Флаг будет сброшен в _performForceUpdate после завершения
        }, 150); // Увеличена задержка до 150мс для лучшей защиты
    }
    
    /**
     * Внутренний метод для выполнения принудительного обновления
     */
    _performForceUpdate() {
        // Флаг уже установлен в forceUpdate(), поэтому просто выполняем логику
        try {
            console.log('🎯 PlayerTokens: Принудительное обновление фишек');
            const players = this.getPlayers();
            
            if (players && players.length > 0) {
                console.log('🎯 PlayerTokens: Обновляем фишки для', players.length, 'игроков');
                this.updateTokens(players);
            } else {
                console.log('🎯 PlayerTokens: Игроки не найдены, пытаемся загрузить данные');
                
                // Пытаемся получить данные из GameStateManager принудительно
                if (window.app && window.app.getModule) {
                    const gameStateManager = window.app.getModule('gameStateManager');
                    if (gameStateManager && typeof gameStateManager.forceUpdate === 'function') {
                        console.log('🎯 PlayerTokens: Запускаем forceUpdate GameStateManager');
                        gameStateManager.forceUpdate();
                        
                        // Повторяем попытку через небольшую задержку
                        setTimeout(() => {
                            const updatedPlayers = this.getPlayers();
                            if (updatedPlayers && updatedPlayers.length > 0) {
                                console.log('🎯 PlayerTokens: Фишки восстановлены после forceUpdate:', updatedPlayers.length);
                                this.updateTokens(updatedPlayers);
                            }
                        }, 500);
                    }
                }
            }
        } finally {
            // Всегда сбрасываем флаг после завершения всех операций
            setTimeout(() => {
                this._isForceUpdating = false;
            }, 50); // Небольшая задержка для завершения всех операций
        }
    }
    
    /**
     * Обновление позиций всех фишек с учетом коллизий
     */
    updateAllTokenPositions() {
        console.log('🎯 PlayerTokens: Обновление всех позиций фишек с учетом коллизий');
        
        // Группируем фишки по позициям
        const positionGroups = new Map();
        
        this.tokens.forEach((token, playerId) => {
            const position = parseInt(token.getAttribute('data-position')) || 0;
            const isInner = token.classList.contains('inner-track');
            const key = `${position}-${isInner}`;
            
            if (!positionGroups.has(key)) {
                positionGroups.set(key, { position, isInner, tokens: [] });
            }
            
            positionGroups.get(key).tokens.push({ token, playerId });
        });
        
        // Обновляем позиции для каждой группы
        positionGroups.forEach(({ position, isInner, tokens }) => {
            if (tokens.length > 1) {
                console.log(`🎯 PlayerTokens: Обновляем ${tokens.length} фишек на позиции ${position}`);
                this.arrangeTokensOnPosition(tokens, position, isInner);
            }
        });
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
                isInner: Boolean(player.isInner),
                token: player.token || this.getDefaultTokenForPlayer(player, idx)
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
    positionTokenElement(token, baseCoords, offset, totalPlayers = 1) {
        if (!token) return;
        const halfSize = 16; // половина ширины/высоты токена
        token.style.left = `${baseCoords.x + offset.x - halfSize}px`;
        token.style.top = `${baseCoords.y + offset.y - halfSize}px`;
        
        // Добавляем визуальную индикацию для множественных фишек
        if (totalPlayers > 1) {
            token.style.zIndex = 2000 + Math.abs(offset.x + offset.y); /* Фишки поверх */
            token.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.4)';
            token.style.border = '2px solid rgba(255, 255, 255, 0.6)';
        } else {
            token.style.zIndex = '2000'; /* Базовый z-index */
            token.style.boxShadow = '';
            token.style.border = '';
        }
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        if (this._forceUpdateTimer) {
            clearTimeout(this._forceUpdateTimer);
            this._forceUpdateTimer = null;
        }
        
        // Сбрасываем флаг обновления
        this._isForceUpdating = false;
        
        // Очищаем коллекции
        this.tokens.clear();
        this.animatingTokens.clear();
        
        console.log('🎯 PlayerTokens: Ресурсы очищены');
    }
}

console.log('🎯 PlayerTokens: Класс определен, экспортируем в window...');
window.PlayerTokens = PlayerTokens;
console.log('🎯 PlayerTokens: Экспорт завершен, window.PlayerTokens =', !!window.PlayerTokens);
