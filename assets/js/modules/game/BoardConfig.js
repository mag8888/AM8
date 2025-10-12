/**
 * BoardConfig v1.0.0
 * Конфигурация игрового поля
 */

// Конфигурация внешних клеток (большой круг - 44 клетки)
window.BIG_CIRCLE_CELLS = [
    // Сторона 1 (0-10): Старт и начало
    { type: 'start', name: 'Старт', icon: '🏁', cost: 0, income: 0 },
    { type: 'money', name: 'Доход', icon: '💰', cost: 0, income: 1000 },
    { type: 'business', name: 'Кофейня', icon: '☕', cost: 100000, income: 3000 },
    { type: 'dream', name: 'Дом мечты', icon: '🏠', cost: 100000, income: 0 },
    { type: 'loss', name: 'Аудит', icon: '📋', cost: -50000, income: 0 },
    { type: 'business', name: 'Спа-центр', icon: '🧘', cost: 270000, income: 5000 },
    { type: 'dream', name: 'Антарктида', icon: '🧊', cost: 150000, income: 0 },
    { type: 'business', name: 'Мобильное приложение', icon: '📱', cost: 420000, income: 10000 },
    { type: 'charity', name: 'Благотворительность', icon: '❤️', cost: 0, income: 0 },
    { type: 'business', name: 'Цифровой маркетинг', icon: '📊', cost: 160000, income: 4000 },
    { type: 'loss', name: 'Кража наличных', icon: '🚫', cost: -100000, income: 0 },

    // Сторона 2 (11-21): Развитие бизнеса
    { type: 'business', name: 'Мини-отель', icon: '🏨', cost: 200000, income: 5000 },
    { type: 'money', name: 'Доход', icon: '💰', cost: 0, income: 1000 },
    { type: 'business', name: 'Франшиза ресторана', icon: '🍽️', cost: 320000, income: 8000 },
    { type: 'dream', name: 'Горные вершины', icon: '🏔️', cost: 500000, income: 0 },
    { type: 'business', name: 'Мини-отель', icon: '🏨', cost: 200000, income: 4000 },
    { type: 'dream', name: 'Книга-бестселлер', icon: '📚', cost: 300000, income: 0 },
    { type: 'business', name: 'Йога-центр', icon: '🧘', cost: 170000, income: 4500 },
    { type: 'loss', name: 'Развод', icon: '💔', cost: -50000, income: 0 },
    { type: 'business', name: 'Автомойки', icon: '🚗', cost: 120000, income: 3000 },
    { type: 'dream', name: 'Яхта в Средиземном море', icon: '⛵', cost: 300000, income: 0 },
    { type: 'business', name: 'Салон красоты', icon: '💄', cost: 500000, income: 15000 },

    // Сторона 3 (22-32): Роскошь и масштаб
    { type: 'dream', name: 'Мировой фестиваль', icon: '🎪', cost: 200000, income: 0 },
    { type: 'money', name: 'Доход', icon: '💰', cost: 0, income: 1000 },
    { type: 'business', name: 'Онлайн-магазин', icon: '🛒', cost: 110000, income: 3000 },
    { type: 'loss', name: 'Пожар', icon: '🔥', cost: -100000, income: 0 },
    { type: 'dream', name: 'Ретрит-центр', icon: '🧘', cost: 500000, income: 0 },
    { type: 'dream', name: 'Фонд талантов', icon: '⭐', cost: 300000, income: 0 },
    { type: 'dream', name: 'Кругосветное плавание', icon: '⛵', cost: 200000, income: 0 },
    { type: 'business', name: 'Эко-ранчо', icon: '🌿', cost: 1000000, income: 20000 },
    { type: 'dream', name: 'Кругосветное плавание', icon: '⛵', cost: 300000, income: 0 },
    { type: 'business', name: 'Биржа', icon: '📈', cost: 50000, income: 500000 },
    { type: 'dream', name: 'Частный самолет', icon: '🛩️', cost: 1000000, income: 0 },

    // Сторона 4 (33-43): Финал игры
    { type: 'business', name: 'NFT-платформа', icon: '🎨', cost: 400000, income: 12000 },
    { type: 'money', name: 'Кругосветное плавание', icon: '⛵', cost: 200000, income: 0 },
    { type: 'business', name: 'Школа языков', icon: '🌍', cost: 20000, income: 3000 },
    { type: 'dream', name: 'Коллекция суперкаров', icon: '🏎️', cost: 1000000, income: 0 },
    { type: 'business', name: 'Школа будущего', icon: '🎓', cost: 300000, income: 10000 },
    { type: 'dream', name: 'Полнометражный фильм', icon: '🎬', cost: 500000, income: 0 },
    { type: 'loss', name: 'Рейдерский захват', icon: '⚔️', cost: -200000, income: 0 },
    { type: 'dream', name: 'Лидер мнений', icon: '🌍', cost: 1000000, income: 0 },
    { type: 'business', name: 'Автомойки', icon: '🚗', cost: 120000, income: 3500 },
    { type: 'dream', name: 'Белоснежная яхта', icon: '🛥️', cost: 300000, income: 0 },
    { type: 'business', name: 'Франшиза "Поток денег"', icon: '💸', cost: 100000, income: 10000 }
];

