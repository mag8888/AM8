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
const { getRoomGameState, updateRoomGameState, fetchOrCreateRoomState } = roomsModule;
const gameStateByRoomId = roomsModule.gameStateByRoomId || new Map();

// Получаем функцию для доступа к базе данных
const getDatabase = roomsModule.getDatabase || (() => {
    // Fallback: пытаемся получить из глобального контекста
    try {
        return require('./rooms').getDatabase();
    } catch (e) {
        return null;
    }
});

// Используем прямые вызовы функций из routes/rooms.js для работы с состоянием игры

// Глобальное хранилище банковских операций (временное решение)
const bankTransactions = new Map(); // roomId -> transactions[]
const playerBalances = new Map(); // roomId -> playerId -> balance
const MAX_TRANSACTIONS_PER_ROOM = 200;

function recordTransaction(roomId, transaction = {}) {
    if (!roomId) return;
    if (!bankTransactions.has(roomId)) {
        bankTransactions.set(roomId, []);
    }
    const list = bankTransactions.get(roomId);
    const entry = {
        id: transaction.id || `txn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: transaction.type || 'custom',
        amount: Number(transaction.amount) || 0,
        playerId: transaction.playerId || null,
        playerName: transaction.playerName || '',
        description: transaction.description || '',
        timestamp: transaction.timestamp || new Date().toISOString(),
        balanceAfter: transaction.balanceAfter,
        extra: transaction.extra || {}
    };
    list.push(entry);
    if (list.length > MAX_TRANSACTIONS_PER_ROOM) {
        list.splice(0, list.length - MAX_TRANSACTIONS_PER_ROOM);
    }
}

/**
 * GET /api/bank/balance/:roomId/:playerId
 * Получение баланса игрока
 */
router.get('/balance/:roomId/:playerId', async (req, res) => {
    try {
        const { roomId, playerId } = req.params;
        
        // Получаем баланс из игры
        let roomData = getRoomGameState(roomId);
        if (!roomData) {
            roomData = await fetchOrCreateRoomState(roomId);
        }
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
        let roomData = getRoomGameState(roomId);
        if (!roomData) {
            try {
                roomData = await fetchOrCreateRoomState(roomId);
            } catch (error) {
                console.log('❌ Bank API: Не удалось инициализировать состояние комнаты:', error.message);
                roomData = null;
            }
        }
        if (!roomData) {
            console.log('❌ Bank API: Комната не найдена:', roomId);
            return res.status(404).json({ success: false, message: 'Комната не найдена' });
        }

        console.log('🏦 Bank API: Состояние комнаты:', JSON.stringify(roomData, null, 2));
        console.log('🏦 Bank API: Поиск игроков:', {
            fromPlayerId,
            toPlayerId,
            fromPlayerIdType: typeof fromPlayerId,
            toPlayerIdType: typeof toPlayerId,
            availablePlayers: roomData.players?.map((p, idx) => ({ 
                index: idx,
                id: p.id, 
                idType: typeof p.id,
                userId: p.userId,
                userIdType: typeof p.userId,
                playerId: p.playerId,
                playerIdType: typeof p.playerId,
                username: p.username,
                name: p.name,
                allKeys: Object.keys(p)
            })) || []
        });
        
        // Ищем игроков по разным вариантам ID (id, userId, playerId)
        // Также проверяем строковые варианты и частичные совпадения
        // Нормализуем ID для сравнения (убираем подчеркивания и дефисы)
        const normalizeId = (id) => String(id || '').toLowerCase().replace(/[_-]/g, '');
        
        let fromPlayer = roomData.players?.find((p, idx) => {
            const pId = String(p.id || '');
            const pUserId = String(p.userId || '');
            const pPlayerId = String(p.playerId || '');
            const searchId = String(fromPlayerId || '');
            
            // Нормализованные версии для сравнения
            const normPId = normalizeId(pId);
            const normPUserId = normalizeId(pUserId);
            const normSearchId = normalizeId(searchId);
            
            // Точное совпадение
            const exactMatch = pId === searchId || 
                              pUserId === searchId ||
                              pPlayerId === searchId ||
                              normPId === normSearchId ||
                              normPUserId === normSearchId;
            
            // Частичное совпадение
            const partialMatch = pId.includes(searchId) ||
                                pUserId.includes(searchId) ||
                                searchId.includes(pId) ||
                                searchId.includes(pUserId) ||
                                normPId.includes(normSearchId) ||
                                normPUserId.includes(normSearchId) ||
                                normSearchId.includes(normPId) ||
                                normSearchId.includes(normPUserId);
            
            // Поиск по индексу (если ID вида "player1", "player2" и т.д.)
            const indexMatch = normSearchId.match(/player(\d+)/);
            if (indexMatch) {
                const requestedIndex = parseInt(indexMatch[1]) - 1;
                if (idx === requestedIndex) {
                    console.log(`✅ Bank API: Отправитель найден по индексу (индекс ${idx}):`, {
                        pId,
                        pUserId,
                        searchId,
                        requestedIndex,
                        actualIndex: idx
                    });
                    return true;
                }
            }
            
            if (exactMatch || partialMatch) {
                console.log(`✅ Bank API: Отправитель найден (индекс ${idx}):`, {
                    pId,
                    pUserId,
                    pPlayerId,
                    searchId,
                    normPId,
                    normPUserId,
                    normSearchId,
                    exactMatch,
                    partialMatch
                });
            }
            
            return exactMatch || partialMatch;
        });
        
        let toPlayer = roomData.players?.find((p, idx) => {
            const pId = String(p.id || '');
            const pUserId = String(p.userId || '');
            const pPlayerId = String(p.playerId || '');
            const searchId = String(toPlayerId || '');
            
            // Нормализованные версии для сравнения
            const normPId = normalizeId(pId);
            const normPUserId = normalizeId(pUserId);
            const normSearchId = normalizeId(searchId);
            
            // Точное совпадение
            const exactMatch = pId === searchId || 
                              pUserId === searchId ||
                              pPlayerId === searchId ||
                              normPId === normSearchId ||
                              normPUserId === normSearchId;
            
            // Частичное совпадение
            const partialMatch = pId.includes(searchId) ||
                                pUserId.includes(searchId) ||
                                searchId.includes(pId) ||
                                searchId.includes(pUserId) ||
                                normPId.includes(normSearchId) ||
                                normPUserId.includes(normSearchId) ||
                                normSearchId.includes(normPId) ||
                                normSearchId.includes(normPUserId);
            
            // Поиск по индексу (если ID вида "player1", "player2" и т.д.)
            const indexMatch = normSearchId.match(/player(\d+)/);
            if (indexMatch) {
                const requestedIndex = parseInt(indexMatch[1]) - 1;
                if (idx === requestedIndex) {
                    console.log(`✅ Bank API: Получатель найден по индексу (индекс ${idx}):`, {
                        pId,
                        pUserId,
                        searchId,
                        requestedIndex,
                        actualIndex: idx
                    });
                    return true;
                }
            }
            
            if (exactMatch || partialMatch) {
                console.log(`✅ Bank API: Получатель найден (индекс ${idx}):`, {
                    pId,
                    pUserId,
                    pPlayerId,
                    searchId,
                    normPId,
                    normPUserId,
                    normSearchId,
                    exactMatch,
                    partialMatch
                });
            }
            
            return exactMatch || partialMatch;
        });
        
        // Если не нашли по ID, пробуем найти по username (fallback)
        if (!fromPlayer && fromPlayerId) {
            console.log('⚠️ Bank API: Отправитель не найден по ID, пробуем найти по username или другим полям');
            // Пробуем найти по username, если fromPlayerId похож на username
            fromPlayer = roomData.players?.find((p, idx) => {
                const pUsername = String(p.username || '').toLowerCase();
                const pName = String(p.name || '').toLowerCase();
                const searchId = String(fromPlayerId || '').toLowerCase();
                
                return pUsername === searchId || 
                       pName === searchId ||
                       pUsername.includes(searchId) ||
                       pName.includes(searchId);
            });
            
            if (fromPlayer) {
                console.log('✅ Bank API: Отправитель найден по username/name:', fromPlayer.username);
            }
        }
        
        if (!toPlayer && toPlayerId) {
            console.log('⚠️ Bank API: Получатель не найден по ID, пробуем найти по username или другим полям');
            // Пробуем найти по username, если toPlayerId похож на username
            toPlayer = roomData.players?.find((p, idx) => {
                const pUsername = String(p.username || '').toLowerCase();
                const pName = String(p.name || '').toLowerCase();
                const searchId = String(toPlayerId || '').toLowerCase();
                
                return pUsername === searchId || 
                       pName === searchId ||
                       pUsername.includes(searchId) ||
                       pName.includes(searchId);
            });
            
            if (toPlayer) {
                console.log('✅ Bank API: Получатель найден по username/name:', toPlayer.username);
            }
        }
        
        // Если все еще не нашли, пробуем найти по индексу в массиве (последний fallback)
        if (!fromPlayer && fromPlayerId) {
            const indexMatch = String(fromPlayerId).match(/player[_-]?(\d+)/i);
            if (indexMatch) {
                const requestedIndex = parseInt(indexMatch[1]) - 1;
                if (requestedIndex >= 0 && requestedIndex < roomData.players?.length) {
                    fromPlayer = roomData.players[requestedIndex];
                    console.log(`✅ Bank API: Отправитель найден по индексу массива (${requestedIndex}):`, fromPlayer?.username);
                }
            }
        }
        
        if (!toPlayer && toPlayerId) {
            const indexMatch = String(toPlayerId).match(/player[_-]?(\d+)/i);
            if (indexMatch) {
                const requestedIndex = parseInt(indexMatch[1]) - 1;
                if (requestedIndex >= 0 && requestedIndex < roomData.players?.length) {
                    toPlayer = roomData.players[requestedIndex];
                    console.log(`✅ Bank API: Получатель найден по индексу массива (${requestedIndex}):`, toPlayer?.username);
                }
            }
        }
        
        if (!fromPlayer || !toPlayer) {
            console.log('❌ Bank API: Игрок не найден после всех попыток поиска:', { 
                fromPlayer: !!fromPlayer, 
                toPlayer: !!toPlayer,
                fromPlayerId,
                toPlayerId,
                fromPlayerIdType: typeof fromPlayerId,
                toPlayerIdType: typeof toPlayerId,
                playersCount: roomData.players?.length || 0,
                availablePlayers: roomData.players?.map((p, idx) => ({ 
                    index: idx,
                    id: p.id, 
                    idType: typeof p.id,
                    userId: p.userId,
                    userIdType: typeof p.userId,
                    username: p.username,
                    name: p.name,
                    allKeys: Object.keys(p)
                })) || []
            });
            return res.status(404).json({ 
                success: false, 
                message: `Игрок не найден. Отправитель: ${fromPlayer ? 'найден' : 'не найден'}, Получатель: ${toPlayer ? 'найден' : 'не найден'}. Проверьте логи сервера для деталей.` 
            });
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
        
        // Сохраняем балансы в базу данных (опционально, не критично для работы)
        try {
            const db = getDatabase();
            if (db) {
                // Обновляем баланс отправителя
                db.run(
                    'UPDATE room_players SET money = ? WHERE room_id = ? AND (user_id = ? OR id = ?)',
                    [fromPlayer.money, roomId, fromPlayer.userId || fromPlayer.id, fromPlayer.id],
                    (err) => {
                        if (err) {
                            console.error('❌ Bank API: Ошибка обновления баланса отправителя в БД:', err);
                        } else {
                            console.log('✅ Bank API: Баланс отправителя обновлен в БД:', fromPlayer.money);
                        }
                    }
                );
                
                // Обновляем баланс получателя
                db.run(
                    'UPDATE room_players SET money = ? WHERE room_id = ? AND (user_id = ? OR id = ?)',
                    [toPlayer.money, roomId, toPlayer.userId || toPlayer.id, toPlayer.id],
                    (err) => {
                        if (err) {
                            console.error('❌ Bank API: Ошибка обновления баланса получателя в БД:', err);
                        } else {
                            console.log('✅ Bank API: Баланс получателя обновлен в БД:', toPlayer.money);
                        }
                    }
                );
            } else {
                console.log('⚠️ Bank API: База данных недоступна (MongoDB режим), балансы сохранены только в памяти');
            }
        } catch (dbError) {
            console.error('❌ Bank API: Ошибка сохранения балансов в БД (не критично):', dbError);
            // Не прерываем выполнение, перевод уже выполнен в памяти
        }
        
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
            console.warn('⚠️ Bank API: Ошибка push-уведомления (не критично):', pushError);
            // Не прерываем выполнение, перевод уже выполнен
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
        
        let roomData = getRoomGameState(roomId);
        if (!roomData) {
            try {
                roomData = await fetchOrCreateRoomState(roomId);
            } catch (error) {
                console.log('❌ Bank API: Не удалось получить состояние комнаты:', error.message);
                roomData = null;
            }
        }
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
        let roomData = getRoomGameState(roomId);
        if (!roomData) {
            try {
                roomData = await fetchOrCreateRoomState(roomId);
            } catch (error) {
                console.log('❌ Bank API: Не удалось подготовить состояние комнаты:', error.message);
                roomData = null;
            }
        }
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
        recordTransaction(roomId, {
            type: 'loan_take',
            amount: finalAmount,
            playerId,
            playerName: player.username || player.name || '',
            description: `Взят кредит на $${finalAmount}`,
            balanceAfter: player.money
        });
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
        let roomData = getRoomGameState(roomId);
        if (!roomData) {
            try {
                roomData = await fetchOrCreateRoomState(roomId);
            } catch (error) {
                console.log('❌ Bank API: Не удалось подготовить состояние комнаты для погашения кредита:', error.message);
                roomData = null;
            }
        }
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
        recordTransaction(roomId, {
            type: 'loan_repay',
            amount: -finalAmount,
            playerId,
            playerName: player.username || player.name || '',
            description: `Погашен кредит на $${finalAmount}`,
            balanceAfter: player.money
        });
        try { await new PushService().broadcastPush('bank_balanceUpdated', { roomId, players: roomData.players }); } catch (_) {}
        return res.json({ success: true, data: { player, amount: finalAmount } });
    } catch (e) {
        console.error('❌ Bank API: loan/repay error', e);
        return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

module.exports = router;
