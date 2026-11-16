import { useMemo, useState } from 'react'
import type { Note, SavedView } from '../types'
import { categoryPool, collectCategories } from '@grail/core'
import { isQueryActive, matchesQuery, matchesText, queryTags, toggleQueryTag } from '@grail/core'
import { NoteList } from './NoteList'
import { Empty, SearchField, TopBar } from '../ui/primitives'
import { Icon } from '../ui/icons'

export function CategoriesView({ notes, views, onOpen, onSaveView, onDeleteView, onReview, header }: {
  notes: Note[]
  views: SavedView[]
  onOpen: (n: Note) => void
  onSaveView: (name: string, query: string) => void
  onDeleteView: (id: string) => void
  onReview: (category: string) => void
  header: React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const [activeView, setActiveView] = useState<string | null>(null)
  const [naming, setNaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [catSearch, setCatSearch] = useState('')

  const categories = useMemo(() => collectCategories(notes), [notes])
  const active = isQueryActive(query)
  const tags = useMemo(() => queryTags(query), [query])
  const filtered = useMemo(() => notes.filter((n) => matchesQuery(n, query)), [notes, query])
  const max = Math.max(1, ...categories.map((c) => c.count))

  const update = (q: string) => { setQuery(q); setActiveView(null) }
  const reset = () => { setQuery(''); setActiveView(null); setNaming(false) }
  const save = () => {
    if (!draft.trim()) return
    onSaveView(draft, query)
    setNaming(false); setDraft('')
  }

  if (open) {
    const pool = categoryPool(notes, open)
    const shown = pool.filter((n) => matchesText(n, catSearch))
    return (
      <div className="page pb-36 view-enter">
        <TopBar title={`#${open}`} sub={`${pool.length} ${pool.length === 1 ? 'note' : 'notes'}`} onBack={() => { setOpen(null); setCatSearch('') }}>
          {pool.length > 0 && (
            <button onClick={() => onReview(open)} className="btn-quiet h-10 min-h-0 rounded-full px-4 text-accent-light">
              <Icon.read size={18} /> Read
            </button>
          )}
        </TopBar>
        <div className="mb-4"><SearchField value={catSearch} onChange={setCatSearch} placeholder={`Search #${open}`} /></div>
        <NoteList
          notes={shown}
          onOpen={onOpen}
          empty={<Empty icon={<Icon.hash />} title={pool.length ? 'Nothing matches' : 'Nothing tagged yet'}>
            {pool.length ? 'Try another word.' : <>Write <span className="font-mono text-accent-light">#{open}</span> in any note.</>}
          </Empty>}
        />
      </div>
    )
  }

  return (
    <div className="page pb-36 view-enter">
      <TopBar title="Tags" sub={`${categories.length} in use`}>{header}</TopBar>

      {views.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {views.map((v) => {
            const on = activeView === v.id
            return (
              <span key={v.id} className={`chip pr-1.5 ${on ? 'bg-accent text-[#fffaf2] hover:bg-accent' : ''}`}>
                <button onClick={() => (on ? reset() : (setQuery(v.query), setActiveView(v.id)))} className="max-w-[11rem] truncate">
                  {v.name}
                </button>
                <button onClick={() => { onDeleteView(v.id); if (on) reset() }} aria-label={`Delete ${v.name}`} className="rounded-full p-0.5 opacity-60 hover:opacity-100">
                  <Icon.close size={13} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="mb-3"><SearchField value={query} onChange={update} placeholder="#npcs #active -#draft  OR  words" mono /></div>

      {active ? (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {categories.map(({ name, count }) => {
              const state = tags.include.has(name) ? 'in' : tags.exclude.has(name) ? 'out' : ''
              return (
                <button
                  key={name}
                  onClick={() => update(toggleQueryTag(query, name))}
                  className={`chip font-mono ${state === 'in' ? 'bg-accent text-[#fffaf2] hover:bg-accent' : state === 'out' ? 'bg-red-900/30 text-red-300 line-through' : ''}`}
                >
                  #{name}<span className="opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
          <div className="mb-4 flex items-center gap-3 px-1 text-xs">
            <span className="text-paper-dimmer">{filtered.length} of {notes.length}</span>
            <button onClick={reset} className="text-paper-dimmer hover:text-paper">Clear</button>
            {!naming && activeView === null && (
              <button onClick={() => setNaming(true)} className="text-accent-light hover:text-paper">Save as view</button>
            )}
            {naming && (
              <span className="flex items-center gap-2">
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setNaming(false) }}
                  placeholder="View name" className="field w-36 py-1.5" />
                <button onClick={save} className="text-accent-light">Save</button>
              </span>
            )}
          </div>
          <NoteList notes={filtered} onOpen={onOpen} empty={<Empty icon={<Icon.search />} title="No matches" />} />
        </>
      ) : categories.length === 0 ? (
        <Empty icon={<Icon.hash />} title="No tags yet">
          Write <span className="font-mono text-accent-light">#places</span> anywhere in a note, or title an empty note
          <span className="font-mono text-accent-light"> #places</span> to give the tag its own page.
        </Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map(({ name, count }) => (
            <li key={name}>
              <button
                onClick={() => { setOpen(name); setCatSearch('') }}
                className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-ink-surface px-4 py-3.5 text-left transition hover:bg-ink-surface2/70"
              >
                <span className="absolute inset-y-0 left-0 bg-accent/10" style={{ width: `${(count / max) * 100}%` }} />
                <Icon.hash size={18} className="relative text-accent-light" />
                <span className="relative min-w-0 flex-1 truncate text-[15px] text-paper">{name}</span>
                <span className="relative font-mono text-xs text-paper-dimmer">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
