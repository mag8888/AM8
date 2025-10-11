/**
 * EventBus - простая система событий для взаимодействия между модулями
 */
class EventBus {
    constructor() {
        this.events = {};
        console.log('✅ EventBus инициализирован');
    }

    /**
     * Подписаться на событие
     * @param {string} eventName - Название события
     * @param {Function} callback - Функция обратного вызова
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
        console.log(`📡 EventBus: Подписка на "${eventName}"`);
    }

    /**
     * Отписаться от события
     * @param {string} eventName - Название события
     * @param {Function} callback - Функция обратного вызова
     */
    off(eventName, callback) {
        if (!this.events[eventName]) {
            return;
        }
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        console.log(`📡 EventBus: Отписка от "${eventName}"`);
    }

    /**
     * Вызвать событие
     * @param {string} eventName - Название события
     * @param {*} data - Данные события
     */
    emit(eventName, data) {
        console.log(`📡 EventBus: Событие "${eventName}"`, data);
        
        if (!this.events[eventName]) {
            return;
        }
        
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ EventBus: Ошибка в обработчике "${eventName}":`, error);
            }
        });
    }

    /**
     * Подписаться на событие один раз
     * @param {string} eventName - Название события
     * @param {Function} callback - Функция обратного вызова
     */
    once(eventName, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(eventName, onceWrapper);
        };
        this.on(eventName, onceWrapper);
    }

    /**
     * Очистить все подписки на событие или все события
     * @param {string} [eventName] - Название события (опционально)
     */
    clear(eventName) {
        if (eventName) {
            delete this.events[eventName];
            console.log(`📡 EventBus: Очищены подписки на "${eventName}"`);
        } else {
            this.events = {};
            console.log('📡 EventBus: Очищены все подписки');
        }
    }
}

window.EventBus = EventBus;


