/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { PinLockScreen } from '../components/admin/PinLockScreen';
import { AppearanceTab } from '../components/settings/AppearanceTab';
import { BehaviorTab } from '../components/settings/BehaviorTab';
import { BusinessTab } from '../components/settings/BusinessTab';
import { ProvidersTab } from '../components/settings/ProvidersTab';
import { cn } from '../components/ui/utils';
import { useAppStore } from '../store/useAppStore';

type SettingsTabId =
  | 'proveedores'
  | 'comportamiento'
  | 'negocio'
  | 'apariencia';

const TABS: Array<{ id: SettingsTabId; label: string }> = [
  { id: 'proveedores', label: 'Proveedores de IA' },
  { id: 'comportamiento', label: 'Comportamiento' },
  { id: 'negocio', label: 'Negocio' },
  { id: 'apariencia', label: 'Apariencia' },
];

export function SettingsPage() {
  const adminUnlocked = useAppStore((s) => s.adminUnlocked);
  const [searchParams, setSearchParams] = useSearchParams();

  if (!adminUnlocked) {
    return <PinLockScreen />;
  }

  const rawTab = searchParams.get('tab') as SettingsTabId | null;
  const activeTab: SettingsTabId = TABS.some((t) => t.id === rawTab)
    ? (rawTab as SettingsTabId)
    : 'proveedores';

  const handleSelectTab = (tab: SettingsTabId) => {
    setSearchParams({ tab });
  };

  return (
    <AdminLayout activeSection="settings" title="Configuración">
      <div className="space-y-6">
        {/* Tabs Bar */}
        <div
          role="tablist"
          aria-label="Pestañas de configuración"
          className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px dark:border-slate-800"
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  'shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)]',
                  isSelected
                    ? 'border-[var(--accent-600)] text-[var(--accent-700)] dark:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panel */}
        <div role="tabpanel">
          {activeTab === 'proveedores' && <ProvidersTab />}
          {activeTab === 'comportamiento' && <BehaviorTab />}
          {activeTab === 'negocio' && <BusinessTab />}
          {activeTab === 'apariencia' && <AppearanceTab />}
        </div>
      </div>
    </AdminLayout>
  );
}
