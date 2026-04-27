/**
 * Neon circuit-brain logo from the redesign. Pure SVG so it scales cleanly
 * and doesn't need an asset round-trip.
 */
export default function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-label="Gay I Club logo">
      <defs>
        <linearGradient id="brand-pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2d9b" />
          <stop offset="100%" stopColor="#7c2fff" />
        </linearGradient>
        <linearGradient id="brand-cp" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0099cc" />
          <stop offset="100%" stopColor="#ff2d9b" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="none" stroke="url(#brand-pg)" strokeWidth="2.5" />
      <path
        d="M12 20 Q12 12 20 12 Q28 12 28 20 Q28 28 20 28"
        fill="none"
        stroke="url(#brand-cp)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="20" r="2" fill="#e0007a" />
      <circle cx="28" cy="20" r="2" fill="#0099cc" />
      <circle cx="20" cy="12" r="1.5" fill="#7c3aed" />
      <line x1="12" y1="20" x2="6" y2="20" stroke="#e0007a" strokeWidth="1.5" />
      <line x1="28" y1="20" x2="34" y2="20" stroke="#0099cc" strokeWidth="1.5" />
      <circle cx="6" cy="20" r="1.5" fill="#e0007a" />
      <circle cx="34" cy="20" r="1.5" fill="#0099cc" />
    </svg>
  );
}
