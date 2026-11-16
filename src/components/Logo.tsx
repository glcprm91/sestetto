/** Il simbolo di Sestetto: sei giocatori che ruotano in senso orario sotto la rete. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="#1F5FA9" />
      <rect x="10" y="9.5" width="44" height="3.4" rx="1.7" fill="#F4F7FB" />
      <path d="M20 24 H44 A11 11 0 0 1 44 46 H20 A11 11 0 0 1 20 24 Z" fill="none" stroke="#F4F7FB" strokeWidth="3.2" opacity=".85" />
      <path d="M50.4 32.8 L55 38.6 L59.6 32.8 Z" fill="#F4F7FB" />
      {[
        [20, 24],
        [32, 24],
        [44, 24],
        [20, 46],
        [32, 46],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5.4" fill="#F4F7FB" stroke="#1F5FA9" strokeWidth="2.2" />
      ))}
      <circle cx="44" cy="46" r="5.4" fill="#F5C518" stroke="#1F5FA9" strokeWidth="2.2" />
    </svg>
  );
}
