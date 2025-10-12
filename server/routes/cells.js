/**
 * API роуты для управления клетками игрового поля
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Путь к файлу конфигурации клеток
const CELLS_CONFIG_PATH = path.join(__dirname, '../../assets/js/modules/game/BoardConfig.js');
const CELLS_BACKUP_DIR = path.join(__dirname, '../../backups/cells');

/**
 * GET /api/cells
 * Получение текущей конфигурации клеток
 */
router.get('/', async (req, res) => {
    try {
        console.log('📡 API: Получение конфигурации клеток');
        
        // Читаем файл BoardConfig.js
        const configContent = await fs.readFile(CELLS_CONFIG_PATH, 'utf-8');
        
        // Извлекаем BIG_CIRCLE и SMALL_CIRCLE из файла
        const bigCircleMatch = configContent.match(/BIG_CIRCLE:\s*(\[[\s\S]*?\]),/);
        const smallCircleMatch = configContent.match(/SMALL_CIRCLE:\s*(\[[\s\S]*?\])/);
        
        if (!bigCircleMatch || !smallCircleMatch) {
            throw new Error('Не удалось извлечь конфигурацию из файла');
        }
        
        // Парсим конфигурацию
        const bigCircle = eval(bigCircleMatch[1]);
        const smallCircle = eval(smallCircleMatch[1]);
        
        res.json({
            success: true,
            data: {
                outerCells: bigCircle,
                innerCells: smallCircle,
                totalCells: bigCircle.length + smallCircle.length
            }
        });
        
        console.log('✅ Конфигурация клеток отправлена');
    } catch (error) {
        console.error('❌ Ошибка получения конфигурации клеток:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения конфигурации клеток',
            error: error.message
        });
    }
});

/**
 * PUT /api/cells
 * Обновление конфигурации клеток
 */
router.put('/', async (req, res) => {
    try {
        console.log('📡 API: Обновление конфигурации клеток');
        
        const { outerCells, innerCells } = req.body;
        
        if (!outerCells || !innerCells) {
            return res.status(400).json({
                success: false,
                message: 'Отсутствуют обязательные поля: outerCells, innerCells'
            });
        }
        
        // Создаем резервную копию перед обновлением
        await createBackup();
        
        // Формируем новый контент файла
        const newConfig = generateConfigFile(outerCells, innerCells);
        
        // Сохраняем файл
        await fs.writeFile(CELLS_CONFIG_PATH, newConfig, 'utf-8');
        
        res.json({
            success: true,
            message: 'Конфигурация клеток успешно обновлена',
            data: {
                outerCells: outerCells.length,
                innerCells: innerCells.length,
                totalCells: outerCells.length + innerCells.length
            }
        });
        
        console.log('✅ Конфигурация клеток обновлена');
    } catch (error) {
        console.error('❌ Ошибка обновления конфигурации клеток:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления конфигурации клеток',
            error: error.message
        });
    }
});

/**
 * POST /api/cells/backup
 * Создание резервной копии конфигурации
 */
router.post('/backup', async (req, res) => {
    try {
        console.log('📡 API: Создание резервной копии');
        
        const backupPath = await createBackup();
        
        res.json({
            success: true,
            message: 'Резервная копия создана',
            data: {
                backupPath: path.basename(backupPath)
            }
        });
        
        console.log('✅ Резервная копия создана');
    } catch (error) {
        console.error('❌ Ошибка создания резервной копии:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания резервной копии',
            error: error.message
        });
    }
});

/**
 * GET /api/cells/backups
 * Получение списка резервных копий
 */
router.get('/backups', async (req, res) => {
    try {
        console.log('📡 API: Получение списка резервных копий');
        
        // Создаем директорию если не существует
        await fs.mkdir(CELLS_BACKUP_DIR, { recursive: true });
        
        // Читаем список файлов
        const files = await fs.readdir(CELLS_BACKUP_DIR);
        const backups = [];
        
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = path.join(CELLS_BACKUP_DIR, file);
                const stats = await fs.stat(filePath);
                backups.push({
                    name: file,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                });
            }
        }
        
        // Сортируем по дате создания (новые первые)
        backups.sort((a, b) => b.created - a.created);
        
        res.json({
            success: true,
            data: backups
        });
        
        console.log(`✅ Найдено ${backups.length} резервных копий`);
    } catch (error) {
        console.error('❌ Ошибка получения резервных копий:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения резервных копий',
            error: error.message
        });
    }
});

/**
 * POST /api/cells/restore
 * Восстановление из резервной копии
 */
router.post('/restore', async (req, res) => {
    try {
        console.log('📡 API: Восстановление из резервной копии');
        
        const { backupName } = req.body;
        
        if (!backupName) {
            return res.status(400).json({
                success: false,
                message: 'Не указано имя резервной копии'
            });
        }
        
        const backupPath = path.join(CELLS_BACKUP_DIR, backupName);
        
        // Проверяем существование файла
        try {
            await fs.access(backupPath);
        } catch {
            return res.status(404).json({
                success: false,
                message: 'Резервная копия не найдена'
            });
        }
        
        // Создаем резервную копию текущего состояния
        await createBackup();
        
        // Копируем резервную копию в основной файл
        await fs.copyFile(backupPath, CELLS_CONFIG_PATH);
        
        res.json({
            success: true,
            message: 'Конфигурация восстановлена из резервной копии'
        });
        
        console.log('✅ Конфигурация восстановлена');
    } catch (error) {
        console.error('❌ Ошибка восстановления:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка восстановления',
            error: error.message
        });
    }
});

/**
 * Создание резервной копии
 */
async function createBackup() {
    try {
        // Создаем директорию если не существует
        await fs.mkdir(CELLS_BACKUP_DIR, { recursive: true });
        
        // Формируем имя файла с датой и временем
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(CELLS_BACKUP_DIR, `BoardConfig-${timestamp}.js`);
        
        // Копируем файл
        await fs.copyFile(CELLS_CONFIG_PATH, backupPath);
        
        console.log(`💾 Резервная копия создана: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('❌ Ошибка создания резервной копии:', error);
        throw error;
    }
}

/**
 * Генерация файла конфигурации
 */
function generateConfigFile(outerCells, innerCells) {
    const template = `/**
 * BoardConfig - Конфигурация игрового поля
 * Автоматически сгенерировано: ${new Date().toISOString()}
 * Не редактируйте вручную - используйте админ-панель
 */

const BoardConfig = {
    // Количество клеток
    BIG_CIRCLE_CELLS: ${outerCells.length},
    SMALL_CIRCLE_CELLS: ${innerCells.length},
    
    // Внешний трек (${outerCells.length} клеток)
    BIG_CIRCLE: ${JSON.stringify(outerCells, null, 4)},
    
    // Внутренний трек (${innerCells.length} клеток)
    SMALL_CIRCLE: ${JSON.stringify(innerCells, null, 4)}
};

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.BoardConfig = BoardConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardConfig;
}`;
    
    return template;
}

module.exports = router;
