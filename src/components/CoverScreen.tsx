import type { Cover } from '../types'

// The title page: tap anywhere to enter. Doubles as the splash while the vault opens.
export function CoverScreen({ cover, ready, onEnter }: { cover: Cover; ready: boolean; onEnter: () => void }) {
  return (
    <button
      onClick={() => ready && onEnter()}
      aria-label={ready ? 'Open grail' : 'Opening grail'}
      className="relative min-h-[100dvh] w-full overflow-hidden bg-ink text-paper animate-fade"
    >
      {cover.image ? (
        <>
          <img src={cover.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/60 to-ink" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgb(var(--accent)/0.22),transparent_60%)]" />
      )}

      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-8 text-center">
        <h1 className="font-serif text-6xl font-light tracking-tight text-paper">{cover.title || 'grail'}</h1>
        {cover.subtitle && <p className="reading max-w-sm text-lg italic leading-relaxed text-paper-dim">{cover.subtitle}</p>}
        <p className="eyebrow absolute" style={{ bottom: 'calc(3rem + var(--safe-bottom))' }}>
          <span className={ready ? '' : 'breathe'}>{ready ? 'Tap to open' : 'Opening…'}</span>
        </p>
      </div>
    </button>
  )
}
