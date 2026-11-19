import * as React from 'react';
import { CalendarCheck, Eye, EyeOff, MessageCircle, Settings2, UserPlus } from 'lucide-react';
import { Input } from './ui';

const STEPS = [
  { icon: UserPlus, title: 'Crea tu cuenta', text: 'Tu negocio queda activo al momento.' },
  { icon: Settings2, title: 'Configura', text: 'Servicios, horario y cómo responde el asistente.' },
  { icon: MessageCircle, title: 'Abre el chat', text: 'Tus clientes reservan solos, a cualquier hora.' },
];

/**
 * Marco de las pantallas de cuenta.
 * Escritorio: panel de marca fijo a la izquierda y formulario a la derecha.
 * Móvil y tablet: el panel se convierte en una cabecera compacta encima del formulario.
 */
export function AuthShell({ children, top }: { children: React.ReactNode; top?: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50 lg:grid lg:h-dvh lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:overflow-hidden dark:bg-slate-950">
      <aside
        className="relative overflow-hidden bg-[var(--accent-700)] bg-cover bg-center px-4 pt-6 pb-8 text-white sm:px-8 sm:pt-8 lg:flex lg:h-dvh lg:flex-col lg:p-10 xl:p-12"
        style={{ backgroundImage: "url('/images/auth-booking-hero-v2.png')" }}
      >
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,28,23,.94),rgba(3,54,43,.72)_55%,rgba(2,28,23,.25))]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-[var(--accent-500)] opacity-40 blur-3xl"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">AgendaBot</span>
        </div>

        <div className="relative mt-6 flex items-center gap-6 sm:mt-8 lg:mt-auto lg:block">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl lg:text-4xl lg:leading-[1.1]">
              Tu agenda, atendida por chat.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80 sm:text-base lg:mt-4">
              Para barberías, clínicas, spas, talleres y cualquier negocio que trabaje con citas.
            </p>
          </div>
        </div>

        <ul className="relative mt-auto hidden space-y-5 border-t border-white/20 pt-7 lg:block">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-sm text-white/75">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex min-h-0 flex-col overflow-y-auto px-4 py-5 sm:px-8 lg:h-dvh lg:px-12 lg:py-6 xl:px-16">
        {top && <div className="flex min-h-6 items-center justify-between gap-4">{top}</div>}
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-5 lg:py-3">{children}</div>
      </main>
    </div>
  );
}

/** Mensaje de error de formulario. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
    >
      {message}
    </p>
  );
}

/** Campo de contraseña con botón para mostrarla. */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative mt-1.5">
      <Input {...props} type={visible ? 'text' : 'password'} className={`pr-11 ${props.className ?? ''}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-100"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
