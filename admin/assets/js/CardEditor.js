/**
 * CardEditor v1.0.0
 * -----------------------------------------------------------------------------
 * Управление карточными колодами (создание, редактирование, удаление карт)
 * Работает с API /api/cards и сохраняет изменения в config/cards.json
 */

class CardEditor {
    constructor(config = {}) {
        this.apiBaseUrl = config.apiBaseUrl || '/api/cards';
        this.sidebarId = config.sidebarId || 'cards-deck-list';
        this.editorId = config.editorId || 'cards-editor';

        this.sidebarElement = document.getElementById(this.sidebarId);
        this.editorElement = document.getElementById(this.editorId);

        if (!this.sidebarElement || !this.editorElement) {
            console.warn('⚠️ CardEditor: Не найдены контейнеры для инициализации');
            return;
        }

        this.decks = [];
        this.version = 1;
        this.currentDeckId = null;
        this.currentCardId = null;
        this.currentCardLocation = null;
        this.cardFormState = null;
        this.cardFormDirty = false;
        this.unsavedChanges = false;

        this.isLoading = false;

        this.loadDecks();
        this.setupBeforeUnloadWarning();
    }

    /**
     * Загружает конфигурацию колод с сервера
     */
    async loadDecks() {
        if (this.isLoading) return;
        this.isLoading = true;
        try {
            this.renderSidebarLoading();
            const response = await fetch(this.apiBaseUrl, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки карт (HTTP ${response.status})`);
            }

            const payload = await response.json();
            if (!payload.success) {
                throw new Error(payload.message || 'Не удалось получить карточные колоды');
            }

            const data = payload.data || {};
            this.version = data.version || this.version;
            this.decks = Array.isArray(data.decks)
                ? data.decks.map((deck) => this.normalizeDeck(deck))
                : [];

            if (!this.currentDeckId && this.decks.length > 0) {
                this.currentDeckId = this.decks[0].id;
            }

            this.renderSidebar();
            this.renderDeckEditor(this.getCurrentDeck());
        } catch (error) {
            console.error('❌ CardEditor: Ошибка загрузки колод:', error);
            this.renderSidebarError(error);
            this.renderEditorError(error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Нормализует данные колоды
     */
    normalizeDeck(deck = {}) {
        return {
            id: deck.id || this.generateId(),
            name: deck.name || 'Новая колода',
            subtitle: deck.subtitle || '',
            drawDescription: deck.drawDescription || '',
            discardDescription: deck.discardDescription || '',
            drawPile: Array.isArray(deck.drawPile) ? deck.drawPile.map((card) => this.normalizeCard(card)) : [],
            discardPile: Array.isArray(deck.discardPile) ? deck.discardPile.map((card) => this.normalizeCard(card)) : []
        };
    }

    /**
     * Нормализует данные карточки
     */
    normalizeCard(card = {}) {
        return {
            ...card,
            id: card.id || this.generateId('card'),
            title: card.title || card.name || 'Новая карточка',
            description: card.description || '',
            amount: this.normalizeNumber(card.amount),
            income: this.normalizeNumber(card.income),
            expense: this.normalizeNumber(card.expense),
            notes: card.notes || '',
            tags: Array.isArray(card.tags)
                ? card.tags
                : (typeof card.tags === 'string' && card.tags.length ? card.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : []),
            metadata: typeof card.metadata === 'object' && card.metadata !== null ? card.metadata : {}
        };
    }

    normalizeNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    /**
     * Генерация идентификатора
     */
    generateId(prefix = 'deck') {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    }

    /**
     * Возвращает текущую выбранную колоду
     */
    getCurrentDeck() {
        if (!this.currentDeckId) return null;
        return this.decks.find((deck) => deck.id === this.currentDeckId) || null;
    }

    /**
     * Возвращает карточку по id и расположению
     */
    findCard(deck, cardId, location = 'draw') {
        if (!deck || !cardId) return null;
        const pile = location === 'discard' ? deck.discardPile : deck.drawPile;
        return pile.find((card) => card.id === cardId) || null;
    }

    /**
     * Рендер загрузки для боковой панели
     */
    renderSidebarLoading() {
        if (!this.sidebarElement) return;
        this.sidebarElement.innerHTML = `
            <div class="cards-sidebar-header">
                <h3>Колоды</h3>
                <div class="deck-counter">Загрузка...</div>
            </div>
            <div class="cards-deck-list">
                <div class="cards-empty-state">
                    <strong>Загружаем данные</strong>
                    Подождите, идет загрузка карточек.
                </div>
            </div>
        `;
    }

    /**
     * Рендер ошибки в боковой панели
     */
    renderSidebarError(error) {
        if (!this.sidebarElement) return;
        this.sidebarElement.innerHTML = `
            <div class="cards-sidebar-header">
                <h3>Колоды</h3>
                <div class="deck-counter">Ошибка загрузки</div>
            </div>
            <div class="cards-deck-list">
                <div class="cards-empty-state">
                    <strong>Не удалось загрузить</strong>
                    ${this.escapeHTML(error?.message || 'Попробуйте перезагрузить страницу.')}
                </div>
            </div>
        `;
    }

    /**
     * Основной рендер боковой панели
     */
    renderSidebar() {
        if (!this.sidebarElement) return;

        const listHtml = this.decks.map((deck) => {
            const isActive = deck.id === this.currentDeckId;
            return `
                <div class="deck-item${isActive ? ' active' : ''}" data-deck-id="${deck.id}">
                    <div class="deck-item-title">${this.escapeHTML(deck.name || 'Без названия')}</div>
                    ${deck.subtitle ? `<div class="deck-item-subtitle">${this.escapeHTML(deck.subtitle)}</div>` : ''}
                    <div class="deck-item-stats">
                        <span title="В колоде">📦 ${deck.drawPile.length}</span>
                        <span title="В отбое">♻️ ${deck.discardPile.length}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.sidebarElement.innerHTML = `
            <div class="cards-sidebar-header">
                <h3>Колоды</h3>
                <div class="deck-counter">${this.decks.length} / ${DEFAULT_DECK_COUNT}</div>
            </div>
            <div class="cards-deck-list">
                ${listHtml || `
                    <div class="cards-empty-state">
                        <strong>Нет колод</strong>
                        Добавьте новую колоду в config/cards.json
                    </div>
                `}
            </div>
        `;

        this.sidebarElement.querySelectorAll('.deck-item').forEach((item) => {
            item.addEventListener('click', () => {
                const deckId = item.dataset.deckId;
                this.handleDeckSelection(deckId);
            });
        });
    }

    handleDeckSelection(deckId) {
        if (!deckId || deckId === this.currentDeckId) return;

        if (this.cardFormDirty && !confirm('У вас есть несохраненные изменения в карточке. Перейти без сохранения?')) {
            return;
        }

        this.currentDeckId = deckId;
        this.currentCardId = null;
        this.currentCardLocation = null;
        this.cardFormState = null;
        this.cardFormDirty = false;

        this.renderSidebar();
        this.renderDeckEditor(this.getCurrentDeck());
    }

    /**
     * Рендер ошибок в основной области
     */
    renderEditorError(error) {
        if (!this.editorElement) return;
        this.editorElement.innerHTML = `
            <div class="cards-editor">
                <div class="cards-empty-state">
                    <strong>Ошибка загрузки</strong>
                    ${this.escapeHTML(error?.message || 'Неизвестная ошибка')}
                </div>
            </div>
        `;
    }

    /**
     * Основной рендер редактора колоды
     */
    renderDeckEditor(deck) {
        if (!this.editorElement) return;

        if (!deck) {
            this.editorElement.innerHTML = `
                <div class="cards-editor">
                    <div class="cards-empty-state">
                        <strong>Колода не выбрана</strong>
                        Выберите колоду слева для начала работы.
                    </div>
                </div>
            `;
            return;
        }

        const totalCards = deck.drawPile.length + deck.discardPile.length;

        this.editorElement.innerHTML = `
            <div class="cards-editor-header">
                <div>
                    <h2>${this.escapeHTML(deck.name || 'Колода без названия')}</h2>
                    <p>${this.escapeHTML(deck.subtitle || 'Управление карточками колоды')} • ${totalCards} карточек</p>
                </div>
                <div class="cards-editor-actions">
                    <button type="button" class="btn btn-ghost" data-action="add-card" data-location="draw">
                        ➕ Добавить в колоду
                    </button>
                    <button type="button" class="btn btn-ghost" data-action="add-card" data-location="discard">
                        ➕ Добавить в отбой
                    </button>
                    <button type="button" class="btn btn-primary" data-action="save-decks" ${this.unsavedChanges ? '' : 'disabled'}>
                        💾 Сохранить изменения
                    </button>
                </div>
            </div>
            <div class="cards-columns">
                ${this.renderCardsColumn(deck.drawPile, 'draw', 'Карточки в колоде')}
                ${this.renderCardsColumn(deck.discardPile, 'discard', 'Карточки в отбое')}
            </div>
            <div id="card-editor-container"></div>
            <div class="cards-footer-note" id="cards-editor-status" data-status="${this.unsavedChanges ? 'info' : 'success'}">
                ${this.unsavedChanges ? 'Есть несохраненные изменения' : 'Все изменения сохранены'}
            </div>
        `;

        this.bindEditorEvents();
        this.renderCardFormSection();
    }

    /**
     * Рендер секции карточек (колода/отбой)
     */
    renderCardsColumn(cards, location, title) {
        const isDraw = location === 'draw';
        const listHtml = cards.length
            ? cards.map((card) => this.renderCardItem(card, location)).join('')
            : `<div class="cards-empty-state">
                    <strong>Нет карточек</strong>
                    ${isDraw ? 'Добавьте карточку в колоду.' : 'Здесь будут карточки, которые вернули игроки.'}
               </div>`;

        return `
            <section class="cards-column" data-location="${location}">
                <h3>
                    ${this.escapeHTML(title)}
                    <button type="button" class="btn btn-ghost" data-action="add-card" data-location="${location}" title="Добавить новую карточку">
                        ➕
                    </button>
                </h3>
                <div class="card-list" data-location="${location}">
                    ${listHtml}
                </div>
            </section>
        `;
    }

    /**
     * Рендер карточки в списке
     */
    renderCardItem(card, location) {
        const isActive = this.currentCardId === card.id && this.currentCardLocation === location;
        const metaParts = [];

        if (card.amount !== null && card.amount !== undefined) {
            metaParts.push(`💵 ${this.formatCurrency(card.amount)}`);
        }
        if (card.income !== null && card.income !== undefined) {
            metaParts.push(`⬆️ ${this.formatCurrency(card.income)}`);
        }
        if (card.expense !== null && card.expense !== undefined) {
            metaParts.push(`⬇️ ${this.formatCurrency(card.expense)}`);
        }
        if (Array.isArray(card.tags) && card.tags.length > 0) {
            metaParts.push(`#${this.escapeHTML(card.tags.slice(0, 2).join(', #'))}`);
        }

        const description = card.description
            ? `<div class="card-item-description">${this.escapeHTML(this.truncate(card.description, 120))}</div>`
            : '';

        return `
            <article class="card-item${isActive ? ' active' : ''}" data-card-id="${card.id}" data-location="${location}">
                <div class="card-item-title">${this.escapeHTML(card.title || 'Без названия')}</div>
                ${description}
                ${metaParts.length ? `<div class="card-item-meta">${metaParts.map((part) => `<span>${part}</span>`).join('')}</div>` : ''}
            </article>
        `;
    }

    /**
     * Рендер формы редактирования карточки
     */
    renderCardFormSection() {
        if (!this.editorElement) return;
        const container = this.editorElement.querySelector('#card-editor-container');
        if (!container) return;

        const deck = this.getCurrentDeck();
        if (!deck || !this.currentCardId) {
            container.innerHTML = `
                <div class="card-editor-form">
                    <div class="cards-empty-state">
                        <strong>Карточка не выбрана</strong>
                        Выберите карточку из списка слева или создайте новую.
                    </div>
                </div>
            `;
            return;
        }

        const card = this.findCard(deck, this.currentCardId, this.currentCardLocation);
        if (!card) {
            container.innerHTML = `
                <div class="card-editor-form">
                    <div class="cards-empty-state">
                        <strong>Карточка не найдена</strong>
                        Возможно, она была удалена. Обновите список.
                    </div>
                </div>
            `;
            return;
        }

        if (!this.cardFormState || this.cardFormState.id !== card.id) {
            this.cardFormState = this.createFormStateFromCard(card, this.currentCardLocation);
            this.cardFormDirty = false;
        }

        const state = this.cardFormState;

        container.innerHTML = `
            <div class="card-editor-form" data-card-id="${state.id}">
                <div class="card-editor-toolbar">
                    <div class="status-badge">
                        ID: ${this.escapeHTML(state.id)}
                    </div>
                    <div class="card-editor-actions">
                        <button type="button" class="btn btn-danger" data-action="delete-card">
                            🗑️ Удалить карточку
                        </button>
                        <button type="button" class="btn btn-success" data-action="save-card">
                            💾 Сохранить карточку
                        </button>
                    </div>
                </div>

                <div class="card-editor-grid">
                    <div class="form-group full-width">
                        <label for="card-title">Название *</label>
                        <input type="text" id="card-title" data-field="title" value="${this.escapeHTML(state.title)}" required>
                    </div>

                    <div class="form-group full-width">
                        <label for="card-description">Описание</label>
                        <textarea id="card-description" data-field="description" rows="4">${this.escapeHTML(state.description)}</textarea>
                    </div>

                    <div class="form-group">
                        <label for="card-amount">Сумма сделки</label>
                        <input type="number" id="card-amount" data-field="amount" value="${state.amount}">
                    </div>

                    <div class="form-group">
                        <label for="card-income">Доход</label>
                        <input type="number" id="card-income" data-field="income" value="${state.income}">
                    </div>

                    <div class="form-group">
                        <label for="card-expense">Расход</label>
                        <input type="number" id="card-expense" data-field="expense" value="${state.expense}">
                    </div>

                    <div class="form-group">
                        <label for="card-location">Расположение</label>
                        <select id="card-location" data-field="location">
                            <option value="draw"${state.location === 'draw' ? ' selected' : ''}>Колода</option>
                            <option value="discard"${state.location === 'discard' ? ' selected' : ''}>Отбой</option>
                        </select>
                    </div>

                    <div class="form-group full-width">
                        <label for="card-notes">Заметки</label>
                        <input type="text" id="card-notes" data-field="notes" value="${this.escapeHTML(state.notes)}">
                    </div>

                    <div class="form-group full-width">
                        <label for="card-tags">Теги (через запятую)</label>
                        <input type="text" id="card-tags" data-field="tagsRaw" value="${this.escapeHTML(state.tagsRaw)}" placeholder="например: недвижимость, пассив">
                    </div>

                    <div class="form-group full-width">
                        <label for="card-metadata">Дополнительные данные (JSON)</label>
                        <textarea id="card-metadata" data-field="metadataRaw" rows="6">${this.escapeHTML(state.metadataRaw)}</textarea>
                    </div>
                </div>
            </div>
        `;

        this.bindCardFormEvents();
    }

    /**
     * Создает состояние формы по карточке
     */
    createFormStateFromCard(card, location) {
        const metadata = typeof card.metadata === 'object' && card.metadata !== null ? card.metadata : {};
        const tagsArray = Array.isArray(card.tags) ? card.tags : [];

        return {
            id: card.id,
            title: card.title || '',
            description: card.description || '',
            amount: card.amount ?? '',
            income: card.income ?? '',
            expense: card.expense ?? '',
            notes: card.notes || '',
            tagsRaw: tagsArray.join(', '),
            metadataRaw: JSON.stringify(metadata, null, 2),
            location: location || 'draw'
        };
    }

    /**
     * Привязка событий редактора
     */
    bindEditorEvents() {
        if (!this.editorElement) return;

        this.editorElement.querySelectorAll('[data-action="add-card"]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const location = btn.dataset.location || 'draw';
                this.addCard(location);
            });
        });

