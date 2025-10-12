/**
 * Модуль профессий - управление профессиями игроков
 * Версия: 1.0.0
 * Статус: Реализовано
 */

class ProfessionModule {
    constructor() {
        this.professions = new Map();
        this.isInitialized = false;
        this.loadProfessions();
    }

    /**
     * Загрузка профессий из конфигурации
     */
    loadProfessions() {
        // Предприниматель
        this.professions.set('entrepreneur', {
            id: 'entrepreneur',
            name: 'Предприниматель',
            type: 'business_owner',
            description: 'Владелец собственного бизнеса',
            
            // Доходы
            income: {
                salary: 10000,
                passiveIncome: 0,
                totalIncome: 10000
            },
            
            // Расходы (обязательные)
            expenses: {
                taxes: {
                    amount: 1300,
                    percentage: 13,
                    description: 'Налоги',
                    canPayOff: false,
                    payOffAmount: 0
                },
                otherExpenses: {
                    amount: 1500,
                    description: 'Прочие расходы',
                    canPayOff: false,
                    payOffAmount: 0
                },
                carLoan: {
                    amount: 700,
                    description: 'Кредит на авто',
                    canPayOff: true,
                    payOffAmount: 14000
                },
                educationLoan: {
                    amount: 500,
                    description: 'Образовательный кредит',
                    canPayOff: true,
                    payOffAmount: 10000
                },
                creditCards: {
                    amount: 1000,
                    description: 'Кредитные карты',
                    canPayOff: true,
                    payOffAmount: 20000
                },
                mortgage: {
                    amount: 1200,
                    description: 'Ипотека студия',
                    canPayOff: true,
                    payOffAmount: 48000
                },
                childrenExpenses: {
                    amount: 0,
                    description: 'Расходы на ребенка',
                    perChild: 500,
                    maxChildren: 3,
                    canPayOff: false,
                    payOffAmount: 0
                }
            },
            
            // Расчетные поля
            totalExpenses: 6200,
            netIncome: 3800,
            
            // Метаданные
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        });

        // Владелец бизнеса
        this.professions.set('business_owner', {
            id: 'business_owner',
            name: 'Владелец бизнеса',
            type: 'business_owner',
            description: 'Крупный владелец бизнеса',
            
            // Доходы
            income: {
                salary: 15000,
                passiveIncome: 3000,
                totalIncome: 18000
            },
            
            // Расходы (обязательные)
            expenses: {
                taxes: {
                    amount: 1950,
                    percentage: 13,
                    description: 'Налоги',
                    canPayOff: false,
                    payOffAmount: 0
                },
                otherExpenses: {
                    amount: 2500,
                    description: 'Прочие расходы',
                    canPayOff: false,
                    payOffAmount: 0
                },
                carLoan: {
                    amount: 1200,
                    description: 'Кредит на авто',
                    canPayOff: true,
                    payOffAmount: 25000
                },
                educationLoan: {
                    amount: 800,
                    description: 'Образовательный кредит',
                    canPayOff: true,
                    payOffAmount: 15000
                },
                creditCards: {
                    amount: 1500,
                    description: 'Кредитные карты',
                    canPayOff: true,
                    payOffAmount: 30000
                },
                mortgage: {
                    amount: 2000,
                    description: 'Ипотека дом',
                    canPayOff: true,
                    payOffAmount: 80000
                },
                childrenExpenses: {
                    amount: 0,
                    description: 'Расходы на ребенка',
                    perChild: 800,
                    maxChildren: 3,
                    canPayOff: false,
                    payOffAmount: 0
                }
            },
            
            // Расчетные поля
            totalExpenses: 9950,
            netIncome: 8050,
            
            // Метаданные
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        });

        this.isInitialized = true;
        console.log('✅ ProfessionModule: Профессии загружены');
    }

    /**
     * Получить профессию по ID
     * @param {string} professionId 
     * @returns {Object|null}
     */
    getProfession(professionId) {
        return this.professions.get(professionId) || null;
    }

    /**
     * Получить все профессии
     * @returns {Array}
     */
    getAllProfessions() {
        return Array.from(this.professions.values());
    }

