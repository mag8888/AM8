/**
 * ProfessionSystem v1.0.0
 * Система профессий с детальным расчетом доходов и расходов
 */

class ProfessionSystem {
    constructor(config = {}) {
        this.gameState = config.gameState || null;
        this.eventBus = config.eventBus || null;
        
        // Профессии
        this.professions = {
            entrepreneur: {
                id: 'entrepreneur',
                name: 'Предприниматель',
                title: 'Владелец бизнеса',
                
                // Доходы
                income: {
                    salary: 10000,           // Основная зарплата
                    passive: 0,              // Пассивный доход
                    total: 10000             // Общий доход
                },
                
                // Расходы
                expenses: {
                    taxes: {
                        amount: 1300,        // Налоги 13%
                        percentage: 13,
                        canPayOff: false,    // Нельзя погасить
                        description: 'Налоги (13%)'
                    },
                    other: {
                        amount: 1500,        // Прочие расходы
                        canPayOff: false,    // Нельзя погасить
                        description: 'Прочие расходы'
                    },
                    carLoan: {
                        amount: 700,         // Кредит на авто
                        canPayOff: true,     // Можно погасить
                        payOffAmount: 14000, // Сумма для погашения
                        description: 'Кредит на авто'
                    },
                    educationLoan: {
                        amount: 500,         // Образовательный кредит
                        canPayOff: true,     // Можно погасить
                        payOffAmount: 10000, // Сумма для погашения
                        description: 'Образовательный кредит'
                    },
                    creditCards: {
                        amount: 1000,        // Кредитные карты
                        canPayOff: true,     // Можно погасить
                        payOffAmount: 20000, // Сумма для погашения
                        description: 'Кредитные карты'
                    },
                    mortgage: {
                        amount: 1200,        // Ипотека студия
                        canPayOff: true,     // Можно погасить
                        payOffAmount: 48000, // Сумма для погашения
                        description: 'Ипотека студия'
                    },
                    children: {
                        amount: 0,           // Расходы на детей
                        perChild: 500,       // На одного ребенка
                        maxChildren: 3,      // Максимум детей
                        description: 'Расходы на детей'
                    }
                },
                
                // Итого расходы
                totalExpenses: 6200,
                
                // Дополнительная информация
                description: 'Предприниматель с собственным бизнесом',
                icon: '💼'
            }
        };
        
        console.log('💼 ProfessionSystem: Инициализирован');
    }
    
    /**
     * Получение профессии по ID
     */
    getProfession(professionId) {
        return this.professions[professionId] || null;
    }
    
    /**
     * Получение всех профессий
     */
    getAllProfessions() {
        return Object.values(this.professions);
    }
    
    /**
     * Расчет доходов игрока
     */
    calculateIncome(professionId, playerData = {}) {
        const profession = this.getProfession(professionId);
        if (!profession) return null;
        
        const income = {
            salary: profession.income.salary,
            passive: profession.income.passive,
            total: profession.income.salary + profession.income.passive
        };
        
        // Учитываем дополнительные доходы игрока
        if (playerData.extraIncome) {
            income.passive += playerData.extraIncome;
            income.total += playerData.extraIncome;
        }
        
        return income;
    }
    
    /**
     * Расчет расходов игрока
     */
    calculateExpenses(professionId, playerData = {}) {
        const profession = this.getProfession(professionId);
        if (!profession) return null;
        
        const expenses = {
            taxes: profession.expenses.taxes,
            other: profession.expenses.other,
            carLoan: profession.expenses.carLoan,
            educationLoan: profession.expenses.educationLoan,
            creditCards: profession.expenses.creditCards,
            mortgage: profession.expenses.mortgage,
            children: { ...profession.expenses.children }
        };
        
        // Учитываем количество детей
        if (playerData.children) {
            expenses.children.amount = Math.min(playerData.children, profession.expenses.children.maxChildren) * profession.expenses.children.perChild;
        }
        
        // Учитываем погашенные кредиты
        if (playerData.paidOffLoans) {
            Object.keys(expenses).forEach(key => {
                if (key !== 'taxes' && key !== 'other' && key !== 'children' && playerData.paidOffLoans[key]) {
                    expenses[key].amount = 0;
                }
            });
        }
        
        // Рассчитываем общие расходы
        expenses.total = Object.values(expenses).reduce((sum, expense) => {
            return sum + (typeof expense === 'object' ? expense.amount : 0);
        }, 0);
        
        return expenses;
    }
    
