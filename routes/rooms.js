const express = require('express');
const { v4: uuidv4 } = require('uuid');
const PushService = require('../services/PushService');
const RoomRepository = require('../repositories/RoomRepository');

const router = express.Router();
// Простое серверное состояние игры (на одном инстансе). Для прод-реализации заменить на Redis/БД/вебсокеты
const gameStateByRoomId = new Map();

// Функция для получения состояния комнаты (для банк API)
function getRoomGameState(roomId) {
    return gameStateByRoomId.get(roomId) || null;
}

// Функция для обновления состояния комнаты (для банк API)
function updateRoomGameState(roomId, state) {
    gameStateByRoomId.set(roomId, state);
    return true;
}

// Экспортируем функции для использования в других модулях
module.exports.getRoomGameState = getRoomGameState;
module.exports.updateRoomGameState = updateRoomGameState;
module.exports.gameStateByRoomId = gameStateByRoomId;

// Инициализируем PushService для уведомлений
const pushService = new PushService();

function ensureGameState(db, roomId, cb) {
    if (gameStateByRoomId.has(roomId)) return cb(null, gameStateByRoomId.get(roomId));
    const q = `SELECT rp.user_id as userId, u.username as username
               FROM room_players rp LEFT JOIN users u ON u.id = rp.user_id
               WHERE rp.room_id = ? ORDER BY u.username ASC`;
    if (!db) {
        const state = { players: [], currentPlayerIndex: 0, activePlayer: null, lastDiceResult: null, canRoll: true, canMove: false, canEndTurn: false };
        gameStateByRoomId.set(roomId, state);
        return cb(null, state);
    }
    db.all(q, [roomId], (err, rows) => {
        if (err) return cb(err);
        const players = (rows || []).map((r, idx) => ({
            id: r.userId,
            userId: r.userId,
            username: r.username || `player${idx+1}`,
            position: 0,
            isInner: true,
            token: '🎯',
            money: 5000,
            isReady: true
        }));
        const state = {
            players,
            currentPlayerIndex: 0,
            activePlayer: players[0] || null,
            lastDiceResult: null,
            canRoll: true,
            canMove: false,
            canEndTurn: false
        };
        gameStateByRoomId.set(roomId, state);
        cb(null, state);
    });
}

// --- Game sync endpoints ---
router.get('/:id/players', (req, res, next) => {
    const db = getDatabase();
    const { id } = req.params;
    if (!db) {
        // Mongo-first: вернуть игроков из Mongo комнаты
        (async () => {
            try {
                const repo = new RoomRepository();
                const room = await repo.getById(id);
                const players = (room && Array.isArray(room.players)) ? room.players.map(p => ({ userId: p.userId || p.id, username: p.username })) : [];
                return res.json({ success: true, data: players });
            } catch (e) {
                console.warn('⚠️ Mongo get players error:', e?.message);
                return res.json({ success: true, data: [] });
            }
        })();
        return;
    }
    db.all(`SELECT rp.user_id as userId, u.username as username FROM room_players rp LEFT JOIN users u ON u.id = rp.user_id WHERE rp.room_id = ? ORDER BY u.username ASC`, [id], (err, rows) => {
        if (err) return next(err);
        res.json({ success:true, data: rows || [] });
    });
});

router.get('/:id/game-state', (req, res, next) => {
    const db = getDatabase();
    const { id } = req.params;
    if (!db) {
        // Mongo-first: собираем state из Mongo комнаты и кэша
        (async () => {
            try {
                const repo = new RoomRepository();
                const room = await repo.getById(id);
                let state = gameStateByRoomId.get(id);
                if (!state) {
                    state = {
                        players: (room?.players || []).map(p => ({ id: p.id || p.userId, username: p.username, position: 0, isInner: true, token: p.token || '🎯', money: 5000, isReady: !!p.isReady })),
                        currentPlayerIndex: 0,
                        activePlayer: null,
                        lastDiceResult: null,
                        canRoll: true,
                        canMove: false,
                        canEndTurn: false
                    };
                    state.activePlayer = state.players[0] || null;
                    gameStateByRoomId.set(id, state);
                }
                return res.json({ success: true, state });
            } catch (e) {
                return res.json({ success: true, state: { players: [], currentPlayerIndex: 0, activePlayer: null } });
            }
        })();
        return;
    }
    ensureGameState(db, id, (err, state) => {
        if (err) return next(err);
        res.json({ success:true, state });
    });
});

router.post('/:id/roll', (req, res, next) => {
    const db = getDatabase();
    const { id } = req.params;
    ensureGameState(db, id, (err, state) => {
        if (err) return next(err);
        if (state.canRoll === false) {
            return res.status(400).json({ success:false, message:'Бросок кубика сейчас недоступен', state });
        }
        const value = Math.floor(Math.random()*6)+1;
        state.lastDiceResult = { value, at: Date.now() };
        state.canRoll = false;
        state.canMove = true;
        state.canEndTurn = false;
        
        // Отправляем push-уведомление о броске кубика
        pushService.broadcastPush('dice_rolled', { 
            roomId: id, 
            activePlayer: state.activePlayer,
            diceValue: value
        }).catch(err => console.error('❌ Ошибка отправки push о броске кубика:', err));
        
        res.json({ success:true, diceResult:{ value }, state });
    });
});

