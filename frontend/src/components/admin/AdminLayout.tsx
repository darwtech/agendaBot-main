/**
 * HopperSoft — Creador: Darwin Chavez
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquare,
  MessageSquareText,
  Moon,
  Tags,
  Settings,
  Smartphone,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { isApiMode } from '../../lib/api/sync';
import { useAppStore } from '../../store/useAppStore';

const LOCK_LABEL = isApiMode ? 'Cerrar sesión' : 'Bloquear';
import { cn } from '../ui/utils';

export type AdminSectionId =
  | 'dashboard'
  | 'citas'
  | 'clientes'
  | 'servicios'
  | 'horario'
  | 'conversaciones'
  | 'whatsapp'
  | 'settings';

interface AdminLayoutProps {
  activeSection: AdminSectionId;
  onSelectSection?: (section: AdminSectionId) => void;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: AdminSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
  { id: 'citas', label: 'Citas', icon: CalendarDays, to: '/admin?s=citas' },
  { id: 'clientes', label: 'Clientes', icon: Users, to: '/admin?s=clientes' },
  { id: 'servicios', label: 'Servicios', icon: Tags, to: '/admin?s=servicios' },
  { id: 'horario', label: 'Horario', icon: Clock, to: '/admin?s=horario' },
  {
    id: 'conversaciones',
    label: 'Conversaciones',
    icon: MessageSquareText,
    to: '/admin?s=conversaciones',
  },
  { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone, to: '/admin?s=whatsapp' },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    to: '/admin/settings',
  },
];

export function AdminLayout({
  activeSection,
  onSelectSection,
  title,
  actions,
  children,
}: AdminLayoutProps) {
  const businessName = useAppStore((s) => s.settings.businessName);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const lockAdmin = useAppStore((s) => s.lockAdmin);

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  };

  const renderNavLinks = (isMobile = false) =>
    NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      const isActive = activeSection === item.id;
      const showText = isMobile || !collapsed;

      if (item.id !== 'settings' && onSelectSection && activeSection !== 'settings') {
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectSection(item.id);
              if (isMobile) setMobileMenuOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)]',
              isActive
                ? 'bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
              !showText && 'justify-center px-2'
            )}
            title={!showText ? item.label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {showText && <span className="truncate">{item.label}</span>}
          </button>
        );
      }

      return (
        <Link
          key={item.id}
          to={item.to}
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
          }}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)]',
            isActive
              ? 'bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-slate-800 dark:text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
            !showText && 'justify-center px-2'
          )}
          title={!showText ? item.label : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {showText && <span className="truncate">{item.label}</span>}
        </Link>
      );
    });

  return (
    <div className="flex min-h-dvh bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex md:shrink-0 md:flex-col border-r border-slate-200 bg-white transition-[width] duration-150 dark:border-slate-800 dark:bg-slate-900',
          collapsed ? 'md:w-[70px]' : 'md:w-60'
        )}
        aria-label="Navegación administrativa"
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          {!collapsed && (
            <span className="truncate pl-1 font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              AgendaBot Admin
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir menú lateral' : 'Plegar menú lateral'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2.5 overflow-y-auto">
          {renderNavLinks(false)}
        </nav>

        <div className="border-t border-slate-200 p-2.5 space-y-1 dark:border-slate-800">
          <Link
            to="/"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Chat del cliente' : undefined}
          >
            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">Chat del cliente</span>}
          </Link>
          <button
            type="button"
            onClick={lockAdmin}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? LOCK_LABEL : undefined}
          >
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{LOCK_LABEL}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                {businessName}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menú"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
              {renderNavLinks(true)}
            </nav>
            <div className="border-t border-slate-200 p-3 space-y-1 dark:border-slate-800">
              <Link
                to="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                <span>Chat del cliente</span>
              </Link>
              <button
                type="button"
                onClick={lockAdmin}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>{LOCK_LABEL}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label="Cambiar tema claro u oscuro"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
              <Moon className="block h-4 w-4 dark:hidden" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
