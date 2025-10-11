/**
 * Error Handler - Глобальный обработчик ошибок
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

/**
 * Глобальный обработчик ошибок
 * @param {Error} err - Ошибка
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error Handler:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Счетчик ошибок
    const errorCount = req.app.get('errorCount') || 0;
    req.app.set('errorCount', errorCount + 1);

    // Определение типа ошибки и соответствующего ответа
    let status = 500;
    let message = 'Внутренняя ошибка сервера';
    let errors = [];

    // Ошибки валидации
    if (err.name === 'ValidationError') {
        status = 400;
        message = 'Ошибка валидации данных';
        errors = [err.message];
    }

    // Ошибки JWT
    if (err.name === 'JsonWebTokenError') {
        status = 401;
        message = 'Недействительный токен';
    }

    if (err.name === 'TokenExpiredError') {
        status = 401;
        message = 'Токен истек';
    }

    // Ошибки авторизации
    if (err.name === 'UnauthorizedError') {
        status = 401;
        message = 'Неавторизованный доступ';
    }

    if (err.name === 'ForbiddenError') {
        status = 403;
        message = 'Доступ запрещен';
    }

    // Ошибки базы данных
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
        status = 500;
        message = 'Ошибка базы данных';
    }

    // Ошибки сети
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        status = 503;
        message = 'Сервис временно недоступен';
    }

    // Ошибки файловой системы
    if (err.code === 'ENOENT') {
        status = 404;
        message = 'Ресурс не найден';
    }

    // Ошибки парсинга JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        status = 400;
        message = 'Неверный JSON формат';
    }

    // Ошибки лимитов
    if (err.type === 'entity.too.large') {
        status = 413;
        message = 'Размер запроса превышает допустимый лимит';
    }

    // Формирование ответа
    const errorResponse = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    // Добавляем ошибки валидации, если есть
    if (errors.length > 0) {
        errorResponse.errors = errors;
    }

    // В режиме разработки добавляем стек ошибки
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
    }

    // Отправка ответа
    res.status(status).json(errorResponse);
};

/**
 * Middleware для обработки 404 ошибок
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Маршрут не найден: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error);
};

/**
 * Middleware для обработки необработанных промисов
 */
const unhandledRejectionHandler = () => {
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection:', {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise,
            timestamp: new Date().toISOString()
        });
    });
};

/**
 * Middleware для обработки необработанных исключений
 */
const uncaughtExceptionHandler = () => {
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Graceful shutdown
        process.exit(1);
    });
};

/**
 * Middleware для логирования ошибок
 * @param {Error} err - Ошибка
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const errorLogger = (err, req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: err.message,
        stack: err.stack,
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            query: req.query,
            params: req.params,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        },
        user: req.user || null,
        status: err.status || 500
    };

    // Логирование в консоль
    console.error('🚨 Error Log:', JSON.stringify(logData, null, 2));

    // В продакшене можно добавить логирование в файл или внешний сервис
    if (process.env.NODE_ENV === 'production') {
        // TODO: Добавить логирование в файл или внешний сервис
    }

    next(err);
};

/**
 * Middleware для обработки ошибок CORS
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const corsErrorHandler = (err, req, res, next) => {
    if (err.message.includes('CORS')) {
        return res.status(403).json({
            success: false,
            message: 'CORS ошибка: запрос заблокирован',
            origin: req.headers.origin
        });
    }
    next(err);
};

/**
 * Middleware для обработки ошибок rate limiting
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const rateLimitErrorHandler = (err, req, res, next) => {
    if (err.message && err.message.includes('Too many requests')) {
        return res.status(429).json({
            success: false,
            message: 'Слишком много запросов, попробуйте позже',
            retryAfter: err.retryAfter
        });
    }
    next(err);
};

/**
 * Middleware для обработки ошибок валидации
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 * @param {Function} next - Следующий middleware
 */
const validationErrorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).json({
            success: false,
            message: 'Ошибка валидации данных',
            errors
        });
    }
    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler,
    errorLogger,
    corsErrorHandler,
    rateLimitErrorHandler,
    validationErrorHandler
};
