const assert = require('node:assert/strict');
const {
  assertSuccessfulIpcResult,
  isProxyRuntimeRunning,
} = require('../dist/shared/proxyRuntime.js');

assert.equal(isProxyRuntimeRunning(null), false);
assert.equal(isProxyRuntimeRunning({}), false);
assert.equal(isProxyRuntimeRunning({ totalConnections: 0 }), false);
assert.equal(isProxyRuntimeRunning({ running: false, totalConnections: 1 }), false);
assert.equal(isProxyRuntimeRunning({ running: true, error: 'status unavailable' }), false);
assert.equal(isProxyRuntimeRunning({ running: true, totalConnections: 0 }), true);

assert.doesNotThrow(() => assertSuccessfulIpcResult({ success: true }, 'operation failed'));
assert.throws(
  () => assertSuccessfulIpcResult({ success: false, error: 'explicit failure' }, 'operation failed'),
  /explicit failure/
);
assert.throws(
  () => assertSuccessfulIpcResult(undefined, 'operation failed'),
  /operation failed/
);

console.log('proxy runtime invariants passed');
