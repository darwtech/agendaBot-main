import { toast } from 'sonner';
import { useAppStore, type AppStore } from '@/store/useAppStore';
import { tenantSlug } from '../tenant';
import { api, ApiError, buildUrl, getAuthToken, setAuthToken } from './client';
import {
  appointmentsApi,
  conversationsApi,
  customersApi,
  scheduleApi,
  servicesApi,
  settingsApi,
} from './resources';

export const isApiMode = import.meta.env.VITE_DATA_SOURCE === 'api';

/** Clave de sessionStorage del token del panel de un negocio. */
export const tokenKey = (slug: string | null) => `agendabot-admin-token:${slug ?? ''}`;
const TOKEN_KEY = tokenKey(tenantSlug);

type Entity = { id: string };

export interface EntityDiff<T extends Entity> {
  created: T[];
  updated: { id: string; patch: Partial<T> }[];
}

/** Compara dos listas por id. Las bajas se ignoran a propósito: nunca se borra en el servidor desde aquí. */
export function diffById<T extends Entity>(prev: T[], next: T[]): EntityDiff<T> {
  const before = new Map(prev.map((x) => [x.id, x]));
  const diff: EntityDiff<T> = { created: [], updated: [] };
  for (const item of next) {
    const old = before.get(item.id);
    if (!old) {
      diff.created.push(item);
      continue;
    }
    if (old === item) continue;
    const patch: Partial<T> = {};
    for (const key of Object.keys(item) as (keyof T)[]) {
      if (old[key] !== item[key]) patch[key] = item[key];
    }
    if (Object.keys(patch).length) diff.updated.push({ id: item.id, patch });
  }
  return diff;
}

let applyingRemote = false;

/**
 * Carga el estado desde el backend (fuente de verdad).
 * Sin token solo se piden los datos públicos que necesita el chat.
 */
export async function hydrateFromApi(): Promise<void> {
  const isAdmin = Boolean(getAuthToken());
  const [services, schedule, appointments, settings, customers, conversations] = await Promise.all([
    servicesApi.list(),
    scheduleApi.get(),
    appointmentsApi.list(),
    settingsApi.get(),
    isAdmin ? customersApi.list() : Promise.resolve([]),
    isAdmin ? conversationsApi.list() : Promise.resolve([]),
  ]);
  applyingRemote = true;
  try {
    useAppStore.setState((s) => ({
      services,
      schedule,
      customers,
      appointments,
      conversations,
      activeConversationId: conversations.some((c) => c.id === s.activeConversationId)
        ? s.activeConversationId
        : (conversations[0]?.id ?? ''),
      settings: { ...s.settings, ...settings },
    }));
  } finally {
    applyingRemote = false;
  }
  // Cada visitante empieza con una conversación propia (se crea en el servidor al sincronizar).
  if (!useAppStore.getState().activeConversationId) useAppStore.getState().startNewConversation();
}

/** Recarga solo las conversaciones (panel de Conversaciones) sin reenviarlas al servidor. */
export async function refreshConversations(): Promise<void> {
  if (!getAuthToken()) return;
  const conversations = await conversationsApi.list();
  applyingRemote = true;
  try {
    useAppStore.setState({ conversations });
  } finally {
    applyingRemote = false;
  }
}

/** Recarga solo las citas (las de WhatsApp las crea el servidor) sin reenviarlas al servidor. */
export async function refreshAppointments(announce = false): Promise<void> {
  const appointments = await appointmentsApi.list();
  if (announce) {
    // Aviso de citas nuevas que llegan solas (WhatsApp, chat web, otro usuario del panel).
    const known = new Set(useAppStore.getState().appointments.map((a) => a.id));
    for (const a of appointments) {
      if (!known.has(a.id) && a.status === 'confirmed') {
        toast.success(`Nueva cita: ${a.customerName}`, {
          description: `${a.serviceName} · ${a.date} a las ${a.time}${a.channel === 'whatsapp' ? ' · WhatsApp' : ''}`,
        });
      }
    }
  }
  applyingRemote = true;
  try {
    useAppStore.setState({ appointments });
  } finally {
    applyingRemote = false;
  }
}

/** Edita o cancela una cita en el servidor. `notified` indica si se avisó al cliente por WhatsApp. */
export async function updateAppointmentOnServer(
  id: string,
  patch: { serviceId?: string; date?: string; time?: string; notes?: string; status?: 'cancelled' | 'confirmed'; cancelReason?: string }
): Promise<{ notified?: boolean }> {
  const result = await api.patch<{ notified?: boolean }>(`/appointments/${id}`, patch);
  await refreshAppointments();
  return result;
}

export async function deleteAppointmentOnServer(id: string): Promise<void> {
  await appointmentsApi.remove(id);
  await refreshAppointments();
}

export async function refreshCustomers(): Promise<void> {
  const customers = await customersApi.list();
  applyingRemote = true;
  try {
    useAppStore.setState({ customers });
  } finally {
    applyingRemote = false;
  }
}

// ---- Avisos en tiempo real (Server-Sent Events con el token en la cabecera) ----
let live: AbortController | null = null;

