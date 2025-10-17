/**
 * API роуты для управления карточными колодами
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const CARDS_CONFIG_PATH = path.join(__dirname, '../../config/cards.json');
const CARDS_BACKUP_DIR = path.join(__dirname, '../../backups/cards');

/**
 * Гарантирует наличие файла конфигурации и возвращает данные
 */
async function readCardsConfig() {
    try {
        const content = await fs.readFile(CARDS_CONFIG_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const defaultConfig = {
                version: 1,
                updatedAt: new Date().toISOString(),
                decks: []
            };
            await writeCardsConfig(defaultConfig, false);
            return defaultConfig;
        }
        throw error;
    }
}

/**
 * Сохраняет конфигурацию карточных колод
 */
async function writeCardsConfig(config, refreshTimestamp = true) {
    const data = {
        ...config,
        updatedAt: refreshTimestamp ? new Date().toISOString() : (config.updatedAt || new Date().toISOString())
    };

    await fs.mkdir(path.dirname(CARDS_CONFIG_PATH), { recursive: true });
    await fs.writeFile(CARDS_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return data;
}

/**
 * Создание резервной копии
 */
async function createBackup() {
    await fs.mkdir(CARDS_BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `cards-${timestamp}.json`;
    const backupPath = path.join(CARDS_BACKUP_DIR, backupName);

    const currentConfig = await readCardsConfig();
    await fs.writeFile(backupPath, JSON.stringify(currentConfig, null, 2), 'utf-8');

    return backupPath;
}

/**
 * Подсчитывает количество карт в колодах и отбойных стопках
 */
function collectDeckStats(decks = []) {
    return decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        subtitle: deck.subtitle || '',
        drawDescription: deck.drawDescription || '',
        discardDescription: deck.discardDescription || '',
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
        const config = await readCardsConfig();
        res.json({
            success: true,
            data: {
                ...config,
                stats: collectDeckStats(config.decks)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка чтения конфигурации карт:', error);
        res.status(500).json({
            success: false,
            message: 'Не удалось загрузить карточные колоды',
            error: error.message
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

        const currentConfig = await readCardsConfig();
        const newConfig = await writeCardsConfig({
            version: version || currentConfig.version || 1,
            decks
        });

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
 * Возвращает список резервных копий
 */
router.get('/backups', async (req, res) => {
    try {
        await fs.mkdir(CARDS_BACKUP_DIR, { recursive: true });
        const files = await fs.readdir(CARDS_BACKUP_DIR);

        const backups = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const filePath = path.join(CARDS_BACKUP_DIR, file);
            const stats = await fs.stat(filePath);
            backups.push({
                name: file,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            });
        }

        backups.sort((a, b) => b.created - a.created);

        res.json({
            success: true,
            data: backups
        });
    } catch (error) {
        console.error('❌ Ошибка получения резервных копий карт:', error);
        res.status(500).json({
            success: false,
            message: 'Не удалось получить список резервных копий',
            error: error.message
        });
    }
});

/**
 * POST /api/cards/restore
 * Восстанавливает конфигурацию из резервной копии
 */
router.post('/restore', async (req, res) => {
    try {
        const { backupName } = req.body;

        if (!backupName) {
            return res.status(400).json({
                success: false,
                message: 'Не указано имя резервной копии'
            });
        }

        const backupPath = path.join(CARDS_BACKUP_DIR, backupName);
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        const backupConfig = JSON.parse(backupContent);

        const savedConfig = await writeCardsConfig(backupConfig);

        res.json({
            success: true,
            message: 'Конфигурация восстановлена из резервной копии',
            data: {
                ...savedConfig,
                stats: collectDeckStats(savedConfig.decks)
            }
        });
    } catch (error) {
        console.error('❌ Ошибка восстановления конфигурации карт:', error);
        res.status(500).json({
            success: false,
            message: 'Не удалось восстановить конфигурацию из резервной копии',
            error: error.message
        });
    }
});

module.exports = router;
