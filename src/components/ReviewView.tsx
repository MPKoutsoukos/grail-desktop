import { Fragment, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import type { Note, ReviewTemplate } from '../types'
import { useImage } from '../hooks/useImage'
import { Markdown } from './Markdown'
import { Empty, Sheet, SheetItem, TopBar } from '../ui/primitives'
import { Icon } from '../ui/icons'
import { excerpt } from '@grail/core'

interface Props {
  compiled: Note[]
  loose?: Note[]
  removedNotes: Note[]
  title?: string
  template: ReviewTemplate
  header?: React.ReactNode
  onEdit: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onRemove: (id: string) => void
  /** Delete: to #deleted (hidden until a search asks for #deleted). */
  onDelete?: (id: string) => void
  onMakeLoose?: (id: string) => void
  onRestore: (id: string) => void
  onClearRemoved: () => void
  onExit?: () => void
}

function NoteBody({ note }: { note: Note }) {
  const src = useImage(note.drawingPath ?? note.mediaPath)
  return (
    <>
      {(note.type === 'drawing' || note.type === 'media') && (
        src
          ? <img src={src} alt="" className="my-2 w-full rounded-2xl border border-ink-surface2" />
          : <div className="my-2 h-40 rounded-2xl bg-ink-surface" />
      )}
      {note.body && <Markdown>{note.body}</Markdown>}
    </>
  )
}

const chapterLabel = (n: Note) =>
  excerpt(n.body, 48) || n.title.trim() || format(n.created, 'd MMM HH:mm')

// Thin progress line under the header while reading.
function useReadProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return p
}

