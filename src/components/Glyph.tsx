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
