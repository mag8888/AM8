/**
 * Скрипт для автоматического тестирования сайта
 * Запуск: node test-site.js
 * Или через cron каждые 10 минут: 
 * 0,10,20,30,40,50 * * * * cd /path/to/AM8 && node test-site.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://am8-production.up.railway.app';
const LOG_FILE = path.join(__dirname, 'site-test.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(LOG_FILE, logMessage);
}

function checkUrl(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    ok: res.statusCode >= 200 && res.statusCode < 400,
                    data: data.substring(0, 500) // Первые 500 символов
                });
            });
        });
        req.on('error', (err) => {
            resolve({ status: 0, ok: false, error: err.message });
        });
        req.setTimeout(10000, () => {
            req.destroy();
            resolve({ status: 0, ok: false, error: 'Timeout' });
        });
    });
}

async function testSite() {
    log('🚀 Начинаем тестирование сайта...');

    // 1. Проверка главной страницы
    log('📄 Проверка главной страницы...');
    const mainPage = await checkUrl(SITE_URL);
    if (mainPage.ok) {
        log(`✅ Главная страница доступна (${mainPage.status})`);
    } else {
        log(`❌ Главная страница недоступна (${mainPage.status || mainPage.error})`);
    }

    // 2. Проверка игровой страницы
    log('🎮 Проверка игровой страницы...');
    const gamePage = await checkUrl(`${SITE_URL}/#game`);
    if (gamePage.ok) {
        log(`✅ Игровая страница доступна (${gamePage.status})`);
    } else {
        log(`⚠️ Игровая страница может быть недоступна (${gamePage.status || gamePage.error})`);
    }

    // 3. Проверка API health
    log('🏥 Проверка API health...');
    const apiHealth = await checkUrl(`${SITE_URL}/api/health`);
    if (apiHealth.ok) {
        log(`✅ API health отвечает (${apiHealth.status})`);
    } else {
        log(`⚠️ API health может не отвечать (${apiHealth.status || apiHealth.error})`);
    }

    // 4. Проверка критических ресурсов
    const criticalResources = [
        'assets/js/app.js',
        'assets/css/game-optimized.css',
        'assets/js/modules/GameStateManager.js',
        'assets/js/utils/CommonUtils.js',
        'assets/js/modules/game/PlayerTokens.js'
    ];

    log('📦 Проверка критических ресурсов...');
    for (const resource of criticalResources) {
        const result = await checkUrl(`${SITE_URL}/${resource}`);
        if (result.ok) {
            log(`✅ ${resource} доступен (${result.status})`);
        } else {
            log(`❌ ${resource} недоступен (${result.status || result.error})`);
        }
    }

    // 5. Проверка наличия ключевых элементов в HTML
    log('🔍 Проверка содержимого главной страницы...');
    if (mainPage.data) {
        const hasGamePage = mainPage.data.includes('game-page') || mainPage.data.includes('id="game-page"');
        const hasAppJs = mainPage.data.includes('app.js');
        const hasGameOptimized = mainPage.data.includes('game-optimized.css');

        if (hasGamePage) log('✅ Элемент game-page найден в HTML');
        else log('⚠️ Элемент game-page не найден в HTML');

        if (hasAppJs) log('✅ app.js подключен');
        else log('⚠️ app.js может быть не подключен');

        if (hasGameOptimized) log('✅ game-optimized.css подключен');
        else log('⚠️ game-optimized.css может быть не подключен');
    }

    log('✅ Тестирование завершено');
    log('---');
}

// Запуск тестирования
testSite().catch((error) => {
    log(`❌ Ошибка при тестировании: ${error.message}`);
    process.exit(1);
});

