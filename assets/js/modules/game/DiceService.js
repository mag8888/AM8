/**
 * DiceService v1.0.0
 * -----------------------------------------------------------------------------
 * Сервис для бросков кубиков и расчета движения
 */
class DiceService {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        
        // Состояние кубиков
        this.currentRoll = null;
        this.doubleDiceEnabled = false;
        this.consecutiveDoubles = 0;
        this.maxConsecutiveDoubles = 3;
        
        // История бросков
        this.rollHistory = [];
        this.maxHistoryLength = 10;
        
        console.log('🎲 DiceService: Инициализация...');
        this.setupEventListeners();
        console.log('✅ DiceService: Инициализация завершена');
    }
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('charity:double_dice_enabled', this.enableDoubleDice.bind(this));
            this.eventBus.on('charity:double_dice_disabled', this.disableDoubleDice.bind(this));
            this.eventBus.on('game:reset', this.reset.bind(this));
        }
    }
    
    /**
     * Бросок кубика/кубиков
     * @param {Object} options - Опции броска
     * @param {boolean} options.forceSingle - Принудительно один кубик
     * @param {boolean} options.forceDouble - Принудительно два кубика
     * @returns {Object} Результат броска
     */
    roll(options = {}) {
        const { forceSingle = false, forceDouble = false } = options;
        
        // Определяем количество кубиков
        const useDoubleDice = this.doubleDiceEnabled && !forceSingle || forceDouble;
        const diceCount = useDoubleDice ? 2 : 1;
        
        // Бросаем кубики
        const results = [];
        for (let i = 0; i < diceCount; i++) {
            results.push(this.generateRandomDice());
        }
        
        // Создаем объект результата
        const rollResult = {
            id: this.generateRollId(),
            timestamp: Date.now(),
            diceCount,
            results,
            total: results.reduce((sum, value) => sum + value, 0),
            isDouble: false,
            consecutiveDoubles: this.consecutiveDoubles
        };
        
        // Проверяем на дубль (только для двух кубиков)
        if (diceCount === 2 && results[0] === results[1]) {
            rollResult.isDouble = true;
            this.consecutiveDoubles++;
            rollResult.consecutiveDoubles = this.consecutiveDoubles;
            
            // Проверяем на максимальное количество дублей подряд
            if (this.consecutiveDoubles >= this.maxConsecutiveDoubles) {
                rollResult.maxDoublesReached = true;
                rollResult.penalty = 'jail'; // Отправляем в "тюрьму" (пропуск хода)
            }
        } else {
            this.consecutiveDoubles = 0;
        }
        
        // Сохраняем результат
        this.currentRoll = rollResult;
        this.addToHistory(rollResult);
        
        // Отправляем событие
        this.emitRollEvent(rollResult);
        
        console.log(`🎲 DiceService: Бросок ${diceCount} кубик(ов):`, rollResult);
        
        return rollResult;
    }
    
    /**
     * Генерация случайного значения кубика (1-6)
     */
    generateRandomDice() {
        return Math.floor(Math.random() * 6) + 1;
    }
    
    /**
     * Генерация уникального ID для броска
     */
    generateRollId() {
        return `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Добавление броска в историю
     */
    addToHistory(rollResult) {
        this.rollHistory.unshift(rollResult);
        
        // Ограничиваем длину истории
        if (this.rollHistory.length > this.maxHistoryLength) {
            this.rollHistory = this.rollHistory.slice(0, this.maxHistoryLength);
        }
    }
    
    /**
     * Отправка события о броске
     */
    emitRollEvent(rollResult) {
        if (this.eventBus) {
            this.eventBus.emit('dice:rolled', rollResult);
            
            // Дополнительные события
            if (rollResult.isDouble) {
                this.eventBus.emit('dice:double', rollResult);
            }
            
            if (rollResult.maxDoublesReached) {
                this.eventBus.emit('dice:max_doubles', rollResult);
            }
        }
    }
    
    /**
     * Включение двойного кубика (благотворительность)
     */
    enableDoubleDice() {
        this.doubleDiceEnabled = true;
        console.log('🎲 DiceService: Двойной кубик включен');
        
        if (this.eventBus) {
            this.eventBus.emit('dice:double_enabled');
        }
    }
    
    /**
     * Отключение двойного кубика
     */
    disableDoubleDice() {
        this.doubleDiceEnabled = false;
        console.log('🎲 DiceService: Двойной кубик отключен');
        
        if (this.eventBus) {
            this.eventBus.emit('dice:double_disabled');
        }
    }
    
    /**
     * Получение текущего броска
     */
    getCurrentRoll() {
        return this.currentRoll;
    }
    
    /**
     * Получение истории бросков
     */
    getHistory() {
        return [...this.rollHistory];
    }
    
    /**
     * Получение последнего броска
     */
    getLastRoll() {
        return this.rollHistory[0] || null;
    }
    
    /**
     * Проверка, может ли игрок бросать кубик
     */
    canRoll() {
        // Проверяем, не достиг ли игрок максимального количества дублей
        if (this.consecutiveDoubles >= this.maxConsecutiveDoubles) {
            return false;
        }
        
        // Проверяем состояние игры
        if (this.gameState) {
            return this.gameState.canRoll;
        }
        
        return true;
    }
    
    /**
     * Установить последний бросок (для синхронизации с сервером)
     * @param {Object} rollResult - Результат броска с сервера
     */
    setLastRoll(rollResult) {
        const rawValue = rollResult && (rollResult.value ?? rollResult.total ?? rollResult);
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) {
            console.warn('⚠️ DiceService: Некорректное значение броска при синхронизации:', rollResult);
            return;
        }
        
        const providedResults = Array.isArray(rollResult?.results) && rollResult.results.length
            ? rollResult.results.map(Number)
            : null;
        const results = providedResults || [value];
        const diceCount = Math.max(1, Number(rollResult?.diceCount) || results.length);
        const isDouble = Boolean(rollResult?.isDouble && diceCount === 2);
        
        // Обновляем счетчик дублей на основании данных сервера (если есть)
        if (typeof rollResult?.consecutiveDoubles === 'number') {
            this.consecutiveDoubles = rollResult.consecutiveDoubles;
        } else {
            this.consecutiveDoubles = isDouble ? this.consecutiveDoubles + 1 : 0;
        }
        
        this.currentRoll = {
            id: this.generateRollId(),
            timestamp: Date.now(),
            diceCount,
            results,
            total: value,
            isDouble,
            consecutiveDoubles: this.consecutiveDoubles,
            source: 'server'
        };
        
        this.addToHistory(this.currentRoll);
        this.emitRollEvent(this.currentRoll);
        
        console.log('🎲 DiceService: Установлен последний бросок с сервера:', this.currentRoll);
    }
    
    /**
     * Сброс состояния
     */
    reset() {
        this.currentRoll = null;
        this.consecutiveDoubles = 0;
        this.rollHistory = [];
        console.log('🎲 DiceService: Состояние сброшено');
    }
    
    /**
     * Получение статистики бросков
     */
    getStats() {
        const stats = {
            totalRolls: this.rollHistory.length,
            totalDoubles: this.rollHistory.filter(roll => roll.isDouble).length,
            consecutiveDoubles: this.consecutiveDoubles,
            doubleDiceEnabled: this.doubleDiceEnabled,
            averageRoll: 0
        };
        
        if (this.rollHistory.length > 0) {
            const totalSum = this.rollHistory.reduce((sum, roll) => sum + roll.total, 0);
            stats.averageRoll = Math.round((totalSum / this.rollHistory.length) * 100) / 100;
        }
        
        return stats;
    }
    
    /**
     * Форматирование результата броска для отображения
     */
    formatRollResult(rollResult) {
        if (!rollResult) return 'Нет броска';
        
        const { results, total, isDouble, diceCount } = rollResult;
        
        if (diceCount === 1) {
            return `${results[0]}`;
        } else {
            const diceText = results.join(' + ');
            const doubleText = isDouble ? ' (дубль!)' : '';
            return `${diceText} = ${total}${doubleText}`;
        }
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.DiceService = DiceService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiceService;
}
