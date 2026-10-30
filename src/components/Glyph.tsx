/** Status marks: shape carries the meaning, color is secondary. Always shown beside a word. */
export function CheckGlyph({ size = 28 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HiddenGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/** Neighbors alerted: a small house with a signal arc. */
export function NeighborsGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20v-8.5L11 6l7 5.5V20z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M9 20v-5h4v5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M17.5 3.5a5 5 0 0 1 3 3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/** Flyer scans: a corner of a QR code. */
export function ScanGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z" fill="currentColor" />
    </svg>
  );
}

/** Likely heading: an open arrowhead. */
export function HeadingGlyph({ size = 16, bearing = 0 }: { size?: number; bearing?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g transform={`rotate(${bearing} 12 12)`}>
        <path d="M12 20V5M6.5 10.5L12 5l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0" />
      </g>
    </svg>
  );
}

/** Dusk: a half sun on the horizon. */
export function DuskGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 17a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M3 17h18M12 6.5V8.5M5.6 9.6l1.4 1.4M18.4 9.6L17 11" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
