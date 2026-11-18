import { useCallback, useEffect, useState } from 'react'
import { useLatest } from './hooks/useLatest'
import { useHome } from './hooks/useHome'
import { useReview } from './hooks/useReview'
import { useSettings } from './hooks/useSettings'
import { useViews } from './hooks/useViews'
import { HomeContext } from './hooks/useImage'
import { pickImages, type ScreenshotRef } from './native/pick'
import { categoryPool, excerpt, isDeleted, looseTitle, noteKind } from '@grail/core'
import { format } from 'date-fns'
import { applyTheme } from './theme/themes'
import { clearConfirm, currentFolder, folderLabel, folderNeeded, pendingConfirm } from './home/folder'
import { NotesPane } from './components/NotesPane'
import { pickEcho } from './notes/echo'
import { Sidebar, type Section as Tab } from './components/Sidebar'
import { CategoriesView } from './components/CategoriesView'
import { NoteEditor } from './components/NoteEditor'
import { ReviewView } from './components/ReviewView'

import { ImportSheet } from './components/ImportSheet'
import { Settings } from './components/Settings'
import { Shortcuts } from './components/Shortcuts'
import { About, Licences } from './components/About'
import { PreviewsProvider } from './linkpreview'
import { CoverScreen } from './components/CoverScreen'
import { FolderChosen, FolderPicker, Tour } from './components/FolderPicker'
import { DrawingCanvas } from './components/DrawingCanvas'

import { Icon, Wordmark } from './ui/icons'
import type { Note, NoteType } from './types'

type Overlay = 'settings' | 'about' | 'licences' | null

