const fs = require("fs");
const path = require("path");
const { humanize, syncArtistDirectory } = require("./sync-music-library");

const ROOT_DIR = __dirname;

function main() {
  const slug = process.argv[2];
  const titleArg = process.argv[3];
  const artistArg = process.argv[4];

  if (!slug) {
    console.error("Usage: node create-artist.js <slug> [title] [artist]");
    process.exit(1);
  }

  const safeSlug = slug.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(safeSlug)) {
    console.error("Slug may contain only letters, numbers, dash and underscore.");
    process.exit(1);
  }

  const artistDir = path.join(ROOT_DIR, safeSlug);
  const songsDir = path.join(artistDir, "songs");
  const imagesDir = path.join(artistDir, "images");
  const lyricsDir = path.join(artistDir, "lyrics");
  const playerConfigPath = path.join(artistDir, "player.json");

  fs.mkdirSync(songsDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(lyricsDir, { recursive: true });

  const title = titleArg || humanize(safeSlug);
  const artist = artistArg || title;

  if (!fs.existsSync(playerConfigPath)) {
    fs.writeFileSync(playerConfigPath, `${JSON.stringify({ slug: safeSlug, title, artist }, null, 2)}\n`, "utf8");
  }

  syncArtistDirectory(artistDir);

  console.log(`Artist folder ready: m/${safeSlug}`);
  console.log(`- put mp3 files into m/${safeSlug}/songs/`);
  console.log(`- put matching covers into m/${safeSlug}/images/`);
  console.log(`- put lyrics markdown into m/${safeSlug}/lyrics/`);
  console.log(`- run: node m/sync-music-library.js`);
}

main();