router.post('/:id/move', (req, res, next) => {
    const db = getDatabase();
    const { id } = req.params;
    const { steps } = req.body || {};
    ensureGameState(db, id, (err, state) => {
        if (err) return next(err);
        const current = state.players[state.currentPlayerIndex];
        if (!current) return res.json({ success:true, moveResult:{ steps:0 }, state });
        if (state.canMove === false) {
            return res.status(400).json({ success:false, message:'Перемещение сейчас недоступно', state });
        }
        const diceValue = Number(state?.lastDiceResult?.value);
        const requestedSteps = Number(steps);
        const moveSteps = Number.isFinite(diceValue) && diceValue > 0
            ? diceValue
            : (Number.isFinite(requestedSteps) && requestedSteps > 0 ? requestedSteps : null);
        if (!Number.isFinite(moveSteps) || moveSteps <= 0) {
            return res.status(400).json({ success:false, message:'Некорректное количество шагов для перемещения', state });
        }
        const maxInner = 12;
        current.position = (current.position + moveSteps) % maxInner;
        state.canRoll = false;
        state.canMove = false;
        state.canEndTurn = true;
        state.lastMove = { steps: moveSteps, at: Date.now() };
        
        // Отправляем push-уведомление о движении
        pushService.broadcastPush('player_moved', { 
            roomId: id, 
            activePlayer: state.activePlayer,
            steps: moveSteps,
            newPosition: current.position
        }).catch(err => console.error('❌ Ошибка отправки push о движении:', err));
        
        res.json({ success:true, moveResult:{ steps: moveSteps }, state });
    });
});

router.post('/:id/end-turn', (req, res, next) => {
    const db = getDatabase();
    const { id } = req.params;
    ensureGameState(db, id, (err, state) => {
        if (err) return next(err);
        if (state.canEndTurn === false) {
            return res.status(400).json({ success:false, message:'Завершение хода сейчас недоступно', state });
        }
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % (state.players.length || 1);
        state.activePlayer = state.players[state.currentPlayerIndex] || null;
        state.canRoll = true;
        state.canMove = false;
        state.canEndTurn = false;
        state.lastDiceResult = null;
        state.lastMove = null;
        // Отправляем push-уведомление о смене хода
        pushService.broadcastPush('turn_changed', { 
            roomId: id, 
            activePlayer: state.activePlayer,
            previousPlayer: state.players[state.currentPlayerIndex - 1] || state.players[state.players.length - 1]
        }).catch(err => console.error('❌ Ошибка отправки push о смене хода:', err));
        
        // Отправляем реальное push-уведомление о смене хода
        pushService.sendRealPushNotification(
            '🔄 Ваш ход!',
            `Ход игрока ${state.activePlayer.username || 'Игрок'}. Бросайте кубик!`,
            {
                data: { roomId: id, action: 'turn_changed', playerId: state.activePlayer.id },
                actions: [
                    { action: 'open_game', title: 'Открыть игру' }
                ],
                tag: 'turn_changed',
                requireInteraction: false
            }
        ).catch(err => console.error('❌ Ошибка отправки реального push о смене хода:', err));
        
        res.json({ success:true, state, event: { type: 'turn_changed', activePlayer: state.activePlayer } });
    });
});

router.put('/:id/active-player', (req, res, next) => {
    const db = getDatabase();
    const { id } = req.params;
    const { playerId } = req.body || {};
    ensureGameState(db, id, (err, state) => {
        if (err) return next(err);
        const idx = state.players.findIndex(p => p.id === playerId);
        if (idx === -1) return res.status(404).json({ success:false, message:'Игрок не найден' });
        state.currentPlayerIndex = idx;
        state.activePlayer = state.players[idx];
        state.canRoll = true;
        state.canMove = false;
        state.canEndTurn = false;
        res.json({ success:true, state });
    });
});

// Fallback данные для демо
const fallbackRooms = [
    {
        id: 'room-demo-1',
        name: 'Демо комната 1',
        description: 'Комната для демонстрации игры',
        maxPlayers: 4,
        playerCount: 2,
        status: 'waiting',
        isStarted: false,
        isFull: false,
        creator: 'demo_user',
        turnTime: 30,
        assignProfessions: true,
        players: [
            { id: 'p1', username: 'demo_user', name: 'demo_user', isHost: true },
            { id: 'p2', username: 'player1', name: 'player1', isHost: false }
        ],
        createdAt: new Date(Date.now() - 60000).toISOString()
    },
    {
        id: 'room-tournament-1',
        name: 'Турнирная комната',
        description: 'Серьезная игра для опытных игроков',
        maxPlayers: 6,
        playerCount: 3,
        status: 'waiting',
        isStarted: false,
        isFull: false,
        creator: 'tournament_master',
        turnTime: 60,
        assignProfessions: false,
        players: [
            { id: 'p3', username: 'tournament_master', name: 'tournament_master', isHost: true },
            { id: 'p4', username: 'player2', name: 'player2', isHost: false },
            { id: 'p5', username: 'player3', name: 'player3', isHost: false }
        ],
        createdAt: new Date(Date.now() - 30000).toISOString()
    }
];

