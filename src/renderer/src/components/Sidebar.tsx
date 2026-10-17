import type { ComponentType } from 'react'
import {
  BrandMark,
  DictionaryIcon,
  HistoryIcon,
  HomeIcon,
  InfoIcon,
  InsightsIcon,
  NotesIcon,
  SettingsIcon,
  WaveIcon
} from './Icons'

export type View =
  | 'home'
  | 'history'
  | 'transcribe'
  | 'notes'
  | 'insights'
  | 'dictionary'
  | 'settings'
  | 'about'

interface NavItem {
  id: View
  label: string
  icon: ComponentType
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'transcribe', label: 'Transcribe', icon: WaveIcon },
  { id: 'notes', label: 'Quick Notes', icon: NotesIcon },
  { id: 'insights', label: 'Insights', icon: InsightsIcon },
  { id: 'dictionary', label: 'Dictionary', icon: DictionaryIcon }
]

interface SidebarProps {
  view: View
  onView: (view: View) => void
  onTranscribeFile: () => void
  busy: boolean
  collapsed: boolean
}

export default function Sidebar({
  view,
  onView,
  onTranscribeFile,
  busy,
  collapsed
}: SidebarProps) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="brand">
        <BrandMark />
        <span>Spireflow</span>
      </div>

      <nav className="nav">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item${view === item.id ? ' active' : ''}`}
              onClick={() => onView(item.id)}
              title={item.label}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="btn-dark"
          onClick={onTranscribeFile}
          disabled={busy}
          title="Transcribe a File"
        >
          <WaveIcon />
          <span>{busy ? 'Transcribing…' : 'Transcribe a File'}</span>
        </button>

        <div className="nav nav-flat">
          <button
            className={`nav-item${view === 'settings' ? ' active' : ''}`}
            onClick={() => onView('settings')}
            title="Settings"
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
          <button
            className={`nav-item${view === 'about' ? ' active' : ''}`}
            onClick={() => onView('about')}
            title="About"
          >
            <InfoIcon />
            <span>About</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
