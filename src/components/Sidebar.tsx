import { useEffect, useRef, useState } from 'react'
import { collectCategories } from '@grail/core'
import type { Note, NoteType } from '../types'
import type { SavedView } from '../types'
import { Icon, NoteTypeIcon, Wordmark } from '../ui/icons'
import { ENV } from '../env'
import { contextMenu } from '../native/menu'

export type Section = 'browse' | 'review' | 'categories'

const NAV: { key: Section; label: string; icon: typeof Icon.library; keys: string }[] = [
  { key: 'browse', label: 'Notes', icon: Icon.library, keys: 'Ctrl+1' },
  { key: 'review', label: 'Read', icon: Icon.read, keys: 'Ctrl+2' },
  { key: 'categories', label: 'Tags', icon: Icon.hash, keys: 'Ctrl+3' },
]

const NEW: { type: NoteType; label: string }[] = [
  { type: 'text', label: 'Note' },
  { type: 'drawing', label: 'Drawing' },
  { type: 'media', label: 'Image' },
]

const row = (on: boolean) =>
  `flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${on ? 'bg-accent/20 text-paper' : 'text-paper-dim hover:bg-ink-surface2/70 hover:text-paper'}`

// The left column: what to look at (Notes, Read, Tags, your tags and saved views), New, and Settings.
export function Sidebar({ section, onSection, notes, views, search, onSearch, onReadTag, onNew, onSettings, homeName, settingsOn }: {
  section: Section
  onSection: (s: Section) => void
  notes: Note[]
  views: SavedView[]
  search: string
  onSearch: (q: string) => void
  onReadTag: (tag: string) => void
  onNew: (type: NoteType) => void
  onSettings: () => void
  homeName: string
  settingsOn: boolean
}) {
  const tags = collectCategories(notes).filter((t) => t.name !== 'deleted')
  const counts = { browse: notes.filter((n) => !n.tags.includes('deleted')).length, review: 0, categories: tags.length }
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('mousedown', close); window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc) }
  }, [menu])

  const showTag = (t: string) => { onSection('browse'); onSearch(`#${t}`) }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-56 select-none flex-col border-r border-ink-surface2/70 bg-ink-surface/60">
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <Wordmark size={24} className="text-accent-light" />
        {ENV !== 'prod' && <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-light">{ENV}</span>}
      </div>

      <div ref={menuRef} className="relative mx-3 mb-3 flex">
        <button onClick={() => onNew('text')} title="New note (Ctrl+N)"
          className="flex flex-1 items-center gap-2 rounded-l-md bg-accent px-3 py-1.5 text-[13px] font-medium text-[#fffaf2] hover:brightness-110">
          <Icon.plus size={15} strokeWidth={2.25} /> New note
        </button>
        <button onClick={() => setMenu((m) => !m)} aria-label="New…" aria-expanded={menu}
          className="rounded-r-md border-l border-black/20 bg-accent px-1.5 text-[#fffaf2] hover:brightness-110">
          <Icon.chevronDown size={15} />
        </button>
        {menu && (
          <div role="menu" className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-ink-surface2 bg-ink-surface p-1 shadow-lift">
            {NEW.map((o) => (
              <button key={o.type} role="menuitem" onClick={() => { setMenu(false); onNew(o.type) }} className={row(false)}>
                <NoteTypeIcon type={o.type} size={15} /> {o.label}
                {o.type === 'text' && <span className="ml-auto text-[11px] text-paper-dimmer">Ctrl+N</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="space-y-0.5 px-2">
        {NAV.map(({ key, label, icon: I, keys }) => (
          <button key={key} onClick={() => { onSection(key); if (key === 'browse') onSearch('') }} title={`${label} (${keys})`}
            className={row(!settingsOn && section === key && !(key === 'browse' && search))}>
            <I size={16} /> <span className="flex-1">{label}</span>
            {key !== 'review' && <span className="text-[11px] text-paper-dimmer">{counts[key]}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {views.length > 0 && (
          <>
            <p className="px-2 pb-1 text-[11px] font-semibold text-paper-dimmer">Saved views</p>
            {views.map((v) => (
              <button key={v.id} onClick={() => { onSection('browse'); onSearch(v.query) }} title={v.query}
                className={row(section === 'browse' && search === v.query)}>
                <Icon.rows size={15} /> <span className="truncate">{v.name}</span>
              </button>
            ))}
            <div className="h-3" />
          </>
        )}
        {tags.length > 0 && <p className="px-2 pb-1 text-[11px] font-semibold text-paper-dimmer">Tags</p>}
        {tags.map((t) => (
          <div key={t.name} className="group relative">
            <button onClick={() => showTag(t.name)}
              onContextMenu={(e) => { e.preventDefault(); void contextMenu([{ label: `Show #${t.name}`, action: () => showTag(t.name) }, { label: `Read #${t.name}`, action: () => onReadTag(t.name) }]) }}
              className={row(section === 'browse' && search === `#${t.name}`)}>
              <span className="text-accent-light/80">#</span><span className="flex-1 truncate">{t.name}</span>
              <span className="text-[11px] text-paper-dimmer group-hover:opacity-0">{t.count}</span>
            </button>
            <button onClick={() => onReadTag(t.name)} title={`Read #${t.name}`} aria-label={`Read #${t.name}`}
              className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-paper-dimmer hover:bg-ink-surface2 hover:text-paper group-hover:block">
              <Icon.read size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 border-t border-ink-surface2/70 px-2 py-2">
        <span className="min-w-0 flex-1 truncate px-2 text-[11px] text-paper-dimmer" title={homeName}>
          <Icon.folder size={12} className="mr-1 inline -translate-y-px" />{homeName}
        </span>
        <button onClick={onSettings} title="Settings (Ctrl+,)" aria-label="Settings"
          className={`rounded-md p-1.5 ${settingsOn ? 'bg-accent/20 text-paper' : 'text-paper-dim hover:bg-ink-surface2 hover:text-paper'}`}>
          <Icon.settings size={16} />
        </button>
      </div>
    </aside>
  )
}