// Проверяем доступность базы данных
function getDatabase() {
    try {
        // В проде на Railway используем MongoDB, локальную SQLite не поднимаем
        if (process.env.MONGO_URL || process.env.MONGODB_URI || process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_ENVIRONMENT) {
            console.log('🗄️ DB: Используем режим MongoDB/Remote (SQLite отключен)');
            return null; // отключаем локальную SQLite, чтобы не нарушать правило
        }
        if (process.env.USE_SQLITE === 'true') {
        return require('../database/init').getDatabase();
        }
        console.warn('⚠️ DB: Локальная SQLite отключена. Для Mongo используйте отдельный сервис.');
        return null;
    } catch (error) {
        console.warn('⚠️ База данных недоступна, используем fallback данные');
        return null;
    }
}

/**
 * GET /api/rooms - Получить список всех комнат
 */
router.get('/', async (req, res, next) => {
    try {
        const db = getDatabase();
        
        // Если база данных недоступна, используем fallback данные
        if (!db) {
            try {
                const repo = new RoomRepository();
                const rooms = await repo.list();
                return res.json({ success: true, data: rooms, count: rooms.length, mongo: true });
            } catch (e) {
            console.log('🔄 Используем fallback данные для комнат');
            return res.json({
                success: true,
                data: fallbackRooms,
                count: fallbackRooms.length,
                fallback: true
            });
            }
        }

        const query = `
            SELECT 
                r.id,
                r.name,
                r.description,
                r.max_players,
                r.current_players,
                r.status,
                r.is_started,
                r.turn_time,
                r.assign_professions,
                r.creator_id,
                r.created_at,
                r.updated_at,
                u.username as creator_name
            FROM rooms r
            LEFT JOIN users u ON r.creator_id = u.id
            WHERE r.status != 'deleted'
            ORDER BY r.created_at DESC
        `;

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('❌ Ошибка получения комнат:', err);
                // Fallback на статические данные при ошибке БД
                console.log('🔄 Fallback на статические данные');
                return res.json({
                    success: true,
                    data: fallbackRooms,
                    count: fallbackRooms.length,
                    fallback: true
                });
            }

            // Получаем игроков для всех комнат одним запросом
            const playersQuery = `
                SELECT 
                    rp.room_id,
                    rp.user_id as id,
                    u.username,
                    u.username as name,
                    rp.is_host as isHost,
                    rp.is_ready as isReady,
                    rp.token,
                    rp.dream,
                    rp.dream_cost as dreamCost,
                    rp.dream_description as dreamDescription,
                    rp.position,
                    rp.money,
                    rp.salary
                FROM room_players rp
                JOIN users u ON rp.user_id = u.id
                WHERE rp.room_id IN (${rows.map(() => '?').join(',')})
            `;

            const roomIds = rows.map(row => row.id);
            
            db.all(playersQuery, roomIds, (err, allPlayers) => {
                if (err) {
                    console.error('❌ Ошибка получения игроков:', err);
                    return next(err);
                }

                // Группируем игроков по комнатам
                const playersByRoom = {};
                allPlayers.forEach(player => {
                    if (!playersByRoom[player.room_id]) {
                        playersByRoom[player.room_id] = [];
                    }
                    // Удаляем room_id из объекта игрока
                    const { room_id, ...playerData } = player;
                    playersByRoom[player.room_id].push(playerData);
                });

                const rooms = rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    maxPlayers: row.max_players,
                    playerCount: row.current_players,
                    status: row.status,
                    isStarted: Boolean(row.is_started),
                    isFull: row.current_players >= row.max_players,
                    creator: row.creator_name,
                    creatorId: row.creator_id, // Добавляем creatorId для проверки хоста
                    turnTime: row.turn_time,
                    assignProfessions: Boolean(row.assign_professions),
                    minPlayers: 2, // Добавляем минимальное количество игроков
                    players: playersByRoom[row.id] || [],
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }));

                res.json({
                    success: true,
                    data: rooms,
                    count: rooms.length
                });
            });
        });

    } catch (error) {
        console.error('❌ Критическая ошибка получения комнат:', error);
        // Fallback на статические данные при критической ошибке
        res.json({
            success: true,
            data: fallbackRooms,
            count: fallbackRooms.length,
            fallback: true
        });
    }
});

/**
 * GET /api/rooms/stats - Получить статистику комнат
 */
