// Mark: three bars narrowing to a point — many alerts in, one decision out.
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="1" y="2.5" width="18" height="3.2" rx="1" fill="currentColor" opacity="0.38" />
      <rect x="4.5" y="8.4" width="11" height="3.2" rx="1" fill="currentColor" opacity="0.68" />
      <rect x="8" y="14.3" width="4" height="3.2" rx="1" fill="var(--accent)" />
    </svg>
  )
}

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--text)' }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 650, fontSize: size * 0.82, letterSpacing: '-0.03em', lineHeight: 1 }}>vulnera</span>
    </span>
  )
}
