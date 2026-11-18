import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { useImage } from '../hooks/useImage'

// `![](1718267361000-media.jpg)` names a file in the home (snapshots write these); web addresses load as they are.
function NoteImage({ src, alt }: { src: string; alt: string }) {
  const web = /^(https?:|data:|blob:)/.test(src)
  const local = useImage(web ? undefined : src)
  const url = web ? src : local
  return url
    ? <img src={url} alt={alt} className="my-4 w-full rounded-2xl" />
    : <span className="my-4 block h-40 w-full rounded-2xl bg-ink-surface" />
}

// Rendered in the reading font (var(--font-read)), which the parent sets.
// Hashtags stay visible but quiet, so prose reads as prose.
const components: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-8 text-[1.6em] font-medium leading-tight text-paper">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-7 text-[1.3em] font-medium leading-snug text-paper">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-6 text-[1.1em] font-semibold text-paper">{children}</h3>,
  p: ({ children }) => <p className="my-3 leading-[1.7] text-paper/95">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent-light underline decoration-accent-light/40 underline-offset-4 hover:decoration-accent-light">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6 marker:text-accent-light/70">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6 marker:text-paper-dimmer">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.65]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-accent-light/60 pl-4 italic text-paper-dim">{children}</blockquote>
  ),
  code: ({ className, children }) =>
    className?.includes('language-')
      ? <code className="my-3 block overflow-x-auto rounded-xl bg-ink-surface p-4 font-mono text-[13px] leading-relaxed text-paper-dim">{children}</code>
      : String(children).startsWith('#')
        ? <span className="font-mono text-[0.72em] tracking-wide text-accent-light/75">{children}</span>
        : <code className="rounded-md bg-ink-surface px-1.5 py-0.5 font-mono text-[0.82em] text-paper-dim">{children}</code>,
  pre: ({ children }) => <pre className="my-3">{children}</pre>,
  strong: ({ children }) => <strong className="font-semibold text-paper">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <p aria-hidden className="my-8 text-center text-paper-dimmer/60">⁂</p>,
  img: ({ src, alt }) => <NoteImage src={String(src ?? '')} alt={alt ?? ''} />,
  table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-[0.9em]">{children}</table></div>,
  th: ({ children }) => <th className="border-b border-ink-surface2 px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-ink-surface2/60 px-3 py-2">{children}</td>,
  input: ({ checked }) => <input type="checkbox" checked={!!checked} readOnly className="mr-2 accent-[rgb(var(--accent))]" />,
}

// Wrap bare #tags so they render as quiet mono labels.
// Code fences (odd-numbered parts after splitting on ```) are left untouched.
function tagify(md: string): string {
  return md.split('```').map((part, i) =>
    i % 2 ? part : part.replace(/(^|\s)#([\wͰ-Ͽἀ-῿]+)/g, '$1`#$2`'),
  ).join('```')
}

export default function MarkdownRenderer({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{tagify(children)}</ReactMarkdown>
}
