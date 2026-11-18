# grail desktop

**grail for Windows and Linux: quiet, local-first notes that gather into one continuous read.**

This is the desktop twin of the Android app in [grail](https://github.com/MPKoutsoukos/grail). It mirrors the
APK: the same features, the same notes format, and for every APK built, a desktop build with the same version,
build number and environment.

Website: **https://grailnotebook.com**

**Download:** the latest version is on the [Releases page](https://github.com/MPKoutsoukos/grail-desktop/releases/latest):
the Windows installer (`-windows-setup.exe`, or the `.msi`) and Linux packages (`.deb`, `.AppImage`).
A listing in winget, Windows' package manager (`winget install grail`), is awaiting review.

The Windows installer isn't code-signed yet, so Windows may say "Windows protected your PC" because it doesn't
know grail yet: click **More info**, then **Run anyway**.

## What it does

The same as the phone: Browse with search and Echoes, Read (your fragments as one continuous text, in four
layouts), Tags with queries and saved views, drawings, pictures, tables, five themes, link previews when you ask
for them, and Settings → About grail with the story, privacy, contact and licences.

- **First start**: a five-step illustrated tour, then the home folder (below). Settings → Show the tour plays it again.
- **Writing**: notes save as you type; **Save** (Ctrl+S or Ctrl+Enter) saves and closes.
- **Shaping the read**: right-click a fragment (or press and hold) to edit it, move it up or down, take it out of
  the read, or delete it.
- **Nothing is lost**: deleting moves a note to `#deleted`, hidden everywhere until a search asks for `#deleted`.
  Take the tag out of its text to bring it back; delete it again from there to remove the file for good.

On the desktop, your notes are plain `.md` files in a **home folder**. The first start shows a short tour, then
asks which folder: the default (`Documents\grail`, created if needed) or one you pick, new or one that already
has notes, and then says which folder is in use. Settings → Home folder always shows its full path and changes
it (optionally copying your notes across). Put the folder inside OneDrive, Dropbox or Google Drive for desktop
and that app keeps a copy online. grail itself doesn't sync between devices.

grail grew out of the "grail method": one notebook for every idea, kept messy, and read back often. It was
inspired by [a video by Perry Daniels](https://www.youtube.com/watch?v=_QVYfPnNOg4).

**Privacy:** notes stay in your home folder; the app goes online only for the link previews you ask for. Full
policy: https://grailnotebook.com/privacy/

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

Node 22 or newer and Rust (stable), plus on Linux `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev` and
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

## Licence

grail is free software: you can use, study, share and change it under the terms of the
[GNU General Public License, version 3](LICENSE) (GPL-3.0-only). If you share a changed version, it must stay
under the same licence, with its source available. It comes with no warranty.

© 2026 MPKoutsoukos. The copyright stays with its author, who may also offer grail under other terms.

- **The name and look:** "grail", its wordmark and icons are not covered by the GPL; see [TRADEMARKS.md](TRADEMARKS.md).
  Forks are welcome under their own name.
- **Contributing:** see [CONTRIBUTING.md](CONTRIBUTING.md).
- **Security:** see [SECURITY.md](SECURITY.md).
- **Libraries and fonts** keep their own licences (MIT, ISC, SIL OFL); every one is listed in the app.
