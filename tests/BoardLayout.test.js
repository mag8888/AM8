import assert from 'node:assert';
import BoardLayout from '../assets/js/modules/game/BoardLayout.js';
import { beforeEach, test } from './testHarness.js';
import { createMockDomEnvironment } from './helpers/mockDom.js';

let cleanupEnv = null;

function setupEnvironment(options) {
    if (cleanupEnv) {
        cleanupEnv();
        cleanupEnv = null;
    }
    const env = createMockDomEnvironment(options);
    cleanupEnv = env.cleanup;
    return env;
}

beforeEach(() => {
    if (cleanupEnv) {
        cleanupEnv();
        cleanupEnv = null;
    }
});

test('renderTracks создаёт 44 внешних и 24 внутренних клетки', () => {
    const { outerTrack, innerTrack } = setupEnvironment();

    const layout = new BoardLayout({
        outerTrackSelector: '#outer-track',
        innerTrackSelector: '#inner-track',
        gameState: null,
        eventBus: createEventBusStub()
    });

    layout.renderTracks();

    assert.strictEqual(
        outerTrack.childElementCount,
        44,
        'Ожидалось 44 клетки на внешнем треке'
    );
    assert.strictEqual(
        innerTrack.childElementCount,
        24,
        'Ожидалось 24 клетки на внутреннем треке'
    );
});

test('createCell добавляет сердечко только для внешних dream-клеток', () => {
    const outerCellsConfig = [
        { name: 'Outer Dream', type: 'dream', icon: '🌟' }
    ];
    const innerCellsConfig = [{ name: 'Inner Dream', type: 'dream', icon: '🌟' }];

    setupEnvironment({
        outerCells: 1,
        innerCells: 1,
        outerCellsConfig,
        innerCellsConfig
    });

    const layout = new BoardLayout({
        outerTrackSelector: '#outer-track',
        innerTrackSelector: '#inner-track',
        gameState: null,
        eventBus: createEventBusStub()
    });

    const outerDreamCell = layout.createCell(0, false);
    const innerDreamCell = layout.createCell(0, true);

    assert.ok(
        outerDreamCell.children.some((child) => child.classList.contains('dream-heart')),
        'Внешняя dream-клетка должна содержать сердечко'
    );
    assert.ok(
        !innerDreamCell.children.some((child) => child.classList.contains('dream-heart')),
        'Внутренняя dream-клетка не должна содержать сердечко'
    );
});

test('handleCellClick эмитит событие cell:clicked с данными клетки', () => {
    const outerCellsConfig = [
        { name: 'Outer Dream', type: 'dream', icon: '🌟' },
        { name: 'Outer Money', type: 'money', icon: '💰' }
    ];

    setupEnvironment({
        outerCells: outerCellsConfig.length,
        innerCells: 1,
        outerCellsConfig
    });

    const eventBus = createEventBusStub();

    const layout = new BoardLayout({
        outerTrackSelector: '#outer-track',
        innerTrackSelector: '#inner-track',
        gameState: null,
        eventBus
    });

    layout.handleCellClick(1, false);

    assert.strictEqual(eventBus.emits.length, 1, 'Должно быть одно событие');

    const [eventName, payload] = eventBus.emits[0];
    assert.strictEqual(eventName, 'cell:clicked', 'Неверное имя события');
    assert.deepStrictEqual(
        payload,
        {
            position: 1,
            isInner: false,
            cellData: outerCellsConfig[1]
        },
        'Неверный payload события'
    );
});

function createEventBusStub() {
    return {
        emits: [],
        emit(eventName, payload) {
            this.emits.push([eventName, payload]);
        },
        on() {}
    };
}
