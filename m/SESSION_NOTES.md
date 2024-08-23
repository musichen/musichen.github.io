# Session Notes — Music Hub in `/m`

Date: 2026-04-03

## Goal
Build a self-contained music hub under `/m` that:
- aggregates songs from artist folders like `/m/sum41`, `/m/linkin`
- keeps each artist able to have its own player page
- uses only static files + native Node.js scripts
- requires no npm packages / no external dependencies for sync/create scripts

---

## Main result
Implemented a multi-artist hub player at:
- `m/index.html`

Implemented reusable artist player system for folders inside `/m`.

Implemented direct Node scripts:
- `node m/sync-music-library.js`
- `node m/create-artist.js <slug> "Artist Name"`
- `node m/new-artist.js <slug> "Artist Name"`

No npm is required.

---

## Important usage

### From project root
```bash
node m/sync-music-library.js
node m/create-artist.js metallica "Metallica"
node m/new-artist.js metallica "Metallica"
```

### From inside `/m`
```bash
node sync-music-library.js
node create-artist.js metallica "Metallica"
node new-artist.js metallica "Metallica"
```

---

## Implemented features

### Main hub `/m/`
- combined library from artist folders
- grouped playlist by artist / collection
- next/prev across full combined library
- loop all / loop one / shuffle
- search songs by title / artist / collection
- lyrics button in player
- lyrics badges in playlist rows
- clicking lyrics badge opens lyrics directly
- clicking lyrics badge does **not** interrupt current playback
- mobile + desktop responsive layout
- touch-friendly controls
- Media Session support where available

### Artist player pages
- shared reusable artist player template
- scrollable playlist area
- search inside artist playlist
- lyrics button + lyrics badge support
- markdown lyrics rendering

### Sync script
- scans artist folders in `/m`
- finds folders with `songs/`
- skips ignored folders from `m/library-ignore.json`
- creates missing `player.json`
- creates missing artist `index.html` from template
- creates missing `lyrics/` folder
- generates / updates `songs/index.json`
- regenerates `m/library.json`

---

## Song metadata format
Each `songs/index.json` entry now supports:

```json
{
  "file": "03. What I Believe.mp3",
  "title": "03. What I Believe",
  "artist": "Sum41",
  "cover-image": "images/sum41.jpg",
  "lyrics": "lyrics/03. What I Believe.md"
}
```

Fields:
- `file`
- `title`
- `artist`
- `cover-image`
- `lyrics`

---

## Cover logic
Cover fallback order:

1. explicit `cover-image` from `songs/index.json` if valid
2. song-specific image like `images/songname.jpg`
3. artist image like `images/sum41.jpg`
4. auto-generated artist placeholder like `images/sum41-default-cover.svg`
5. global fallback default cover

### Auto-generated placeholder covers
Sync now auto-generates placeholder SVG covers if no artist image exists.
Examples:
- `m/sum41/images/sum41-default-cover.svg`
- `m/linkin/images/linkin-default-cover.svg`

---

## Lyrics logic
Lyrics are detected from markdown files in `lyrics/`.

Examples:
- `songs/one.mp3` -> `lyrics/one.md`
- `songs/03. What I Believe.mp3` -> `lyrics/03. What I Believe.md`

Supported in players:
- lyrics icon shown when available
- lyrics panel loads file on demand
- lyrics cached after first load
- lyrics badges in playlist rows open lyrics directly

### Markdown rendering supports
- headings
- lists
- bold
- italic
- inline code
- links
- section labels like:
  - `[Verse 1]`
  - `[Chorus]`
  - `Verse 1:`
  - `Bridge`
  - `Intro`
  - `Outro`
  - `Hook`
  - `Refrain`

---

## Artist creation workflow
To add a new artist:

```bash
node m/new-artist.js artist-slug "Artist Name"
```

This creates:
- `m/artist-slug/`
- `m/artist-slug/index.html`
- `m/artist-slug/player.json`
- `m/artist-slug/songs/`
- `m/artist-slug/images/`
- `m/artist-slug/lyrics/`

Then:
1. add mp3 files into `songs/`
2. add matching covers into `images/`
3. optionally add lyrics `.md` files into `lyrics/`
4. run:
   ```bash
   node m/sync-music-library.js
   ```

---

## Current key files

### Docs
- `m/README.md`
- `m/README.music.md`
- `m/SESSION_NOTES.md`

### Main hub
- `m/index.html`
- `m/app.js`
- `m/styles.css`
- `m/library.json`
- `m/default-cover.svg`

### Scripts
- `m/sync-music-library.js`
- `m/create-artist.js`
- `m/new-artist.js`
- `m/library-ignore.json`

### Shared artist player
- `m/templates/artist/index.html`
- `m/shared/artist-player.js`
- `m/shared/artist-player.css`

### Artist examples
- `m/sum41/`
- `m/linkin/`

---

## Folder ignore list
Ignored folders currently:
- `ztestlist`
- `ztestplayerv2`
- `ztestplayerv3`

Configured in:
- `m/library-ignore.json`

---

## Bugs fixed during session
- `/m/sum41` loading issue resolved
- npm/path confusion removed by switching to direct Node usage only
- cover fallback improved to artist-level cover
- lyrics badge previously interrupted playback; fixed so it no longer changes or stops current audio

---

## Recommended next improvements
Possible future tasks:
- highlight the playlist song whose lyrics are currently open
- prev/next song navigation inside lyrics panel
- collapsible artist sections in main hub
- better markdown / chord / stanza formatting
- song count per filtered result
- optional extraction of ID3 metadata using built-in Node parsing only

---

## Local testing
From project root:
```bash
serve .
```

Open:
- `http://localhost:3000/m/`
- `http://localhost:3000/m/sum41/`
- `http://localhost:3000/m/linkin/`

---

## Best way to preserve this session
Commit current state to git:

```bash
git add m
git commit -m "Add music hub, artist sync, lyrics, search, cover fallbacks"
```
