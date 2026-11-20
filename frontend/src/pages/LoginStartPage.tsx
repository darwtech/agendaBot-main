/**
 * HopperSoft — Creador: Darwin Chavez
 */
import * as React from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { AuthShell, FormError, PasswordInput } from '../components/AuthShell';
import { Button, Input, Label } from '../components/ui';
import { api, ApiError } from '../lib/api/client';
import { tokenKey } from '../lib/api/sync';

type PlatformSession = { slug: string; token: string };

/** Acceso desde la portada: el servidor identifica el negocio a partir del correo. */
export function LoginStartPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Introduce tu correo y contraseña.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const { slug, token } = await api.post<PlatformSession>('/platform/auth/login', { email: email.trim(), password });
      try { sessionStorage.setItem(tokenKey(slug), token); } catch { /* la sesión seguirá activa hasta recargar */ }
      window.location.assign(`/n/${slug}/admin`);
    } catch (err) {
      setError(err instanceof ApiError && err.status ? err.message : 'No se pudo conectar con el servidor.');
      setSending(false);
    }
  };

  return (
    <AuthShell top={<a href="/registro" className="ml-auto text-sm font-semibold text-[var(--accent-700)] underline underline-offset-4 hover:text-[var(--accent-600)] dark:text-[var(--accent-500)]">Crear mi negocio</a>}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-[var(--accent-700)]/25 dark:text-[var(--accent-100)]"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Bienvenido de nuevo</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Inicia sesión para gestionar tus citas, servicios y configuración.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div><Label htmlFor="login-email">Correo electrónico</Label><div className="relative mt-1.5"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><Input id="login-email" type="email" autoComplete="username" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@negocio.com" className="h-11 pl-10" /></div></div>
        <div><Label htmlFor="login-password">Contraseña</Label><PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11" /></div>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={sending}>{sending ? 'Iniciando sesión…' : <>Iniciar sesión <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">¿Aún no tienes cuenta? <a href="/registro" className="font-semibold text-[var(--accent-700)] underline underline-offset-4 hover:text-[var(--accent-600)] dark:text-[var(--accent-500)]">Crea tu negocio</a></p>
    </AuthShell>
  );
}
