/**
 * AuthService Server - Сервер авторизации
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');

// Импорт конфигурации базы данных
const databaseConfig = require('./config/database');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

// Импорт middleware
const { errorHandler } = require('./middleware/errorHandler');

class AuthServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация сервера
     */
    async init() {
        try {
            console.log('🚀 AuthServer: Инициализация...');
            
            // Подключение к базе данных (только для MongoDB)
            const useMongoDB = process.env.USE_MONGODB !== 'false';
            if (useMongoDB) {
                await this.connectDatabase();
            }
            
            // Настройка middleware
            this.setupMiddleware();
            
            // Настройка маршрутов
            this.setupRoutes();
            
            // Настройка обработки ошибок
            this.setupErrorHandling();
            
            this.isInitialized = true;
            console.log('✅ AuthServer: Инициализация завершена');
        } catch (error) {
            console.error('❌ AuthServer: Ошибка инициализации:', error);
            throw error;
        }
    }

    /**
     * Подключение к базе данных
     */
    async connectDatabase() {
        try {
            await databaseConfig.connect();
            console.log('✅ AuthServer: База данных подключена');
        } catch (error) {
            console.error('❌ AuthServer: Ошибка подключения к базе данных:', error);
            throw error;
        }
    }

    /**
     * Настройка middleware
     */
    setupMiddleware() {
        // Настройка trust proxy для Railway
        this.app.set('trust proxy', 1);
        
        // Безопасность
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https:", "wss:"],
                    fontSrc: ["'self'", "data:", "https:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'self'"]
                }
            }
        }));

        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS ? 
                process.env.ALLOWED_ORIGINS.split(',') : 
                ['http://localhost:8000', 'http://127.0.0.1:8000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 минут
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 запросов
            message: {
                success: false,
                message: 'Слишком много запросов, попробуйте позже',
                retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000) / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        this.app.use(limiter);

        // Специальный rate limiting для авторизации
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 минут
            max: 5, // 5 попыток
            message: {
                success: false,
                message: 'Слишком много попыток входа, попробуйте через 15 минут'
            },
            skipSuccessfulRequests: true
        });

        this.app.use('/api/auth/login', authLimiter);
        this.app.use('/api/auth/register', authLimiter);

        // Парсинг JSON
        this.app.use(express.json({ 
            limit: '10mb',
            verify: (req, res, buf) => {
                try {
                    JSON.parse(buf);
                } catch (e) {
                    res.status(400).json({
                        success: false,
                        message: 'Неверный JSON формат'
                    });
                }
            }
        }));

        // Парсинг URL-encoded данных
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Логирование запросов
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
            next();
        });

        // Статические файлы
        this.app.use(express.static(path.join(__dirname, '../'), {
            maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
        }));
    }

    /**
     * Настройка маршрутов
     */
    setupRoutes() {
        // API маршруты
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/health', healthRoutes);

        // Главная страница авторизации
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../index.html'));
        });

        // Редирект на главную страницу игры
        this.app.get('/game', (req, res) => {
            res.redirect('/../index.html');
        });

        // 404 обработчик
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Маршрут не найден',
                path: req.originalUrl
            });
        });
    }

    /**
     * Настройка обработки ошибок
     */
    setupErrorHandling() {
        // Глобальный обработчик ошибок
        this.app.use(errorHandler);

        // Обработка необработанных промисов
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ AuthServer: Необработанное отклонение промиса:', reason);
        });

        // Обработка необработанных исключений
        process.on('uncaughtException', (error) => {
            console.error('❌ AuthServer: Необработанное исключение:', error);
            process.exit(1);
        });
    }

    /**
     * Запуск сервера
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('Сервер не инициализирован');
        }

        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    console.log(`🚀 AuthServer: Сервер запущен на порту ${this.port}`);
                    console.log(`📱 AuthServer: URL - http://localhost:${this.port}`);
                    resolve();
                });

                this.server.on('error', (error) => {
                    console.error('❌ AuthServer: Ошибка запуска сервера:', error);
                    reject(error);
                });
            } catch (error) {
                console.error('❌ AuthServer: Ошибка при запуске:', error);
                reject(error);
            }
        });
    }

    /**
     * Остановка сервера
     */
    async stop() {
        return new Promise(async (resolve) => {
            try {
                // Останавливаем сервер
                if (this.server) {
                    this.server.close(async () => {
                        // Отключаемся от базы данных
                        await databaseConfig.disconnect();
                        console.log('🛑 AuthServer: Сервер остановлен');
                        resolve();
                    });
                } else {
                    // Отключаемся от базы данных
                    await databaseConfig.disconnect();
                    resolve();
                }
            } catch (error) {
                console.error('❌ AuthServer: Ошибка при остановке:', error);
                resolve();
            }
        });
    }

    /**
     * Получение экземпляра Express приложения
     */
    getApp() {
        return this.app;
    }

    /**
     * Проверка состояния сервера
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isRunning: !!this.server,
            port: this.port,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        };
    }
}

// Экспорт класса
module.exports = AuthServer;

// Запуск сервера, если файл выполняется напрямую
if (require.main === module) {
    const server = new AuthServer();
    
    // Сначала инициализируем, потом запускаем
    server.init()
        .then(() => server.start())
        .catch((error) => {
            console.error('❌ AuthServer: Критическая ошибка:', error);
            process.exit(1);
        });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('📡 AuthServer: Получен SIGTERM, остановка сервера...');
        await server.stop();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('📡 AuthServer: Получен SIGINT, остановка сервера...');
        await server.stop();
        process.exit(0);
    });
}
