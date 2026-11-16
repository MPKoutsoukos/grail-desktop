import { useState } from 'react'
import { Row, Section, TopBar } from '../ui/primitives'
import { Icon, Wordmark } from '../ui/icons'
import { BUILD, ENV, VERSION } from '../env'
import { LICENCE_TEXTS, NOTICES } from '../licences'

export const CONTACT = 'hello@grailnotebook.com'
export const PRIVACY_URL = 'https://grailnotebook.com/privacy/'
export const SOURCE_URL = 'https://github.com/MPKoutsoukos/grail-desktop'

// The same story as the Android app's About page.
const STORY = {
  title: 'Why grail',
  paragraphs: [
    'Ideas rarely arrive when there is time for them. They turn up on a bus, half asleep, in the middle of something else, and land wherever is nearest: a line in some app, the back of a receipt, a voice memo nobody plays back. There was never a shortage of sparks. What was missing was a place for them to land, and to add up.',
    'Creativity isn’t a gift, it’s a system. You don’t wait for the one big idea; you build a place where small ones are kept, found again and set next to each other, until they turn into something.',
    'grail is that place. Every thought is a fragment, dated and left as it is. Tags gather the ones that belong together, and Read stitches them into one continuous text, so a month of scraps reads like a draft. Echoes bring an old one back just when you’d forgotten it. Nothing asks you to be brilliant on the spot; only to keep showing up and writing it down.',
    'The name is a small joke about the old idea of inspiration as a holy grail, searched for and never found. Here it’s a cup you fill, a little at a time.',
  ],
  inspiredBy: '“Creativity isn’t a gift, it’s a system” by Perry Daniels',
  url: 'https://www.youtube.com/watch?v=_QVYfPnNOg4',
}

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3"><span className="w-4 shrink-0 font-mono text-accent-light">{n}</span><span>{children}</span></li>
)

export function About({ onClose, onOpenLicences }: { onClose: () => void; onOpenLicences: () => void }) {
  return (
    <div className="page pb-24 view-enter">
      <TopBar title="About" onBack={onClose} />

      <div className="mb-8 mt-4 text-center">
        <Wordmark size={52} className="text-accent-light" />
        <p className="mt-1 text-sm text-paper-dimmer">
          Version {VERSION}{BUILD ? ` (build ${BUILD})` : ''}{ENV !== 'prod' ? ` · ${ENV}` : ''}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-paper-dim">Quiet notes that gather into one continuous read.</p>
      </div>

      <Section title={STORY.title}>
        <div className="reading space-y-4 p-4 text-[17px] leading-relaxed text-paper">
          {STORY.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          <a href={STORY.url} target="_blank" rel="noreferrer" className="block text-sm text-accent-light hover:underline">Inspired by {STORY.inspiredBy}</a>
        </div>
      </Section>

      <Section title="Your notes on Google Drive and your phone">
        <div className="space-y-3 p-4 text-sm leading-relaxed text-paper-dim">
          <p>On this computer, your notes are plain <span className="font-mono">.md</span> files in your home folder (Settings → Home folder). To keep them in Google Drive:</p>
          <ol className="space-y-2">
            <Step n={1}>Install Google Drive for desktop and sign in.</Step>
            <Step n={2}>In grail, open Settings → Home folder and choose a folder inside your Google Drive folder, for example one called grail.</Step>
            <Step n={3}>Google Drive uploads the notes from then on, and keeps them on any other computer where you use that same folder as grail’s home.</Step>
          </ol>
          <p>From the phone, a notebook comes over as a PDF: in the Android app, Read → Save a snapshot → Save as PDF, open it, then Share → Drive. The phone and this computer keep separate notes; grail doesn’t sync between them.</p>
        </div>
      </Section>

      <Section title="Your privacy">
        <Row icon={<Icon.key />} title="Only on your device" hint="Your notes, pictures and drawings are plain files in the folder you chose. grail has no account, no server, no ads and no analytics." />
        <Row icon={<Icon.eye />} title="Online only for link previews"
          hint="The only time grail uses the internet is to show a link preview: when you ask, or for every link if you turn previews on in Settings. It fetches that page (for YouTube, YouTube’s description of the video) and keeps the preview on this computer. Nothing about your notes is sent." />
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="block"><Row icon={<Icon.lock />} title="Privacy policy" hint={PRIVACY_URL} /></a>
      </Section>

      <Section title="Contact">
        <a href={`mailto:${CONTACT}?subject=grail`} className="block"><Row icon={<Icon.alert />} title="Write to us" hint={CONTACT} /></a>
        <Row icon={<Icon.library />} title="Licences" hint="The fonts, icons and libraries grail is built with" onClick={onOpenLicences}>
          <Icon.chevronRight size={18} className="text-paper-dimmer" />
        </Row>
      </Section>

      {/* The GPL asks apps with a screen to show these: copyright, licence, no warranty, where the source is. */}
      <p className="px-4 pt-2 text-center text-xs leading-relaxed text-paper-dimmer">
        © 2026 MPKoutsoukos. grail is free software: you can share and change it under the GNU General Public License,
        version 3. It comes with no warranty. The grail name and look are trademarks.<br />
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-accent-light hover:underline">Source code</a>
        {' · '}
        <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noreferrer" className="text-accent-light hover:underline">GPL v3</a>
      </p>
    </div>
  )
}

const LICENCE_NAMES: Record<string, string> = {
  MIT: 'MIT License', ISC: 'ISC License', 'OFL-1.1': 'SIL Open Font License 1.1',
}

export function Licences({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const groups = Object.keys(LICENCE_NAMES).map((id) => ({ id, items: NOTICES.filter((n) => n.licence === id) })).filter((g) => g.items.length)
  return (
    <div className="page pb-24 view-enter">
      <TopBar title="Licences" onBack={onClose} />
      <p className="mb-6 px-1 text-sm leading-relaxed text-paper-dim">
        grail is built with these open-source fonts, icons and libraries. Their copyright notices and licences follow, as their authors require. Thank you to everyone who made them.
      </p>
      {groups.map(({ id, items }) => (
        <Section key={id} title={LICENCE_NAMES[id]}>
          {items.map((n) => <Row key={n.name} title={n.name} hint={n.copyright || LICENCE_NAMES[id]} />)}
          <Row title={open === id ? 'Hide the licence text' : 'Read the licence text'} onClick={() => setOpen(open === id ? null : id)}>
            {open === id ? <Icon.chevronUp size={18} className="text-paper-dimmer" /> : <Icon.chevronDown size={18} className="text-paper-dimmer" />}
          </Row>
          {open === id && <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-paper-dim">{LICENCE_TEXTS[id]}</pre>}
        </Section>
      ))}
    </div>
  )
}
