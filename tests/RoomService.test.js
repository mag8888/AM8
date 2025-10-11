/**
 * Тесты для RoomService
 * Проверяет все основные функции сервиса управления комнатами
 */

// Мокаем зависимости
jest.mock('../server/config/database');
jest.mock('../server/models/RoomModel');

const RoomService = require('../server/services/RoomService');

describe('RoomService', () => {
    let roomService;

    // Тестовые данные
    const testCreator = {
        id: 'user123',
        name: 'Test Creator',
        username: 'testcreator',
        avatar: 'https://example.com/avatar.jpg'
    };

    const testRoomData = {
        name: 'Test Room',
        maxPlayers: 4,
        turnTime: 30,
        assignProfessions: false
    };

    const testPlayer = {
        userId: 'player456',
        name: 'Test Player',
        username: 'testplayer',
        avatar: 'https://example.com/player.jpg'
    };

    beforeEach(() => {
        // Очищаем все моки перед каждым тестом
        jest.clearAllMocks();
        
        // Создаем новый экземпляр RoomService
        roomService = new RoomService();
        
        // Очищаем in-memory хранилище
        roomService.rooms.clear();
    });

    describe('createRoom', () => {
        test('создает комнату с правильной структурой', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);

            expect(room).toBeDefined();
            expect(room.id).toBeDefined();
            expect(room.name).toBe(testRoomData.name);
            expect(room.creatorId).toBe(testCreator.id);
            expect(room.creatorName).toBe(testCreator.name);
            expect(room.maxPlayers).toBe(testRoomData.maxPlayers);
            expect(room.minPlayers).toBe(2);
            expect(room.turnTime).toBe(testRoomData.turnTime);
            expect(room.players).toHaveLength(1);
            expect(room.players[0].isHost).toBe(true);
            expect(room.isStarted).toBe(false);
            expect(room.isFinished).toBe(false);
            expect(room.createdAt).toBeInstanceOf(Date);
            expect(room.updatedAt).toBeInstanceOf(Date);
        });

        test('добавляет создателя как хоста', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);

            expect(room.players).toHaveLength(1);
            expect(room.players[0].userId).toBe(testCreator.id);
            expect(room.players[0].name).toBe(testCreator.name);
            expect(room.players[0].isHost).toBe(true);
            expect(room.players[0].isReady).toBe(false);
        });

        test('валидирует maxPlayers (2-8)', async () => {
            const invalidRoomData = { ...testRoomData, maxPlayers: 1 };
            
            await expect(roomService.createRoom(invalidRoomData, testCreator))
                .rejects.toThrow('Max players must be between 2 and 8');

            const invalidRoomData2 = { ...testRoomData, maxPlayers: 10 };
            
            await expect(roomService.createRoom(invalidRoomData2, testCreator))
                .rejects.toThrow('Max players must be between 2 and 8');
        });

        test('валидирует turnTime (10-120 секунд)', async () => {
            const invalidRoomData = { ...testRoomData, turnTime: 5 };
            
            await expect(roomService.createRoom(invalidRoomData, testCreator))
                .rejects.toThrow('Turn time must be between 10 and 120 seconds');

            const invalidRoomData2 = { ...testRoomData, turnTime: 150 };
            
            await expect(roomService.createRoom(invalidRoomData2, testCreator))
                .rejects.toThrow('Turn time must be between 10 and 120 seconds');
        });

        test('валидирует название комнаты', async () => {
            const invalidRoomData = { ...testRoomData, name: '' };
            
            await expect(roomService.createRoom(invalidRoomData, testCreator))
                .rejects.toThrow('Room name is required');
        });

        test('валидирует ID создателя', async () => {
            const invalidCreator = { ...testCreator, id: null };
            
            await expect(roomService.createRoom(testRoomData, invalidCreator))
                .rejects.toThrow('Creator ID is required');
        });
    });

    describe('getAllRooms', () => {
        test('возвращает массив комнат', async () => {
            await roomService.createRoom(testRoomData, testCreator);
            
            const rooms = roomService.getAllRooms();
            
            expect(Array.isArray(rooms)).toBe(true);
            expect(rooms).toHaveLength(1);
            expect(rooms[0].name).toBe(testRoomData.name);
        });

        test('возвращает пустой массив если нет комнат', () => {
            const rooms = roomService.getAllRooms();
            
            expect(Array.isArray(rooms)).toBe(true);
            expect(rooms).toHaveLength(0);
        });

        test('сортирует комнаты по дате создания (новые сначала)', async () => {
            const room1 = await roomService.createRoom(
                { ...testRoomData, name: 'Room 1' }, 
                testCreator
            );
            
            // Небольшая задержка для разных временных меток
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const room2 = await roomService.createRoom(
                { ...testRoomData, name: 'Room 2' }, 
                { ...testCreator, id: 'user456' }
            );
            
            const rooms = roomService.getAllRooms();
            
            expect(rooms).toHaveLength(2);
            expect(rooms[0].name).toBe('Room 2');
            expect(rooms[1].name).toBe('Room 1');
        });
    });

    describe('getRoomById', () => {
        test('возвращает комнату или null', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);
            
            const foundRoom = roomService.getRoomById(room.id);
            expect(foundRoom).toBeDefined();
            expect(foundRoom.id).toBe(room.id);
            
            const notFoundRoom = roomService.getRoomById('nonexistent-id');
            expect(notFoundRoom).toBeNull();
        });

        test('добавляет вычисляемые поля', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);
            
            const foundRoom = roomService.getRoomById(room.id);
            
            expect(foundRoom.playerCount).toBe(1);
            expect(foundRoom.readyCount).toBe(0);
            expect(foundRoom.canStart).toBe(false);
            expect(foundRoom.isFull).toBe(false);
        });
    });

    describe('getRoomByName', () => {
        test('возвращает комнату по имени', async () => {
            await roomService.createRoom(testRoomData, testCreator);
            
            const foundRoom = roomService.getRoomByName(testRoomData.name);
            expect(foundRoom).toBeDefined();
            expect(foundRoom.name).toBe(testRoomData.name);
            
            const notFoundRoom = roomService.getRoomByName('nonexistent-name');
            expect(notFoundRoom).toBeNull();
        });
    });

    describe('joinRoom', () => {
        let room;

        beforeEach(async () => {
            room = await roomService.createRoom(testRoomData, testCreator);
        });

        test('добавляет игрока в комнату', async () => {
            const updatedRoom = await roomService.joinRoom(room.id, testPlayer);
            
            expect(updatedRoom.players).toHaveLength(2);
            expect(updatedRoom.players[1].userId).toBe(testPlayer.userId);
            expect(updatedRoom.players[1].name).toBe(testPlayer.name);
            expect(updatedRoom.players[1].isHost).toBe(false);
        });

        test('проверяет заполненность комнаты', async () => {
            const smallRoom = await roomService.createRoom(
                { ...testRoomData, name: 'Small Room', maxPlayers: 2 }, 
                testCreator
            );
            
            // Добавляем первого игрока
            await roomService.joinRoom(smallRoom.id, testPlayer);
            
            // Пытаемся добавить второго игрока (комната заполнена)
            const anotherPlayer = { ...testPlayer, userId: 'player789', name: 'Another Player' };
            
            await expect(roomService.joinRoom(smallRoom.id, anotherPlayer))
                .rejects.toThrow('Room is full');
        });

        test('предотвращает дубликаты игроков', async () => {
            await roomService.joinRoom(room.id, testPlayer);
            
            await expect(roomService.joinRoom(room.id, testPlayer))
                .rejects.toThrow('Player already in room');
        });

        test('валидирует данные игрока', async () => {
            const invalidPlayer = { ...testPlayer, userId: null };
            
            await expect(roomService.joinRoom(room.id, invalidPlayer))
                .rejects.toThrow('Player user ID is required');
        });

        test('проверяет существование комнаты', async () => {
            await expect(roomService.joinRoom('nonexistent-id', testPlayer))
                .rejects.toThrow('Room not found');
        });
    });

    describe('startGame', () => {
        let room;

        beforeEach(async () => {
            room = await roomService.createRoom(testRoomData, testCreator);
        });

        test('инициализирует gameState', async () => {
            const updatedRoom = await roomService.startGame(room.id, testCreator.id);
            
            expect(updatedRoom.gameState).toBeDefined();
            expect(updatedRoom.gameState.activePlayerIndex).toBe(0);
            expect(updatedRoom.gameState.hasRolledThisTurn).toBe(false);
            expect(updatedRoom.gameState.currentPhase).toBe('waiting');
            expect(updatedRoom.gameState.turnStartTime).toBeDefined();
            expect(updatedRoom.gameState.gameStartTime).toBeDefined();
            expect(updatedRoom.isStarted).toBe(true);
        });

        test('проверяет права хоста', async () => {
            await expect(roomService.startGame(room.id, 'not-host-id'))
                .rejects.toThrow('Only host can start the game');
        });

        test('требует минимум игроков', async () => {
            await expect(roomService.startGame(room.id, testCreator.id))
                .rejects.toThrow('Need at least 2 players to start');
        });

        test('проверяет что игра не начата', async () => {
            // Добавляем второго игрока
            await roomService.joinRoom(room.id, testPlayer);
            
            // Запускаем игру
            await roomService.startGame(room.id, testCreator.id);
            
            // Пытаемся запустить снова
            await expect(roomService.startGame(room.id, testCreator.id))
                .rejects.toThrow('Game already started');
        });

        test('проверяет существование комнаты', async () => {
            await expect(roomService.startGame('nonexistent-id', testCreator.id))
                .rejects.toThrow('Room not found');
        });
    });

    describe('updateRoom', () => {
        let room;

        beforeEach(async () => {
            room = await roomService.createRoom(testRoomData, testCreator);
        });

        test('обновляет поля комнаты', async () => {
            const updates = {
                turnTime: 60,
                assignProfessions: true
            };
            
            const updatedRoom = await roomService.updateRoom(room.id, updates);
            
            expect(updatedRoom.turnTime).toBe(60);
            expect(updatedRoom.assignProfessions).toBe(true);
            expect(updatedRoom.updatedAt).not.toEqual(room.updatedAt);
        });

        test('проверяет существование комнаты', async () => {
            await expect(roomService.updateRoom('nonexistent-id', {}))
                .rejects.toThrow('Room not found');
        });
    });

    describe('deleteRoom', () => {
        test('удаляет комнату', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);
            
            const result = await roomService.deleteRoom(room.id);
            
            expect(result).toBe(true);
            expect(roomService.getRoomById(room.id)).toBeNull();
        });

        test('возвращает false если комната не найдена', async () => {
            const result = await roomService.deleteRoom('nonexistent-id');
            
            expect(result).toBe(false);
        });
    });

    describe('cleanupOldRooms', () => {
        test('удаляет старые неактивные комнаты', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);
            
            // Меняем время создания на старую дату
            room.createdAt = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10 часов назад
            roomService.rooms.set(room.id, room);
            
            const deletedCount = await roomService.cleanupOldRooms();
            
            expect(deletedCount).toBe(1);
            expect(roomService.getRoomById(room.id)).toBeNull();
        });

        test('не удаляет начатые игры', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);
            
            // Меняем время создания на старую дату и помечаем как начатую
            room.createdAt = new Date(Date.now() - 10 * 60 * 60 * 1000);
            room.isStarted = true;
            roomService.rooms.set(room.id, room);
            
            const deletedCount = await roomService.cleanupOldRooms();
            
            expect(deletedCount).toBe(0);
            expect(roomService.getRoomById(room.id)).toBeDefined();
        });
    });

    describe('sanitizeRoom', () => {
        test('добавляет вычисляемые поля', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);
            
            const sanitized = roomService.sanitizeRoom(room);
            
            expect(sanitized.playerCount).toBe(1);
            expect(sanitized.readyCount).toBe(0);
            expect(sanitized.canStart).toBe(false);
            expect(sanitized.isFull).toBe(false);
        });

        test('удаляет служебные поля', async () => {
            const room = await roomService.createRoom(testRoomData, testCreator);
            room._id = 'some-mongo-id';
            room.__v = 0;
            
            const sanitized = roomService.sanitizeRoom(room);
            
            expect(sanitized._id).toBeUndefined();
            expect(sanitized.__v).toBeUndefined();
        });
    });

    describe('generateRoomId', () => {
        test('генерирует уникальные ID', () => {
            const id1 = roomService.generateRoomId();
            const id2 = roomService.generateRoomId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe('string');
            expect(typeof id2).toBe('string');
        });
    });

    describe('validateRoomData', () => {
        test('валидирует корректные данные', () => {
            expect(() => roomService.validateRoomData(testRoomData)).not.toThrow();
        });

        test('валидирует некорректные данные', () => {
            expect(() => roomService.validateRoomData({})).toThrow('Room name is required');
            expect(() => roomService.validateRoomData({ name: '' })).toThrow('Room name is required');
        });
    });

    describe('validateCreator', () => {
        test('валидирует корректного создателя', () => {
            expect(() => roomService.validateCreator(testCreator)).not.toThrow();
        });

        test('валидирует некорректного создателя', () => {
            expect(() => roomService.validateCreator({})).toThrow('Creator ID is required');
            expect(() => roomService.validateCreator({ id: null })).toThrow('Creator ID is required');
        });
    });

    describe('validatePlayer', () => {
        test('валидирует корректного игрока', () => {
            expect(() => roomService.validatePlayer(testPlayer)).not.toThrow();
        });

        test('валидирует некорректного игрока', () => {
            expect(() => roomService.validatePlayer({})).toThrow('Player user ID is required');
            expect(() => roomService.validatePlayer({ userId: null })).toThrow('Player user ID is required');
        });
    });
});

