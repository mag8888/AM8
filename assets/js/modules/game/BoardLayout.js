/**
 * BoardLayout v1.0.0
 * -----------------------------------------------------------------------------
 * Responsible for rendering the game board outer and inner tracks.
 */
class BoardLayout {
    /**
     * @param {Object} config
     * @param {string} config.outerTrackSelector
     * @param {string} config.innerTrackSelector
     * @param {Object} config.gameState
     * @param {Object} config.eventBus
     */
    constructor(config = {}) {
        const {
            outerTrackSelector,
            innerTrackSelector,
            gameState,
            eventBus,
            logger = null,
            debug = false
        } = config;

        if ((!window.SMALL_CIRCLE_CELLS && !window.BoardConfig?.SMALL_CIRCLE) || 
            (!window.BIG_CIRCLE_CELLS && !window.BoardConfig?.BIG_CIRCLE)) {
            this._error('Конфигурации клеток не загружены');
            throw new Error('Board config not loaded');
        }

        if (!outerTrackSelector || !innerTrackSelector) {
            throw new Error('BoardLayout requires track selectors');
        }

        const globalConfig = typeof window !== 'undefined' ? window.config : null;
        const debugFlag = typeof debug === 'boolean'
            ? debug
            : globalConfig?.get?.('logging.boardLayoutDebug', false);

        this.outerTrackSelector = outerTrackSelector;
        this.innerTrackSelector = innerTrackSelector;
        this.gameState = gameState || null;
        this.eventBus = eventBus || null;
        this.logger = logger || window.logger || null;
        this.debugEnabled = Boolean(debugFlag);

        this.outerCellsConfig = window.BIG_CIRCLE_CELLS || window.BoardConfig?.BIG_CIRCLE;
        this.innerCellsConfig = window.SMALL_CIRCLE_CELLS || window.BoardConfig?.SMALL_CIRCLE;

        this.outerTrackElement = null;
        this.innerTrackElement = null;

        this.cellCentersCache = {
            outer: [],
            inner: []
        };
        this.trackRectCache = {
            outer: null,
            inner: null
        };
        this.pendingPositionFrame = null;
        this._lastOuterRadius = 0;

        this.highlightTimers = new Map();
        this.eventSubscriptions = [];
        this.boundHandleDelegatedClick = this.handleDelegatedClick.bind(this);
        this.boundHandlePlayerMoved = this.handlePlayerMoved.bind(this);
        this.boundHandleGameStarted = this.handleGameStarted.bind(this);
        this.boundHandlePlayersUpdated = this.handlePlayersUpdated.bind(this);
        this.boundHandleResize = this.positionCells.bind(this);
        this.isDestroyed = false;

        // Инициализируем попап для клеток
        this.cellPopup = null;

        this.ensureTrackElements();
        this.attachTrackListeners();
        this.setupEventBusListeners();
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('resize', this.boundHandleResize, { passive: true });
        }

        this._debug(
            `Config loaded - SMALL: ${this.innerCellsConfig.length} BIG: ${this.outerCellsConfig.length}`
        );

