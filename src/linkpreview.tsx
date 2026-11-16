// Link previews, as chat apps show them and as the Android app does: under a note, a card for each link with the
// page's title, a line about it, its picture and the site. grail only goes online for one when you ask (Preview,
// then Show), or for every link once you've chosen "Always" (Settings → Link previews). It fetches that one page
// (for YouTube, YouTube's own oEmbed description of the video) through Tauri's native HTTP client, so sites can't
// block it the way they block in-browser requests, and keeps the preview on this computer so it isn't fetched again.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { IS_TAURI } from './vault/home'
import { Icon } from './ui/icons'

export type Preview = { title: string; description: string; site: string; image: string | null; at: number }

/** A bare web address in text (trailing punctuation stays out of it). */
const URL_RE = /https?:\/\/[^\s<>()[\]"'`]+[^\s<>()[\]"'`.,;:!?]/g
const urlsIn = (text: string) => [...new Set([...text.matchAll(URL_RE)].map((m) => m[0]))]
const siteOf = (url: string) => (/^https?:\/\/([^/?#:]+)/i.exec(url)?.[1] ?? url).replace(/^www\./i, '').toLowerCase()
const originOf = (url: string) => /^(https?:\/\/[^/?#]+)/i.exec(url)?.[1] ?? ''

// ---------- "Always" or ask: the setting, given by the app ----------

const Ctx = createContext<{ always: boolean; setAlways: (v: boolean) => void }>({ always: false, setAlways: () => {} })
export function PreviewsProvider({ always, setAlways, children }: { always: boolean; setAlways: (v: boolean) => void; children: ReactNode }) {
  return <Ctx.Provider value={{ always, setAlways }}>{children}</Ctx.Provider>
}

// ---------- kept on this computer (the app's own storage, not the notes folder) ----------

const KEY = 'grail-link-previews'
const MAX_PICTURE = 600 * 1024
const listeners = new Set<() => void>()

function all(): Record<string, Preview> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}
function keep(url: string, p: Preview) {
  const next = { ...all(), [url]: p }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {
    try { localStorage.setItem(KEY, JSON.stringify({ ...next, [url]: { ...p, image: null } })) } catch { /* full */ }
  }
  listeners.forEach((f) => f())
}

// ---------- fetching one ----------

const get = (url: string, init: RequestInit = {}) => {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 10_000)
  return (IS_TAURI ? tauriFetch : fetch)(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(t))
}

async function picture(pageUrl: string, src: string | null | undefined): Promise<string | null> {
  if (!src) return null
  const abs = src.startsWith('//') ? `https:${src}` : src.startsWith('/') ? originOf(pageUrl) + src
    : /^https?:/i.test(src) ? src : `${originOf(pageUrl)}/${src}`
  try {
    const r = await get(abs)
    if (!r.ok) return null
    const blob = await r.blob()
    if (blob.size > MAX_PICTURE || !blob.type.startsWith('image/')) return null
    return await new Promise<string>((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result)); f.onerror = rej; f.readAsDataURL(blob) })
  } catch {
    return null
  }
}

function meta(doc: Document, ...names: string[]): string {
  for (const n of names) {
    const el = doc.querySelector(`meta[property="${n}"], meta[name="${n}"]`)
    const v = el?.getAttribute('content')?.trim()
    if (v) return v
  }
  return ''
}

async function fetchPreview(url: string): Promise<Preview> {
  const site = siteOf(url)
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(site)) {
    const r = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
    if (r.ok) {
      const j = await r.json()
      return { title: String(j.title ?? ''), description: String(j.author_name ?? ''), site: 'YouTube', image: await picture(url, j.thumbnail_url), at: Date.now() }
    }
  }
  const r = await get(url, { headers: { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' } })
  if (!r.ok) throw new Error(`The page answered ${r.status}`)
  if ((r.headers.get('content-type') ?? '').startsWith('image/')) return { title: '', description: '', site, image: await picture(url, url), at: Date.now() }
  // Parsed as an inert document: nothing in it runs, loads or touches the app.
  const doc = new DOMParser().parseFromString((await r.text()).slice(0, 500_000), 'text/html')
  return {
    title: meta(doc, 'og:title', 'twitter:title') || doc.title.trim(),
    description: meta(doc, 'og:description', 'twitter:description', 'description'),
    site: meta(doc, 'og:site_name') || site,
    image: await picture(url, meta(doc, 'og:image', 'og:image:url', 'twitter:image')),
    at: Date.now(),
  }
}

// ---------- the cards ----------

export function LinkCards({ text }: { text: string }) {
  const urls = urlsIn(text).slice(0, 5)
  if (!urls.length) return null
  return <div className="mt-4 space-y-2">{urls.map((u) => <LinkCard key={u} url={u} />)}</div>
}

function LinkCard({ url }: { url: string }) {
  const { always, setAlways } = useContext(Ctx)
  const [p, setP] = useState<Preview | null>(() => all()[url] ?? null)
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const site = siteOf(url)

  useEffect(() => {
    const refresh = () => setP(all()[url] ?? null)
    listeners.add(refresh)
    return () => { listeners.delete(refresh) }
  }, [url])

  const go = async () => {
    setAsking(false); setBusy(true); setError(null)
    try { keep(url, await fetchPreview(url)) } catch (e) {
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'The page didn’t answer')
    } finally { setBusy(false) }
  }
  // (started on the next tick, not inside the effect itself)
  useEffect(() => {
    if (!always || p || busy || error) return
    const t = setTimeout(() => void go(), 0)
    return () => clearTimeout(t)
  }, [always]) // eslint-disable-line react-hooks/exhaustive-deps

  if (p) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="card block overflow-hidden transition hover:border-ink-surface2">
        {p.image && <img src={p.image} alt="" className="aspect-[1.91] w-full object-cover" />}
        <div className="space-y-1 p-3">
          <p className="eyebrow">{p.site}</p>
          {p.title && <p className="line-clamp-2 font-serif text-[17px] leading-snug text-paper">{p.title}</p>}
          {p.description && <p className="line-clamp-2 text-sm text-paper-dim">{p.description}</p>}
        </div>
      </a>
    )
  }
  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <Icon.link size={18} className="shrink-0 text-paper-dimmer" />
        <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
          <span className="block text-sm text-paper">{site}</span>
          <span className={`block truncate text-xs ${error ? 'text-red-400' : 'text-paper-dimmer'}`}>{error ?? url}</span>
        </a>
        {!asking && (
          <button className="btn-quiet h-9 min-h-0 shrink-0 px-3 text-sm" disabled={busy} onClick={() => (error ? void go() : setAsking(true))}>
            {busy ? <Icon.spinner size={16} className="animate-spin" /> : <Icon.eye size={16} />}
            {busy ? 'Fetching…' : error ? 'Try again' : 'Preview'}
          </button>
        )}
      </div>
      {asking && (
        <div className="mt-3 border-t border-ink-surface2 pt-3 text-sm text-paper-dim">
          <p className="mb-3">grail will fetch this page from <span className="text-paper">{site}</span> to show its title and picture. It only goes online when you ask, and sends nothing but the request for that page.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-quiet h-9 min-h-0 px-3" onClick={() => void go()}>Show</button>
            <button className="btn-quiet h-9 min-h-0 px-3" onClick={() => { setAlways(true); void go() }}>Always</button>
            <button className="h-9 px-3 text-paper-dimmer hover:text-paper" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
