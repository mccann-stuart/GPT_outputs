import assert from 'node:assert';
import { resolveInitialSettings, DEFAULT_SETTINGS } from './truelayer-logic.mjs';

function testResolveInitialSettings() {
  console.log('Running tests for resolveInitialSettings...');

  // Test case 1: Empty input returns defaults
  {
    const result = resolveInitialSettings({});
    assert.deepStrictEqual(result, DEFAULT_SETTINGS, 'Should return DEFAULT_SETTINGS for empty input');
    console.log('✅ Test case 1 passed: Empty input');
  }

  // Test case 2: Valid partial input
  {
    const input = { monthlyPayments: 5000 };
    const result = resolveInitialSettings(input);
    assert.strictEqual(result.monthlyPayments, 5000);
    assert.strictEqual(result.avgAmount, DEFAULT_SETTINGS.avgAmount);
    assert.strictEqual(result.pbbShare, DEFAULT_SETTINGS.pbbShare);
    console.log('✅ Test case 2 passed: Valid partial input');
  }

  // Test case 3: Non-finite values fallback to defaults
  {
    const input = { monthlyPayments: 'abc', avgAmount: NaN, pbbShare: Infinity };
    const result = resolveInitialSettings(input);
    assert.strictEqual(result.monthlyPayments, DEFAULT_SETTINGS.monthlyPayments);
    assert.strictEqual(result.avgAmount, DEFAULT_SETTINGS.avgAmount);
    assert.strictEqual(result.pbbShare, DEFAULT_SETTINGS.pbbShare);
    console.log('✅ Test case 3 passed: Non-finite values fallback');
  }

  // Test case 4: Numeric strings are correctly parsed
  {
    const input = { monthlyPayments: '20000', avgAmount: '100', pbbShare: '0.5' };
    const result = resolveInitialSettings(input);
    assert.strictEqual(result.monthlyPayments, 20000);
    assert.strictEqual(result.avgAmount, 100);
    assert.strictEqual(result.pbbShare, 0.5);
    console.log('✅ Test case 4 passed: Numeric strings');
  }

  // Test case 5: Null input (handled by my addition to the function)
  {
    const result = resolveInitialSettings(null);
    assert.deepStrictEqual(result, DEFAULT_SETTINGS, 'Should return DEFAULT_SETTINGS for null input');
    console.log('✅ Test case 5 passed: Null input');
  }

  // Test case 6: Undefined input
  {
    const result = resolveInitialSettings(undefined);
    assert.deepStrictEqual(result, DEFAULT_SETTINGS, 'Should return DEFAULT_SETTINGS for undefined input');
    console.log('✅ Test case 6 passed: Undefined input');
  }

  console.log('All tests for resolveInitialSettings passed!');
}

try {
  testResolveInitialSettings();
} catch (error) {
  console.error('❌ Test failed!');
  console.error(error);
  process.exit(1);
}
