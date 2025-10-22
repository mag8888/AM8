/**
 * PerformanceMonitor v1.0.0
 * Модуль для мониторинга производительности и памяти
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            memory: {
                used: 0,
                total: 0,
                limit: 0
            },
            performance: {
                renderTime: 0,
                updateTime: 0,
                apiCallTime: 0
            },
            errors: {
                count: 0,
                lastError: null,
                errorTypes: new Map()
            },
            rateLimiting: {
                blockedRequests: 0,
                averageWaitTime: 0,
                lastBlocked: 0
            }
        };
        
        this.startTime = Date.now();
        this.isMonitoring = false;
        this.monitorInterval = null;
        
        console.log('📊 PerformanceMonitor: Инициализирован');
    }
    
    /**
     * Запуск мониторинга
     */
    start() {
        if (this.isMonitoring) {
            console.log('⚠️ PerformanceMonitor: Уже запущен');
            return;
        }
        
        this.isMonitoring = true;
        this.monitorInterval = setInterval(() => {
            this.updateMetrics();
        }, 5000); // Обновляем каждые 5 секунд
        
        console.log('📊 PerformanceMonitor: Мониторинг запущен');
    }
    
    /**
     * Остановка мониторинга
     */
    stop() {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        console.log('📊 PerformanceMonitor: Мониторинг остановлен');
    }
    
    /**
     * Обновление метрик
     */
    updateMetrics() {
        try {
            // Обновляем информацию о памяти
            if (performance.memory) {
                this.metrics.memory.used = performance.memory.usedJSHeapSize;
                this.metrics.memory.total = performance.memory.totalJSHeapSize;
                this.metrics.memory.limit = performance.memory.jsHeapSizeLimit;
            }
            
            // Логируем критически высокое использование памяти
            const memoryUsagePercent = (this.metrics.memory.used / this.metrics.memory.limit) * 100;
            if (memoryUsagePercent > 80) {
                console.warn(`⚠️ PerformanceMonitor: Высокое использование памяти: ${memoryUsagePercent.toFixed(1)}%`);
            }
            
        } catch (error) {
            console.warn('⚠️ PerformanceMonitor: Ошибка обновления метрик:', error);
        }
    }
    
    /**
     * Измерение времени выполнения функции
     */
    measureTime(fn, context = 'unknown') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        const duration = end - start;
        
        // Обновляем метрики производительности
        if (context.includes('render')) {
            this.metrics.performance.renderTime = duration;
        } else if (context.includes('update')) {
            this.metrics.performance.updateTime = duration;
        } else if (context.includes('api')) {
            this.metrics.performance.apiCallTime = duration;
        }
        
        // Логируем медленные операции
        if (duration > 100) {
            console.warn(`⚠️ PerformanceMonitor: Медленная операция ${context}: ${duration.toFixed(2)}ms`);
        }
        
        return result;
    }
    
    /**
     * Регистрация ошибки
     */
    logError(error, context = 'unknown') {
        this.metrics.errors.count++;
        this.metrics.errors.lastError = {
            message: error.message || error,
            context,
            timestamp: Date.now()
        };
        
        const errorType = error.name || 'UnknownError';
        const currentCount = this.metrics.errors.errorTypes.get(errorType) || 0;
        this.metrics.errors.errorTypes.set(errorType, currentCount + 1);
        
        console.error(`❌ PerformanceMonitor: Ошибка в ${context}:`, error);
    }
    
    /**
     * Регистрация заблокированного запроса
     */
    logBlockedRequest(waitTime) {
        this.metrics.rateLimiting.blockedRequests++;
        this.metrics.rateLimiting.lastBlocked = Date.now();
        
        // Обновляем среднее время ожидания
        const currentAvg = this.metrics.rateLimiting.averageWaitTime;
        const totalRequests = this.metrics.rateLimiting.blockedRequests;
        this.metrics.rateLimiting.averageWaitTime = 
            (currentAvg * (totalRequests - 1) + waitTime) / totalRequests;
    }
    
    /**
     * Получение отчета о производительности
     */
    getReport() {
        const uptime = Date.now() - this.startTime;
        const memoryUsagePercent = (this.metrics.memory.used / this.metrics.memory.limit) * 100;
        
        return {
            uptime: Math.round(uptime / 1000), // в секундах
            memory: {
                used: Math.round(this.metrics.memory.used / 1024 / 1024), // в MB
                total: Math.round(this.metrics.memory.total / 1024 / 1024), // в MB
                limit: Math.round(this.metrics.memory.limit / 1024 / 1024), // в MB
                usagePercent: Math.round(memoryUsagePercent * 10) / 10
            },
            performance: {
                renderTime: Math.round(this.metrics.performance.renderTime * 100) / 100,
                updateTime: Math.round(this.metrics.performance.updateTime * 100) / 100,
                apiCallTime: Math.round(this.metrics.performance.apiCallTime * 100) / 100
            },
            errors: {
                count: this.metrics.errors.count,
                lastError: this.metrics.errors.lastError,
                errorTypes: Object.fromEntries(this.metrics.errors.errorTypes)
            },
            rateLimiting: {
                blockedRequests: this.metrics.rateLimiting.blockedRequests,
                averageWaitTime: Math.round(this.metrics.rateLimiting.averageWaitTime),
                lastBlocked: this.metrics.rateLimiting.lastBlocked
            }
        };
    }
    
    /**
     * Вывод отчета в консоль
     */
    printReport() {
        const report = this.getReport();
        console.group('📊 PerformanceMonitor Report');
        console.log('⏱️ Uptime:', report.uptime + 's');
        console.log('💾 Memory:', `${report.memory.used}MB / ${report.memory.limit}MB (${report.memory.usagePercent}%)`);
        console.log('⚡ Performance:', report.performance);
        console.log('❌ Errors:', report.errors.count, 'total');
        if (report.errors.count > 0) {
            console.log('   Last error:', report.errors.lastError);
            console.log('   Error types:', report.errors.errorTypes);
        }
        console.log('🚫 Rate Limiting:', report.rateLimiting);
        console.groupEnd();
    }
    
    /**
     * Очистка метрик
     */
    reset() {
        this.metrics = {
            memory: { used: 0, total: 0, limit: 0 },
            performance: { renderTime: 0, updateTime: 0, apiCallTime: 0 },
            errors: { count: 0, lastError: null, errorTypes: new Map() },
            rateLimiting: { blockedRequests: 0, averageWaitTime: 0, lastBlocked: 0 }
        };
        this.startTime = Date.now();
        console.log('📊 PerformanceMonitor: Метрики сброшены');
    }
    
    /**
     * Уничтожение монитора
     */
    destroy() {
        this.stop();
        this.reset();
        console.log('📊 PerformanceMonitor: Уничтожен');
    }
}

// Создаем глобальный экземпляр
if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
    window.performanceMonitor = new PerformanceMonitor();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}
