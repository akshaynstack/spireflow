interface IconProps {
  size?: number
}

const base = (size: number): { width: number; height: number; viewBox: string; fill: string } => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none'
})

export function HomeIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

export function HistoryIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function WaveIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 10v4M8 7v10M12 5v14M16 8v8M20 11v2" />
    </svg>
  )
}

export function NotesIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  )
}

export function InsightsIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 20V11M12 20V5M19 20v-6" />
    </svg>
  )
}

export function DictionaryIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
      <path d="M5 8h13" />
    </svg>
  )
}

export function SettingsIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.2 7.5l1.7 1M18.1 15.5l1.7 1M4.2 16.5l1.7-1M18.1 8.5l1.7-1" />
    </svg>
  )
}

export function InfoIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  )
}

export function SidebarIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </svg>
  )
}

export function BrandMark({ size = 24 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 3v18M7 9v6M17 9v6M3 12h2M19 12h2" />
    </svg>
  )
}

export function KeyGlyph({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11 4.5 6.5a4 4 0 1 1 3-3L12 8" />
      <circle cx="14.5" cy="9.5" r="4.5" />
    </svg>
  )
}
