import { useMemo, useState } from 'react'
import { differenceInCalendarDays, formatDistanceToNowStrict, isSameDay, isSameMonth } from 'date-fns'
import type { Note } from '../types'
import { matchesText } from '@grail/core'
import { excerpt, noteKind } from '@grail/core'
import { NoteList } from './NoteList'
import { Empty, SearchField, TopBar } from '../ui/primitives'
import { Icon, Wordmark } from '../ui/icons'
import { ENV } from '../env'

// Echoes: one older fragment, resurfaced. Prefer anniversaries (same day of a
// past month/year), otherwise anything older than a week. Stable for the day.
function pickEcho(notes: Note[], salt: number): Note | null {
  const now = new Date()
  const old = notes.filter((n) => noteKind(n) === 'timeline' && n.body.trim() && differenceInCalendarDays(now, n.created) >= 7)
  if (!old.length) return null
  const anniversaries = old.filter((n) => new Date(n.created).getDate() === now.getDate())
  const pool = anniversaries.length ? anniversaries : old
  const seed = Math.floor(Date.now() / 86_400_000) + salt
  return pool[seed % pool.length]
}

function Echo({ note, onOpen, onShuffle }: { note: Note; onOpen: () => void; onShuffle: () => void }) {
  return (
    <div className="card relative mb-5 overflow-hidden animate-fade-in">
      <button onClick={onOpen} className="block w-full p-4 pr-12 text-left">
        <p className="eyebrow mb-2 flex items-center gap-1.5 text-accent-light">
          <Icon.sparkle size={13} /> echo · {formatDistanceToNowStrict(note.created, { addSuffix: true })}
        </p>
        <p className="reading line-clamp-3 text-[17px] italic leading-relaxed text-paper-dim">“{excerpt(note.body, 220)}”</p>
      </button>
      <button onClick={onShuffle} aria-label="Another echo" className="icon-btn absolute right-1 top-1 text-paper-dimmer">
        <Icon.shuffle size={17} />
      </button>
    </div>
  )
}

function bucket(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (isSameDay(d, now)) return 'Today'
  const days = differenceInCalendarDays(now, d)
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'This week'
  if (isSameMonth(d, now)) return 'This month'
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function BrowseView({ notes, removedIds, search, onSearch, onOpen, echoes, header }: {
  notes: Note[]
  removedIds: Set<string>
  search: string
  onSearch: (v: string) => void
  onOpen: (n: Note) => void
  echoes: boolean
  header: React.ReactNode
}) {
  const [salt, setSalt] = useState(0)
  const filtered = useMemo(() => notes.filter((n) => matchesText(n, search)), [notes, search])
  const echo = useMemo(() => (echoes && !search ? pickEcho(notes, salt) : null), [echoes, search, notes, salt])

  const groups = useMemo(() => {
    const out: { label: string; notes: Note[] }[] = []
    for (const n of [...filtered].sort((a, b) => b.updated - a.updated)) {
      const label = bucket(n.updated)
      const last = out[out.length - 1]
      if (last?.label === label) last.notes.push(n)
      else out.push({ label, notes: [n] })
    }
    return out
  }, [filtered])

  return (
    <div className="page pb-36 view-enter">
      <TopBar
        title={<span className="flex items-center gap-2"><Wordmark size={30} className="text-accent-light" />{ENV !== 'prod' && <span className="rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-accent-light">{ENV}</span>}</span>}
        sub={`${notes.length} ${notes.length === 1 ? 'fragment' : 'fragments'}`}
      >
        {header}
      </TopBar>

      <div className="mb-5"><SearchField value={search} onChange={onSearch} /></div>

      {echo && <Echo note={echo} onOpen={() => onOpen(echo)} onShuffle={() => setSalt((s) => s + 1)} />}

      {notes.length === 0 ? (
        <Empty icon={<Icon.pen size={26} />} title="An empty vessel">
          Tap <span className="text-accent-light">+</span> to write your first fragment. Everything stays in plain
          markdown files you own.
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty icon={<Icon.search />} title="Nothing matches">Try fewer words, or search a #tag.</Empty>
      ) : search ? (
        <NoteList notes={filtered} onOpen={onOpen} removedIds={removedIds} />
      ) : (
        groups.map((g) => (
          <section key={g.label} className="mb-5">
            <h2 className="eyebrow mb-2 px-1">{g.label}</h2>
            <NoteList notes={g.notes} onOpen={onOpen} removedIds={removedIds} />
          </section>
        ))
      )}
    </div>
  )
}
