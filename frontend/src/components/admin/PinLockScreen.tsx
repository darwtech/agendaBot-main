import { Label } from '@/components/ui';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, Lock } from 'lucide-react';
import { adminLogin, isApiMode } from '../../lib/api/sync';
import { useAppStore } from '../../store/useAppStore';
import { AuthShell, FormError, PasswordInput } from '../AuthShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/** Pantalla de acceso al panel: correo y contraseña (modo API) o PIN local (modo demo). */
export function PinLockScreen() {
  const businessName = useAppStore((s) => s.settings.businessName);

  return (
    <AuthShell
      top={
        <>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al chat
          </Link>
          <span className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{businessName}</span>
        </>
      }
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-[var(--accent-700)]/25 dark:text-[var(--accent-100)]">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {isApiMode ? 'Inicia sesión' : 'Acceso al panel'}
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {isApiMode
          ? 'Entra con tu correo y contraseña para gestionar citas, servicios y configuración.'
          : 'Introduce el PIN local para gestionar citas, servicios y configuración.'}
      </p>

      {isApiMode ? <LoginForm /> : <PinForm />}
      {isApiMode && (
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          ¿Aún no tienes cuenta?{' '}
          <a
            href="/registro"
            className="font-medium text-[var(--accent-700)] underline underline-offset-4 hover:text-[var(--accent-600)] dark:text-[var(--accent-500)]"
          >
            Crea tu negocio
          </a>
        </p>
      )}
    </AuthShell>
  );
}

function LoginForm() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Introduce tu correo y tu contraseña.');
      return;
    }
    setChecking(true);
    try {
      const failure = await adminLogin(email, password);
      if (failure) {
        setError(failure);
        setPassword('');
      }
    } catch (err) {
      setError(`No se pudo conectar con el servidor: ${(err as Error).message}`);
    } finally {
      setChecking(false);
    }
  };

  const clearError = () => error && setError(null);

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
      <div>
        <Label htmlFor="login-email">Correo electrónico</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError();
          }}
          placeholder="tu@negocio.com"
          className="mt-1.5 h-11"
        />
      </div>
      <div>
        <Label htmlFor="login-password">Contraseña</Label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError();
          }}
          className="h-11"
        />
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" size="lg" disabled={checking}>
        {checking ? 'Entrando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}

function PinForm() {
  const unlockAdmin = useAppStore((s) => s.unlockAdmin);
  const pinChangedFromDefault = useAppStore((s) => s.settings.pinChangedFromDefault);
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Introduce el PIN de acceso.');
      return;
    }
    if (!unlockAdmin(pin)) {
      setError('PIN incorrecto. Inténtalo de nuevo.');
      setPin('');
    }
  };

  return (
    <>
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <div>
          <p>Protección de demostración guardada en este navegador. No constituye seguridad real.</p>
          {!pinChangedFromDefault && (
            <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
              PIN por defecto: <code className="font-mono">1234</code>.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="admin-pin-input">PIN de administrador</Label>
          <Input
            id="admin-pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••"
            className="mt-1.5 font-mono text-base tracking-widest"
          />
        </div>
        <FormError message={error} />
        <Button type="submit" className="w-full" size="lg">
          Entrar al panel
        </Button>
      </form>
    </>
  );
}
