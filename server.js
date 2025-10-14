const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Импортируем маршруты
const roomsRoutes = require('./routes/rooms');
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');

// Импортируем middleware
const errorHandler = require('./middleware/errorHandler');
const { initializeDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware безопасности
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS настройки
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://am8-production.up.railway.app', 'https://*.up.railway.app']
        : ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов на IP за 15 минут
    message: {
        error: 'Слишком много запросов с этого IP, попробуйте позже'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Логирование
app.use(morgan('combined'));

// Сжатие ответов
app.use(compression());

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статические файлы (для продакшена)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../')));
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API маршруты
app.use('/api/rooms', roomsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

// Обслуживание статических файлов для продакшена
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        // Если это API запрос, возвращаем 404
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        // Для всех остальных запросов отдаем index.html (SPA)
        res.sendFile(path.join(__dirname, '../index.html'));
    });
}

// Обработка ошибок
app.use(errorHandler);

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Инициализация сервера
async function startServer() {
    try {
        // Инициализируем базу данных
        await initializeDatabase();
        console.log('✅ База данных инициализирована');

        // Запускаем сервер
        const server = app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📡 API доступно по адресу: http://localhost:${PORT}/api`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 Получен SIGTERM, завершаем сервер...');
            server.close(() => {
                console.log('✅ Сервер завершен');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🛑 Получен SIGINT, завершаем сервер...');
            server.close(() => {
                console.log('✅ Сервер завершен');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();

module.exports = app;
