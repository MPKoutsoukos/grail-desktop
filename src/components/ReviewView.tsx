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

  const press = (id: string) => { timer.current = setTimeout(() => setActive(id), 450) }
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  const jump = (id: string) => {
    setDrawer(false)
    requestAnimationFrame(() => document.getElementById(`ch-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const Block = ({ note, card }: { note: Note; card?: boolean }) => (
    <section
      id={`ch-${note.id}`}
      onPointerDown={() => press(note.id)}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerMove={cancel}
      onContextMenu={(e) => { e.preventDefault(); setActive(note.id) }}
      className={`scroll-mt-24 rounded-2xl transition-colors ${active === note.id ? 'bg-accent/10' : ''}
        ${card ? 'card p-5' : '-mx-3 px-3'}`}
    >
      <NoteBody note={note} />
    </section>
  )

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
    // Manuscript: one continuous read with a quiet ornament between fragments.
    return (
      <div>
        {compiled.map((n, i) => (
          <Fragment key={n.id}>
            {i > 0 && <p aria-hidden className="my-6 select-none text-center text-paper-dimmer/50">⁂</p>}
            <Block note={n} />
          </Fragment>
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
        onDelete={props.onDelete ? () => { props.onDelete!(active!); setActive(null) } : undefined}
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
