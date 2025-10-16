/**
 * PerformanceOptimizer v1.0.0
 * Утилиты для оптимизации производительности
 * Дебаунсинг, троттлинг, мемоизация
 */

class PerformanceOptimizer {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.memoCache = new Map();
    }
    
    /**
     * Дебаунсинг функции
     * @param {Function} func - Функция для дебаунсинга
     * @param {number} delay - Задержка в мс
     * @param {string} key - Уникальный ключ
     * @returns {Function} Дебаунсированная функция
     */
    debounce(func, delay, key = null) {
        const timerKey = key || func.name || 'anonymous';
        
        return (...args) => {
            if (this.debounceTimers.has(timerKey)) {
                clearTimeout(this.debounceTimers.get(timerKey));
            }
            
            const timer = setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(timerKey);
            }, delay);
            
            this.debounceTimers.set(timerKey, timer);
        };
    }
    
    /**
     * Троттлинг функции
     * @param {Function} func - Функция для троттлинга
     * @param {number} delay - Задержка в мс
     * @param {string} key - Уникальный ключ
     * @returns {Function} Троттлированная функция
     */
    throttle(func, delay, key = null) {
        const timerKey = key || func.name || 'anonymous';
        
        return (...args) => {
            if (this.throttleTimers.has(timerKey)) {
                return;
            }
            
            func.apply(this, args);
            
            const timer = setTimeout(() => {
                this.throttleTimers.delete(timerKey);
            }, delay);
            
            this.throttleTimers.set(timerKey, timer);
        };
    }
    
    /**
     * Мемоизация функции
     * @param {Function} func - Функция для мемоизации
     * @param {Function} keyGenerator - Функция генерации ключа
     * @param {number} ttl - Время жизни кэша в мс
     * @returns {Function} Мемоизированная функция
     */
    memoize(func, keyGenerator = null, ttl = 5000) {
        const cacheKey = func.name || 'anonymous';
        
        return (...args) => {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            const fullKey = `${cacheKey}_${key}`;
            
            const cached = this.memoCache.get(fullKey);
            if (cached && Date.now() < cached.expires) {
                return cached.result;
            }
            
            const result = func.apply(this, args);
            this.memoCache.set(fullKey, {
                result,
                expires: Date.now() + ttl
            });
            
            return result;
        };
    }
    
    /**
     * Батчинг обновлений DOM
     * @param {Function} updateFunction - Функция обновления
     * @param {number} delay - Задержка в мс
     * @returns {Function} Батчированная функция
     */
    batchDOMUpdates(updateFunction, delay = 16) {
        let pending = false;
        let updateArgs = [];
        
        const executeUpdate = () => {
            if (updateArgs.length > 0) {
                updateFunction(updateArgs);
                updateArgs = [];
            }
            pending = false;
        };
        
        return (...args) => {
            updateArgs.push(args);
            
            if (!pending) {
                pending = true;
                requestAnimationFrame(() => {
                    setTimeout(executeUpdate, delay);
                });
            }
        };
    }
    
    /**
     * Ленивая загрузка изображений
     * @param {string} src - URL изображения
     * @param {Function} onLoad - Обработчик загрузки
     * @param {Function} onError - Обработчик ошибки
     * @returns {Promise} Промис загрузки
     */
    lazyLoadImage(src, onLoad = null, onError = null) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                if (onLoad) onLoad(img);
                resolve(img);
            };
            
            img.onerror = () => {
                if (onError) onError(img);
                reject(new Error(`Failed to load image: ${src}`));
            };
            
            img.src = src;
        });
    }
    
    /**
     * Виртуализация списка
     * @param {Array} items - Элементы списка
     * @param {Function} renderItem - Функция рендеринга элемента
     * @param {Object} options - Опции виртуализации
     * @returns {Object} Виртуализированный список
     */
    virtualizeList(items, renderItem, options = {}) {
        const {
            containerHeight = 400,
            itemHeight = 50,
            overscan = 5
        } = options;
        
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const totalHeight = items.length * itemHeight;
        
        return {
            getVisibleItems: (scrollTop = 0) => {
                const startIndex = Math.floor(scrollTop / itemHeight);
                const endIndex = Math.min(
                    startIndex + visibleCount + overscan,
                    items.length - 1
                );
                
                return {
                    items: items.slice(startIndex, endIndex + 1),
                    startIndex,
                    endIndex,
                    totalHeight,
                    offsetY: startIndex * itemHeight
                };
            }
        };
    }
    
    /**
     * Оптимизация анимаций
     * @param {Function} animationFunction - Функция анимации
     * @param {Object} options - Опции анимации
     * @returns {Function} Оптимизированная анимация
     */
    optimizeAnimation(animationFunction, options = {}) {
        const {
            duration = 300,
            easing = 'ease-out',
            onComplete = null
        } = options;
        
        let animationId = null;
        let startTime = null;
        
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easedProgress = this.easingFunctions[easing](progress);
            animationFunction(easedProgress);
            
            if (progress < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                if (onComplete) onComplete();
            }
        };
        
        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            startTime = null;
            animationId = requestAnimationFrame(animate);
        };
    }
    
    /**
     * Функции сглаживания
     */
    easingFunctions = {
        'linear': t => t,
        'ease-in': t => t * t,
        'ease-out': t => t * (2 - t),
        'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        'bounce': t => {
            if (t < 1 / 2.75) {
                return 7.5625 * t * t;
            } else if (t < 2 / 2.75) {
                return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            } else if (t < 2.5 / 2.75) {
                return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            } else {
                return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
            }
        }
    };
    
    /**
     * Очистка всех таймеров
     */
    clearAllTimers() {
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.throttleTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        this.throttleTimers.clear();
    }
    
    /**
     * Очистка кэша мемоизации
     */
    clearMemoCache() {
        this.memoCache.clear();
    }
    
    /**
     * Полная очистка
     */
    cleanup() {
        this.clearAllTimers();
        this.clearMemoCache();
    }
}

// Создаем глобальный экземпляр
const performanceOptimizer = new PerformanceOptimizer();

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.PerformanceOptimizer = PerformanceOptimizer;
    window.performanceOptimizer = performanceOptimizer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}
