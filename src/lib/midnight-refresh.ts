/** Refresh just after each local midnight; return a cleanup for the timer. */
export function scheduleMidnightRefresh(refresh: () => Promise<void>): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(async () => {
      try {
        await refresh();
      } catch (error) {
        console.warn('Midnight refresh failed', error);
      } finally {
        if (!stopped) arm();
      }
    }, midnight.getTime() - now.getTime() + 1000);
  };
  arm();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
