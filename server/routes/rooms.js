const express = require('express');
const router = express.Router();
const roomService = require('../services/RoomService');

/**
 * Маршруты для управления игровыми комнатами
 */

/**
 * GET /api/rooms
 * Получение списка всех комнат
 */
router.get('/', async (req, res, next) => {
    try {
        console.log('📡 API: Получение списка комнат');
        
        const rooms = roomService.getAllRooms();
        
        res.status(200).json({
            success: true,
            data: rooms,
            count: rooms.length,
            message: `Найдено ${rooms.length} комнат`
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка получения комнат:', error);
        next(error);
    }
});

/**
 * GET /api/rooms/stats
 * Получение статистики комнат
 */
router.get('/stats', async (req, res, next) => {
    try {
        console.log('📡 API: Получение статистики комнат');
        
        const rooms = roomService.getAllRooms();
        
        const stats = {
            totalRooms: rooms.length,
            activeRooms: rooms.filter(r => !r.isFinished).length,
            startedGames: rooms.filter(r => r.isStarted && !r.isFinished).length,
            totalPlayers: rooms.reduce((sum, r) => sum + r.playerCount, 0),
            averagePlayersPerRoom: rooms.length > 0 ? 
                Math.round(rooms.reduce((sum, r) => sum + r.playerCount, 0) / rooms.length * 100) / 100 : 0,
            fullRooms: rooms.filter(r => r.isFull).length,
            readyToStart: rooms.filter(r => r.canStart && !r.isStarted).length
        };
        
        res.status(200).json({
            success: true,
            data: stats,
            message: 'Статистика получена'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка получения статистики:', error);
        next(error);
    }
});

/**
 * GET /api/rooms/:roomId
 * Получение комнаты по ID
 */
router.get('/:roomId', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        console.log('📡 API: Получение комнаты по ID:', roomId);
        
        const room = roomService.getRoomById(roomId);
        
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена',
                roomId
            });
        }
        
        res.status(200).json({
            success: true,
            data: room,
            message: 'Комната найдена'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка получения комнаты:', error);
        next(error);
    }
});

/**
 * GET /api/rooms/name/:roomName
 * Получение комнаты по имени
 */
router.get('/name/:roomName', async (req, res, next) => {
    try {
        const { roomName } = req.params;
        console.log('📡 API: Получение комнаты по имени:', roomName);
        
        const room = roomService.getRoomByName(roomName);
        
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена',
                roomName
            });
        }
        
        res.status(200).json({
            success: true,
            data: room,
            message: 'Комната найдена'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка поиска комнаты по имени:', error);
        next(error);
    }
});

/**
 * POST /api/rooms
 * Создание новой комнаты
 */
router.post('/', async (req, res, next) => {
    try {
        const { roomData, creator } = req.body;
        console.log('📡 API: Создание комнаты:', roomData?.name);
        
        // Валидация входных данных
        if (!roomData || !creator) {
            return res.status(400).json({
                success: false,
                message: 'Необходимы данные комнаты и создателя'
            });
        }
        
        if (!creator.id) {
            return res.status(400).json({
                success: false,
                message: 'ID создателя обязателен'
            });
        }
        
        if (!roomData.name || roomData.name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Название комнаты обязательно'
            });
        }
        
        const room = await roomService.createRoom(roomData, creator);
        
        res.status(201).json({
            success: true,
            data: room,
            message: 'Комната создана успешно'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка создания комнаты:', error);
        
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: 'Комната с таким именем уже существует'
            });
        }
        
        next(error);
    }
});

/**
 * POST /api/rooms/:roomId/join
 * Присоединение игрока к комнате
 */
