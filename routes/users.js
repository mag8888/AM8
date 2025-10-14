const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');

const router = express.Router();
const db = getDatabase();

/**
 * GET /api/users - Получить список пользователей
 */
router.get('/', async (req, res, next) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const query = `
            SELECT 
                id,
                username,
                email,
                avatar,
                level,
                games_played,
                games_won,
                rating,
                created_at,
                last_login
            FROM users 
            ORDER BY rating DESC, games_played DESC
            LIMIT ? OFFSET ?
        `;

        db.all(query, [limit, offset], (err, rows) => {
            if (err) {
                console.error('❌ Ошибка получения пользователей:', err);
                return next(err);
            }

            const users = rows.map(row => ({
                id: row.id,
                username: row.username,
                email: row.email,
                avatar: row.avatar,
                level: row.level,
                gamesPlayed: row.games_played,
                gamesWon: row.games_won,
                rating: row.rating,
                createdAt: row.created_at,
                lastLogin: row.last_login
            }));

            res.json({
                success: true,
                data: users,
                count: users.length
            });
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/:username - Получить пользователя по username
 */
router.get('/:username', async (req, res, next) => {
    try {
        const { username } = req.params;

        const query = `
            SELECT 
                id,
                username,
                email,
                avatar,
                level,
                games_played,
                games_won,
                rating,
                created_at,
                last_login
            FROM users 
            WHERE username = ?
        `;

        db.get(query, [username], (err, row) => {
            if (err) {
                console.error('❌ Ошибка получения пользователя:', err);
                return next(err);
            }

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: 'Пользователь не найден'
                });
            }

            const user = {
                id: row.id,
                username: row.username,
                email: row.email,
                avatar: row.avatar,
                level: row.level,
                gamesPlayed: row.games_played,
                gamesWon: row.games_won,
                rating: row.rating,
                createdAt: row.created_at,
                lastLogin: row.last_login
            };

            res.json({
                success: true,
                data: user
            });
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users - Создать нового пользователя
 */
router.post('/', async (req, res, next) => {
    try {
        const {
            username,
            email,
            avatar = '',
            level = 1,
            gamesPlayed = 0,
            gamesWon = 0,
            rating = 1000
        } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username обязателен'
            });
        }

        // Проверяем, существует ли пользователь
        db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
            if (err) {
                return next(err);
            }

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Пользователь с таким username или email уже существует'
                });
            }

            const userId = uuidv4();

            db.run(
                `INSERT INTO users (id, username, email, avatar, level, games_played, games_won, rating) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, username, email, avatar, level, gamesPlayed, gamesWon, rating],
                function(err) {
                    if (err) {
                        return next(err);
                    }

                    const user = {
                        id: userId,
                        username,
                        email,
                        avatar,
                        level,
                        gamesPlayed,
                        gamesWon,
                        rating,
                        createdAt: new Date().toISOString()
                    };

                    res.status(201).json({
                        success: true,
                        message: 'Пользователь создан',
                        data: user
                    });
                }
            );
        });

    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/users/:username - Обновить данные пользователя
 */
router.put('/:username', async (req, res, next) => {
    try {
        const { username } = req.params;
        const updateData = req.body;

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Нет данных для обновления'
            });
        }

        // Проверяем существование пользователя
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
            if (err) {
                return next(err);
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Пользователь не найден'
                });
            }

            // Формируем запрос обновления
            const updateFields = [];
            const updateValues = [];

            if (updateData.avatar !== undefined) {
                updateFields.push('avatar = ?');
                updateValues.push(updateData.avatar);
            }

            if (updateData.level !== undefined) {
                updateFields.push('level = ?');
                updateValues.push(updateData.level);
            }

            if (updateData.gamesPlayed !== undefined) {
                updateFields.push('games_played = ?');
                updateValues.push(updateData.gamesPlayed);
            }

            if (updateData.gamesWon !== undefined) {
                updateFields.push('games_won = ?');
                updateValues.push(updateData.gamesWon);
            }

            if (updateData.rating !== undefined) {
                updateFields.push('rating = ?');
                updateValues.push(updateData.rating);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Нет допустимых полей для обновления'
                });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(user.id);

            db.run(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues,
                (err) => {
                    if (err) {
                        return next(err);
                    }

                    res.json({
                        success: true,
                        message: 'Данные пользователя обновлены'
                    });
                }
            );
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/:username/stats - Получить статистику пользователя
 */
router.get('/:username/stats', async (req, res, next) => {
    try {
        const { username } = req.params;

        const query = `
            SELECT 
                u.username,
                u.level,
                u.games_played,
                u.games_won,
                u.rating,
                COUNT(DISTINCT rp.room_id) as rooms_joined,
                COUNT(DISTINCT CASE WHEN r.creator_id = u.id THEN r.id END) as rooms_created
            FROM users u
            LEFT JOIN room_players rp ON u.id = rp.user_id
            LEFT JOIN rooms r ON u.id = r.creator_id
            WHERE u.username = ?
            GROUP BY u.id
        `;

        db.get(query, [username], (err, row) => {
            if (err) {
                return next(err);
            }

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: 'Пользователь не найден'
                });
            }

            const stats = {
                username: row.username,
                level: row.level,
                gamesPlayed: row.games_played,
                gamesWon: row.games_won,
                rating: row.rating,
                roomsJoined: row.rooms_joined || 0,
                roomsCreated: row.rooms_created || 0,
                winRate: row.games_played > 0 ? Math.round((row.games_won / row.games_played) * 100) : 0
            };

            res.json({
                success: true,
                data: stats
            });
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
