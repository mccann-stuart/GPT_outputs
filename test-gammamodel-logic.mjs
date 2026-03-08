import assert from 'node:assert';
import { logistic, declineLogistic } from './gammamodel-logic.mjs';

function isClose(actual, expected, tolerance = 1e-6) {
    return Math.abs(actual - expected) < tolerance;
}

function testLogistic() {
    console.log('Running tests for logistic...');

    // Test case 1: t = t0, exp(0) = 1, L / (1 + 1) = L / 2
    {
        const result = logistic(2030, 10, 0.5, 2030);
        assert.ok(isClose(result, 5), 'Should return L/2 when t = t0');
        console.log('✅ Test case 1 passed: t = t0');
    }

    // Test case 2: t >> t0, approaches L
    {
        const result = logistic(2100, 10, 0.5, 2030);
        assert.ok(isClose(result, 10), 'Should approach L for large t');
        console.log('✅ Test case 2 passed: t >> t0');
    }

    // Test case 3: t << t0, approaches 0
    {
        const result = logistic(1900, 10, 0.5, 2030);
        assert.ok(isClose(result, 0), 'Should approach 0 for small t');
        console.log('✅ Test case 3 passed: t << t0');
    }
}

function testDeclineLogistic() {
    console.log('Running tests for declineLogistic...');

    // Test case 1: t = t0, range = init - floor. floor + range / (1 + 1) = floor + (init - floor)/2 = (init + floor) / 2
    {
        const result = declineLogistic(2030, 100, 10, 0.5, 2030);
        assert.ok(isClose(result, 55), 'Should return midpoint when t = t0');
        console.log('✅ Test case 1 passed: t = t0');
    }

    // Test case 2: t >> t0, approaches floorShare
    {
        const result = declineLogistic(2100, 100, 10, 0.5, 2030);
        assert.ok(isClose(result, 10), 'Should approach floorShare for large t');
        console.log('✅ Test case 2 passed: t >> t0');
    }

    // Test case 3: t << t0, approaches initialShare
    {
        const result = declineLogistic(1900, 100, 10, 0.5, 2030);
        assert.ok(isClose(result, 100), 'Should approach initialShare for small t');
        console.log('✅ Test case 3 passed: t << t0');
    }
}

try {
    testLogistic();
    testDeclineLogistic();
    console.log('All tests passed!');
} catch (error) {
    console.error('❌ Test failed!');
    console.error(error);
    process.exit(1);
}
