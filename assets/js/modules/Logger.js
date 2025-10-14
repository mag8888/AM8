/**
 * Logger v2.0.0 - Централизованная система логирования
 * 
 * Особенности:
 * - Уровни логирования (DEBUG, INFO, WARN, ERROR)
 * - Фильтрация по уровням
 * - Форматирование сообщений
 * - Производительность (отключение в продакшне)
 * - Контекстная информация
 */
class Logger {
    constructor() {
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            NONE: 4
        };

        this.colors = {
            DEBUG: '#888',
            INFO: '#2196F3',
            WARN: '#FF9800',
            ERROR: '#F44336'
        };

        this.icons = {
            DEBUG: '🔍',
            INFO: 'ℹ️',
            WARN: '⚠️',
            ERROR: '❌'
        };

        this._initializeConfig();
        this._setupPerformanceMonitoring();
    }

    /**
     * Инициализация конфигурации
     * @private
     */
    _initializeConfig() {
        // Определяем уровень логирования
        const isProduction = !window.location.hostname.includes('localhost') && 
                           !window.location.hostname.includes('127.0.0.1');
        
        this.config = {
            level: isProduction ? this.levels.WARN : this.levels.DEBUG,
            enableConsole: true,
            enablePerformance: !isProduction,
            maxLogEntries: 1000,
            contextMaxLength: 50
        };

        this.logEntries = [];
        this.performanceMetrics = new Map();
    }

    /**
     * Настройка мониторинга производительности
     * @private
     */
    _setupPerformanceMonitoring() {
        if (!this.config.enablePerformance) return;

        this.performanceTimers = new Map();
        
        // Мониторинг памяти
        if (performance.memory) {
            setInterval(() => {
                this._logMemoryUsage();
            }, 30000); // Каждые 30 секунд
        }
    }

    /**
     * Логирование использования памяти
     * @private
     */
    _logMemoryUsage() {
        const memory = performance.memory;
        const used = Math.round(memory.usedJSHeapSize / 1048576);
        const total = Math.round(memory.totalJSHeapSize / 1048576);
        const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
        
        if (used > limit * 0.8) {
            this.warn('Memory usage high', {
                used: `${used}MB`,
                total: `${total}MB`,
                limit: `${limit}MB`,
                percentage: `${Math.round((used / limit) * 100)}%`
            });
        }
    }

    /**
     * Основной метод логирования
     * @param {string} level - Уровень логирования
     * @param {string} message - Сообщение
     * @param {*} data - Данные
     * @param {string} context - Контекст (модуль/класс)
     * @private
     */
    _log(level, message, data = null, context = '') {
        if (this.levels[level] < this.config.level) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            context: context.substring(0, this.config.contextMaxLength)
        };

        // Сохраняем запись
        this.logEntries.push(logEntry);
        if (this.logEntries.length > this.config.maxLogEntries) {
            this.logEntries.shift();
        }

        // Выводим в консоль
        if (this.config.enableConsole) {
            this._consoleLog(level, message, data, context, timestamp);
        }
    }

    /**
     * Вывод в консоль с форматированием
     * @private
     */
    _consoleLog(level, message, data, context, timestamp) {
        const icon = this.icons[level];
        const color = this.colors[level];
        const contextStr = context ? `[${context}]` : '';
        const timeStr = timestamp.split('T')[1].split('.')[0];
        
        const prefix = `%c${icon} ${timeStr} ${contextStr}`;
        const style = `color: ${color}; font-weight: bold;`;
        
        if (data !== null && data !== undefined) {
            console[level.toLowerCase()](prefix, style, message, data);
        } else {
            console[level.toLowerCase()](prefix, style, message);
        }
    }

    /**
     * Debug уровень
     * @param {string} message 
     * @param {*} data 
     * @param {string} context 
     */
    debug(message, data = null, context = '') {
        this._log('DEBUG', message, data, context);
    }

    /**
     * Info уровень
     * @param {string} message 
     * @param {*} data 
     * @param {string} context 
     */
    info(message, data = null, context = '') {
        this._log('INFO', message, data, context);
    }

    /**
     * Warning уровень
     * @param {string} message 
     * @param {*} data 
     * @param {string} context 
     */
    warn(message, data = null, context = '') {
        this._log('WARN', message, data, context);
    }

    /**
     * Error уровень
     * @param {string} message 
     * @param {*} data 
     * @param {string} context 
     */
    error(message, data = null, context = '') {
        this._log('ERROR', message, data, context);
    }

    /**
     * Измерение производительности
     * @param {string} name - Название операции
     * @param {Function} fn - Функция для измерения
     * @param {string} context - Контекст
     * @returns {*} Результат функции
     */
    async measure(name, fn, context = '') {
        if (!this.config.enablePerformance) {
            return await fn();
        }

        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        try {
            const result = await fn();
            const endTime = performance.now();
            const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            const duration = endTime - startTime;
            const memoryDelta = endMemory - startMemory;
            
            this.performanceMetrics.set(name, {
                duration,
                memoryDelta,
                timestamp: Date.now(),
                context
            });
            
            if (duration > 100) { // Больше 100ms
                this.warn(`Slow operation: ${name}`, {
                    duration: `${duration.toFixed(2)}ms`,
                    memoryDelta: `${Math.round(memoryDelta / 1024)}KB`
                }, context);
            }
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.error(`Operation failed: ${name}`, {
                duration: `${duration.toFixed(2)}ms`,
                error: error.message
            }, context);
            
            throw error;
        }
    }

    /**
     * Начать измерение времени
     * @param {string} name 
     */
    time(name) {
        if (!this.config.enablePerformance) return;
        this.performanceTimers.set(name, performance.now());
    }

    /**
     * Завершить измерение времени
     * @param {string} name 
     * @param {string} context 
     */
    timeEnd(name, context = '') {
        if (!this.config.enablePerformance) return;
        
        const startTime = this.performanceTimers.get(name);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.performanceTimers.delete(name);
            
            this.debug(`Timer: ${name}`, {
                duration: `${duration.toFixed(2)}ms`
            }, context);
        }
    }

    /**
     * Группировка логов
     * @param {string} name 
     * @param {Function} fn 
     */
    group(name, fn) {
        if (this.config.enableConsole) {
            console.group(`📁 ${name}`);
        }
        
        try {
            return fn();
        } finally {
            if (this.config.enableConsole) {
                console.groupEnd();
            }
        }
    }

    /**
     * Получить статистику логов
     * @returns {Object}
     */
    getStats() {
        const stats = {
            total: this.logEntries.length,
            byLevel: {},
            byContext: {},
            performance: {}
        };

        // Подсчет по уровням
        this.logEntries.forEach(entry => {
            stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
            stats.byContext[entry.context] = (stats.byContext[entry.context] || 0) + 1;
        });

        // Статистика производительности
        this.performanceMetrics.forEach((metrics, name) => {
            stats.performance[name] = {
                avgDuration: metrics.duration,
                lastCall: metrics.timestamp,
                context: metrics.context
            };
        });

        return stats;
    }

    /**
     * Очистить логи
     */
    clear() {
        this.logEntries = [];
        this.performanceMetrics.clear();
        this.performanceTimers.clear();
        
        if (this.config.enableConsole) {
            console.clear();
        }
    }

    /**
     * Экспорт логов
     * @returns {string}
     */
    export() {
        return JSON.stringify({
            config: this.config,
            logs: this.logEntries,
            performance: Object.fromEntries(this.performanceMetrics),
            stats: this.getStats()
        }, null, 2);
    }

    /**
     * Установить уровень логирования
     * @param {string} level 
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.config.level = this.levels[level];
            this.info(`Log level changed to ${level}`);
        }
    }

    /**
     * Создать логгер для конкретного контекста
     * @param {string} context 
     * @returns {Object}
     */
    createContextLogger(context) {
        return {
            debug: (message, data) => this.debug(message, data, context),
            info: (message, data) => this.info(message, data, context),
            warn: (message, data) => this.warn(message, data, context),
            error: (message, data) => this.error(message, data, context),
            measure: (name, fn) => this.measure(name, fn, context),
            time: (name) => this.time(name),
            timeEnd: (name) => this.timeEnd(name, context),
            group: (name, fn) => this.group(`${context}: ${name}`, fn)
        };
    }
}

// Создаем глобальный экземпляр
const logger = new Logger();

// Экспорт
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.logger = logger;
}

// Version: 1760439000 - Logger v2.0.0
