/**
 * Модуль мок-данных для страницы комнат в продакшене
 * Переопределяет RoomService для использования статических данных
 */

// Переопределяем RoomService для продакшна
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log('🏠 Rooms: Применяем временное решение с мок-данными');
    
    // Переопределяем методы RoomService
    const originalRoomService = window.RoomService;
    window.RoomService = class extends originalRoomService {
        constructor(logger, errorHandler) {
            super(logger || null, errorHandler || null);
            this.mockRooms = [
                {
                    id: 'room-demo-1',
                    name: 'Демо комната 1',
                    maxPlayers: 4,
                    playerCount: 2,
                    status: 'waiting',
                    isStarted: false,
                    isFull: false,
                    creator: 'demo_user',
                    players: [
                        { id: 'p1', username: 'demo_user', isHost: true },
                        { id: 'p2', username: 'player1', isHost: false }
                    ],
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'room-demo-2',
                    name: 'Турнирная комната',
                    maxPlayers: 6,
                    playerCount: 3,
                    status: 'waiting',
                    isStarted: false,
                    isFull: false,
                    creator: 'tournament_master',
                    players: [
                        { id: 'p3', username: 'tournament_master', isHost: true },
                        { id: 'p4', username: 'player2', isHost: false },
                        { id: 'p5', username: 'player3', isHost: false }
                    ],
                    createdAt: new Date().toISOString()
                }
            ];
            console.log('🏠 Rooms: Мок-данные инициализированы');
        }
        
        async getAllRooms() {
            console.log('🏠 Rooms: Возвращаем мок-комнаты');
            this.rooms = this.mockRooms;
            return this.mockRooms;
        }
        
        async getStats() {
            console.log('🏠 Rooms: Возвращаем мок-статистику');
            return {
                totalRooms: this.mockRooms.length,
                activeRooms: this.mockRooms.filter(r => !r.isStarted).length,
                gamesStarted: this.mockRooms.filter(r => r.isStarted).length,
                playersOnline: this.mockRooms.reduce((sum, r) => sum + r.playerCount, 0)
            };
        }
    };
}
