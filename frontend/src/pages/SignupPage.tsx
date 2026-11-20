/**
 * HopperSoft — Creador: Darwin Chavez
 */
import * as React from 'react';
import { ArrowRight, CalendarCheck, ChevronDown, Loader2 } from 'lucide-react';
import { Button, Input, Label, cn } from '@/components/ui';
import { AuthShell, FormError, PasswordInput } from '../components/AuthShell';
import { BUSINESS_ICONS } from '../components/BusinessIcon';
import { api, ApiError } from '../lib/api/client';
import { tokenKey } from '../lib/api/sync';

// Mismo listado que BUSINESS_TYPES del backend.
const BUSINESS_TYPES: [string, string][] = [
  ['barberia', 'Barbería'],
  ['peluqueria', 'Peluquería'],
  ['estetica', 'Estética'],
  ['unas', 'Uñas'],
  ['spa', 'Spa'],
  ['masajes', 'Masajes'],
  ['clinica', 'Clínica'],
  ['dental', 'Dental'],
  ['fisioterapia', 'Fisioterapia'],
  ['psicologia', 'Psicología'],
  ['nutricion', 'Nutrición'],
  ['veterinaria', 'Veterinaria'],
  ['gimnasio', 'Gimnasio'],
  ['tatuajes', 'Tatuajes'],
  ['taller', 'Taller'],
  ['asesoria', 'Asesoría'],
  ['otro', 'Otro'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Alta rápida: crea el negocio y su dueño, y entra directo a Configuración. */
export function SignupPage() {
  const [form, setForm] = React.useState({
    name: '',
    businessType: 'otro',
    fullName: '',
    email: '',
    password: '',
  });
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [typePickerOpen, setTypePickerOpen] = React.useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update(key, e.target.value),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSending(true);
    try {
      const { slug, token } = await api.post<{ slug: string; token: string }>('/signup', {
        name: form.name,
        businessType: form.businessType,
        owner: { email: form.email.trim(), fullName: form.fullName, password: form.password },
      });
      try {
        sessionStorage.setItem(tokenKey(slug), token);
      } catch {
        // Sin sessionStorage el panel pedirá iniciar sesión.
      }
      window.location.assign(`/n/${slug}/admin/settings`);
    } catch (err) {
      setError(err instanceof ApiError && err.status ? err.message : `No se pudo conectar: ${(err as Error).message}`);
      setSending(false);
    }
  };

  const tooShort = form.password.length > 0 && form.password.length < 8;
  const selectedBusiness = BUSINESS_TYPES.find(([value]) => value === form.businessType) ?? BUSINESS_TYPES.at(-1)!;
  const SelectedIcon = BUSINESS_ICONS[selectedBusiness[0]] ?? CalendarCheck;

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
        Crea tu cuenta
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Un minuto y tu negocio queda listo para configurar.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 lg:mt-5 lg:space-y-4">
        <Section title="Tu negocio">
          <div className="grid gap-3 sm:grid-cols-[1.25fr_.75fr]">
            <div>
              <Label htmlFor="su-name">Nombre</Label>
              <Input id="su-name" required minLength={2} maxLength={100} autoFocus placeholder="Barbería Central" className="mt-1.5 h-10" {...field('name')} />
            </div>
            <div className="relative">
              <Label htmlFor="su-type">Tipo de negocio</Label>
              <button
                id="su-type"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={typePickerOpen}
                onClick={() => setTypePickerOpen((open) => !open)}
                className="mt-1.5 flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:border-[var(--accent-500)] focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-[var(--accent-700)]/25 dark:text-[var(--accent-100)]"><SelectedIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1 truncate text-left">{selectedBusiness[1]}</span>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', typePickerOpen && 'rotate-180')} aria-hidden="true" />
              </button>
              {typePickerOpen && (
                <div role="listbox" aria-label="Tipo de negocio" className="absolute right-0 z-20 mt-2 max-h-56 w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {BUSINESS_TYPES.map(([value, label]) => {
                    const Icon = BUSINESS_ICONS[value] ?? CalendarCheck;
                    const active = value === form.businessType;
                    return (
                      <button key={value} type="button" role="option" aria-selected={active} onClick={() => { update('businessType', value); setTypePickerOpen(false); }} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors', active ? 'bg-[var(--accent-50)] font-semibold text-[var(--accent-700)] dark:bg-[var(--accent-700)]/25 dark:text-[var(--accent-100)]' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </Section>

        <Section title="Tu acceso">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="su-fullname">Tu nombre</Label>
              <Input id="su-fullname" required minLength={2} maxLength={100} autoComplete="name" className="mt-1.5 h-10" {...field('fullName')} />
            </div>
            <div>
              <Label htmlFor="su-email">Correo electrónico</Label>
              <Input id="su-email" type="email" required autoComplete="username" placeholder="tu@negocio.com" className="mt-1.5 h-10" {...field('email')} />
            </div>
          </div>
          <div>
            <Label htmlFor="su-password">Contraseña</Label>
            <PasswordInput
              id="su-password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="su-password-help"
              className="h-10"
              {...field('password')}
            />
            <p
              id="su-password-help"
              className={cn('mt-1.5 text-xs', tooShort ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400')}
            >
              {tooShort ? `Faltan ${8 - form.password.length} caracteres.` : 'Mínimo 8 caracteres.'}
            </p>
          </div>
        </Section>

        <FormError message={error} />

        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creando tu negocio…
            </>
          ) : (
            <>
              Crear cuenta
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
        <p className="-mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          ¿Ya tienes una cuenta?{' '}
          <a href="/iniciar-sesion" className="font-semibold text-[var(--accent-700)] underline underline-offset-4 hover:text-[var(--accent-600)] dark:text-[var(--accent-500)]">
            Iniciar sesión
          </a>
        </p>
      </form>
    </AuthShell>
  );
}
