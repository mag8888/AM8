/**
 * API роуты для управления карточными колодами
 */

const express = require('express');
const router = express.Router();
const { Deck, Card } = require('../models/CardModel');
const DatabaseConfig = require('../auth/server/config/database');

/**
 * Получает все колоды карточек из MongoDB
 */
async function getCardsConfig() {
    try {
        // Проверяем подключение к MongoDB
        const dbConfig = new DatabaseConfig();
        if (!dbConfig.isConnected) {
            console.log('🔍 Cards API: Подключаемся к MongoDB...');
            await dbConfig.connect();
        }

        const decks = await Deck.find({ isActive: true })
            .populate('drawPile', 'id title description type value')
            .populate('discardPile', 'id title description type value')
            .lean();
        
        console.log('🔍 Cards API: Получены колоды из MongoDB:', {
            decksCount: decks.length,
            decks: decks.map(d => ({ id: d.id, name: d.name, drawCount: d.drawPile.length, discardCount: d.discardPile.length }))
        });
        
        return {
            version: 1,
            updatedAt: new Date().toISOString(),
            decks: decks.map(deck => ({
                id: deck.id,
                name: deck.name,
                drawPile: deck.drawPile || [],
                discardPile: deck.discardPile || []
            }))
        };
    } catch (error) {
        console.error('❌ Cards API: Ошибка получения колод из MongoDB:', error);
        throw error;
    }
}

/**
 * Сохраняет колоды карточек в MongoDB
 */
async function saveCardsConfig(decks) {
    try {
        // Проверяем подключение к MongoDB
        const dbConfig = new DatabaseConfig();
        if (!dbConfig.isConnected) {
            console.log('🔍 Cards API: Подключаемся к MongoDB...');
            await dbConfig.connect();
        }

        console.log('🔍 Cards API: Сохранение колод в MongoDB:', {
            decksCount: decks.length,
            decks: decks.map(d => ({ id: d.id, name: d.name }))
        });
        
        // Удаляем все существующие колоды и карточки
        await Deck.deleteMany({});
        await Card.deleteMany({});
        
        // Создаем новые колоды
        const savedDecks = await Promise.all(decks.map(async (deckData) => {
            // Создаем карточки для drawPile
            const drawCards = await Promise.all(
                (deckData.drawPile || []).map(cardData => 
                    new Card(cardData).save()
                )
            );
            
            // Создаем карточки для discardPile
            const discardCards = await Promise.all(
                (deckData.discardPile || []).map(cardData => 
                    new Card(cardData).save()
                )
            );
            
            // Создаем колоду
            const deck = new Deck({
                id: deckData.id,
                name: deckData.name,
                drawPile: drawCards.map(card => card._id),
                discardPile: discardCards.map(card => card._id)
            });
            
            return await deck.save();
        }));
        
        console.log('✅ Cards API: Колоды сохранены в MongoDB:', {
            savedCount: savedDecks.length
        });
        
        return {
            version: 1,
            updatedAt: new Date().toISOString(),
            decks: savedDecks
        };
    } catch (error) {
        console.error('❌ Cards API: Ошибка сохранения колод в MongoDB:', error);
        throw error;
    }
}

/**
 * Создание резервной копии (пока отключено для MongoDB)
 */
async function createBackup() {
    console.log('⚠️ Cards API: Резервное копирование отключено для MongoDB');
    return null;
}

/**
 * Подсчитывает количество карт в колодах и отбойных стопках
 */
function collectDeckStats(decks = []) {
    return decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        drawCount: Array.isArray(deck.drawPile) ? deck.drawPile.length : 0,
        discardCount: Array.isArray(deck.discardPile) ? deck.discardPile.length : 0
    }));
}

/**
 * GET /api/cards
 * Возвращает конфигурацию карточных колод
 */
router.get('/', async (req, res) => {
    try {
        const config = await getCardsConfig();
        res.json({
            success: true,
            data: {
                ...config,
                stats: collectDeckStats(config.decks)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка чтения конфигурации карт:', error);
        
        // Возвращаем дефолтные колоды если MongoDB недоступна
        const defaultConfig = {
            version: 1,
            updatedAt: new Date().toISOString(),
            decks: [
                {
                    id: 'deal',
                    name: 'Малая сделка',
                    drawPile: [],
                    discardPile: []
                },
                {
                    id: 'big_deal',
                    name: 'Большие сделки',
                    drawPile: [],
                    discardPile: []
                },
                {
                    id: 'expenses',
                    name: 'Расходы',
                    drawPile: [],
                    discardPile: []
                },
                {
                    id: 'market',
                    name: 'Рынок',
                    drawPile: [],
                    discardPile: []
                }
            ]
        };
        
        res.json({
            success: true,
            data: {
                ...defaultConfig,
                stats: collectDeckStats(defaultConfig.decks)
            }
        });
    }
});

/**
 * PUT /api/cards
 * Полностью заменяет конфигурацию карточных колод
 */
router.put('/', async (req, res) => {
    try {
        const { decks, version } = req.body;

        if (!Array.isArray(decks)) {
            return res.status(400).json({
                success: false,
                message: 'Поле decks обязательно и должно быть массивом'
            });
        }

        await createBackup();

        const newConfig = await saveCardsConfig(decks);

        res.json({
            success: true,
            message: 'Конфигурация карточных колод обновлена',
            data: {
                ...newConfig,
                stats: collectDeckStats(newConfig.decks)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка обновления конфигурации карт:', error);
        res.status(500).json({
            success: false,
            message: 'Не удалось обновить карточные колоды',
            error: error.message
        });
    }
});

/**
 * GET /api/cards/backups
 * Возвращает список резервных копий (отключено для MongoDB)
 */
router.get('/backups', async (req, res) => {
    res.json({
        success: true,
        message: 'Резервное копирование отключено для MongoDB',
        data: []
    });
});

/**
 * POST /api/cards/restore
 * Восстанавливает конфигурацию из резервной копии (отключено для MongoDB)
 */
router.post('/restore', async (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Восстановление из резервной копии отключено для MongoDB'
    });
});

module.exports = router;
