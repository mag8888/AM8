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
     * Получение информации о стеке вызовов
     * @returns {Object} Информация о вызывающей функции
     * @private
     */
    _getCallerInfo() {
        try {
            const stack = new Error().stack;
            if (!stack) return { file: '', function: '', line: '' };

            const lines = stack.split('\n');
            // Пропускаем первые строки (Error, _getCallerInfo, _log)
            const callerLine = lines[3] || lines[2] || lines[1];
            
            if (!callerLine) {
                return { file: '', function: '', line: '' };
            }

            // Парсим строку стека для разных форматов
            // Chrome: "    at ClassName.methodName (file.js:line:col)"
            // Firefox: "methodName@file.js:line:col"
            let fileName = '';
            let functionName = '';
            let lineNumber = '';

            const chromeMatch = callerLine.match(/\s+at\s+(?:([^@\s]+)\s+\()?([^)]+):(\d+):\d+\)?$/);
            const firefoxMatch = callerLine.match(/([^@]+)@(.+):(\d+):\d+$/);
            const simpleMatch = callerLine.match(/([^:]+):(\d+):(\d+)/);

            if (chromeMatch) {
                functionName = chromeMatch[1] || '';
                fileName = chromeMatch[2].replace(window.location.origin, '').replace(location.pathname.replace(/[^/]*$/, ''), '') || chromeMatch[2];
                lineNumber = chromeMatch[3] || '';
            } else if (firefoxMatch) {
                functionName = firefoxMatch[1] || '';
                fileName = firefoxMatch[2].replace(window.location.origin, '').replace(location.pathname.replace(/[^/]*$/, ''), '') || firefoxMatch[2];
                lineNumber = firefoxMatch[3] || '';
            } else if (simpleMatch) {
                fileName = simpleMatch[1].replace(window.location.origin, '').replace(location.pathname.replace(/[^/]*$/, ''), '') || simpleMatch[1];
                lineNumber = simpleMatch[2] || '';
            }

            // Очищаем имена файлов от лишних путей
            fileName = fileName.replace(/^.*\/([^\/]+)$/, '$1');

            return {
                file: fileName,
                function: functionName || '',
                line: lineNumber
            };
        } catch (error) {
            return { file: '', function: '', line: '' };
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
        const callerInfo = this._getCallerInfo();
        
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            context: context.substring(0, this.config.contextMaxLength),
            caller: callerInfo
        };

        // Сохраняем запись
        this.logEntries.push(logEntry);
        if (this.logEntries.length > this.config.maxLogEntries) {
            this.logEntries.shift();
        }

        // Выводим в консоль
        if (this.config.enableConsole) {
            this._consoleLog(level, message, data, context, timestamp, callerInfo);
        }
    }

    /**
     * Вывод в консоль с форматированием
     * @private
     */
    _consoleLog(level, message, data, context, timestamp, callerInfo) {
        const icon = this.icons[level];
        const color = this.colors[level];
        const contextStr = context ? `[${context}]` : '';
        const timeStr = timestamp.split('T')[1].split('.')[0];
        
        // Формируем информацию о месте вызова
        let callerStr = '';
        if (callerInfo.file || callerInfo.function || callerInfo.line) {
            const parts = [];
            if (callerInfo.function) parts.push(callerInfo.function);
            if (callerInfo.file) parts.push(callerInfo.file);
            if (callerInfo.line) parts.push(`:${callerInfo.line}`);
            callerStr = `(${parts.join('@')})`;
        }
        
        const prefix = `%c${icon} ${timeStr} ${contextStr} ${callerStr}`;
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

/**
 * Глобальная утилитарная функция для логирования с информацией о стеке вызовов
 * @param {string} message - Сообщение
 * @param {*} data - Данные
 * @param {string} level - Уровень логирования (log, info, warn, error)
 */
window.logWithStack = function(message, data = null, level = 'log') {
    try {
        const stack = new Error().stack;
        if (!stack) {
            console[level](message, data);
            return;
        }

        const lines = stack.split('\n');
        // Пропускаем первые строки (Error, logWithStack)
        const callerLine = lines[2] || lines[1];
        
        if (!callerLine) {
            console[level](message, data);
            return;
        }

        // Парсим информацию о вызывающей функции
        let fileName = '';
        let functionName = '';
        let lineNumber = '';

        const chromeMatch = callerLine.match(/\s+at\s+(?:([^@\s]+)\s+\()?([^)]+):(\d+):\d+\)?$/);
        const firefoxMatch = callerLine.match(/([^@]+)@(.+):(\d+):\d+$/);

        if (chromeMatch) {
            functionName = chromeMatch[1] || '';
            fileName = chromeMatch[2].split('/').pop() || chromeMatch[2];
            lineNumber = chromeMatch[3] || '';
        } else if (firefoxMatch) {
            functionName = firefoxMatch[1] || '';
            fileName = firefoxMatch[2].split('/').pop() || firefoxMatch[2];
            lineNumber = firefoxMatch[3] || '';
        }

        // Формируем строку с информацией о месте вызова
        const callerInfo = [];
        if (functionName) callerInfo.push(functionName);
        if (fileName) callerInfo.push(fileName);
        if (lineNumber) callerInfo.push(`:${lineNumber}`);
        
        const callerStr = callerInfo.length > 0 ? ` (${callerInfo.join('@')})` : '';
        const fullMessage = `${message}${callerStr}`;
        
        console[level](fullMessage, data || '');
    } catch (error) {
        console[level](message, data);
    }
};

// Экспорт
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.logger = logger;
}

// Version: 1760439000 - Logger v2.0.0
