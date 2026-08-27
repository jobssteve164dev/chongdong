import { assertSuccessfulIpcResult, isProxyRuntimeRunning } from './proxyRuntime';

describe('proxy runtime invariants', () => {
  it('requires an explicit running state without an error', () => {
    expect(isProxyRuntimeRunning(null)).toBe(false);
    expect(isProxyRuntimeRunning({})).toBe(false);
    expect(isProxyRuntimeRunning({ totalConnections: 0 })).toBe(false);
    expect(isProxyRuntimeRunning({ running: false, totalConnections: 1 })).toBe(false);
    expect(isProxyRuntimeRunning({ running: true, error: 'unavailable' })).toBe(false);
    expect(isProxyRuntimeRunning({ running: true, totalConnections: 0 })).toBe(true);
  });

  it('rejects resolved IPC failures', () => {
    expect(() => assertSuccessfulIpcResult({ success: true }, 'operation failed')).not.toThrow();
    expect(() => assertSuccessfulIpcResult(
      { success: false, error: 'explicit failure' },
      'operation failed'
    )).toThrow('explicit failure');
    expect(() => assertSuccessfulIpcResult(undefined, 'operation failed')).toThrow('operation failed');
  });
});
