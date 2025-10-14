/**
 * ErrorHandler v2.0.0 - Централизованная обработка ошибок
 * 
 * Особенности:
 * - Глобальная обработка ошибок
 * - Классификация ошибок
 * - Автоматическое восстановление
 * - Отчеты об ошибках
 * - Интеграция с Logger
 */
class ErrorHandler {
    constructor(logger) {
        this.logger = logger || window.logger;
        this.errorTypes = {
            NETWORK: 'NETWORK_ERROR',
            VALIDATION: 'VALIDATION_ERROR',
            DOM: 'DOM_ERROR',
            GAME: 'GAME_ERROR',
            API: 'API_ERROR',
            UNKNOWN: 'UNKNOWN_ERROR'
        };

        this.recoveryStrategies = new Map();
        this.errorHistory = [];
        this.maxHistorySize = 100;
        
        this._initializeGlobalHandlers();
        this._setupRecoveryStrategies();
    }

    /**
     * Инициализация глобальных обработчиков
     * @private
     */
    _initializeGlobalHandlers() {
        // Обработка необработанных ошибок
        window.addEventListener('error', (event) => {
            this.handleError({
                type: this.errorTypes.DOM,
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack
            });
        });

        // Обработка необработанных промисов
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: this.errorTypes.UNKNOWN,
                message: event.reason?.message || 'Unhandled Promise Rejection',
                error: event.reason,
                stack: event.reason?.stack
            });
            
            // Предотвращаем вывод в консоль браузера
            event.preventDefault();
        });

        // Обработка ошибок загрузки ресурсов
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError({
                    type: this.errorTypes.NETWORK,
                    message: `Resource load error: ${event.target.src || event.target.href}`,
                    element: event.target.tagName,
                    url: event.target.src || event.target.href
                });
            }
        }, true);
    }

    /**
     * Настройка стратегий восстановления
     * @private
     */
    _setupRecoveryStrategies() {
        // Стратегия для сетевых ошибок
        this.recoveryStrategies.set(this.errorTypes.NETWORK, {
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
            fallback: () => {
                this.logger.warn('Network error recovery: Using offline mode');
                return { mode: 'offline' };
            }
        });

        // Стратегия для ошибок валидации
        this.recoveryStrategies.set(this.errorTypes.VALIDATION, {
            maxRetries: 1,
            retryDelay: 0,
            fallback: () => {
                this.logger.warn('Validation error recovery: Using default values');
                return { useDefaults: true };
            }
        });

        // Стратегия для DOM ошибок
        this.recoveryStrategies.set(this.errorTypes.DOM, {
            maxRetries: 2,
            retryDelay: 500,
            fallback: () => {
                this.logger.warn('DOM error recovery: Recreating element');
                return { recreate: true };
            }
        });

        // Стратегия для игровых ошибок
        this.recoveryStrategies.set(this.errorTypes.GAME, {
            maxRetries: 1,
            retryDelay: 1000,
            fallback: () => {
                this.logger.warn('Game error recovery: Resetting game state');
                return { resetGame: true };
            }
        });
    }

    /**
     * Основной метод обработки ошибок
     * @param {Object} errorInfo - Информация об ошибке
     */
    handleError(errorInfo) {
        const error = this._normalizeError(errorInfo);
        
        // Логируем ошибку
        this.logger.error(error.message, error, 'ErrorHandler');
        
        // Добавляем в историю
        this._addToHistory(error);
        
        // Определяем стратегию восстановления
        const strategy = this.recoveryStrategies.get(error.type);
        
        if (strategy) {
            this._attemptRecovery(error, strategy);
        }
        
        // Отправляем отчет об ошибке (если настроено)
        this._reportError(error);
    }

    /**
     * Нормализация ошибки
     * @param {Object} errorInfo 
     * @returns {Object}
     * @private
     */
    _normalizeError(errorInfo) {
        const timestamp = Date.now();
        const id = `error_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id,
            timestamp,
            type: errorInfo.type || this.errorTypes.UNKNOWN,
            message: errorInfo.message || 'Unknown error',
            stack: errorInfo.stack || new Error().stack,
            context: errorInfo.context || {},
            severity: this._determineSeverity(errorInfo),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...errorInfo
        };
    }

    /**
     * Определение серьезности ошибки
     * @param {Object} errorInfo 
     * @returns {string}
     * @private
     */
    _determineSeverity(errorInfo) {
        const criticalPatterns = [
            'Cannot read property',
            'Cannot read properties',
            'is not a function',
            'Cannot access',
            'Maximum call stack'
        ];
        
        const message = errorInfo.message || '';
        
        if (criticalPatterns.some(pattern => message.includes(pattern))) {
            return 'CRITICAL';
        }
        
        if (errorInfo.type === this.errorTypes.NETWORK) {
            return 'HIGH';
        }
        
        if (errorInfo.type === this.errorTypes.GAME) {
            return 'MEDIUM';
        }
        
        return 'LOW';
    }

    /**
     * Добавление в историю ошибок
     * @param {Object} error 
     * @private
     */
    _addToHistory(error) {
        this.errorHistory.push(error);
        
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * Попытка восстановления
     * @param {Object} error 
     * @param {Object} strategy 
     * @private
     */
    async _attemptRecovery(error, strategy) {
        const retryCount = error.retryCount || 0;
        
        if (retryCount >= strategy.maxRetries) {
            this.logger.warn(`Max retries exceeded for error: ${error.message}`);
            
            if (strategy.fallback) {
                try {
                    const result = await strategy.fallback();
                    this.logger.info('Fallback strategy executed', result);
                    return result;
                } catch (fallbackError) {
                    this.logger.error('Fallback strategy failed', fallbackError);
                }
            }
            return null;
        }
        
        // Вычисляем задержку
        let delay = strategy.retryDelay;
        if (strategy.exponentialBackoff) {
            delay *= Math.pow(2, retryCount);
        }
        
        this.logger.info(`Retrying error in ${delay}ms (attempt ${retryCount + 1}/${strategy.maxRetries})`);
        
        return new Promise(resolve => {
            setTimeout(() => {
                error.retryCount = retryCount + 1;
                this.handleError(error);
                resolve();
            }, delay);
        });
    }

    /**
     * Отправка отчета об ошибке
     * @param {Object} error 
     * @private
     */
    _reportError(error) {
        // В продакшне можно отправлять отчеты на сервер
        if (window.location.hostname.includes('localhost')) {
            return; // Не отправляем в разработке
        }
        
        // Здесь можно добавить отправку на сервер аналитики
        // например, Sentry, LogRocket, или собственный сервер
        this.logger.debug('Error report would be sent to server', {
            errorId: error.id,
            severity: error.severity,
            type: error.type
        });
    }

    /**
     * Создание обертки для асинхронных функций
     * @param {Function} fn 
     * @param {string} context 
     * @returns {Function}
     */
    wrapAsync(fn, context = '') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError({
                    type: this.errorTypes.UNKNOWN,
                    message: error.message || 'Async function error',
                    error,
                    context,
                    args: args.length > 0 ? args : undefined
                });
                throw error;
            }
        };
    }

    /**
     * Создание обертки для синхронных функций
     * @param {Function} fn 
     * @param {string} context 
     * @returns {Function}
     */
    wrapSync(fn, context = '') {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handleError({
                    type: this.errorTypes.UNKNOWN,
                    message: error.message || 'Sync function error',
                    error,
                    context,
                    args: args.length > 0 ? args : undefined
                });
                throw error;
            }
        };
    }

    /**
     * Безопасное выполнение функции
     * @param {Function} fn 
     * @param {*} fallbackValue 
     * @param {string} context 
     * @returns {*}
     */
    safeExecute(fn, fallbackValue = null, context = '') {
        try {
            return fn();
        } catch (error) {
            this.handleError({
                type: this.errorTypes.UNKNOWN,
                message: error.message || 'Safe execute error',
                error,
                context
            });
            return fallbackValue;
        }
    }

    /**
     * Получение статистики ошибок
     * @returns {Object}
     */
    getStats() {
        const stats = {
            total: this.errorHistory.length,
            byType: {},
            bySeverity: {},
            recent: this.errorHistory.slice(-10)
        };
        
        this.errorHistory.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * Очистка истории ошибок
     */
    clearHistory() {
        this.errorHistory = [];
        this.logger.info('Error history cleared');
    }

    /**
     * Экспорт истории ошибок
     * @returns {string}
     */
    exportErrors() {
        return JSON.stringify({
            stats: this.getStats(),
            errors: this.errorHistory,
            timestamp: Date.now()
        }, null, 2);
    }

    /**
     * Добавление пользовательской стратегии восстановления
     * @param {string} errorType 
     * @param {Object} strategy 
     */
    addRecoveryStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
        this.logger.info(`Recovery strategy added for ${errorType}`);
    }
}

// Создаем глобальный экземпляр
const errorHandler = new ErrorHandler();

// Экспорт
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
    window.errorHandler = errorHandler;
}

// Version: 1760439000 - ErrorHandler v2.0.0
