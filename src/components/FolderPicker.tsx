import { useEffect, useState } from 'react'
import { defaultFolder, folderPath, type HomeFolder } from '../home/folder'
import { Icon, Wordmark } from '../ui/icons'

// First run: a short tour (Tour), then where the notes live (FolderPicker), then, after the window
// reloads into that folder, a confirmation of which folder is in use (FolderChosen).
// Settings opens the tour again and the folder choice on its own.

const TOUR = [
  { icon: Icon.pen, title: 'Write it down', text: 'Press + (or Ctrl+N) for a new note: a thought, a drawing, a picture. Every note is dated, so it needs no title and no place. Keep it messy.' },
  { icon: Icon.read, title: 'Read it back', text: 'Read gathers your dated notes into one continuous text, oldest first, so a month of scraps reads like a draft. Each fragment can be edited, moved or taken out of the read.' },
  { icon: Icon.hash, title: 'Tag to gather', text: 'Write #ideas, #book or any #word in a note. Tags lists them, and each tag is its own notebook with its own read.' },
  { icon: Icon.folder, title: 'Plain files, yours', text: 'Every note is a plain markdown file in a folder. Any app can open it, and you can back it up, sync it or move it. Next: which folder.' },
]

export function Tour({ onDone, closeLabel = 'Skip', doneLabel = 'Choose a folder' }: { onDone: () => void; closeLabel?: string; doneLabel?: string }) {
  const [step, setStep] = useState(0)
  const last = TOUR.length - 1
  const t = TOUR[step]
  const Glyph = t.icon
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); if (step === last) onDone(); else setStep(step + 1) }
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, last, onDone])
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-paper">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-10 flex items-center justify-between">
          <Wordmark size={30} className="text-accent-light" />
          <button onClick={onDone} className="tap text-sm text-paper-dimmer hover:text-paper">{closeLabel}</button>
        </div>
        <div key={step} className="view-enter min-h-[260px]">
          <div className="mb-7 grid h-16 w-16 place-items-center rounded-3xl bg-accent/15"><Glyph size={30} className="text-accent-light" /></div>
          <h1 className="mb-3 font-serif text-4xl">{t.title}</h1>
          <p className="text-[16px] leading-relaxed text-paper-dim">{t.text}</p>
        </div>
        <div className="mt-8 flex justify-center gap-1.5">
          {TOUR.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-accent-light' : 'w-1.5 bg-ink-surface2'}`} />)}
        </div>
        <div className="mt-6 flex gap-2">
          {step > 0 && <button onClick={() => setStep(step - 1)} className="btn-quiet flex-1">Back</button>}
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
              {plain > 0 && <span className="mt-1 block text-xs text-paper-dimmer">{plain} of them are plain markdown from elsewhere. They show in Browse and under their #tags; Read gathers grail’s dated notes.</span>}
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
