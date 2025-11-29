/**
 * Config v2.0.0 - Централизованная система конфигурации
 * 
 * Особенности:
 * - Единая точка конфигурации
 * - Окружение-специфичные настройки
 * - Валидация конфигурации
 * - Динамическое обновление
 * - Типизация настроек
 */
class Config {
    constructor() {
        this.config = {};
        this.validators = new Map();
        this.watchers = new Map();
        this.environment = this._detectEnvironment();
        
        this._initializeDefaultConfig();
        this._loadEnvironmentConfig();
        this._setupValidation();
    }

    /**
     * Определение окружения
     * @returns {string}
     * @private
     */
    _detectEnvironment() {
        // Всегда используем production (Railway), без локального режима
            return 'production';
    }

    /**
     * Инициализация базовой конфигурации
     * @private
     */
    _initializeDefaultConfig() {
        this.config = {
            // Основные настройки приложения
            app: {
                name: 'Aura Money',
                version: '2.0.0',
                environment: this.environment,
                debug: this.environment === 'development'
            },

            // Настройки API
            api: {
                baseUrl: this._getApiBaseUrl(),
                timeout: 30000,
                retries: 3,
                retryDelay: 1000
            },

            // Настройки игрового процесса
            game: {
                maxPlayers: 8,
                minPlayers: 2,
                defaultTurnTime: 30,
                maxTurnTime: 300,
                diceSides: 6,
                startingMoney: 5000,
                startingSalary: 5000
            },

            // Настройки UI
            ui: {
                animationDuration: 300,
                transitionDuration: 200,
                autoSaveInterval: 30000,
                notificationTimeout: 5000,
                maxNotifications: 5
            },

            // Настройки производительности
            performance: {
                enableLogging: this.environment === 'development',
                enableProfiling: this.environment === 'development',
                maxLogEntries: 1000,
                memoryWarningThreshold: 0.8,
                slowOperationThreshold: 100
            },

            // Настройки безопасности
            security: {
                enableCSP: false,
                enableHSTS: true,
                tokenExpiry: 3600000, // 1 час
                maxLoginAttempts: 5,
                lockoutDuration: 300000 // 5 минут
            },

            // Настройки кэширования
            cache: {
                enableLocalStorage: true,
                enableSessionStorage: true,
                maxCacheSize: 10485760, // 10MB
                cacheExpiry: 86400000 // 24 часа
            },

            // Настройки аналитики
            analytics: {
                enableTracking: this.environment === 'production',
                trackErrors: true,
                trackPerformance: true,
                trackUserActions: true
            }
        };
    }

    /**
     * Получение базового URL API
     * @returns {string}
     * @private
     */
    _getApiBaseUrl() {
        // Всегда используем Railway production сервер
        return 'https://am8-production.up.railway.app/api';
    }

    /**
     * Загрузка конфигурации для окружения
     * @private
     */
    _loadEnvironmentConfig() {
        const envConfig = {
            development: {
                app: { debug: false },
                performance: { 
                    enableLogging: false, 
                    enableProfiling: false 
                },
                api: { 
                    baseUrl: 'https://am8-production.up.railway.app/api',
                    timeout: 10000
                }
            },
            staging: {
                app: { debug: false },
                performance: { 
                    enableLogging: true, 
                    enableProfiling: false 
                },
                analytics: { enableTracking: true }
            },
            production: {
                app: { debug: false },
                performance: { 
                    enableLogging: false, 
                    enableProfiling: false 
                },
                analytics: { enableTracking: true },
                security: { 
                    enableCSP: false,
                    enableHSTS: true
                }
            }
        };

        const currentEnvConfig = envConfig[this.environment] || {};
        this._mergeConfig(this.config, currentEnvConfig);
    }

