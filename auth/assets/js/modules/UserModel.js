/**
 * UserModel - Модель пользователя
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

class UserModel {
    constructor() {
        this.users = new Map();
        this.currentUser = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация модели
     */
    async init() {
        try {
            console.log('👤 UserModel: Инициализация...');
            
            // Загружаем пользователей из localStorage (для демо)
            await this.loadFromStorage();
            
            this.isInitialized = true;
            console.log('✅ UserModel: Инициализация завершена');
        } catch (error) {
            console.error('❌ UserModel: Ошибка инициализации:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Создание нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} Созданный пользователь
     */
    async createUser(userData) {
        try {
            const user = {
                id: this.generateId(),
                email: userData.email,
                username: userData.username,
                passwordHash: userData.passwordHash,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                emailVerified: false,
                stats: {
                    gamesPlayed: 0,
                    totalWins: 0,
                    totalEarnings: 0,
                    totalTimePlayed: 0
                },
                preferences: {
                    theme: 'dark',
                    language: 'ru',
                    notifications: true,
                    soundEnabled: true
                },
                profile: {
                    avatar: null,
                    bio: '',
                    location: '',
                    website: ''
                }
            };

            this.users.set(user.id, user);
            await this.saveToStorage();
            
            console.log('✅ UserModel: Пользователь создан:', user.email);
            return user;
        } catch (error) {
            console.error('❌ UserModel: Ошибка создания пользователя:', error);
            throw error;
        }
    }

    /**
     * Поиск пользователя по email
     * @param {string} email - Email пользователя
     * @returns {Object|null} Найденный пользователь
     */
    async findByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }

    /**
     * Поиск пользователя по username
     * @param {string} username - Имя пользователя
     * @returns {Object|null} Найденный пользователь
     */
    async findByUsername(username) {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return user;
            }
        }
        return null;
    }

    /**
     * Поиск пользователя по ID
     * @param {string} id - ID пользователя
     * @returns {Object|null} Найденный пользователь
     */
    async findById(id) {
        return this.users.get(id) || null;
    }

    /**
     * Обновление пользователя
     * @param {string} id - ID пользователя
     * @param {Object} updateData - Данные для обновления
     * @returns {Object|null} Обновленный пользователь
     */
    async updateUser(id, updateData) {
        try {
            const user = this.users.get(id);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // Обновляем только разрешенные поля
            const allowedFields = [
                'username', 'email', 'lastLogin', 'emailVerified',
                'stats', 'preferences', 'profile', 'isActive'
            ];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    if (typeof value === 'object' && value !== null) {
                        user[key] = { ...user[key], ...value };
                    } else {
                        user[key] = value;
                    }
                }
            }

            this.users.set(id, user);
            await this.saveToStorage();
            
            console.log('✅ UserModel: Пользователь обновлен:', id);
            return user;
        } catch (error) {
            console.error('❌ UserModel: Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    /**
     * Удаление пользователя
     * @param {string} id - ID пользователя
     * @returns {boolean} Успешность удаления
     */
    async deleteUser(id) {
        try {
            const deleted = this.users.delete(id);
            if (deleted) {
                await this.saveToStorage();
                console.log('✅ UserModel: Пользователь удален:', id);
            }
            return deleted;
        } catch (error) {
            console.error('❌ UserModel: Ошибка удаления пользователя:', error);
            return false;
        }
    }

    /**
     * Проверка уникальности email
     * @param {string} email - Email для проверки
     * @param {string} excludeId - ID пользователя для исключения
     * @returns {boolean} Уникален ли email
     */
    async isEmailUnique(email, excludeId = null) {
        for (const [id, user] of this.users.entries()) {
            if (excludeId && id === excludeId) continue;
            if (user.email === email) {
                return false;
            }
        }
        return true;
    }

    /**
     * Проверка уникальности username
     * @param {string} username - Username для проверки
     * @param {string} excludeId - ID пользователя для исключения
     * @returns {boolean} Уникален ли username
     */
    async isUsernameUnique(username, excludeId = null) {
        for (const [id, user] of this.users.entries()) {
            if (excludeId && id === excludeId) continue;
            if (user.username === username) {
                return false;
            }
        }
        return true;
    }

    /**
     * Обновление времени последнего входа
     * @param {string} id - ID пользователя
     * @returns {Object|null} Обновленный пользователь
     */
    async updateLastLogin(id) {
        try {
            return await this.updateUser(id, {
                lastLogin: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ UserModel: Ошибка обновления времени входа:', error);
            return null;
        }
    }

    /**
     * Получение статистики пользователя
     * @param {string} id - ID пользователя
     * @returns {Object|null} Статистика пользователя
     */
    async getUserStats(id) {
        const user = await this.findById(id);
        return user ? user.stats : null;
    }

    /**
     * Обновление статистики пользователя
     * @param {string} id - ID пользователя
     * @param {Object} statsUpdate - Обновления статистики
     * @returns {Object|null} Обновленный пользователь
     */
    async updateUserStats(id, statsUpdate) {
        try {
            const user = await this.findById(id);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            const updatedStats = { ...user.stats, ...statsUpdate };
            return await this.updateUser(id, { stats: updatedStats });
        } catch (error) {
            console.error('❌ UserModel: Ошибка обновления статистики:', error);
            return null;
        }
    }

    /**
     * Получение настроек пользователя
     * @param {string} id - ID пользователя
     * @returns {Object|null} Настройки пользователя
     */
    async getUserPreferences(id) {
        const user = await this.findById(id);
        return user ? user.preferences : null;
    }

    /**
     * Обновление настроек пользователя
     * @param {string} id - ID пользователя
     * @param {Object} preferencesUpdate - Обновления настроек
     * @returns {Object|null} Обновленный пользователь
     */
    async updateUserPreferences(id, preferencesUpdate) {
        try {
            const user = await this.findById(id);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            const updatedPreferences = { ...user.preferences, ...preferencesUpdate };
            return await this.updateUser(id, { preferences: updatedPreferences });
        } catch (error) {
            console.error('❌ UserModel: Ошибка обновления настроек:', error);
            return null;
        }
    }

    /**
     * Получение профиля пользователя
     * @param {string} id - ID пользователя
     * @returns {Object|null} Профиль пользователя
     */
    async getUserProfile(id) {
        const user = await this.findById(id);
        if (!user) return null;

        // Возвращаем только публичные данные
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            stats: user.stats,
            profile: user.profile,
            preferences: {
                theme: user.preferences.theme,
                language: user.preferences.language
            }
        };
    }

    /**
     * Поиск пользователей
     * @param {Object} query - Параметры поиска
     * @returns {Array} Массив найденных пользователей
     */
    async searchUsers(query) {
        const { username, email, limit = 10, offset = 0 } = query;
        const results = [];

        for (const user of this.users.values()) {
            let matches = true;

            if (username && !user.username.toLowerCase().includes(username.toLowerCase())) {
                matches = false;
            }

            if (email && !user.email.toLowerCase().includes(email.toLowerCase())) {
                matches = false;
            }

            if (matches) {
                results.push(await this.getUserProfile(user.id));
            }

            if (results.length >= limit) break;
        }

        return results.slice(offset, offset + limit);
    }

    /**
     * Получение всех пользователей (админ функция)
     * @param {Object} options - Опции запроса
     * @returns {Array} Массив пользователей
     */
    async getAllUsers(options = {}) {
        const { limit = 50, offset = 0, activeOnly = false } = options;
        const results = [];

        for (const user of this.users.values()) {
            if (activeOnly && !user.isActive) continue;
            
            results.push(await this.getUserProfile(user.id));
        }

        return results.slice(offset, offset + limit);
    }

    /**
     * Активация/деактивация пользователя
     * @param {string} id - ID пользователя
     * @param {boolean} isActive - Статус активности
     * @returns {Object|null} Обновленный пользователь
     */
    async setUserActive(id, isActive) {
        try {
            return await this.updateUser(id, { isActive });
        } catch (error) {
            console.error('❌ UserModel: Ошибка изменения статуса пользователя:', error);
            return null;
        }
    }

    /**
     * Генерация уникального ID
     * @returns {string} Уникальный ID
     */
    generateId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Сохранение данных в localStorage
     */
    async saveToStorage() {
        try {
            const data = Array.from(this.users.entries());
            localStorage.setItem('aura_money_users', JSON.stringify(data));
        } catch (error) {
            console.error('❌ UserModel: Ошибка сохранения в localStorage:', error);
        }
    }

    /**
     * Загрузка данных из localStorage
     */
    async loadFromStorage() {
        try {
            const data = localStorage.getItem('aura_money_users');
            if (data) {
                const usersArray = JSON.parse(data);
                this.users = new Map(usersArray);
                console.log(`📁 UserModel: Загружено ${this.users.size} пользователей из localStorage`);
            }
        } catch (error) {
            console.error('❌ UserModel: Ошибка загрузки из localStorage:', error);
            this.users = new Map();
        }
    }

    /**
     * Очистка всех данных
     */
    async clearAll() {
        this.users.clear();
        localStorage.removeItem('aura_money_users');
        console.log('🗑️ UserModel: Все данные очищены');
    }

    /**
     * Получение количества пользователей
     * @returns {number} Количество пользователей
     */
    getUserCount() {
        return this.users.size;
    }

    /**
     * Получение статистики модели
     * @returns {Object} Статистика
     */
    getStats() {
        let activeCount = 0;
        let verifiedCount = 0;
        let totalGames = 0;

        for (const user of this.users.values()) {
            if (user.isActive) activeCount++;
            if (user.emailVerified) verifiedCount++;
            totalGames += user.stats.gamesPlayed || 0;
        }

        return {
            totalUsers: this.users.size,
            activeUsers: activeCount,
            verifiedUsers: verifiedCount,
            totalGames
        };
    }
}

// Создаем глобальный экземпляр модели
const userModel = new UserModel();

// Экспортируем для использования в других модулях
if (typeof window !== 'undefined') {
    window.UserModel = UserModel;
    window.userModel = userModel;
}
