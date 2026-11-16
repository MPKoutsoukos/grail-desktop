import { Icon } from '../ui/icons'

export type Tab = 'browse' | 'review' | 'categories'

const TABS = [
  { key: 'browse' as const, icon: Icon.library, label: 'Browse' },
  { key: 'review' as const, icon: Icon.read, label: 'Read' },
  { key: 'categories' as const, icon: Icon.hash, label: 'Tags' },
]

// Bottom navigation on phones, a slim rail on wide screens.
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-surface2/70 bg-ink/90 backdrop-blur-md
                 md:inset-x-auto md:bottom-auto md:left-0 md:top-0 md:h-full md:w-20 md:border-r md:border-t-0"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg md:mt-[calc(var(--safe-top)+5rem)] md:flex-col md:gap-2">
        {TABS.map(({ key, icon: I, label }) => {
          const on = tab === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={on ? 'page' : undefined}
              className={`tap group flex flex-1 flex-col items-center justify-center gap-1 pb-1.5 pt-2 text-[11px] font-medium transition-colors
                ${on ? 'text-accent-light' : 'text-paper-dimmer hover:text-paper'}`}
            >
              <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${on ? 'bg-accent/15' : 'group-hover:bg-ink-surface'}`}>
                <I size={21} />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