        const saveBtn = this.editorElement.querySelector('[data-action="save-decks"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAll());
        }

        this.editorElement.querySelectorAll('.card-item').forEach((item) => {
            item.addEventListener('click', () => {
                const cardId = item.dataset.cardId;
                const location = item.dataset.location || 'draw';
                this.selectCard(cardId, location);
            });
        });
    }

    /**
     * Привязка событий формы карточки
     */
    bindCardFormEvents() {
        if (!this.editorElement) return;

        const form = this.editorElement.querySelector('.card-editor-form');
        if (!form) return;

        const saveBtn = form.querySelector('[data-action="save-card"]');
        const deleteBtn = form.querySelector('[data-action="delete-card"]');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentCard());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentCard());
        }

        form.querySelectorAll('[data-field]').forEach((field) => {
            field.addEventListener('input', () => {
                this.handleCardFieldChange(field);
            });
        });
    }

    /**
     * Обработка изменения полей карточки
     */
    handleCardFieldChange(field) {
        if (!this.cardFormState) return;
        const key = field.dataset.field;
        const value = field.value;

        switch (key) {
            case 'amount':
            case 'income':
            case 'expense':
                this.cardFormState[key] = value;
                break;
            case 'title':
            case 'description':
            case 'notes':
            case 'tagsRaw':
            case 'metadataRaw':
                this.cardFormState[key] = value;
                break;
            case 'location':
                this.cardFormState.location = value === 'discard' ? 'discard' : 'draw';
                break;
            default:
                this.cardFormState[key] = value;
                break;
        }

        this.cardFormDirty = true;
    }

    /**
     * Выбор карточки из списка
     */
    selectCard(cardId, location = 'draw') {
        if (!cardId) return;

        if (this.cardFormDirty && !confirm('У вас есть несохраненные изменения карточки. Переключить без сохранения?')) {
            return;
        }

        const deck = this.getCurrentDeck();
        if (!deck) return;

        const card = this.findCard(deck, cardId, location);
        if (!card) return;

        this.currentCardId = card.id;
        this.currentCardLocation = location;
        this.cardFormState = this.createFormStateFromCard(card, location);
        this.cardFormDirty = false;

        this.renderDeckEditor(deck);
    }

    /**
     * Добавление новой карточки
     */
    addCard(location = 'draw') {
        const deck = this.getCurrentDeck();
        if (!deck) return;

        const newCard = this.normalizeCard({
            id: this.generateId('card'),
            title: 'Новая карточка',
            description: '',
            amount: null,
            income: null,
            expense: null,
            notes: '',
            tags: [],
            metadata: {}
        });

        if (location === 'discard') {
            deck.discardPile.unshift(newCard);
        } else {
            deck.drawPile.unshift(newCard);
            location = 'draw';
        }

        this.currentCardId = newCard.id;
        this.currentCardLocation = location;
        this.cardFormState = this.createFormStateFromCard(newCard, location);
        this.cardFormDirty = true;
        this.setUnsavedChanges(true);

        this.renderSidebar();
        this.renderDeckEditor(deck);
    }

    /**
     * Удаление текущей карточки
     */
    deleteCurrentCard() {
        const deck = this.getCurrentDeck();
        if (!deck || !this.currentCardId) return;

        if (!confirm('Удалить выбранную карточку? Это действие нельзя отменить.')) {
            return;
        }

        const removeFromPile = (pile) => {
            const index = pile.findIndex((card) => card.id === this.currentCardId);
            if (index !== -1) {
                pile.splice(index, 1);
                return true;
            }
            return false;
        };

        if (!removeFromPile(deck.drawPile)) {
            removeFromPile(deck.discardPile);
        }

        this.currentCardId = null;
        this.cardFormState = null;
        this.cardFormDirty = false;
        this.setUnsavedChanges(true);

        this.renderSidebar();
        this.renderDeckEditor(deck);
    }

    /**
     * Сохранение изменений текущей карточки в локальной конфигурации
     */
    saveCurrentCard() {
        if (!this.cardFormState) return;
        const deck = this.getCurrentDeck();
        if (!deck || !this.currentCardId) return;

        const state = this.cardFormState;
        const title = (state.title || '').trim();
        if (!title) {
            alert('Название карточки обязательно');
            return;
        }

        const parseNumber = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        };

        let metadata = {};
        try {
            metadata = state.metadataRaw ? JSON.parse(state.metadataRaw) : {};
            if (metadata === null || typeof metadata !== 'object') {
                throw new Error('metadata должен быть объектом');
            }
        } catch (error) {
            alert(`Ошибка в JSON дополнительных данных: ${error.message}`);
            return;
        }

        const tags = state.tagsRaw
            ? state.tagsRaw.split(',').map((tag) => tag.trim()).filter(Boolean)
            : [];

        const updatedCard = {
            ...this.findCard(deck, this.currentCardId, this.currentCardLocation) || {},
            title,
            description: state.description || '',
            amount: parseNumber(state.amount),
            income: parseNumber(state.income),
            expense: parseNumber(state.expense),
            notes: state.notes || '',
            tags,
            metadata
        };

        const prevLocation = this.currentCardLocation || 'draw';
        const newLocation = state.location === 'discard' ? 'discard' : 'draw';

        const removeFromPile = (pile) => {
            const index = pile.findIndex((card) => card.id === updatedCard.id);
            if (index !== -1) {
                pile.splice(index, 1);
            }
            return index;
        };

        if (prevLocation === 'draw') {
            removeFromPile(deck.drawPile);
        } else {
            removeFromPile(deck.discardPile);
        }

        if (newLocation === 'discard') {
            deck.discardPile.unshift(updatedCard);
        } else {
            deck.drawPile.unshift(updatedCard);
        }

        this.currentCardLocation = newLocation;
        this.cardFormState = this.createFormStateFromCard(updatedCard, newLocation);
        this.cardFormDirty = false;
        this.setUnsavedChanges(true);
        this.showStatus('Карточка сохранена в локальной конфигурации', 'success');

        this.renderSidebar();
        this.renderDeckEditor(deck);
    }

    /**
     * Сохранение полной конфигурации на сервер
     */
    async saveAll() {
        const payload = {
            version: this.version,
            decks: this.decks.map((deck) => ({
                id: deck.id,
                name: deck.name,
                subtitle: deck.subtitle,
                drawDescription: deck.drawDescription,
                discardDescription: deck.discardDescription,
                drawPile: deck.drawPile,
                discardPile: deck.discardPile
            }))
        };

        this.showStatus('Сохраняем изменения...', 'info');

        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Ошибка сохранения (HTTP ${response.status})`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Не удалось сохранить конфигурацию');
            }

            const data = result.data || {};
            this.version = data.version || this.version;
            this.decks = Array.isArray(data.decks)
                ? data.decks.map((deck) => this.normalizeDeck(deck))
                : this.decks;

            this.setUnsavedChanges(false);
            this.cardFormDirty = false;
            this.renderSidebar();
            this.renderDeckEditor(this.getCurrentDeck());
            this.showStatus('Изменения успешно сохранены', 'success');
        } catch (error) {
            console.error('❌ CardEditor: Ошибка сохранения конфигурации:', error);
            this.showStatus(error.message || 'Не удалось сохранить изменения', 'error');
        }
    }

    /**
     * Пометка Dirty состояния
     */
    setUnsavedChanges(value) {
        this.unsavedChanges = Boolean(value);
        const statusEl = this.editorElement?.querySelector('#cards-editor-status');
        if (statusEl) {
            statusEl.dataset.status = this.unsavedChanges ? 'info' : 'success';
            statusEl.textContent = this.unsavedChanges
                ? 'Есть несохраненные изменения'
                : 'Все изменения сохранены';
        }
        const saveBtn = this.editorElement?.querySelector('[data-action="save-decks"]');
        if (saveBtn) {
            saveBtn.disabled = !this.unsavedChanges;
        }
    }

    /**
     * Показ статуса
     */
    showStatus(message, type = 'info') {
        const statusEl = this.editorElement?.querySelector('#cards-editor-status');
        if (!statusEl) return;
        statusEl.dataset.status = type;
        statusEl.textContent = message;
    }

    /**
     * Настройка предупреждения о несохраненных данных
     */
    setupBeforeUnloadWarning() {
        window.addEventListener('beforeunload', (event) => {
            if (this.unsavedChanges) {
                event.preventDefault();
                event.returnValue = '';
            }
        });
    }

    /**
     * Установка статуса Dirty извне
     */
    markDirty() {
        this.setUnsavedChanges(true);
    }

    /**
     * Форматирование чисел в валюту
     */
    formatCurrency(value) {
        if (value === null || value === undefined) return '0';
        const number = Number(value);
        if (Number.isNaN(number)) return String(value);
        return number.toLocaleString('ru-RU');
    }

    /**
     * Экранирование HTML
     */
    escapeHTML(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Обрезка текста
     */
    truncate(text, maxLength = 120) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength - 1)}…`;
    }

    /**
     * Принудительное обновление данных
     */
    refresh() {
        this.loadDecks();
    }
}

const DEFAULT_DECK_COUNT = 4;

window.CardEditor = CardEditor;
