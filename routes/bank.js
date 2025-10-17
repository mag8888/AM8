/**
 * Bank API Routes
 * Обработка банковских операций и синхронизация балансов
 */

const express = require('express');
const router = express.Router();

// Импорт сервисов
const RoomService = require('../services/RoomService');
const PushService = require('../services/PushService');

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
        const roomData = await RoomService.getRoomState(roomId);
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
        const { roomId, fromPlayerId, toPlayerId, amount, description } = req.body;
        
        // Валидация входных данных
        if (!roomId || !fromPlayerId || !toPlayerId || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Не все обязательные поля заполнены' 
            });
        }
        
        if (amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Сумма должна быть больше нуля' 
            });
        }
        
        if (fromPlayerId === toPlayerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Нельзя переводить самому себе' 
            });
        }
        
        // Получаем состояние комнаты
        const roomData = await RoomService.getRoomState(roomId);
        if (!roomData) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        const fromPlayer = roomData.players?.find(p => p.id === fromPlayerId);
        const toPlayer = roomData.players?.find(p => p.id === toPlayerId);
        
        if (!fromPlayer || !toPlayer) {
            return res.status(404).json({ success: false, message: 'Игрок не найден' });
        }
        
        // Проверяем достаточность средств
        if (fromPlayer.money < amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Недостаточно средств для перевода' 
            });
        }
        
        // Выполняем перевод
        fromPlayer.money -= amount;
        toPlayer.money += amount;
        
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
        await RoomService.updateRoomState(roomId, roomData);
        
        // Отправляем push-уведомления всем игрокам
        const pushData = {
            type: 'bank:transfer',
            roomId: roomId,
            transaction: transaction,
            players: roomData.players
        };
        
        try {
            await PushService.broadcastToRoom(roomId, pushData);
        } catch (pushError) {
            console.warn('⚠️ Bank API: Ошибка push-уведомления:', pushError);
        }
        
        res.json({
            success: true,
            data: {
                transaction: transaction,
                fromPlayerBalance: fromPlayer.money,
                toPlayerBalance: toPlayer.money
            }
        });
        
        console.log(`✅ Bank API: Перевод выполнен ${fromPlayerId} -> ${toPlayerId}: $${amount}`);
        
    } catch (error) {
        console.error('❌ Bank API: Ошибка выполнения перевода:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
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
        const roomData = await RoomService.getRoomState(roomId);
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
        await RoomService.updateRoomState(roomId, roomData);
        
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
            await PushService.broadcastToRoom(roomId, pushData);
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
        
        const roomData = await RoomService.getRoomState(roomId);
        if (!roomData) {
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }
        
        const balances = roomData.players?.map(player => ({
            playerId: player.id,
            username: player.username,
            balance: player.money || 0,
            lastUpdated: new Date().toISOString()
        })) || [];
        
        res.json({
            success: true,
            data: {
                roomId: roomId,
                balances: balances,
                totalPlayers: balances.length
            }
        });
        
    } catch (error) {
        console.error('❌ Bank API: Ошибка получения балансов:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

module.exports = router;
