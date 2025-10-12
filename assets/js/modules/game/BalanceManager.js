/**
 * BalanceManager - Единый источник истины для балансов игроков
 * Управляет отображением и синхронизацией балансов между различными источниками данных
 * 
 * @version 1.0.0
 * @author Client-side Team
 */

class BalanceManager {
    /**
     * Конструктор BalanceManager
     * @param {Object} config - Конфигурация
     * @param {GameState} config.gameState - Instance GameState (опционально)
     */
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.balances = {}; // Формат: { [userId]: { amount, source, timestamp } }
        this.lastRefreshTime = 0;
        this.currentUserId = null; // ID текущего пользователя
        
        // Регистрация слушателя на gameState.on('change') если есть gameState
        if (this.gameState) {
            this.setupGameStateListener();
        }
        
        // Инициализация текущего пользователя
        this.initCurrentUser();
        
        console.log('✅ BalanceManager инициализирован');
    }
    
    /**
     * Настройка слушателя изменений GameState
     */
    setupGameStateListener() {
        if (this.gameState && typeof this.gameState.on === 'function') {
            this.gameState.on('change', (data) => {
                if (data.players) {
                    this.refreshFromGameState(data.players);
                }
            });
        }
    }
    
    /**
     * Инициализация текущего пользователя
     */
    initCurrentUser() {
        try {
            const userData = localStorage.getItem('aura_money_user');
            if (userData) {
                const user = JSON.parse(userData);
                this.currentUserId = user.id;
            }
        } catch (error) {
            console.warn('⚠️ BalanceManager: Ошибка получения текущего пользователя:', error);
        }
    }
    
    /**
     * Обновление баланса конкретного игрока
     * @param {string} userId - ID игрока
     * @param {number} newBalance - Новая сумма баланса
     * @param {string} source - Источник обновления ('game-state', 'bank-api', 'manual')
     */
    updateBalance(userId, newBalance, source = 'manual') {
        // Валидация входных данных
        if (!userId || userId === '' || userId === null) {
            console.warn('⚠️ BalanceManager: Некорректный userId:', userId);
            return;
        }
        
        if (newBalance == null || isNaN(newBalance)) {
            console.warn('⚠️ BalanceManager: Некорректный баланс:', newBalance);
            newBalance = 0;
        }
        
        // Приведение к числу
        newBalance = Number(newBalance);
        
        const now = Date.now();
        const currentBalance = this.balances[userId];
        
        // Проверка изменений и свежести данных
        if (currentBalance) {
            const isFresh = (now - currentBalance.timestamp) < 3000; // Данные свежее 3 секунд
            const unchanged = currentBalance.amount === newBalance; // Баланс не изменился
            
            if (isFresh && unchanged) {
                console.log(`⚠️ BalanceManager: Пропуск обновления для ${userId} (unchanged, fresh)`);
                return;
            }
        }
        
        // Обновление баланса
        this.balances[userId] = {
            amount: newBalance,
            source: source,
            timestamp: now
        };
        
        // Обновление UI элементов
        this.updateUI(userId, newBalance);
        
        console.log(`💰 BalanceManager: ${userId} обновлен до ${newBalance} (${source})`);
    }
    
    /**
     * Получение текущего баланса игрока
     * @param {string} userId - ID игрока
     * @returns {number} - Баланс или 0 если не найден
     */
    getBalance(userId) {
        if (!userId) return 0;
        return this.balances[userId]?.amount || 0;
    }
    
    /**
     * Массовое обновление балансов из game state
     * @param {Array} players - Массив игроков с полем cash
     */
    refreshFromGameState(players) {
        const now = Date.now();
        
        // Debounce - не чаще 5 секунд
        const timeSinceLastRefresh = now - this.lastRefreshTime;
        if (timeSinceLastRefresh < 5000) {
            return;
        }
        
        if (!Array.isArray(players)) {
            console.warn('⚠️ BalanceManager: Некорректный массив игроков:', players);
            return;
        }
        
        let updatedCount = 0;
        
        // Итерация по всем игрокам
        players.forEach(player => {
            if (player && player.id && typeof player.cash === 'number') {
                this.updateBalance(player.id, player.cash, 'game-state');
                updatedCount++;
            }
        });
        
        // Обновление времени последнего обновления
        this.lastRefreshTime = now;
        
        if (updatedCount > 0) {
            console.log(`🔄 BalanceManager: Обновлены балансы для ${updatedCount} игроков`);
        }
    }
    
    /**
     * Получение всех балансов
     * @returns {Object} - Все балансы в формате { [userId]: { amount, source, timestamp } }
     */
    getAllBalances() {
        return { ...this.balances };
    }
    
    /**
     * Очистка всех балансов
     */
    clearBalances() {
        this.balances = {};
        this.lastRefreshTime = 0;
        console.log('🧹 BalanceManager: Все балансы очищены');
    }
    
    /**
     * Проверка свежести данных
     * @param {string} userId - ID игрока
     * @returns {boolean} - true если данные свежее 3 секунд
     */
    isDataFresh(userId) {
        const balance = this.balances[userId];
        if (!balance || !balance.timestamp) return false;
        return (Date.now() - balance.timestamp) < 3000;
    }
    
    /**
     * Обновление UI элементов
     * @param {string} userId - ID игрока
     * @param {number} newBalance - Новый баланс
     */
    updateUI(userId, newBalance) {
        const formattedBalance = `$${newBalance.toLocaleString()}`;
        
        // 1. Обновление панели игрока
        const playerCard = document.querySelector(`[data-user-id="${userId}"]`);
        const balanceElement = playerCard?.querySelector('.player-balance');
        if (balanceElement) {
            balanceElement.textContent = formattedBalance;
        }
        
        // 2. Обновление правой панели для текущего пользователя
        if (userId === this.currentUserId) {
            const rightPanelBalance = document.querySelector('.right-panel .balance');
            if (rightPanelBalance) {
                rightPanelBalance.textContent = formattedBalance;
            }
        }
        
        // 3. Обновление карточек игроков в меню ходов
        const playerDisplay = document.querySelector(`[data-player-id="${userId}"] .player-balance`);
        if (playerDisplay) {
            playerDisplay.textContent = formattedBalance;
        }
        
        // 4. Обновление статуса в игровых операциях
        const gameOperationsBalance = document.querySelector('.game-operations-card .player-balance');
        if (gameOperationsBalance && userId === this.currentUserId) {
            gameOperationsBalance.textContent = formattedBalance;
        }
        
        // 5. Добавление анимации изменения баланса
        this.animateBalanceChange(userId, newBalance);
    }
    
    /**
     * Анимация изменения баланса
     * @param {string} userId - ID игрока
     * @param {number} newBalance - Новый баланс
     */
    animateBalanceChange(userId, newBalance) {
        const elements = document.querySelectorAll(`[data-user-id="${userId}"] .player-balance, [data-player-id="${userId}"] .player-balance`);
        
        elements.forEach(element => {
            if (element) {
                element.classList.add('balance-updated');
                setTimeout(() => {
                    element.classList.remove('balance-updated');
                }, 1000);
            }
        });
    }
    
    /**
     * Получение статистики балансов
     * @returns {Object} - Статистика по балансам
     */
    getStats() {
        const balances = Object.values(this.balances);
        if (balances.length === 0) {
            return {
                totalPlayers: 0,
                totalBalance: 0,
                averageBalance: 0,
                minBalance: 0,
                maxBalance: 0
            };
        }
        
        const amounts = balances.map(b => b.amount);
        const totalBalance = amounts.reduce((sum, amount) => sum + amount, 0);
        
        return {
            totalPlayers: balances.length,
            totalBalance: totalBalance,
            averageBalance: Math.round(totalBalance / balances.length),
            minBalance: Math.min(...amounts),
            maxBalance: Math.max(...amounts)
        };
    }
    
    /**
     * Получение истории изменений баланса (базовая реализация)
     * @param {string} userId - ID игрока
     * @returns {Array} - История изменений
     */
    getBalanceHistory(userId) {
        // Базовая реализация - можно расширить для полноценной истории
        const balance = this.balances[userId];
        if (!balance) return [];
        
        return [{
            amount: balance.amount,
            source: balance.source,
            timestamp: balance.timestamp,
            date: new Date(balance.timestamp).toISOString()
        }];
    }
    
    /**
     * Проверка достаточности средств
     * @param {string} userId - ID игрока
     * @param {number} requiredAmount - Требуемая сумма
     * @returns {boolean} - true если средств достаточно
     */
    hasEnoughMoney(userId, requiredAmount) {
        const balance = this.getBalance(userId);
        return balance >= requiredAmount;
    }
    
    /**
     * Получение баланса с форматированием
     * @param {string} userId - ID игрока
     * @returns {string} - Отформатированный баланс
     */
    getFormattedBalance(userId) {
        const balance = this.getBalance(userId);
        return `$${balance.toLocaleString()}`;
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        // Отписка от gameState events
        if (this.gameState && typeof this.gameState.off === 'function') {
            this.gameState.off('change');
        }
        
        // Очистка данных
        this.clearBalances();
        
        // Сброс ссылок
        this.gameState = null;
        this.currentUserId = null;
        
        console.log('🗑️ BalanceManager: Ресурсы очищены');
    }
}

// Глобальный доступ
if (typeof window !== 'undefined') {
    window.BalanceManager = BalanceManager;
}

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BalanceManager;
}
