/**
 * Bank API Routes
 * Обработка банковских операций и синхронизация балансов
 */

const express = require('express');
const router = express.Router();

// Импорт сервисов
const PushService = require('../services/PushService');
const roomsModule = require('./rooms');

// Получаем функции из rooms module
const getRoomGameState = roomsModule.getRoomGameState;
const updateRoomGameState = roomsModule.updateRoomGameState;
const gameStateByRoomId = roomsModule.gameStateByRoomId || new Map();

// Используем прямые вызовы функций из routes/rooms.js для работы с состоянием игры

// Глобальное хранилище банковских операций (временное решение)
const bankTransactions = new Map(); // roomId -> transactions[]
const playerBalances = new Map(); // roomId -> playerId -> balance

/**
 * GET /api/bank/balance/:roomId/:playerId
 * Получение баланса игрока
 */
router.get('/balance/:roomId/:playerId', async (req, res) => {
    try {
        const { roomId, playerId } = req.params;
        
        // Получаем баланс из игры
        const roomData = getRoomGameState(roomId);
        if (!roomData) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        const player = roomData.players?.find(p => p.id === playerId);
        if (!player) {
            return res.status(404).json({ success: false, message: 'Игрок не найден' });
        }
        
        res.json({
            success: true,
            data: {
                playerId: playerId,
                balance: player.money || 0,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Bank API: Ошибка получения баланса:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

/**
 * POST /api/bank/transfer
 * Выполнение перевода между игроками
 */
router.post('/transfer', async (req, res) => {
    try {
        console.log('🏦 Bank API: Начало перевода:', req.body);
        
        const { roomId, fromPlayerId, toPlayerId, amount, description } = req.body;
        
        // Валидация входных данных
        if (!roomId || !fromPlayerId || !toPlayerId || !amount) {
            console.log('❌ Bank API: Неполные данные:', { roomId, fromPlayerId, toPlayerId, amount });
            return res.status(400).json({ 
                success: false, 
                message: 'Не все обязательные поля заполнены' 
            });
        }
        
        if (amount <= 0) {
            console.log('❌ Bank API: Неверная сумма:', amount);
            return res.status(400).json({ 
                success: false, 
                message: 'Сумма должна быть больше нуля' 
            });
        }
        
        if (fromPlayerId === toPlayerId) {
            console.log('❌ Bank API: Попытка перевода себе:', fromPlayerId);
            return res.status(400).json({ 
                success: false, 
                message: 'Нельзя переводить самому себе' 
            });
        }
        
        // Получаем состояние комнаты
        console.log('🏦 Bank API: Получение состояния комнаты:', roomId);
        const roomData = getRoomGameState(roomId);
        if (!roomData) {
            console.log('❌ Bank API: Комната не найдена:', roomId);
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        console.log('🏦 Bank API: Состояние комнаты:', roomData);
        
        const fromPlayer = roomData.players?.find(p => p.id === fromPlayerId);
        const toPlayer = roomData.players?.find(p => p.id === toPlayerId);
        
        if (!fromPlayer || !toPlayer) {
            console.log('❌ Bank API: Игрок не найден:', { fromPlayer: !!fromPlayer, toPlayer: !!toPlayer });
            return res.status(404).json({ success: false, message: 'Игрок не найден' });
        }
        
        console.log('🏦 Bank API: Игроки найдены:', { 
            fromPlayer: fromPlayer.username, 
            fromBalance: fromPlayer.money,
            toPlayer: toPlayer.username,
            toBalance: toPlayer.money 
        });
        
        // Проверяем достаточность средств
        if (fromPlayer.money < amount) {
            console.log('❌ Bank API: Недостаточно средств:', { 
                current: fromPlayer.money, 
                required: amount 
            });
            return res.status(400).json({ 
                success: false, 
                message: 'Недостаточно средств для перевода' 
            });
        }
        
        // Выполняем перевод
        const oldFromBalance = fromPlayer.money;
        const oldToBalance = toPlayer.money;
        
        fromPlayer.money -= amount;
        toPlayer.money += amount;
        
        console.log('🏦 Bank API: Перевод выполнен:', {
            fromBalance: `${oldFromBalance} -> ${fromPlayer.money}`,
            toBalance: `${oldToBalance} -> ${toPlayer.money}`
        });
        
        // Создаем транзакцию
        const transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            roomId: roomId,
            fromPlayerId: fromPlayerId,
            toPlayerId: toPlayerId,
            amount: amount,
            description: description || `Перевод от ${fromPlayer.username} к ${toPlayer.username}`,
            timestamp: new Date().toISOString(),
            status: 'completed'
        };
        
        // Сохраняем транзакцию
        if (!bankTransactions.has(roomId)) {
            bankTransactions.set(roomId, []);
        }
        bankTransactions.get(roomId).push(transaction);
        
        // Обновляем состояние комнаты
        console.log('🏦 Bank API: Обновление состояния комнаты');
        updateRoomGameState(roomId, roomData);
        
        // Отправляем push-уведомления всем игрокам
        const pushData = {
            type: 'bank:transfer',
            roomId: roomId,
            transaction: transaction,
            players: roomData.players
        };
        
        try {
            console.log('🏦 Bank API: Отправка push-уведомлений');
            // Создаем экземпляр PushService и отправляем уведомления
            const pushService = new PushService();
            await pushService.broadcastPush('bank_transfer', pushData);
            console.log('✅ Bank API: Push-уведомления отправлены');
        } catch (pushError) {
            console.warn('⚠️ Bank API: Ошибка push-уведомления:', pushError);
        }
        
        const responseData = {
            success: true,
            data: {
                transaction: transaction,
                fromPlayerBalance: fromPlayer.money,
                toPlayerBalance: toPlayer.money
            }
        };
        
        console.log('✅ Bank API: Перевод успешно завершен:', responseData);
        
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Bank API: Критическая ошибка выполнения перевода:', error);
        console.error('❌ Bank API: Stack trace:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера',
            details: error.message 
        });
    }
});

/**
 * GET /api/bank/transactions/:roomId/:playerId?
 * Получение истории транзакций
 */
router.get('/transactions/:roomId/:playerId?', async (req, res) => {
    try {
        const { roomId, playerId } = req.params;
        
        const transactions = bankTransactions.get(roomId) || [];
        
        let filteredTransactions = transactions;
        if (playerId) {
            filteredTransactions = transactions.filter(t => 
                t.fromPlayerId === playerId || t.toPlayerId === playerId
            );
        }
        
        // Сортируем по времени (новые сверху)
        filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            data: {
                transactions: filteredTransactions,
                total: filteredTransactions.length
            }
        });
        
    } catch (error) {
        console.error('❌ Bank API: Ошибка получения транзакций:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

/**
 * POST /api/bank/update-balance
 * Обновление баланса игрока (для других операций)
 */
router.post('/update-balance', async (req, res) => {
    try {
        const { roomId, playerId, newBalance, reason } = req.body;
        
        if (!roomId || !playerId || newBalance === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Не все обязательные поля заполнены' 
            });
        }
        
        // Получаем состояние комнаты
        const roomData = getRoomGameState(roomId);
        if (!roomData) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        const player = roomData.players?.find(p => p.id === playerId);
        if (!player) {
            return res.status(404).json({ success: false, message: 'Игрок не найден' });
        }
        
        const oldBalance = player.money;
        player.money = newBalance;
        
        // Создаем транзакцию для истории
        const transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            roomId: roomId,
            fromPlayerId: 'system',
            toPlayerId: playerId,
            amount: newBalance - oldBalance,
            description: reason || 'Обновление баланса',
            timestamp: new Date().toISOString(),
            status: 'completed'
        };
        
        // Сохраняем транзакцию
        if (!bankTransactions.has(roomId)) {
            bankTransactions.set(roomId, []);
        }
        bankTransactions.get(roomId).push(transaction);
        
        // Обновляем состояние комнаты
        updateRoomGameState(roomId, roomData);
        
        // Отправляем push-уведомления
        const pushData = {
            type: 'bank:balanceUpdated',
            roomId: roomId,
            playerId: playerId,
            oldBalance: oldBalance,
            newBalance: newBalance,
            players: roomData.players
        };
        
        try {
            const pushService = new PushService();
            await pushService.broadcastPush('bank_balanceUpdated', pushData);
        } catch (pushError) {
            console.warn('⚠️ Bank API: Ошибка push-уведомления:', pushError);
        }
        
        res.json({
            success: true,
            data: {
                playerId: playerId,
                oldBalance: oldBalance,
                newBalance: newBalance,
                transaction: transaction
            }
        });
        
        console.log(`✅ Bank API: Баланс обновлен ${playerId}: $${oldBalance} -> $${newBalance}`);
        
    } catch (error) {
        console.error('❌ Bank API: Ошибка обновления баланса:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

/**
 * GET /api/bank/room-balances/:roomId
 * Получение всех балансов в комнате
 */
router.get('/room-balances/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        
        console.log('🏦 Bank API: Получение балансов комнаты:', roomId);
        
        // Проверяем, что getRoomGameState функция доступна
        if (typeof getRoomGameState !== 'function') {
            console.error('❌ Bank API: getRoomGameState не является функцией:', typeof getRoomGameState);
            return res.status(500).json({ 
                success: false, 
                message: 'Функция getRoomGameState недоступна' 
            });
        }
        
        const roomData = getRoomGameState(roomId);
        console.log('🏦 Bank API: Получены данные комнаты:', {
            roomId,
            hasRoomData: !!roomData,
            roomDataType: typeof roomData,
            hasPlayers: !!(roomData && roomData.players),
            playersCount: roomData?.players?.length || 0,
            roomDataKeys: roomData ? Object.keys(roomData) : 'no roomData'
        });
        
        if (!roomData) {
            console.log('❌ Bank API: Комната не найдена:', roomId);
            return res.status(404).json({ 
                success: false, 
                message: 'Комната не найдена',
                roomId: roomId 
            });
        }
        
        if (!roomData.players || !Array.isArray(roomData.players)) {
            console.log('⚠️ Bank API: В комнате нет игроков или players не массив:', roomData.players);
            return res.json({
                success: true,
                data: {
                    roomId: roomId,
                    balances: [],
                    totalPlayers: 0
                }
            });
        }
        
        const balances = roomData.players.map(player => {
            if (!player) {
                console.warn('⚠️ Bank API: Обнаружен null/undefined игрок');
                return null;
            }
            return {
                playerId: player.id || 'unknown',
                username: player.username || 'Unknown',
                balance: typeof player.money === 'number' ? player.money : 0,
                lastUpdated: new Date().toISOString()
            };
        }).filter(balance => balance !== null);
        
        console.log('✅ Bank API: Найдено балансов:', balances.length);
        
        res.json({
            success: true,
            data: {
                roomId: roomId,
                balances: balances,
                totalPlayers: balances.length
            }
        });
        
    } catch (error) {
        console.error('❌ Bank API: Критическая ошибка получения балансов:', error);
        console.error('❌ Bank API: Stack trace:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера',
            details: error.message 
        });
    }
});

/**
 * GET /api/bank/debug/rooms
 * Отладочный endpoint для проверки состояния всех комнат
 */
router.get('/debug/rooms', (req, res) => {
    try {
        console.log('🏦 Bank API: Отладочный запрос состояния комнат');
        
        // Получаем все комнаты из gameStateByRoomId
        const rooms = [];
        for (const [roomId, state] of gameStateByRoomId.entries()) {
            rooms.push({
                roomId,
                hasState: !!state,
                playersCount: state?.players?.length || 0,
                gameStarted: state?.gameStarted || false,
                activePlayer: state?.activePlayer?.username || 'none'
            });
        }
        
        res.json({
            success: true,
            data: {
                totalRooms: rooms.length,
                rooms: rooms
            }
        });
        
    } catch (error) {
        console.error('❌ Bank API: Ошибка отладочного запроса:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка отладки',
            details: error.message 
        });
    }
});

/**
 * POST /api/bank/loan/take
 * Взять кредит: зачисляет деньги и увеличивает ежемесячные обязательства
 */
router.post('/loan/take', async (req, res) => {
    try {
        const { roomId, playerId, amount } = req.body;
        if (!roomId || !playerId || !amount) return res.status(400).json({ success: false, message: 'roomId, playerId, amount обязательны' });
        const roomData = getRoomGameState(roomId);
        if (!roomData) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const player = roomData.players?.find(p => p.id === playerId);
        if (!player) return res.status(404).json({ success: false, message: 'Игрок не найден' });
        const take = Math.max(0, Math.floor(Number(amount) / 1000) * 1000);
        // лимит: net*10 (если есть в player), иначе без ограничения
        const net = Number(player.netIncome || 0);
        const maxLoan = Math.max(0, Math.floor((net * 10) / 1000) * 1000);
        const currentLoan = Number(player.currentLoan || 0);
        const available = maxLoan > 0 ? Math.max(0, maxLoan - currentLoan) : take;
        const finalAmount = maxLoan > 0 ? Math.min(take, available) : take;
        if (finalAmount <= 0) return res.status(400).json({ success: false, message: 'Сумма недоступна' });
        player.currentLoan = currentLoan + finalAmount;
        player.money = Number(player.money || 0) + finalAmount;
        // Сохраняем
        updateRoomGameState(roomId, roomData);
        // Push всем
        try { await new PushService().broadcastPush('bank_balanceUpdated', { roomId, players: roomData.players }); } catch (_) {}
        return res.json({ success: true, data: { player, amount: finalAmount } });
    } catch (e) {
        console.error('❌ Bank API: loan/take error', e);
        return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

/**
 * POST /api/bank/loan/repay
 * Погашение кредита: списывает деньги и уменьшает текущий долг
 */
router.post('/loan/repay', async (req, res) => {
    try {
        const { roomId, playerId, amount } = req.body;
        if (!roomId || !playerId || !amount) return res.status(400).json({ success: false, message: 'roomId, playerId, amount обязательны' });
        const roomData = getRoomGameState(roomId);
        if (!roomData) return res.status(404).json({ success: false, message: 'Комната не найдена' });
        const player = roomData.players?.find(p => p.id === playerId);
        if (!player) return res.status(404).json({ success: false, message: 'Игрок не найден' });
        const repay = Math.max(0, Math.floor(Number(amount) / 1000) * 1000);
        const currentLoan = Number(player.currentLoan || 0);
        const balance = Number(player.money || 0);
        const finalAmount = Math.min(repay, currentLoan, balance);
        if (finalAmount <= 0) return res.status(400).json({ success: false, message: 'Недостаточно долга или баланса' });
        player.currentLoan = currentLoan - finalAmount;
        player.money = balance - finalAmount;
        updateRoomGameState(roomId, roomData);
        try { await new PushService().broadcastPush('bank_balanceUpdated', { roomId, players: roomData.players }); } catch (_) {}
        return res.json({ success: true, data: { player, amount: finalAmount } });
    } catch (e) {
        console.error('❌ Bank API: loan/repay error', e);
        return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

module.exports = router;
