import * as React from 'react';
import { cn } from './utils';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & { size?: 'sm' | 'xs' };

export function Label({ size = 'sm', className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'block font-medium text-slate-700 dark:text-slate-300',
        size === 'xs' ? 'text-xs' : 'text-sm',
        className
      )}
      {...props}
    />
  );
}