    /**
     * Рекурсивное слияние конфигураций
     * @param {Object} target 
     * @param {Object} source 
     * @private
     */
    _mergeConfig(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
                    if (!target[key]) target[key] = {};
                    this._mergeConfig(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
    }

    /**
     * Настройка валидации
     * @private
     */
    _setupValidation() {
        // Валидаторы для различных типов конфигурации
        this.validators.set('app.name', (value) => typeof value === 'string' && value.length > 0);
        this.validators.set('app.version', (value) => /^\d+\.\d+\.\d+$/.test(value));
        this.validators.set('game.maxPlayers', (value) => Number.isInteger(value) && value >= 2 && value <= 12);
        this.validators.set('game.minPlayers', (value) => Number.isInteger(value) && value >= 1 && value <= 6);
        this.validators.set('api.timeout', (value) => Number.isInteger(value) && value > 0 && value <= 60000);
        this.validators.set('ui.animationDuration', (value) => Number.isInteger(value) && value >= 0 && value <= 5000);
    }

    /**
     * Получение значения конфигурации
     * @param {string} path - Путь к значению (например, 'app.name')
     * @param {*} defaultValue - Значение по умолчанию
     * @returns {*}
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }

    /**
     * Установка значения конфигурации
     * @param {string} path - Путь к значению
     * @param {*} value - Новое значение
     * @param {boolean} validate - Валидировать ли значение
     * @returns {boolean}
     */
    set(path, value, validate = true) {
        if (validate && !this._validateValue(path, value)) {
            console.warn(`Config: Invalid value for ${path}:`, value);
            return false;
        }

        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.config;
        
        for (const key of keys) {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        // Уведомляем наблюдателей
        this._notifyWatchers(path, value, oldValue);
        
        return true;
    }

    /**
     * Валидация значения
     * @param {string} path 
     * @param {*} value 
     * @returns {boolean}
     * @private
     */
    _validateValue(path, value) {
        const validator = this.validators.get(path);
        return !validator || validator(value);
    }

    /**
     * Уведомление наблюдателей
     * @param {string} path 
     * @param {*} newValue 
     * @param {*} oldValue 
     * @private
     */
    _notifyWatchers(path, newValue, oldValue) {
        const watchers = this.watchers.get(path) || [];
        watchers.forEach(callback => {
            try {
                callback(newValue, oldValue, path);
            } catch (error) {
                console.error('Config: Error in watcher callback:', error);
            }
        });
    }

    /**
     * Подписка на изменения конфигурации
     * @param {string} path 
     * @param {Function} callback 
     * @returns {Function} Функция для отписки
     */
    watch(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, []);
        }
        
        this.watchers.get(path).push(callback);
        
        // Возвращаем функцию для отписки
        return () => {
            const watchers = this.watchers.get(path);
            if (watchers) {
                const index = watchers.indexOf(callback);
                if (index > -1) {
                    watchers.splice(index, 1);
                }
            }
        };
    }

    /**
     * Получение всех настроек
     * @returns {Object}
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Обновление конфигурации
     * @param {Object} newConfig 
     * @param {boolean} validate 
     * @returns {boolean}
     */
    update(newConfig, validate = true) {
        try {
            if (validate && !this._validateConfig(newConfig)) {
                console.error('Config: Invalid configuration provided');
                return false;
            }
            
            this._mergeConfig(this.config, newConfig);
            this._notifyWatchers('*', this.config, null);
            
            return true;
        } catch (error) {
            console.error('Config: Error updating configuration:', error);
            return false;
        }
    }

    /**
     * Валидация всей конфигурации
     * @param {Object} config 
     * @returns {boolean}
     * @private
     */
    _validateConfig(config) {
        for (const [path, validator] of this.validators) {
            const value = this._getValueByPath(config, path);
            if (value !== undefined && !validator(value)) {
                console.error(`Config: Validation failed for ${path}:`, value);
                return false;
            }
        }
        return true;
    }

    /**
     * Получение значения по пути
     * @param {Object} obj 
     * @param {string} path 
     * @returns {*}
     * @private
     */
    _getValueByPath(obj, path) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        
        return current;
    }

    /**
     * Добавление валидатора
     * @param {string} path 
     * @param {Function} validator 
     */
    addValidator(path, validator) {
        this.validators.set(path, validator);
    }

    /**
     * Проверка, является ли приложение в режиме отладки
     * @returns {boolean}
     */
    isDebug() {
        return this.get('app.debug', false);
    }

    /**
     * Проверка окружения
     * @param {string} env 
     * @returns {boolean}
     */
    isEnvironment(env) {
        return this.environment === env;
    }

    /**
     * Получение информации об окружении
     * @returns {Object}
     */
    getEnvironmentInfo() {
        return {
            environment: this.environment,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            isLocalhost: window.location.hostname === 'localhost',
            isProduction: this.environment === 'production',
            isDevelopment: this.environment === 'development'
        };
    }

    /**
     * Экспорт конфигурации
     * @returns {string}
     */
    export() {
        return JSON.stringify({
            config: this.config,
            environment: this.environment,
            timestamp: Date.now()
        }, null, 2);
    }

    /**
     * Импорт конфигурации
     * @param {string} configString 
     * @returns {boolean}
     */
    import(configString) {
        try {
            const imported = JSON.parse(configString);
            return this.update(imported.config, true);
        } catch (error) {
            console.error('Config: Error importing configuration:', error);
            return false;
        }
    }
}

// Создаем глобальный экземпляр
const config = new Config();

// Экспорт
if (typeof window !== 'undefined') {
    window.Config = Config;
    window.config = config;
}

// Version: 1760439000 - Config v2.0.0
