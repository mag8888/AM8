/**
 * AdminCellEditor - Редактор клеток игрового поля
 * Позволяет изменять свойства клеток в админ-панели
 * 
 * @version 1.0.0
 */

class AdminCellEditor {
    constructor() {
        this.cells = [];
        this.currentCell = null;
        this.unsavedChanges = false;
        
        this.init();
    }
    
    /**
     * Инициализация редактора
     */
    init() {
        console.log('⚙️ AdminCellEditor: Инициализация...');
        
        // Загружаем клетки из BoardConfig
        this.loadCellsFromConfig();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Рендерим список клеток
        this.renderCellsList();
        
        console.log('✅ AdminCellEditor: Инициализация завершена');
    }
    
    /**
     * Загрузка клеток из BoardConfig
     */
    loadCellsFromConfig() {
        if (typeof window.BoardConfig === 'undefined') {
            console.error('❌ BoardConfig не найден');
            return;
        }
        
        const config = window.BoardConfig;
        this.cells = [];
        
        // Загружаем клетки внешнего трека
        config.BIG_CIRCLE.forEach((cell, index) => {
            this.cells.push({
                id: `outer-${index}`,
                track: 'outer',
                position: index,
                name: cell.name || `Клетка ${index}`,
                description: cell.description || '',
                icon: cell.icon || '📍',
                color: cell.color || '#6366f1',
                income: cell.income || 0,
                expense: cell.expense || 0,
                price: cell.price || 0,
                rent: cell.rent || 0,
                actionType: cell.actionType || 'none',
                actionText: cell.actionText || '',
                purchasable: cell.purchasable || false,
                special: cell.special || false,
                mandatoryStop: cell.mandatoryStop || false,
                customData: cell.customData || {}
            });
        });
        
        // Загружаем клетки внутреннего трека
        config.SMALL_CIRCLE.forEach((cell, index) => {
            this.cells.push({
                id: `inner-${index}`,
                track: 'inner',
                position: index,
                name: cell.name || `Клетка ${index}`,
                description: cell.description || '',
                icon: cell.icon || '📍',
                color: cell.color || '#6366f1',
                income: cell.income || 0,
                expense: cell.expense || 0,
                price: cell.price || 0,
                rent: cell.rent || 0,
                actionType: cell.actionType || 'none',
                actionText: cell.actionText || '',
                purchasable: cell.purchasable || false,
                special: cell.special || false,
                mandatoryStop: cell.mandatoryStop || false,
                customData: cell.customData || {}
            });
        });
        
        console.log(`📊 Загружено ${this.cells.length} клеток`);
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Фильтр по треку
        const trackFilter = document.getElementById('track-filter');
        if (trackFilter) {
            trackFilter.addEventListener('change', () => this.filterCells());
        }
        
        // Поиск
        const searchInput = document.getElementById('search-cells');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterCells());
        }
        
        // Отслеживание изменений в форме
        const formInputs = document.querySelectorAll('#cell-editor-form input, #cell-editor-form textarea, #cell-editor-form select');
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.unsavedChanges = true;
                this.updatePreview();
            });
        });
        
        // Предупреждение о несохраненных изменениях
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }
    
    /**
     * Рендеринг списка клеток
     */
    renderCellsList(filteredCells = null) {
        const cellsList = document.getElementById('cells-list');
        if (!cellsList) return;
        
        const cells = filteredCells || this.cells;
        
        cellsList.innerHTML = cells.map(cell => `
            <div class="cell-item ${this.currentCell?.id === cell.id ? 'active' : ''}" 
                 onclick="adminEditor.selectCell('${cell.id}')">
                <div class="cell-item-icon" style="background-color: ${cell.color}">
                    ${cell.icon}
                </div>
                <div class="cell-item-info">
                    <div class="cell-item-name">${cell.name}</div>
                    <div class="cell-item-meta">
                        <span class="badge badge-${cell.track}">${cell.track === 'outer' ? 'Внешний' : 'Внутренний'}</span>
                        <span class="badge badge-position">#${cell.position}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log(`✅ Отрисовано ${cells.length} клеток`);
    }
    
    /**
     * Фильтрация клеток
     */
    filterCells() {
        const trackFilter = document.getElementById('track-filter')?.value || 'all';
        const searchQuery = document.getElementById('search-cells')?.value.toLowerCase() || '';
        
        let filtered = this.cells;
        
        // Фильтр по треку
        if (trackFilter !== 'all') {
            filtered = filtered.filter(cell => cell.track === trackFilter);
        }
        
        // Поиск
        if (searchQuery) {
            filtered = filtered.filter(cell => 
                cell.name.toLowerCase().includes(searchQuery) ||
                cell.description.toLowerCase().includes(searchQuery)
            );
        }
        
        this.renderCellsList(filtered);
    }
    
    /**
     * Выбор клетки для редактирования
     */
    selectCell(cellId) {
        // Проверяем несохраненные изменения
        if (this.unsavedChanges) {
            if (!confirm('У вас есть несохраненные изменения. Продолжить?')) {
                return;
            }
        }
        
        this.currentCell = this.cells.find(cell => cell.id === cellId);
        if (!this.currentCell) {
            console.error('❌ Клетка не найдена:', cellId);
            return;
        }
        
        this.unsavedChanges = false;
        this.renderCellEditor();
        this.renderCellsList(); // Обновляем список для подсветки активной клетки
        
        console.log('✅ Выбрана клетка:', this.currentCell);
    }
    
    /**
     * Рендеринг редактора клетки
     */
    renderCellEditor() {
        if (!this.currentCell) return;
        
        // Показываем форму
        const emptyState = document.querySelector('.empty-state');
        const editorForm = document.getElementById('cell-editor-form');
        const saveBtn = document.getElementById('save-cell-btn');
        const editorTitle = document.getElementById('editor-title');
        
        if (emptyState) emptyState.style.display = 'none';
        if (editorForm) editorForm.style.display = 'block';
        if (saveBtn) saveBtn.disabled = false;
        if (editorTitle) editorTitle.textContent = `Редактирование: ${this.currentCell.name}`;
        
        // Заполняем форму
        this.fillForm();
        
        // Обновляем предпросмотр
        this.updatePreview();
    }
    
    /**
     * Заполнение формы данными клетки
     */
    fillForm() {
        const cell = this.currentCell;
        
        document.getElementById('cell-id').value = cell.id;
        document.getElementById('cell-track').value = cell.track === 'outer' ? 'Внешний трек' : 'Внутренний трек';
        document.getElementById('cell-name').value = cell.name;
        document.getElementById('cell-description').value = cell.description;
        document.getElementById('cell-icon').value = cell.icon;
        document.getElementById('cell-color').value = cell.color;
        document.getElementById('cell-income').value = cell.income;
        document.getElementById('cell-expense').value = cell.expense;
        document.getElementById('cell-price').value = cell.price;
        document.getElementById('cell-rent').value = cell.rent;
        document.getElementById('cell-action-type').value = cell.actionType;
        document.getElementById('cell-action-text').value = cell.actionText;
        document.getElementById('cell-purchasable').checked = cell.purchasable;
        document.getElementById('cell-special').checked = cell.special;
        document.getElementById('cell-mandatory-stop').checked = cell.mandatoryStop;
        document.getElementById('cell-custom-data').value = JSON.stringify(cell.customData, null, 2);
    }
    
    /**
     * Обновление предпросмотра клетки
     */
    updatePreview() {
        const preview = document.getElementById('cell-preview');
        if (!preview) return;
        
        const name = document.getElementById('cell-name').value;
        const icon = document.getElementById('cell-icon').value;
        const color = document.getElementById('cell-color').value;
        const description = document.getElementById('cell-description').value;
        const income = document.getElementById('cell-income').value;
        const expense = document.getElementById('cell-expense').value;
        
        preview.innerHTML = `
            <div class="preview-cell" style="background-color: ${color}">
                <div class="preview-icon">${icon}</div>
                <div class="preview-name">${name || 'Без названия'}</div>
                ${description ? `<div class="preview-description">${description}</div>` : ''}
                <div class="preview-finances">
                    ${income > 0 ? `<span class="preview-income">+$${income}</span>` : ''}
                    ${expense > 0 ? `<span class="preview-expense">-$${expense}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Сохранение текущей клетки
     */
    saveCurrentCell() {
        if (!this.currentCell) return;
        
        try {
            // Получаем данные из формы
            const updatedCell = {
                ...this.currentCell,
                name: document.getElementById('cell-name').value,
                description: document.getElementById('cell-description').value,
                icon: document.getElementById('cell-icon').value,
                color: document.getElementById('cell-color').value,
                income: parseFloat(document.getElementById('cell-income').value) || 0,
                expense: parseFloat(document.getElementById('cell-expense').value) || 0,
                price: parseFloat(document.getElementById('cell-price').value) || 0,
                rent: parseFloat(document.getElementById('cell-rent').value) || 0,
                actionType: document.getElementById('cell-action-type').value,
                actionText: document.getElementById('cell-action-text').value,
                purchasable: document.getElementById('cell-purchasable').checked,
                special: document.getElementById('cell-special').checked,
                mandatoryStop: document.getElementById('cell-mandatory-stop').checked,
                customData: JSON.parse(document.getElementById('cell-custom-data').value || '{}')
            };
            
            // Обновляем клетку в массиве
            const index = this.cells.findIndex(c => c.id === this.currentCell.id);
            if (index !== -1) {
                this.cells[index] = updatedCell;
                this.currentCell = updatedCell;
            }
            
            this.unsavedChanges = false;
            this.renderCellsList();
            this.showNotification('✅ Клетка сохранена', 'success');
            
            // Сохраняем в localStorage для переноса в BoardConfig
            this.saveToLocalStorage();
            
            console.log('✅ Клетка сохранена:', updatedCell);
        } catch (error) {
            console.error('❌ Ошибка сохранения клетки:', error);
            this.showNotification('❌ Ошибка сохранения: ' + error.message, 'error');
        }
    }
    
    /**
     * Сохранение конфигурации в localStorage
     */
    saveToLocalStorage() {
        try {
            const config = {
                outerCells: this.cells.filter(c => c.track === 'outer'),
                innerCells: this.cells.filter(c => c.track === 'inner'),
                lastUpdate: new Date().toISOString()
            };
            
            localStorage.setItem('aura_money_cells_config', JSON.stringify(config));
            console.log('💾 Конфигурация сохранена в localStorage');
        } catch (error) {
            console.error('❌ Ошибка сохранения в localStorage:', error);
        }
    }
    
    /**
     * Сохранение конфигурации на сервер
     */
    async saveToServer() {
        try {
            const config = {
                outerCells: this.cells.filter(c => c.track === 'outer').map(c => ({
                    name: c.name,
                    description: c.description,
                    icon: c.icon,
                    color: c.color,
                    income: c.income,
                    expense: c.expense,
                    price: c.price,
                    rent: c.rent,
                    actionType: c.actionType,
                    actionText: c.actionText,
                    purchasable: c.purchasable,
                    special: c.special,
                    mandatoryStop: c.mandatoryStop,
                    customData: c.customData
                })),
                innerCells: this.cells.filter(c => c.track === 'inner').map(c => ({
                    name: c.name,
                    description: c.description,
                    icon: c.icon,
                    color: c.color,
                    income: c.income,
                    expense: c.expense,
                    price: c.price,
                    rent: c.rent,
                    actionType: c.actionType,
                    actionText: c.actionText,
                    purchasable: c.purchasable,
                    special: c.special,
                    mandatoryStop: c.mandatoryStop,
                    customData: c.customData
                }))
            };
            
            const response = await fetch('/api/cells', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('✅ Конфигурация сохранена на сервер', 'success');
                console.log('✅ Конфигурация сохранена на сервер');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения на сервер:', error);
            this.showNotification('❌ Ошибка сохранения на сервер', 'error');
        }
    }
    
    /**
     * Экспорт конфигурации
     */
    exportConfig() {
        const config = {
            outerCells: this.cells.filter(c => c.track === 'outer'),
            innerCells: this.cells.filter(c => c.track === 'inner'),
            version: '1.0.0',
            exportDate: new Date().toISOString()
        };
        
        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cells-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('💾 Конфигурация экспортирована', 'success');
        console.log('💾 Конфигурация экспортирована');
    }
    
    /**
     * Открытие модального окна импорта
     */
    importConfig() {
        const modal = document.getElementById('import-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    /**
     * Закрытие модального окна импорта
     */
    closeImportModal() {
        const modal = document.getElementById('import-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        document.getElementById('import-json').value = '';
    }
    
    /**
     * Обработка импорта
     */
    processImport() {
        try {
            const json = document.getElementById('import-json').value;
            const config = JSON.parse(json);
            
            if (!config.outerCells || !config.innerCells) {
                throw new Error('Неверный формат конфигурации');
            }
            
            // Обновляем клетки
            this.cells = [
                ...config.outerCells.map((c, i) => ({ ...c, id: `outer-${i}`, track: 'outer', position: i })),
                ...config.innerCells.map((c, i) => ({ ...c, id: `inner-${i}`, track: 'inner', position: i }))
            ];
            
            this.renderCellsList();
            this.saveToLocalStorage();
            this.closeImportModal();
            this.showNotification('✅ Конфигурация импортирована', 'success');
            
            console.log('✅ Конфигурация импортирована');
        } catch (error) {
            console.error('❌ Ошибка импорта:', error);
            this.showNotification('❌ Ошибка импорта: ' + error.message, 'error');
        }
    }
    
    /**
     * Показ уведомления
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Глобальный доступ
if (typeof window !== 'undefined') {
    window.AdminCellEditor = AdminCellEditor;
}