router.post('/:roomId/join', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { player } = req.body;
        console.log('📡 API: Присоединение игрока к комнате:', roomId);
        
        // Валидация входных данных
        if (!player || !player.userId) {
            return res.status(400).json({
                success: false,
                message: 'Данные игрока и user ID обязательны'
            });
        }
        
        const room = await roomService.joinRoom(roomId, player);
        
        res.status(200).json({
            success: true,
            data: room,
            message: 'Игрок присоединился к комнате'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка присоединения к комнате:', error);
        
        if (error.message === 'Room not found') {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        if (error.message === 'Room is full') {
            return res.status(409).json({
                success: false,
                message: 'Комната заполнена'
            });
        }
        
        if (error.message === 'Game already started') {
            return res.status(409).json({
                success: false,
                message: 'Игра уже началась'
            });
        }
        
        if (error.message === 'Player already in room') {
            return res.status(409).json({
                success: false,
                message: 'Игрок уже в комнате'
            });
        }
        
        next(error);
    }
});

/**
 * POST /api/rooms/:roomId/start
 * Запуск игры в комнате
 */
router.post('/:roomId/start', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;
        console.log('📡 API: Запуск игры в комнате:', roomId);
        
        // Валидация входных данных
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID обязателен'
            });
        }
        
        const room = await roomService.startGame(roomId, userId);
        
        res.status(200).json({
            success: true,
            data: room,
            message: 'Игра запущена'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка запуска игры:', error);
        
        if (error.message === 'Room not found') {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        if (error.message === 'Only host can start the game') {
            return res.status(403).json({
                success: false,
                message: 'Только хост может начать игру'
            });
        }
        
        if (error.message.includes('Need at least')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message === 'Game already started') {
            return res.status(409).json({
                success: false,
                message: 'Игра уже началась'
            });
        }
        
        next(error);
    }
});

/**
 * PUT /api/rooms/:roomId
 * Обновление комнаты
 */
router.put('/:roomId', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { updates } = req.body;
        console.log('📡 API: Обновление комнаты:', roomId);
        
        // Валидация входных данных
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Данные для обновления обязательны'
            });
        }
        
        const room = await roomService.updateRoom(roomId, updates);
        
        res.status(200).json({
            success: true,
            data: room,
            message: 'Комната обновлена'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка обновления комнаты:', error);
        
        if (error.message === 'Room not found') {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        next(error);
    }
});

/**
 * DELETE /api/rooms/:roomId
 * Удаление комнаты
 */
router.delete('/:roomId', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        console.log('📡 API: Удаление комнаты:', roomId);
        
        const success = await roomService.deleteRoom(roomId);
        
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Комната удалена'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка удаления комнаты:', error);
        next(error);
    }
});

/**
 * POST /api/rooms/cleanup
 * Очистка старых комнат (административная функция)
 */
