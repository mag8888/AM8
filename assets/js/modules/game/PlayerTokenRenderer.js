/**
 * PlayerTokenRenderer v1.0.0
 * Рендерер фишек игроков на игровом поле
 */

class PlayerTokenRenderer {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.movementService = config.movementService || null;
        
        this.tokens = new Map(); // Хранилище фишек игроков
        this.colors = [
            '#ef4444', // Красный
            '#3b82f6', // Синий
            '#10b981', // Зеленый
            '#f59e0b', // Желтый
            '#8b5cf6', // Фиолетовый
            '#06b6d4', // Голубой
            '#f97316', // Оранжевый
            '#84cc16'  // Лайм
        ];
        
        console.log('🎯 PlayerTokenRenderer: Инициализирован');
        this.setupEventListeners();
    }
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('movement:step', this.handleMovementStep.bind(this));
            this.eventBus.on('movement:completed', this.handleMovementCompleted.bind(this));
            this.eventBus.on('game:player_joined', this.handlePlayerJoined.bind(this));
            this.eventBus.on('game:player_left', this.handlePlayerLeft.bind(this));
        }
    }
    
    /**
     * Обработка шага движения
     */
    handleMovementStep(event) {
        const { playerId, step, position, isFinal } = event;
        this.animateTokenMovement(playerId, position, isFinal);
    }
    
    /**
     * Обработка завершения движения
     */
    handleMovementCompleted(event) {
        const { playerId, endPosition } = event;
        this.updateTokenPosition(playerId, endPosition);
    }
    
    /**
     * Обработка присоединения игрока
     */
    handlePlayerJoined(player) {
        this.createToken(player);
    }
    
    /**
     * Обработка выхода игрока
     */
    handlePlayerLeft(playerId) {
        this.removeToken(playerId);
    }
    
    /**
     * Анимация движения фишки
     */
    animateTokenMovement(playerId, position, isFinal = false) {
        const tokenElement = this.tokens.get(playerId);
        if (!tokenElement) return;
        
        // Получаем координаты целевой клетки
        const targetCell = this.getCellCoordinates(position);
        if (!targetCell) return;
        
        // Анимируем движение
        tokenElement.style.transition = isFinal ? 'all 0.5s ease-in-out' : 'all 0.3s ease-in-out';
        tokenElement.style.transform = `translate(${targetCell.x}px, ${targetCell.y}px)`;
        
        // Добавляем эффект движения
        if (!isFinal) {
            tokenElement.classList.add('moving');
        } else {
            setTimeout(() => {
                tokenElement.classList.remove('moving');
            }, 500);
        }
    }
    
    /**
     * Получение координат клетки
     */
    getCellCoordinates(position) {
        const { track, position: cellIndex } = position;
        
        if (track === 'outer') {
            return this.getOuterCellCoordinates(cellIndex);
        } else if (track === 'inner') {
            return this.getInnerCellCoordinates(cellIndex);
        }
        
        return null;
    }
    
    /**
     * Получение координат внешней клетки
     */
    getOuterCellCoordinates(cellIndex) {
        // Упрощенная логика для внешнего круга
        const angle = (cellIndex / 44) * 2 * Math.PI - Math.PI / 2;
        const radius = 200; // Радиус внешнего круга
        const centerX = 350; // Центр поля
        const centerY = 350;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        return { x: x - 15, y: y - 15 }; // Смещение для центрирования фишки
    }
    
    /**
     * Получение координат внутренней клетки
     */
    getInnerCellCoordinates(cellIndex) {
        // Упрощенная логика для внутреннего круга
        const angle = (cellIndex / 23) * 2 * Math.PI - Math.PI / 2;
        const radius = 120; // Радиус внутреннего круга
        const centerX = 350; // Центр поля
        const centerY = 350;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        return { x: x - 15, y: y - 15 }; // Смещение для центрирования фишки
    }
    
    /**
     * Обновление позиции фишки
     */
    updateTokenPosition(playerId, position) {
        const tokenElement = this.tokens.get(playerId);
        if (!tokenElement) return;
        
        const coordinates = this.getCellCoordinates(position);
        if (coordinates) {
            tokenElement.style.transform = `translate(${coordinates.x}px, ${coordinates.y}px)`;
        }
    }
    
    /**
     * Создание фишки игрока
     * @param {Object} player - Данные игрока
     * @param {string} player.id - ID игрока
     * @param {string} player.username - Имя игрока
     * @param {string} player.token - Выбранный токен (эмодзи)
     * @param {number} player.position - Позиция на поле
     * @param {boolean} player.isActive - Активен ли игрок
     * @returns {HTMLElement} Элемент фишки
     */
    createToken(player) {
        const tokenId = `token-${player.id}`;
        const colorIndex = Array.from(this.tokens.keys()).length % this.colors.length;
        const color = this.colors[colorIndex];
        
        // Создаем элемент фишки
        const tokenElement = document.createElement('div');
        tokenElement.className = 'player-token';
        tokenElement.id = tokenId;
        tokenElement.dataset.playerId = player.id;
        tokenElement.dataset.position = player.position || 0;
        
        // Стили фишки
        tokenElement.style.cssText = `
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid ${color};
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 100;
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        // Добавляем эмодзи токена
        tokenElement.textContent = player.token || '🎯';
        
        // Добавляем анимацию для активного игрока
        if (player.isActive) {
            tokenElement.classList.add('active');
            tokenElement.style.animation = 'pulse 2s infinite';
            tokenElement.style.boxShadow = `0 0 0 4px ${color}40, 0 2px 8px rgba(0, 0, 0, 0.3)`;
        }
        
        // Сохраняем в хранилище
        this.tokens.set(player.id, {
            element: tokenElement,
            player: player,
            color: color,
            position: player.position || 0
        });
        
        console.log(`🎯 PlayerTokenRenderer: Создана фишка для игрока ${player.username}`);
        return tokenElement;
    }
    
    /**
     * Обновление позиции фишки игрока
     * @param {string} playerId - ID игрока
     * @param {number} newPosition - Новая позиция
     */
    updatePosition(playerId, newPosition) {
        const tokenData = this.tokens.get(playerId);
        if (!tokenData) {
            console.warn(`⚠️ PlayerTokenRenderer: Фишка игрока ${playerId} не найдена`);
            return;
        }
        
        const { element, player } = tokenData;
        const oldPosition = tokenData.position;
        
        // Обновляем позицию в данных
        tokenData.position = newPosition;
        player.position = newPosition;
        element.dataset.position = newPosition;
        
        // Получаем координаты новой позиции
        const newCoords = this.getCellCoordinates(newPosition);
        if (newCoords) {
            // Анимация перемещения
            element.style.transition = 'all 0.5s ease-in-out';
            element.style.left = `${newCoords.x}px`;
            element.style.top = `${newCoords.y}px`;
            
            console.log(`🎯 PlayerTokenRenderer: Игрок ${player.username} перемещен с ${oldPosition} на ${newPosition}`);
        }
    }
    
    /**
     * Обновление статуса активности игрока
     * @param {string} playerId - ID игрока
     * @param {boolean} isActive - Активен ли игрок
     */
    setActive(playerId, isActive) {
        const tokenData = this.tokens.get(playerId);
        if (!tokenData) return;
        
        const { element, color } = tokenData;
        
        if (isActive) {
            element.classList.add('active');
            element.style.animation = 'pulse 2s infinite';
            element.style.boxShadow = `0 0 0 4px ${color}40, 0 2px 8px rgba(0, 0, 0, 0.3)`;
        } else {
            element.classList.remove('active');
            element.style.animation = '';
            element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        }
    }
    
    /**
     * Получение координат клетки по позиции
     * @param {number} position - Позиция на поле
     * @returns {Object} Координаты {x, y}
     */
    getCellCoordinates(position) {
        // Получаем все клетки игрового поля
        const outerCells = document.querySelectorAll('#outer-track .track-cell');
        const innerCells = document.querySelectorAll('#inner-track .track-cell');
        
        // Определяем, в каком треке находится позиция
        let targetCell;
        if (position < outerCells.length) {
            // Внешний трек
            targetCell = outerCells[position];
        } else {
            // Внутренний трек
            const innerPosition = position - outerCells.length;
            targetCell = innerCells[innerPosition];
        }
        
        if (!targetCell) {
            console.warn(`⚠️ PlayerTokenRenderer: Клетка с позицией ${position} не найдена`);
            return null;
        }
        
        // Получаем позицию клетки относительно игрового поля
        const boardWrapper = document.querySelector('.board-wrapper');
        const cellRect = targetCell.getBoundingClientRect();
        const boardRect = boardWrapper.getBoundingClientRect();
        
        // Центрируем фишку в клетке
        const cellCenterX = cellRect.left - boardRect.left + (cellRect.width / 2) - 16; // 16 = половина размера фишки
        const cellCenterY = cellRect.top - boardRect.top + (cellRect.height / 2) - 16;
        
        return {
            x: cellCenterX,
            y: cellCenterY
        };
    }
    
    /**
     * Размещение фишки на игровом поле
     * @param {HTMLElement} tokenElement - Элемент фишки
     * @param {number} position - Позиция на поле
     */
    placeToken(tokenElement, position) {
        const boardWrapper = document.querySelector('.board-wrapper');
        if (!boardWrapper) {
            console.error('❌ PlayerTokenRenderer: Игровое поле не найдено');
            return;
        }
        
        // Получаем координаты позиции
        const coords = this.getCellCoordinates(position);
        if (!coords) return;
        
        // Устанавливаем позицию
        tokenElement.style.left = `${coords.x}px`;
        tokenElement.style.top = `${coords.y}px`;
        
        // Добавляем на игровое поле
        boardWrapper.appendChild(tokenElement);
    }
    
    /**
     * Рендер всех фишек игроков
     * @param {Array} players - Массив игроков
     */
    renderPlayers(players) {
        // Очищаем существующие фишки
        this.clearAllTokens();
        
        // Создаем и размещаем фишки для каждого игрока
        players.forEach((player, index) => {
            const tokenElement = this.createToken({
                ...player,
                position: player.position || index, // Начальная позиция
                isActive: player.isActive || false
            });
            
            this.placeToken(tokenElement, player.position || index);
        });
        
        console.log(`🎯 PlayerTokenRenderer: Отображено ${players.length} фишек игроков`);
    }
    
    /**
     * Обновление всех фишек
     * @param {Array} players - Обновленные данные игроков
     */
    updatePlayers(players) {
        players.forEach(player => {
            const tokenData = this.tokens.get(player.id);
            if (tokenData) {
                // Обновляем позицию
                if (player.position !== undefined && player.position !== tokenData.position) {
                    this.updatePosition(player.id, player.position);
                }
                
                // Обновляем статус активности
                this.setActive(player.id, player.isActive || false);
            } else {
                // Создаем новую фишку
                const tokenElement = this.createToken(player);
                this.placeToken(tokenElement, player.position || 0);
            }
        });
        
        console.log('🎯 PlayerTokenRenderer: Фишки игроков обновлены');
    }
    
    /**
     * Удаление фишки игрока
     * @param {string} playerId - ID игрока
     */
    removeToken(playerId) {
        const tokenData = this.tokens.get(playerId);
        if (!tokenData) return;
        
        tokenData.element.remove();
        this.tokens.delete(playerId);
        
        console.log(`🎯 PlayerTokenRenderer: Фишка игрока ${playerId} удалена`);
    }
    
    /**
     * Очистка всех фишек
     */
    clearAllTokens() {
        this.tokens.forEach(tokenData => {
            tokenData.element.remove();
        });
        this.tokens.clear();
        
        console.log('🎯 PlayerTokenRenderer: Все фишки очищены');
    }
    
    /**
     * Получение данных фишки
     * @param {string} playerId - ID игрока
     * @returns {Object} Данные фишки
     */
    getToken(playerId) {
        return this.tokens.get(playerId);
    }
    
    /**
     * Получение всех фишек
     * @returns {Map} Все фишки
     */
    getAllTokens() {
        return this.tokens;
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.PlayerTokenRenderer = PlayerTokenRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerTokenRenderer;
}
