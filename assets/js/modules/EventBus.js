/**
 * EventBus v2.0.0 - Улучшенная система событий
 * 
 * Особенности:
 * - Типизированные события
 * - Middleware поддержка
 * - Debouncing и throttling
 * - Производительность
 * - Интеграция с Logger и ErrorHandler
 */
class EventBus {
    constructor(logger, errorHandler) {
        this.logger = logger || window.logger;
        this.errorHandler = errorHandler || window.errorHandler;
        
        this.events = new Map();
        this.middleware = [];
        this.eventTypes = new Map();
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        
        this.stats = {
            totalEmissions: 0,
            totalSubscriptions: 0,
            errors: 0,
            byEvent: new Map()
        };
        
        this.logger?.info('EventBus инициализирован', null, 'EventBus');
    }

    /**
     * Регистрация типа события
     * @param {string} eventName 
     * @param {Object} schema - Схема данных события
     */
    registerEventType(eventName, schema) {
        this.eventTypes.set(eventName, {
            schema,
            registered: Date.now(),
            emissions: 0,
            subscriptions: 0
        });
        
        this.logger?.debug(`Тип события зарегистрирован: ${eventName}`, schema, 'EventBus');
    }

    /**
     * Валидация данных события
     * @param {string} eventName 
     * @param {*} data 
     * @returns {boolean}
     * @private
     */
    _validateEventData(eventName, data) {
        const eventType = this.eventTypes.get(eventName);
        if (!eventType || !eventType.schema) {
            return true; // Нет схемы - валидация пропускается
        }
        
        // Простая валидация типов
        for (const [key, expectedType] of Object.entries(eventType.schema)) {
            if (data && data.hasOwnProperty(key)) {
                const actualType = typeof data[key];
                if (actualType !== expectedType) {
                    this.logger?.warn(`Неверный тип данных для ${eventName}.${key}: ожидался ${expectedType}, получен ${actualType}`);
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Подписаться на событие
     * @param {string} eventName - Название события
     * @param {Function} callback - Функция обратного вызова
     * @param {Object} options - Дополнительные опции
     * @returns {Function} Функция для отписки
     */
    on(eventName, callback, options = {}) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        
        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            id: `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        this.events.get(eventName).add(listener);
        
        // Обновляем статистику
        this.stats.totalSubscriptions++;
        this.stats.byEvent.set(eventName, (this.stats.byEvent.get(eventName) || 0) + 1);
        
        const eventType = this.eventTypes.get(eventName);
        if (eventType) {
            eventType.subscriptions++;
        }
        
        this.logger?.debug(`Подписка на событие: ${eventName}`, { 
            listenerId: listener.id,
            priority: listener.priority,
            once: listener.once
        }, 'EventBus');
        
        // Возвращаем функцию для отписки
        return () => this._removeListener(eventName, listener);
    }

    /**
     * Подписаться на событие один раз
     * @param {string} eventName 
     * @param {Function} callback 
     * @param {Object} options 
     * @returns {Function}
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    /**
     * Отписаться от события
     * @param {string} eventName 
     * @param {Function} callback 
     */
    off(eventName, callback) {
        const listeners = this.events.get(eventName);
        if (!listeners) return;
        
        for (const listener of listeners) {
            if (listener.callback === callback) {
                this._removeListener(eventName, listener);
                break;
            }
        }
    }

    /**
     * Удаление слушателя
     * @param {string} eventName 
     * @param {Object} listener 
     * @private
     */
    _removeListener(eventName, listener) {
        const listeners = this.events.get(eventName);
        if (listeners) {
            listeners.delete(listener);
            
            if (listeners.size === 0) {
                this.events.delete(eventName);
            }
            
            this.logger?.debug(`Отписка от события: ${eventName}`, { 
                listenerId: listener.id 
            }, 'EventBus');
        }
    }

    /**
     * Вызвать событие
     * @param {string} eventName 
     * @param {*} data 
     * @param {Object} options 
     */
    emit(eventName, data = null, options = {}) {
        // Валидация данных
        if (!this._validateEventData(eventName, data)) {
            this.errorHandler?.handleError({
                type: 'VALIDATION_ERROR',
                message: `Invalid event data for ${eventName}`,
                context: 'EventBus',
                data
            });
            return;
        }
        
        // Применяем middleware
        const processedData = this._applyMiddleware(eventName, data);
        
        const listeners = this.events.get(eventName);
        if (!listeners || listeners.size === 0) {
            this.logger?.debug(`Нет слушателей для события: ${eventName}`, data, 'EventBus');
            return;
        }
        
        // Сортируем слушателей по приоритету
        const sortedListeners = Array.from(listeners).sort((a, b) => b.priority - a.priority);
        
        // Обновляем статистику
        this.stats.totalEmissions++;
        const eventType = this.eventTypes.get(eventName);
        if (eventType) {
            eventType.emissions++;
        }
        
        this.logger?.debug(`Событие вызвано: ${eventName}`, {
            data: processedData,
            listenersCount: sortedListeners.length
        }, 'EventBus');
        
        // Вызываем слушателей
        const listenersToRemove = [];
        
        for (const listener of sortedListeners) {
            try {
                // Привязываем контекст если указан
                const callback = listener.context ? 
                    listener.callback.bind(listener.context) : 
                    listener.callback;
                
                callback(processedData, eventName);
                
                // Помечаем для удаления если это одноразовый слушатель
                if (listener.once) {
                    listenersToRemove.push(listener);
                }
                
            } catch (error) {
                this.stats.errors++;
                
                this.errorHandler?.handleError({
                    type: 'GAME_ERROR',
                    message: `Error in event handler for ${eventName}`,
                    error,
                    context: 'EventBus',
                    listenerId: listener.id
                });
            }
        }
        
        // Удаляем одноразовые слушатели
        listenersToRemove.forEach(listener => {
            this._removeListener(eventName, listener);
        });
    }

    /**
     * Применение middleware
     * @param {string} eventName 
     * @param {*} data 
     * @returns {*}
     * @private
     */
    _applyMiddleware(eventName, data) {
        let processedData = data;
        
        for (const middleware of this.middleware) {
            try {
                processedData = middleware(eventName, processedData);
            } catch (error) {
                this.logger?.warn(`Ошибка в middleware для ${eventName}`, error, 'EventBus');
            }
        }
        
        return processedData;
    }

    /**
     * Добавление middleware
     * @param {Function} middleware 
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
        this.logger?.debug('Middleware добавлен', null, 'EventBus');
    }

    /**
     * Debounced emit
     * @param {string} eventName 
     * @param {*} data 
     * @param {number} delay 
     */
    debouncedEmit(eventName, data, delay = 300) {
        const timerKey = `debounce_${eventName}`;
        
        if (this.debounceTimers.has(timerKey)) {
            clearTimeout(this.debounceTimers.get(timerKey));
        }
        
        const timer = setTimeout(() => {
            this.emit(eventName, data);
            this.debounceTimers.delete(timerKey);
        }, delay);
        
        this.debounceTimers.set(timerKey, timer);
    }

    /**
     * Throttled emit
     * @param {string} eventName 
     * @param {*} data 
     * @param {number} interval 
     */
    throttledEmit(eventName, data, interval = 100) {
        const timerKey = `throttle_${eventName}`;
        
        if (!this.throttleTimers.has(timerKey)) {
            this.emit(eventName, data);
            
            const timer = setTimeout(() => {
                this.throttleTimers.delete(timerKey);
            }, interval);
            
            this.throttleTimers.set(timerKey, timer);
        }
    }

    /**
     * Удалить все слушатели события
     * @param {string} eventName 
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
            this.logger?.debug(`Удалены все слушатели для: ${eventName}`, null, 'EventBus');
        } else {
            this.events.clear();
            this.logger?.debug('Удалены все слушатели', null, 'EventBus');
        }
    }

    /**
     * Получить список событий
     * @returns {string[]}
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Получить количество слушателей
     * @param {string} eventName 
     * @returns {number}
     */
    getListenerCount(eventName) {
        const listeners = this.events.get(eventName);
        return listeners ? listeners.size : 0;
    }

    /**
     * Получить статистику
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            eventsCount: this.events.size,
            registeredTypes: this.eventTypes.size,
            middlewareCount: this.middleware.length,
            byEvent: Object.fromEntries(this.stats.byEvent)
        };
    }

    /**
     * Очистка всех таймеров
     */
    clearTimers() {
        // Очищаем debounce таймеры
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        
        // Очищаем throttle таймеры
        for (const timer of this.throttleTimers.values()) {
            clearTimeout(timer);
        }
        this.throttleTimers.clear();
        
        this.logger?.debug('Все таймеры очищены', null, 'EventBus');
    }

    /**
     * Полная очистка EventBus
     */
    destroy() {
        this.removeAllListeners();
        this.middleware = [];
        this.eventTypes.clear();
        this.clearTimers();
        
        this.stats = {
            totalEmissions: 0,
            totalSubscriptions: 0,
            errors: 0,
            byEvent: new Map()
        };
        
        this.logger?.info('EventBus уничтожен', null, 'EventBus');
    }

    /**
     * Обратная совместимость - старый метод clear
     * @param {string} eventName 
     */
    clear(eventName) {
        this.removeAllListeners(eventName);
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}

// Version: 1760439000 - EventBus v2.0.0