    /**
     * Получить активные профессии
     * @returns {Array}
     */
    getActiveProfessions() {
        return this.getAllProfessions().filter(prof => prof.isActive);
    }

    /**
     * Создать новую профессию
     * @param {Object} professionData 
     * @returns {Object}
     */
    createProfession(professionData) {
        const profession = {
            id: professionData.id || `prof_${Date.now()}`,
            name: professionData.name || 'Новая профессия',
            type: professionData.type || 'employee',
            description: professionData.description || '',
            income: professionData.income || { salary: 0, passiveIncome: 0, totalIncome: 0 },
            expenses: professionData.expenses || {},
            totalExpenses: professionData.totalExpenses || 0,
            netIncome: professionData.netIncome || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };

        // Пересчитываем общие показатели
        this.calculateProfessionTotals(profession);

        this.professions.set(profession.id, profession);
        console.log('✅ ProfessionModule: Профессия создана:', profession.name);
        
        return profession;
    }

    /**
     * Обновить профессию
     * @param {string} professionId 
     * @param {Object} updates 
     * @returns {Object|null}
     */
    updateProfession(professionId, updates) {
        const profession = this.professions.get(professionId);
        if (!profession) {
            console.error('❌ ProfessionModule: Профессия не найдена:', professionId);
            return null;
        }

        // Обновляем поля
        Object.assign(profession, updates);
        profession.updatedAt = new Date().toISOString();

        // Пересчитываем общие показатели
        this.calculateProfessionTotals(profession);

        this.professions.set(professionId, profession);
        console.log('✅ ProfessionModule: Профессия обновлена:', profession.name);
        
        return profession;
    }

    /**
     * Удалить профессию
     * @param {string} professionId 
     * @returns {boolean}
     */
    deleteProfession(professionId) {
        const deleted = this.professions.delete(professionId);
        if (deleted) {
            console.log('✅ ProfessionModule: Профессия удалена:', professionId);
        } else {
            console.error('❌ ProfessionModule: Профессия не найдена для удаления:', professionId);
        }
        return deleted;
    }

    /**
     * Пересчитать общие показатели профессии
     * @param {Object} profession 
     */
    calculateProfessionTotals(profession) {
        // Пересчитываем общий доход
        profession.income.totalIncome = profession.income.salary + profession.income.passiveIncome;

        // Пересчитываем общие расходы
        let totalExpenses = 0;
        Object.values(profession.expenses).forEach(expense => {
            if (typeof expense === 'object' && expense.amount) {
                totalExpenses += expense.amount;
            }
        });
        profession.totalExpenses = totalExpenses;

        // Пересчитываем чистый доход
        profession.netIncome = profession.income.totalIncome - profession.totalExpenses;
    }

    /**
     * Применить профессию к игроку
     * @param {Object} player 
     * @param {string} professionId 
     * @returns {Object}
     */
    applyProfessionToPlayer(player, professionId) {
        const profession = this.getProfession(professionId);
        if (!profession) {
            console.error('❌ ProfessionModule: Профессия не найдена:', professionId);
            return player;
        }

        const updatedPlayer = {
            ...player,
            profession: profession,
            salary: profession.income.salary,
            monthlyExpenses: profession.totalExpenses,
            money: player.money || 0,
            assets: player.assets || [],
            debts: this.calculatePlayerDebts(profession)
        };

        console.log('✅ ProfessionModule: Профессия применена к игроку:', player.username, profession.name);
        return updatedPlayer;
    }

    /**
     * Рассчитать долги игрока на основе профессии
     * @param {Object} profession 
     * @returns {Array}
     */
    calculatePlayerDebts(profession) {
        const debts = [];
        
        Object.entries(profession.expenses).forEach(([key, expense]) => {
            if (expense.canPayOff && expense.payOffAmount > 0) {
                debts.push({
                    id: key,
                    name: expense.description,
                    monthlyPayment: expense.amount,
                    totalDebt: expense.payOffAmount,
                    canPayOff: true,
                    remainingDebt: expense.payOffAmount
                });
            }
        });

        return debts;
    }

