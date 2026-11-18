import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Ellipse, Image as KonvaImage } from 'react-konva'
import Konva from 'konva'
import type { Note } from '../types'
import {
  DRAWING_COLORS, DRAWING_PAPER, DRAWING_SIZES, fitScene, newElementId, normalizeElement, parseScene, sceneSize,
  type Scene, type SceneElement as El, type Tool,
  isDeleted,
} from '@grail/core'
import { useLatest } from '../hooks/useLatest'
import { Eraser, Minus, Pencil, Redo2, RectangleHorizontal, Circle, ImagePlus, Trash2, Undo2, ArrowLeft, BrushCleaning } from 'lucide-react'
import { STROKE } from '../ui/icons'

// Render the canvas at 1x instead of the device pixel ratio (2–3x on phones).
// A full-screen Stage at 3x is a multi-megapixel backing buffer that's slow to
// allocate/composite and can freeze or OOM low-end devices on open. The exported
// PNG passes its own pixelRatio, so saved-image quality is unaffected.
Konva.pixelRatio = 1

interface DrawingCanvasProps {
  note: Note
  loadDrawing: (path: string) => Promise<string>
  loadScene: (id: string) => Promise<string | null>
  onPersist: (note: Note, pngDataUrl: string, sceneJson: string) => Promise<void>
  onDelete: (id: string) => void
  onClose: () => void
}

