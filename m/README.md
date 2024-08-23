# Music Hub in `/m`

This folder contains a self-contained music hub and artist player system.

It uses only:
- HTML
- CSS
- JavaScript
- native Node.js built-in libraries

It does **not** require npm packages or `node_modules` for the music sync / artist create scripts.

---

## Core files

### Main hub
- `m/index.html` — main multi-artist player
- `m/app.js` — main hub player logic
- `m/styles.css` — main hub styles
- `m/library.json` — auto-generated list of artist folders
- `m/default-cover.svg` — fallback cover image

### Shared artist player
- `m/templates/artist/index.html` — reusable artist player template
- `m/shared/artist-player.js` — shared JS for artist pages
- `m/shared/artist-player.css` — shared CSS for artist pages

### Automation scripts
- `m/sync-music-library.js` — scans artist folders and regenerates manifests/library
- `m/create-artist.js` — creates a new artist folder scaffold
- `m/library-ignore.json` — folders skipped during sync

---

## Folder structure

Example:

```text
m/
  index.html
  library.json
  sync-music-library.js
  create-artist.js
  metallica/
    index.html
    player.json
    songs/
      one.mp3
      two.mp3
      index.json
    images/
      one.jpg
      two.jpg
```

---

## Rules

### Artist folders live directly inside `/m`
Examples:
- `m/sum41`
- `m/linkin`
- `m/metallica`

### Songs go into `songs/`
Example:
- `m/metallica/songs/one.mp3`

### Optional lyrics go into `lyrics/`
Examples:
- `m/metallica/lyrics/one.md`
- `m/metallica/lyrics/01. Intro.md`

The player looks for markdown lyrics files matching the song filename without extension first, and also supports `<full-filename>.md`.

### Covers must match song filename
If song is:
- `songs/jackson.mp3`

then preferred cover is:
- `images/jackson.jpg`

If that song-specific cover is missing, the players try artist-level default cover next, for example:
- `images/sum41.jpg`

If that is also missing, sync auto-generates an artist placeholder cover such as:
- `images/sum41-default-cover.svg`

If needed, the players can still fall back to the global fallback cover.

Supported cover extensions checked by the players:
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`

Preferred format: `.jpg`

### After adding or changing songs, run sync
From project root:

```bash
node m/sync-music-library.js
```

Or if you are already inside `/m`:

```bash
node sync-music-library.js
```

---

## Commands

## From project root

### Sync all artist folders
```bash
node m/sync-music-library.js
```

### Create a new artist folder
```bash
node m/create-artist.js metallica "Metallica"
```

### Friendly alias for create artist
```bash
node m/new-artist.js metallica "Metallica"
```

---

## From inside `/m`

```bash
cd m
```

### Sync all artist folders
```bash
node sync-music-library.js
```

### Create a new artist folder
```bash
node create-artist.js metallica "Metallica"
```

### Friendly alias for create artist
```bash
node new-artist.js metallica "Metallica"
```

---

## What `create-artist.js` does

Example:

```bash
node m/create-artist.js metallica "Metallica"
```

This creates:
- `m/metallica/`
- `m/metallica/index.html`
- `m/metallica/player.json`
- `m/metallica/songs/`
- `m/metallica/images/`

Then add:
- mp3 files into `m/metallica/songs/`
- matching cover images into `m/metallica/images/`

Then run:

```bash
node m/sync-music-library.js
```

---

## What `sync-music-library.js` does

Running:

```bash
node m/sync-music-library.js
```

will:

1. scan folders inside `/m`
2. find artist folders that contain `songs/`
3. skip folders listed in `m/library-ignore.json`
4. create missing `player.json`
5. create missing artist `index.html` from the reusable template
6. scan `.mp3` files in each `songs/` folder
7. generate or update each `songs/index.json`
8. regenerate `m/library.json`

---

## Artist metadata

Each artist folder may contain:
- `player.json`

Example:

```json
{
  "slug": "metallica",
  "title": "Metallica",
  "artist": "Metallica"
}
```

- `title` is used for page title / playlist title
- `artist` is used as default track artist

If `player.json` is missing, sync creates it automatically.

---

## Song metadata

Each artist folder gets:
- `songs/index.json`

Example:

```json
[
  {
    "file": "one.mp3",
    "title": "One",
    "artist": "Metallica",
    "cover-image": "images/one.jpg",
    "lyrics": "lyrics/one.md"
  },
  {
    "file": "nothing-else-matters.mp3",
    "title": "Nothing Else Matters",
    "artist": "Metallica",
    "cover-image": "images/metallica.jpg",
    "lyrics": null
  }
]
```

If metadata already exists, sync tries to preserve it.
If metadata is missing, it is generated from file names.

---

## Main hub player

Open:
- `/m/`

It loads all artists from:
- `m/library.json`

Features:
- one main player for all artist folders
- grouped multi-level playlist
- artist sections with songs below
- simple song search
- lyrics indicator icon when lyrics exist
- clickable lyrics badges in playlist rows
- lyrics panel for markdown lyrics files
- better verse / chorus markdown formatting
- next / previous across full library
- loop all / loop one / shuffle
- mobile-friendly controls
- touch-friendly seeking and volume
- matching song cover loading
- open artist page link
- Media Session support where available

---

## Artist player pages

Each artist can also have its own page, for example:
- `/m/sum41/`
- `/m/linkin/`
- `/m/metallica/`

If an artist page does not exist yet, sync creates it from the shared template.

If an artist already has a custom `index.html`, sync does **not** overwrite it.

---

## Ignoring folders

Ignored folders are listed in:
- `m/library-ignore.json`

Example:

```json
[
  "ztestlist",
  "ztestplayerv2",
  "ztestplayerv3"
]
```

---

## Local testing

From project root:

```bash
serve .
```

Then open:
- `http://localhost:3000/m/`
- `http://localhost:3000/m/sum41/`
- `http://localhost:3000/m/linkin/`

---

## Recommended workflow

### Add a new band / artist
1. Create artist scaffold:
   ```bash
   node m/new-artist.js artist-slug "Artist Name"
   ```
2. Put mp3 files into:
   - `m/artist-slug/songs/`
3. Put matching covers into:
   - `m/artist-slug/images/`
4. Optionally put lyrics markdown into:
   - `m/artist-slug/lyrics/`
5. Sync everything:
   ```bash
   node m/sync-music-library.js
   ```
5. Open:
   - `/m/`
   - `/m/artist-slug/`

### Add songs to existing artist
1. Copy new `.mp3` files into `songs/`
2. Add matching covers into `images/`
3. Optionally add matching lyrics `.md` files into `lyrics/`
4. Run:
   ```bash
   node m/sync-music-library.js
   ```

---

## Important note about your earlier npm error

If you are already inside `/m`, do **not** run:

```bash
npm --prefix m run ...
```

because that points npm to `/m/m/package.json`.

Inside `/m`, use direct Node commands instead:

```bash
node sync-music-library.js
node create-artist.js metallica "Metallica"
```

From project root, use:

```bash
node m/sync-music-library.js
node m/create-artist.js metallica "Metallica"
# or
node m/new-artist.js metallica "Metallica"
```

---

## Notes

- Scripts are self-contained and use native Node.js only.
- No external packages are required.
- `new-artist.js` is a small direct alias for `create-artist.js`.
- Static hosting works best when `songs/index.json` exists for every artist folder.
- The sync script is intended to generate and maintain those files automatically.
