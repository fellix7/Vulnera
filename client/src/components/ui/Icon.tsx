// Inline 16px stroke icons (no icon library). Decorative by default; pass `label` to expose to screen readers.
const PATHS = {
  'arrow-right': 'M3 8h10M9 4l4 4-4 4',
  'arrow-left': 'M13 8H3M7 4L3 8l4 4',
  'arrow-up-right': 'M5 11l6-6M6 5h5v5',
  check: 'M3.5 8.5l3 3 6-7',
  x: 'M4 4l8 8M12 4l-8 8',
  copy: 'M5.5 5.5V3.5a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-2M3.5 5.5h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1v-6a1 1 0 011-1z',
  download: 'M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10',
  upload: 'M8 10.5v-8M4.5 6L8 2.5 11.5 6M3 13.5h10',
  file: 'M9 2H4.5a1 1 0 00-1 1v10a1 1 0 001 1h7a1 1 0 001-1V5.5L9 2zM9 2v3.5h3.5',
  folder: 'M2 4.5a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5z',
  search: 'M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5',
  filter: 'M2 3.5h12M4.5 8h7M7 12.5h2',
  sort: 'M5 3v10M2.5 10.5L5 13l2.5-2.5M11 13V3M8.5 5.5L11 3l2.5 2.5',
  'chevron-down': 'M4 6l4 4 4-4',
  'chevron-right': 'M6 4l4 4-4 4',
  'chevron-left': 'M10 4L6 8l4 4',
  external: 'M9 2.5h4.5V7M13.5 2.5L7.5 8.5M12 9.5v3a1 1 0 01-1 1H3.5a1 1 0 01-1-1V5a1 1 0 011-1h3',
  alert: 'M8 2l6.5 11.5h-13L8 2zM8 6.5v3M8 11.5v.01',
  info: 'M8 14A6 6 0 108 2a6 6 0 000 12zM8 7.5v3.5M8 5v.01',
  shield: 'M8 1.8l5.2 2v4c0 3.2-2.2 5.4-5.2 6.4-3-1-5.2-3.2-5.2-6.4v-4L8 1.8z',
  'shield-check': 'M8 1.8l5.2 2v4c0 3.2-2.2 5.4-5.2 6.4-3-1-5.2-3.2-5.2-6.4v-4L8 1.8zM5.6 8l1.7 1.7 3.2-3.4',
  flame: 'M8 14.5c2.8 0 4.5-1.9 4.5-4.4 0-2.9-2.4-4.4-3.2-7.6-1.6 1.2-2.4 2.8-2.3 4.6-.8-.4-1.4-1.1-1.6-2C4.2 6.3 3.5 7.8 3.5 10c0 2.6 1.7 4.5 4.5 4.5z',
  sparkle: 'M8 1.5l1.4 4.1 4.1 1.4-4.1 1.4L8 12.5 6.6 8.4 2.5 7l4.1-1.4L8 1.5zM12.5 11.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z',
  code: 'M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5M9 3l-2 10',
  branch: 'M4.5 2.5v11M4.5 10.5c0-3 7-2.5 7-6M11.5 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4.5 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  layers: 'M8 2l6 3.2-6 3.2-6-3.2L8 2zM2 8l6 3.2L14 8M2 10.8L8 14l6-3.2',
  list: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01',
  terminal: 'M2.5 3h11a1 1 0 011 1v8a1 1 0 01-1 1h-11a1 1 0 01-1-1V4a1 1 0 011-1zM4.5 6.5L6.5 8l-2 1.5M8 10h3',
  clock: 'M8 14A6 6 0 108 2a6 6 0 000 12zM8 4.5V8l2.5 1.5',
  history: 'M2.5 8a5.5 5.5 0 101.6-3.9M2.5 2.5v2.5H5M8 5v3l2 1.5',
  compare: 'M5 2.5v11M11 2.5v11M2.5 5H5M11 11h2.5M2.5 11H5M11 5h2.5',
  package: 'M8 1.8l5.5 3v6.4L8 14.2l-5.5-3V4.8L8 1.8zM2.7 4.9L8 7.9l5.3-3M8 7.9v6.2',
  activity: 'M1.5 8h3l2-5 3 10 2-5h3',
  grid: 'M2.5 2.5h4.5V7H2.5zM9 2.5h4.5V7H9zM2.5 9H7v4.5H2.5zM9 9h4.5v4.5H9z',
  wrench: 'M10.2 2.3a3.3 3.3 0 00-4 4.3L2.4 10.4a1.4 1.4 0 002 2l3.8-3.8a3.3 3.3 0 004.3-4l-2 2-1.8-.5-.5-1.8 2-2z',
  report: 'M4 1.8h5.5L12.5 5v8.2a1 1 0 01-1 1h-7a1 1 0 01-1-1V2.8a1 1 0 011-1zM6 8h4.5M6 10.5h4.5M6 5.5h2',
  menu: 'M2.5 4h11M2.5 8h11M2.5 12h11',
  play: 'M5 3.2v9.6L12.5 8 5 3.2z',
  beaker: 'M6 2h4M6.5 2v4.2L2.8 12.6A1 1 0 003.7 14h8.6a1 1 0 00.9-1.4L9.5 6.2V2M4.5 10h7',
  refresh: 'M13.5 8A5.5 5.5 0 113.7 4.5M3.5 1.5v3h3',
  trash: 'M3 4.5h10M6.5 4.5V3a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1.5M4.5 4.5l.6 8.6a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8.6',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 10a2 2 0 100-4 2 2 0 000 4z',
  'thumb-up': 'M5 7v6.5H2.5V7H5zM5 7l2.5-5c1 0 1.8.8 1.6 1.8L8.6 6.5h4.1a1 1 0 011 1.2l-1 4.8a1 1 0 01-1 .8H5',
  'thumb-down': 'M11 9V2.5h2.5V9H11zM11 9l-2.5 5c-1 0-1.8-.8-1.6-1.8l.5-2.7H3.3a1 1 0 01-1-1.2l1-4.8a1 1 0 011-.8H11',
  lock: 'M4 7V5a4 4 0 018 0v2M3.5 7h9a1 1 0 011 1v5a1 1 0 01-1 1h-9a1 1 0 01-1-1V8a1 1 0 011-1z',
  'arrow-down': 'M8 3v10M4 9l4 4 4-4',
  minus: 'M3.5 8h9',
  plus: 'M8 3.5v9M3.5 8h9',
  database: 'M8 5.5c3 0 5.5-.9 5.5-2S11 1.5 8 1.5 2.5 2.4 2.5 3.5 5 5.5 8 5.5zM2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