// The scene format (shared with the phone) lives in @grail/core. Coordinates are
// in the scene's own space; the canvas scales the whole scene to fit the window.
const INK = DRAWING_PAPER
const COLORS = DRAWING_COLORS
const SIZES = DRAWING_SIZES
const uid = newElementId
const normalize = normalizeElement
const TOOLS: { tool: Tool; icon: typeof Pencil; label: string }[] = [
  { tool: 'pen', icon: Pencil, label: 'Pen' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser' },
  { tool: 'line', icon: Minus, label: 'Line' },
  { tool: 'rect', icon: RectangleHorizontal, label: 'Rectangle' },
  { tool: 'ellipse', icon: Circle, label: 'Ellipse' },
]

// Memoized so that while a stroke is in progress (only `draft` changing), the
// already-committed shapes don't all re-render on every pointer move — that O(N)
// churn is what makes long drawings stutter/freeze on phones.
const Shape = memo(function Shape({ el }: { el: El }) {
  const common = {
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  }
  switch (el.tool) {
    case 'pen':
      return <Line points={el.points} tension={0.4} {...common} />
    case 'eraser':
      // Real erasing on the stroke layer (old drawings painted the background color).
      return <Line points={el.points} tension={0.4} {...common} globalCompositeOperation="destination-out" />
    case 'line':
      return <Line points={el.points} {...common} />
    case 'rect':
      return <Rect x={el.x} y={el.y} width={el.width} height={el.height} {...common} />
    case 'ellipse':
      return (
        <Ellipse
          x={(el.x ?? 0) + (el.width ?? 0) / 2}
          y={(el.y ?? 0) + (el.height ?? 0) / 2}
          radiusX={Math.abs((el.width ?? 0) / 2)}
          radiusY={Math.abs((el.height ?? 0) / 2)}
          {...common}
        />
      )
  }
})

export function DrawingCanvas({ note, loadDrawing, loadScene, onPersist, onDelete, onClose }: DrawingCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const drawing = useRef(false)
  const startPt = useRef<{ x: number; y: number } | null>(null)
  const dirty = useRef(false)

  const [size, setSize] = useState({ w: 0, h: 0 })
  // The scene's own size (null until known). New drawings take the window's size.
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const sizeRef = useLatest(size)
  const [background, setBackground] = useState<string | undefined>()
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null)
  const [draft, setDraft] = useState<El | null>(null)
  const [title, setTitle] = useState(note.title)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [width, setWidth] = useState(SIZES[1])

  // Undo/redo: history is a stack of element snapshots; `step` points at the current one.
  const [history, setHistory] = useState<El[][]>([[]])
  const [step, setStep] = useState(0)
  const elements = history[step]

  const commit = (els: El[]) => {
    setHistory((h) => [...h.slice(0, step + 1), els])
    setStep((s) => s + 1)
    dirty.current = true
  }
  const undo = () => setStep((s) => Math.max(0, s - 1))
  const redo = () => setStep((s) => Math.min(history.length - 1, s + 1))
  const clear = () => commit([])

  // Measure the canvas wrapper so the Konva stage gets explicit pixel dimensions.
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrapRef.current
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Load the editable scene, or fall back to the flattened PNG as a backdrop.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const scene = parseScene(await loadScene(note.id))
      if (cancelled) return
      if (scene) {
        setHistory([scene.elements])
        setStep(0)
        setBackground(scene.background)
        setDims(sceneSize(scene, sizeRef.current))
      } else if (note.drawingPath) {
        // Only a flattened PNG: it becomes the backdrop, at its own size.
        const src = await loadDrawing(note.drawingPath)
        if (cancelled) return
        setBackground(src)
        const img = new window.Image()
        img.onload = () => { if (!cancelled) setDims({ w: img.naturalWidth, h: img.naturalHeight }) }
        img.src = src
      } else {
        setDims({ ...sizeRef.current })
      }
    })()
    return () => { cancelled = true }
    // Load once per note open. Deliberately NOT keyed on note.drawingPath: it
    // changes after the first save, and reloading then would collapse the undo
    // stack mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, loadScene, loadDrawing])

  // Turn the background data URL into an <img> Konva can draw.
  useEffect(() => {
    if (!background) return
    const img = new window.Image()
    img.onload = () => setBgImg(img)
    img.src = background
  }, [background])

  // Screen ↔ scene: the scene is scaled uniformly to fit, centred.
  const fit = dims && size.w > 0 ? fitScene(dims, size) : null
  const pointer = () => {
    const p = stageRef.current?.getPointerPosition()
    if (!p || !fit) return null
    return { x: (p.x - fit.x) / fit.scale, y: (p.y - fit.y) / fit.scale }
  }

  const onDown = () => {
    const p = pointer()
    if (!p) return
    drawing.current = true
    startPt.current = p
    const stroke = tool === 'eraser' ? INK : color
    setDraft(
      tool === 'pen' || tool === 'eraser'
        ? { id: uid(), tool, stroke, strokeWidth: width, points: [p.x, p.y] }
        : tool === 'line'
          ? { id: uid(), tool, stroke, strokeWidth: width, points: [p.x, p.y, p.x, p.y] }
          : { id: uid(), tool, stroke, strokeWidth: width, x: p.x, y: p.y, width: 0, height: 0 }
    )
  }

  const onMove = () => {
    if (!drawing.current) return
    const p = pointer()
    if (!p || !startPt.current) return
    setDraft((d) => {
      if (!d) return d
      if (d.tool === 'pen' || d.tool === 'eraser') {
        return { ...d, points: [...(d.points ?? []), p.x, p.y] }
      }
      if (d.tool === 'line') {
        return { ...d, points: [startPt.current!.x, startPt.current!.y, p.x, p.y] }
      }
      return { ...d, width: p.x - startPt.current!.x, height: p.y - startPt.current!.y }
    })
  }

  const onUp = () => {
    if (!drawing.current || !draft) { drawing.current = false; return }
    drawing.current = false
    commit([...elements, normalize(draft)])
    setDraft(null)
  }

  const importImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setBackground(reader.result as string); dirty.current = true }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const persist = async (): Promise<boolean> => {
    const stage = stageRef.current
    if (!stage || !fit || !dims) return false
    setSaving(true)
    setSaveError(null)
    try {
      // Wait for Konva to finish rendering the last stroke before capturing.
      // Without this, a rapid "back" tap can snapshot a blank or incomplete frame.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      // The preview is the scene at its own size, whatever the window's.
      const png = stage.toDataURL({ x: fit.x, y: fit.y, width: dims.w * fit.scale, height: dims.h * fit.scale, pixelRatio: 1 / fit.scale })
      const scene: Scene = { width: dims.w, height: dims.h, background, elements }
      await onPersist({ ...note, title }, png, JSON.stringify(scene))
      dirty.current = false
      setSaving(false)
      return true
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save drawing')
      setSaving(false)
      return false
    }
  }

  const done = async () => {
    // Only leave once the save succeeds, so a failed write doesn't discard work.
    if (dirty.current || title !== note.title) {
      const ok = await persist()
      if (!ok) return
    }
    onClose()
  }

  // Autosave the scene shortly after it settles, so leaving via the Android/browser
  // back button (which bypasses "done") doesn't discard the drawing — the text
  // editor autosaves the same way. Strokes commit on pointer-up, so this debounce
  // fires between strokes, never mid-stroke; the PNG is light (pixelRatio 1).
  const persistRef = useLatest(persist)
  useEffect(() => {
    if (!dirty.current && title === note.title) return
    const t = setTimeout(() => { persistRef.current() }, 800)
    return () => clearTimeout(t)
  }, [history, step, background, title, note.title, persistRef])

  // Flush on unmount too: leaving via the system back gesture tears this down
  // before the debounce above can fire, which would otherwise lose the last edits.
  useEffect(() => {
    // Deliberately reads the latest persist at unmount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { if (dirty.current) void persistRef.current() }
  }, [persistRef])

  const remove = () => {
    const ask = isDeleted(note)
      ? 'This drawing is already in #deleted. Delete it for good? It can’t be brought back.'
      : 'Delete this drawing? It moves to #deleted: hidden everywhere, but search #deleted to find it again.'
    if (confirm(ask)) { onDelete(note.id); onClose() }
  }

  const iconBtn = 'grid h-10 w-10 place-items-center rounded-xl transition-colors'
  return (
    <div className="flex h-[100dvh] flex-col bg-ink text-paper view-enter">
      <header className="flex items-center gap-1 px-2 pb-1" style={{ paddingTop: 'calc(var(--safe-top) + 0.5rem)' }}>
        <button onClick={done} aria-label="Back" className="icon-btn"><ArrowLeft size={20} strokeWidth={STROKE} /></button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="min-w-0 flex-1 bg-transparent font-serif text-xl text-paper outline-none placeholder:text-paper-dimmer"
        />
        <span className={`px-2 text-xs ${saveError ? 'text-red-400' : 'text-paper-dimmer'}`}>
          {saveError ?? (saving ? 'Saving…' : 'Saved')}
        </span>
        <button onClick={remove} aria-label="Delete" className="icon-btn hover:text-red-400"><Trash2 size={20} strokeWidth={STROKE} /></button>
      </header>

      <div ref={wrapRef} className="mx-3 flex-1 overflow-hidden rounded-3xl border border-ink-surface2 bg-ink-surface/40 shadow-lift">
        {size.w > 0 && fit && dims && (
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            style={{ touchAction: 'none' }}
          >
            <Layer listening={false} x={fit.x} y={fit.y} scaleX={fit.scale} scaleY={fit.scale}>
              <Rect x={0} y={0} width={dims.w} height={dims.h} fill={INK} cornerRadius={4 / fit.scale} />
              {bgImg && background && <KonvaImage image={bgImg} width={dims.w} height={dims.h} />}
            </Layer>
            <Layer x={fit.x} y={fit.y} scaleX={fit.scale} scaleY={fit.scale}
              clipX={0} clipY={0} clipWidth={dims.w} clipHeight={dims.h}>
              {elements.map((el) => <Shape key={el.id} el={el} />)}
              {draft && <Shape el={draft} />}
            </Layer>
          </Stage>
        )}
      </div>

      <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-ink-surface p-2"
        style={{ marginBottom: 'calc(var(--safe-bottom) + 0.75rem)' }}>
        <div className="flex items-center gap-0.5">
          {TOOLS.map(({ tool: t, icon: I, label }) => (
            <button key={t} onClick={() => setTool(t)} aria-label={label} title={label}
              className={`${iconBtn} ${tool === t ? 'bg-accent text-[#fffaf2]' : 'text-paper-dim hover:bg-ink-surface2'}`}>
              <I size={19} strokeWidth={STROKE} />
            </button>
          ))}
        </div>
        <span className="h-6 w-px bg-ink-surface2" />
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }} aria-label={`Color ${c}`}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full border border-black/30 transition-transform ${color === c && tool !== 'eraser' ? 'scale-110 ring-2 ring-accent-light ring-offset-2 ring-offset-ink-surface' : ''}`} />
          ))}
        </div>
        <span className="h-6 w-px bg-ink-surface2" />
        <div className="flex items-center gap-0.5">
          {SIZES.map((s) => (
            <button key={s} onClick={() => setWidth(s)} aria-label={`Size ${s}`}
              className={`${iconBtn} ${width === s ? 'bg-ink-surface2' : 'hover:bg-ink-surface2/60'}`}>
              <span className="rounded-full bg-paper" style={{ width: Math.min(s, 14) + 3, height: Math.min(s, 14) + 3 }} />
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5 text-paper-dim">
          <button onClick={undo} disabled={step === 0} aria-label="Undo" className={`${iconBtn} hover:bg-ink-surface2 disabled:opacity-30`}><Undo2 size={19} strokeWidth={STROKE} /></button>
          <button onClick={redo} disabled={step === history.length - 1} aria-label="Redo" className={`${iconBtn} hover:bg-ink-surface2 disabled:opacity-30`}><Redo2 size={19} strokeWidth={STROKE} /></button>
          <label aria-label="Trace over an image" title="Trace over an image" className={`${iconBtn} cursor-pointer hover:bg-ink-surface2`}>
            <ImagePlus size={19} strokeWidth={STROKE} />
            <input type="file" accept="image/*" onChange={importImage} className="hidden" />
          </label>
          <button onClick={() => { if (confirm('Clear the whole drawing?')) clear() }} aria-label="Clear" title="Clear" className={`${iconBtn} hover:bg-ink-surface2`}><BrushCleaning size={19} strokeWidth={STROKE} /></button>
        </div>
      </div>
    </div>
  )
}