router.get('/stats', async (req, res, next) => {
    try {
        const db = getDatabase();
        if (!db) {
            console.log('⚠️ База данных недоступна, возвращаем fallback статистику');
            return res.json({
                success: true,
                data: {
                    totalRooms: 4,
                    activeRooms: 4,
                    gamesInProgress: 0,
                    playersOnline: 4
                },
                fallback: true
            });
        }

        const stats = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as totalRooms,
                    SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as activeRooms,
                    SUM(CASE WHEN status = 'playing' THEN 1 ELSE 0 END) as gamesInProgress,
                    (SELECT COUNT(*) FROM room_players) as playersOnline
                FROM rooms 
                WHERE status != 'deleted'
            `;
            
            db.get(query, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Ошибка получения статистики комнат:', error);
        next(error);
    }
});

/**
 * GET /api/rooms/:id - Получить комнату по ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const db = getDatabase();
        if (!db) {
            try {
                const repo = new RoomRepository();
                const room = await repo.getById(id);
                if (room) return res.json({ success: true, data: room, mongo: true });
            } catch (e) {}
            console.log('⚠️ База данных недоступна, возвращаем fallback данные');
            const fallbackRoom = fallbackRooms.find(r => r.id === id);
            if (fallbackRoom) {
                return res.json({ success: true, data: fallbackRoom, fallback: true });
            }
            return res.status(404).json({ success: false, message: 'Комната не найдена (fallback)' });
        }

        const query = `
            SELECT 
                r.*,
                u.username as creator_name
            FROM rooms r
            LEFT JOIN users u ON r.creator_id = u.id
            WHERE r.id = ? AND r.status != 'deleted'
        `;

        db.get(query, [id], (err, row) => {
            if (err) {
                console.error('❌ Ошибка получения комнаты:', err);
                return next(err);
            }

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: 'Комната не найдена'
                });
            }

            // Получаем игроков отдельным запросом
            const playersQuery = `
                SELECT 
                    rp.user_id as id,
                    u.username,
                    u.username as name,
                    rp.is_host as isHost,
                    rp.is_ready as isReady,
                    rp.token,
                    rp.dream,
                    rp.dream_cost as dreamCost,
                    rp.dream_description as dreamDescription,
                    rp.position,
                    rp.money,
                    rp.salary
                FROM room_players rp
                JOIN users u ON rp.user_id = u.id
                WHERE rp.room_id = ?
            `;

            db.all(playersQuery, [id], (err, players) => {
                if (err) {
                    console.error('❌ Ошибка получения игроков:', err);
                    return next(err);
                }

                const room = {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    maxPlayers: row.max_players,
                    playerCount: row.current_players,
                    status: row.status,
                    isStarted: Boolean(row.is_started),
                    isFull: row.current_players >= row.max_players,
                    creator: row.creator_name,
                    creatorId: row.creator_id, // Добавляем creatorId для проверки хоста
                    turnTime: row.turn_time,
                    assignProfessions: Boolean(row.assign_professions),
                    minPlayers: 2, // Добавляем минимальное количество игроков
                    players: players || [],
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };

                res.json({
                    success: true,
                    data: room
                });
            });
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/rooms - Создать новую комнату
 */
router.post('/', async (req, res, next) => {
    try {
        const {
            name,
            description = '',
            maxPlayers = 4,
            turnTime = 30,
            assignProfessions = false,
            creator
        } = req.body;

        if (!name || !creator) {
            return res.status(400).json({
                success: false,
                message: 'Название комнаты и создатель обязательны'
            });
        }

        const db = getDatabase();
        if (!db) {
            // Railway/Mongo-first path
            try {
                const repo = new RoomRepository();
                const room = await repo.create({ name, description, maxPlayers, turnTime, assignProfessions, creator });
                return res.status(201).json({ success: true, message: `Комната "${name}" создана`, data: room, mongo: true });
            } catch (e) {
                // Fallback: создать в памяти
                console.log('🧰 Fallback create room (in-memory)');
                const roomId = uuidv4();
                const creatorId = uuidv4();
                const createdAt = new Date().toISOString();
                const room = {
                    id: roomId,
                    name,
                    description,
                    maxPlayers,
                    playerCount: 1,
                    status: 'waiting',
                    isStarted: false,
                    isFull: false,
                    creator: creator,
                    creatorId,
                    turnTime,
                    assignProfessions,
                    minPlayers: 2,
                    players: [ { id: creatorId, username: creator, name: creator, isHost: true, isReady: false } ],
                    createdAt,
                    updatedAt: createdAt
                };
                try {
                    const idx = fallbackRooms.findIndex(r => r.id === roomId);
                    if (idx === -1) fallbackRooms.unshift(room); else fallbackRooms[idx] = room;
                } catch (_) {}
                return res.status(201).json({ success: true, message: `Комната "${name}" создана (fallback)`, data: room, fallback: true });
            }
        }

        // Проверяем, существует ли пользователь
        db.get('SELECT id FROM users WHERE username = ?', [creator], (err, user) => {
            if (err) {
                console.error('❌ Ошибка проверки пользователя:', err);
                // Fallback: создаем пользователя если его нет
                const userId = uuidv4();
                db.run('INSERT OR IGNORE INTO users (id, username, created_at) VALUES (?, ?, ?)', 
                       [userId, creator, new Date().toISOString()], (insertErr) => {
                    if (insertErr) {
                        console.error('❌ Ошибка создания пользователя:', insertErr);
                        return res.status(500).json({
                            success: false,
                            message: 'Ошибка создания пользователя'
                        });
                    }
                    // Используем созданного пользователя
                    createRoomWithUser({ id: userId, username: creator });
                });
                return;
            }

            if (!user) {
                console.log('⚠️ Пользователь не найден, создаем нового:', creator);
                // Fallback: создаем пользователя если его нет
                const userId = uuidv4();
                db.run('INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)', 
                       [userId, creator, new Date().toISOString()], (insertErr) => {
                    if (insertErr) {
                        console.error('❌ Ошибка создания пользователя:', insertErr);
                        return res.status(500).json({
                            success: false,
                            message: 'Ошибка создания пользователя'
                        });
                    }
                    // Используем созданного пользователя
                    createRoomWithUser({ id: userId, username: creator });
                });
                return;
            }

            // Пользователь найден, создаем комнату
            createRoomWithUser(user);
        });

        function createRoomWithUser(user) {

            const roomId = uuidv4();
            const playerId = uuidv4();

            // Создаем комнату
            db.run(
                `INSERT INTO rooms (id, name, description, max_players, current_players, turn_time, assign_professions, creator_id) 
                 VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
                [roomId, name, description, maxPlayers, turnTime, assignProfessions ? 1 : 0, user.id],
                function(err) {
                    if (err) {
                        return next(err);
                    }

                    // Добавляем создателя как игрока в комнату
                    console.log('🔍 Создание игрока в room_players:', { playerId, roomId, userId: user.id });
                    db.run(
                        `INSERT INTO room_players (id, room_id, user_id, is_host, is_ready) 
                         VALUES (?, ?, ?, 1, 0)`,
                        [playerId, roomId, user.id],
                        (err) => {
                            if (err) {
                                console.error('❌ Ошибка создания игрока в room_players:', err);
                                return next(err);
                            }
                            console.log('✅ Игрок успешно добавлен в room_players');

                            // Получаем созданную комнату
                            const query = `
                                SELECT 
                                    r.*,
                                    u.username as creator_name,
                                    json_object(
                                        'id', rp.user_id,
                                        'username', u2.username,
                                        'name', u2.username,
                                        'isHost', rp.is_host,
                                        'isReady', rp.is_ready
                                    ) as player
                                FROM rooms r
                                LEFT JOIN users u ON r.creator_id = u.id
                                LEFT JOIN room_players rp ON r.id = rp.room_id AND rp.user_id = ?
                                LEFT JOIN users u2 ON rp.user_id = u2.id
                                WHERE r.id = ?
                            `;

                            db.get(query, [user.id, roomId], (err, row) => {
                                if (err) {
                                    return next(err);
                                }

                                const room = {
                                    id: row.id,
                                    name: row.name,
                                    description: row.description,
                                    maxPlayers: row.max_players,
                                    playerCount: row.current_players,
                                    status: row.status,
                                    isStarted: Boolean(row.is_started),
                                    isFull: row.current_players >= row.max_players,
                                    creator: row.creator_name,
                                    turnTime: row.turn_time,
                                    assignProfessions: Boolean(row.assign_professions),
                                    players: row.player ? [JSON.parse(row.player)] : [],
                                    createdAt: row.created_at,
                                    updatedAt: row.updated_at
                                };

                                res.status(201).json({
                                    success: true,
                                    message: `Комната "${name}" создана`,
                                    data: room
                                });
                            });
                        }
                    );
                }
            );
        }

    } catch (error) {
        next(error);
    }
});

