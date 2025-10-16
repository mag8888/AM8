/**
 * Logger v2.0.0
 * Утилита для централизованного логирования
 * Поддерживает разные уровни логирования и фильтрацию
 */

class Logger {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.level = options.level || 'info'; // debug, info, warn, error
        this.prefix = options.prefix || '';
        this.filter = options.filter || null; // функция для фильтрации сообщений
        
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }
    
    /**
     * Проверка, нужно ли логировать сообщение
     * @param {string} level - Уровень логирования
     * @param {string} message - Сообщение
     * @returns {boolean} Нужно ли логировать
     */
    shouldLog(level, message) {
        if (!this.enabled) return false;
        if (this.levels[level] < this.levels[this.level]) return false;
        if (this.filter && !this.filter(level, message)) return false;
        return true;
    }
    
    /**
     * Форматирование сообщения
     * @param {string} level - Уровень логирования
     * @param {string} message - Сообщение
     * @param {*} data - Данные
     * @returns {string} Отформатированное сообщение
     */
    formatMessage(level, message, data) {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = this.prefix ? `[${this.prefix}]` : '';
        const levelIcon = this.getLevelIcon(level);
        
        let formatted = `${levelIcon} ${timestamp} ${prefix} ${message}`;
        
        if (data !== undefined) {
            if (typeof data === 'object') {
                formatted += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formatted += ` ${data}`;
            }
        }
        
        return formatted;
    }
    
    /**
     * Получение иконки для уровня логирования
     * @param {string} level - Уровень логирования
     * @returns {string} Иконка
     */
    getLevelIcon(level) {
        const icons = {
            debug: '🔍',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        };
        return icons[level] || 'ℹ️';
    }
    
    /**
     * Логирование отладочной информации
     * @param {string} message - Сообщение
     * @param {*} data - Данные
     */
    debug(message, data) {
        if (this.shouldLog('debug', message)) {
            console.log(this.formatMessage('debug', message, data));
        }
    }
    
    /**
     * Логирование информации
     * @param {string} message - Сообщение
     * @param {*} data - Данные
     */
    info(message, data) {
        if (this.shouldLog('info', message)) {
            console.log(this.formatMessage('info', message, data));
        }
    }
    
    /**
     * Логирование предупреждений
     * @param {string} message - Сообщение
     * @param {*} data - Данные
     */
    warn(message, data) {
        if (this.shouldLog('warn', message)) {
            console.warn(this.formatMessage('warn', message, data));
        }
    }
    
    /**
     * Логирование ошибок
     * @param {string} message - Сообщение
     * @param {*} data - Данные
     */
    error(message, data) {
        if (this.shouldLog('error', message)) {
            console.error(this.formatMessage('error', message, data));
        }
    }
    
    /**
     * Группировка логов
     * @param {string} label - Название группы
     * @param {Function} fn - Функция для выполнения
     */
    group(label, fn) {
        if (this.enabled) {
            console.group(label);
            try {
                fn();
            } finally {
                console.groupEnd();
            }
        } else {
            fn();
        }
    }
    
    /**
     * Установка уровня логирования
     * @param {string} level - Новый уровень
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        }
    }
    
    /**
     * Включение/выключение логирования
     * @param {boolean} enabled - Включить ли логирование
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Установка фильтра сообщений
     * @param {Function} filter - Функция фильтрации
     */
    setFilter(filter) {
        this.filter = filter;
    }
}

// Создаем глобальные экземпляры логгеров
const roomLogger = new Logger({
    prefix: 'Room',
    level: 'info', // В продакшене можно изменить на 'warn' или 'error'
    filter: (level, message) => {
        // Фильтруем избыточные сообщения
        const skipPatterns = [
            'Обновление кнопки готовности',
            'Состояние кнопки готовности',
            'Отладка поиска игрока',
            'Обновлена доступность фишек'
        ];
        
        return !skipPatterns.some(pattern => message.includes(pattern));
    }
});

const gameLogger = new Logger({
    prefix: 'Game',
    level: 'info'
});

const apiLogger = new Logger({
    prefix: 'API',
    level: 'warn'
});

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.roomLogger = roomLogger;
    window.gameLogger = gameLogger;
    window.apiLogger = apiLogger;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
