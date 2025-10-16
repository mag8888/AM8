/**
 * PlayerList v1.0.0
 * Универсальный компонент для отображения списка игроков
 * Используется в PlayersPanel и TurnController
 */

class PlayerList {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            showBalance: true,
            showStatus: true,
            showToken: true,
            showOrder: false,
            showCurrentUser: true,
            filterCurrentUser: false,
            sortBy: 'status', // 'status', 'name', 'order'
            ...options
        };
        
        if (!this.container) {
            console.error('❌ PlayerList: Контейнер не найден:', containerId);
            return;
        }
        
        console.log('👥 PlayerList: Инициализирован с опциями:', this.options);
    }
    
    /**
     * Обновление списка игроков
     * @param {Array} players - Массив игроков
     * @param {Object} activePlayer - Активный игрок
     * @param {string} currentUserId - ID текущего пользователя
     */
    updatePlayers(players, activePlayer, currentUserId = null) {
        if (!this.container) return;
        
        // Фильтруем игроков если нужно
        let displayPlayers = players;
        if (this.options.filterCurrentUser && currentUserId) {
            displayPlayers = players.filter(p => p.id !== currentUserId);
        }
        
        // Сортируем игроков
        displayPlayers = this.sortPlayers(displayPlayers, activePlayer);
        
        // Очищаем контейнер
        this.container.innerHTML = '';
        
        if (displayPlayers.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Рендерим игроков
        displayPlayers.forEach((player, index) => {
            const isCurrentUser = currentUserId && player.id === currentUserId;
            const playerElement = this.renderPlayerItem(player, activePlayer, isCurrentUser, index);
            this.container.appendChild(playerElement);
        });
        
        console.log(`👥 PlayerList: Обновлено ${displayPlayers.length} игроков`);
    }
    
    /**
     * Рендер элемента игрока
     * @param {Object} player - Данные игрока
     * @param {Object} activePlayer - Активный игрок
     * @param {boolean} isCurrentUser - Является ли текущим пользователем
     * @param {number} index - Индекс в списке
     * @returns {HTMLElement} DOM элемент игрока
     */
    renderPlayerItem(player, activePlayer, isCurrentUser, index) {
        const statusInfo = PlayerStatusUtils.getPlayerStatusInfo(player, activePlayer, [], isCurrentUser);
        const playerElement = document.createElement('div');
        playerElement.className = statusInfo.cssClass;
        playerElement.dataset.playerId = player.id;
        
        playerElement.innerHTML = this.getPlayerHTML(player, statusInfo, index);
        
        return playerElement;
    }
    
    /**
     * Получение HTML для игрока
     * @param {Object} player - Данные игрока
     * @param {Object} statusInfo - Информация о статусе
     * @param {number} index - Индекс в списке
     * @returns {string} HTML строка
     */
    getPlayerHTML(player, statusInfo, index) {
        const token = this.options.showToken ? PlayerStatusUtils.getPlayerToken(player) : '👤';
        const name = PlayerStatusUtils.getPlayerDisplayName(player);
        const status = this.options.showStatus ? statusInfo.status : '';
        const balance = this.options.showBalance ? PlayerStatusUtils.getPlayerBalance(player) : '';
        const order = this.options.showOrder ? `#${index + 1}` : '';
        
        return `
            <div class="player-avatar ${statusInfo.isActive ? 'active-avatar' : ''}">${token}</div>
            <div class="player-info">
                <div class="player-name">${name}</div>
                ${status ? `<div class="player-status">${status}</div>` : ''}
                ${order ? `<div class="player-order">${order}</div>` : ''}
            </div>
            ${balance ? `<div class="player-money">
                <span class="money-icon">💰</span>
                <span class="money-amount">${balance}</span>
            </div>` : ''}
        `;
    }
    
    /**
     * Рендер пустого состояния
     */
    renderEmptyState() {
        this.container.innerHTML = `
            <div class="no-players-message">
                <p>Нет игроков</p>
                <p>Ожидание подключения</p>
            </div>
        `;
    }
    
    /**
     * Сортировка игроков
     * @param {Array} players - Массив игроков
     * @param {Object} activePlayer - Активный игрок
     * @returns {Array} Отсортированные игроки
     */
    sortPlayers(players, activePlayer) {
        switch (this.options.sortBy) {
            case 'status':
                return PlayerStatusUtils.sortPlayers(players, activePlayer);
            case 'name':
                return [...players].sort((a, b) => {
                    const nameA = PlayerStatusUtils.getPlayerDisplayName(a);
                    const nameB = PlayerStatusUtils.getPlayerDisplayName(b);
                    return nameA.localeCompare(nameB);
                });
            case 'order':
                return [...players].sort((a, b) => {
                    const orderA = PlayerStatusUtils.getPlayerOrder(a, players);
                    const orderB = PlayerStatusUtils.getPlayerOrder(b, players);
                    return orderA - orderB;
                });
            default:
                return players;
        }
    }
    
    /**
     * Обновление конкретного игрока
     * @param {Object} player - Данные игрока
     * @param {Object} activePlayer - Активный игрок
     * @param {string} currentUserId - ID текущего пользователя
     */
    updatePlayer(player, activePlayer, currentUserId = null) {
        const playerElement = this.container.querySelector(`[data-player-id="${player.id}"]`);
        if (!playerElement) return;
        
        const isCurrentUser = currentUserId && player.id === currentUserId;
        const statusInfo = PlayerStatusUtils.getPlayerStatusInfo(player, activePlayer, [], isCurrentUser);
        
        // Обновляем классы
        playerElement.className = statusInfo.cssClass;
        
        // Обновляем содержимое
        const avatar = playerElement.querySelector('.player-avatar');
        const name = playerElement.querySelector('.player-name');
        const status = playerElement.querySelector('.player-status');
        const balance = playerElement.querySelector('.money-amount');
        
        if (avatar && this.options.showToken) {
            avatar.textContent = PlayerStatusUtils.getPlayerToken(player);
        }
        
        if (name) {
            name.textContent = PlayerStatusUtils.getPlayerDisplayName(player);
        }
        
        if (status && this.options.showStatus) {
            status.textContent = statusInfo.status;
        }
        
        if (balance && this.options.showBalance) {
            balance.textContent = PlayerStatusUtils.getPlayerBalance(player);
        }
    }
    
    /**
     * Подсветка активного игрока
     * @param {string} playerId - ID активного игрока
     */
    highlightActivePlayer(playerId) {
        // Убираем подсветку со всех игроков
        this.container.querySelectorAll('.player-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Подсвечиваем активного игрока
        const activeElement = this.container.querySelector(`[data-player-id="${playerId}"]`);
        if (activeElement) {
            activeElement.classList.add('active');
        }
    }
    
    /**
     * Получение статистики игроков
     * @param {Array} players - Массив игроков
     * @param {Object} activePlayer - Активный игрок
     * @returns {Object} Статистика
     */
    getPlayersStats(players, activePlayer) {
        return PlayerStatusUtils.getPlayersStats(players, activePlayer);
    }
    
    /**
     * Обновление опций
     * @param {Object} newOptions - Новые опции
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        console.log('👥 PlayerList: Опции обновлены:', this.options);
    }
    
    /**
     * Очистка списка
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    
    /**
     * Уничтожение компонента
     */
    destroy() {
        this.clear();
        console.log('👥 PlayerList: Уничтожен');
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.PlayerList = PlayerList;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerList;
}