// Интеграционные тесты
describe('RoomService Integration', () => {
    let roomService;

    beforeEach(() => {
        jest.clearAllMocks();
        roomService = new RoomService();
        roomService.rooms.clear();
    });

    test('полный цикл жизни комнаты', async () => {
        // 1. Создание комнаты
        const room = await roomService.createRoom(testRoomData, testCreator);
        expect(room.players).toHaveLength(1);
        
        // 2. Присоединение игроков
        const player1 = { ...testPlayer, userId: 'player1', name: 'Player 1' };
        const player2 = { ...testPlayer, userId: 'player2', name: 'Player 2' };
        
        await roomService.joinRoom(room.id, player1);
        await roomService.joinRoom(room.id, player2);
        
        const updatedRoom = roomService.getRoomById(room.id);
        expect(updatedRoom.players).toHaveLength(3);
        expect(updatedRoom.canStart).toBe(true);
        
        // 3. Запуск игры
        const startedRoom = await roomService.startGame(room.id, testCreator.id);
        expect(startedRoom.isStarted).toBe(true);
        expect(startedRoom.gameState).toBeDefined();
        
        // 4. Обновление комнаты
        const finalRoom = await roomService.updateRoom(room.id, { 
            gameState: { ...startedRoom.gameState, currentPhase: 'playing' } 
        });
        expect(finalRoom.gameState.currentPhase).toBe('playing');
        
        // 5. Удаление комнаты
        const deleted = await roomService.deleteRoom(room.id);
        expect(deleted).toBe(true);
        expect(roomService.getRoomById(room.id)).toBeNull();
    });
});
