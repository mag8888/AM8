const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Импортируем маршруты
const roomsRoutes = require('./routes/rooms'); // v1.1.0 - добавлен endpoint /start
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');
const bankRoutes = require('./routes/bank'); // v1.0.0 - банковские операции
const cardsRoutes = require('./routes/cards');

// Импортируем middleware
const errorHandler = require('./middleware/errorHandler');
const { initializeDatabase } = require('./database/init');

const app = express();
// Логирование используемой базы данных
const dbUri = process.env.RAILWAY_MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL || process.env.MONGODB_URI;
if (dbUri) {
    if (dbUri.includes('railway') || dbUri.includes('rlwy.net') || dbUri.includes('railway.internal')) {
        console.log('🗄️ Database: Используется Railway MongoDB');
    } else if (dbUri.includes('mongodb.net')) {
        console.log('🗄️ Database: Используется MongoDB Atlas');
    } else {
        console.log('🗄️ Database: Используется локальная MongoDB');
    }
} else {
    console.log('⚠️ Database: URI не найден, проверьте переменные окружения');
}
const PORT = process.env.PORT || 3002;

// Настройка доверия к прокси (для Railway)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Middleware безопасности
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:", "wss:"],
            fontSrc: ["'self'", "data:", "https:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"]
        }
    }
}));

// CORS настройки
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? true // Разрешаем все домены в продакшене
        : ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Для старых браузеров
}));

// Дополнительные CORS заголовки для надежности
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// Rate limiting - более гибкая система
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 2000, // увеличиваем лимит для игрового приложения
    message: {
        error: 'Слишком много запросов с этого IP, попробуйте позже'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Пропускаем rate limiting для health check и игровых действий
        return req.path === '/health' || 
               req.path.includes('/roll') || 
               req.path.includes('/move') || 
               req.path.includes('/end-turn') ||
               req.path.includes('/game-state');
    }
});

// Специальный rate limiting для игровых API - СУПЕР ОПТИМИЗИРОВАН
const gameLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 600, // 600 запросов в минуту для игровых действий (было 300)
    message: {
        error: 'Слишком много игровых запросов, попробуйте через минуту'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Применяем общий rate limiting ко всем API маршрутам
app.use('/api/', generalLimiter);

// Применяем более мягкий rate limiting к игровым API
app.use('/api/rooms/*/roll', gameLimiter);
app.use('/api/rooms/*/move', gameLimiter);
app.use('/api/rooms/*/end-turn', gameLimiter);
app.use('/api/rooms/*/game-state', gameLimiter);
app.use('/api/rooms/*/players', gameLimiter);
app.use('/api/rooms/*/update-player', gameLimiter);

// Логирование
app.use(morgan('combined'));

// Сжатие ответов
app.use(compression());

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/bank', bankRoutes);
app.use('/api/cards', cardsRoutes);

// Единая страница авторизации/регистрации
app.get(['/auth', '/auth/*', '/login', '/signin', '/pages/login', '/auth.html'], (req, res) => {
    const authPath = path.join(process.cwd(), 'pages', 'auth.html');
    res.sendFile(authPath, (err) => {
        if (err) {
            console.error('❌ Ошибка отправки pages/auth.html:', err);
            res.status(500).json({ error: 'Failed to serve auth page' });
        }
    });
});

// Статические файлы (для продакшена)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(process.cwd()));
    
    // Обслуживание статических файлов для продакшена
    app.get('*', (req, res) => {
        // Если это API запрос или health check, пропускаем
        if (req.path.startsWith('/api/') || req.path === '/health') {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        // Для всех остальных запросов отдаем index.html (SPA)
        const indexPath = path.join(process.cwd(), 'index.html');
        console.log('🔍 Ищем index.html по пути:', indexPath);
        console.log('🔍 __dirname:', __dirname);
        console.log('🔍 process.cwd():', process.cwd());
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('❌ Ошибка отправки index.html:', err);
                res.status(500).json({
                    error: 'Internal server error',
                    message: 'Failed to serve index.html',
                    path: indexPath
                });
            }
        });
    });
} else {
    // В development режиме просто отдаем index.html
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
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
        try {
            await initializeDatabase();
            console.log('✅ База данных инициализирована');
        } catch (dbError) {
            console.error('❌ Ошибка инициализации базы данных:', dbError);
            console.log('⚠️ Продолжаем без базы данных (fallback режим)');
        }

        // Подключаемся к MongoDB и инициализируем карточные колоды
        try {
            const DatabaseConfig = require('./auth/server/config/database');
            const dbConfig = new DatabaseConfig();
            await dbConfig.connect();
            console.log('✅ MongoDB подключена');

            const { initializeCards } = require('./scripts/initCards');

// Railway MongoDB Configuration
// Приоритет: RAILWAY_MONGODB_URI > MONGO_URL > MONGO_PUBLIC_URL > MONGODB_URI
if (process.env.RAILWAY_MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL) {
    console.log('🗄️ DB: Используем Railway MongoDB');
} else if (process.env.MONGODB_URI) {
    console.log('🗄️ DB: Используем MongoDB Atlas');
} else {
    console.log('🗄️ DB: Используем локальную SQLite');
}            await initializeCards();
            console.log('✅ Карточные колоды инициализированы');
        } catch (cardsError) {
            console.error('❌ Ошибка подключения к MongoDB или инициализации карточных колод:', cardsError);
            console.log('⚠️ Продолжаем без карточных колод');
        }

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
