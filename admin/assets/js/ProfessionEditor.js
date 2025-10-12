/**
 * Редактор профессий для админки
 * Версия: 1.0.0
 * Статус: Реализовано
 */

class ProfessionEditor {
    constructor() {
        this.professionModule = null;
        this.currentProfession = null;
        this.isEditing = false;
        this.init();
    }

    /**
     * Инициализация редактора
     */
    init() {
        console.log('🚀 ProfessionEditor: Инициализация...');
        
        // Создаем экземпляр модуля профессий
        this.professionModule = new ProfessionModule();
        
        // Создаем интерфейс
        this.createInterface();
        
        // Загружаем профессии
        this.loadProfessions();
        
        console.log('✅ ProfessionEditor: Инициализация завершена');
    }

    /**
     * Создание интерфейса редактора
     */
    createInterface() {
        const container = document.getElementById('admin-content') || document.body;
        
        container.innerHTML = `
            <div class="profession-editor">
                <div class="editor-header">
                    <h2>🎭 Редактор профессий</h2>
                    <div class="header-actions">
                        <button id="add-profession-btn" class="btn btn-primary">
                            ➕ Добавить профессию
                        </button>
                        <button id="export-professions-btn" class="btn btn-secondary">
                            📤 Экспорт
                        </button>
                        <button id="import-professions-btn" class="btn btn-secondary">
                            📥 Импорт
                        </button>
                        <input type="file" id="import-file" accept=".json" style="display: none;">
                    </div>
                </div>

                <div class="editor-content">
                    <div class="professions-list">
                        <h3>📋 Список профессий</h3>
                        <div id="professions-list-container" class="list-container">
                            <!-- Список профессий будет здесь -->
                        </div>
                    </div>

                    <div class="profession-editor-panel">
                        <div id="profession-form-container" class="form-container">
                            <div class="form-placeholder">
                                <p>Выберите профессию для редактирования или создайте новую</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="editor-footer">
                    <div class="statistics">
                        <div class="stat-item">
                            <span class="stat-label">Всего профессий:</span>
                            <span id="total-professions" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Активных:</span>
                            <span id="active-professions" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Средняя зарплата:</span>
                            <span id="average-salary" class="stat-value">$0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Средний чистый доход:</span>
                            <span id="average-net-income" class="stat-value">$0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем стили
        this.addStyles();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
    }

    /**
     * Добавление стилей
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .profession-editor {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .editor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e0e0e0;
            }

            .editor-header h2 {
                margin: 0;
                color: #2c3e50;
                font-size: 2rem;
            }

            .header-actions {
                display: flex;
                gap: 10px;
            }

            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .btn-primary {
                background: #3498db;
                color: white;
            }

            .btn-primary:hover {
                background: #2980b9;
            }

            .btn-secondary {
                background: #95a5a6;
                color: white;
            }

            .btn-secondary:hover {
                background: #7f8c8d;
            }

            .btn-success {
                background: #27ae60;
                color: white;
            }

            .btn-success:hover {
                background: #229954;
            }

            .btn-danger {
                background: #e74c3c;
                color: white;
            }

            .btn-danger:hover {
                background: #c0392b;
            }

            .editor-content {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 30px;
                margin-bottom: 30px;
            }

            .professions-list h3 {
                margin-bottom: 20px;
                color: #2c3e50;
            }

            .list-container {
                background: white;
                border-radius: 8px;
                border: 1px solid #ddd;
                max-height: 600px;
                overflow-y: auto;
            }

            .profession-item {
                padding: 15px;
                border-bottom: 1px solid #eee;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .profession-item:hover {
                background-color: #f8f9fa;
            }

            .profession-item.active {
                background-color: #e3f2fd;
                border-left: 4px solid #2196f3;
            }

            .profession-item:last-child {
                border-bottom: none;
            }

            .profession-name {
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 5px;
            }

            .profession-details {
                font-size: 14px;
                color: #666;
            }

            .profession-actions {
                margin-top: 10px;
                display: flex;
                gap: 10px;
            }

            .form-container {
                background: white;
                border-radius: 8px;
                border: 1px solid #ddd;
                padding: 30px;
                min-height: 600px;
            }

            .form-placeholder {
                text-align: center;
                color: #666;
                padding: 100px 20px;
            }

            .profession-form {
                display: grid;
                gap: 20px;
            }

            .form-section {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 20px;
            }

            .form-section h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 1.2rem;
            }

            .form-group {
                margin-bottom: 15px;
            }

            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #2c3e50;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }

            .form-group textarea {
                resize: vertical;
                min-height: 80px;
            }

            .expense-item {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 100px;
                gap: 10px;
                align-items: end;
                padding: 15px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                margin-bottom: 10px;
                background: #f9f9f9;
            }

            .form-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
            }

            .editor-footer {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
            }

            .statistics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
            }

            .stat-item {
                text-align: center;
            }

            .stat-label {
                display: block;
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
            }

            .stat-value {
                display: block;
                font-size: 24px;
                font-weight: 600;
                color: #2c3e50;
            }

            @media (max-width: 768px) {
                .editor-content {
                    grid-template-columns: 1fr;
                }
                
                .editor-header {
                    flex-direction: column;
                    gap: 20px;
                    align-items: stretch;
                }
                
                .header-actions {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Добавить профессию
        document.getElementById('add-profession-btn').addEventListener('click', () => {
            this.createNewProfession();
        });

        // Экспорт
        document.getElementById('export-professions-btn').addEventListener('click', () => {
            this.exportProfessions();
        });

        // Импорт
        document.getElementById('import-professions-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            this.importProfessions(e.target.files[0]);
        });
    }

    /**
     * Загрузка и отображение профессий
     */
    loadProfessions() {
        const container = document.getElementById('professions-list-container');
        const professions = this.professionModule.getAllProfessions();

        container.innerHTML = professions.map(profession => `
            <div class="profession-item" data-profession-id="${profession.id}">
                <div class="profession-name">${profession.name}</div>
                <div class="profession-details">
                    Зарплата: $${profession.income.salary.toLocaleString()}/мес | 
                    Расходы: $${profession.totalExpenses.toLocaleString()}/мес | 
                    Чистый доход: $${profession.netIncome.toLocaleString()}/мес
                </div>
                <div class="profession-actions">
                    <button class="btn btn-primary edit-btn" data-profession-id="${profession.id}">
                        ✏️ Редактировать
                    </button>
                    <button class="btn btn-danger delete-btn" data-profession-id="${profession.id}">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `).join('');

        // Обработчики для кнопок
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const professionId = e.target.dataset.professionId;
                this.editProfession(professionId);
            } else if (e.target.classList.contains('delete-btn')) {
                const professionId = e.target.dataset.professionId;
                this.deleteProfession(professionId);
            }
        });

        // Обновляем статистику
        this.updateStatistics();
    }

    /**
     * Создание новой профессии
     */
    createNewProfession() {
        const newProfession = this.professionModule.createProfession({
            name: 'Новая профессия',
            type: 'employee',
            description: 'Описание новой профессии',
            income: {
                salary: 5000,
                passiveIncome: 0,
                totalIncome: 5000
            },
            expenses: {
                taxes: {
                    amount: 650,
                    percentage: 13,
                    description: 'Налоги',
                    canPayOff: false,
                    payOffAmount: 0
                },
                otherExpenses: {
                    amount: 1000,
                    description: 'Прочие расходы',
                    canPayOff: false,
                    payOffAmount: 0
                }
            }
        });

        this.editProfession(newProfession.id);
        this.loadProfessions();
    }

    /**
     * Редактирование профессии
     */
    editProfession(professionId) {
        const profession = this.professionModule.getProfession(professionId);
        if (!profession) return;

        this.currentProfession = profession;
        this.isEditing = true;

        // Выделяем активную профессию
        document.querySelectorAll('.profession-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-profession-id="${professionId}"]`).classList.add('active');

