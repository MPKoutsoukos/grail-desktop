import { useEffect } from 'react'
import type { Cover } from '../types'

// The optional title page (Settings → Show a cover on launch): click, or press any key, to enter.
// Doubles as the splash while the home opens.
export function CoverScreen({ cover, ready, onEnter }: { cover: Cover; ready: boolean; onEnter: () => void }) {
  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => { if (!e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); onEnter() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, onEnter])
  return (
    <button
      onClick={() => ready && onEnter()}
      aria-label={ready ? 'Open grail' : 'Opening grail'}
      className="relative min-h-[100dvh] w-full cursor-default overflow-hidden bg-ink text-paper animate-fade"
    >
      {cover.image ? (
        <>
          <img src={cover.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/60 to-ink" />
        </>
      ) : null}

      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-8 text-center">
        <h1 className="font-serif text-6xl font-light tracking-tight text-paper">{cover.title || 'grail'}</h1>
        {cover.subtitle && <p className="reading max-w-sm text-lg italic leading-relaxed text-paper-dim">{cover.subtitle}</p>}
        <p className="absolute text-xs text-paper-dimmer" style={{ bottom: 'calc(3rem + var(--safe-bottom))' }}>
          <span className={ready ? '' : 'breathe'}>{ready ? 'Click or press any key' : 'Opening…'}</span>
        </p>
      </div>
    </button>
  )
}
