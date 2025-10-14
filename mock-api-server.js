/**
 * Mock API Server for Rooms Testing
 * Простой мок-сервер для тестирования функциональности комнат
 */

const http = require('http');
const url = require('url');
const PORT = 3002;

// Моковые данные
let rooms = [
    {
        id: 'room-1',
        name: 'Быстрая игра',
        maxPlayers: 4,
        playerCount: 2,
        status: 'waiting',
        isStarted: false,
        isFull: false,
        creator: 'admin',
        players: [
            { id: 'p1', username: 'admin', isHost: true },
            { id: 'p2', username: 'player1', isHost: false }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: 'room-2',
        name: 'Турнир',
        maxPlayers: 6,
        playerCount: 3,
        status: 'waiting',
        isStarted: false,
        isFull: false,
        creator: 'player2',
        players: [
            { id: 'p3', username: 'player2', isHost: true },
            { id: 'p4', username: 'player3', isHost: false },
            { id: 'p5', username: 'player4', isHost: false }
        ],
        createdAt: new Date().toISOString()
    }
];

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`📡 Mock API: ${method} ${path}`);

    // Статистика
    if (path === '/api/rooms/stats') {
        const stats = {
            totalRooms: rooms.length,
            activeRooms: rooms.filter(r => !r.isStarted).length,
            gamesStarted: rooms.filter(r => r.isStarted).length,
            playersOnline: rooms.reduce((sum, r) => sum + r.playerCount, 0)
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: stats
        }));
        return;
    }

    // Получение списка комнат
    if (path === '/api/rooms' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: rooms,
            count: rooms.length
        }));
        return;
    }

    // Создание комнаты
    if (path === '/api/rooms' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { roomData, creator } = JSON.parse(body);
                
                const newRoom = {
                    id: `room-${Date.now()}`,
                    name: roomData.name,
                    maxPlayers: roomData.maxPlayers,
                    playerCount: 1,
                    status: 'waiting',
                    isStarted: false,
                    isFull: false,
                    creator: creator.username,
                    players: [
                        { 
                            id: creator.id || `p-${Date.now()}`, 
                            username: creator.username, 
                            isHost: true 
                        }
                    ],
                    createdAt: new Date().toISOString(),
                    ...roomData
                };
                
                rooms.push(newRoom);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: newRoom
                }));
                
                console.log(`✅ Mock API: Комната "${newRoom.name}" создана`);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Ошибка создания комнаты: ' + error.message
                }));
            }
        });
        return;
    }

    // Присоединение к комнате
    if (path.startsWith('/api/rooms/') && path.endsWith('/join') && method === 'POST') {
        const roomId = path.split('/')[3];
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { player } = JSON.parse(body);
                const room = rooms.find(r => r.id === roomId);
                
                if (!room) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: 'Комната не найдена'
                    }));
                    return;
                }
                
                if (room.isFull || room.playerCount >= room.maxPlayers) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: 'Комната заполнена'
                    }));
                    return;
                }
                
                const newPlayer = {
                    id: player.userId || `p-${Date.now()}`,
                    username: player.name || player.username,
                    isHost: false
                };
                
                room.players.push(newPlayer);
                room.playerCount++;
                
                if (room.playerCount >= room.maxPlayers) {
                    room.isFull = true;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: room
                }));
                
                console.log(`✅ Mock API: Игрок "${newPlayer.username}" присоединился к комнате "${room.name}"`);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Ошибка присоединения: ' + error.message
                }));
            }
        });
        return;
    }

    // Получение комнаты по ID
    if (path.startsWith('/api/rooms/') && method === 'GET') {
        const roomId = path.split('/')[3];
        const room = rooms.find(r => r.id === roomId);
        
        if (room) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: room
            }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Комната не найдена'
            }));
        }
        return;
    }

    // 404 для всех остальных запросов
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: false,
        message: 'API endpoint not found'
    }));
});

server.listen(PORT, () => {
    console.log(`🚀 Mock API Server running on port ${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   GET  /api/rooms - список комнат`);
    console.log(`   GET  /api/rooms/stats - статистика`);
    console.log(`   POST /api/rooms - создание комнаты`);
    console.log(`   POST /api/rooms/:id/join - присоединение к комнате`);
    console.log(`   GET  /api/rooms/:id - получение комнаты`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Mock API Server...');
    server.close(() => {
        console.log('✅ Mock API Server stopped');
        process.exit(0);
    });
});
