/**
 * Скрипт для инициализации дефолтных карточных колод в MongoDB
 */

const mongoose = require('mongoose');
const { Deck, Card } = require('../models/CardModel');
const DatabaseConfig = require('../auth/server/config/database');

// Дефолтные колоды
const DEFAULT_DECKS = [
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
];

async function initializeCards() {
    try {
        console.log('🃏 Инициализация карточных колод в MongoDB...');
        
        // Подключаемся к MongoDB через существующую конфигурацию
        const dbConfig = new DatabaseConfig();
        await dbConfig.connect();
        console.log('✅ Подключение к MongoDB установлено');
        
        // Проверяем, есть ли уже колоды
        const existingDecks = await Deck.find({});
        if (existingDecks.length > 0) {
            console.log('⚠️ Карточные колоды уже существуют, пропускаем инициализацию');
            return;
        }
        
        // Создаем дефолтные колоды
        const createdDecks = await Promise.all(DEFAULT_DECKS.map(async (deckData) => {
            const deck = new Deck(deckData);
            return await deck.save();
        }));
        
        console.log(`✅ Создано ${createdDecks.length} карточных колод:`, 
            createdDecks.map(d => `${d.name} (${d.id})`).join(', '));
        
    } catch (error) {
        console.error('❌ Ошибка инициализации карточных колод:', error);
        throw error;
    } finally {
        // Не отключаемся от MongoDB, так как сервер продолжает работать
        console.log('✅ Инициализация карточных колод завершена');
    }
}

// Запускаем инициализацию
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
