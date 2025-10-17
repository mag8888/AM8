/**
 * PlayerBalanceDisplay v1.0.0
 * Компонент для отображения баланса игроков на карточках
 */

class PlayerBalanceDisplay {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.roomApi = config.roomApi || null;
        this.currentRoomId = null;
        
        this.setupEventListeners();
        this.init();
        
        console.log('💰 PlayerBalanceDisplay: Инициализирован');
    }
    
    /**
     * Инициализация
     */
    init() {
        this.currentRoomId = this._getCurrentRoomId();
        if (this.currentRoomId) {
            this.loadBalancesFromServer();
        }
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (!this.eventBus) return;
        
        // Обновление баланса при переводах
        this.eventBus.on('bank:transferCompleted', (data) => {
            this.updatePlayerBalance(data.fromPlayer.id, data.fromPlayer.money);
            this.updatePlayerBalance(data.toPlayer.id, data.toPlayer.money);
        });
        
        // Обновление при изменении состояния игры
        this.eventBus.on('game:stateUpdated', (state) => {
            this.updateAllBalances(state.players);
        });
        
        // Обновление при изменении позиций игроков
        this.eventBus.on('players:positionsUpdated', (data) => {
            this.updateAllBalances(data.players);
        });
        
        // Push-уведомления от сервера
        this.eventBus.on('push:message', (message) => {
            if (message.type === 'bank_transfer' || message.type === 'bank_balanceUpdated') {
                this.handleServerUpdate(message);
            }
        });
    }
    
    /**
     * Обновление баланса конкретного игрока
     */
    updatePlayerBalance(playerId, newBalance) {
        const playerCard = this.findPlayerCard(playerId);
        if (!playerCard) {
            console.warn('⚠️ PlayerBalanceDisplay: Карточка игрока не найдена:', playerId);
            return;
        }
        
        const balanceElement = playerCard.querySelector('.player-balance');
        if (balanceElement) {
            const oldBalance = balanceElement.textContent;
            balanceElement.textContent = this.formatNumber(newBalance);
            
            // Анимация изменения
            this.animateBalanceChange(balanceElement, oldBalance, newBalance);
            
            console.log(`💰 PlayerBalanceDisplay: Баланс обновлен ${playerId}: ${oldBalance} -> ${this.formatNumber(newBalance)}`);
        }
    }
    
    /**
     * Обновление балансов всех игроков
     */
    updateAllBalances(players) {
        if (!players || !Array.isArray(players)) return;
        
        players.forEach(player => {
            if (player.id && player.money !== undefined) {
                this.updatePlayerBalance(player.id, player.money);
            }
        });
    }
    
    /**
     * Поиск карточки игрока по ID
     */
    findPlayerCard(playerId) {
        // Ищем по data-player-id
        let card = document.querySelector(`[data-player-id="${playerId}"]`);
        if (card) return card;
        
        // Ищем по data-id
        card = document.querySelector(`[data-id="${playerId}"]`);
        if (card) return card;
        
        // Ищем по классу и тексту
        const playerCards = document.querySelectorAll('.player-card, .player-item, .player-list-item');
        for (const card of playerCards) {
            const usernameElement = card.querySelector('.player-name, .username, .player-username');
            if (usernameElement) {
                const username = usernameElement.textContent.trim();
                if (this.isPlayerCard(playerId, username, card)) {
                    return card;
                }
            }
        }
        
        // Если карточка не найдена, попробуем найти через PlayerList
        if (window.PlayerList) {
            const playerListContainers = document.querySelectorAll('[id*="player"], [id*="turn-controller"]');
            for (const container of playerListContainers) {
                const playerList = container.playerList || container._playerList;
                if (playerList && typeof playerList.findPlayerCard === 'function') {
                    const foundCard = playerList.findPlayerCard(playerId);
                    if (foundCard) return foundCard;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Проверка, является ли карточка нужным игроком
     */
    isPlayerCard(playerId, username, card) {
        // Пытаемся найти ID в атрибутах или данных
        if (card.dataset.playerId === playerId || card.dataset.id === playerId) {
            return true;
        }
        
        // Если есть gameState, проверяем по username
        if (this.gameState) {
            const player = this.gameState.getPlayers().find(p => 
                p.username === username && p.id === playerId
            );
            return !!player;
        }
        
        return false;
    }
    
    /**
     * Анимация изменения баланса
     */
    animateBalanceChange(element, oldBalance, newBalance) {
        const oldValue = this.parseNumber(oldBalance);
        const newValue = this.parseNumber(newBalance);
        
        if (oldValue === newValue) return;
        
        // Добавляем класс анимации
        element.classList.add('balance-changing');
        
        // Определяем цвет анимации
        if (newValue > oldValue) {
            element.classList.add('balance-increase');
        } else if (newValue < oldValue) {
            element.classList.add('balance-decrease');
        }
        
        // Убираем классы через 2 секунды
        setTimeout(() => {
            element.classList.remove('balance-changing', 'balance-increase', 'balance-decrease');
        }, 2000);
    }
    
    /**
     * Загрузка балансов с сервера
     */
    async loadBalancesFromServer() {
        if (!this.currentRoomId) return;
        
        try {
            const response = await fetch(`/api/bank/room-balances/${this.currentRoomId}`);
            const result = await response.json();
            
            if (result.success && result.data.balances) {
                result.data.balances.forEach(playerBalance => {
                    this.updatePlayerBalance(playerBalance.playerId, playerBalance.balance);
                });
                
                console.log('💰 PlayerBalanceDisplay: Балансы загружены с сервера');
            }
        } catch (error) {
            console.error('❌ PlayerBalanceDisplay: Ошибка загрузки балансов:', error);
        }
    }
    
    /**
     * Обработка обновлений с сервера
     */
    handleServerUpdate(message) {
        if (message.type === 'bank_transfer') {
            // Обновляем балансы участников перевода
            const transaction = message.transaction;
            if (transaction) {
                // Находим игроков в данных
                const fromPlayer = message.players?.find(p => p.id === transaction.fromPlayerId);
                const toPlayer = message.players?.find(p => p.id === transaction.toPlayerId);
                
                if (fromPlayer) {
                    this.updatePlayerBalance(fromPlayer.id, fromPlayer.money);
                }
                if (toPlayer) {
                    this.updatePlayerBalance(toPlayer.id, toPlayer.money);
                }
            }
        } else if (message.type === 'bank_balanceUpdated') {
            // Обновляем баланс конкретного игрока
            this.updatePlayerBalance(message.playerId, message.newBalance);
        }
    }
    
    /**
     * Создание элемента баланса для карточки
     */
    createBalanceElement(balance = 0) {
        const balanceElement = document.createElement('div');
        balanceElement.className = 'player-balance';
        balanceElement.innerHTML = `
            <span class="balance-icon">💰</span>
            <span class="balance-amount">$${this.formatNumber(balance)}</span>
        `;
        
        // Добавляем стили
        this.addBalanceStyles();
        
        return balanceElement;
    }
    
    /**
     * Добавление стилей для баланса
     */
    addBalanceStyles() {
        if (document.getElementById('player-balance-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'player-balance-styles';
        styles.textContent = `
            .player-balance {
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: 600;
                color: #10b981;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }
            
            .balance-icon {
                font-size: 0.8rem;
            }
            
            .balance-amount {
                font-family: 'Courier New', monospace;
            }
            
            .balance-changing {
                animation: balancePulse 0.5s ease-in-out;
            }
            
            .balance-increase {
                color: #10b981 !important;
                text-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
            }
            
            .balance-decrease {
                color: #ef4444 !important;
                text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
            }
            
            @keyframes balancePulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            /* Интеграция с карточками игроков */
            .player-card .player-balance,
            .player-item .player-balance {
                margin-left: auto;
                padding: 4px 8px;
                background: rgba(16, 185, 129, 0.1);
                border-radius: 6px;
                border: 1px solid rgba(16, 185, 129, 0.2);
            }
            
            .player-card:hover .player-balance,
            .player-item:hover .player-balance {
                background: rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.3);
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Получение ID текущей комнаты
     */
    _getCurrentRoomId() {
        try {
            // Пытаемся получить из URL
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            const roomId = urlParams.get('roomId');
            if (roomId) return roomId;
            
            // Пытаемся получить из sessionStorage
            const roomData = sessionStorage.getItem('am_current_room');
            if (roomData) {
                const parsed = JSON.parse(roomData);
                return parsed.id || parsed.roomId;
            }
            
            return null;
        } catch (error) {
            console.error('❌ PlayerBalanceDisplay: Ошибка получения ID комнаты:', error);
            return null;
        }
    }
    
    /**
     * Парсинг числа из строки
     */
    parseNumber(str) {
        if (typeof str === 'number') return str;
        const cleaned = str.replace(/[^\d.-]/g, '');
        return parseFloat(cleaned) || 0;
    }
    
    /**
     * Форматирование чисел
     */
    formatNumber(num) {
        return new Intl.NumberFormat('ru-RU').format(num);
    }
    
    /**
     * Принудительное обновление всех балансов
     */
    forceUpdate() {
        if (this.gameState) {
            const players = this.gameState.getPlayers();
            this.updateAllBalances(players);
        }
        
        if (this.currentRoomId) {
            this.loadBalancesFromServer();
        }
    }
    
    /**
     * Добавление баланса к существующей карточке
     */
    attachBalanceToCard(playerCard, playerId, balance = 0) {
        if (!playerCard) return;
        
        // Проверяем, есть ли уже баланс
        let balanceElement = playerCard.querySelector('.player-balance');
        if (!balanceElement) {
            balanceElement = this.createBalanceElement(balance);
            
            // Находим место для вставки
            const statusElement = playerCard.querySelector('.player-status, .status');
            if (statusElement) {
                statusElement.parentNode.insertBefore(balanceElement, statusElement.nextSibling);
            } else {
                playerCard.appendChild(balanceElement);
            }
        }
        
        // Устанавливаем ID игрока для поиска
        playerCard.setAttribute('data-player-id', playerId);
        
        // Обновляем баланс
        this.updatePlayerBalance(playerId, balance);
    }
}

// Экспорт для глобального использования
window.PlayerBalanceDisplay = PlayerBalanceDisplay;
