/**
 * HopperSoft — Creador: Darwin Chavez
 */
import * as React from 'react';
import { cn } from './utils';

type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'aside' | 'article';
};

/** Contenedor con borde y fondo usado en todas las secciones del panel. */
export function Card({ as: Tag = 'div', className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    />
  );
}
