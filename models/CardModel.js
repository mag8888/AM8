/**
 * CardModel - Модель карточных колод для MongoDB
 * Версия: 1.0.0
 * Дата: 17 октября 2025
 */

const mongoose = require('mongoose');

// Схема карточки
const cardSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    type: {
        type: String,
        required: true,
        enum: ['deal', 'big_deal', 'expense', 'market'],
        trim: true
    },
    value: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Схема колоды карточек
const deckSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    drawPile: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
    }],
    discardPile: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Обновляем updatedAt перед сохранением
cardSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

deckSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Создаем модели
const Card = mongoose.model('Card', cardSchema);
const Deck = mongoose.model('Deck', deckSchema);

module.exports = {
    Card,
    Deck,
    cardSchema,
    deckSchema
};
