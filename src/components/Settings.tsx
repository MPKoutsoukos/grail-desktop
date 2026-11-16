import type { Cover, ReadingFont, Settings as S, Theme } from '../types'
import { PRESETS, exportTheme, importThemeFile } from '../theme/themes'
import { REVIEW_TEMPLATES, type ReviewTemplate } from '../review/templates'
import { pickImages } from '../native/pick'
import { IS_TAURI, effectiveHome, homeLabel } from '../vault/home'
import { Row, Section, Toggle, TopBar } from '../ui/primitives'
import { Icon } from '../ui/icons'

const TEMPLATE_ICON: Record<ReviewTemplate, React.ReactNode> = {
  manuscript: <Icon.tplManuscript />, timeline: <Icon.tplTimeline />, codex: <Icon.tplCodex />, cards: <Icon.tplCards />,
}

function Swatch({ theme, active, onClick }: { theme: Theme; active: boolean; onClick: () => void }) {
  const c = theme.colors
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`overflow-hidden rounded-2xl border-2 text-left transition ${active ? 'border-accent-light' : 'border-transparent hover:border-ink-surface2'}`}>
      <div className="p-3" style={{ background: c.ink }}>
        <div className="mb-2 h-2 w-10 rounded-full" style={{ background: c.paper }} />
        <div className="mb-3 h-2 w-16 rounded-full" style={{ background: c.paperDimmer }} />
        <div className="flex gap-1.5">
          <span className="h-4 w-4 rounded-full" style={{ background: c.accent }} />
          <span className="h-4 w-4 rounded-full" style={{ background: c.accentLight }} />
          <span className="h-4 w-4 rounded-full" style={{ background: c.inkSurface2 }} />
        </div>
      </div>
      <p className="bg-ink-surface px-3 py-1.5 text-xs text-paper">{theme.name}</p>
    </button>
  )
}

