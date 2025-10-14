/**
 * API маршруты для push-уведомлений
 * Версия: 1.0.0
 * Дата: 12 октября 2024
 */

const express = require('express');
const router = express.Router();

// Импортируем PushService
const PushService = require('../services/PushService');

// Создаем глобальный экземпляр PushService
let pushService;

// Инициализация PushService при первом запросе
const initPushService = () => {
    if (!pushService) {
        pushService = new PushService();
        console.log('📡 Push API: PushService инициализирован');
    }
    return pushService;
};

/**
 * POST /api/push/register
 * Регистрация клиента для получения push-уведомлений
 */
router.post('/register', async (req, res) => {
    try {
        const pushService = initPushService();
        
        const { clientId, userInfo } = req.body;
        
        if (!clientId) {
            return res.status(400).json({
                success: false,
                error: 'clientId обязателен'
            });
        }

        // Регистрируем клиента
        pushService.registerClient(clientId, userInfo);

        console.log(`📱 Push API: Клиент ${clientId} зарегистрирован для push-уведомлений`);

        res.json({
            success: true,
            message: 'Клиент зарегистрирован для push-уведомлений',
            clientId: clientId,
            stats: pushService.getStats()
        });
    } catch (error) {
        console.error('❌ Push API: Ошибка регистрации клиента:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка регистрации клиента'
        });
    }
});

/**
 * POST /api/push/unregister
 * Отключение клиента от push-уведомлений
 */
router.post('/unregister', async (req, res) => {
    try {
        const pushService = initPushService();
        
        const { clientId } = req.body;
        
        if (!clientId) {
            return res.status(400).json({
                success: false,
                error: 'clientId обязателен'
            });
        }

        // Отключаем клиента
        pushService.unregisterClient(clientId);

        console.log(`📱 Push API: Клиент ${clientId} отключен от push-уведомлений`);

        res.json({
            success: true,
            message: 'Клиент отключен от push-уведомлений',
            clientId: clientId,
            stats: pushService.getStats()
        });
    } catch (error) {
        console.error('❌ Push API: Ошибка отключения клиента:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка отключения клиента'
        });
    }
});

/**
 * GET /api/push/poll
 * Polling endpoint для получения push-уведомлений
 */
router.get('/poll', async (req, res) => {
    try {
        const pushService = initPushService();
        
        const { clientId } = req.query;
        
        if (!clientId) {
            return res.status(400).json({
                success: false,
                error: 'clientId обязателен'
            });
        }

        // Обновляем ping клиента
        const clientInfo = pushService.connectedClients.get(clientId);
        if (clientInfo) {
            clientInfo.lastPing = Date.now();
        }

        // Возвращаем пустой ответ (в реальном приложении здесь был бы long polling)
        res.json({
            success: true,
            message: 'Polling успешен',
            timestamp: new Date().toISOString(),
            stats: pushService.getStats()
        });
    } catch (error) {
        console.error('❌ Push API: Ошибка polling:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка polling'
        });
    }
});

/**
 * POST /api/push/broadcast
 * Отправка broadcast push-уведомления
 */
router.post('/broadcast', async (req, res) => {
    try {
        const pushService = initPushService();
        
        const { type, data, excludeClientId } = req.body;
        
        if (!type || !data) {
            return res.status(400).json({
                success: false,
                error: 'type и data обязательны'
            });
        }

        // Отправляем broadcast push
        const pushResult = await pushService.broadcastPush(type, data, excludeClientId);

        console.log(`📡 Push API: Broadcast push отправлен (${type})`);

        res.json({
            success: true,
            message: 'Broadcast push отправлен',
            pushId: pushResult.id,
            type: pushResult.type,
            timestamp: pushResult.timestamp,
            stats: pushService.getStats()
        });
    } catch (error) {
        console.error('❌ Push API: Ошибка broadcast push:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка отправки broadcast push'
        });
    }
});

/**
 * GET /api/push/stats
 * Получение статистики push-сервиса
 */
router.get('/stats', async (req, res) => {
    try {
        const pushService = initPushService();
        
        const stats = pushService.getStats();
        const activeClients = pushService.getActiveClients();

        res.json({
            success: true,
            stats: stats,
            activeClients: activeClients
        });
    } catch (error) {
        console.error('❌ Push API: Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статистики'
        });
    }
});

module.exports = router;
