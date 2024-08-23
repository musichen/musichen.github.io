# Music hub scripts

These scripts are self-contained and use only native Node.js built-in libraries.

No npm usage is required.
No external dependencies are required.

## Use from project root

### Sync all artist folders
```bash
node m/sync-music-library.js
```

### Create a new artist folder
```bash
node m/create-artist.js metallica "Metallica"
```

### Friendly alias
```bash
node m/new-artist.js metallica "Metallica"
```

## Use from inside `/m`

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

### Friendly alias
```bash
node new-artist.js metallica "Metallica"
```

## What sync does

`sync-music-library.js` will:

1. scan artist folders in `/m`
2. create missing `player.json`
3. create missing artist `index.html` from the reusable template
4. detect matching cover images and add `cover-image`
5. detect matching lyrics markdown files and add `lyrics`
6. generate/update each `songs/index.json`
7. regenerate `/m/library.json`

## Ignore folders

Edit:
- `m/library-ignore.json`

Any folder listed there will be skipped by the sync script.

## Cover fallback order

For a song like `songs/name.mp3`, the players try covers in this order:

1. `cover-image` from `songs/index.json` if present and found
2. `images/name.jpg` and other supported extensions
3. artist-level image such as `images/sum41.jpg`
4. auto-generated artist placeholder such as `images/sum41-default-cover.svg`
5. global fallback default cover

## Lyrics support

If a matching markdown file exists in `lyrics/`, sync writes a `lyrics` field into `songs/index.json`.

Examples:
- `songs/one.mp3` -> `lyrics/one.md`
- `songs/03. What I Believe.mp3` -> `lyrics/03. What I Believe.md`

Players show a lyrics icon when lyrics are available, and open a lyrics panel on click.
Playlist lyrics badges open lyrics directly without changing playback.
Markdown lyrics also support better verse / chorus section formatting.
