/**
 * PlayerStatusUtils v1.0.0
 * Утилиты для работы со статусами игроков
 * Единая логика определения статусов и отображения
 */

class PlayerStatusUtils {
    /**
     * Получение статуса игрока
     * @param {Object} player - Данные игрока
     * @param {Object} activePlayer - Активный игрок
     * @param {boolean} isCurrentUser - Является ли текущим пользователем
     * @returns {string} Статус игрока
     */
    static getPlayerStatus(player, activePlayer, isCurrentUser = false) {
        if (activePlayer && activePlayer.id === player.id) {
            return '🎲'; // Ходит
        }
        
        if (player.isReady) {
            return '✅';
        }
        
        return '⏳'; // Ожидание
    }
    
    /**
     * Получение отображаемого имени игрока
     * @param {Object} player - Данные игрока
     * @returns {string} Имя для отображения
     */
    static getPlayerDisplayName(player) {
        return player.username || player.name || `Игрок ${player.id}`;
    }
    
    /**
     * Получение иконки токена игрока
     * @param {Object} player - Данные игрока
     * @returns {string} Эмодзи токена
     */
    static getPlayerToken(player) {
        // Если токен уже является эмодзи, возвращаем его
        if (player.token && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(player.token)) {
            return player.token;
        }
        
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
        
        return tokenIcons[player.token] || '🎲';
    }
    
    /**
     * Получение баланса игрока
     * @param {Object} player - Данные игрока
     * @returns {string} Форматированный баланс
     */
    static getPlayerBalance(player) {
        const balance = player.money || player.balance || 0;
        return `$${balance.toLocaleString()}`;
    }
    
    /**
     * Проверка, является ли игрок активным
     * @param {Object} player - Данные игрока
     * @param {Object} activePlayer - Активный игрок
     * @returns {boolean} Активен ли игрок
     */
    static isPlayerActive(player, activePlayer) {
        return activePlayer && activePlayer.id === player.id;
    }
    
    /**
     * Получение CSS класса для игрока
     * @param {Object} player - Данные игрока
     * @param {Object} activePlayer - Активный игрок
     * @param {boolean} isCurrentUser - Является ли текущим пользователем
     * @returns {string} CSS класс
     */
    static getPlayerCSSClass(player, activePlayer, isCurrentUser = false) {
        const classes = ['player-item'];
        
        if (this.isPlayerActive(player, activePlayer)) {
            classes.push('active');
        }
        
        if (isCurrentUser) {
            classes.push('current-user');
        }
        
        if (!player.isReady) {
            classes.push('not-ready');
        }
        
        return classes.join(' ');
    }
    
    /**
     * Получение порядка игрока в очереди
     * @param {Object} player - Данные игрока
     * @param {Array} players - Все игроки
     * @returns {number} Порядок в очереди (1-based)
     */
    static getPlayerOrder(player, players) {
        const sortedPlayers = [...players].sort((a, b) => {
            // Сортируем по готовности, затем по имени
            if (a.isReady !== b.isReady) {
                return b.isReady - a.isReady;
            }
            return (a.username || a.name || '').localeCompare(b.username || b.name || '');
        });
        
        return sortedPlayers.findIndex(p => p.id === player.id) + 1;
    }
    
    /**
     * Получение расширенного статуса игрока
     * @param {Object} player - Данные игрока
     * @param {Object} activePlayer - Активный игрок
     * @param {Array} players - Все игроки
     * @param {boolean} isCurrentUser - Является ли текущим пользователем
     * @returns {Object} Расширенная информация о статусе
     */
    static getPlayerStatusInfo(player, activePlayer, players, isCurrentUser = false) {
        const isActive = this.isPlayerActive(player, activePlayer);
        const order = this.getPlayerOrder(player, players);
        const status = this.getPlayerStatus(player, activePlayer, isCurrentUser);
        
        return {
            status,
            isActive,
            order,
            isReady: player.isReady,
            isCurrentUser,
            cssClass: this.getPlayerCSSClass(player, activePlayer, isCurrentUser)
        };
    }
    
    /**
     * Фильтрация игроков по статусу
     * @param {Array} players - Массив игроков
     * @param {string} status - Статус для фильтрации
     * @param {Object} activePlayer - Активный игрок
     * @returns {Array} Отфильтрованные игроки
     */
    static filterPlayersByStatus(players, status, activePlayer) {
        return players.filter(player => {
            const playerStatus = this.getPlayerStatus(player, activePlayer);
            return playerStatus === status;
        });
    }
    
    /**
     * Получение статистики игроков
     * @param {Array} players - Массив игроков
     * @param {Object} activePlayer - Активный игрок
     * @returns {Object} Статистика
     */
    static getPlayersStats(players, activePlayer) {
        const total = players.length;
        const ready = players.filter(p => p.isReady).length;
        const active = activePlayer ? 1 : 0;
        const waiting = total - ready - active;
        
        return {
            total,
            ready,
            active,
            waiting,
            readyPercentage: total > 0 ? Math.round((ready / total) * 100) : 0
        };
    }
    
    /**
     * Сравнение игроков для сортировки
     * @param {Object} a - Первый игрок
     * @param {Object} b - Второй игрок
     * @param {Object} activePlayer - Активный игрок
     * @returns {number} Результат сравнения
     */
    static comparePlayers(a, b, activePlayer) {
        // Активный игрок всегда первый
        if (activePlayer) {
            if (a.id === activePlayer.id) return -1;
            if (b.id === activePlayer.id) return 1;
        }
        
        // Затем готовые игроки
        if (a.isReady !== b.isReady) {
            return b.isReady - a.isReady;
        }
        
        // Затем по имени
        const nameA = a.username || a.name || '';
        const nameB = b.username || b.name || '';
        return nameA.localeCompare(nameB);
    }
    
    /**
     * Сортировка игроков
     * @param {Array} players - Массив игроков
     * @param {Object} activePlayer - Активный игрок
     * @returns {Array} Отсортированные игроки
     */
    static sortPlayers(players, activePlayer) {
        // Проверяем, что players является массивом
        if (!Array.isArray(players)) {
            console.warn('PlayerStatusUtils: players не является массивом:', typeof players, players);
            return [];
        }
        return [...players].sort((a, b) => this.comparePlayers(a, b, activePlayer));
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.PlayerStatusUtils = PlayerStatusUtils;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerStatusUtils;
}