    /**
     * Расчет чистого дохода
     */
    calculateNetIncome(professionId, playerData = {}) {
        const income = this.calculateIncome(professionId, playerData);
        const expenses = this.calculateExpenses(professionId, playerData);
        
        if (!income || !expenses) return null;
        
        return {
            grossIncome: income.total,
            totalExpenses: expenses.total,
            netIncome: income.total - expenses.total
        };
    }
    
    /**
     * Проверка возможности погашения кредита
     */
    canPayOffLoan(professionId, loanType, playerMoney) {
        const profession = this.getProfession(professionId);
        if (!profession) return false;
        
        const loan = profession.expenses[loanType];
        if (!loan || !loan.canPayOff) return false;
        
        return playerMoney >= loan.payOffAmount;
    }
    
    /**
     * Погашение кредита
     */
    payOffLoan(professionId, loanType, playerData = {}) {
        const profession = this.getProfession(professionId);
        if (!profession) return null;
        
        const loan = profession.expenses[loanType];
        if (!loan || !loan.canPayOff) return null;
        
        // Проверяем достаточность средств
        if (playerData.money < loan.payOffAmount) {
            return { success: false, message: 'Недостаточно средств для погашения' };
        }
        
        // Возвращаем информацию о погашении
        return {
            success: true,
            loanType: loanType,
            payOffAmount: loan.payOffAmount,
            monthlySavings: loan.amount,
            newMonthlyExpenses: this.calculateExpenses(professionId, {
                ...playerData,
                paidOffLoans: {
                    ...(playerData.paidOffLoans || {}),
                    [loanType]: true
                }
            }).total
        };
    }
    
    /**
     * Получение информации о детях
     */
    getChildrenInfo(professionId, playerData = {}) {
        const profession = this.getProfession(professionId);
        if (!profession) return null;
        
        const childrenCount = playerData.children || 0;
        const maxChildren = profession.expenses.children.maxChildren;
        
        return {
            current: childrenCount,
            max: maxChildren,
            canHaveMore: childrenCount < maxChildren,
            monthlyExpense: childrenCount * profession.expenses.children.perChild,
            nextChildExpense: (childrenCount + 1) * profession.expenses.children.perChild
        };
    }
    
    /**
     * Добавление ребенка
     */
    addChild(professionId, playerData = {}) {
        const childrenInfo = this.getChildrenInfo(professionId, playerData);
        if (!childrenInfo || !childrenInfo.canHaveMore) {
            return { success: false, message: 'Достигнуто максимальное количество детей' };
        }
        
        const newChildrenCount = playerData.children + 1;
        const newExpenses = this.calculateExpenses(professionId, {
            ...playerData,
            children: newChildrenCount
        });
        
        return {
            success: true,
            newChildrenCount: newChildrenCount,
            additionalMonthlyExpense: childrenInfo.perChild,
            newTotalExpenses: newExpenses.total
        };
    }

