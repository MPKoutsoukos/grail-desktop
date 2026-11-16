import { useState } from 'react'
import type { ScreenshotRef } from '../native/pick'
import { Sheet } from '../ui/primitives'
import { Icon } from '../ui/icons'

// Review a batch of images, deselect any, and import the rest as image notes.
export function ImportSheet({ candidates, onImport, onDismiss }: {
  candidates: ScreenshotRef[]
  onImport: (selected: ScreenshotRef[]) => void
  onDismiss: () => void
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const toggle = (k: string) => setExcluded((prev) => {
    const next = new Set(prev)
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })
  const selected = candidates.filter((c) => !excluded.has(c.key))

  return (
    <Sheet open onClose={onDismiss} label="Import images">
      <p className="px-2 pb-3 text-sm text-paper">
        {candidates.length} {candidates.length === 1 ? 'image' : 'images'} · tap to leave one out
      </p>
      <div className="mb-4 grid max-h-[45vh] grid-cols-3 gap-2 overflow-y-auto px-1 sm:grid-cols-4">
        {candidates.map((c) => {
          const off = excluded.has(c.key)
          return (
            <button key={c.key} onClick={() => toggle(c.key)}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${off ? 'border-transparent opacity-30' : 'border-accent-light'}`}>
              <img src={c.src} alt={c.name} className="h-full w-full object-cover" />
              {!off && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[#fffaf2]"><Icon.check size={13} /></span>}
            </button>
          )
        })}
      </div>
      <div className="flex justify-end gap-2 px-1">
        <button onClick={onDismiss} className="btn-quiet">Not now</button>
        <button onClick={() => onImport(selected)} disabled={!selected.length} className="btn-primary">
          Import {selected.length || ''}
        </button>
      </div>
    </Sheet>
  )
}