        // Рендерим доску сразу при инициализации
        this.renderTracks();
    }

    /**
     * Render both outer and inner tracks.
     */
    renderTracks() {
        this._debug('renderTracks called');
        this.ensureTrackElements();
        this.invalidateCellCaches();

        if (!this.outerTrackElement || !this.innerTrackElement) {
            this._error('Track elements not found - render aborted', {
                outerTrackFound: Boolean(this.outerTrackElement),
                innerTrackFound: Boolean(this.innerTrackElement)
            });
            return;
        }
        
        this._debug('Track elements found, starting render');

        this.attachTrackListeners();

        const outerFragment = document.createDocumentFragment();
        const innerFragment = document.createDocumentFragment();

        // Оптимизация: очищаем через removeChild вместо innerHTML для ускорения
        while (this.outerTrackElement.firstChild) {
            this.outerTrackElement.removeChild(this.outerTrackElement.firstChild);
        }
        while (this.innerTrackElement.firstChild) {
            this.innerTrackElement.removeChild(this.innerTrackElement.firstChild);
        }

        for (let i = 0; i < this.outerCellsConfig.length; i += 1) {
            const cell = this.createCell(i, false);
            if (cell) {
                outerFragment.appendChild(cell);
            }
        }

        for (let i = 0; i < this.innerCellsConfig.length; i += 1) {
            const cell = this.createCell(i, true);
            if (cell) {
                innerFragment.appendChild(cell);
            }
        }

        this.outerTrackElement.appendChild(outerFragment);
        this.innerTrackElement.appendChild(innerFragment);

        const total =
            this.outerTrackElement.childElementCount +
            this.innerTrackElement.childElementCount;
        this._debug(`${total} клеток отрисовано`);

        this.positionCells();
    }

    /**
     * Create a single cell element for the board.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {HTMLElement|null}
     */
    createCell(position, isInner) {
        this._debug(`Creating cell ${position} isInner: ${isInner}`);

        const cellsConfig = isInner ? this.innerCellsConfig : this.outerCellsConfig;
        const cellData = cellsConfig[position];

        if (!cellData) {
            this._error(`Cell config missing for position ${position}`, { isInner });
            return null;
        }

        const type = cellData.type || 'unknown';
        const icon =
            typeof window.getIconForType === 'function'
                ? window.getIconForType(type, cellData)
                : cellData.icon || '?';

        this._debug(`Cell data - ${cellData.name || 'N/A'} ${type} ${icon || '?'}`);

        const cell = document.createElement('div');
        cell.classList.add('track-cell', `cell-${type}`);
        if (typeof window.getIconStyleClass === 'function') {
            const styleClass = window.getIconStyleClass(type, cellData);
            if (styleClass) {
                cell.classList.add(styleClass);
            }
        }
        cell.dataset.position = String(position);
        cell.dataset.isInner = String(isInner);

        const numberElement = document.createElement('div');
        numberElement.className = 'cell-number';
        // Используем явный идентификатор клетки из конфигурации,
        // чтобы избежать пересечений нумерации между кругами
        const displayId = typeof cellData.id === 'number' ? cellData.id : (position + 1);
        numberElement.textContent = String(displayId);
        // Атрибут для логики перемещений/подсветки
        cell.dataset.cellId = String(displayId);

        const iconElement = document.createElement('div');
        iconElement.className = 'cell-icon';
        iconElement.textContent = icon || '';

        cell.appendChild(numberElement);
        cell.appendChild(iconElement);

        // Показываем сердечко только если эта мечта выбрана кем-то из игроков
        const shouldDisplayDreamHeart = !isInner && type === 'dream' && this.isDreamSelectedByPlayer(position);
        if (shouldDisplayDreamHeart) {
            const heart = document.createElement('div');
            heart.className = 'dream-heart';
            heart.textContent = '❤️';
            cell.appendChild(heart);
        }

        return cell;
    }

    /**
     * Проверяет, выбрана ли мечта на данной позиции кем-то из игроков
     * @param {number} position - Позиция клетки
     * @returns {boolean}
     */
    isDreamSelectedByPlayer(position) {
        if (!this.gameState || !this.gameState.players) {
            return false;
        }
        
        // Получаем данные клетки мечты
        const dreamCellData = this.outerCellsConfig[position];
        if (!dreamCellData || dreamCellData.type !== 'dream') {
            return false;
        }
        
        // Проверяем, есть ли у игроков выбранная мечта
        return this.gameState.players.some(player => {
            if (player.dream && player.dream.id) {
                this._debug(`Игрок ${player.username} выбрал мечту: ${player.dream.id}`);
                return true;
            }
            return false;
        });
    }

    /**
     * Обновляет отображение сердечек на мечтах в зависимости от выбранных игроками мечт
     */
    updateDreamHearts() {
        if (!this.outerTrackElement) return;
        
        const dreamCells = this.outerTrackElement.querySelectorAll('.track-cell.cell-dream');
        dreamCells.forEach(cell => {
            const position = parseInt(cell.dataset.position);
            const heart = cell.querySelector('.dream-heart');
            const shouldShowHeart = this.isDreamSelectedByPlayer(position);
            
            if (shouldShowHeart && !heart) {
                // Добавляем сердечко
                const heartElement = document.createElement('div');
                heartElement.className = 'dream-heart';
                heartElement.textContent = '❤️';
                cell.appendChild(heartElement);
                this._debug(`Добавлено сердечко на позицию ${position}`);
            } else if (!shouldShowHeart && heart) {
                // Убираем сердечко
                heart.remove();
                this._debug(`Убрано сердечко с позиции ${position}`);
            }
        });
    }

    /**
     * Calculate polar positions for outer and inner track cells to match board layout.
     */
    positionCells() {
        this.ensureTrackElements();

        const outerCells = this.outerTrackElement
            ? Array.from(this.outerTrackElement.children)
            : [];
        const innerCells = this.innerTrackElement
            ? Array.from(this.innerTrackElement.children)
            : [];

        if (outerCells.length === 0 && innerCells.length === 0) {
            this.invalidateCellCaches();
            return;
        }

        const supportsLayout =
            typeof window !== 'undefined' &&
            typeof window.requestAnimationFrame === 'function' &&
            (!this.outerTrackElement ||
                typeof this.outerTrackElement.getBoundingClientRect === 'function') &&
            (!this.innerTrackElement ||
                typeof this.innerTrackElement.getBoundingClientRect === 'function');

        if (!supportsLayout) {
            this.invalidateCellCaches();
            return;
        }

        if (this.pendingPositionFrame) {
            cancelAnimationFrame(this.pendingPositionFrame);
            this.pendingPositionFrame = null;
        }

        this.pendingPositionFrame = window.requestAnimationFrame(() => {
            this.pendingPositionFrame = null;

            if (this.outerTrackElement && outerCells.length) {
                const outerRect = this.outerTrackElement.getBoundingClientRect();
                const firstOuterCell = outerCells[0];
                if (!firstOuterCell || typeof firstOuterCell.getBoundingClientRect !== 'function') {
                    this.cellCentersCache.outer = [];
                    this.trackRectCache.outer = null;
                    this._lastOuterRadius = 0;
                } else {
                    const outerCellRect = firstOuterCell.getBoundingClientRect();
                    const boardSize = Math.min(outerRect.width, outerRect.height);
                    const baseOuterRadius =
                        boardSize / 2 - outerCellRect.width / 2 - 6;
                    const outerRadius = Math.max(baseOuterRadius, 0);

                    outerCells.forEach((cell, index) => {
                        this.positionOuterCellOnPerimeter({
                            cell,
                            index,
                            total: outerCells.length,
                            boardSize
                        });
                        cell.style.zIndex = String(100 + index);
                    });

                    this.trackRectCache.outer = this._snapshotRect(outerRect);
                    const outerCenters = this._computeCellCenters(
                        outerCells,
                        outerRect
                    );
                    this._info('📊 Outer cells centers computed', {
                        cellsCount: outerCells.length,
                        centersCount: outerCenters.length,
                        sampleCenters: outerCenters.slice(0, 3)
                    });
                    this.cellCentersCache.outer = outerCenters;

                    // Используем радиус внешнего круга как базу для внутреннего
                    this._lastOuterRadius = outerRadius;
                }
            } else {
                this.cellCentersCache.outer = [];
                this.trackRectCache.outer = null;
                this._lastOuterRadius = 0;
            }

            if (this.innerTrackElement && innerCells.length) {
                const innerRect = this.innerTrackElement.getBoundingClientRect();
                const firstInnerCell = innerCells[0];
                const referenceCell = firstInnerCell && typeof firstInnerCell.getBoundingClientRect === 'function'
                    ? firstInnerCell.getBoundingClientRect()
                    : (outerCells.length > 0 ? outerCells[0].getBoundingClientRect() : null);

                // Уменьшаем радиус внутреннего круга чтобы не накладывался на внешние клетки
                // Внешние клетки находятся на периметре квадрата, внутренние должны быть внутри
                // Рассчитываем безопасный радиус: внешний радиус минус размер клетки и отступ
                const cellSize = referenceCell ? referenceCell.width : 50;
                const safeInnerRadius = this._lastOuterRadius
                    ? Math.max(this._lastOuterRadius - cellSize - 20, 0) // Отступ от внешних клеток
                    : Math.min(innerRect.width, innerRect.height) / 2 - cellSize / 2 - 20;
                
                const fallbackInnerRadius = Math.max(
                    safeInnerRadius,
                    Math.min(innerRect.width, innerRect.height) / 2 - cellSize / 2 - 20,
                    0
                );
                const computedInnerRadius =
                    referenceCell
                        ? Math.min(
                            Math.min(innerRect.width, innerRect.height) / 2 - cellSize / 2 - 20,
                            safeInnerRadius
                          )
                        : fallbackInnerRadius;
                const innerRadius = Math.max(
                    Number.isFinite(computedInnerRadius) ? computedInnerRadius : fallbackInnerRadius,
                    0
                );

                innerCells.forEach((cell, index) => {
                    this.positionCellAtAngle({
                        cell,
                        index,
                        total: innerCells.length,
                        radius: innerRadius
                    });
                    cell.style.zIndex = String(200 + index);
                });

                this.trackRectCache.inner = this._snapshotRect(innerRect);
                const innerCenters = this._computeCellCenters(
                    innerCells,
                    innerRect
                );
                this._info('📊 Inner cells centers computed', {
                    cellsCount: innerCells.length,
                    centersCount: innerCenters.length,
                    sampleCenters: innerCenters.slice(0, 3)
                });
                this.cellCentersCache.inner = innerCenters;
            } else {
                this.cellCentersCache.inner = [];
                this.trackRectCache.inner = null;
            }

            this._emitCellsPositioned();
        });
    }

    /**
     * Position outer cells on a square perimeter.
     * @param {Object} params
     * @param {HTMLElement} params.cell
     * @param {number} params.index
     * @param {number} params.total
     * @param {number} params.boardSize
     */
    positionOuterCellOnPerimeter({ cell, index, total, boardSize }) {
        if (!cell || total <= 0) {
            return;
        }

        // Calculate positions for 44 cells on square perimeter
        const sideLength = Math.floor(total / 4); // 11 cells per side
        const cellSize = 50; // Approximate cell size
        const margin = cellSize / 2;
        
        let x, y;
        
        if (index < sideLength) {
            // Top side (0-10)
            x = margin + (index / sideLength) * (boardSize - cellSize);
            y = margin;
        } else if (index < sideLength * 2) {
            // Right side (11-21)
            x = boardSize - margin;
            y = margin + ((index - sideLength) / sideLength) * (boardSize - cellSize);
        } else if (index < sideLength * 3) {
            // Bottom side (22-32, right to left)
            x = boardSize - margin - ((index - sideLength * 2) / sideLength) * (boardSize - cellSize);
            y = boardSize - margin;
        } else {
            // Left side (33-43, bottom to top)
            x = margin;
            y = boardSize - margin - ((index - sideLength * 3) / sideLength) * (boardSize - cellSize);
        }
        
        cell.style.left = `${x}px`;
        cell.style.top = `${y}px`;
        cell.style.transform = 'translate(-50%, -50%)';
        cell.style.setProperty('--cell-index', index);
    }

    /**
     * Position a single cell at a specified angle on the track.
     * @param {Object} params
     * @param {HTMLElement} params.cell
     * @param {number} params.index
     * @param {number} params.total
     * @param {number} params.radius
     */
    positionCellAtAngle({ cell, index, total, radius }) {
        if (!cell || total <= 0) {
            return;
        }

        const angle = (360 / total) * index;
        cell.style.left = '50%';
        cell.style.top = '50%';
        cell.style.transformOrigin = 'center center';
        cell.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`;
        cell.style.setProperty('--cell-index', index);
        cell.style.setProperty('--cell-count', total);
        cell.style.setProperty('--cell-angle', `${angle}deg`);
    }

    /**
     * Handle a click on a specific cell.
     * @param {number} position
     * @param {boolean} isInner
     */
    handleCellClick(position, isInner) {
        const cellData = this.getCellConfig(position, isInner);
        if (!cellData) {
            return;
        }

        // Инициализируем попап если еще не создан
        if (!this.cellPopup) {
            const PopupConstructor = typeof CellPopup === 'function'
                ? CellPopup
                : (typeof window !== 'undefined' ? window.CellPopup : null);
            if (typeof PopupConstructor !== 'function') {
                this._warn('CellPopup constructor is not available');
                return;
            }
            this.cellPopup = new PopupConstructor({
                eventBus: this.eventBus
            });
        }

        // Показываем попап с информацией о клетке
        this.cellPopup.show(cellData, position, isInner);

        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('cell:clicked', {
                position,
                isInner,
                cellData
            });
        }

        if (cellData.name) {
            this._debug(`Cell clicked -> ${cellData.name} (${cellData.type})`);
        }
    }

    /**
     * Highlight a cell for a short duration.
     * @param {number} position
     * @param {boolean} isInner
     */
    highlightCell(position, isInner) {
        const cell = this.getCellElement(position, isInner);
        if (!cell) {
            return;
        }

        const key = this.getHighlightKey(position, isInner);
        if (this.highlightTimers.has(key)) {
            clearTimeout(this.highlightTimers.get(key));
        }

        cell.classList.add('highlighted');

        const timeoutId = setTimeout(() => {
            cell.classList.remove('highlighted');
            this.highlightTimers.delete(key);
        }, 2000);

        this.highlightTimers.set(key, timeoutId);
    }

    /**
     * Remove highlight state from all cells.
     */
    clearHighlights() {
        const highlightedCells = document.querySelectorAll('.track-cell.highlighted');
        highlightedCells.forEach((cell) => cell.classList.remove('highlighted'));

        this.highlightTimers.forEach((timeoutId) => clearTimeout(timeoutId));
        this.highlightTimers.clear();
    }

    /**
     * Handle delegated click for track containers.
     * @param {MouseEvent} event
     */
    handleDelegatedClick(event) {
        const target = event.target.closest('.track-cell');
        if (!target) {
            return;
        }

        const position = Number(target.dataset.position);
        const isInner = target.dataset.isInner === 'true';
        this.handleCellClick(position, isInner);
    }

    /**
     * React to player movement events if provided.
     * @param {Object} payload
     */
    handlePlayerMoved(payload = {}) {
        if (
            typeof payload.position !== 'number' ||
            typeof payload.isInner !== 'boolean'
        ) {
            return;
        }

        this.highlightCell(payload.position, payload.isInner);
    }

    /**
     * React to game start event by rendering tracks.
     */
    handleGameStarted() {
        this.renderTracks();
    }

    /**
     * Handle players updated event
     */
    handlePlayersUpdated(data) {
        this._debug('Игроки обновлены, обновляем сердечки мечт');
        this.updateDreamHearts();
    }

    /**
     * Ensure track elements exist and cache them.
     */
    ensureTrackElements() {
        if (!this.outerTrackElement) {
            this.outerTrackElement = document.querySelector(this.outerTrackSelector);
            this._debug('outerTrackElement lookup result', {
                found: Boolean(this.outerTrackElement),
                selector: this.outerTrackSelector
            });
        }
        if (!this.innerTrackElement) {
            this.innerTrackElement = document.querySelector(this.innerTrackSelector);
            this._debug('innerTrackElement lookup result', {
                found: Boolean(this.innerTrackElement),
                selector: this.innerTrackSelector
            });
        }
    }

    /**
     * Attach click listeners to track elements if not already attached.
     */
    attachTrackListeners() {
        this.ensureTrackElements();

        if (this.outerTrackElement) {
            this.outerTrackElement.removeEventListener(
                'click',
                this.boundHandleDelegatedClick
            );
            this.outerTrackElement.addEventListener(
                'click',
                this.boundHandleDelegatedClick
            );
        }

        if (this.innerTrackElement) {
            this.innerTrackElement.removeEventListener(
                'click',
                this.boundHandleDelegatedClick
            );
            this.innerTrackElement.addEventListener(
                'click',
                this.boundHandleDelegatedClick
            );
        }
    }

    /**
     * Setup event bus listeners when an event bus is available.
     */
    setupEventBusListeners() {
        if (!this.eventBus || typeof this.eventBus.on !== 'function') {
            return;
        }

        const offPlayerMoved = this.eventBus.on('player:moved', this.boundHandlePlayerMoved);
        const offGameStarted = this.eventBus.on('game:started', this.boundHandleGameStarted);
        const offPlayersUpdated = this.eventBus.on('game:playersUpdated', this.boundHandlePlayersUpdated);

        [offPlayerMoved, offGameStarted, offPlayersUpdated].forEach((unsubscribe) => {
            if (typeof unsubscribe === 'function') {
                this.eventSubscriptions.push(unsubscribe);
            }
        });
    }

    /**
     * Retrieve cell configuration data.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {Object|null}
     */
    getCellConfig(position, isInner) {
        const cellsConfig = isInner ? this.innerCellsConfig : this.outerCellsConfig;
        return cellsConfig[position] || null;
    }

    /**
     * Retrieve a cell DOM element.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {HTMLElement|null}
     */
    getCellElement(position, isInner) {
        this.ensureTrackElements();
        const selector = `.track-cell[data-position="${position}"][data-is-inner="${isInner}"]`;
        const searchRoot = isInner ? this.innerTrackElement : this.outerTrackElement;
        if (!searchRoot) {
            return null;
        }
        return searchRoot.querySelector(selector);
    }

    /**
     * Invalidate cached cell positions.
     */
    invalidateCellCaches() {
        this.cellCentersCache.outer = [];
        this.cellCentersCache.inner = [];
        this.trackRectCache.outer = null;
        this.trackRectCache.inner = null;
        this._lastOuterRadius = 0;
    }

    /**
     * Retrieve cached cell center coordinates.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {{x:number,y:number,width:number,height:number}|null}
     */
    getCellCenter(position, isInner) {
        const cache = isInner ? this.cellCentersCache.inner : this.cellCentersCache.outer;
        const result = cache?.[position] || null;
        this._debug('getCellCenter', {
            position,
            isInner,
            cacheExists: !!cache,
            cacheLength: Array.isArray(cache) ? cache.length : 'not array',
            cacheKeys: cache ? Object.keys(cache).slice(0, 10) : [],
            result
        });
        return result;
    }

    /**
     * Retrieve all cached centers for a track.
     * @param {boolean} isInner
     * @returns {Array}
     */
    getCellCenters(isInner) {
        const cache = isInner ? this.cellCentersCache.inner : this.cellCentersCache.outer;
        return Array.isArray(cache) ? cache.slice() : [];
    }

    /**
     * Retrieve cached track rect.
     * @param {boolean} isInner
     * @returns {{width:number,height:number,left:number,top:number}|null}
     */
    getTrackRect(isInner) {
        return isInner ? this.trackRectCache.inner : this.trackRectCache.outer;
    }

    /**
     * Build a unique key used for highlight timers.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {string}
     */
    getHighlightKey(position, isInner) {
        return `${isInner ? 'inner' : 'outer'}-${position}`;
    }

    _computeCellCenters(cells, containerRect) {
        if (!containerRect) {
            return [];
        }
        // Создаем объект для хранения координат по позициям
        const centersByPosition = {};
        
        cells.forEach((cell) => {
            if (!cell || typeof cell.getBoundingClientRect !== 'function') {
                return;
            }
            
            // Получаем позицию из data-position
            const position = parseInt(cell.dataset.position);
            if (isNaN(position)) {
                this._warn('Клетка без data-position', { cell });
                return;
            }
            
            const rect = cell.getBoundingClientRect();
            centersByPosition[position] = {
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top + rect.height / 2,
                width: rect.width,
                height: rect.height
            };
        });
        
        // Преобразуем объект в массив, где индекс соответствует позиции
        // Находим максимальную позицию
        const maxPosition = Math.max(...Object.keys(centersByPosition).map(Number), -1);
        if (maxPosition < 0) {
            return [];
        }
        
        // Создаем массив с правильной индексацией
        const centersArray = [];
        for (let i = 0; i <= maxPosition; i++) {
            centersArray[i] = centersByPosition[i] || null;
        }
        
        this._debug('_computeCellCenters завершен', {
            cellsCount: cells.length,
            centersByPositionCount: Object.keys(centersByPosition).length,
            maxPosition,
            centersArrayLength: centersArray.length,
            samplePositions: Object.keys(centersByPosition).slice(0, 5).map(p => ({
                position: p,
                coords: centersByPosition[p]
            }))
        });
        
        return centersArray;
    }

    _snapshotRect(rect) {
        if (!rect) {
            return null;
        }
        return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top
        };
    }

    _emitCellsPositioned() {
        if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
            return;
        }
        this.eventBus.emit('board:cellsPositioned', {
            outer: this.cellCentersCache.outer.slice(),
            inner: this.cellCentersCache.inner.slice(),
            outerTrackRect: this.trackRectCache.outer,
            innerTrackRect: this.trackRectCache.inner,
            timestamp: Date.now()
        });
    }

    /**
     * Детачим кликовые обработчики с дорожек.
     */
    detachTrackListeners() {
        if (this.outerTrackElement) {
            this.outerTrackElement.removeEventListener('click', this.boundHandleDelegatedClick);
        }
        if (this.innerTrackElement) {
            this.innerTrackElement.removeEventListener('click', this.boundHandleDelegatedClick);
        }
    }

    /**
     * Безопасно удаляет подписки на события.
     */
    _removeEventBusListeners() {
        if (!this.eventSubscriptions.length) {
            return;
        }
        this.eventSubscriptions.forEach((unsubscribe) => {
            try {
                unsubscribe();
            } catch (error) {
                this._warn('Failed to unsubscribe from event bus listener', error);
            }
        });
        this.eventSubscriptions = [];
    }

    /**
     * Очищает таймеры подсветки.
     */
    _clearHighlightTimers() {
        for (const timeoutId of this.highlightTimers.values()) {
            clearTimeout(timeoutId);
        }
        this.highlightTimers.clear();
    }

    /**
     * Уничтожает модуль и освобождает ресурсы.
     */
    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        if (this.pendingPositionFrame) {
            cancelAnimationFrame(this.pendingPositionFrame);
            this.pendingPositionFrame = null;
        }

        this.detachTrackListeners();
        if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
            window.removeEventListener('resize', this.boundHandleResize);
        }
        this._removeEventBusListeners();
        this._clearHighlightTimers();
        this.invalidateCellCaches();

        if (this.cellPopup) {
            try {
                if (typeof this.cellPopup.destroy === 'function') {
                    this.cellPopup.destroy();
                } else if (typeof this.cellPopup.hide === 'function') {
                    this.cellPopup.hide();
                }
            } catch (error) {
                this._warn('Failed to teardown cell popup', error);
            }
        }

        this._debug('BoardLayout destroyed');
    }

    /**
     * Унифицированный логгер.
     * @param {'debug'|'info'|'warn'|'error'} level
     * @param {string} message
     * @param {Object|Error} [meta]
     */
    _log(level, message, meta) {
        const logger = this.logger;
        if (logger && typeof logger[level] === 'function') {
            try {
                logger[level](message, meta ?? null, 'BoardLayout');
                return;
            } catch (loggerError) {
                // fall through to console logging
                console.warn('[BoardLayout] Logger call failed', loggerError);
            }
        }

        const consoleFn = console[level] || console.log;
        if (meta !== undefined) {
            consoleFn(`[BoardLayout] ${message}`, meta);
        } else {
            consoleFn(`[BoardLayout] ${message}`);
        }
    }

    _debug(message, meta) {
        if (!this.debugEnabled) {
            return;
        }
        this._log('debug', message, meta);
    }

    _info(message, meta) {
        this._log('info', message, meta);
    }

    _warn(message, meta) {
        this._log('warn', message, meta);
    }

    _error(message, meta) {
        this._log('error', message, meta);
    }
}

// Экспортируем в глобальную область для совместимости в браузере
if (typeof window !== 'undefined') {
    window.BoardLayout = BoardLayout;
}
