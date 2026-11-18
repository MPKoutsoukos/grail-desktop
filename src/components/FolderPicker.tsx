import { useEffect, useState } from 'react'
import { defaultFolder, folderPath, type HomeFolder } from '../home/folder'
import { Icon, Wordmark } from '../ui/icons'

// First run: a short tour (Tour), then where the notes live (FolderPicker), then, after the window
// reloads into that folder, a confirmation of which folder is in use (FolderChosen).
// Settings opens the tour again and the folder choice on its own.

// ---- the tour: each step shows a small moving picture of the real screen, and one line -----------

const SAMPLE = 'The bus idea: a map of every stop, drawn from memory. #book'
const stamp = () => {
  const d = new Date(), p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Counts up 0..n, one every `ms` (looping back to 0 if `loop`): the pictures play out step by step. */
function useReveal(n: number, ms: number, startAfter = 250, loop = false) {
  const [k, setK] = useState(0)
  useEffect(() => {
    let i = 0
    let t: ReturnType<typeof setInterval> | undefined
    const s0 = setTimeout(() => {
      t = setInterval(() => {
        i = loop && i >= n ? 0 : i + 1
        setK(i)
        if (!loop && i >= n && t) clearInterval(t)
      }, ms)
    }, startAfter)
    return () => { clearTimeout(s0); if (t) clearInterval(t) }
  }, [n, ms, startAfter, loop])
  return k
}

const Mock = ({ children }: { children: React.ReactNode }) => (
  <div className="card relative flex min-h-[250px] flex-col justify-center gap-2.5 overflow-hidden p-5">{children}</div>
)
const appear = (on: boolean) => `transition-all duration-500 ${on ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`

function WriteArt() {
  const n = useReveal(SAMPLE.length, 45, 400)
  const typed = SAMPLE.slice(0, n)
  const tag = typed.indexOf('#book')
  return (
    <Mock>
      <div className="flex items-center justify-between">
        <span className="font-serif text-xl text-paper">{stamp()}</span>
        <span className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-[#fffaf2]"><Icon.check size={13} /> Done</span>
      </div>
      <span className="flex w-fit items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5 text-[11px] text-paper-dimmer"><Icon.read size={11} className="text-accent-light" /> Gathered into Read</span>
      <p className="min-h-[84px] font-serif text-lg leading-relaxed text-paper">
        {tag >= 0 ? <>{typed.slice(0, tag)}<span className="text-accent-light">{typed.slice(tag)}</span></> : typed}
        <span className="animate-pulse text-accent-light">▍</span>
      </p>
    </Mock>
  )
}

const FRAGMENTS = [
  { day: '3 Nov', text: 'Saw a fox on the platform at six, unhurried, like it had a ticket.' },
  { day: '', text: 'The bus idea: a map of every stop, drawn from memory.' },
  { day: '12 Nov', text: 'Maybe the map is the book. Each stop, one chapter.' },
]
function ReadArt() {
  const k = useReveal(FRAGMENTS.length, 650)
  return (
    <Mock>
      <span className="eyebrow">Read</span>
      {FRAGMENTS.map((f, i) => (
        <div key={i} className={`flex gap-3 ${appear(i < k)}`}>
          <span className="w-12 shrink-0 pt-1 text-[11px] text-accent-light">{f.day}</span>
          <p className="font-serif text-[16px] leading-relaxed text-paper">{f.text}</p>
        </div>
      ))}
    </Mock>
  )
}

const SHAPE = ['Saw a fox on the platform at six.', 'A map of every stop.', 'Each stop, one chapter.']
function ShapeArt() {
  // 0: rest · 1: right-click the middle fragment, its menu opens · 2: Move up · 3: moved
  const k = useReveal(3, 1300, 500, true)
  const order = k >= 3 ? [1, 0, 2] : [0, 1, 2]
  return (
    <Mock>
      {order.map((i) => (
        <div key={i} className={`rounded-2xl px-3 py-2.5 font-serif text-[15px] text-paper transition-colors duration-300 ${i === 1 && (k === 1 || k === 2) ? 'bg-accent/15' : 'bg-ink'}`}>{SHAPE[i]}</div>
      ))}
      <div className={`absolute right-5 top-16 w-52 rounded-xl border border-ink-surface2 bg-ink-surface p-1.5 text-[13px] shadow-lift transition-all duration-300 ${k === 1 || k === 2 ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-paper-dim"><Icon.pen size={14} /> Edit</div>
        <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${k === 2 ? 'bg-ink-surface2 text-paper' : 'text-paper-dim'}`}><Icon.chevronUp size={14} /> Move up</div>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-paper-dim"><Icon.chevronDown size={14} /> Move down</div>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-paper-dim"><Icon.close size={14} /> Take out of the read</div>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-red-400"><Icon.trash size={14} /> Delete</div>
      </div>
    </Mock>
  )
}

const TAGGED = [
  { text: 'A map of every stop', book: true },
  { text: 'Call the bike shop', book: false },
  { text: 'Each stop, one chapter', book: true },
  { text: 'Tulips before the frost', book: false },
]
function TagArt() {
  const k = useReveal(2, 900, 600)
  return (
    <Mock>
      {TAGGED.map((n) => (
        <div key={n.text} className={`flex items-center justify-between rounded-xl border-[1.5px] bg-ink px-3 py-2 text-sm text-paper transition-all duration-500
          ${k >= 1 && n.book ? 'border-accent-light' : 'border-transparent'} ${k >= 1 && !n.book ? 'opacity-40' : ''}`}>
          {n.text}{n.book && <span className="text-xs text-accent-light">#book</span>}
        </div>
      ))}
      <span className={`mx-auto mt-1 flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-[13px] font-medium text-accent-light ${appear(k >= 2)}`}>
        <Icon.hash size={14} /> book · 2 notes · its own read
      </span>
    </Mock>
  )
}

const FILES = [
  { name: '1763460120000.md', icon: Icon.read },
  { name: '1763461980000.md', icon: Icon.read },
  { name: '1763461980000-mf2k.png', icon: Icon.image },
  { name: 'grail-settings.json', icon: Icon.settings },
]
function FilesArt() {
  const k = useReveal(FILES.length, 420)
  return (
    <Mock>
      <span className="mb-1 flex items-center gap-2.5 text-[15px] font-medium text-paper"><Icon.folder size={20} className="text-accent-light" /> Documents\grail</span>
      {FILES.map((f, i) => (
        <span key={f.name} className={`flex items-center gap-2.5 pl-3 font-mono text-[12.5px] text-paper-dim ${appear(i < k)}`}>
          <f.icon size={15} className="text-paper-dimmer" /> {f.name}
        </span>
      ))}
    </Mock>
  )
}

const TOUR = [
  { title: 'Write it down', line: 'Press + (or Ctrl+N) and write. Every note is dated, so it needs no title and no place. It saves as you type; Done closes it.', Art: WriteArt },
  { title: 'Read it back', line: 'Read stitches your dated notes into one text, oldest first.', Art: ReadArt },
  { title: 'Shape the read', line: 'Right-click a fragment (or press and hold) to edit it, move it, take it out of the read or delete it. Deleted notes wait in #deleted: search it to find them.', Art: ShapeArt },
  { title: 'Tag to gather', line: 'Write #book in any note. Each tag becomes its own notebook with its own read.', Art: TagArt },
  { title: 'Plain files, yours', line: 'Every note is a markdown file in a folder you choose. Next: which one.', Art: FilesArt },
]

/** The very first screen: what grail is, then the tour or straight on to the folder. */
function WelcomePanel({ onTour, onSkip }: { onTour: () => void; onSkip: () => void }) {
  const ideas = ['One place for every idea', 'Catch it the moment it arrives', 'Read it back as one story']
  const k = useReveal(ideas.length + 2, 220, 150)
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 py-8 text-paper">
      <div className="w-full max-w-md">
        <div className={appear(k >= 1)}><Wordmark size={64} className="text-accent-light" /></div>
        <h1 className={`mt-5 font-serif text-5xl leading-tight ${appear(k >= 1)}`}>Welcome to your grail diary.</h1>
        <p className={`mt-3 text-[16px] leading-relaxed text-paper-dim ${appear(k >= 2)}`}>
          A notebook for catching every idea, and reading them back until the good ones add up.
        </p>
        <div className="mt-8 space-y-3">
          {ideas.map((t, i) => (
            <div key={t} className={`flex items-center gap-3 ${appear(k >= i + 3)}`}>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/20 font-mono text-xs text-accent-light">{i + 1}</span>
              <span className="text-[15px] font-medium text-paper">{t}</span>
            </div>
          ))}
        </div>
        <div className={`mt-10 space-y-2 ${appear(k >= ideas.length + 2)}`}>
          <button onClick={onTour} className="btn-primary w-full" autoFocus>Show me around</button>
          <button onClick={onSkip} className="btn-quiet w-full">Skip the tour</button>
          <p className="pt-2 text-center text-xs text-paper-dimmer">Free and open source. No account, no ads, no tracking.</p>
        </div>
      </div>
    </div>
  )
}

/** welcome: start on the welcome panel (first start); otherwise straight into the tour (Settings). */
export function Tour({ onDone, welcome, closeLabel = 'Skip', doneLabel = 'Choose a folder' }: { onDone: () => void; welcome?: boolean; closeLabel?: string; doneLabel?: string }) {
  const [step, setStep] = useState(welcome ? -1 : 0)
  const last = TOUR.length - 1
  const first = welcome ? -1 : 0
  const t = TOUR[Math.max(step, 0)]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step < 0) return // the welcome panel has its own buttons (Enter presses the focused one)
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); if (step === last) onDone(); else setStep(step + 1) }
      if (e.key === 'ArrowLeft' && step > first) setStep(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, last, first, onDone])
  if (step < 0) return <WelcomePanel onTour={() => setStep(0)} onSkip={onDone} />
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 py-8 text-paper">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-8 flex items-center justify-between">
          <Wordmark size={30} className="text-accent-light" />
          <button onClick={onDone} className="tap text-sm text-paper-dimmer hover:text-paper">{closeLabel}</button>
        </div>
        <div key={step} className="view-enter">
          <t.Art />
          <h1 className="mb-2 mt-7 font-serif text-4xl">{t.title}</h1>
          <p className="min-h-[78px] text-[16px] leading-relaxed text-paper-dim">{t.line}</p>
        </div>
        <div className="mt-6 flex justify-center gap-1.5">
          {TOUR.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-accent-light' : 'w-1.5 bg-ink-surface2'}`} />)}
        </div>
        <div className="mt-6 flex gap-2">
          {step > first && <button onClick={() => setStep(step - 1)} className="btn-quiet flex-1">Back</button>}
          <button onClick={() => (step === last ? onDone() : setStep(step + 1))} className="btn-primary flex-[2]">
            {step === last ? doneLabel : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function FolderPicker({ initial = true, current, noteCount = 0, onChosen, onCancel }: {
  initial?: boolean
  current?: HomeFolder
  noteCount?: number
  onChosen: (c: HomeFolder, opts: { bringNotes?: boolean; first?: boolean }) => void
  onCancel?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [def, setDef] = useState<HomeFolder | null>(null)
  const [now, setNow] = useState<string>('')
  const [pending, setPending] = useState<HomeFolder | null>(null) // asking whether to bring the notes along

  useEffect(() => { defaultFolder().then(setDef).catch(() => setDef(null)) }, [])
  useEffect(() => { if (current) folderPath(current).then(setNow).catch(() => setNow('')) }, [current])

  const choose = (c: HomeFolder) => {
    if (!initial && current && c.kind === current.kind && c.value === current.value) { onCancel?.(); return }
    if (!initial && noteCount > 0) { setPending(c); return }
    onChosen(c, { first: initial })
  }
  const pick = async () => {
    setBusy(true); setError(null)
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const path = await open({ directory: true, multiple: false, title: 'Choose your grail home folder' })
      if (typeof path === 'string') choose({ kind: 'tauri', value: path })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg !== 'cancelled') setError(msg || 'Could not open the folder picker')
    } finally { setBusy(false) }
  }

  if (pending) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-paper view-enter">
        <div className="w-full max-w-md">
          <h1 className="mb-3 font-serif text-3xl">Bring your notes along?</h1>
          <p className="mb-2 text-sm leading-relaxed text-paper-dim">
            Copy your {noteCount} {noteCount === 1 ? 'note' : 'notes'} into <span className="break-all font-mono text-paper">{pending.value}</span>, or start there with what it already has?
          </p>
          <p className="mb-7 text-xs leading-relaxed text-paper-dimmer">The old folder stays as it is either way. Notes, tags, Read’s order and settings belong to a folder.</p>
          <div className="space-y-2">
            <button onClick={() => onChosen(pending, { bringNotes: true })} className="btn-primary w-full">Copy them</button>
            <button onClick={() => onChosen(pending, {})} className="btn-quiet w-full">Don’t copy</button>
            <button onClick={() => setPending(null)} className="tap w-full text-sm text-paper-dimmer hover:text-paper">Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  const option = (icon: React.ReactNode, title: string, hint: React.ReactNode, onClick: () => void, primary?: boolean) => (
    <button onClick={onClick} disabled={busy}
      className={`w-full rounded-2xl border-2 bg-ink-surface p-4 text-left transition-colors hover:bg-ink-surface2/70 ${primary ? 'border-accent-light/50' : 'border-transparent'}`}>
      <span className="flex items-center gap-2.5 text-[15px] font-medium text-paper">{icon}{title}</span>
      <span className="mt-1.5 block text-[13px] leading-relaxed text-paper-dim">{hint}</span>
    </button>
  )

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-paper view-enter">
      <div className="w-full max-w-md">
        <h1 className="mb-2 font-serif text-4xl">{initial ? 'Where should your notes live?' : 'Home folder'}</h1>
        <p className="mb-7 text-sm leading-relaxed text-paper-dim">
          {initial
            ? 'grail keeps every note as a markdown file in one folder, its home. You can change it later in Settings.'
            : <>Now: <span className="break-all font-mono text-paper">{now}</span></>}
        </p>
        <div className="space-y-2.5">
          {def && option(<Icon.check size={18} className="text-accent-light" />, initial ? 'Use the default folder' : 'The default folder',
            <><span className="break-all font-mono text-paper">{def.value}</span><br />A “grail” folder in your Documents, created if it isn’t there yet.</>,
            () => choose(def), initial)}
          {option(<Icon.folder size={18} className="text-paper-dim" />, 'Choose a folder',
            'A new folder, or one that already has your notes: grail’s from another computer or the phone, or markdown from another app. A folder inside OneDrive, Dropbox or Google Drive for desktop is kept in sync by that app.',
            () => void pick())}
          {!initial && onCancel && <button onClick={onCancel} className="tap w-full pt-2 text-sm text-paper-dimmer hover:text-paper">Cancel</button>}
        </div>
        {busy && <Icon.spinner className="mx-auto mt-5 animate-spin text-accent-light" />}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}

export function FolderChosen({ folder, first, notes, plain, onDone, onAgain }: {
  folder: HomeFolder
  first: boolean
  notes: number
  plain: number
  onDone: () => void
  onAgain: () => void
}) {
  const [path, setPath] = useState('')
  useEffect(() => { folderPath(folder).then(setPath).catch(() => setPath(folder.value ?? '')) }, [folder])
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-paper view-enter">
      <div className="w-full max-w-md">
        <h1 className="mb-6 font-serif text-4xl">Your notes are here</h1>
        <div className="card mb-4 divide-y divide-ink-surface2/70 overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-3.5">
            <Icon.folder size={20} className="mt-0.5 shrink-0 text-accent-light" />
            <span className="break-all font-mono text-[13px] leading-relaxed text-paper">{path}</span>
          </div>
          <div className="flex items-start gap-3 px-4 py-3.5">
            <Icon.read size={20} className="mt-0.5 shrink-0 text-paper-dim" />
            <span className="text-sm leading-relaxed text-paper-dim">
              {notes === 0 ? 'Empty so far: your new notes go here.' : `Found ${notes} ${notes === 1 ? 'note' : 'notes'}.`}
              {plain > 0 && <span className="mt-1 block text-xs text-paper-dimmer">{plain === 1 ? "One of them is" : `${plain} of them are`} plain markdown from elsewhere, titled by file name. They show in Browse and under their #tags; Read gathers grail’s dated notes.</span>}
            </span>
          </div>
        </div>
        <p className="mb-7 text-xs leading-relaxed text-paper-dimmer">Settings → Home folder always shows where your notes are, and lets you change it.</p>
        <div className="space-y-2">
          <button onClick={onDone} className="btn-primary w-full" autoFocus>{first ? 'Start writing' : 'Done'}</button>
          <button onClick={onAgain} className="btn-quiet w-full">Choose another folder</button>
        </div>
      </div>
    </div>
  )
}
