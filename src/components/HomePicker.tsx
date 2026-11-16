import { useState } from 'react'
import type { HomeConfig } from '../vault/home'
import { Icon, Wordmark } from '../ui/icons'

// First run (and Settings → Home folder): choose where the vault lives.
export function HomePicker({ initial = true, onChosen, onCancel }: {
  initial?: boolean
  onChosen: (c: HomeConfig) => void
  onCancel?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async () => {
    setBusy(true); setError(null)
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const path = await open({ directory: true, multiple: false, title: 'Choose your grail home' })
      if (typeof path === 'string') onChosen({ kind: 'tauri', value: path })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg !== 'cancelled') setError(msg || 'Could not open the folder picker')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-paper view-enter">
      <div className="w-full max-w-sm text-center">
        <div className="mb-5"><Wordmark size={48} className="text-accent-light" /></div>
        <h1 className="mb-2 font-serif text-4xl">{initial ? 'Welcome to grail' : 'Change home'}</h1>
        <p className="mb-8 text-sm leading-relaxed text-paper-dim">
          {initial
            ? 'Pick a folder for your notes. They’re plain markdown files — readable by any app, yours to back up or move.'
            : 'Open a different folder as your grail home. Mirrors are remembered per folder.'}
        </p>
        <div className="space-y-2">
          <button onClick={pick} disabled={busy} className="btn-primary w-full">
            {busy ? <Icon.spinner className="animate-spin" /> : <Icon.folder />} Choose a folder
          </button>
          <button onClick={() => onChosen({ kind: 'tauri-default' })} disabled={busy} className="btn-quiet w-full">Use the app data folder</button>
          {!initial && onCancel && <button onClick={onCancel} className="tap w-full text-sm text-paper-dimmer hover:text-paper">Cancel</button>}
        </div>
        {initial && (
          <p className="mt-6 text-xs leading-relaxed text-paper-dimmer">
            Tip: a folder inside Proton Drive, OneDrive or Dropbox is mirrored by that app automatically.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
