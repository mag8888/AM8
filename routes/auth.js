const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');

const router = express.Router();
const db = getDatabase();

/**
 * POST /api/auth/login - Вход пользователя
 */
router.post('/login', async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username && !email) {
            return res.status(400).json({
                success: false,
                message: 'Username или Email обязателен'
            });
        }

        // Для демо-версии пропускаем проверку пароля
        // В реальном приложении здесь была бы проверка хеша пароля
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
                created_at
            FROM users 
            WHERE username = COALESCE(?, username) OR email = COALESCE(?, email)
        `;

        db.get(query, [username || null, email || null], (err, user) => {
            if (err) {
                return next(err);
            }

            if (!user) {
                // Автоматически создаем пользователя для демо
                const userId = uuidv4();
                const finalUsername = username || (email ? email.split('@')[0] : `user_${userId.slice(0,8)}`);
                
                db.run(
                    `INSERT INTO users (id, username, level, games_played, games_won, rating) 
                     VALUES (?, ?, 1, 0, 0, 1000)`,
                    [userId, finalUsername],
                    function(err) {
                        if (err) {
                            return next(err);
                        }

                        const newUser = {
                            id: userId,
                            username: finalUsername,
                            email: email || null,
                            avatar: '',
                            level: 1,
                            gamesPlayed: 0,
                            gamesWon: 0,
                            rating: 1000,
                            createdAt: new Date().toISOString()
                        };

                        // Обновляем время последнего входа
                        db.run(
                            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                            [userId]
                        );

                        res.json({
                            success: true,
                            message: 'Пользователь создан и авторизован',
                            data: {
                                user: newUser,
                                token: 'demo_token_' + userId
                            }
                        });
                    }
                );
            } else {
                // Обновляем время последнего входа
                db.run(
                    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    [user.id]
                );

                const userData = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    level: user.level,
                    gamesPlayed: user.games_played,
                    gamesWon: user.games_won,
                    rating: user.rating,
                    createdAt: user.created_at
                };

                res.json({
                    success: true,
                    message: 'Успешная авторизация',
                    data: {
                        user: userData,
                        token: 'demo_token_' + user.id
                    }
                });
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/register - Регистрация пользователя
 */
router.post('/register', async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

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
                `INSERT INTO users (id, username, email, level, games_played, games_won, rating) 
                 VALUES (?, ?, ?, 1, 0, 0, 1000)`,
                [userId, username, email],
                function(err) {
                    if (err) {
                        return next(err);
                    }

                    const user = {
                        id: userId,
                        username,
                        email,
                        avatar: '',
                        level: 1,
                        gamesPlayed: 0,
                        gamesWon: 0,
                        rating: 1000,
                        createdAt: new Date().toISOString()
                    };

                    res.status(201).json({
                        success: true,
                        message: 'Пользователь зарегистрирован',
                        data: {
                            user,
                            token: 'demo_token_' + userId
                        }
                    });
                }
            );
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/logout - Выход пользователя
 */
router.post('/logout', async (req, res, next) => {
    try {
        // В демо-версии просто возвращаем успех
        res.json({
            success: true,
            message: 'Выход выполнен'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/auth/me - Получить текущего пользователя
 */
router.get('/me', async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Токен не предоставлен'
            });
        }

        // Извлекаем ID пользователя из токена (для демо)
        const userId = token.replace('demo_token_', '');
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Неверный токен'
            });
        }

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
                created_at
            FROM users 
            WHERE id = ?
        `;

        db.get(query, [userId], (err, user) => {
            if (err) {
                return next(err);
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Пользователь не найден'
                });
            }

            const userData = {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                level: user.level,
                gamesPlayed: user.games_played,
                gamesWon: user.games_won,
                rating: user.rating,
                createdAt: user.created_at
            };

            res.json({
                success: true,
                data: userData
            });
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
