const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DATABASE_URL || path.join(process.env.NODE_ENV === 'production' ? '/tmp' : __dirname, 'aura_money.db');

let db;

/**
 * Инициализация базы данных
 */
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к базе данных:', err);
                reject(err);
                return;
            }
            
            console.log('✅ Подключение к базе данных SQLite установлено');
            
            // Создаем таблицы
            createTables()
                .then(() => {
                    console.log('✅ Таблицы базы данных созданы');
                    // Добавляем начальные данные
                    return seedInitialData();
                })
                .then(() => {
                    console.log('✅ Начальные данные добавлены');
                    resolve();
                })
                .catch(reject);
        });
    });
}

/**
 * Создание таблиц
 */
function createTables() {
    return new Promise((resolve, reject) => {
        const tables = [
            // Таблица пользователей
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT,
                avatar TEXT,
                level INTEGER DEFAULT 1,
                games_played INTEGER DEFAULT 0,
                games_won INTEGER DEFAULT 0,
                rating INTEGER DEFAULT 1000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )`,
            
            // Таблица комнат
            `CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                max_players INTEGER DEFAULT 4,
                current_players INTEGER DEFAULT 0,
                status TEXT DEFAULT 'waiting',
                is_started BOOLEAN DEFAULT 0,
                turn_time INTEGER DEFAULT 30,
                assign_professions BOOLEAN DEFAULT 0,
                creator_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (creator_id) REFERENCES users (id)
            )`,
            
            // Таблица игроков в комнатах
            `CREATE TABLE IF NOT EXISTS room_players (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                is_host BOOLEAN DEFAULT 0,
                is_ready BOOLEAN DEFAULT 0,
                token TEXT,
                dream TEXT,
                dream_cost INTEGER,
                dream_description TEXT,
                position INTEGER DEFAULT 0,
                money INTEGER DEFAULT 5000,
                salary INTEGER DEFAULT 5000,
                total_income INTEGER DEFAULT 0,
                monthly_expenses INTEGER DEFAULT 2000,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(room_id, user_id)
            )`,
            
            // Таблица игровых сессий
            `CREATE TABLE IF NOT EXISTS game_sessions (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                winner_id TEXT,
                total_turns INTEGER DEFAULT 0,
                FOREIGN KEY (room_id) REFERENCES rooms (id),
                FOREIGN KEY (winner_id) REFERENCES users (id)
            )`,
            
            // Индексы для оптимизации
            `CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status)`,
            `CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id)`,
            `CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id)`,
            `CREATE INDEX IF NOT EXISTS idx_room_players_user ON room_players(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
            `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
        ];

        let completed = 0;
        tables.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err) {
                    console.error(`❌ Ошибка создания таблицы ${index + 1}:`, err);
                    reject(err);
                    return;
                }
                
                completed++;
                if (completed === tables.length) {
                    resolve();
                }
            });
        });
    });
}

/**
 * Добавление начальных данных
 */
function seedInitialData() {
    return new Promise((resolve, reject) => {
        // Проверяем, есть ли уже данные
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row.count > 0) {
                console.log('📊 Начальные данные уже существуют, пропускаем...');
                resolve();
                return;
            }
            
            console.log('🌱 Добавляем начальные данные...');
            
            const initialUsers = [
                {
                    id: uuidv4(),
                    username: 'demo_user',
                    email: 'demo@aura-money.com',
                    level: 3,
                    games_played: 15,
                    games_won: 8,
                    rating: 1250
                },
                {
                    id: uuidv4(),
                    username: 'tournament_master',
                    email: 'tournament@aura-money.com',
                    level: 5,
                    games_played: 25,
                    games_won: 18,
                    rating: 1450
                },
                {
                    id: uuidv4(),
                    username: 'public_host',
                    email: 'public@aura-money.com',
                    level: 2,
                    games_played: 8,
                    games_won: 3,
                    rating: 1100
                },
                {
                    id: uuidv4(),
                    username: 'speed_player',
                    email: 'speed@aura-money.com',
                    level: 4,
                    games_played: 20,
                    games_won: 12,
                    rating: 1350
                }
            ];
            
            const initialRooms = [
                {
                    id: uuidv4(),
                    name: 'Демо комната 1',
                    description: 'Комната для демонстрации игры',
                    max_players: 4,
                    current_players: 2,
                    turn_time: 30,
                    assign_professions: 1,
                    creator_id: null // Будет установлен после создания пользователей
                },
                {
                    id: uuidv4(),
                    name: 'Турнирная комната',
                    description: 'Серьезная игра для опытных игроков',
                    max_players: 6,
                    current_players: 3,
                    turn_time: 60,
                    assign_professions: 0,
                    creator_id: null
                },
                {
                    id: uuidv4(),
                    name: 'Публичная комната',
                    description: 'Открытая комната для всех желающих',
                    max_players: 4,
                    current_players: 1,
                    turn_time: 45,
                    assign_professions: 1,
                    creator_id: null
                },
                {
                    id: uuidv4(),
                    name: 'Быстрая игра',
                    description: 'Быстрые ходы, динамичная игра',
                    max_players: 4,
                    current_players: 3,
                    turn_time: 15,
                    assign_professions: 0,
                    creator_id: null
                }
            ];
            
            let userIndex = 0;
            let roomIndex = 0;
            let completed = 0;
            
            // Создаем пользователей
            initialUsers.forEach((user) => {
                db.run(
                    `INSERT INTO users (id, username, email, level, games_played, games_won, rating) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [user.id, user.username, user.email, user.level, user.games_played, user.games_won, user.rating],
                    function(err) {
                        if (err) {
                            console.error('❌ Ошибка создания пользователя:', err);
                            reject(err);
                            return;
                        }
                        
                        completed++;
                        if (completed === initialUsers.length) {
                            // Создаем комнаты
                            createInitialRooms(initialRooms, initialUsers)
                                .then(() => resolve())
                                .catch(reject);
                        }
                    }
                );
            });
        });
    });
}

/**
 * Создание начальных комнат
 */
function createInitialRooms(rooms, users) {
    return new Promise((resolve, reject) => {
        let completed = 0;
        
        rooms.forEach((room, index) => {
            const creatorId = users[index % users.length].id;
            
            db.run(
                `INSERT INTO rooms (id, name, description, max_players, current_players, turn_time, assign_professions, creator_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [room.id, room.name, room.description, room.max_players, room.current_players, room.turn_time, room.assign_professions, creatorId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Добавляем создателя как игрока в комнату
                    db.run(
                        `INSERT INTO room_players (id, room_id, user_id, is_host, is_ready) 
                         VALUES (?, ?, ?, 1, 1)`,
                        [uuidv4(), room.id, creatorId],
                        (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            
                            completed++;
                            if (completed === rooms.length) {
                                resolve();
                            }
                        }
                    );
                }
            );
        });
    });
}

/**
 * Получение экземпляра базы данных
 */
function getDatabase() {
    return db;
}

/**
 * Закрытие соединения с базой данных
 */
function closeDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('❌ Ошибка закрытия базы данных:', err);
                    reject(err);
                } else {
                    console.log('✅ Соединение с базой данных закрыто');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase
};
