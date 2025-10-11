import { getRegisteredTests } from './testHarness.js';
import './BoardLayout.test.js';

const { tests, beforeEachHandlers } = getRegisteredTests();

async function run() {
    let passed = 0;
    for (const { name, handler } of tests) {
        try {
            for (const hook of beforeEachHandlers) {
                await hook();
            }
            await handler();
            passed += 1;
            console.log(`✅ ${name}`);
        } catch (error) {
            console.error(`❌ ${name}`);
            console.error(error);
        }
    }

    console.log(`\n${passed}/${tests.length} tests passed`);
}

run();
