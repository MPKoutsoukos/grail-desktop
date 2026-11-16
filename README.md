# grail desktop

**grail for Windows and Linux: quiet, local-first notes that gather into one continuous read.**

This is the desktop twin of the Android app in [grail](https://github.com/MPKoutsoukos/grail). It mirrors the
APK: the same features, the same notes format, and for every APK built, a desktop build with the same version,
build number and environment.

**Download:** the latest version is on the [Releases page](https://github.com/MPKoutsoukos/grail-desktop/releases/latest):
the Windows installer (`-windows-setup.exe`, or the `.msi`) and Linux packages (`.deb`, `.AppImage`).

## What it does

The same as the phone: Browse with search and Echoes, Read (your fragments as one continuous text, in four
layouts), Tags with queries and saved views, drawings, pictures, tables, five themes, link previews when you ask
for them, and Settings → About grail with the story, privacy, contact and licences.

On the desktop, your notes are plain `.md` files in a **home folder you choose** (Settings → Home folder). Put
that folder inside your Google Drive for desktop folder and Drive keeps a copy online. The phone and the desktop
keep separate notes; grail doesn't sync between them.

Inspired by [“Creativity isn’t a gift, it’s a system”](https://www.youtube.com/watch?v=_QVYfPnNOg4) by Perry Daniels.

## How it mirrors the Android app

```
grail (Android)                                  grail-desktop (this repo)
  push to dev / qa / staging / main
    -> Android pipeline builds the APK
    -> moves grail-desktop's `grail` submodule  ->  same branch: new commit
       to that commit, writes mirror.json            -> Desktop pipeline builds Windows + Linux
       (version, build number, environment)          -> main: Releases page, next to the APK's
```

- **`grail/`** is the grail repo as a git submodule. The app uses its shared core (`grail/packages/core`): the
  note format, vault, tags, themes and drawings, so both apps read and write the same files.
- **`mirror.json`** holds the version, build number and environment of the APK this build mirrors. The pipeline
  writes it; the About page shows it.

## Branches and environments

| Branch | Environment | App name | Identifier | Where the build goes |
|---|---|---|---|---|
| `dev` | dev | grail dev | `com.grailnotebook.desktop.dev` | the run's artifacts |
| `qa` | qa | grail qa | `com.grailnotebook.desktop.qa` | the run's artifacts |
| `staging` | staging | grail staging | `com.grailnotebook.desktop.staging` | the run's artifacts |
| `main` | prod | grail | `com.grailnotebook.desktop` | the run's artifacts **and the [Releases page](https://github.com/MPKoutsoukos/grail-desktop/releases)** |

Each environment installs as its own app, so they can sit side by side. Non-prod builds show their environment
beside the name.

[The pipeline](.github/workflows/desktop.yml) type-checks and lints, then builds on Windows (`.exe` installer and
`.msi`) and Linux (`.deb` and `.AppImage`). It runs on every push to the four branches, including the ones the
Android pipeline makes.

## Build it yourself

Node 24 and Rust (stable), plus on Linux `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev` and
`patchelf`.

```sh
git clone --recurse-submodules https://github.com/MPKoutsoukos/grail-desktop.git
cd grail-desktop
npm ci
npm run dev            # the web UI in a browser (link previews need the desktop app)
npx tauri dev          # the desktop app, live
npx tauri build        # installers in src-tauri/target/release/bundle
```

`APP_ENV=dev` (or `qa`, `staging`) before building names the app for that environment.

## In this repo

```
src/                the app (React + Vite): screens, editor, drawing canvas, Read layouts
src/linkpreview.tsx link previews, fetched through Tauri's HTTP client when asked for
src/components/About.tsx  the About and Licences pages
src-tauri/          the native shell (Tauri 2): window, file access, dialogs, HTTP, opening links
grail/              the grail repo (submodule): the shared core
mirror.json         the version and build this mirrors (written by the grail pipeline)
scripts/licences.mjs  refreshes src/licences.ts after a dependency change
```

## Built with

Tauri, React, Vite, Tailwind, Konva, react-markdown, Lucide icons, and the Newsreader, Inter and JetBrains Mono
fonts. Every licence is listed in the app under Settings → About grail → Licences.
