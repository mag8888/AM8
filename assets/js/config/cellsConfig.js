/**
 * Конфигурация клеток игровой доски
 * Основано на классической игре Cashflow Роберта Кийосаки
 */

// Конфигурация клеток внешнего круга (44 клетки) - точно как в Cashflow
window.BIG_CIRCLE_CELLS = [
    // 1-10
    { id: 1, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    { id: 2, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 3, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 4, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    { id: 5, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 6, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 7, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 8, type: 'charity', name: 'Благотворительность', icon: '❤️' },
    { id: 9, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 10, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    
    // 11-20
    { id: 11, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 12, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    { id: 13, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 14, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 15, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 16, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 17, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 18, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    { id: 19, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 20, type: 'dream', name: 'Мечта', icon: '⭐' },
    
    // 21-30
    { id: 21, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 22, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 23, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    { id: 24, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 25, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    { id: 26, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 27, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 28, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 29, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 30, type: 'dream', name: 'Мечта', icon: '⭐' },
    
    // 31-40
    { id: 31, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 32, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 33, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 34, type: 'money', name: 'Доход от инвестиций', icon: '💰' },
    { id: 35, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 36, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 37, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 38, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 39, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 40, type: 'dream', name: 'Мечта', icon: '⭐' },
    
    // 41-44
    { id: 41, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 42, type: 'dream', name: 'Мечта', icon: '⭐' },
    { id: 43, type: 'business', name: 'Бизнес', icon: '🏠' },
    { id: 44, type: 'dream', name: 'Мечта', icon: '⭐' }
];

// Конфигурация клеток внутреннего круга (24 клетки) - точно как в Cashflow
window.SMALL_CIRCLE_CELLS = [
    // 1-12 (левый верх)
    { id: 1, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 2, type: 'pink_expense', name: 'Всякая всячина', icon: '🛍️' },
    { id: 3, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 4, type: 'pink_expense', name: 'Всякая всячина', icon: '🛍️' },
    { id: 5, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 6, type: 'yellow_payday', name: 'PayDay', icon: '💰' },
    { id: 7, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 8, type: 'orange_charity', name: 'Благотворительность', icon: '❤️' },
    { id: 9, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 10, type: 'pink_expense', name: 'Всякая всячина', icon: '🛍️' },
    { id: 11, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 12, type: 'yellow_payday', name: 'PayDay', icon: '💰' },
    
    // 13-24 (правый верх)
    { id: 13, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 14, type: 'yellow_payday', name: 'PayDay', icon: '💰' },
    { id: 15, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 16, type: 'pink_expense', name: 'Всякая всячина', icon: '🛍️' },
    { id: 17, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 18, type: 'pink_expense', name: 'Всякая всячина', icon: '🛍️' },
    { id: 19, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 20, type: 'yellow_payday', name: 'PayDay', icon: '💰' },
    { id: 21, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 22, type: 'purple_baby', name: 'Ребенок', icon: '👶' },
    { id: 23, type: 'green_opportunity', name: 'Зеленая возможность', icon: '💚' },
    { id: 24, type: 'black_loss', name: 'Увольнение', icon: '💸' }
];

console.log('✅ Конфигурация клеток загружена (Cashflow стиль)');
console.log(`📊 Внешний круг: ${window.BIG_CIRCLE_CELLS.length} клеток`);
console.log(`📊 Внутренний круг: ${window.SMALL_CIRCLE_CELLS.length} клеток`);