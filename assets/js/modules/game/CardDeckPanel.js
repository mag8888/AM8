/**
 * CardDeckPanel v1.0.0
 * -----------------------------------------------------------------------------
 * Отображает карточные колоды слева от игрового поля и синхронизируется с API.
 * Позволяет обновлять данные вручную и автоматически.
 */

(function attachCardDeckPanel() {
    const DEFAULT_DECKS = [
        {
            id: 'deal',
            name: 'Малая сделка'
        },
        {
            id: 'big_deal',
            name: 'Большие сделки'
        },
        {
            id: 'expenses',
            name: 'Расходы'
        },
        {
            id: 'market',
            name: 'Рынок'
        }
    ];

    class CardDeckPanel {
        constructor(config = {}) {
            this.containerSelector = config.containerSelector || '#card-decks-panel';
            this.apiBaseUrl = config.apiBaseUrl || '/api/cards';
            this.eventBus = config.eventBus || null;
            this.refreshInterval = typeof config.refreshInterval === 'number'
                ? config.refreshInterval
                : 45000;

            this.container = null;
            this.abortController = null;
            this.autoRefreshTimer = null;
            this.latestUpdatedAt = null;

            this.handleContainerClick = this.handleContainerClick.bind(this);

            this.init();
        }

        /**
         * Инициализация панели
         */
        init() {
            this.container = document.querySelector(this.containerSelector);

            if (!this.container) {
                console.warn('⚠️ CardDeckPanel: Контейнер не найден:', this.containerSelector);
                return;
            }

            this.renderLoading();
            this.loadDecks().catch((error) => {
                this.renderError(error);
            });
            this.setupEventListeners();
            this.setupAutoRefresh();
        }

        /**
         * Настройка слушателей событий
         */
        setupEventListeners() {
            if (this.container) {
                this.container.addEventListener('click', this.handleContainerClick);
            }

            if (this.eventBus && typeof this.eventBus.on === 'function') {
                this.eventBus.on('cards:updated', () => {
                    this.refresh();
                });
            }
        }

        /**
         * Настройка автоматического обновления
         */
        setupAutoRefresh() {
            if (!this.refreshInterval || this.refreshInterval <= 0) {
                return;
            }

            this.clearAutoRefresh();
            this.autoRefreshTimer = setInterval(() => {
                this.refresh();
            }, this.refreshInterval);
        }

        /**
         * Останавливает автоматическое обновление
         */
        clearAutoRefresh() {
            if (this.autoRefreshTimer) {
                clearInterval(this.autoRefreshTimer);
                this.autoRefreshTimer = null;
            }
        }

        /**
         * Обработчик кликов внутри панели
         */
        handleContainerClick(event) {
            // Обработка кликов удалена - кнопки обновления больше нет
        }

        /**
         * Загружает данные колод с API
         */
        async loadDecks() {
            this.cancelPendingRequest();
            this.setLoadingState(true);

            this.abortController = new AbortController();

            const requestInit = {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                },
                signal: this.abortController.signal
            };

            try {
                const response = await fetch(this.apiBaseUrl, requestInit);
                if (!response.ok) {
                    throw new Error(`Не удалось загрузить карточные колоды (HTTP ${response.status})`);
                }

                const payload = await response.json();
                if (!payload.success) {
                    throw new Error(payload.message || 'Не удалось загрузить карточные колоды');
                }

                const decks = Array.isArray(payload.data?.decks) ? payload.data.decks : [];
                const stats = Array.isArray(payload.data?.stats) ? payload.data.stats : [];
                this.latestUpdatedAt = payload.data?.updatedAt || null;

                const normalized = this.mergeWithDefaults(decks, stats);
                this.renderDecks(normalized);
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }
                console.error('❌ CardDeckPanel: Ошибка загрузки данных колод:', error);
                this.renderError(error);
                throw error;
            } finally {
                this.setLoadingState(false);
                this.abortController = null;
            }
        }

        /**
         * Обновляет данные вручную
         */
        refresh() {
            this.loadDecks().catch((error) => {
                console.warn('⚠️ CardDeckPanel: Ошибка обновления:', error);
            });
        }

        /**
         * Формирует итоговый список колод с учётом дефолтных значений
         */
        mergeWithDefaults(decks, stats) {
            const deckMap = new Map();
            decks.forEach((deck) => {
                if (deck && deck.id) {
                    deckMap.set(deck.id, deck);
                }
            });

            const statsMap = new Map();
            stats.forEach((stat) => {
                if (stat && stat.id) {
                    statsMap.set(stat.id, stat);
                }
            });

            return DEFAULT_DECKS.map((template, index) => {
                const deck = deckMap.get(template.id) || {};
                const stat = statsMap.get(template.id) || {};
                const drawPile = Array.isArray(deck.drawPile) ? deck.drawPile : [];
                const discardPile = Array.isArray(deck.discardPile) ? deck.discardPile : [];

                return {
                    id: template.id,
                    order: index + 1,
                    name: deck.name || stat.name || template.name,
                    subtitle: deck.subtitle || stat.subtitle || template.subtitle || '',
                    drawDescription: deck.drawDescription || stat.drawDescription || template.drawDescription || '',
                    discardDescription: deck.discardDescription || stat.discardDescription || template.discardDescription || '',
                    drawCount: typeof stat.drawCount === 'number' ? stat.drawCount : drawPile.length,
                    discardCount: typeof stat.discardCount === 'number' ? stat.discardCount : discardPile.length
                };
            });
        }

        /**
         * Отображает состояние загрузки
         */
        renderLoading() {
            if (!this.container) return;
            
            // Сохраняем BankPreview если он есть
            const bankPreview = this.container.querySelector('.bank-preview-card');
            const bankPreviewHTML = bankPreview ? bankPreview.outerHTML : '';
            
            this.container.innerHTML = bankPreviewHTML + `
                <div class="card-decks-empty">Загружаем карточные колоды...</div>
            `;
        }

        /**
         * Устанавливает состояние загрузки для карточек
         */
        setLoadingState(isLoading) {
            if (!this.container) return;
            this.container.classList.toggle('is-loading', Boolean(isLoading));
            this.container.querySelectorAll('.card-deck-card').forEach((card) => {
                card.classList.toggle('loading', Boolean(isLoading));
            });
        }

        /**
         * Возвращает форматированную дату обновления
         */
        getFormattedTimestamp() {
            if (!this.latestUpdatedAt) {
                return '';
            }

            try {
                const date = new Date(this.latestUpdatedAt);
                if (Number.isNaN(date.getTime())) {
                    return '';
                }

                return date.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (_) {
                return '';
            }
        }

        /**
         * Рендер колод
         */
        renderDecks(decks = []) {
            if (!this.container) return;

            // Сохраняем BankPreview если он есть
            const bankPreview = this.container.querySelector('.bank-preview-card');
            const bankPreviewHTML = bankPreview ? bankPreview.outerHTML : '';

            if (!Array.isArray(decks) || decks.length === 0) {
                this.container.innerHTML = bankPreviewHTML + `
                    <div class="card-decks-empty">Нет доступных колод. Добавьте карточки через админку.</div>
                `;
                return;
            }

            const decksHTML = decks.map((deck) => {
                const stateClass = deck.drawCount === 0 ? ' empty' : '';
                return `
                    <article class="card-deck-card${stateClass}" data-deck-id="${deck.id}">
                        <header class="card-deck-header">
                            <div class="card-deck-title-with-metrics">
                                <span class="card-deck-title">${deck.name}</span>
                                <span class="deck-metric deck-metric--compact">
                                    <span class="deck-metric-value deck-metric-value--primary">${deck.drawCount}</span>
                                    <span class="deck-metric-separator">/</span>
                                    <span class="deck-metric-value deck-metric-value--secondary">${deck.discardCount}</span>
                                </span>
                            </div>
                            ${deck.subtitle ? `<div class="card-deck-subtitle">${deck.subtitle}</div>` : ''}
                        </header>
                    </article>
                `;
            }).join('');

            // Объединяем BankPreview и колоды карт
            this.container.innerHTML = bankPreviewHTML + decksHTML;

            // Уведомляем другие компоненты об обновлении
            if (this.eventBus) {
                this.eventBus.emit('cards:updated', { decks });
            }
        }

        /**
         * Вывод ошибки
         */
        renderError(error) {
            if (!this.container) return;
            
            // Сохраняем BankPreview если он есть
            const bankPreview = this.container.querySelector('.bank-preview-card');
            const bankPreviewHTML = bankPreview ? bankPreview.outerHTML : '';
            
            const message = error?.message || 'Не удалось загрузить карточные колоды';
            this.container.innerHTML = bankPreviewHTML + `
                <div class="card-decks-error">
                    <div>⚠️ ${message}</div>
                </div>
            `;
        }

        /**
         * Отмена текущего запроса
         */
        cancelPendingRequest() {
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
        }

        /**
         * Очистка ресурсов
         */
        destroy() {
            this.cancelPendingRequest();
            this.clearAutoRefresh();
            if (this.container) {
                this.container.removeEventListener('click', this.handleContainerClick);
            }
        }
    }

    window.CardDeckPanel = CardDeckPanel;
})();