function App() {
  const { home, notes, loading, error, epoch, saveNote, createNote, deleteNote, setFolder } = useHome()
  const review = useReview(home, epoch)
  const { settings, ready: settingsReady, update } = useSettings(home, epoch)
  const { views, addView, removeView } = useViews(home, epoch)

  const [tab, setTab] = useState<Tab>('browse')
  const [openId, setOpenId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [chooser, setChooser] = useState(false)
  const [scoped, setScoped] = useState<string | null>(null)
  const [changingFolder, setChangingFolder] = useState(false)
  const [tourDone, setTourDone] = useState(false) // first run: the tour comes before the folder choice
  const [touring, setTouring] = useState(false)   // Settings → Show the tour
  const [confirm, setConfirm] = useState(pendingConfirm) // a folder was just chosen: say which one is in use
  const [entered, setEntered] = useState(() => { try { return sessionStorage.getItem('grail_entered') === '1' } catch { return false } })
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState<ScreenshotRef[]>([])
  const [shortcuts, setShortcuts] = useState(false) // the keyboard shortcuts sheet ("?")
  const shortcutsOpen = useLatest(shortcuts)

  // ---- theme, type -----------------------------------------------------------
  useEffect(() => { applyTheme(settings.theme) }, [settings.theme])
  useEffect(() => { document.documentElement.dataset.read = settings.readingFont }, [settings.readingFont])
  useEffect(() => { window.scrollTo(0, 0) }, [tab, openId, overlay, scoped])

  // ---- back (mouse/browser back, Esc) and shortcuts ----------------------------
  const stack = useLatest({ openId, overlay, scoped, chooser })
  const back = useCallback(() => {
    const s = stack.current
    if (s.chooser) { setChooser(false); return true }
    if (s.openId) { setOpenId(null); return true }
    if (s.overlay === 'licences') { setOverlay('about'); return true }
    if (s.overlay === 'about') { setOverlay('settings'); return true }
    if (s.overlay) { setOverlay(null); return true }
    if (s.scoped) { setScoped(null); return true }
    return false
  }, [stack])
  useEffect(() => {
    const onPop = () => { back() }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [back])
  useEffect(() => {
    if (openId || overlay || scoped || chooser) window.history.pushState({ grail: true }, '')
  }, [openId, overlay, scoped, chooser])

  const createRef = useLatest(async (type: NoteType) => {
    setChooser(false)
    const note = await createNote(type)
    setOpenId(note.id)
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (e.key === 'Escape' && !e.defaultPrevented) {
        if (shortcutsOpen.current) { setShortcuts(false); e.preventDefault(); return }
        if (back()) e.preventDefault()
        return
      }
      if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); void createRef.current('text'); return }
      if (mod && e.key === ',') { e.preventDefault(); setOverlay('settings'); return }
      // Ctrl+1/2/3: the tabs, from wherever you are (an open note closes, saving as it goes).
      const tabs = { '1': 'browse', '2': 'review', '3': 'categories' } as const
      if (mod && !e.shiftKey && e.key in tabs) {
        e.preventDefault(); setOpenId(null); setOverlay(null); setScoped(null); setTab(tabs[e.key as keyof typeof tabs]); return
      }
      // Ctrl+F, or / outside a text field: search notes (on Browse).
      if ((mod && e.key.toLowerCase() === 'f') || (!typing && !mod && e.key === '/')) {
        e.preventDefault(); setOpenId(null); setOverlay(null); setScoped(null); setTab('browse')
        setTimeout(() => (document.querySelector('[data-search]') as HTMLInputElement | null)?.focus(), 60)
        return
      }
      if (!typing && !mod && e.key === '?') { e.preventDefault(); setShortcuts(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, createRef, shortcutsOpen])

  const importSelected = async (selected: ScreenshotRef[]) => {
    for (const sc of selected) {
      const note = await createNote('media')
      const mediaPath = await home!.saveImage(`${note.id}-media`, sc.src)
      await saveNote({ ...note, mediaPath })
    }
    setImporting([])
  }

  // ---- gates: home picker, cover, loading ------------------------------------
  if (folderNeeded()) return tourDone ? <FolderPicker onChosen={(c, o) => void setFolder(c, o)} /> : <Tour welcome onDone={() => setTourDone(true)} />
  if (touring) return <Tour closeLabel="Close" doneLabel="Done" onDone={() => setTouring(false)} />
  if (changingFolder) {
    return <FolderPicker initial={false} current={currentFolder()} noteCount={notes.length}
      onChosen={(c, o) => void setFolder(c, o)} onCancel={() => setChangingFolder(false)} />
  }

  const splash = (
    <div className="grid min-h-[100dvh] place-items-center bg-ink">
      <Wordmark size={44} className="breathe text-accent-light" />
    </div>
  )
  if (error) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-ink p-8 text-center">
        <div>
          <Icon.alert size={28} className="mx-auto mb-3 text-red-400" />
          <p className="mb-1 font-serif text-xl text-paper">Couldn’t open your home folder</p>
          <p className="mb-5 text-sm text-paper-dimmer">{error}</p>
          <button className="btn-quiet" onClick={() => setChangingFolder(true)}>Choose another folder</button>
        </div>
      </div>
    )
  }
  if (!settingsReady && loading) return splash
  if (settings.cover.enabled && !entered) {
    return <CoverScreen cover={settings.cover} ready={!loading} onEnter={() => {
      setEntered(true)
      try { sessionStorage.setItem('grail_entered', '1') } catch { /* private mode */ }
    }} />
  }
  if (loading || !home) return splash
  if (confirm) {
    const done = () => { clearConfirm(); setConfirm(null) }
    return <FolderChosen folder={currentFolder()} first={confirm === 'first'} notes={notes.length}
      plain={notes.filter((n) => n.plain).length} onDone={done} onAgain={() => { done(); setChangingFolder(true) }} />
  }

  // ---- derived ---------------------------------------------------------------
  const eligible = notes.filter((n) => noteKind(n) === 'timeline' && !isDeleted(n))
  const loose = notes.filter((n) => noteKind(n) === 'loose' && !isDeleted(n))
  const global = review.view('', eligible)
  const open = (n: Note) => setOpenId(n.id)

  const makeLoose = async (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return
    global.restore(id)
    await saveNote({ ...note, title: looseTitle(note) })
  }
  const askDelete = (id: string) => {
    const n = notes.find((x) => x.id === id)
    if (!n) return
    const ask = isDeleted(n)
      ? 'This note is already in #deleted. Delete it for good? Its file and pictures go, and it can’t be brought back.'
      : 'Delete this note? It moves to #deleted: hidden everywhere, but search #deleted to find it again.'
    if (window.confirm(ask)) { if (openId === id) setOpenId(null); void deleteNote(id) }
  }

  // ---- screens ---------------------------------------------------------------
  // Notes: sidebar | list | the open note. Read, Tags and Settings: sidebar | the page.
  const openNote = notes.find((n) => n.id === openId) ?? null
  const withList = tab === 'browse' && !overlay && !scoped
  let screen: React.ReactNode

  if (openNote?.type === 'drawing') {
    screen = (
      <DrawingCanvas
        note={openNote}
        loadDrawing={home.loadImage.bind(home)}
        loadScene={home.readScene.bind(home)}
        onPersist={async (n, png, scene) => {
          // The scene is the source of truth; the PNG is a best-effort preview.
          await home.writeScene(n.id, scene)
          let drawingPath: string | undefined
          try { drawingPath = await home.saveImage(`${n.id}.png`, png) } catch (e) { console.warn('preview save failed', e) }
          await saveNote({ ...n, ...(drawingPath ? { drawingPath } : {}) })
        }}
        onDelete={deleteNote}
        onClose={() => setOpenId(null)}
      />
    )
  } else if (openNote) {
    screen = (
      <NoteEditor
        key={openNote.id}
        note={openNote}
        onSave={saveNote}
        onDelete={deleteNote}
        onClose={() => setOpenId(null)}
        showBack={!withList}
        onAttach={async (n, dataUrl) => {
          const mediaPath = await home.saveImage(`${n.id}-media`, dataUrl)
          await saveNote({ ...n, mediaPath })
        }}
      />
    )
  } else if (overlay === 'licences') {
    screen = <Licences onClose={() => setOverlay('about')} />
  } else if (overlay === 'about') {
    screen = <About onClose={() => setOverlay('settings')} onOpenLicences={() => setOverlay('licences')} />
  } else if (overlay === 'settings') {
    screen = (
      <Settings
        settings={settings}
        onUpdate={update}
        onClose={() => setOverlay(null)}
        onImportNow={async () => { const f = await pickImages(); if (f.length) setImporting(f) }}
        onChangeFolder={() => { setOverlay(null); setChangingFolder(true) }}
        onOpenTour={() => { setOverlay(null); setTouring(true) }}
        onOpenShortcuts={() => setShortcuts(true)}
        onOpenAbout={() => setOverlay('about')}
      />
    )
  } else if (scoped) {
    const ctx = review.view(scoped, categoryPool(notes, scoped))
    screen = (
      <ReviewView
        title={`#${scoped}`}
        template={settings.reviewTemplate}
        compiled={ctx.compiled}
        removedNotes={ctx.removedNotes}
        onEdit={setOpenId}
        onMove={ctx.move}
        onRemove={ctx.remove}
        onDelete={deleteNote}
        onRestore={ctx.restore}
        onClearRemoved={ctx.clearRemoved}
        onExit={() => setScoped(null)}
      />
    )
  } else if (tab === 'review') {
    screen = (
      <ReviewView
        template={settings.reviewTemplate}
        compiled={global.compiled}
        loose={loose}
        removedNotes={global.removedNotes}
        onEdit={setOpenId}
        onMove={global.move}
        onRemove={global.remove}
        onDelete={deleteNote}
        onMakeLoose={makeLoose}
        onRestore={global.restore}
        onClearRemoved={global.clearRemoved}
      />
    )
  } else if (tab === 'categories') {
    screen = <CategoriesView notes={notes} views={views} onOpen={open} onSaveView={addView} onDeleteView={removeView} onReview={setScoped} header={null} />
  } else {
    screen = <NothingOpen notes={notes} echoes={settings.echoes} onOpen={open} onNew={() => void createRef.current('text')} />
  }

  const left = withList ? '34rem' : '14rem' // sidebar 14rem (+ list 20rem)
  return (
    <HomeContext.Provider value={home}>
    <PreviewsProvider always={settings.linkPreviews} setAlways={(v) => update('linkPreviews', v)}>
      <Sidebar
        section={tab}
        onSection={(s) => { setOpenId(null); setOverlay(null); setScoped(null); setTab(s) }}
        notes={notes}
        views={views}
        search={withList ? search : ''}
        onSearch={setSearch}
        onReadTag={(t) => { setOpenId(null); setOverlay(null); setScoped(t) }}
        onNew={(t) => { setTab('browse'); setOverlay(null); setScoped(null); void createRef.current(t) }}
        onSettings={() => { setOpenId(null); setOverlay('settings') }}
        homeName={folderLabel(currentFolder()).split(/[\\/]/).filter(Boolean).pop() ?? 'Home'}
        settingsOn={overlay !== null}
      />
      {withList && (
        <div className="fixed inset-y-0 left-56 z-10 w-80 border-r border-ink-surface2/70 bg-ink-surface/30">
          <NotesPane notes={notes} search={search} onSearch={setSearch} selectedId={openId}
            onOpen={open} onDelete={askDelete} onNew={() => void createRef.current('text')} />
        </div>
      )}
      <main style={{ paddingLeft: left, ['--content-left' as string]: left }} className="min-h-[100dvh]">{screen}</main>
      {shortcuts && <Shortcuts onClose={() => setShortcuts(false)} />}
      {importing.length > 0 && <ImportSheet candidates={importing} onImport={importSelected} onDismiss={() => setImporting([])} />}
    </PreviewsProvider>
    </HomeContext.Provider>
  )
}

