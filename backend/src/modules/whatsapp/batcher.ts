/**
 * Agrupa lo que llega seguido por la misma clave: espera `quietMs` sin novedades (o como mucho `maxWaitMs`
 * desde el primero) y entrega todo junto. Sirve para contestar una sola vez a quien escribe en varios mensajes.
 */
export function createBatcher<T>(
  onFlush: (key: string, items: T[]) => void,
  { quietMs, maxWaitMs }: { quietMs: number; maxWaitMs: number }
) {
  const pending = new Map<string, { items: T[]; firstAt: number; timer: NodeJS.Timeout }>();

  return {
    push(key: string, item: T) {
      const entry = pending.get(key);
      const batch = entry ?? { items: [] as T[], firstAt: Date.now(), timer: undefined as unknown as NodeJS.Timeout };
      clearTimeout(batch.timer);
      batch.items.push(item);
      const delay = Math.max(0, Math.min(quietMs, batch.firstAt + maxWaitMs - Date.now()));
      batch.timer = setTimeout(() => {
        pending.delete(key);
        onFlush(key, batch.items);
      }, delay);
      pending.set(key, batch);
    },
  };
}
