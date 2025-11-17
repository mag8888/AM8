/**
 * Скрипт для инициализации карточных колод в MongoDB из config/cards.json
 */

const fs = require('fs');
const path = require('path');
const { Deck, Card } = require('../models/CardModel');
const DatabaseConfig = require('../auth/server/config/database');

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../config/cards.json');

const TYPE_BY_DECK = {
    deal: 'deal',
    big_deal: 'big_deal',
    expenses: 'expense',
    market: 'market'
};

function resolveCardsConfigPath() {
    const customPath = process.env.CARDS_CONFIG_PATH;
    if (customPath) {
        return path.isAbsolute(customPath)
            ? customPath
            : path.resolve(process.cwd(), customPath);
    }
    return DEFAULT_CONFIG_PATH;
}

function loadCardsConfig(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Файл конфигурации карточек не найден: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || !Array.isArray(parsed.decks) || parsed.decks.length === 0) {
        throw new Error('Файл конфигурации должен содержать массив decks с карточками.');
    }

    return parsed;
}

function normalizeCard(card, deckId, index) {
    const fallbackId = `${deckId}_${index}_${Date.now()}`;
    return {
        id: card.id || fallbackId,
        title: card.title || card.name || 'Без названия',
        description: card.description || '',
        type: card.type || TYPE_BY_DECK[deckId] || 'deal',
        value: typeof card.value === 'number'
            ? card.value
            : typeof card.amount === 'number'
                ? card.amount
                : 0
    };
}

async function initializeCards() {
    try {
        const configPath = resolveCardsConfigPath();
        console.log(`🃏 Загружаем карточки из ${configPath}`);
        const config = loadCardsConfig(configPath);
        const decksFromConfig = config.decks;

        const dbConfig = new DatabaseConfig();
        await dbConfig.connect();
        console.log('✅ Подключение к MongoDB установлено');

        console.log('🧹 Удаляем существующие колоды и карточки...');
        await Promise.all([Deck.deleteMany({}), Card.deleteMany({})]);

        const createdDecks = [];
        for (const deckData of decksFromConfig) {
            const drawCards = [];
            const discardCards = [];

            (deckData.drawPile || []).forEach((card, index) => {
                drawCards.push(normalizeCard(card, deckData.id, index));
            });
            (deckData.discardPile || []).forEach((card, index) => {
                discardCards.push(normalizeCard(card, deckData.id, index + drawCards.length));
            });

            const savedDrawCards = await Card.insertMany(drawCards);
            const savedDiscardCards = await Card.insertMany(discardCards);

            const deck = new Deck({
                id: deckData.id,
                name: deckData.name || deckData.id,
                drawPile: savedDrawCards.map((card) => card._id),
                discardPile: savedDiscardCards.map((card) => card._id)
            });

            const savedDeck = await deck.save();
            createdDecks.push({
                name: savedDeck.name,
                drawCount: savedDrawCards.length,
                discardCount: savedDiscardCards.length
            });
        }

        console.log('✅ Колоды загружены в MongoDB:');
        createdDecks.forEach((deck) => {
            console.log(` • ${deck.name}: ${deck.drawCount} в колоде / ${deck.discardCount} в отбое`);
        });
    } catch (error) {
        console.error('❌ Ошибка инициализации карточных колод:', error);
        throw error;
    } finally {
        console.log('✅ Инициализация карточных колод завершена');
    }
}

if (require.main === module) {
    initializeCards()
        .then(() => {
            console.log('🎉 Инициализация карточных колод завершена');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Критическая ошибка:', error);
            process.exit(1);
        });
}

module.exports = { initializeCards };