    /**
     * Погасить долг игрока
     * @param {Object} player 
     * @param {string} debtId 
     * @param {number} amount 
     * @returns {Object}
     */
    payOffDebt(player, debtId, amount) {
        if (!player.profession) {
            console.error('❌ ProfessionModule: У игрока нет профессии');
            return player;
        }

        const profession = player.profession;
        const expense = profession.expenses[debtId];
        
        if (!expense || !expense.canPayOff) {
            console.error('❌ ProfessionModule: Долг нельзя погасить:', debtId);
            return player;
        }

        if (amount >= expense.payOffAmount) {
            // Полное погашение
            expense.amount = 0;
            expense.payOffAmount = 0;
            console.log('✅ ProfessionModule: Долг полностью погашен:', debtId);
        } else {
            // Частичное погашение
            const reductionRatio = amount / expense.payOffAmount;
            expense.amount = Math.round(expense.amount * (1 - reductionRatio));
            expense.payOffAmount -= amount;
            console.log('✅ ProfessionModule: Долг частично погашен:', debtId, amount);
        }

        // Пересчитываем показатели профессии
        this.calculateProfessionTotals(profession);
        
        // Обновляем игрока
        const updatedPlayer = {
            ...player,
            profession: profession,
            monthlyExpenses: profession.totalExpenses,
            money: player.money - amount
        };

        return updatedPlayer;
    }

    /**
     * Добавить ребенка (увеличить расходы)
     * @param {Object} player 
     * @returns {Object}
     */
    addChild(player) {
        if (!player.profession) {
            console.error('❌ ProfessionModule: У игрока нет профессии');
            return player;
        }

        const profession = player.profession;
        const childrenExpense = profession.expenses.childrenExpenses;
        
        if (!childrenExpense) {
            console.error('❌ ProfessionModule: Расходы на детей не настроены');
            return player;
        }

        const currentChildren = Math.floor(childrenExpense.amount / childrenExpense.perChild);
        if (currentChildren >= childrenExpense.maxChildren) {
            console.warn('⚠️ ProfessionModule: Достигнуто максимальное количество детей');
            return player;
        }

        // Увеличиваем расходы на ребенка
        childrenExpense.amount += childrenExpense.perChild;
        
        // Пересчитываем показатели профессии
        this.calculateProfessionTotals(profession);
        
        // Обновляем игрока
        const updatedPlayer = {
            ...player,
            profession: profession,
            monthlyExpenses: profession.totalExpenses
        };

        console.log('✅ ProfessionModule: Добавлен ребенок, расходы увеличены на:', childrenExpense.perChild);
        return updatedPlayer;
    }

    /**
     * Экспорт профессий в JSON
     * @returns {string}
     */
    exportProfessions() {
        const data = {
            professions: Array.from(this.professions.values()),
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * Импорт профессий из JSON
     * @param {string} jsonData 
     * @returns {boolean}
     */
    importProfessions(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (!data.professions || !Array.isArray(data.professions)) {
                throw new Error('Неверный формат данных');
            }

            // Очищаем текущие профессии
            this.professions.clear();

            // Загружаем новые
            data.professions.forEach(profession => {
                this.professions.set(profession.id, profession);
            });

            console.log('✅ ProfessionModule: Профессии импортированы:', data.professions.length);
            return true;
        } catch (error) {
            console.error('❌ ProfessionModule: Ошибка импорта:', error);
            return false;
        }
    }

    /**
     * Получить статистику профессий
     * @returns {Object}
     */
    getStatistics() {
        const professions = this.getAllProfessions();
        const activeProfessions = this.getActiveProfessions();

        return {
            total: professions.length,
            active: activeProfessions.length,
            inactive: professions.length - activeProfessions.length,
            averageSalary: activeProfessions.reduce((sum, p) => sum + p.income.salary, 0) / activeProfessions.length || 0,
            averageExpenses: activeProfessions.reduce((sum, p) => sum + p.totalExpenses, 0) / activeProfessions.length || 0,
            averageNetIncome: activeProfessions.reduce((sum, p) => sum + p.netIncome, 0) / activeProfessions.length || 0
        };
    }
}

// Экспорт для использования в других модулях
window.ProfessionModule = ProfessionModule;

console.log('✅ ProfessionModule: Модуль профессий загружен');
