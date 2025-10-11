class MockClassList {
    constructor(element) {
        this.element = element;
        this.classes = new Set();
    }

    add(...classNames) {
        classNames.forEach((name) => {
            if (name) {
                this.classes.add(name);
            }
        });
    }

    remove(...classNames) {
        classNames.forEach((name) => this.classes.delete(name));
    }

    contains(name) {
        return this.classes.has(name);
    }

    toString() {
        return Array.from(this.classes).join(' ');
    }
}

class MockDocumentFragment {
    constructor() {
        this.children = [];
    }

    appendChild(node) {
        this.children.push(node);
        return node;
    }
}

class MockElement {
    constructor(tagName, documentRef) {
        this.tagName = tagName.toUpperCase();
        this.document = documentRef;
        this.children = [];
        this.parent = null;
        this.dataset = {};
        this.classList = new MockClassList(this);
        this.eventListeners = new Map();
        this.style = {};
        this.textContent = '';
        this.attributes = new Map();
        this._id = null;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
        if (value && this.document) {
            this.document.registerId(value, this);
        }
    }

    get className() {
        return this.classList.toString();
    }

    set className(value) {
        this.classList = new MockClassList(this);
        value
            .split(/\s+/)
            .filter(Boolean)
            .forEach((cls) => this.classList.add(cls));
    }

    appendChild(node) {
        if (node instanceof MockDocumentFragment) {
            node.children.forEach((child) => this.appendChild(child));
            return node;
        }
        node.parent = this;
        this.children.push(node);
        return node;
    }

    addEventListener(eventName, handler) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(handler);
    }

    removeEventListener(eventName, handler) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).delete(handler);
        }
    }

    get childElementCount() {
        return this.children.length;
    }

    set innerHTML(_) {
        this.children = [];
    }

    querySelector(selector) {
        for (const child of this.children) {
            if (matchesSelector(child, selector)) {
                return child;
            }
            const match = child.querySelector(selector);
            if (match) {
                return match;
            }
        }
        return null;
    }

    querySelectorAll(selector, accumulator = []) {
        for (const child of this.children) {
            if (matchesSelector(child, selector)) {
                accumulator.push(child);
            }
            child.querySelectorAll(selector, accumulator);
        }
        return accumulator;
    }

    closest(selector) {
        let current = this;
        while (current) {
            if (matchesSelector(current, selector)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }
}

class MockDocument {
    constructor() {
        this.body = new MockElement('body', this);
        this.elementsById = new Map();
    }

    createElement(tagName) {
        return new MockElement(tagName, this);
    }

    createDocumentFragment() {
        return new MockDocumentFragment();
    }

    querySelector(selector) {
        if (selector.startsWith('#')) {
            return this.elementsById.get(selector.slice(1)) || null;
        }
        return this.body.querySelector(selector);
    }

    querySelectorAll(selector) {
        if (selector.startsWith('#')) {
            const match = this.querySelector(selector);
            return match ? [match] : [];
        }
        return this.body.querySelectorAll(selector);
    }

    registerId(id, element) {
        this.elementsById.set(id, element);
    }
}

function matchesSelector(element, selector) {
    if (!selector) {
        return false;
    }

    if (selector.startsWith('#')) {
        return element.id === selector.slice(1);
    }

    const classMatches = selector.match(/\.[^.\[#]+/g) || [];
    const attrMatches = [...selector.matchAll(/\[([^\]]+)\]/g)];

    for (const clsSelector of classMatches) {
        const className = clsSelector.slice(1);
        if (!element.classList.contains(className)) {
            return false;
        }
    }

    for (const attrMatch of attrMatches) {
        const [attrExpression] = attrMatch;
        const [attrName, rawValue] = attrExpression
            .replace(/[\[\]"]/g, '')
            .split('=');

        if (!attrName.startsWith('data-')) {
            return false;
        }

        const datasetKey = attrName
            .replace('data-', '')
            .replace(/-([a-z])/g, (_, char) => char.toUpperCase());

        const datasetValue = element.dataset[datasetKey];
        if (datasetValue !== rawValue) {
            return false;
        }
    }

    if (classMatches.length === 0 && attrMatches.length === 0) {
        return false;
    }

    return true;
}

export function createMockDomEnvironment({
    outerCells = 44,
    innerCells = 24,
    outerCellsConfig = null,
    innerCellsConfig = null
} = {}) {
    const document = new MockDocument();
    const window = {};

    const outerTrack = document.createElement('div');
    outerTrack.id = 'outer-track';
    outerTrack.className = 'track outer-track';

    const innerTrack = document.createElement('div');
    innerTrack.id = 'inner-track';
    innerTrack.className = 'track inner-track';

    document.body.appendChild(outerTrack);
    document.body.appendChild(innerTrack);

    window.BIG_CIRCLE_CELLS =
        outerCellsConfig ||
        Array.from({ length: outerCells }, (_, index) => ({
            name: `Outer Cell ${index + 1}`,
            type: index % 2 === 0 ? 'business' : 'dream',
            icon: '🧪'
        }));

    window.SMALL_CIRCLE_CELLS =
        innerCellsConfig ||
        Array.from({ length: innerCells }, (_, index) => ({
            name: `Inner Cell ${index + 1}`,
            type: index % 2 === 0 ? 'payday' : 'market',
            icon: '🧪'
        }));

    window.getIconForType = (type, cell) => cell.icon || `:${type}:`;
    window.getIconStyleClass = () => null;

    global.window = window;
    global.document = document;

    return {
        document,
        window,
        outerTrack,
        innerTrack,
        cleanup: () => {
            delete global.window;
            delete global.document;
        }
    };
}

export { MockDocument, MockElement, MockDocumentFragment };