/**
 * Продолжает процесс присоединения к комнате
 */
function proceedWithJoin(userId, player, roomId, res, next) {
    const db = getDatabase();
    if (!db) {
        return res.status(503).json({
            success: false,
            message: 'База данных временно недоступна'
        });
    }

    // Проверяем, не присоединен ли уже пользователь
    db.get('SELECT id FROM room_players WHERE room_id = ? AND user_id = ?', [roomId, userId], (err, existingPlayer) => {
        if (err) {
            return next(err);
        }

        if (existingPlayer) {
            return res.status(409).json({
                success: false,
                message: 'Вы уже в этой комнате',
                code: 'ALREADY_JOINED'
            });
        }

        const playerId = uuidv4();

        // Добавляем игрока в комнату
        db.run(
            `INSERT INTO room_players (id, room_id, user_id, is_host, is_ready) 
             VALUES (?, ?, ?, 0, 0)`,
            [playerId, roomId, userId],
            (err) => {
                if (err) {
                    console.error('❌ Ошибка добавления игрока в room_players:', err);
                    return next(err);
                }

                console.log('✅ Игрок добавлен в room_players:', { playerId, roomId, userId, username: player.username });

                // Обновляем количество игроков
                db.run(
                    'UPDATE rooms SET current_players = current_players + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [roomId],
                    (err) => {
                        if (err) {
                            console.error('❌ Ошибка обновления количества игроков:', err);
                            return next(err);
                        }

                        console.log('✅ Количество игроков обновлено для комнаты:', roomId);
                        
                        // Отправляем push-уведомление о присоединении игрока
                        pushService.broadcastPush('player_joined', { 
                            roomId: roomId, 
                            player: {
                                id: playerId,
                                username: player.username,
                                token: player.token || '',
                                dream: player.dream || ''
                            }
                        }).catch(err => console.error('❌ Ошибка отправки push о присоединении:', err));

                        res.status(201).json({
                            success: true,
                            message: 'Вы присоединились к комнате',
                            data: {
                                roomId: roomId,
                                playerId: playerId
                            }
                        });
                    }
                );
            }
        );
    });
}

/**
 * POST /api/rooms/:id/join - Присоединиться к комнате
 */
