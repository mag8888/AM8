/**
 * BankApi v1.0.0
 * API для банковских операций с серверной синхронизацией
 */

class BankApi {
    constructor() {
        this.baseUrl = '/api/bank';
        this.headers = {
            'Content-Type': 'application/json'
        };
        
        console.log('🏦 BankApi: Инициализирован');
    }
    
    /**
     * Получение заголовков с авторизацией
     */
    getHeaders() {
        const token = localStorage.getItem('aura_money_token');
        const userId = localStorage.getItem('aura_money_user_id');
        
        return {
            ...this.headers,
            'Authorization': `Bearer ${token}`,
            'x-user-id': userId
        };
    }
    
    /**
     * Выполнение HTTP запроса
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка запроса ${endpoint}:`, error);
            throw error;
        }
    }
    
    /**
     * Получение баланса игрока
     */
    async getPlayerBalance(playerId) {
        try {
            const response = await this.request(`/balance/${playerId}`);
            console.log(`💰 BankApi: Получен баланс игрока ${playerId}:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка получения баланса игрока ${playerId}:`, error);
            throw error;
        }
    }
    
    /**
     * Получение балансов всех игроков в комнате
     */
    async getAllBalances(roomId) {
        try {
            const response = await this.request(`/balances/${roomId}`);
            console.log(`💰 BankApi: Получены балансы комнаты ${roomId}:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка получения балансов комнаты ${roomId}:`, error);
            throw error;
        }
    }
    
    /**
     * Перевод средств между игроками
     */
    async transferMoney(fromPlayerId, toPlayerId, amount, roomId) {
        try {
            const response = await this.request('/transfer', {
                method: 'POST',
                body: JSON.stringify({
                    fromPlayerId: fromPlayerId,
                    toPlayerId: toPlayerId,
                    amount: amount,
                    roomId: roomId,
                    timestamp: new Date().toISOString()
                })
            });
            
            console.log(`💸 BankApi: Перевод выполнен:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка перевода:`, error);
            throw error;
        }
    }
    
    /**
     * Обновление баланса игрока
     */
    async updatePlayerBalance(playerId, newBalance, roomId, reason = 'manual') {
        try {
            const response = await this.request('/balance', {
                method: 'PUT',
                body: JSON.stringify({
                    playerId: playerId,
                    balance: newBalance,
                    roomId: roomId,
                    reason: reason,
                    timestamp: new Date().toISOString()
                })
            });
            
            console.log(`💰 BankApi: Баланс обновлен:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка обновления баланса:`, error);
            throw error;
        }
    }
    
    /**
     * Получение истории транзакций
     */
    async getTransactionHistory(playerId, roomId, limit = 50) {
        try {
            const response = await this.request(`/transactions/${roomId}/${playerId}?limit=${limit}`);
            console.log(`📜 BankApi: Получена история транзакций:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка получения истории транзакций:`, error);
            throw error;
        }
    }
    
    /**
     * Синхронизация данных с сервером
     */
    async syncBankData(roomId) {
        try {
            const response = await this.request(`/sync/${roomId}`);
            console.log(`🔄 BankApi: Данные синхронизированы:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка синхронизации:`, error);
            throw error;
        }
    }
    
    /**
     * Погашение кредита
     */
    async payOffLoan(playerId, loanType, amount, roomId) {
        try {
            const response = await this.request('/payoff-loan', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: playerId,
                    loanType: loanType,
                    amount: amount,
                    roomId: roomId,
                    timestamp: new Date().toISOString()
                })
            });
            
            console.log(`💳 BankApi: Кредит погашен:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка погашения кредита:`, error);
            throw error;
        }
    }
    
    /**
     * Добавление ребенка
     */
    async addChild(playerId, roomId) {
        try {
            const response = await this.request('/add-child', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: playerId,
                    roomId: roomId,
                    timestamp: new Date().toISOString()
                })
            });
            
            console.log(`👶 BankApi: Ребенок добавлен:`, response);
            return response;
        } catch (error) {
            console.error(`❌ BankApi: Ошибка добавления ребенка:`, error);
            throw error;
        }
    }
}

// Экспорт для глобального использования
window.BankApi = BankApi;