/** Escucha /events y recarga citas, clientes o conversaciones en cuanto cambian en el servidor. */
export function startLiveUpdates(): void {
  if (live || !getAuthToken()) return;
  const ctrl = new AbortController();
  live = ctrl;
  const pending = new Set<string>();
  let timer: number | undefined;
  const flush = () => {
    for (const topic of pending) {
      const run =
        topic === 'appointments'
          ? refreshAppointments(true)
          : topic === 'customers'
            ? refreshCustomers()
            : topic === 'conversations'
              ? refreshConversations()
              : null;
      run?.catch(() => undefined);
    }
    pending.clear();
  };
  const queue = (topic: string) => {
    pending.add(topic);
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 300); // varios avisos seguidos → una sola recarga
  };

  void (async () => {
    let firstConnection = true;
    while (!ctrl.signal.aborted) {
      try {
        const res = await fetch(buildUrl('/events'), {
          headers: { Accept: 'text/event-stream', Authorization: `Bearer ${getAuthToken()}` },
          signal: ctrl.signal,
        });
        if (res.status === 401) break;
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        // Al reconectar se recarga todo, por si algo cambió mientras no había conexión.
        if (!firstConnection) ['appointments', 'customers', 'conversations'].forEach(queue);
        firstConnection = false;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let end: number;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const data = buffer
              .slice(0, end)
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('');
            buffer = buffer.slice(end + 2);
            if (data) queue((JSON.parse(data) as { topic: string }).topic);
          }
        }
      } catch {
        if (ctrl.signal.aborted) break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 3_000));
    }
    if (live === ctrl) live = null;
  })();
}

export function stopLiveUpdates(): void {
  live?.abort();
  live = null;
}

/** Envía por WhatsApp una respuesta escrita en el panel y recarga las conversaciones. */
export async function replyOnWhatsApp(conversationId: string, text: string): Promise<void> {
  await api.post(`/whatsapp/conversations/${conversationId}/reply`, { text });
  await refreshConversations();
}

function pushChanges(prev: AppStore, next: AppStore): Promise<unknown>[] {
  const isAdmin = Boolean(getAuthToken());
  const ops: (() => Promise<unknown>)[] = [];
  const entity = <T extends Entity>(
    a: T[],
    b: T[],
    res: { create: (d: T) => Promise<unknown>; update: (id: string, p: Partial<T>) => Promise<unknown> },
    access: { create: boolean; update: boolean }
  ) => {
    if (a === b) return;
    const d = diffById(a, b);
    if (access.create) d.created.forEach((x) => ops.push(() => res.create(x)));
    if (access.update) d.updated.forEach((u) => ops.push(() => res.update(u.id, u.patch)));
  };
  // El chat público solo puede crear clientes/citas y escribir en su conversación.
  // Orden: el cliente debe existir antes que su cita.
  entity(prev.services, next.services, servicesApi, { create: isAdmin, update: isAdmin });
  entity(prev.customers, next.customers, customersApi, { create: true, update: isAdmin });
  entity(prev.appointments, next.appointments, appointmentsApi, { create: true, update: isAdmin });
  entity(prev.conversations, next.conversations, conversationsApi, { create: true, update: true });
  if (isAdmin && prev.schedule !== next.schedule) ops.push(() => scheduleApi.update(next.schedule));
  if (isAdmin && prev.settings !== next.settings) ops.push(() => settingsApi.update(next.settings));
  return ops.map((op) => (queue = queue.then(op)));
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Inicia sesión en el panel del negocio con correo y contraseña.
 * Devuelve null si todo va bien, o el mensaje de error para mostrar en el formulario.
 */
export async function adminLogin(email: string, password: string): Promise<string | null> {
  let session: { token: string };
  try {
    session = await api.post<{ token: string }>('/auth/login', { email: email.trim(), password });
  } catch (err) {
    if (err instanceof ApiError && err.status !== 0 && err.status < 500) return err.message;
    throw err;
  }
  setAuthToken(session.token);
  try {
    sessionStorage.setItem(TOKEN_KEY, session.token);
  } catch {
    // Sin sessionStorage la sesión dura hasta recargar la página.
  }
  useAppStore.setState({ adminUnlocked: true });
  await hydrateFromApi();
  startLiveUpdates();
  return null;
}

function forgetSession() {
  stopLiveUpdates();
  setAuthToken(null);
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // nada que limpiar
  }
}

export async function startApiSync(): Promise<void> {
  // Primero la suscripción, para que lo creado durante la carga inicial también se envíe.
  useAppStore.subscribe((next, prev) => {
    if (applyingRemote) return;
    if (prev.adminUnlocked && !next.adminUnlocked && getAuthToken()) {
      // «Bloquear» cierra la sesión también en el servidor.
      void api.post('/auth/logout').catch(() => undefined).finally(forgetSession);
    }
    for (const p of pushChanges(prev, next)) {
      p.catch(async (err: Error) => {
        queue = Promise.resolve();
        if (err instanceof ApiError && err.status === 401) {
          forgetSession();
          useAppStore.setState({ adminUnlocked: false });
          toast.error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
        } else {
          toast.error(`Error al guardar en el servidor: ${err.message}`);
        }
        await hydrateFromApi().catch(() => undefined);
      });
    }
  });
  try {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) {
      setAuthToken(saved);
      useAppStore.setState({ adminUnlocked: true });
    }
  } catch {
    // Sin sessionStorage: se pedirá el token al entrar al panel.
  }
  try {
    await hydrateFromApi();
    startLiveUpdates();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // Sesión guardada caducada o cerrada: se vuelve a pedir el inicio de sesión.
      forgetSession();
      useAppStore.setState({ adminUnlocked: false });
      await hydrateFromApi().catch(() => undefined);
    } else if (err instanceof ApiError && err.status === 404) {
      throw err; // negocio inexistente o desactivado: lo muestra main.tsx
    } else {
      toast.error(`No se pudo conectar con la API: ${(err as Error).message}`);
    }
  }
}