// Конфигурация внутренних клеток (малый круг - 24 клетки)
window.SMALL_CIRCLE_CELLS = [
    // Секция 1: Старт и быстрые возможности
    { type: 'inner_start', name: 'Быстрый трек - Старт', icon: '⚡', cost: 0, income: 0 },
    { type: 'inner_money', name: 'Быстрый доход', icon: '💰', cost: 0, income: 2000 },
    { type: 'inner_business', name: 'Мини-бизнес', icon: '🏪', cost: 500000, income: 15000 },
    { type: 'inner_dream', name: 'Быстрая мечта', icon: '💭', cost: 2000000, income: 0 },
    { type: 'inner_money', name: 'Пассивный доход', icon: '💰', cost: 0, income: 5000 },
    { type: 'inner_business', name: 'Стартап', icon: '🚀', cost: 800000, income: 20000 },
    
    // Секция 2: Развитие и рост
    { type: 'inner_dream', name: 'Средняя мечта', icon: '⭐', cost: 5000000, income: 0 },
    { type: 'inner_business', name: 'Корпорация', icon: '🏢', cost: 1000000, income: 50000 },
    { type: 'inner_loss', name: 'Кризис', icon: '📉', cost: -500000, income: 0 },
    { type: 'inner_business', name: 'Холдинг', icon: '🏭', cost: 2000000, income: 100000 },
    { type: 'inner_money', name: 'Дивиденды', icon: '💎', cost: 0, income: 25000 },
    { type: 'inner_business', name: 'Конгломерат', icon: '🌐', cost: 5000000, income: 250000 },
    
    // Секция 3: Высший уровень
    { type: 'inner_dream', name: 'Большая мечта', icon: '👑', cost: 10000000, income: 0 },
    { type: 'inner_business', name: 'Международная корпорация', icon: '🌍', cost: 10000000, income: 500000 },
    { type: 'inner_money', name: 'Миллиардный доход', icon: '💸', cost: 0, income: 100000 },
    { type: 'inner_dream', name: 'Империя', icon: '🏰', cost: 50000000, income: 0 },
    { type: 'inner_business', name: 'Глобальный холдинг', icon: '🌐', cost: 20000000, income: 1000000 },
    { type: 'inner_money', name: 'Супердивиденды', icon: '💎', cost: 0, income: 500000 },
    
    // Секция 4: Финал и бонусы
    { type: 'inner_dream', name: 'Легенда', icon: '⭐', cost: 100000000, income: 0 },
    { type: 'inner_business', name: 'Финансовая империя', icon: '👑', cost: 50000000, income: 2500000 },
    { type: 'inner_bonus', name: 'Мегабонус', icon: '🎁', cost: 0, income: 5000000 },
    { type: 'inner_finish', name: 'Финиш', icon: '🏆', cost: 0, income: 0 },
    { type: 'inner_bonus', name: 'Финальный бонус', icon: '🎁', cost: 0, income: 10000000 },
    { type: 'inner_finish', name: 'Победа!', icon: '🏆', cost: 0, income: 0 }
];

// Функции для получения иконок и стилей
window.getIconForType = function(type, cellData) {
    const iconMap = {
        'start': '🏁',
        'money': '💰',
        'business': '💼',
        'dream': '💭',
        'loss': '📉',
        'charity': '❤️',
        'inner_start': '⚡',
        'inner_money': '💰',
        'inner_business': '🏢',
        'inner_dream': '👑',
        'inner_loss': '📉',
        'inner_finish': '🏆',
        'inner_bonus': '🎁'
    };
    return iconMap[type] || cellData.icon || '?';
};

window.getIconStyleClass = function(type, cellData) {
    const styleMap = {
        'start': 'cell-start',
        'money': 'cell-money',
        'business': 'cell-business',
        'dream': 'cell-dream',
        'loss': 'cell-loss',
        'charity': 'cell-charity',
        'inner_start': 'cell-inner-start',
        'inner_money': 'cell-inner-money',
        'inner_business': 'cell-inner-business',
        'inner_dream': 'cell-inner-dream',
        'inner_loss': 'cell-inner-loss',
        'inner_finish': 'cell-inner-finish',
        'inner_bonus': 'cell-inner-bonus'
    };
    return styleMap[type] || 'cell-default';
};

console.log('✅ BoardConfig: Конфигурация игрового поля загружена');
console.log(`📊 BoardConfig: Внешних клеток: ${window.BIG_CIRCLE_CELLS.length}`);
console.log(`📊 BoardConfig: Внутренних клеток: ${window.SMALL_CIRCLE_CELLS.length}`);
