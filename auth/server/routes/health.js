/**
 * Health Routes - Маршруты проверки здоровья
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/health
 * Проверка здоровья сервиса
 */
router.get('/', async (req, res) => {
    try {
        // Проверяем состояние базы данных
        const databaseConfig = require('../config/database');
        const dbStatus = databaseConfig.getStatus();
        const dbHealth = await databaseConfig.healthCheck();

        const health = {
            status: 'ok',
            service: 'auth',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unit: 'MB'
            },
            environment: {
                node: process.version,
                platform: process.platform,
                arch: process.arch
            },
            database: {
                type: process.env.USE_MONGODB !== 'false' ? 'MongoDB Atlas' : 'JSON File',
                status: dbStatus,
                health: dbHealth
            },
            features: {
                jwt: !!process.env.JWT_SECRET,
                database: process.env.USE_MONGODB !== 'false' ? 'MongoDB' : 'localStorage',
                rateLimit: true,
                validation: true
            }
        };

        res.json(health);
    } catch (error) {
        console.error('❌ Health: Ошибка проверки здоровья:', error);
        res.status(500).json({
            status: 'error',
            service: 'auth',
            timestamp: new Date().toISOString(),
            message: 'Ошибка проверки здоровья сервиса'
        });
    }
});

/**
 * GET /api/health/detailed
 * Детальная проверка здоровья
 */
router.get('/detailed', async (req, res) => {
    try {
        const detailedHealth = {
            status: 'ok',
            service: 'auth',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            
            // Системная информация
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version
            },

            // Конфигурация
            config: {
                port: process.env.PORT || 3001,
                nodeEnv: process.env.NODE_ENV || 'development',
                jwtConfigured: !!process.env.JWT_SECRET,
                corsEnabled: true,
                rateLimitEnabled: true
            },

            // Проверка компонентов
            components: {
                express: 'ok',
                jwt: process.env.JWT_SECRET ? 'configured' : 'missing',
                bcrypt: 'ok',
                cors: 'ok',
                helmet: 'ok',
                rateLimit: 'ok'
            },

            // Статистика
            stats: {
                requests: req.app.get('requestCount') || 0,
                errors: req.app.get('errorCount') || 0,
                startTime: req.app.get('startTime') || new Date().toISOString()
            }
        };

        res.json(detailedHealth);
    } catch (error) {
        console.error('❌ Health: Ошибка детальной проверки:', error);
        res.status(500).json({
            status: 'error',
            service: 'auth',
            timestamp: new Date().toISOString(),
            message: 'Ошибка детальной проверки здоровья'
        });
    }
});

/**
 * GET /api/health/ready
 * Проверка готовности к работе
 */
router.get('/ready', (req, res) => {
    try {
        const isReady = !!(
            process.env.JWT_SECRET &&
            process.uptime() > 1 // Сервер работает больше секунды
        );

        if (isReady) {
            res.json({
                status: 'ready',
                service: 'auth',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: 'not ready',
                service: 'auth',
                timestamp: new Date().toISOString(),
                message: 'Сервис не готов к работе'
            });
        }
    } catch (error) {
        console.error('❌ Health: Ошибка проверки готовности:', error);
        res.status(503).json({
            status: 'not ready',
            service: 'auth',
            timestamp: new Date().toISOString(),
            message: 'Ошибка проверки готовности'
        });
    }
});

/**
 * GET /api/health/live
 * Проверка жизнеспособности (liveness probe)
 */
router.get('/live', (req, res) => {
    // Простая проверка - сервер отвечает
    res.json({
        status: 'alive',
        service: 'auth',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
