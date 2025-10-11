/**
 * MongoAuth Routes - Маршруты авторизации с MongoDB
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const express = require('express');

// Импорт middleware
const { authenticateToken, authRateLimit } = require('../middleware/auth');

// Импорт сервисов
const mongoAuthService = require('../services/MongoAuthService');

const router = express.Router();

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
router.post('/register', 
    authRateLimit,
    async (req, res) => {
        try {
            console.log('📡 API: Регистрация пользователя:', req.body.email);
            
            const result = await mongoAuthService.register(req.body);
            
            res.status(201).json(result);
            
        } catch (error) {
            console.error('❌ API: Ошибка регистрации:', error);
            
            if (error.message === 'Пользователь с таким email уже существует') {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    errors: ['email']
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Произошла ошибка при регистрации',
                errors: ['server']
            });
        }
    }
);

/**
 * POST /api/auth/login
 * Авторизация пользователя
 */
router.post('/login',
    authRateLimit,
    async (req, res) => {
        try {
            console.log('📡 API: Авторизация пользователя:', req.body.email);
            
            const result = await mongoAuthService.login(req.body);
            
            res.json(result);
            
        } catch (error) {
            console.error('❌ API: Ошибка авторизации:', error);
            
            if (error.message === 'Неверный email или пароль') {
                return res.status(401).json({
                    success: false,
                    message: error.message,
                    errors: ['credentials']
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Произошла ошибка при авторизации',
                errors: ['server']
            });
        }
    }
);

/**
 * POST /api/auth/verify
 * Проверка токена
 */
router.post('/verify',
    async (req, res) => {
        try {
            const { token } = req.body;
            
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Токен не предоставлен'
                });
            }
            
            const decoded = await mongoAuthService.verifyToken(token);
            
            res.json({
                success: true,
                message: 'Токен действителен',
                user: decoded
            });
            
        } catch (error) {
            console.error('❌ API: Ошибка проверки токена:', error);
            
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * GET /api/auth/me
 * Получение текущего пользователя
 */
router.get('/me',
    authenticateToken,
    async (req, res) => {
        try {
            const user = await mongoAuthService.getCurrentUser(req.user.token);
            
            res.json({
                success: true,
                user: user
            });
            
        } catch (error) {
            console.error('❌ API: Ошибка получения пользователя:', error);
            
            res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
    }
);

/**
 * POST /api/auth/forgot-password
 * Восстановление пароля
 */
router.post('/forgot-password',
    authRateLimit,
    async (req, res) => {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email обязателен'
                });
            }
            
            const result = await mongoAuthService.forgotPassword(email);
            
            res.json(result);
            
        } catch (error) {
            console.error('❌ API: Ошибка восстановления пароля:', error);
            
            res.status(500).json({
                success: false,
                message: 'Произошла ошибка при восстановлении пароля'
            });
        }
    }
);

/**
 * POST /api/auth/logout
 * Выход из системы
 */
router.post('/logout',
    authenticateToken,
    async (req, res) => {
        try {
            // В JWT нет необходимости в серверном logout
            // Токен просто становится недействительным на клиенте
            
            res.json({
                success: true,
                message: 'Выход выполнен успешно'
            });
            
        } catch (error) {
            console.error('❌ API: Ошибка выхода:', error);
            
            res.status(500).json({
                success: false,
                message: 'Произошла ошибка при выходе'
            });
        }
    }
);

module.exports = router;
