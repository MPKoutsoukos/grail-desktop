import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Note } from '../types'
import { categoryName, isDeleted, noteKind } from '@grail/core'
import { useImage } from '../hooks/useImage'
import { pickImages } from '../native/pick'
import { useLatest } from '../hooks/useLatest'
import { Markdown } from './Markdown'
import { TopBar } from '../ui/primitives'
import { Icon } from '../ui/icons'

function KindBadge({ note }: { note: Note }) {
  const kind = noteKind(note)
  const [I, text] = kind === 'category'
    ? [Icon.hash, `Page for #${categoryName(note)}`]
    : kind === 'timeline' ? [Icon.read, 'Gathered into Read'] : [Icon.pen, 'Loose note · kept out of Read']
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-surface px-2.5 py-1 text-xs text-paper-dimmer">
      <I size={13} className="text-accent-light" />{text}
    </span>
  )
}

const TOOLS = [
  { I: Icon.bold, t: 'Bold' }, { I: Icon.italic, t: 'Italic' }, { I: Icon.heading, t: 'Heading' },
  { I: Icon.list, t: 'List' }, { I: Icon.quote, t: 'Quote' }, { I: Icon.code, t: 'Code' },
  { I: Icon.link, t: 'Link' }, { I: Icon.hash, t: 'Tag' },
]

type Text = { title: string; body: string }
const same = (a: Text, b: Text) => a.title === b.title && a.body === b.body

function Banner({ text, onMine, onTheirs }: { text: string; onMine: () => void; onTheirs: () => void }) {
  return (
    <div role="alert" className="card mb-5 flex flex-col gap-3 border border-amber-400/30 p-4 animate-fade-in sm:flex-row sm:items-center">
      <p className="flex min-w-0 flex-1 items-start gap-3 text-sm leading-relaxed text-paper">
        <Icon.alert className="mt-0.5 shrink-0 text-amber-400" size={18} />{text}
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onTheirs} className="btn-quiet h-9 min-h-0 px-3 text-sm">Take theirs</button>
        <button onClick={onMine} className="btn-primary h-9 min-h-0 px-3 text-sm">Keep mine</button>
      </div>
    </div>
  )
}