    /**
     * Взять кредит (шаг 1000, -100$ ДП на каждую 1000)
     */
    takeLoan(professionId, playerData = {}, amount) {
        const details = this.getProfessionDetails(professionId, playerData);
        if (!details) return { success: false, message: 'Нет профессии' };
        const step = 1000;
        const normalized = Math.max(0, Math.floor((amount || 0) / step) * step);
        const maxLoan = details.loan.maxLoan;
        if (normalized <= 0) return { success: false, message: 'Сумма должна быть кратна 1000' };
        if (normalized > maxLoan) return { success: false, message: 'Превышен лимит кредита' };
        const newLoan = (playerData.currentLoan || 0) + normalized;
        const addedMonthlyExpense = (normalized / 1000) * 100; // 100$ за каждую 1000
        const newExpenses = this.calculateExpenses(professionId, {
            ...playerData,
            currentLoan: newLoan,
            otherMonthlyAdjustments: (playerData.otherMonthlyAdjustments || 0) + addedMonthlyExpense
        });
        const newNet = this.calculateNetIncome(professionId, {
            ...playerData,
            currentLoan: newLoan,
            otherMonthlyAdjustments: (playerData.otherMonthlyAdjustments || 0) + addedMonthlyExpense
        });
        return {
            success: true,
            amount: normalized,
            newLoan,
            newMonthlyExpenses: newExpenses.total,
            newMonthlyNetIncome: newNet.netIncome
        };
    }

    /**
     * Погашение кредита (шаг 1000, +100$ ДП на каждую 1000)
     */
    repayLoan(professionId, playerData = {}, amount) {
        const step = 1000;
        const normalized = Math.max(0, Math.floor((amount || 0) / step) * step);
        const currentLoan = playerData.currentLoan || 0;
        if (normalized <= 0) return { success: false, message: 'Сумма должна быть кратна 1000' };
        if (normalized > currentLoan) return { success: false, message: 'Больше остатка' };
        const newLoan = currentLoan - normalized;
        const decreasedMonthlyExpense = (normalized / 1000) * 100;
        const newExpenses = this.calculateExpenses(professionId, {
            ...playerData,
            currentLoan: newLoan,
            otherMonthlyAdjustments: Math.max(0, (playerData.otherMonthlyAdjustments || 0) - decreasedMonthlyExpense)
        });
        const newNet = this.calculateNetIncome(professionId, {
            ...playerData,
            currentLoan: newLoan,
            otherMonthlyAdjustments: Math.max(0, (playerData.otherMonthlyAdjustments || 0) - decreasedMonthlyExpense)
        });
        return {
            success: true,
            amount: normalized,
            newLoan,
            newMonthlyExpenses: newExpenses.total,
            newMonthlyNetIncome: newNet.netIncome
        };
    }
    
    /**
     * Получение детальной информации о профессии
     */
    getProfessionDetails(professionId, playerData = {}) {
        const profession = this.getProfession(professionId);
        if (!profession) return null;
        
        const income = this.calculateIncome(professionId, playerData);
        const expenses = this.calculateExpenses(professionId, playerData);
        const netIncome = this.calculateNetIncome(professionId, playerData);
        const childrenInfo = this.getChildrenInfo(professionId, playerData);
        
        return {
            profession: profession,
            income: income,
            expenses: expenses,
            netIncome: netIncome,
            // Кредит: вычисляем максимум и текущее
            loan: {
                maxLoan: Math.max(0, Math.floor((netIncome.netIncome) * 10 / 1000) * 1000), // кратно 1000
                monthlyPerThousand: 100,
                currentLoan: playerData.currentLoan || 0
            },
            children: childrenInfo,
            summary: {
                monthlyIncome: income.total,
                monthlyExpenses: expenses.total,
                monthlyNetIncome: netIncome.netIncome,
                payOffOpportunities: Object.keys(expenses).filter(key => 
                    key !== 'taxes' && key !== 'other' && key !== 'children' && expenses[key].amount > 0
                )
            }
        };
    }
    
    /**
     * Форматирование чисел
     */
    formatNumber(num) {
        return new Intl.NumberFormat('ru-RU').format(num);
    }
    
    /**
     * Форматирование процентов
     */
    formatPercentage(num) {
        return `${num}%`;
    }
}

// Экспорт для глобального использования
window.ProfessionSystem = ProfessionSystem;
