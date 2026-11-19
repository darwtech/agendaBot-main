interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function QuickReplies({
  suggestions,
  onSelect,
  disabled,
}: QuickRepliesProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
      role="group"
      aria-label="Sugerencias rápidas"
    >
      {suggestions.map((label) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(label)}
          className="min-h-[40px] shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
