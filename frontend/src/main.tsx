/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ApiError } from './lib/api/client';
import { isApiMode, startApiSync } from './lib/api/sync';
import { tenantSlug } from './lib/tenant';
import { SignupPage } from './pages/SignupPage';
import { LoginStartPage } from './pages/LoginStartPage';

const root = createRoot(document.getElementById('root')!);

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{text}</p>
      </div>
    </main>
  );
}

async function boot() {
  if (!isApiMode) {
    root.render(<App />);
    return;
  }
  if (!tenantSlug) {
    if (window.location.pathname.startsWith('/iniciar-sesion')) {
      root.render(<LoginStartPage />);
      return;
    }
    const fallback = import.meta.env.VITE_DEFAULT_TENANT;
    if (fallback && !window.location.pathname.startsWith('/registro')) {
      window.location.replace(`/n/${fallback}`);
      return;
    }
    // Sin negocio en la URL, la portada es el alta de negocio.
    root.render(<SignupPage />);
    return;
  }
  try {
    // Se pinta tras cargar los datos del negocio, para no mostrar datos de ejemplo ni de otro negocio.
    await startApiSync();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      root.render(
        <Notice title="Negocio no encontrado" text={`No existe ningún negocio activo con el identificador «${tenantSlug}».`} />
      );
      return;
    }
    throw err;
  }
  root.render(<App />);
}

void boot();
