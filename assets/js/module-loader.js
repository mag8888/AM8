/**
 * ModuleLoader - Оптимизированная система загрузки модулей
 * Загружает модули по требованию (lazy loading) для ускорения начальной загрузки
 */

class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingModules = new Map();
        this.moduleCache = new Map();
        this.basePath = 'assets/js/';
    }
    
    /**
     * Загрузка модуля по требованию
     * @param {string} modulePath - Путь к модулю относительно assets/js/
     * @returns {Promise<void>}
     */
    async loadModule(modulePath) {
        // Проверяем, не загружен ли уже модуль
        if (this.loadedModules.has(modulePath)) {
            return Promise.resolve();
        }
        
        // Проверяем, не загружается ли уже модуль
        if (this.loadingModules.has(modulePath)) {
            return this.loadingModules.get(modulePath);
        }
        
        // Создаем промис для загрузки
        const loadPromise = this._loadScript(modulePath);
        this.loadingModules.set(modulePath, loadPromise);
        
        try {
            await loadPromise;
            this.loadedModules.add(modulePath);
            this.loadingModules.delete(modulePath);
        } catch (error) {
            this.loadingModules.delete(modulePath);
            throw error;
        }
    }
    
    /**
     * Загрузка нескольких модулей параллельно
     * @param {string[]} modulePaths - Массив путей к модулям
     * @returns {Promise<void[]>}
     */
    async loadModules(modulePaths) {
        return Promise.all(modulePaths.map(path => this.loadModule(path)));
    }
    
    /**
     * Внутренний метод загрузки скрипта
     * @private
     */
    _loadScript(modulePath) {
        return new Promise((resolve, reject) => {
            // Проверяем кэш
            if (this.moduleCache.has(modulePath)) {
                resolve();
                return;
            }
            
            const fullPath = `${this.basePath}${modulePath}`;
            const script = document.createElement('script');
            script.src = `${fullPath}?v=${Date.now()}`;
            script.async = true;
            script.defer = false;
            
            script.onload = () => {
                this.moduleCache.set(modulePath, true);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ ModuleLoader: Ошибка загрузки модуля ${modulePath}`);
                reject(new Error(`Failed to load module: ${modulePath}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Предзагрузка модулей (для критических)
     * @param {string[]} modulePaths - Массив путей к модулям
     */
    preloadModules(modulePaths) {
        modulePaths.forEach(path => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = `${this.basePath}${path}`;
            document.head.appendChild(link);
        });
    }
    
    /**
     * Проверка, загружен ли модуль
     * @param {string} modulePath - Путь к модулю
     * @returns {boolean}
     */
    isLoaded(modulePath) {
        return this.loadedModules.has(modulePath);
    }
}

// Создаем глобальный экземпляр
window.ModuleLoader = new ModuleLoader();

