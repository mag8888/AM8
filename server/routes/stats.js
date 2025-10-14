const express = require('express');
const { getDatabase } = require('../database/init');

const router = express.Router();
const db = getDatabase();

/**
 * GET /api/stats - Получить общую статистику
 */
router.get('/', async (req, res, next) => {
    try {
        const queries = [
            // Общее количество пользователей
            'SELECT COUNT(*) as total_users FROM users',
            
            // Общее количество комнат
            'SELECT COUNT(*) as total_rooms FROM rooms WHERE status != "deleted"',
            
            // Активные комнаты
            'SELECT COUNT(*) as active_rooms FROM rooms WHERE status = "waiting" AND is_started = 0',
            
            // Игры в процессе
            'SELECT COUNT(*) as games_in_progress FROM rooms WHERE is_started = 1',
            
            // Игроки онлайн (в активных комнатах)
            'SELECT COUNT(DISTINCT rp.user_id) as players_online FROM room_players rp JOIN rooms r ON rp.room_id = r.id WHERE r.status != "deleted"'
        ];

        const results = {};

        let completed = 0;
        queries.forEach((query, index) => {
            db.get(query, [], (err, row) => {
                if (err) {
                    return next(err);
                }

                switch (index) {
                    case 0:
                        results.totalUsers = row.total_users;
                        break;
                    case 1:
                        results.totalRooms = row.total_rooms;
                        break;
                    case 2:
                        results.activeRooms = row.active_rooms;
                        break;
                    case 3:
                        results.gamesInProgress = row.games_in_progress;
                        break;
                    case 4:
                        results.playersOnline = row.players_online;
                        break;
                }

                completed++;
                if (completed === queries.length) {
                    res.json({
                        success: true,
                        data: results,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/rooms - Получить статистику по комнатам
 */
router.get('/rooms', async (req, res, next) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
                COUNT(CASE WHEN status = 'playing' THEN 1 END) as playing,
                COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished,
                COUNT(CASE WHEN assign_professions = 1 THEN 1 END) as with_professions,
                COUNT(CASE WHEN assign_professions = 0 THEN 1 END) as without_professions,
                AVG(current_players) as avg_players,
                AVG(max_players) as avg_max_players
            FROM rooms 
            WHERE status != 'deleted'
        `;

        db.get(query, [], (err, row) => {
            if (err) {
                return next(err);
            }

            const stats = {
                total: row.total || 0,
                waiting: row.waiting || 0,
                playing: row.playing || 0,
                finished: row.finished || 0,
                withProfessions: row.with_professions || 0,
                withoutProfessions: row.without_professions || 0,
                avgPlayers: Math.round(row.avg_players || 0),
                avgMaxPlayers: Math.round(row.avg_max_players || 0)
            };

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/users - Получить статистику по пользователям
 */
router.get('/users', async (req, res, next) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                AVG(level) as avg_level,
                AVG(games_played) as avg_games_played,
                AVG(games_won) as avg_games_won,
                AVG(rating) as avg_rating,
                MAX(rating) as max_rating,
                MIN(rating) as min_rating,
                COUNT(CASE WHEN games_played > 0 THEN 1 END) as active_players
            FROM users
        `;

        db.get(query, [], (err, row) => {
            if (err) {
                return next(err);
            }

            const stats = {
                total: row.total || 0,
                avgLevel: Math.round(row.avg_level || 0),
                avgGamesPlayed: Math.round(row.avg_games_played || 0),
                avgGamesWon: Math.round(row.avg_games_won || 0),
                avgRating: Math.round(row.avg_rating || 0),
                maxRating: row.max_rating || 0,
                minRating: row.min_rating || 0,
                activePlayers: row.active_players || 0
            };

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/leaderboard - Получить таблицу лидеров
 */
router.get('/leaderboard', async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        const query = `
            SELECT 
                username,
                level,
                games_played,
                games_won,
                rating,
                CASE 
                    WHEN games_played > 0 
                    THEN ROUND((games_won * 100.0 / games_played), 2)
                    ELSE 0 
                END as win_rate
            FROM users 
            WHERE games_played > 0
            ORDER BY rating DESC, win_rate DESC, games_played DESC
            LIMIT ?
        `;

        db.all(query, [limit], (err, rows) => {
            if (err) {
                return next(err);
            }

            const leaderboard = rows.map((row, index) => ({
                position: index + 1,
                username: row.username,
                level: row.level,
                gamesPlayed: row.games_played,
                gamesWon: row.games_won,
                rating: row.rating,
                winRate: row.win_rate
            }));

            res.json({
                success: true,
                data: leaderboard,
                count: leaderboard.length,
                timestamp: new Date().toISOString()
            });
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
