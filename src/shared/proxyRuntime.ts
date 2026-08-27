export interface IpcOperationResult {
  success: boolean;
  error?: string;
}

export interface ProxyRuntimeStats {
  running: boolean;
  error?: string;
}

export function assertSuccessfulIpcResult(
  result: unknown,
  fallbackMessage: string
): asserts result is IpcOperationResult {
  if (!result || typeof result !== 'object' || (result as IpcOperationResult).success !== true) {
    const error = (result as Partial<IpcOperationResult> | null)?.error;
    throw new Error(error || fallbackMessage);
  }
}

export function isProxyRuntimeRunning(stats: unknown): boolean {
  if (!stats || typeof stats !== 'object') {
    return false;
  }

  const runtime = stats as Partial<ProxyRuntimeStats>;
  return runtime.running === true && !runtime.error;
}