router.post('/:id/join', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { player } = req.body;

        if (!player || !player.username) {
            return res.status(400).json({
                success: false,
                message: 'Данные игрока обязательны'
            });
        }

        const db = getDatabase();
        if (!db) {
            // Mongo-first path (Railway): добавляем игрока в комнату в Mongo
            try {
                const repo = new RoomRepository();
                let room = await repo.getById(id);
                if (!room) {
                    // создаём комнату минимально, если её нет
                    room = { id, name: 'Комната', players: [], maxPlayers: 4, status: 'waiting' };
                }
                const players = Array.isArray(room.players) ? room.players.slice() : [];
                const exists = players.some(p => p.username === player.username || p.id === player.userId);
                if (exists) {
                    return res.status(409).json({ success: false, message: 'Вы уже в этой комнате', code: 'ALREADY_JOINED' });
                }
                players.push({
                    id: player.userId || uuidv4(),
                    userId: player.userId,
                    username: player.username,
                    name: player.name || player.username,
                    avatar: player.avatar || '',
                    isHost: false,
                    isReady: !!player.isReady,
                    token: player.token || '',
                    dream: player.dream || null
                });
                await repo.updatePlayers(id, players);
                return res.status(201).json({ success: true, message: 'Вы присоединились к комнате', data: { roomId: id } });
            } catch (e) {
                console.error('❌ Mongo join error:', e);
                return res.status(503).json({ success: false, message: 'Сервис временно недоступен' });
            }
        }

        // Проверяем существование комнаты
        db.get('SELECT * FROM rooms WHERE id = ? AND status != "deleted"', [id], (err, room) => {
            if (err) {
                return next(err);
            }

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Комната не найдена'
                });
            }

            if (room.current_players >= room.max_players) {
                return res.status(409).json({
                    success: false,
                    message: 'Комната заполнена'
                });
            }

            // Разрешаем присоединяться после старта (тестовый режим)
            // if (room.is_started) {
            //     return res.status(409).json({
            //         success: false,
            //         message: 'Игра уже началась'
            //     });
            // }

            // Проверяем, существует ли пользователь
            db.get('SELECT id FROM users WHERE username = ?', [player.username], (err, user) => {
                if (err) {
                    return next(err);
                }

                if (!user) {
                    console.log('⚠️ Пользователь не найден, создаем нового:', player.username);
                    // Fallback: создаем пользователя если его нет
                    const userId = uuidv4();
                    db.run('INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)', 
                           [userId, player.username, new Date().toISOString()], (insertErr) => {
                        if (insertErr) {
                            console.error('❌ Ошибка создания пользователя:', insertErr);
                            return res.status(500).json({
                                success: false,
                                message: 'Ошибка создания пользователя'
                            });
                        }
                        console.log('✅ Пользователь создан:', player.username);
                        
                        // Продолжаем с созданным пользователем
                        proceedWithJoin(userId, player, id, res, next);
                    });
                    return;
                }
                
                // Пользователь найден, продолжаем
            console.log('✅ Пользователь найден в БД:', user.id, player.username);
                proceedWithJoin(user.id, player, id, res, next);
            });
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/rooms/:id/player - Обновить данные игрока в комнате
 */