/** The right-hand pane when no note is open: an echo, and how to start. */
function NothingOpen({ notes, echoes, onOpen, onNew }: { notes: Note[]; echoes: boolean; onOpen: (n: Note) => void; onNew: () => void }) {
  const [salt, setSalt] = useState(0)
  const echo = echoes ? pickEcho(notes, salt) : null
  return (
    <div className="grid min-h-[100dvh] place-items-center px-10">
      <div className="w-full max-w-md text-center">
        {echo ? (
          <div className="mb-8 text-left">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-accent-light">
              <Icon.sparkle size={12} /> An echo from {format(echo.created, 'd MMMM yyyy')}
              <button onClick={() => setSalt((s) => s + 1)} title="Another echo" className="ml-auto rounded p-1 text-paper-dimmer hover:bg-ink-surface hover:text-paper"><Icon.shuffle size={13} /></button>
            </p>
            <button onClick={() => onOpen(echo)} className="reading block w-full rounded-lg p-3 text-left text-[18px] italic leading-relaxed text-paper-dim hover:bg-ink-surface">
              “{excerpt(echo.body, 260)}”
            </button>
          </div>
        ) : null}
        <p className="text-[13px] text-paper-dimmer">
          Pick a note on the left, or <button onClick={onNew} className="text-accent-light hover:underline">write a new one</button> (Ctrl+N).
        </p>
      </div>
    </div>
  )
}

export default App
