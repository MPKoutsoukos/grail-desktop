import { formatDistanceToNowStrict } from 'date-fns'
import type { ReactNode } from 'react'
import type { Note } from '../types'
import { useImage } from '../hooks/useImage'
import { categoryName, excerpt, noteKind } from '@grail/core'
import { Icon, NoteTypeIcon } from '../ui/icons'

function Thumb({ note }: { note: Note }) {
  const src = useImage(note.drawingPath ?? note.mediaPath)
  if (src) {
    return <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-ink-surface2 bg-ink object-cover" />
  }
  const cat = categoryName(note)
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-accent-light">
      {cat ? <Icon.hash size={20} /> : <NoteTypeIcon type={note.type} size={20} />}
    </span>
  )
}

function Label({ note }: { note: Note }) {
  const kind = noteKind(note)
  if (kind === 'category') return <span className="text-accent-light">category</span>
  if (kind === 'loose') return <span>loose</span>
  return null
}

export function NoteList({ notes, onOpen, removedIds, empty }: {
  notes: Note[]
  onOpen: (note: Note) => void
  removedIds?: Set<string>
  empty?: ReactNode
}) {
  if (notes.length === 0) return <>{empty}</>
  return (
    <ul className="space-y-2">
      {notes.map((note) => {
        const kind = noteKind(note)
        const heading = kind === 'timeline' ? excerpt(note.body, 80) || note.title : note.title || 'Untitled'
        const sub = kind === 'timeline' ? note.title : excerpt(note.body)
        return (
          <li key={note.id}>
            <button
              onClick={() => onOpen(note)}
              className="group flex w-full items-center gap-3.5 rounded-2xl bg-ink-surface p-3 text-left transition
                         hover:bg-ink-surface2/70 active:scale-[0.995]"
            >
              <Thumb note={note} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[17px] leading-snug text-paper">{heading}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-paper-dimmer">
                  <span className="shrink-0">{formatDistanceToNowStrict(note.updated, { addSuffix: true })}</span>
                  <Label note={note} />
                  {sub && sub !== heading && <span className="truncate">· {sub}</span>}
                </span>
                {(note.tags.length > 0 || removedIds?.has(note.id)) && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {note.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] text-accent-light/90">#{t}</span>
                    ))}
                    {removedIds?.has(note.id) && (
                      <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] text-paper-dimmer">out of review</span>
                    )}
                  </span>
                )}
              </span>
              <Icon.chevronRight size={18} className="shrink-0 text-paper-dimmer opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
