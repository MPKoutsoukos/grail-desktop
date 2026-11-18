import { useEffect, type ReactNode } from 'react'
import { Icon } from './icons'

// ------------------------------------------------------------------ header ---

export function TopBar({ title, onBack, children, sub }: {
  title?: ReactNode
  sub?: ReactNode
  onBack?: () => void
  children?: ReactNode
}) {
  return (
    <header
      className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-1 bg-ink/85 px-2 pb-2 backdrop-blur-md md:-mx-8 md:px-6"
      style={{ paddingTop: 'calc(var(--safe-top) + 0.5rem)' }}
    >
      {onBack && (
        <button onClick={onBack} aria-label="Back" className="icon-btn"><Icon.back /></button>
      )}
      <div className={`min-w-0 flex-1 ${onBack ? '' : 'pl-2'}`}>
        {typeof title === 'string'
          ? <h1 className="truncate font-serif text-[22px] leading-tight text-paper">{title}</h1>
          : title}
        {sub && <p className="truncate text-xs text-paper-dimmer">{sub}</p>}
      </div>
      <div className="flex items-center">{children}</div>
    </header>
  )
}

// ------------------------------------------------------------------- sheet ---

export function Sheet({ open, onClose, children, label }: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/55 animate-fade md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={label}
        className="w-full max-w-lg rounded-t-3xl bg-ink-surface p-3 shadow-lift animate-slide-up md:rounded-3xl md:animate-fade-in"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-surface2 md:hidden" />
        {children}
      </div>
    </div>
  )
}

export function SheetItem({ icon, label, hint, onClick, danger, disabled }: {
  icon?: ReactNode
  label: string
  hint?: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors disabled:opacity-35
        ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-paper hover:bg-ink-surface2'}`}
    >
      {icon && <span className={danger ? '' : 'text-accent-light'}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{label}</span>
        {hint && <span className="block text-xs text-paper-dimmer">{hint}</span>}
      </span>
    </button>
  )
}

// --------------------------------------------------------------- controls ---

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-ink-surface2'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export function Section({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="eyebrow mb-2 px-1">{title}</h2>
      <div className="card divide-y divide-ink-surface2/70 overflow-hidden">{children}</div>
      {footer && <p className="mt-2 px-1 text-xs leading-relaxed text-paper-dimmer">{footer}</p>}
    </section>
  )
}

export function Row({ icon, title, hint, children, onClick }: {
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  children?: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      {icon && <span className="text-paper-dim">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-paper">{title}</span>
        {hint && <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-paper-dimmer">{hint}</span>}
      </span>
      {children}
    </>
  )
  const cls = 'flex w-full items-center gap-4 px-4 py-3.5 text-left'
  return onClick
    ? <button onClick={onClick} className={`${cls} transition-colors hover:bg-ink-surface2/60`}>{inner}</button>
    : <div className={cls}>{inner}</div>
}

export function SearchField({ value, onChange, placeholder = 'Search notes', mono }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <label className="relative block">
      <Icon.search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dimmer" />
      <input
        type="search"
        data-search
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`tap w-full rounded-2xl border border-transparent bg-ink-surface py-3 pl-11 pr-10 text-[15px]
          text-paper outline-none placeholder:text-paper-dimmer transition-colors focus:border-accent-light/50
          [&::-webkit-search-cancel-button]:hidden ${mono ? 'font-mono text-sm' : ''}`}
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn h-9 min-h-0 w-9 min-w-0">
          <Icon.close size={16} />
        </button>
      )}
    </label>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center animate-fade-in">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-surface text-accent-light">{icon}</div>
      <p className="font-serif text-xl text-paper">{title}</p>
      {children && <div className="mt-2 max-w-xs text-sm leading-relaxed text-paper-dimmer">{children}</div>}
    </div>
  )
}