export function Settings({ settings, onUpdate, onClose, onImportNow, onChangeHome, onOpenAbout }: {
  settings: S
  onUpdate: <K extends keyof S>(key: K, value: S[K]) => void
  onClose: () => void
  onImportNow: () => void
  onChangeHome: () => void
  onOpenAbout: () => void
}) {
  const setCover = (p: Partial<Cover>) => onUpdate('cover', { ...settings.cover, ...p })
  const presets = PRESETS.some((p) => p.id === settings.theme.id) ? PRESETS : [...PRESETS, settings.theme]

  return (
    <div className="page pb-24 view-enter">
      <TopBar title="Settings" onBack={onClose} />

      <Section title="Vault">
        {IS_TAURI && (
          <Row icon={<Icon.folder />} title="Home folder" hint={homeLabel(effectiveHome())} onClick={onChangeHome}>
            <Icon.chevronRight size={18} className="text-paper-dimmer" />
          </Row>
        )}
      </Section>

      <Section title="Theme">
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
          {presets.map((t) => <Swatch key={t.id} theme={t} active={settings.theme.id === t.id} onClick={() => onUpdate('theme', t)} />)}
        </div>
        <Row icon={<Icon.upload />} title="Import a theme" hint="From a .json file" onClick={async () => { const t = await importThemeFile(); if (t) onUpdate('theme', t) }} />
        <Row icon={<Icon.download />} title="Export this theme" hint={`Save “${settings.theme.name}” to share`} onClick={() => exportTheme(settings.theme)} />
      </Section>

      <Section title="Reading">
        <div className="p-3">
          <p className="mb-2 px-1 text-xs text-paper-dimmer">Typeface</p>
          <div className="grid grid-cols-3 gap-2">
            {([['serif', 'Serif', 'font-serif'], ['sans', 'Sans', 'font-sans'], ['mono', 'Mono', 'font-mono']] as [ReadingFont, string, string][]).map(([id, name, cls]) => (
              <button key={id} onClick={() => onUpdate('readingFont', id)}
                className={`rounded-xl border-2 px-3 py-3 text-center transition ${settings.readingFont === id ? 'border-accent-light bg-ink' : 'border-transparent bg-ink hover:border-ink-surface2'}`}>
                <span className={`block text-2xl text-paper ${cls}`}>Aa</span>
                <span className="text-xs text-paper-dimmer">{name}</span>
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 px-1 text-xs text-paper-dimmer">How Read lays out your fragments</p>
          <div className="grid grid-cols-2 gap-2">
            {REVIEW_TEMPLATES.map((t) => {
              const on = settings.reviewTemplate === t.id
              return (
                <button key={t.id} onClick={() => onUpdate('reviewTemplate', t.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 bg-ink px-3 py-2.5 text-left transition ${on ? 'border-accent-light' : 'border-transparent hover:border-ink-surface2'}`}>
                  <span className={on ? 'text-accent-light' : 'text-paper-dim'}>{TEMPLATE_ICON[t.id]}</span>
                  <span><span className="block text-sm text-paper">{t.name}</span><span className="text-xs text-paper-dimmer">{t.hint}</span></span>
                </button>
              )
            })}
          </div>
        </div>
        <Row icon={<Icon.sparkle />} title="Echoes" hint="Resurface an older fragment at the top of Browse">
          <Toggle on={settings.echoes} onChange={(v) => onUpdate('echoes', v)} label="Echoes" />
        </Row>
        <Row icon={<Icon.eye />} title="Link previews" hint={settings.linkPreviews ? 'Shown for every link: grail fetches the page by itself' : 'Off: click Preview under a link, and grail asks first'}>
          <Toggle on={settings.linkPreviews} onChange={(v) => onUpdate('linkPreviews', v)} label="Link previews" />
        </Row>
      </Section>

      <Section title="Cover">
        <Row icon={<Icon.image />} title="Show a cover on launch" hint="A title page you tap to enter">
          <Toggle on={settings.cover.enabled} onChange={(v) => setCover({ enabled: v })} label="Show cover" />
        </Row>
        {settings.cover.enabled && (
          <div className="space-y-3 px-4 py-4">
            <input className="field font-serif text-lg" value={settings.cover.title} placeholder="grail" onChange={(e) => setCover({ title: e.target.value })} />
            <input className="field" value={settings.cover.subtitle} placeholder="A subtitle — a line you like" onChange={(e) => setCover({ subtitle: e.target.value })} />
            <div className="flex items-center gap-3">
              {settings.cover.image && <img src={settings.cover.image} alt="" className="h-12 w-12 rounded-xl object-cover" />}
              <button className="btn-quiet h-10 min-h-0" onClick={async () => { const [f] = await pickImages(false); if (f) setCover({ image: f.src }) }}>
                <Icon.imagePlus size={18} />{settings.cover.image ? 'Change image' : 'Background image'}
              </button>
              {settings.cover.image && <button className="text-sm text-paper-dimmer hover:text-paper" onClick={() => setCover({ image: undefined })}>Remove</button>}
            </div>
          </div>
        )}
      </Section>

      <Section title="Images">
        <Row icon={<Icon.imagePlus />} title="Import images" hint="Pick images to add as notes" onClick={onImportNow} />
      </Section>

      <Section title="grail">
        <Row icon={<Icon.read />} title="About grail" hint="The story, your notes on Google Drive, privacy, contact and licences" onClick={onOpenAbout}>
          <Icon.chevronRight size={18} className="text-paper-dimmer" />
        </Row>
      </Section>

      <Section title="Keyboard">
        <Row icon={<Icon.plus />} title="New fragment" hint="Ctrl / ⌘ + N" />
        <Row icon={<Icon.back />} title="Back" hint="Esc" />
        <Row icon={<Icon.settings />} title="Settings" hint="Ctrl / ⌘ + ," />
      </Section>

      <p className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-paper-dimmer">
        Plain markdown, on your device.
      </p>
    </div>
  )
}