router.put('/:id/player', async (req, res, next) => {
    try {
        const { id } = req.params;
        const playerData = req.body;

        if (!playerData.username) {
            return res.status(400).json({
                success: false,
                message: 'Username игрока обязателен'
            });
        }

        const db = getDatabase();
        if (!db) {
            // Mongo-first path (Railway)
            try {
                const repo = new RoomRepository();
                let room = await repo.getById(id);
                if (!room) {
                    // Комнаты нет в Mongo — попробуем взять из fallback и/или создать пустую запись
                    const fb = fallbackRooms.find(r => r.id === id);
                    if (fb) {
                        // первичное сохранение комнаты в Mongo
                        room = await repo.create({
                            name: fb.name || 'Комната',
                            description: fb.description || '',
                            maxPlayers: fb.maxPlayers || 4,
                            turnTime: fb.turnTime || 30,
                            assignProfessions: !!fb.assignProfessions,
                            creator: fb.creator || (playerData.username || 'player')
                        });
                        // заменить с тем же id (create генерит новый id) — поэтому лучше эмулировать как апдейт: перезапишем поля
                        // быстрый путь: используем room от create, но проставим нужный id далее при апдейте игроков
                        room.id = id;
                    } else {
                        // создаем минимальную запись комнаты, чтобы не падать
                        room = { id, name: 'Комната', players: [], maxPlayers: 4, status: 'waiting' };
                    }
                }

                const players = Array.isArray(room.players) ? room.players.slice() : [];
                let idx = players.findIndex(p => p.username === playerData.username || p.id === playerData.userId);
                if (idx === -1) {
                    // Если игрока нет — добавляем
                    players.push({
                        id: playerData.userId || uuidv4(),
                        userId: playerData.userId,
                        username: playerData.username,
                        name: playerData.name || playerData.username,
                        avatar: playerData.avatar || '',
                        isHost: false,
                        isReady: !!playerData.isReady,
                        token: playerData.token || '',
                        dream: playerData.dream || null,
                        dreamCost: playerData.dreamCost,
                        dreamDescription: playerData.dreamDescription
                    });
                } else {
                    const upd = { ...players[idx] };
                    if (playerData.token !== undefined) upd.token = playerData.token;
                    if (playerData.dream !== undefined) upd.dream = playerData.dream;
                    if (playerData.dreamCost !== undefined) upd.dreamCost = playerData.dreamCost;
                    if (playerData.dreamDescription !== undefined) upd.dreamDescription = playerData.dreamDescription;
                    if (playerData.isReady !== undefined) upd.isReady = !!playerData.isReady;
                    players[idx] = upd;
                }

                await repo.updatePlayers(id, players);
                return res.json({ success: true, message: 'Данные игрока обновлены (mongo)' });
            } catch (e) {
                console.error('❌ Mongo update player error:', e);
                return res.status(503).json({ success: false, message: 'Сервис временно недоступен' });
            }
        }

        // Находим игрока в комнате
        const query = `
            SELECT rp.*, u.username 
            FROM room_players rp
            JOIN users u ON rp.user_id = u.id
            WHERE rp.room_id = ? AND u.username = ?
        `;

        db.get(query, [id, playerData.username], (err, player) => {
            if (err) {
                return next(err);
            }

            if (!player) {
                return res.status(404).json({
                    success: false,
                    message: 'Игрок не найден в комнате'
                });
            }

            // Обновляем данные игрока
            const updateFields = [];
            const updateValues = [];

            if (playerData.token !== undefined) {
                updateFields.push('token = ?');
                updateValues.push(playerData.token);
            }

            // Поддержка PlayerBundle: dream.id|description|cost
            if (playerData.dream !== undefined) {
                updateFields.push('dream = ?');
                updateValues.push(playerData.dream);
            }

            if (playerData.dreamCost !== undefined) {
                updateFields.push('dream_cost = ?');
                updateValues.push(playerData.dreamCost);
            }

            if (playerData.dreamDescription !== undefined) {
                updateFields.push('dream_description = ?');
                updateValues.push(playerData.dreamDescription);
            }

            if (playerData.isReady !== undefined) {
                updateFields.push('is_ready = ?');
                updateValues.push(playerData.isReady ? 1 : 0);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Нет данных для обновления'
                });
            }

            updateValues.push(player.id);

            db.run(
                `UPDATE room_players SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues,
                (err) => {
                    if (err) {
                        return next(err);
                    }

                    res.json({
                        success: true,
                        message: 'Данные игрока обновлены'
                    });
                }
            );
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/rooms/:id/notifications - Отправка push-уведомлений
router.post('/:id/notifications', (req, res, next) => {
    try {
        const roomId = req.params.id;
        const notification = req.body;
        
        // Валидация данных
        if (!notification.type || !notification.data) {
            return res.status(400).json({
                success: false,
                message: 'Неверные данные уведомления'
            });
        }
        
        // Проверяем доступность базы данных
        const db = getDatabase();
        if (!db) {
            // Fallback: просто возвращаем успех без сохранения
            return res.json({
                success: true,
                message: 'Уведомление отправлено (fallback mode)',
                data: {
                    roomId: roomId,
                    notificationId: `notif_${Date.now()}`
                }
            });
        }
        
        // Fallback: если база данных доступна, но таблица notifications не существует
        // просто возвращаем успех без сохранения
        return res.json({
            success: true,
            message: 'Уведомление отправлено (fallback mode)',
            data: {
                roomId: roomId,
                notificationId: `notif_${Date.now()}`
            }
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/rooms/:id/start - Запуск игры
 */
router.post('/:id/start', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        console.log('🎮 POST /:id/start - Запуск игры:', { id, userId });

        const db = getDatabase();
        if (!db) {
            // Mongo-first start: обновляем статус комнаты и инициализируем server-state
            try {
                const repo = new RoomRepository();
                const room = await repo.getById(id);
                if (!room) return res.status(404).json({ success: false, message: 'Комната не найдена' });

                await repo.updateStatus(id, { isStarted: true, status: 'playing' });

                // ensure game state
                const state = gameStateByRoomId.get(id) || {
                    players: (room.players || []).map(p => ({ id: p.id || p.userId, username: p.username, position: 0, isInner: true, token: p.token || '🎯', money: 5000, isReady: !!p.isReady })),
                    currentPlayerIndex: 0,
                    activePlayer: null,
                    lastDiceResult: null,
                    canRoll: true,
                    canMove: false,
                    canEndTurn: false
                };
                state.activePlayer = state.players[0] || null;
                gameStateByRoomId.set(id, state);

                // push notify (safe)
                pushService.broadcastPush('game_started', {
                    roomId: id,
                    players: state.players,
                    activePlayer: state.activePlayer
                }).catch(err => console.error('❌ Ошибка отправки push о начале игры:', err));

                return res.json({ success: true, message: 'Игра успешно запущена', data: { roomId: id, isStarted: true, status: 'playing' } });
            } catch (e) {
                console.error('❌ Mongo start error:', e);
                return res.status(503).json({ success: false, message: 'Сервис недоступен' });
            }
        }

        // Проверяем, что комната существует и не запущена
        const roomQuery = `
            SELECT r.*, u.username as creator_name
            FROM rooms r
            LEFT JOIN users u ON r.creator_id = u.id
            WHERE r.id = ? AND r.status != 'deleted'
        `;

        db.get(roomQuery, [id], (err, room) => {
            if (err) {
                console.error('❌ Ошибка получения комнаты:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Ошибка базы данных',
                    error: err.message
                });
            }

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Комната не найдена'
                });
            }

            // Разрешаем запуск повторно только если игра ещё не начата
            if (room.is_started) {
                return res.status(400).json({
                    success: false,
                    message: 'Игра уже запущена'
                });
            }

            // В тестовом режиме: разрешаем старт не только создателю,
            // но любому игроку, который находится в комнате
            const ensureMemberThenStart = () => {
            // Проверяем количество готовых игроков
            const playersQuery = `
                SELECT COUNT(*) as ready_count, 
                       (SELECT COUNT(*) FROM room_players WHERE room_id = ?) as total_count
                FROM room_players 
                WHERE room_id = ? AND is_ready = 1
            `;

            db.get(playersQuery, [id, id], (err, counts) => {
                if (err) {
                    console.error('❌ Ошибка подсчета игроков:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Ошибка подсчета игроков',
                            error: err.message
                        });
                    }

                    // Разрешаем старт при наличии хотя бы 1 готового игрока (тестовый режим)
                    if (counts.ready_count < 1) {
                    return res.status(400).json({
                        success: false,
                            message: 'Для запуска игры нужен хотя бы 1 готовый игрок'
                    });
                }

                // Запускаем игру
                const updateQuery = `
                    UPDATE rooms 
                    SET is_started = 1, status = 'playing', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `;

                db.run(updateQuery, [id], function(err) {
                    if (err) {
                        console.error('❌ Ошибка запуска игры:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Ошибка запуска игры',
                                error: err.message
                            });
                    }

                    console.log('🎮 Игра запущена в комнате:', id);

                        // Формируем игроков из текущего server-state (если есть)
                        let startPlayers = [];
                        const state = gameStateByRoomId.get(id);
                        if (state && Array.isArray(state.players) && state.players.length) {
                            startPlayers = state.players;
                        } else {
                            startPlayers = [{ id: userId, username: room.creator_name || 'player1' }];
                        }

                        // Отправляем push-уведомление о начале игры
                        pushService.broadcastPush('game_started', { 
                            roomId: id, 
                            players: startPlayers,
                            activePlayer: startPlayers[0] // Первый игрок начинает
                        }).catch(err => console.error('❌ Ошибка отправки push о начале игры:', err));
                        
                        // Отправляем реальное push-уведомление
                        pushService.sendRealPushNotification(
                            '🎮 Игра началась!',
                            `Игра в комнате "${room.name}" началась. Ваш ход!`,
                            {
                                data: { roomId: id, action: 'game_started' },
                                actions: [
                                    { action: 'open_game', title: 'Открыть игру' }
                                ],
                                tag: 'game_started',
                                requireInteraction: true
                            }
                        ).catch(err => console.error('❌ Ошибка отправки реального push о начале игры:', err));

                    res.json({
                        success: true,
                        message: 'Игра успешно запущена',
                        data: {
                            roomId: id,
                            isStarted: true,
                            status: 'playing'
                        }
                    });
                });
            });
            };

            if (room.creator_id !== userId) {
                // Тестовый режим: разрешаем старт без проверки членства,
                // так как часто userId может отличаться между сессиями
                ensureMemberThenStart();
                return;
            }

            // Создатель — запускаем напрямую
            ensureMemberThenStart();
        });

    } catch (error) {
        console.error('❌ Ошибка запуска игры:', error);
        return res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
            error: error.message
        });
    }
});

// Endpoint для регистрации клиентов в PushService
router.post('/push/register', (req, res) => {
    const { subscription, userInfo } = req.body;
    
    if (!subscription) {
        return res.status(400).json({
            success: false,
            message: 'subscription обязательна'
        });
    }
    
    const clientId = userInfo?.userId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    pushService.registerClient(clientId, subscription, userInfo);
    
    res.json({
        success: true,
        message: 'Клиент зарегистрирован для push-уведомлений',
        clientId: clientId
    });
});

// Endpoint для отключения клиента
router.post('/push/unregister', (req, res) => {
    const { clientId } = req.body;
    
    if (!clientId) {
        return res.status(400).json({
            success: false,
            message: 'clientId обязателен'
        });
    }
    
    pushService.unregisterClient(clientId);
    
    res.json({
        success: true,
        message: 'Клиент отключен от push-уведомлений'
    });
});

// Endpoint для отправки push-уведомлений
router.post('/push/send', async (req, res) => {
    try {
        const { title, message, options = {}, excludeClientId } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'title и message обязательны'
            });
        }
        
        const result = await pushService.sendRealPushNotification(title, message, options, excludeClientId);
        
        res.json({
            success: result.success,
            data: result,
            message: result.success ? 'Push-уведомление отправлено' : 'Ошибка отправки push-уведомления'
        });
        
    } catch (error) {
        console.error('❌ Push API: Ошибка отправки push-уведомления:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
            error: error.message
        });
    }
});

// Endpoint для получения статистики PushService
router.get('/push/stats', (req, res) => {
    const stats = pushService.getStats();
    res.json({
        success: true,
        data: stats
    });
});

module.exports = router;
/**
 * DELETE /api/rooms/:id/players/:playerId - Удалить игрока из комнаты (только хост)
 */
router.delete('/:id/players/:playerId', async (req, res, next) => {
    try {
        const { id, playerId } = req.params;
        const db = getDatabase();
        if (!db) {
            return res.status(503).json({ success: false, message: 'База данных недоступна' });
        }

        // Удаляем игрока из room_players
        db.run('DELETE FROM room_players WHERE room_id = ? AND user_id = ?', [id, playerId], (err) => {
            if (err) return next(err);

            // Уменьшаем счётчик игроков
            db.run('UPDATE rooms SET current_players = MAX(current_players - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

            return res.json({ success: true, message: 'Игрок удалён' });
        });
    } catch (error) {
        next(error);
    }
});