export function NoteEditor({ note, onSave, onDelete, onClose, onAttach, showBack = true }: {
  note: Note
  onSave: (note: Note) => void
  onDelete: (id: string) => void
  onClose: () => void
  onAttach: (note: Note, dataUrl: string) => Promise<void>
  /** false beside the notes list, where a back arrow has nowhere to go back to */
  showBack?: boolean
}) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [preview, setPreview] = useState(false)
  // What this editor last wrote (or loaded): anything else arriving in `note` came from sync.
  const [persisted, setPersisted] = useState<Text>({ title: note.title, body: note.body })
  const [seen, setSeen] = useState<Text>({ title: note.title, body: note.body })
  const [incoming, setIncoming] = useState<Text | null>(null)
  const [flash, setFlash] = useState(false)
  const image = useImage(note.mediaPath)

  // A new version of this note arrived (React's "adjust state on prop change" pattern).
  const arrived = { title: note.title, body: note.body }
  if (!same(arrived, seen)) {
    setSeen(arrived)
    if (!same(arrived, persisted)) {
      if (same({ title, body }, persisted)) {
        // Nothing unsaved here: just show the latest.
        setTitle(arrived.title); setBody(arrived.body); setPersisted(arrived); setFlash(true)
      } else {
        setIncoming(arrived) // you're mid-sentence: ask
      }
    }
  }
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 2500)
    return () => clearTimeout(t)
  }, [flash])

  const current = { title, body }
  const dirty = !same(current, persisted)
  const paused = !!incoming
  const saved = !dirty
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const pendingSel = useRef<[number, number] | null>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [body, preview])

  useLayoutEffect(() => {
    if (pendingSel.current && bodyRef.current) {
      const [s, e] = pendingSel.current
      bodyRef.current.focus()
      bodyRef.current.setSelectionRange(s, e)
      pendingSel.current = null
    }
  }, [body])

  // Autosave, debounced; paused while a decision is pending.
  useEffect(() => {
    if (!dirty || paused) return
    const t = setTimeout(() => { onSave({ ...note, title, body }); setPersisted({ title, body }) }, 600)
    return () => clearTimeout(t)
  }, [title, body, dirty, paused, note, onSave])

  // Leaving (button, Esc, back) never drops the last few keystrokes.
  const latest = useLatest({ note, title, body, dirty, onSave })
  useEffect(() => () => {
    const l = latest.current
    if (l.dirty) l.onSave({ ...l.note, title: l.title, body: l.body })
  }, [latest])

  const keepMine = () => {
    setIncoming(null)
    onSave({ ...note, title, body })
    setPersisted({ title, body })
  }
  const takeTheirs = () => {
    if (!incoming) return
    setTitle(incoming.title); setBody(incoming.body); setPersisted(incoming); setIncoming(null)
  }

  const close = () => onClose()
  // Ctrl+Enter or Ctrl+S: Save and close (it saves as you type; closing saves the last keystrokes).
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key.toLowerCase() === 's')) { e.preventDefault(); closeRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const remove = () => {
    const ask = isDeleted(note)
      ? 'This note is already in #deleted. Delete it for good? Its file and pictures go, and it can’t be brought back.'
      : 'Delete this note? It moves to #deleted: hidden everywhere, but search #deleted to find it again.'
    if (confirm(ask)) { onDelete(note.id); onClose() }
  }

  const edit = (fn: (s: number, e: number, sel: string) => { text: string; sel: [number, number] }) => {
    const el = bodyRef.current
    if (!el) return
    const s = el.selectionStart, e = el.selectionEnd
    const { text, sel } = fn(s, e, body.slice(s, e))
    setBody(body.slice(0, s) + text + body.slice(e))
    pendingSel.current = sel
  }
  const surround = (a: string, b = a) => edit((s, e, sel) => ({ text: a + sel + b, sel: [s + a.length, e + a.length] }))
  const prefix = (p: string) => {
    const el = bodyRef.current
    if (!el) return
    const s = el.selectionStart
    const ls = body.lastIndexOf('\n', s - 1) + 1
    setBody(body.slice(0, ls) + p + body.slice(ls))
    pendingSel.current = [s + p.length, s + p.length]
  }
  const link = () => edit((s, _e, sel) => {
    const t = sel || 'text'
    return { text: `[${t}](url)`, sel: [s + t.length + 3, s + t.length + 6] }
  })

  const attach = async () => {
    const [img] = await pickImages(false)
    if (img) await onAttach({ ...note, title, body }, img.src)
  }

  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const apply = (t: string) => {
    switch (t) {
      case 'Bold': return surround('**')
      case 'Italic': return surround('*')
      case 'Heading': return prefix('## ')
      case 'List': return prefix('- ')
      case 'Quote': return prefix('> ')
      case 'Code': return surround('`')
      case 'Link': return link()
      case 'Tag': return surround('#', '')
    }
  }

  return (
    <div className="page pb-32 view-enter">
      <TopBar onBack={showBack ? close : undefined} title={
        <span className={`text-xs transition-colors ${flash ? 'text-accent-light' : 'text-paper-dimmer'}`}>
          {flash ? 'Updated from another device' : paused ? 'Waiting for you' : saved ? 'Saved' : 'Saving…'} · {words} {words === 1 ? 'word' : 'words'}
        </span>
      }>
        <button onClick={() => setPreview((p) => !p)} aria-label={preview ? 'Edit' : 'Preview'} className={`icon-btn ${preview ? 'text-accent-light' : ''}`}>
          {preview ? <Icon.pen /> : <Icon.eye />}
        </button>
        <button onClick={remove} aria-label="Delete" className="icon-btn hover:text-red-400"><Icon.trash /></button>
        {/* It saves as you type; Save says so out loud and closes (leaving saves the last keystrokes). */}
        <button onClick={close} title="Save and close (Ctrl+Enter)" className="btn-primary ml-1 h-9 gap-1.5 px-4 text-sm"><Icon.check size={16} /> Save</button>
      </TopBar>

      {incoming && (
        <Banner text="This note changed on another device while you were writing." onMine={keepMine} onTheirs={takeTheirs} />
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="w-full bg-transparent font-serif text-[28px] leading-tight text-paper outline-none placeholder:text-paper-dimmer"
      />
      <div className="mb-5 mt-2"><KindBadge note={{ ...note, title, body }} /></div>

      {note.type === 'media' && (
        image ? (
          <button onClick={attach} className="mb-5 block w-full" aria-label="Replace image">
            <img src={image} alt="" className="max-h-[60vh] w-full rounded-2xl border border-ink-surface2 object-contain" />
          </button>
        ) : (
          <button onClick={attach} className="mb-5 flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-surface2 text-paper-dimmer hover:border-accent-light/60 hover:text-paper">
            <Icon.imagePlus size={28} /> <span className="text-sm">{note.mediaPath ? 'Loading…' : 'Choose an image'}</span>
          </button>
        )
      )}

      {preview ? (
        <div className="reading min-h-[50vh] text-[19px]">
          {body ? <Markdown>{body}</Markdown> : <p className="italic text-paper-dimmer">Nothing written yet.</p>}
        </div>
      ) : (
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return
            const k = e.key.toLowerCase()
            const tool = k === 'b' ? 'Bold' : k === 'i' ? 'Italic' : k === 'k' ? 'Link' : null
            if (tool) { e.preventDefault(); apply(tool) }
          }}
          placeholder="Begin anywhere…"
          autoFocus={!note.body && note.type === 'text'}
          className="reading min-h-[50vh] w-full resize-none bg-transparent text-[19px] leading-[1.7] text-paper outline-none placeholder:italic placeholder:text-paper-dimmer"
        />
      )}

      {!preview && (
        <div className="fixed bottom-0 right-0 z-20 border-t border-ink-surface2/70 bg-ink/90 backdrop-blur-md"
          style={{ left: 'var(--content-left, 0px)', paddingBottom: 'var(--safe-bottom)' }}>
          <div className="page flex items-center gap-0.5 overflow-x-auto py-1.5">
            {TOOLS.map(({ I, t }) => (
              <button key={t} type="button" title={t} aria-label={t}
                onMouseDown={(e) => e.preventDefault()} onClick={() => apply(t)}
                className="icon-btn h-10 min-h-0 w-10 min-w-0 shrink-0 rounded-xl">
                <I size={19} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
