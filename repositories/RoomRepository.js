const { connectMongo, getDbSync } = require('../database/mongo');
const { v4: uuidv4 } = require('uuid');

class RoomRepository {
    async ensureDb() {
        const db = getDbSync();
        if (db) return db;
        const { db: adb } = await connectMongo();
        return adb;
    }

    async list() {
        const db = await this.ensureDb();
        const rooms = await db.collection('rooms')
            .find({ status: { $ne: 'deleted' } })
            .sort({ createdAt: -1 })
            .toArray();
        return rooms;
    }

    async getById(id) {
        const db = await this.ensureDb();
        const room = await db.collection('rooms').findOne({ id });
        return room;
    }

    async create({ name, description = '', maxPlayers = 4, turnTime = 30, assignProfessions = false, creator }) {
        const db = await this.ensureDb();
        const now = new Date().toISOString();
        const roomId = uuidv4();
        const playerId = uuidv4();
        const roomDoc = {
            id: roomId,
            name,
            description,
            maxPlayers,
            playerCount: 1,
            status: 'waiting',
            isStarted: false,
            isFull: false,
            creator,
            creatorId: playerId,
            turnTime,
            assignProfessions,
            minPlayers: 2,
            players: [
                {
                    id: playerId,
                    username: creator,
                    name: creator,
                    isHost: true,
                    isReady: false
                }
            ],
            createdAt: now,
            updatedAt: now
        };
        await db.collection('rooms').insertOne(roomDoc);
        return roomDoc;
    }

    async updatePlayers(id, players) {
        const db = await this.ensureDb();
        await db.collection('rooms').updateOne(
            { id },
            { $set: { players, playerCount: Array.isArray(players) ? players.length : 0, updatedAt: new Date().toISOString() } },
            { upsert: true }
        );
        return this.getById(id);
    }

    async updateStatus(id, patch) {
        try {
            const db = await this.ensureDb();
            console.log('🔄 RoomRepository: Обновление статуса комнаты:', { id, patch });
            
            const result = await db.collection('rooms').updateOne(
                { id },
                { $set: { ...patch, updatedAt: new Date().toISOString() } },
                { upsert: false }
            );
            
            console.log('✅ RoomRepository: Результат обновления:', { 
                matchedCount: result.matchedCount, 
                modifiedCount: result.modifiedCount,
                acknowledged: result.acknowledged 
            });
            
            if (result.matchedCount === 0) {
                console.warn('⚠️ RoomRepository: Комната не найдена для обновления:', id);
                return null;
            }
            
            return this.getById(id);
        } catch (error) {
            console.error('❌ RoomRepository: Ошибка обновления статуса:', error);
            throw error;
        }
    }
}

module.exports = RoomRepository;


