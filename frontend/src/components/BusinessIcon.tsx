import {
  CalendarCheck,
  Briefcase,
  Car,
  Dog,
  Dumbbell,
  HeartPulse,
  PenTool,
  Scissors,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const BUSINESS_ICONS: Record<string, LucideIcon> = {
  barberia: Scissors,
  peluqueria: Scissors,
  estetica: Sparkles,
  unas: Sparkles,
  spa: Sparkles,
  masajes: Sparkles,
  clinica: Stethoscope,
  dental: Stethoscope,
  fisioterapia: HeartPulse,
  psicologia: HeartPulse,
  nutricion: HeartPulse,
  veterinaria: Dog,
  gimnasio: Dumbbell,
  tatuajes: PenTool,
  taller: Car,
  asesoria: Briefcase,
};

/** Icono según el tipo de negocio; calendario si no hay tipo o no es conocido. */
export function BusinessIcon({ className }: { className?: string }) {
  const type = useAppStore((s) => s.settings.businessType);
  const Icon = BUSINESS_ICONS[type ?? ''] ?? CalendarCheck;
  return <Icon className={className} aria-hidden="true" />;
}
