/**
 * UserModel - Модель пользователя для сервера
 * Версия: 1.0.0
 * Дата: 11 октября 2024
 */

const fs = require('fs').promises;
const path = require('path');

class UserModel {
    constructor() {
        this.dataFile = path.join(__dirname, '../../data/users.json');
        this.users = new Map();
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация модели
     */
    async init() {
        try {
            console.log('👤 UserModel: Инициализация...');
            
            // Создаем директорию для данных, если её нет
            await this.ensureDataDirectory();
            
            // Загружаем пользователей из файла
            await this.loadFromFile();
            
            this.isInitialized = true;
            console.log(`✅ UserModel: Загружено ${this.users.size} пользователей`);
        } catch (error) {
            console.error('❌ UserModel: Ошибка инициализации:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Создание директории для данных
     */
    async ensureDataDirectory() {
        try {
            const dataDir = path.dirname(this.dataFile);
            await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
            console.error('❌ UserModel: Ошибка создания директории данных:', error);
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
            await this.saveToFile();
            
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
     * @returns {Promise<Object|null>} Найденный пользователь
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
     * @returns {Promise<Object|null>} Найденный пользователь
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
     * @returns {Promise<Object|null>} Найденный пользователь
     */
    async findById(id) {
        return this.users.get(id) || null;
    }

    /**
     * Обновление пользователя
     * @param {string} id - ID пользователя
     * @param {Object} updateData - Данные для обновления
     * @returns {Promise<Object|null>} Обновленный пользователь
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
            await this.saveToFile();
            
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
     * @returns {Promise<boolean>} Успешность удаления
     */
    async deleteUser(id) {
        try {
            const deleted = this.users.delete(id);
            if (deleted) {
                await this.saveToFile();
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
     * @returns {Promise<boolean>} Уникален ли email
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
     * @returns {Promise<boolean>} Уникален ли username
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
     * @returns {Promise<Object|null>} Обновленный пользователь
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
     * Получение профиля пользователя (публичные данные)
     * @param {string} id - ID пользователя
     * @returns {Promise<Object|null>} Профиль пользователя
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
     * @returns {Promise<Array>} Массив найденных пользователей
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
     * Получение всех пользователей
     * @param {Object} options - Опции запроса
     * @returns {Promise<Array>} Массив пользователей
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

    /**
     * Генерация уникального ID
     * @returns {string} Уникальный ID
     */
    generateId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Сохранение данных в файл
     */
    async saveToFile() {
        try {
            const data = Array.from(this.users.entries());
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ UserModel: Ошибка сохранения в файл:', error);
            throw error;
        }
    }

    /**
     * Загрузка данных из файла
     */
    async loadFromFile() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            if (data) {
                const usersArray = JSON.parse(data);
                this.users = new Map(usersArray);
                console.log(`📁 UserModel: Загружено ${this.users.size} пользователей из файла`);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📁 UserModel: Файл пользователей не найден, создаем новый');
                this.users = new Map();
            } else {
                console.error('❌ UserModel: Ошибка загрузки из файла:', error);
                throw error;
            }
        }
    }

    /**
     * Очистка всех данных
     */
    async clearAll() {
        this.users.clear();
        try {
            await fs.unlink(this.dataFile);
        } catch (error) {
            // Файл может не существовать
        }
        console.log('🗑️ UserModel: Все данные очищены');
    }

    /**
     * Резервное копирование данных
     * @param {string} backupPath - Путь для резервной копии
     */
    async backup(backupPath) {
        try {
            const data = Array.from(this.users.entries());
            await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
            console.log('💾 UserModel: Резервная копия создана:', backupPath);
        } catch (error) {
            console.error('❌ UserModel: Ошибка создания резервной копии:', error);
            throw error;
        }
    }

    /**
     * Восстановление из резервной копии
     * @param {string} backupPath - Путь к резервной копии
     */
    async restore(backupPath) {
        try {
            const data = await fs.readFile(backupPath, 'utf8');
            const usersArray = JSON.parse(data);
            this.users = new Map(usersArray);
            await this.saveToFile();
            console.log('🔄 UserModel: Данные восстановлены из резервной копии');
        } catch (error) {
            console.error('❌ UserModel: Ошибка восстановления из резервной копии:', error);
            throw error;
        }
    }
}

module.exports = UserModel;
