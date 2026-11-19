import { useSearchParams } from 'react-router-dom';
import {
  AdminLayout,
  type AdminSectionId,
} from '../components/admin/AdminLayout';
import { AppointmentsSection } from '../components/admin/AppointmentsSection';
import { ConversationsSection } from '../components/admin/ConversationsSection';
import { CustomersSection } from '../components/admin/CustomersSection';
import { DashboardSection } from '../components/admin/DashboardSection';
import { PinLockScreen } from '../components/admin/PinLockScreen';
import { ScheduleSection } from '../components/admin/ScheduleSection';
import { ServicesSection } from '../components/admin/ServicesSection';
import { WhatsAppSection } from '../components/admin/WhatsAppSection';
import { useAppStore } from '../store/useAppStore';

const SECTION_TITLES: Record<AdminSectionId, string> = {
  dashboard: 'Dashboard',
  citas: 'Citas',
  clientes: 'Clientes',
  servicios: 'Servicios',
  horario: 'Horario semanal',
  conversaciones: 'Conversaciones',
  whatsapp: 'WhatsApp',
  settings: 'Configuración',
};

const VALID_SECTIONS: AdminSectionId[] = [
  'dashboard',
  'citas',
  'clientes',
  'servicios',
  'horario',
  'conversaciones',
  'whatsapp',
];

export function AdminPage() {
  const adminUnlocked = useAppStore((s) => s.adminUnlocked);
  const [searchParams, setSearchParams] = useSearchParams();

  if (!adminUnlocked) {
    return <PinLockScreen />;
  }

  const rawSection = searchParams.get('s') as AdminSectionId | null;
  const activeSection: AdminSectionId =
    rawSection && VALID_SECTIONS.includes(rawSection)
      ? rawSection
      : 'dashboard';

  const handleSelectSection = (section: AdminSectionId) => {
    if (section === 'dashboard') {
      setSearchParams({});
    } else {
      setSearchParams({ s: section });
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      onSelectSection={handleSelectSection}
      title={SECTION_TITLES[activeSection]}
    >
      {activeSection === 'dashboard' && (
        <DashboardSection
          onGoToAppointments={() => handleSelectSection('citas')}
        />
      )}
      {activeSection === 'citas' && <AppointmentsSection />}
      {activeSection === 'clientes' && <CustomersSection />}
      {activeSection === 'servicios' && <ServicesSection />}
      {activeSection === 'horario' && <ScheduleSection />}
      {activeSection === 'conversaciones' && <ConversationsSection />}
      {activeSection === 'whatsapp' && <WhatsAppSection />}
    </AdminLayout>
  );
}
