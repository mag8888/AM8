const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

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
        return require('../database/init').getDatabase();
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
            console.log('🔄 Используем fallback данные для комнат');
            return res.json({
                success: true,
                data: fallbackRooms,
                count: fallbackRooms.length,
                fallback: true
            });
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
                u.username as creator_name,
                GROUP_CONCAT(
                    CASE 
                        WHEN rp.user_id IS NOT NULL 
                        THEN json_object(
                            'id', rp.user_id,
                            'username', u2.username,
                            'name', u2.username,
                            'isHost', rp.is_host,
                            'isReady', rp.is_ready,
                            'token', rp.token,
                            'dream', rp.dream,
                            'dreamCost', rp.dream_cost,
                            'position', rp.position,
                            'money', rp.money,
                            'salary', rp.salary
                        )
                        ELSE NULL
                    END
                ) as players
            FROM rooms r
            LEFT JOIN users u ON r.creator_id = u.id
            LEFT JOIN room_players rp ON r.id = rp.room_id
            LEFT JOIN users u2 ON rp.user_id = u2.id
            WHERE r.status != 'deleted'
            GROUP BY r.id
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

            const rooms = rows.map(row => {
                const players = row.players 
                    ? row.players.split(',').map(p => {
                        try {
                            return JSON.parse(p);
                        } catch (e) {
                            return null;
                        }
                    }).filter(p => p !== null)
                    : [];

                return {
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
                    players: players,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
            });

            res.json({
                success: true,
                data: rooms,
                count: rooms.length
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
 * GET /api/rooms/:id - Получить комнату по ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                r.*,
                u.username as creator_name,
                GROUP_CONCAT(
                    CASE 
                        WHEN rp.user_id IS NOT NULL 
                        THEN json_object(
                            'id', rp.user_id,
                            'username', u2.username,
                            'name', u2.username,
                            'isHost', rp.is_host,
                            'isReady', rp.is_ready,
                            'token', rp.token,
                            'dream', rp.dream,
                            'dreamCost', rp.dream_cost,
                            'position', rp.position,
                            'money', rp.money,
                            'salary', rp.salary
                        )
                        ELSE NULL
                    END
                ) as players
            FROM rooms r
            LEFT JOIN users u ON r.creator_id = u.id
            LEFT JOIN room_players rp ON r.id = rp.room_id
            LEFT JOIN users u2 ON rp.user_id = u2.id
            WHERE r.id = ? AND r.status != 'deleted'
            GROUP BY r.id
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

            const players = row.players 
                ? row.players.split(',').map(p => {
                    try {
                        return JSON.parse(p);
                    } catch (e) {
                        return null;
                    }
                }).filter(p => p !== null)
                : [];

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
                players: players,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };

            res.json({
                success: true,
                data: room
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
                    db.run(
                        `INSERT INTO room_players (id, room_id, user_id, is_host, is_ready) 
                         VALUES (?, ?, ?, 1, 0)`,
                        [playerId, roomId, user.id],
                        (err) => {
                            if (err) {
                                return next(err);
                            }

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
        });

    } catch (error) {
        next(error);
    }
});

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

            if (room.is_started) {
                return res.status(409).json({
                    success: false,
                    message: 'Игра уже началась'
                });
            }

            // Проверяем, существует ли пользователь
            db.get('SELECT id FROM users WHERE username = ?', [player.username], (err, user) => {
                if (err) {
                    return next(err);
                }

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'Пользователь не найден'
                    });
                }

                // Проверяем, не присоединен ли уже пользователь
                db.get('SELECT id FROM room_players WHERE room_id = ? AND user_id = ?', [id, user.id], (err, existingPlayer) => {
                    if (err) {
                        return next(err);
                    }

                    if (existingPlayer) {
                        return res.status(409).json({
                            success: false,
                            message: 'Вы уже в этой комнате'
                        });
                    }

                    const playerId = uuidv4();

                    // Добавляем игрока в комнату
                    db.run(
                        `INSERT INTO room_players (id, room_id, user_id, is_host, is_ready) 
                         VALUES (?, ?, ?, 0, 0)`,
                        [playerId, id, user.id],
                        (err) => {
                            if (err) {
                                return next(err);
                            }

                            // Обновляем количество игроков
                            db.run(
                                'UPDATE rooms SET current_players = current_players + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                [id],
                                (err) => {
                                    if (err) {
                                        return next(err);
                                    }

                                    res.json({
                                        success: true,
                                        message: 'Вы присоединились к комнате'
                                    });
                                }
                            );
                        }
                    );
                });
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

module.exports = router;