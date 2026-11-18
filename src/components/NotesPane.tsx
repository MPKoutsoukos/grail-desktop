import { useMemo, useRef } from 'react'
import { differenceInCalendarDays, format, formatDistanceToNowStrict, isSameDay, isSameMonth, isSameYear } from 'date-fns'
import type { Note } from '../types'
import { categoryName, excerpt, isDeleted, matchesQuery, noteKind } from '@grail/core'
import { Icon, NoteTypeIcon } from '../ui/icons'
import { useImage } from '../hooks/useImage'
import { contextMenu } from '../native/menu'

// The middle pane: every note, newest first, grouped by when it was last touched. Clicking a note opens it beside
// the list; the list stays put. Search takes words and #tag queries (#a #b, #a OR #b, -#c).

function bucket(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (isSameDay(d, now)) return 'Today'
  const days = differenceInCalendarDays(now, d)
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'This week'
  if (isSameMonth(d, now)) return 'This month'
  return format(d, isSameYear(d, now) ? 'MMMM' : 'MMMM yyyy')
}

const when = (ts: number) => {
  const d = new Date(ts)
  return isSameDay(d, new Date()) ? format(d, 'HH:mm') : format(d, isSameYear(d, new Date()) ? 'd MMM' : 'd MMM yyyy')
}

function Thumb({ note }: { note: Note }) {
  const src = useImage(note.drawingPath ?? note.mediaPath)
  if (!src) return null
  return <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-md border border-ink-surface2 bg-ink object-cover" />
}

export function NotesPane({ notes, search, onSearch, selectedId, onOpen, onDelete, onNew }: {
  notes: Note[]
  search: string
  onSearch: (v: string) => void
  selectedId: string | null
  onOpen: (n: Note) => void
  onDelete: (id: string) => void
  onNew: () => void
}) {
  const filtered = useMemo(() => notes.filter((n) => matchesQuery(n, search)).sort((a, b) => b.updated - a.updated), [notes, search])
  const groups = useMemo(() => {
    const out: { label: string; notes: Note[] }[] = []
    for (const n of filtered) {
      const label = bucket(n.updated)
      const last = out[out.length - 1]
      if (last?.label === label) last.notes.push(n)
      else out.push({ label, notes: [n] })
    }
    return out
  }, [filtered])

  // ↑/↓ move through the list while it has focus; Enter opens.
  const listRef = useRef<HTMLDivElement>(null)
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const i = filtered.findIndex((n) => n.id === selectedId)
    const next = filtered[Math.max(0, Math.min(filtered.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
    if (!next) return
    onOpen(next)
    listRef.current?.querySelector(`[data-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  const menuFor = (n: Note) => void contextMenu([
    { label: 'Open', action: () => onOpen(n) },
    'separator',
    { label: isDeleted(n) ? 'Delete for good…' : 'Delete', action: () => onDelete(n.id) },
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 pb-2">
        <label className="relative block">
          <Icon.search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-paper-dimmer" />
          <input type="search" data-search value={search} onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && search) { e.preventDefault(); onSearch('') } if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.focus() } }}
            placeholder="Search  (Ctrl+F)"
            className="w-full rounded-md border border-ink-surface2 bg-ink py-1.5 pl-8 pr-2 text-[13px] text-paper outline-none placeholder:text-paper-dimmer focus:border-accent-light/60 [&::-webkit-search-cancel-button]:hidden" />
        </label>
        <p className="mt-2 px-0.5 text-[11px] text-paper-dimmer">
          {search ? `${filtered.length} of ${notes.filter((n) => !isDeleted(n)).length} notes` : `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`}
        </p>
      </div>
      <div ref={listRef} tabIndex={0} onKeyDown={onKey} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 outline-none" role="listbox" aria-label="Notes">
        {filtered.length === 0 ? (
          <div className="px-3 py-10 text-center text-[13px] text-paper-dimmer">
            {notes.length === 0
              ? <>No notes yet. <button onClick={onNew} className="text-accent-light hover:underline">Write the first one</button> (Ctrl+N).</>
              : 'Nothing matches. Try fewer words, or a #tag.'}
          </div>
        ) : groups.map((g) => (
          <section key={g.label} className="mb-2">
            <h2 className="sticky top-0 z-[1] bg-ink-surface/95 px-2 py-1 text-[11px] font-semibold text-paper-dimmer backdrop-blur">{g.label}</h2>
            {g.notes.map((n) => {
              const kind = noteKind(n)
              const cat = categoryName(n)
              const heading = kind === 'timeline' ? excerpt(n.body, 90) || n.title : n.title || 'Untitled'
              const sub = kind === 'timeline' ? '' : excerpt(n.body, 90)
              const on = n.id === selectedId
              return (
                <button key={n.id} data-id={n.id} role="option" aria-selected={on}
                  onClick={() => onOpen(n)} onContextMenu={(e) => { e.preventDefault(); menuFor(n) }}
                  className={`flex w-full gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${on ? 'bg-accent/20' : 'hover:bg-ink-surface2/60'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      {cat ? <Icon.hash size={12} className="shrink-0 text-accent-light" /> : n.type !== 'text' ? <NoteTypeIcon type={n.type} size={12} className="shrink-0 text-paper-dimmer" /> : null}
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-paper">{heading}</span>
                      <span className="shrink-0 text-[11px] text-paper-dimmer" title={formatDistanceToNowStrict(n.updated, { addSuffix: true })}>{when(n.updated)}</span>
                    </span>
                    {sub && <span className="mt-0.5 block truncate text-[12px] text-paper-dimmer">{sub}</span>}
                    {n.tags.length > 0 && (
                      <span className="mt-0.5 block truncate text-[11px] text-accent-light/80">{n.tags.slice(0, 4).map((t) => `#${t}`).join('  ')}</span>
                    )}
                  </span>
                  <Thumb note={n} />
                </button>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
