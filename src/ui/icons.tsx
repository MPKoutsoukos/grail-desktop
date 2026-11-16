// Icon modules export components and a shared stroke constant together, by design.
/* eslint-disable react-refresh/only-export-components */
// One place for every icon in grail: Lucide line icons at a single stroke
// weight, plus grail's own marks. Swap the set here and the whole app follows.

import type { LucideProps } from 'lucide-react'
import {
  ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, ChevronUp, CloudOff, Cloud, CloudAlert,
  Eye, FolderOpen, Hash, ImagePlus, KeyRound, Library, ListOrdered, LoaderCircle, Lock, MoreHorizontal,
  PenLine, Plus, RefreshCw, Search, Server, Settings2, Sparkles, Trash2, Undo2, Upload, Download,
  X, Bold, Italic, Heading, List, Quote, Code, Link2, Palette, Smartphone, Vibrate, Image as ImageIcon,
  BookMarked, Rows3, CalendarDays, LayoutGrid, ScrollText, Shuffle, CornerUpLeft, CircleAlert, Type,
} from 'lucide-react'
import type { NoteType } from '../types'

export const STROKE = 1.75

const wrap = (I: React.ComponentType<LucideProps>) => (p: LucideProps) => <I strokeWidth={STROKE} size={20} {...p} />

export const Icon = {
  back: wrap(ArrowLeft), close: wrap(X), plus: wrap(Plus), search: wrap(Search), settings: wrap(Settings2),
  more: wrap(MoreHorizontal), check: wrap(Check), trash: wrap(Trash2), undo: wrap(Undo2), restore: wrap(CornerUpLeft),
  chevronDown: wrap(ChevronDown), chevronUp: wrap(ChevronUp), chevronRight: wrap(ChevronRight),
  eye: wrap(Eye), pen: wrap(PenLine), folder: wrap(FolderOpen), image: wrap(ImageIcon), imagePlus: wrap(ImagePlus),
  hash: wrap(Hash), library: wrap(Library), read: wrap(BookOpen), chapters: wrap(ListOrdered),
  sparkle: wrap(Sparkles), shuffle: wrap(Shuffle), alert: wrap(CircleAlert), type: wrap(Type),
  cloud: wrap(Cloud), cloudOff: wrap(CloudOff), cloudAlert: wrap(CloudAlert), sync: wrap(RefreshCw),
  spinner: wrap(LoaderCircle), server: wrap(Server), lock: wrap(Lock), key: wrap(KeyRound),
  upload: wrap(Upload), download: wrap(Download), palette: wrap(Palette), device: wrap(Smartphone),
  haptics: wrap(Vibrate), bold: wrap(Bold), italic: wrap(Italic), heading: wrap(Heading), list: wrap(List),
  quote: wrap(Quote), code: wrap(Code), link: wrap(Link2),
  tplManuscript: wrap(ScrollText), tplTimeline: wrap(CalendarDays), tplCodex: wrap(BookMarked), tplCards: wrap(LayoutGrid),
  rows: wrap(Rows3),
}

/** grail's mark: just the word, in Newsreader, as on the app icon (the chalice is gone). */
export function Wordmark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return <span className={`font-serif leading-none tracking-[-0.01em] ${className}`} style={{ fontSize: size }}>grail</span>
}

/** Drawing notes get a quill rather than a generic pencil. */
function Quill(p: LucideProps) {
  const { size = 20, className } = p
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M20 3C12 4 7 9 5.5 17.5L5 21" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M20 3c.5 6-3.5 11-10.5 12.2" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11.5 13.5 9" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

export function NoteTypeIcon({ type, ...p }: { type: NoteType } & LucideProps) {
  if (type === 'drawing') return <Quill {...p} />
  if (type === 'media') return <Icon.image {...p} />
  return <Icon.pen {...p} />
}
