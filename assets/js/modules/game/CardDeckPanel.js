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
                : 120000; // Увеличиваем до 2 минут для уменьшения нагрузки

            this.container = null;
            this.abortController = null;
            this.autoRefreshTimer = null;
            this.latestUpdatedAt = null;
            this.lastKnownDecks = [];
            this.rateLimitUntil = 0;
            this.rateLimitBackoff = 0;
            this._loadDecksTimer = null;
            this._refreshTimer = null;

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
                if (error?.isRateLimit && this.lastKnownDecks.length) {
                    this.renderDecks(this.lastKnownDecks);
                } else {
                    this.renderError(error);
                }
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
                    // Дебаунсинг для предотвращения слишком частых обновлений
                    if (this._refreshTimer) {
                        clearTimeout(this._refreshTimer);
                    }
                    this._refreshTimer = setTimeout(() => {
                        this.refresh();
                    }, 5000); // Увеличена задержка до 5 секунд для предотвращения HTTP 429
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
            if (this._loadDecksTimer) {
                clearTimeout(this._loadDecksTimer);
                this._loadDecksTimer = null;
            }
            if (this._refreshTimer) {
                clearTimeout(this._refreshTimer);
                this._refreshTimer = null;
            }
        }
        
        /**
         * Очистка ресурсов
         */
        destroy() {
            this.clearAutoRefresh();
            this.cancelPendingRequest();
            this.container = null;
            this.lastKnownDecks = [];
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
            // Дебаунсинг для предотвращения множественных одновременных запросов
            if (this._loadDecksTimer) {
                clearTimeout(this._loadDecksTimer);
            }
            
            // Отменяем предыдущий запрос если он еще выполняется
            if (this.abortController) {
                this.abortController.abort();
            }
            
            if (this._isRateLimited()) {
                console.warn('⚠️ CardDeckPanel: Пропускаем загрузку — действует rate limit');
                if (this.lastKnownDecks.length) {
                    this.renderDecks(this.lastKnownDecks);
                }
                return;
            }

            this.cancelPendingRequest();
            this.setLoadingState(true);

            this.abortController = new AbortController();

            const requestInit = {
                method: 'GET',
                credentials: 'include', // Изменено с 'same-origin' для лучшей совместимости с CORS
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: this.abortController.signal
            };

            try {
                const response = await fetch(this.apiBaseUrl, requestInit);

                if (response.status === 429) {
                    const retryAfter = this._applyRateLimitFromResponse(response);
                    console.warn('⚠️ CardDeckPanel: HTTP 429, используем кэшированные данные');
                    // Не показываем ошибку пользователю, используем кэшированные данные
                    if (this.lastKnownDecks.length) {
                        this.renderDecks(this.lastKnownDecks);
                        return;
                    }
                    // Если нет кэшированных данных, создаем минимальную ошибку
                    const error = new Error(`Слишком много запросов, попробуйте позже`);
                    error.isRateLimit = true;
                    error.retryAfter = retryAfter;
                    throw error;
                }

                if (!response.ok) {
                    throw new Error(`Не удалось загрузить карточные колоды (HTTP ${response.status})`);
                }

                let payload;
                try {
                    payload = await response.json();
                } catch (jsonError) {
                    // Игнорируем AbortError при парсинге JSON
                    if (jsonError.name === 'AbortError') {
                        return; // Просто выходим, запрос был отменен
                    }
                    console.warn('⚠️ CardDeckPanel: Ошибка парсинга JSON ответа:', jsonError);
                    // Используем кэшированные данные если есть
                    if (this.lastKnownDecks.length) {
                        this.renderDecks(this.lastKnownDecks);
                        return;
                    }
                    throw new Error('Ошибка обработки ответа сервера');
                }

                if (!payload.success) {
                    throw new Error(payload.message || 'Не удалось загрузить карточные колоды');
                }

                const decks = Array.isArray(payload.data?.decks) ? payload.data.decks : [];
                const stats = Array.isArray(payload.data?.stats) ? payload.data.stats : [];
                this.latestUpdatedAt = payload.data?.updatedAt || null;

                const normalized = this.mergeWithDefaults(decks, stats);
                this.lastKnownDecks = normalized;
                this._resetRateLimit();
                this.renderDecks(normalized);
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }
                
                // Улучшенная обработка различных типов ошибок (включая CORS)
                const isNetworkError = error.message?.includes('Load failed') || 
                                     error.name === 'TypeError' ||
                                     error.message?.includes('access control checks') ||
                                     error.message?.includes('CORS') ||
                                     error.message?.includes('Failed to fetch');
                
                if (isNetworkError) {
                    console.warn('⚠️ CardDeckPanel: Сетевая/CORS ошибка, используем кэшированные данные');
                    if (this.lastKnownDecks.length) {
                        this.renderDecks(this.lastKnownDecks);
                        return;
                    }
                }
                
                // Проверяем, является ли ошибка rate limiting или сетевой проблемой
                const isRateLimitError = error?.isRateLimit || 
                                       error.message?.includes('Rate limited') ||
                                       error.message?.includes('Too many requests') ||
                                       error.message?.includes('Слишком много запросов');
                
                if (isRateLimitError) {
                    console.warn('⚠️ CardDeckPanel: Rate limit ошибка, используем кэшированные данные');
                    if (this.lastKnownDecks.length) {
                        this.renderDecks(this.lastKnownDecks);
                    }
                    return; // Не показываем ошибку пользователю при rate limiting
                }
                
                console.error('❌ CardDeckPanel: Ошибка загрузки данных колод:', error);
                if (this.lastKnownDecks.length) {
                    this.renderDecks(this.lastKnownDecks);
                } else {
                    this.renderError(error);
                }
                
                // Не пробрасываем ошибку дальше, чтобы не ломать UI
                return;
            } finally {
                this.setLoadingState(false);
                this.abortController = null;
                if (this._loadDecksTimer) {
                    clearTimeout(this._loadDecksTimer);
                    this._loadDecksTimer = null;
                }
            }
        }

        /**
         * Обновляет данные вручную
         */
        refresh() {
            if (this._isRateLimited()) {
                console.warn('⚠️ CardDeckPanel: Обновление пропущено из-за rate limit');
                return;
            }

            this.loadDecks().catch((error) => {
                if (error?.isRateLimit) {
                    console.warn(`⚠️ CardDeckPanel: Rate limit. Повторим через ${error.retryAfter || this.rateLimitBackoff}мс`);
                } else {
                    console.warn('⚠️ CardDeckPanel: Ошибка обновления:', error);
                }
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

        _isRateLimited() {
            return this.rateLimitUntil && Date.now() < this.rateLimitUntil;
        }

        _applyRateLimitFromResponse(response) {
            const retryAfterHeader = response.headers?.get?.('Retry-After') || response.headers?.get?.('retry-after');
            let retryAfterMs = 0;

            if (retryAfterHeader) {
                const seconds = Number(retryAfterHeader);
                if (!Number.isNaN(seconds)) {
                    retryAfterMs = seconds * 1000;
                }
            }

            if (!retryAfterMs) {
                this.rateLimitBackoff = this.rateLimitBackoff ? Math.min(this.rateLimitBackoff * 2, 60000) : 5000;
                retryAfterMs = this.rateLimitBackoff;
            } else {
                this.rateLimitBackoff = retryAfterMs;
            }

            this.rateLimitUntil = Date.now() + retryAfterMs;
            return retryAfterMs;
        }

        _resetRateLimit() {
            this.rateLimitBackoff = 0;
            this.rateLimitUntil = 0;
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