        // Создаем форму редактирования
        this.createProfessionForm(profession);
    }

    /**
     * Создание формы редактирования профессии
     */
    createProfessionForm(profession) {
        const container = document.getElementById('profession-form-container');
        
        container.innerHTML = `
            <form class="profession-form" id="profession-form">
                <div class="form-section">
                    <h4>📋 Основная информация</h4>
                    <div class="form-group">
                        <label for="profession-name">Название профессии</label>
                        <input type="text" id="profession-name" value="${profession.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="profession-type">Тип профессии</label>
                        <select id="profession-type">
                            <option value="employee" ${profession.type === 'employee' ? 'selected' : ''}>Сотрудник</option>
                            <option value="business_owner" ${profession.type === 'business_owner' ? 'selected' : ''}>Владелец бизнеса</option>
                            <option value="freelancer" ${profession.type === 'freelancer' ? 'selected' : ''}>Фрилансер</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="profession-description">Описание</label>
                        <textarea id="profession-description">${profession.description}</textarea>
                    </div>
                </div>

                <div class="form-section">
                    <h4>💰 Доходы</h4>
                    <div class="form-group">
                        <label for="salary">Зарплата ($/месяц)</label>
                        <input type="number" id="salary" value="${profession.income.salary}" min="0" step="100">
                    </div>
                    <div class="form-group">
                        <label for="passive-income">Пассивный доход ($/месяц)</label>
                        <input type="number" id="passive-income" value="${profession.income.passiveIncome}" min="0" step="100">
                    </div>
                </div>

                <div class="form-section">
                    <h4>💸 Расходы</h4>
                    <div id="expenses-container">
                        ${this.renderExpensesForm(profession.expenses)}
                    </div>
                    <button type="button" id="add-expense-btn" class="btn btn-secondary">
                        ➕ Добавить расход
                    </button>
                </div>

                <div class="form-section">
                    <h4>📊 Расчетные показатели</h4>
                    <div class="form-group">
                        <label>Общий доход ($/месяц)</label>
                        <input type="number" id="total-income" value="${profession.income.totalIncome}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Общие расходы ($/месяц)</label>
                        <input type="number" id="total-expenses" value="${profession.totalExpenses}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Чистый доход ($/месяц)</label>
                        <input type="number" id="net-income" value="${profession.netIncome}" readonly>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">Отмена</button>
                    <button type="submit" class="btn btn-success">💾 Сохранить</button>
                </div>
            </form>
        `;

        // Настраиваем обработчики формы
        this.setupFormEventListeners();
    }

    /**
     * Рендеринг формы расходов
     */
    renderExpensesForm(expenses) {
        return Object.entries(expenses).map(([key, expense]) => `
            <div class="expense-item" data-expense-key="${key}">
                <div class="form-group">
                    <label>Описание</label>
                    <input type="text" value="${expense.description}" class="expense-description">
                </div>
                <div class="form-group">
                    <label>Сумма ($/месяц)</label>
                    <input type="number" value="${expense.amount}" min="0" step="10" class="expense-amount">
                </div>
                <div class="form-group">
                    <label>Можно погасить</label>
                    <input type="checkbox" ${expense.canPayOff ? 'checked' : ''} class="expense-can-payoff">
                </div>
                <div class="form-group">
                    <label>Сумма для погашения</label>
                    <input type="number" value="${expense.payOffAmount || 0}" min="0" step="100" class="expense-payoff-amount" ${!expense.canPayOff ? 'disabled' : ''}>
                </div>
                <button type="button" class="btn btn-danger remove-expense-btn">🗑️</button>
            </div>
        `).join('');
    }

    /**
     * Настройка обработчиков формы
     */
    setupFormEventListeners() {
        const form = document.getElementById('profession-form');
        
        // Сохранение формы
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfession();
        });

        // Отмена
        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.cancelEditing();
        });

        // Добавление расхода
        document.getElementById('add-expense-btn').addEventListener('click', () => {
            this.addExpense();
        });

        // Удаление расхода
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-expense-btn')) {
                e.target.closest('.expense-item').remove();
                this.recalculateTotals();
            }
        });

        // Пересчет при изменении доходов
        document.getElementById('salary').addEventListener('input', () => {
            this.recalculateTotals();
        });

        document.getElementById('passive-income').addEventListener('input', () => {
            this.recalculateTotals();
        });

        // Пересчет при изменении расходов
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('expense-amount')) {
                this.recalculateTotals();
            }
        });

        // Включение/выключение поля суммы погашения
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('expense-can-payoff')) {
                const payoffInput = e.target.closest('.expense-item').querySelector('.expense-payoff-amount');
                payoffInput.disabled = !e.target.checked;
                if (!e.target.checked) {
                    payoffInput.value = 0;
                }
            }
        });
    }

    /**
     * Добавление нового расхода
     */
    addExpense() {
        const container = document.getElementById('expenses-container');
        const expenseKey = `expense_${Date.now()}`;
        
        const expenseHtml = `
            <div class="expense-item" data-expense-key="${expenseKey}">
                <div class="form-group">
                    <label>Описание</label>
                    <input type="text" value="Новый расход" class="expense-description">
                </div>
                <div class="form-group">
                    <label>Сумма ($/месяц)</label>
                    <input type="number" value="0" min="0" step="10" class="expense-amount">
                </div>
                <div class="form-group">
                    <label>Можно погасить</label>
                    <input type="checkbox" class="expense-can-payoff">
                </div>
                <div class="form-group">
                    <label>Сумма для погашения</label>
                    <input type="number" value="0" min="0" step="100" class="expense-payoff-amount" disabled>
                </div>
                <button type="button" class="btn btn-danger remove-expense-btn">🗑️</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', expenseHtml);
    }

    /**
     * Пересчет общих показателей
     */
    recalculateTotals() {
        const salary = parseFloat(document.getElementById('salary').value) || 0;
        const passiveIncome = parseFloat(document.getElementById('passive-income').value) || 0;
        
        const totalIncome = salary + passiveIncome;
        document.getElementById('total-income').value = totalIncome;

        let totalExpenses = 0;
        document.querySelectorAll('.expense-amount').forEach(input => {
            totalExpenses += parseFloat(input.value) || 0;
        });
        document.getElementById('total-expenses').value = totalExpenses;

        const netIncome = totalIncome - totalExpenses;
        document.getElementById('net-income').value = netIncome;
    }

    /**
     * Сохранение профессии
     */
    saveProfession() {
        const form = document.getElementById('profession-form');
        const formData = new FormData(form);

        // Собираем данные формы
        const professionData = {
            name: document.getElementById('profession-name').value,
            type: document.getElementById('profession-type').value,
            description: document.getElementById('profession-description').value,
            income: {
                salary: parseFloat(document.getElementById('salary').value) || 0,
                passiveIncome: parseFloat(document.getElementById('passive-income').value) || 0
            },
            expenses: {}
        };

        // Собираем расходы
        document.querySelectorAll('.expense-item').forEach(item => {
            const key = item.dataset.expenseKey;
            const description = item.querySelector('.expense-description').value;
            const amount = parseFloat(item.querySelector('.expense-amount').value) || 0;
            const canPayOff = item.querySelector('.expense-can-payoff').checked;
            const payOffAmount = parseFloat(item.querySelector('.expense-payoff-amount').value) || 0;

            professionData.expenses[key] = {
                description,
                amount,
                canPayOff,
                payOffAmount: canPayOff ? payOffAmount : 0
            };
        });

        // Обновляем профессию
        this.professionModule.updateProfession(this.currentProfession.id, professionData);

        // Обновляем интерфейс
        this.loadProfessions();
        this.cancelEditing();

        console.log('✅ ProfessionEditor: Профессия сохранена');
    }

    /**
     * Отмена редактирования
     */
    cancelEditing() {
        this.isEditing = false;
        this.currentProfession = null;

        document.getElementById('profession-form-container').innerHTML = `
            <div class="form-placeholder">
                <p>Выберите профессию для редактирования или создайте новую</p>
            </div>
        `;

        document.querySelectorAll('.profession-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    /**
     * Удаление профессии
     */
    deleteProfession(professionId) {
        if (confirm('Вы уверены, что хотите удалить эту профессию?')) {
            this.professionModule.deleteProfession(professionId);
            this.loadProfessions();
            this.cancelEditing();
        }
    }

    /**
     * Экспорт профессий
     */
    exportProfessions() {
        const data = this.professionModule.exportProfessions();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `professions_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Импорт профессий
     */
    importProfessions(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = this.professionModule.importProfessions(e.target.result);
            if (success) {
                this.loadProfessions();
                alert('Профессии успешно импортированы!');
            } else {
                alert('Ошибка при импорте профессий!');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Обновление статистики
     */
    updateStatistics() {
        const stats = this.professionModule.getStatistics();
        
        document.getElementById('total-professions').textContent = stats.total;
        document.getElementById('active-professions').textContent = stats.active;
        document.getElementById('average-salary').textContent = `$${Math.round(stats.averageSalary).toLocaleString()}`;
        document.getElementById('average-net-income').textContent = `$${Math.round(stats.averageNetIncome).toLocaleString()}`;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin') || window.location.search.includes('admin')) {
        new ProfessionEditor();
    }
});

console.log('✅ ProfessionEditor: Редактор профессий загружен');
