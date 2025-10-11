/**
 * Вспомогательные функции для иконок и стилей клеток
 */

/**
 * Получить иконку для типа клетки
 * @param {string} type - Тип клетки
 * @param {Object} cellData - Данные клетки
 * @returns {string} - Иконка emoji
 */
window.getIconForType = function(type, cellData) {
    if (cellData && cellData.icon) {
        return cellData.icon;
    }
    
    const defaultIcons = {
        // Внешний круг
        'money': '💰',
        'business': '🏠',
        'dream': '⭐',
        'loss': '💸',
        'charity': '❤️',
        
        // Внутренний круг
        'green_opportunity': '💚',
        'yellow_payday': '💰',
        'pink_expense': '🛍️',
        'blue_market': '🏪',
        'orange_charity': '❤️',
        'purple_baby': '👶',
        'black_loss': '💸',
        
        // Прочие
        'unknown': '❓'
    };
    
    return defaultIcons[type] || defaultIcons['unknown'];
};

/**
 * Получить CSS класс для стиля иконки
 * @param {string} type - Тип клетки
 * @param {Object} cellData - Данные клетки
 * @returns {string} - CSS класс
 */
window.getIconStyleClass = function(type, cellData) {
    // Дополнительные классы стилей при необходимости
    return '';
};

/**
 * Получить описание клетки для UI
 * @param {Object} cellData - Данные клетки
 * @returns {string} - HTML с описанием
 */
window.getCellDescription = function(cellData) {
    if (!cellData) {
        return '<p>Нет данных о клетке</p>';
    }
    
    let html = `<h4>${cellData.name || 'Без названия'}</h4>`;
    html += `<p class="cell-type">Тип: ${getCellTypeName(cellData.type)}</p>`;
    
    if (cellData.description) {
        html += `<p class="cell-description">${cellData.description}</p>`;
    }
    
    // Бизнес
    if (cellData.income !== undefined) {
        html += `<p class="cell-income">💰 Доход: $${formatNumber(cellData.income)}/мес</p>`;
    }
    
    if (cellData.cost !== undefined && cellData.cost > 0) {
        html += `<p class="cell-cost">💵 Стоимость: $${formatNumber(cellData.cost)}</p>`;
    }
    
    // Специальный доход (Биржа)
    if (cellData.specialIncome) {
        html += `<p class="cell-special">⭐ Спец. доход: $${formatNumber(cellData.specialIncome)}</p>`;
        html += `<p class="cell-condition">🎲 При броске: 5 или 6</p>`;
    }
    
    // Потери
    if (cellData.lossPercent) {
        html += `<p class="cell-loss">⚠️ Потеря: ${cellData.lossPercent}% наличных</p>`;
    }
    
    if (cellData.lossType) {
        const lossText = cellData.lossType === 'min_business' ? 'минимального бизнеса' : 'максимального бизнеса';
        html += `<p class="cell-loss">⚠️ Потеря: ${lossText}</p>`;
    }
    
    // Расходы
    if (cellData.minCost && cellData.maxCost) {
        html += `<p class="cell-expense">💳 Трата: $${formatNumber(cellData.minCost)}-$${formatNumber(cellData.maxCost)}</p>`;
    }
    
    // Ребенок
    if (cellData.monthlyExpenseIncrease) {
        html += `<p class="cell-baby">👶 Увеличение расходов: +$${formatNumber(cellData.monthlyExpenseIncrease)}/мес</p>`;
    }
    
    // Благотворительность (внутренний круг)
    if (cellData.donationPercent) {
        html += `<p class="cell-charity">❤️ Пожертвование: ${cellData.donationPercent}% дохода</p>`;
        html += `<p class="cell-bonus">🎁 Бонус: ${cellData.bonusTurns} специальных хода</p>`;
    }
    
    // Увольнение
    if (cellData.bankruptcy) {
        html += `<p class="cell-warning">⚠️ Риск банкротства!</p>`;
    }
    
    if (cellData.options && cellData.options.length > 0) {
        html += `<div class="cell-options">`;
        html += `<p><strong>Варианты:</strong></p>`;
        cellData.options.forEach((option, idx) => {
            html += `<p class="option-${idx + 1}">${idx + 1}. ${option.name}</p>`;
        });
        html += `</div>`;
    }
    
    return html;
};

/**
 * Получить название типа клетки на русском
 * @param {string} type - Тип клетки
 * @returns {string} - Название на русском
 */
function getCellTypeName(type) {
    const typeNames = {
        // Внешний круг
        'money': 'Доход от инвестиций',
        'business': 'Бизнес',
        'dream': 'Мечта',
        'loss': 'Потеря',
        'charity': 'Благотворительность',
        
        // Внутренний круг
        'green_opportunity': 'Зеленая возможность',
        'yellow_payday': 'PayDay',
        'pink_expense': 'Всякая всячина',
        'blue_market': 'Рынок',
        'orange_charity': 'Благотворительность',
        'purple_baby': 'Ребенок',
        'black_loss': 'Увольнение',
        
        'unknown': 'Неизвестно'
    };
    
    return typeNames[type] || typeNames['unknown'];
}

/**
 * Форматирование числа с разделителями
 * @param {number} num - Число
 * @returns {string} - Отформатированное число
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

console.log('✅ Icon Helpers загружены (обновлено согласно ТЗ)');
