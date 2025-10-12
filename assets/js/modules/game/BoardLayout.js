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
            eventBus
        } = config;

        if ((!window.SMALL_CIRCLE_CELLS && !window.BoardConfig?.SMALL_CIRCLE) || 
            (!window.BIG_CIRCLE_CELLS && !window.BoardConfig?.BIG_CIRCLE)) {
            console.error('❌ BoardLayout: Конфигурации клеток не загружены');
            throw new Error('Board config not loaded');
        }

        if (!outerTrackSelector || !innerTrackSelector) {
            throw new Error('BoardLayout requires track selectors');
        }

        this.outerTrackSelector = outerTrackSelector;
        this.innerTrackSelector = innerTrackSelector;
        this.gameState = gameState || null;
        this.eventBus = eventBus || null;

        this.outerCellsConfig = window.BIG_CIRCLE_CELLS || window.BoardConfig?.BIG_CIRCLE;
        this.innerCellsConfig = window.SMALL_CIRCLE_CELLS || window.BoardConfig?.SMALL_CIRCLE;

        this.outerTrackElement = null;
        this.innerTrackElement = null;

        this.highlightTimers = new Map();

        this.boundHandleDelegatedClick = this.handleDelegatedClick.bind(this);
        this.boundHandlePlayerMoved = this.handlePlayerMoved.bind(this);
        this.boundHandleGameStarted = this.handleGameStarted.bind(this);
        this.boundHandleResize = this.positionCells.bind(this);

        this.ensureTrackElements();
        this.attachTrackListeners();
        this.setupEventBusListeners();
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('resize', this.boundHandleResize, { passive: true });
        }

        console.log(
            `🔍 BoardLayout: Config loaded - SMALL: ${this.innerCellsConfig.length} BIG: ${this.outerCellsConfig.length}`
        );

        // Рендерим доску сразу при инициализации
        this.renderTracks();
    }

    /**
     * Render both outer and inner tracks.
     */
    renderTracks() {
        console.log('🎯 BoardLayout: renderTracks called');
        this.ensureTrackElements();

        if (!this.outerTrackElement || !this.innerTrackElement) {
            console.error('❌ BoardLayout: Track elements not found - render aborted');
            console.error('❌ BoardLayout: outerTrackElement:', !!this.outerTrackElement);
            console.error('❌ BoardLayout: innerTrackElement:', !!this.innerTrackElement);
            return;
        }
        
        console.log('✅ BoardLayout: Track elements found, starting render');

        this.attachTrackListeners();

        const outerFragment = document.createDocumentFragment();
        const innerFragment = document.createDocumentFragment();

        this.outerTrackElement.innerHTML = '';
        this.innerTrackElement.innerHTML = '';

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
        console.log(`✅ BoardLayout: ${total} клеток отрисовано`);

        this.positionCells();
    }

    /**
     * Create a single cell element for the board.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {HTMLElement|null}
     */
    createCell(position, isInner) {
        console.log(`🎯 BoardLayout: Creating cell ${position} isInner: ${isInner}`);

        const cellsConfig = isInner ? this.innerCellsConfig : this.outerCellsConfig;
        const cellData = cellsConfig[position];

        if (!cellData) {
            console.error(
                `❌ BoardLayout: Cell config missing for position ${position} (isInner: ${isInner})`
            );
            return null;
        }

        const type = cellData.type || 'unknown';
        const icon =
            typeof window.getIconForType === 'function'
                ? window.getIconForType(type, cellData)
                : cellData.icon || '?';

        console.log(
            `🔍 BoardLayout: Cell data - ${cellData.name || 'N/A'} ${type} ${icon || '?'}`
        );

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
        numberElement.textContent = String(position + 1);

        const iconElement = document.createElement('div');
        iconElement.className = 'cell-icon';
        iconElement.textContent = icon || '';

        cell.appendChild(numberElement);
        cell.appendChild(iconElement);

        const shouldDisplayDreamHeart = !isInner && type === 'dream';
        if (shouldDisplayDreamHeart) {
            const heart = document.createElement('div');
            heart.className = 'dream-heart';
            heart.textContent = '❤️';
            cell.appendChild(heart);
        }

        return cell;
    }

    /**
     * Calculate polar positions for outer and inner track cells to match board layout.
     */
    positionCells() {
        this.ensureTrackElements();

        if (!this.outerTrackElement || !this.innerTrackElement) {
            return;
        }

        const outerCells = Array.from(this.outerTrackElement.children);
        const innerCells = Array.from(this.innerTrackElement.children);

        if (outerCells.length === 0 && innerCells.length === 0) {
            return;
        }

        const supportsLayout =
            typeof this.outerTrackElement.getBoundingClientRect === 'function' &&
            typeof window !== 'undefined' &&
            typeof window.requestAnimationFrame === 'function';

        if (!supportsLayout) {
            return;
        }

        window.requestAnimationFrame(() => {
            const outerRect = this.outerTrackElement.getBoundingClientRect();
            const firstOuterCell = outerCells[0];

            if (!firstOuterCell || typeof firstOuterCell.getBoundingClientRect !== 'function') {
                return;
            }

            const outerCellRect = firstOuterCell.getBoundingClientRect();
            const baseOuterRadius =
                Math.min(outerRect.width, outerRect.height) / 2 -
                outerCellRect.width / 2 -
                6;
            const outerRadius = Math.max(baseOuterRadius, 0);

            outerCells.forEach((cell, index) => {
                this.positionOuterCellOnPerimeter({
                    cell,
                    index,
                    total: outerCells.length,
                    boardSize: Math.min(outerRect.width, outerRect.height)
                });
                cell.style.zIndex = String(100 + index);
            });

            const innerRect = this.innerTrackElement.getBoundingClientRect();
            const firstInnerCell = innerCells[0];
            const innerCellRect =
                firstInnerCell && typeof firstInnerCell.getBoundingClientRect === 'function'
                    ? firstInnerCell.getBoundingClientRect()
                    : outerCellRect;

            const computedInnerRadius =
                Math.min(innerRect.width, innerRect.height) / 2 -
                innerCellRect.width / 2 -
                6;
            const fallbackInnerRadius = outerRadius * 0.88;
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

        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('cell:clicked', {
                position,
                isInner,
                cellData
            });
        }

        if (cellData.name) {
            console.log(
                `ℹ️ BoardLayout: Cell clicked -> ${cellData.name} (${cellData.type})`
            );
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
     * Ensure track elements exist and cache them.
     */
    ensureTrackElements() {
        if (!this.outerTrackElement) {
            this.outerTrackElement = document.querySelector(this.outerTrackSelector);
            console.log('🔍 BoardLayout: outerTrackElement found:', !!this.outerTrackElement, this.outerTrackSelector);
        }
        if (!this.innerTrackElement) {
            this.innerTrackElement = document.querySelector(this.innerTrackSelector);
            console.log('🔍 BoardLayout: innerTrackElement found:', !!this.innerTrackElement, this.innerTrackSelector);
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

        this.eventBus.on('player:moved', this.boundHandlePlayerMoved);
        this.eventBus.on('game:started', this.boundHandleGameStarted);
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
     * Build a unique key used for highlight timers.
     * @param {number} position
     * @param {boolean} isInner
     * @returns {string}
     */
    getHighlightKey(position, isInner) {
        return `${isInner ? 'inner' : 'outer'}-${position}`;
    }
}

// Экспортируем в глобальную область для совместимости в браузере
if (typeof window !== 'undefined') {
    window.BoardLayout = BoardLayout;
}