router.post('/cleanup', async (req, res, next) => {
    try {
        console.log('📡 API: Очистка старых комнат');
        
        const deletedCount = await roomService.cleanupOldRooms();
        
        res.status(200).json({
            success: true,
            data: { deletedCount },
            message: `Удалено ${deletedCount} старых комнат`
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка очистки комнат:', error);
        next(error);
    }
});

/**
 * PUT /api/rooms/:roomId/player
 * Обновление данных игрока в комнате
 */
router.put('/:roomId/player', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const playerData = req.body;
        console.log('📡 API: Обновление игрока в комнате:', roomId);
        
        // Валидация входных данных
        if (!playerData || !playerData.userId) {
            return res.status(400).json({
                success: false,
                message: 'Данные игрока и user ID обязательны'
            });
        }
        
        const room = await roomService.updatePlayerInRoom(roomId, playerData);
        
        res.status(200).json({
            success: true,
            data: room,
            message: 'Данные игрока обновлены'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка обновления игрока:', error);
        
        if (error.message === 'Room not found') {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        if (error.message === 'Player not found') {
            return res.status(404).json({
                success: false,
                message: 'Игрок не найден в комнате'
            });
        }
        
        next(error);
    }
});

/**
 * POST /api/rooms/:roomId/notifications
 * Отправка push-уведомления в комнату
 */
router.post('/:roomId/notifications', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const notification = req.body;
        
        console.log('📡 API: Отправка уведомления в комнату:', roomId);
        
        // Проверяем существование комнаты
        const room = roomService.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        // Валидация уведомления
        if (!notification.type || !notification.data) {
            return res.status(400).json({
                success: false,
                message: 'Некорректные данные уведомления'
            });
        }
        
        // Сохраняем уведомление (в реальном приложении здесь был бы WebSocket)
        console.log('📱 API: Уведомление отправлено:', notification.type);
        
        res.status(200).json({
            success: true,
            message: 'Уведомление отправлено',
            data: notification
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка отправки уведомления:', error);
        next(error);
    }
});

/**
 * POST /api/rooms/:roomId/roll
 * Бросок кубика
 */
router.post('/:roomId/roll', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { diceChoice = 'single', isReroll = false } = req.body;
        
        console.log(`🎲 API: Бросок кубика в комнате ${roomId}`);
        
        // Получаем комнату
        const room = roomService.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        // Генерируем результат броска
        const diceResult = {
            value: Math.floor(Math.random() * 6) + 1,
            diceChoice,
            isReroll,
            timestamp: new Date().toISOString()
        };
        
        // Обновляем состояние игры
        const gameState = {
            canRoll: false,
            canMove: true,
            canEndTurn: false,
            lastDiceResult: diceResult,
            activePlayer: room.players[room.currentPlayerIndex]
        };
        
        // Обновляем комнату
        room.gameState = gameState;
        room.lastDiceRoll = diceResult;
        
        console.log(`🎲 API: Результат броска: ${diceResult.value}`);
        
        res.status(200).json({
            success: true,
            data: {
                diceResult,
                state: gameState
            },
            message: `Выпало: ${diceResult.value}`
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка броска кубика:', error);
        next(error);
    }
});

/**
 * POST /api/rooms/:roomId/move
 * Перемещение игрока
 */
router.post('/:roomId/move', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { steps } = req.body;
        
        console.log(`🚶 API: Перемещение на ${steps} шагов в комнате ${roomId}`);
        
        // Получаем комнату
        const room = roomService.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        // Получаем активного игрока
        const activePlayer = room.players[room.currentPlayerIndex];
        if (!activePlayer) {
            return res.status(400).json({
                success: false,
                message: 'Активный игрок не найден'
            });
        }
        
        // Обновляем позицию игрока
        const newPosition = (activePlayer.position + steps) % 68; // 44 + 24 = 68 общих клеток
        activePlayer.position = newPosition;
        
        // Результат перемещения
        const moveResult = {
            playerId: activePlayer.id,
            oldPosition: activePlayer.position - steps,
            newPosition,
            steps,
            timestamp: new Date().toISOString()
        };
        
        // Обновляем состояние игры
        const gameState = {
            canRoll: false,
            canMove: false,
            canEndTurn: true,
            activePlayer,
            lastDiceResult: room.lastDiceRoll
        };
        
        room.gameState = gameState;
        
        console.log(`🚶 API: Игрок ${activePlayer.username} перемещен на позицию ${newPosition}`);
        
        res.status(200).json({
            success: true,
            data: {
                moveResult,
                state: gameState
            },
            message: `Игрок перемещен на ${steps} шагов`
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка перемещения:', error);
        next(error);
    }
});

/**
 * POST /api/rooms/:roomId/end-turn
 * Завершение хода
 */
router.post('/:roomId/end-turn', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        
        console.log(`🏁 API: Завершение хода в комнате ${roomId}`);
        
        // Получаем комнату
        const room = roomService.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        // Переходим к следующему игроку
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
        const nextPlayer = room.players[room.currentPlayerIndex];
        
        // Обновляем состояние игры
        const gameState = {
            canRoll: true,
            canMove: false,
            canEndTurn: false,
            activePlayer: nextPlayer,
            lastDiceResult: null
        };
        
        room.gameState = gameState;
        room.lastDiceRoll = null;
        
        console.log(`🏁 API: Ход передан игроку ${nextPlayer.username}`);
        
        res.status(200).json({
            success: true,
            data: {
                activePlayerIndex: room.currentPlayerIndex,
                nextPlayer,
                state: gameState
            },
            message: `Ход передан игроку ${nextPlayer.username}`
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка завершения хода:', error);
        next(error);
    }
});

/**
 * GET /api/rooms/:roomId/game-state
 * Получение состояния игры
 */
router.get('/:roomId/game-state', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        
        console.log(`📊 API: Получение состояния игры в комнате ${roomId}`);
        
        // Получаем комнату
        const room = roomService.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                players: room.players,
                currentPlayerIndex: room.currentPlayerIndex,
                gameState: room.gameState || {
                    canRoll: true,
                    canMove: false,
                    canEndTurn: false,
                    activePlayer: room.players[room.currentPlayerIndex],
                    lastDiceResult: null
                },
                isStarted: room.isStarted,
                createdAt: room.createdAt
            },
            message: 'Состояние игры получено'
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка получения состояния игры:', error);
        next(error);
    }
});

/**
 * GET /api/rooms/:roomId/players
 * Получение списка игроков
 */
router.get('/:roomId/players', async (req, res, next) => {
    try {
        const { roomId } = req.params;
        
        console.log(`👥 API: Получение списка игроков в комнате ${roomId}`);
        
        // Получаем комнату
        const room = roomService.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Комната не найдена'
            });
        }
        
        res.status(200).json({
            success: true,
            data: room.players,
            message: `Найдено ${room.players.length} игроков`
        });
        
    } catch (error) {
        console.error('❌ API: Ошибка получения игроков:', error);
        next(error);
    }
});

module.exports = router;
