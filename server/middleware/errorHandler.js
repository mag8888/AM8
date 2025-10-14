/**
 * Middleware для обработки ошибок
 */
function errorHandler(err, req, res, next) {
    console.error('❌ Ошибка сервера:', err);

    // Определяем тип ошибки
    let statusCode = 500;
    let message = 'Внутренняя ошибка сервера';
    let details = null;

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Ошибка валидации данных';
        details = err.details;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Неавторизованный доступ';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Доступ запрещен';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Ресурс не найден';
    } else if (err.code === 'SQLITE_CONSTRAINT') {
        statusCode = 409;
        message = 'Конфликт данных';
        details = 'Ресурс уже существует или нарушены ограничения';
    } else if (err.code === 'SQLITE_BUSY') {
        statusCode = 503;
        message = 'Сервис временно недоступен';
        details = 'База данных занята, попробуйте позже';
    } else if (err.status) {
        statusCode = err.status;
        message = err.message;
    }

    // В режиме разработки показываем полную ошибку
    const response = {
        error: message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    };

    if (details) {
        response.details = details;
    }

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.fullError = err;
    }

    res.status(statusCode).json(response);
}

module.exports = errorHandler;
