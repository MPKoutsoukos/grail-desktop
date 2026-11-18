import { useCallback, useEffect, useState } from 'react'
import { useLatest } from './hooks/useLatest'
import { useHome } from './hooks/useHome'
import { useReview } from './hooks/useReview'
import { useSettings } from './hooks/useSettings'
import { useViews } from './hooks/useViews'
import { HomeContext } from './hooks/useImage'
import { pickImages, type ScreenshotRef } from './native/pick'
import { categoryPool, looseTitle, noteKind } from '@grail/core'
import { applyTheme } from './theme/themes'
import { clearConfirm, currentFolder, folderNeeded, pendingConfirm } from './home/folder'
import { BrowseView } from './components/BrowseView'
import { CategoriesView } from './components/CategoriesView'
import { NoteEditor } from './components/NoteEditor'
import { ReviewView } from './components/ReviewView'
import { CreateChooser, CreateFab } from './components/CreateChooser'
import { ImportSheet } from './components/ImportSheet'
import { Settings } from './components/Settings'
import { About, Licences } from './components/About'
import { PreviewsProvider } from './linkpreview'
import { CoverScreen } from './components/CoverScreen'
import { FolderChosen, FolderPicker, Tour } from './components/FolderPicker'
import { DrawingCanvas } from './components/DrawingCanvas'
import { TabBar, type Tab } from './components/TabBar'
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
      if (e.key === 'Escape' && !e.defaultPrevented) { if (back()) e.preventDefault(); return }
      if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); void createRef.current('text'); return }
      if (mod && e.key === ',') { e.preventDefault(); setOverlay('settings') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, createRef])

  const importSelected = async (selected: ScreenshotRef[]) => {
    for (const sc of selected) {
      const note = await createNote('media')
      const mediaPath = await home!.saveImage(`${note.id}-media`, sc.src)
      await saveNote({ ...note, mediaPath })
    }
    setImporting([])
  }

  // ---- gates: home picker, cover, loading ------------------------------------
  if (folderNeeded()) return tourDone ? <FolderPicker onChosen={(c, o) => void setFolder(c, o)} /> : <Tour onDone={() => setTourDone(true)} />
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
      plain={notes.filter((n) => !n.title).length} onDone={done} onAgain={() => { done(); setChangingFolder(true) }} />
  }

  // ---- derived ---------------------------------------------------------------
  const eligible = notes.filter((n) => noteKind(n) === 'timeline')
  const loose = notes.filter((n) => noteKind(n) === 'loose')
  const global = review.view('', eligible)
  const open = (n: Note) => setOpenId(n.id)

  const makeLoose = async (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return
    global.restore(id)
    await saveNote({ ...note, title: looseTitle(note) })
  }

  const headerActions = (
    <>
      <button onClick={() => setOverlay('settings')} aria-label="Settings" className="icon-btn"><Icon.settings /></button>
    </>
  )

  // ---- screens ---------------------------------------------------------------
  const openNote = notes.find((n) => n.id === openId) ?? null
  let screen: React.ReactNode
  let chrome = false

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
        onRestore={ctx.restore}
        onClearRemoved={ctx.clearRemoved}
        onExit={() => setScoped(null)}
      />
    )
  } else {
    chrome = true
    screen = tab === 'review' ? (
      <ReviewView
        template={settings.reviewTemplate}
        compiled={global.compiled}
        loose={loose}
        removedNotes={global.removedNotes}
        header={headerActions}
        onEdit={setOpenId}
        onMove={global.move}
        onRemove={global.remove}
        onMakeLoose={makeLoose}
        onRestore={global.restore}
        onClearRemoved={global.clearRemoved}
      />
    ) : tab === 'categories' ? (
      <CategoriesView notes={notes} views={views} onOpen={open} onSaveView={addView} onDeleteView={removeView} onReview={setScoped} header={headerActions} />
    ) : (
      <BrowseView notes={notes} removedIds={global.removedIds} search={search} onSearch={setSearch} onOpen={open} echoes={settings.echoes} header={headerActions} />
    )
  }

  return (
    <HomeContext.Provider value={home}>
    <PreviewsProvider always={settings.linkPreviews} setAlways={(v) => update('linkPreviews', v)}>
      <div className={chrome ? 'md:pl-20' : ''}>{screen}</div>
      {chrome && (
        <>
          {tab === 'browse' && <CreateFab onClick={() => setChooser(true)} />}
          <TabBar tab={tab} onChange={setTab} />
        </>
      )}
      <CreateChooser open={chooser} onChoose={(t) => void createRef.current(t)} onClose={() => setChooser(false)} />
      {importing.length > 0 && <ImportSheet candidates={importing} onImport={importSelected} onDismiss={() => setImporting([])} />}
    </PreviewsProvider>
    </HomeContext.Provider>
  )
}

export default App
