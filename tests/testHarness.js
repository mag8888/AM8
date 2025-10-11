const tests = [];
const beforeEachHandlers = [];

export function beforeEach(handler) {
    if (typeof handler === 'function') {
        beforeEachHandlers.push(handler);
    }
}

export function test(name, handler) {
    tests.push({ name, handler });
}

export function getRegisteredTests() {
    return { tests, beforeEachHandlers };
}
