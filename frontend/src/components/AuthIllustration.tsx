/** Ilustración del panel de cuenta: un chat que reserva una cita en el calendario. Colores del acento actual. */
export function AuthIllustration({ className }: { className?: string }) {
  const days = Array.from({ length: 21 }, (_, i) => i);
  return (
    <svg viewBox="0 0 380 300" className={className} role="img" aria-label="Chat con un cliente que reserva una cita en el calendario">
      <defs>
        <filter id="auth-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#022c22" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Calendario */}
      <g filter="url(#auth-shadow)">
        <rect x="160" y="14" width="206" height="196" rx="18" fill="#ffffff" />
      </g>
      <rect x="160" y="14" width="206" height="44" rx="18" fill="var(--accent-50)" />
      <rect x="160" y="40" width="206" height="18" fill="var(--accent-50)" />
      <rect x="178" y="30" width="70" height="10" rx="5" fill="var(--accent-700)" />
      <circle cx="330" cy="35" r="5" fill="var(--accent-500)" opacity="0.5" />
      <circle cx="346" cy="35" r="5" fill="var(--accent-500)" />
      {days.map((i) => {
        const cx = 186 + (i % 7) * 26;
        const cy = 84 + Math.floor(i / 7) * 34;
        const picked = i === 10;
        const busy = i === 3 || i === 8 || i === 16 || i === 19;
        return (
          <g key={i}>
            {picked && <circle cx={cx} cy={cy} r="13" fill="var(--accent-600)" />}
            <rect
              x={cx - 6}
              y={cy - 3}
              width="12"
              height="6"
              rx="3"
              fill={picked ? '#ffffff' : busy ? 'var(--accent-500)' : '#cbd5e1'}
              opacity={busy && !picked ? 0.55 : 1}
            />
          </g>
        );
      })}
      <rect x="178" y="178" width="170" height="18" rx="9" fill="var(--accent-50)" />
      <rect x="188" y="184" width="54" height="6" rx="3" fill="var(--accent-700)" />
      <rect x="300" y="184" width="36" height="6" rx="3" fill="var(--accent-500)" />

      {/* Chat */}
      <g filter="url(#auth-shadow)">
        <rect x="14" y="98" width="196" height="188" rx="20" fill="#ffffff" />
      </g>
      <circle cx="40" cy="124" r="11" fill="var(--accent-100)" />
      <rect x="58" y="117" width="64" height="7" rx="3.5" fill="#334155" />
      <rect x="58" y="128" width="40" height="5" rx="2.5" fill="var(--accent-500)" />
      <line x1="14" y1="146" x2="210" y2="146" stroke="#e2e8f0" />

      <rect x="28" y="158" width="120" height="30" rx="12" fill="#f1f5f9" />
      <rect x="40" y="166" width="84" height="6" rx="3" fill="#94a3b8" />
      <rect x="40" y="176" width="56" height="6" rx="3" fill="#94a3b8" />

      <rect x="88" y="198" width="108" height="24" rx="12" fill="var(--accent-600)" />
      <rect x="100" y="207" width="70" height="6" rx="3" fill="#ffffff" opacity="0.9" />

      <rect x="28" y="232" width="134" height="38" rx="12" fill="var(--accent-50)" stroke="var(--accent-500)" strokeOpacity="0.5" />
      <circle cx="46" cy="251" r="9" fill="var(--accent-600)" />
      <path d="M41.5 251.2l3.2 3.2 5.8-6.2" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="62" y="243" width="70" height="6" rx="3" fill="var(--accent-700)" />
      <rect x="62" y="254" width="46" height="5" rx="2.5" fill="var(--accent-500)" />

      {/* Conector chat → día reservado */}
      <path d="M196 210 C 250 210, 262 170, 264 133" fill="none" stroke="var(--accent-600)" strokeWidth="2" strokeDasharray="4 5" opacity="0.7" />
      <circle cx="264" cy="133" r="3.5" fill="var(--accent-600)" />
    </svg>
  );
}
