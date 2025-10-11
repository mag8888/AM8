/**
 * Auth Routes - Маршруты авторизации
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Импорт middleware
const { authenticateToken, validateInput, rateLimit } = require('../middleware/auth');
const { validateEmail, validatePassword, validateUsername } = require('../middleware/validation');

// Импорт сервисов
const AuthService = require('../services/AuthService');
const UserModel = require('../models/UserModel');

const router = express.Router();

// Инициализация сервисов
const authService = new AuthService();
const userModel = new UserModel();

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
router.post('/register', 
    validateInput(['username', 'email', 'password']),
    async (req, res) => {
        try {
            const { username, email, password } = req.body;

            // Валидация данных
            const usernameValidation = validateUsername(username);
            if (!usernameValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверные данные пользователя',
                    errors: usernameValidation.errors
                });
            }

            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный email адрес',
                    errors: emailValidation.errors
                });
            }

            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный пароль',
                    errors: passwordValidation.errors
                });
            }

            // Проверка уникальности
            const emailExists = await userModel.isEmailUnique(email);
            if (!emailExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Пользователь с таким email уже существует',
                    errors: ['email']
                });
            }

            const usernameExists = await userModel.isUsernameUnique(username);
            if (!usernameExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Пользователь с таким именем уже существует',
                    errors: ['username']
                });
            }

            // Создание пользователя
            const passwordHash = await bcrypt.hash(password, 12);
            const user = await userModel.createUser({
                username,
                email,
                passwordHash
            });

            // Генерация токена
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    username: user.username 
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Обновление времени последнего входа
            await userModel.updateLastLogin(user.id);

            console.log('✅ Auth: Новый пользователь зарегистрирован:', user.email);

            res.status(201).json({
                success: true,
                message: 'Пользователь успешно зарегистрирован',
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.createdAt
                },
                token
            });

        } catch (error) {
            console.error('❌ Auth: Ошибка регистрации:', error);
            res.status(500).json({
                success: false,
                message: 'Внутренняя ошибка сервера'
            });
        }
    }
);

/**
 * POST /api/auth/login
 * Авторизация пользователя
 */
router.post('/login', 
    validateInput(['email', 'password']),
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Валидация email
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный email адрес',
                    errors: emailValidation.errors
                });
            }

            // Поиск пользователя
            const user = await userModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Неверный email или пароль',
                    errors: ['credentials']
                });
            }

            // Проверка активности пользователя
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Аккаунт деактивирован',
                    errors: ['account']
                });
            }

            // Проверка пароля
            const passwordValid = await bcrypt.compare(password, user.passwordHash);
            if (!passwordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Неверный email или пароль',
                    errors: ['credentials']
                });
            }

            // Генерация токена
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    username: user.username 
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Обновление времени последнего входа
            await userModel.updateLastLogin(user.id);

            console.log('✅ Auth: Пользователь авторизован:', user.email);

            res.json({
                success: true,
                message: 'Вход выполнен успешно',
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    lastLogin: new Date().toISOString()
                },
                token
            });

        } catch (error) {
            console.error('❌ Auth: Ошибка авторизации:', error);
            res.status(500).json({
                success: false,
                message: 'Внутренняя ошибка сервера'
            });
        }
    }
);

/**
 * POST /api/auth/logout
 * Выход из системы
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // В реальном приложении здесь можно добавить логику
        // для инвалидации токена (blacklist)
        
        console.log('✅ Auth: Пользователь вышел из системы:', req.user.email);

        res.json({
            success: true,
            message: 'Выход выполнен успешно'
        });

    } catch (error) {
        console.error('❌ Auth: Ошибка выхода:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * GET /api/auth/profile
 * Получение профиля пользователя
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await userModel.getUserProfile(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('❌ Auth: Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Обновление профиля пользователя
 */
router.put('/profile', 
    authenticateToken,
    validateInput(['username', 'email']),
    async (req, res) => {
        try {
            const { username, email } = req.body;
            const userId = req.user.id;

            // Валидация данных
            const usernameValidation = validateUsername(username);
            if (!usernameValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверное имя пользователя',
                    errors: usernameValidation.errors
                });
            }

            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный email адрес',
                    errors: emailValidation.errors
                });
            }

            // Проверка уникальности (исключая текущего пользователя)
            const emailExists = await userModel.isEmailUnique(email, userId);
            if (!emailExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Пользователь с таким email уже существует',
                    errors: ['email']
                });
            }

            const usernameExists = await userModel.isUsernameUnique(username, userId);
            if (!usernameExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Пользователь с таким именем уже существует',
                    errors: ['username']
                });
            }

            // Обновление пользователя
            const updatedUser = await userModel.updateUser(userId, {
                username,
                email
            });

            console.log('✅ Auth: Профиль пользователя обновлен:', updatedUser.email);

            res.json({
                success: true,
                message: 'Профиль успешно обновлен',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    username: updatedUser.username,
                    updatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Auth: Ошибка обновления профиля:', error);
            res.status(500).json({
                success: false,
                message: 'Внутренняя ошибка сервера'
            });
        }
    }
);

/**
 * GET /api/auth/validate
 * Валидация токена
 */
router.get('/validate', authenticateToken, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }

        res.json({
            success: true,
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('❌ Auth: Ошибка валидации токена:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * POST /api/auth/forgot-password
 * Запрос восстановления пароля
 */
router.post('/forgot-password', 
    validateInput(['email']),
    async (req, res) => {
        try {
            const { email } = req.body;

            // Валидация email
            const emailValidation = validateEmail(email);
            if (!emailValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный email адрес',
                    errors: emailValidation.errors
                });
            }

            // Поиск пользователя
            const user = await userModel.findByEmail(email);
            if (!user) {
                // В целях безопасности не раскрываем, существует ли пользователь
                return res.json({
                    success: true,
                    message: 'Если пользователь с таким email существует, на него отправлена ссылка для восстановления пароля'
                });
            }

            // В реальном приложении здесь должна быть отправка email
            // с токеном для восстановления пароля
            
            console.log('✅ Auth: Запрос восстановления пароля для:', user.email);

            res.json({
                success: true,
                message: 'Если пользователь с таким email существует, на него отправлена ссылка для восстановления пароля'
            });

        } catch (error) {
            console.error('❌ Auth: Ошибка восстановления пароля:', error);
            res.status(500).json({
                success: false,
                message: 'Внутренняя ошибка сервера'
            });
        }
    }
);

/**
 * POST /api/auth/reset-password
 * Сброс пароля по токену
 */
router.post('/reset-password', 
    validateInput(['token', 'password']),
    async (req, res) => {
        try {
            const { token, password } = req.body;

            // Валидация пароля
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный пароль',
                    errors: passwordValidation.errors
                });
            }

            // В реальном приложении здесь должна быть проверка токена
            // и обновление пароля пользователя
            
            res.json({
                success: true,
                message: 'Пароль успешно изменен'
            });

        } catch (error) {
            console.error('❌ Auth: Ошибка сброса пароля:', error);
            res.status(500).json({
                success: false,
                message: 'Внутренняя ошибка сервера'
            });
        }
    }
);

module.exports = router;
