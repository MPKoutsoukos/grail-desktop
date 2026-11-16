import type { NoteType } from '../types'
import { Icon, NoteTypeIcon } from '../ui/icons'
import { Sheet, SheetItem } from '../ui/primitives'

const OPTIONS: { type: NoteType; label: string; hint: string }[] = [
  { type: 'text', label: 'Fragment', hint: 'Write — titled with the date and time' },
  { type: 'drawing', label: 'Drawing', hint: 'Sketch a map, a diagram, a face' },
  { type: 'media', label: 'Image', hint: 'Keep a reference picture' },
]

export function CreateFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Create"
      className="fixed right-5 z-20 grid h-16 w-16 place-items-center rounded-[22px] bg-accent text-[#fffaf2] shadow-fab
                 transition hover:brightness-110 active:scale-95 md:right-10"
      style={{ bottom: 'calc(var(--safe-bottom) + 5.25rem)' }}
    >
      <Icon.plus size={28} strokeWidth={2} />
    </button>
  )
}

export function CreateChooser({ open, onChoose, onClose }: {
  open: boolean
  onChoose: (type: NoteType) => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Create">
      <p className="eyebrow px-4 pb-1">New</p>
      {OPTIONS.map((o) => (
        <SheetItem key={o.type} icon={<NoteTypeIcon type={o.type} size={22} />} label={o.label} hint={o.hint} onClick={() => onChoose(o.type)} />
      ))}
    </Sheet>
  )
}
