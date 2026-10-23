import { scheduleMidnightRefresh } from './midnight-refresh';

describe('midnight refresh timer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 24, 23, 59, 59));
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('waits until one second after local midnight and cancels on cleanup', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const stop = scheduleMidnightRefresh(refresh);
    await jest.advanceTimersByTimeAsync(1999);
    expect(refresh).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    stop();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('logs a rejected refresh and still schedules the next local midnight', async () => {
    const error = new Error('database unavailable');
    const refresh = jest.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const stop = scheduleMidnightRefresh(refresh);
    await jest.advanceTimersByTimeAsync(2000);
    expect(warn).toHaveBeenCalledWith('Midnight refresh failed', error);
    expect(jest.getTimerCount()).toBe(1);
    const next = new Date(2026, 9, 26, 0, 0, 1);
    await jest.advanceTimersByTimeAsync(next.getTime() - Date.now());
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
    stop();
  });

  it('does not re-arm if cleaned up during a refresh', async () => {
    let resolveRefresh!: () => void;
    const refresh = jest.fn(() => new Promise<void>((resolve) => { resolveRefresh = resolve; }));
    const stop = scheduleMidnightRefresh(refresh);
    await jest.advanceTimersByTimeAsync(2000);
    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
    resolveRefresh();
    await Promise.resolve();
    expect(jest.getTimerCount()).toBe(0);
  });
});