export function ReviewView(props: Props) {
  const { compiled, loose = [], removedNotes, title = 'Read', template, header, onExit } = props
  const [active, setActive] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progress = useReadProgress()

  // The fragment the keyboard is on (J/K); its actions work on it.
  const [focus, setFocus] = useState<string | null>(null)

  // Press and hold opens the actions on touch screens only: with a mouse it would fight text selection.
  const press = (e: React.PointerEvent, id: string) => {
    if (e.pointerType !== 'touch') return
    timer.current = setTimeout(() => setActive(id), 450)
  }
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  const jump = (id: string) => {
    setDrawer(false)
    requestAnimationFrame(() => document.getElementById(`ch-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const askDelete = (id: string) => {
    if (props.onDelete && confirm('Delete this fragment? It moves to #deleted: hidden everywhere, but search #deleted to find it again.')) props.onDelete(id)
  }

  // Keyboard: J/K (or ↓/↑ once a fragment is picked) to go through fragments, Enter or E to edit, Alt+↑/↓ to move,
  // X to take out of the read, Delete to delete, C for contents, Esc to let go.
  const live = useRef({ compiled, focus, active, drawer, props })
  useEffect(() => { live.current = { compiled, focus, active, drawer, props } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey) return
      const { compiled: list, focus: f, active: a, drawer: d, props: p } = live.current
      if (a || d || !list.length) return
      const i = f ? list.findIndex((n) => n.id === f) : -1
      const go = (j: number) => {
        const n = list[Math.max(0, Math.min(list.length - 1, j))]
        setFocus(n.id)
        document.getElementById(`ch-${n.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      const k = e.key.toLowerCase()
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (f) { e.preventDefault(); p.onMove(f, e.key === 'ArrowUp' ? -1 : 1) }
        return
      }
      if (k === 'j' || (f && e.key === 'ArrowDown')) { e.preventDefault(); go(i + 1); return }
      if (k === 'k' || (f && e.key === 'ArrowUp')) { e.preventDefault(); go(i < 0 ? 0 : i - 1); return }
      if (k === 'c') { e.preventDefault(); setDrawer(true); return }
      if (!f) return
      if (e.key === 'Enter' || k === 'e') { e.preventDefault(); p.onEdit(f) }
      else if (k === 'x') { e.preventDefault(); p.onRemove(f); setFocus(list[i + 1]?.id ?? list[i - 1]?.id ?? null) }
      else if (e.key === 'Delete') { e.preventDefault(); askDelete(f) }
      else if (e.key === 'Escape') { e.preventDefault(); setFocus(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // askDelete reads props through live; it's stable enough for a key handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Tool = ({ label, keys, onClick, danger, children }: { label: string; keys: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} title={`${label} (${keys})`} aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-lg text-paper-dim transition-colors hover:bg-ink-surface2 ${danger ? 'hover:text-red-400' : 'hover:text-paper'}`}>
      {children}
    </button>
  )

  const Block = ({ note, card }: { note: Note; card?: boolean }) => {
    const i = compiled.indexOf(note)
    const on = focus === note.id || active === note.id
    return (
      <section
        id={`ch-${note.id}`}
        onPointerDown={(e) => press(e, note.id)}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerMove={cancel}
        onContextMenu={(e) => { e.preventDefault(); setFocus(note.id); setActive(note.id) }}
        onDoubleClick={() => props.onEdit(note.id)}
        onClick={() => setFocus(note.id)}
        className={`group relative scroll-mt-24 rounded-2xl border-l-2 transition-colors
          ${on ? 'border-accent-light' : 'border-transparent'} ${card ? 'card p-5' : '-mx-4 px-4 py-1'}`}
      >
        {/* Hover (or the keyboard's pick) shows the fragment's actions. */}
        <div className={`absolute -top-4 right-2 z-10 flex gap-0.5 rounded-xl border border-ink-surface2 bg-ink-surface p-1 shadow-lift transition-opacity
          ${on ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'}`}>
          <Tool label="Edit" keys="E or double-click" onClick={() => props.onEdit(note.id)}><Icon.pen size={16} /></Tool>
          <Tool label="Move up" keys="Alt+↑" onClick={() => props.onMove(note.id, -1)}><Icon.chevronUp size={16} /></Tool>
          <Tool label="Move down" keys="Alt+↓" onClick={() => props.onMove(note.id, 1)}><Icon.chevronDown size={16} /></Tool>
          <Tool label="Take out of the read" keys="X" onClick={() => props.onRemove(note.id)}><Icon.close size={16} /></Tool>
          {props.onDelete && <Tool label="Delete (to #deleted)" keys="Delete" danger onClick={() => askDelete(note.id)}><Icon.trash size={16} /></Tool>}
          <span className="sr-only">{i + 1} of {compiled.length}</span>
        </div>
        <NoteBody note={note} />
      </section>
    )
  }

  const body = () => {
    if (template === 'cards') return <div className="space-y-4">{compiled.map((n) => <Block key={n.id} note={n} card />)}</div>
    if (template === 'timeline') {
      const day = (n: Note) => format(n.created, 'EEEE, d MMMM yyyy')
      return (
        <div className="relative space-y-6 border-l border-ink-surface2 pl-5">
          {compiled.map((n, i) => (
            <Fragment key={n.id}>
              {(i === 0 || day(n) !== day(compiled[i - 1])) && (
                <p className="eyebrow relative -ml-5 pl-5 pt-2 text-accent-light">
                  <span className="absolute -left-[5px] top-[13px] h-2.5 w-2.5 rounded-full bg-accent-light" />
                  {day(n)}
                </p>
              )}
              <Block note={n} />
            </Fragment>
          ))}
        </div>
      )
    }
    if (template === 'codex') {
      const groups = new Map<string, Note[]>()
      for (const n of compiled) {
        const k = n.tags[0] ?? 'untagged'
        groups.set(k, [...(groups.get(k) ?? []), n])
      }
      return (
        <div className="space-y-10">
          {[...groups].map(([cat, ns]) => (
            <section key={cat}>
              <h2 className="mb-4 flex items-center gap-3 font-serif text-2xl text-accent-light">
                <Icon.hash size={20} />{cat}<span className="h-px flex-1 bg-ink-surface2" />
              </h2>
              <div className="space-y-5">{ns.map((n) => <Block key={n.id} note={n} />)}</div>
            </section>
          ))}
        </div>
      )
    }
    // Manuscript: one continuous read. No marks between fragments, a little air, and a quiet date when the day
    // changes (in the margin on wide windows), as on the phone.
    const day = (n: Note) => format(n.created, 'd MMM yyyy')
    return (
      <div className="space-y-7">
        {compiled.map((n, i) => (
          <div key={n.id} className="relative">
            {(i === 0 || day(n) !== day(compiled[i - 1])) && (
              <p aria-hidden className="mb-1 select-none text-[11px] tracking-wide text-accent-light/80 xl:absolute xl:-left-32 xl:top-2 xl:mb-0 xl:w-24 xl:text-right">
                {format(n.created, n.created < Date.now() - 300 * 86_400_000 ? 'd MMM yyyy' : 'd MMM')}
              </p>
            )}
            <Block note={n} />
          </div>
        ))}
      </div>
    )
  }

  const note = compiled.find((n) => n.id === active)
  const idx = note ? compiled.indexOf(note) : -1

  return (
    <div className="page pb-36 view-enter">
      <TopBar title={title} sub={`${compiled.length} ${compiled.length === 1 ? 'fragment' : 'fragments'}`} onBack={onExit}>
        {(compiled.length > 0 || loose.length > 0 || removedNotes.length > 0) && (
          <button onClick={() => setDrawer(true)} aria-label="Contents" className="icon-btn"><Icon.chapters /></button>
        )}
        {header}
      </TopBar>
      <div className="fixed inset-x-0 z-10 h-0.5 bg-accent-light/80 transition-[width] md:left-20"
        style={{ top: 'calc(var(--safe-top) + 3.6rem)', width: `${progress * 100}%` }} />

      {compiled.length === 0 ? (
        <Empty icon={<Icon.read />} title="Nothing to read yet">
          Fragments keep their date-and-time title to be gathered here, stitched into one continuous read.
        </Empty>
      ) : (
        <article className="reading pb-10 text-[19px]">{body()}</article>
      )}

      {/* Contents drawer: chapters, loose notes, and what's been set aside. */}
      {drawer && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/55 animate-fade" onClick={() => setDrawer(false)}>
          <aside className="h-full w-80 max-w-[86%] overflow-y-auto bg-ink-surface p-4 animate-slide-in"
            style={{ paddingTop: 'calc(var(--safe-top) + 1rem)' }} onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow mb-2">Contents · {compiled.length}</p>
            <ol className="mb-6 space-y-0.5">
              {compiled.map((n, i) => (
                <li key={n.id}>
                  <button onClick={() => jump(n.id)} className="flex w-full gap-3 rounded-xl px-2 py-2 text-left text-sm text-paper-dim hover:bg-ink-surface2 hover:text-paper">
                    <span className="w-5 shrink-0 text-right font-mono text-xs leading-5 text-paper-dimmer">{i + 1}</span>
                    <span className="truncate">{chapterLabel(n)}</span>
                  </button>
                </li>
              ))}
            </ol>
            {loose.length > 0 && (
              <>
                <p className="eyebrow mb-2">Loose notes · {loose.length}</p>
                <ul className="mb-6 space-y-0.5">
                  {loose.map((n) => (
                    <li key={n.id}>
                      <button onClick={() => { setDrawer(false); props.onEdit(n.id) }} className="w-full truncate rounded-xl px-2 py-2 text-left text-sm text-paper-dim hover:bg-ink-surface2 hover:text-paper">
                        {n.title || 'Untitled'}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {removedNotes.length > 0 && (
              <>
                <p className="eyebrow mb-2 flex items-center justify-between">
                  Set aside · {removedNotes.length}
                  <button onClick={props.onClearRemoved} className="normal-case tracking-normal text-paper-dimmer hover:text-paper">Forget all</button>
                </p>
                <ul className="space-y-0.5">
                  {removedNotes.map((n) => (
                    <li key={n.id}>
                      <button onClick={() => props.onRestore(n.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-paper-dimmer hover:bg-ink-surface2 hover:text-paper">
                        <Icon.restore size={15} className="shrink-0" /><span className="truncate">{chapterLabel(n)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      )}

      <ActionSheet
        key={active ?? "none"}
        note={note}
        atTop={idx === 0}
        atBottom={idx === compiled.length - 1}
        onClose={() => setActive(null)}
        onEdit={() => { props.onEdit(active!); setActive(null) }}
        onUp={() => { props.onMove(active!, -1); setActive(null) }}
        onDown={() => { props.onMove(active!, 1); setActive(null) }}
        onRemove={() => { props.onRemove(active!); setActive(null) }}
        onDelete={props.onDelete ? () => { askDelete(active!); setActive(null) } : undefined}
        onMakeLoose={props.onMakeLoose ? () => { props.onMakeLoose!(active!); setActive(null) } : undefined}
      />
    </div>
  )
}

function ActionSheet({ note, atTop, atBottom, onClose, onEdit, onUp, onDown, onRemove, onDelete, onMakeLoose }: {
  note?: Note; atTop: boolean; atBottom: boolean
  onClose: () => void; onEdit: () => void; onUp: () => void; onDown: () => void; onRemove: () => void; onDelete?: () => void; onMakeLoose?: () => void
}) {
  const [removing, setRemoving] = useState(false)
  return (
    <Sheet open={!!note} onClose={onClose} label="Fragment actions">
      {note && <p className="truncate px-4 pb-2 text-xs text-paper-dimmer">{chapterLabel(note)}</p>}
      {removing ? (
        <>
          <p className="px-4 pb-2 text-sm leading-relaxed text-paper-dim">
            Make it a loose note to keep it one tap away in Contents — or set it aside; you can bring it back any time.
          </p>
          <SheetItem icon={<Icon.pen />} label="Make it a loose note" onClick={() => onMakeLoose?.()} />
          <SheetItem icon={<Icon.close />} label="Set aside" onClick={onRemove} danger />
          <SheetItem icon={<Icon.back />} label="Back" onClick={() => setRemoving(false)} />
        </>
      ) : (
        <>
          <SheetItem icon={<Icon.pen />} label="Edit" onClick={onEdit} />
          <SheetItem icon={<Icon.chevronUp />} label="Move up" onClick={onUp} disabled={atTop} />
          <SheetItem icon={<Icon.chevronDown />} label="Move down" onClick={onDown} disabled={atBottom} />
          <SheetItem icon={<Icon.close />} label="Take out of the read" onClick={onMakeLoose ? () => setRemoving(true) : onRemove} />
          {onDelete && <SheetItem icon={<Icon.trash />} label="Delete" hint="Moves to #deleted: search #deleted to find it again" onClick={onDelete} danger />}
        </>
      )}
    </Sheet>
  )
}
