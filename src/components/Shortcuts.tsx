import { Icon } from '../ui/icons'

// Every keyboard shortcut, in one place: "?" anywhere (outside a text field) or Settings → Keyboard shortcuts.
const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'Anywhere',
    keys: [
      ['Ctrl+N', 'New note'],
      ['Ctrl+F  or  /', 'Search notes'],
      ['Ctrl+1 · 2 · 3', 'Browse · Read · Tags'],
      ['Ctrl+,', 'Settings'],
      ['Esc', 'Back, or close'],
      ['?', 'These shortcuts'],
    ],
  },
  {
    title: 'Writing',
    keys: [
      ['Ctrl+Enter  or  Ctrl+S', 'Save and close'],
      ['Ctrl+B · Ctrl+I', 'Bold · italic'],
      ['Ctrl+K', 'Link'],
      ['Esc', 'Close (it saves as you type)'],
    ],
  },
  {
    title: 'Read',
    keys: [
      ['J · K', 'Next · previous fragment (then ↓ · ↑ too)'],
      ['Enter  or  E', 'Edit it (or double-click)'],
      ['Alt+↑ · Alt+↓', 'Move it up · down'],
      ['X', 'Take it out of the read'],
      ['Delete', 'Delete it (to #deleted)'],
      ['C', 'Contents'],
      ['Right-click', 'All of a fragment’s actions'],
    ],
  },
]

const Kbd = ({ k }: { k: string }) => (
  <span className="flex flex-wrap justify-end gap-1">
    {k.split(/\s{2}or\s{2}| · /).map((part, i, all) => (
      <span key={i} className="flex items-center gap-1">
        <kbd className="rounded-md border border-ink-surface2 bg-ink px-1.5 py-0.5 font-mono text-[11.5px] text-paper">{part}</kbd>
        {i < all.length - 1 && <span className="text-[11px] text-paper-dimmer">{k.includes('  or  ') ? 'or' : '·'}</span>}
      </span>
    ))}
  </span>
)

export function Shortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4 animate-fade" onClick={onClose}>
      <div role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-ink-surface p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-paper">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="icon-btn"><Icon.close /></button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title} className={g.title === 'Read' ? 'md:col-span-2' : ''}>
              <h3 className="eyebrow mb-2">{g.title}</h3>
              <ul className="divide-y divide-ink-surface2/70">
                {g.keys.map(([k, what]) => (
                  <li key={what} className="flex items-center justify-between gap-4 py-2 text-sm text-paper-dim">
                    <span>{what}</span><Kbd k={k} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
