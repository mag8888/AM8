/**
 * BalanceSyncService v1.0.0
 * Сервис для синхронизации балансов игроков
 */

class BalanceSyncService {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        this.bankApi = config.bankApi || null;
        this.roomId = null;
        this.syncInterval = null;
        this.isSyncing = false;
        
        this.setupEventListeners();
        console.log('🔄 BalanceSyncService: Инициализирован');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        if (!this.eventBus) return;
        
        // Слушаем события перевода для синхронизации
        this.eventBus.on('bank:transfer', (data) => {
            this.handleTransferEvent(data);
        });
        
        // Слушаем обновления игроков
        this.eventBus.on('players:updated', (data) => {
            this.handlePlayersUpdate(data);
        });
        
        // Слушаем изменения комнаты
        this.eventBus.on('room:joined', (data) => {
            this.handleRoomJoined(data);
        });
        
        console.log('🔄 BalanceSyncService: Обработчики событий настроены');
    }
    
    /**
     * Обработка события перевода
     */
    handleTransferEvent(data) {
        console.log('🔄 BalanceSyncService: Обработка события перевода:', data);
        
        // Обновляем UI балансов
        this.updateBalanceDisplays();
        
        // Запускаем синхронизацию с сервером
        if (this.roomId) {
            this.syncBalances();
        }
    }
    
    /**
     * Обработка обновления игроков
     */
    handlePlayersUpdate(data) {
        console.log('🔄 BalanceSyncService: Обновление игроков:', data);
        this.updateBalanceDisplays();
    }
    
    /**
     * Обработка присоединения к комнате
     */
    handleRoomJoined(data) {
        this.roomId = data.roomId;
        console.log('🔄 BalanceSyncService: Присоединение к комнате:', this.roomId);
        
        // Запускаем периодическую синхронизацию
        this.startPeriodicSync();
        
        // Первоначальная синхронизация
        this.syncBalances();
    }
    
    /**
     * Запуск периодической синхронизации
     */
    startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Синхронизируем каждые 5 секунд
        this.syncInterval = setInterval(() => {
            this.syncBalances();
        }, 5000);
        
        console.log('🔄 BalanceSyncService: Периодическая синхронизация запущена');
    }
    
    /**
     * Остановка периодической синхронизации
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        console.log('🔄 BalanceSyncService: Периодическая синхронизация остановлена');
    }
    
    /**
     * Синхронизация балансов с сервером
     */
    async syncBalances() {
        if (this.isSyncing || !this.roomId || !this.bankApi) {
            return;
        }
        
        this.isSyncing = true;
        
        try {
            const response = await this.bankApi.syncBankData(this.roomId);
            
            if (response && response.balances) {
                this.updateLocalBalances(response.balances);
                console.log('🔄 BalanceSyncService: Балансы синхронизированы');
            }
        } catch (error) {
            console.error('❌ BalanceSyncService: Ошибка синхронизации:', error);
        } finally {
            this.isSyncing = false;
        }
    }
    
    /**
     * Обновление локальных балансов из серверных данных
     */
    updateLocalBalances(serverBalances) {
        if (!this.gameState) return;
        
        const players = this.gameState.getPlayers();
        let hasChanges = false;
        
        players.forEach(player => {
            const serverBalance = serverBalances[player.id];
            if (serverBalance !== undefined && player.money !== serverBalance) {
                console.log(`🔄 BalanceSyncService: Обновление баланса ${player.id}: ${player.money} -> ${serverBalance}`);
                player.money = serverBalance;
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            // Эмитим событие обновления для UI
            if (this.eventBus) {
                this.eventBus.emit('players:balancesUpdated', { players });
            }
            
            this.updateBalanceDisplays();
        }
    }
    
    /**
     * Обновление отображения балансов в UI
     */
    updateBalanceDisplays() {
        if (!this.gameState) return;
        
        const players = this.gameState.getPlayers();
        
        // Обновляем балансы в PlayersPanel
        players.forEach(player => {
            this.updatePlayerCardBalance(player);
        });
        
        // Обновляем баланс в BankModule если он открыт
        this.updateBankModuleBalance();
    }
    
    /**
     * Обновление баланса на карточке игрока
     */
    updatePlayerCardBalance(player) {
        // Ищем элемент карточки игрока
        const playerCard = document.querySelector(`[data-player-id="${player.id}"]`);
        if (!playerCard) return;
        
        // Ищем элемент баланса
        const balanceElement = playerCard.querySelector('.player-balance');
        if (!balanceElement) return;
        
        // Обновляем текст баланса
        const formattedBalance = this.formatNumber(player.money || 0);
        balanceElement.textContent = `💰 $${formattedBalance}`;
        
        console.log(`💰 BalanceSyncService: Обновлен баланс на карточке ${player.id}: $${formattedBalance}`);
    }
    
    /**
     * Обновление баланса в банк модуле
     */
    updateBankModuleBalance() {
        const bankModule = window.app?.getModule?.('bankModule');
        if (bankModule && typeof bankModule.updateBankData === 'function') {
            bankModule.updateBankData();
        }
    }
    
    /**
     * Форматирование чисел
     */
    formatNumber(num) {
        return new Intl.NumberFormat('ru-RU').format(num);
    }
    
    /**
     * Получение текущего баланса игрока
     */
    getPlayerBalance(playerId) {
        if (!this.gameState) return 0;
        
        const player = this.gameState.getPlayers().find(p => p.id === playerId);
        return player ? (player.money || 0) : 0;
    }
    
    /**
     * Установка баланса игрока
     */
    setPlayerBalance(playerId, balance) {
        if (!this.gameState) return false;
        
        const player = this.gameState.getPlayers().find(p => p.id === playerId);
        if (player) {
            player.money = balance;
            this.updatePlayerCardBalance(player);
            return true;
        }
        
        return false;
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        this.stopPeriodicSync();
        
        if (this.eventBus) {
            this.eventBus.off('bank:transfer');
            this.eventBus.off('players:updated');
            this.eventBus.off('room:joined');
        }
        
        console.log('🔄 BalanceSyncService: Уничтожен');
    }
}

// Экспорт для глобального использования
window.BalanceSyncService = BalanceSyncService;
