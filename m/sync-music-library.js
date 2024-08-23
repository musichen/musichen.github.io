const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const TEMPLATE_FILE = path.join(ROOT_DIR, "templates", "artist", "index.html");
const LIBRARY_FILE = path.join(ROOT_DIR, "library.json");
const IGNORE_FILE = path.join(ROOT_DIR, "library-ignore.json");

function main() {
  const ignored = loadIgnoreList();
  const artistDirs = findArtistDirectories(ignored);

  if (!artistDirs.length) {
    console.log("No artist folders found.");
    writeJSON(LIBRARY_FILE, []);
    return;
  }

  const library = artistDirs.map((dirPath) => syncArtistDirectory(dirPath));
  writeJSON(LIBRARY_FILE, library);

  console.log(`Synced ${library.length} artist folder${library.length === 1 ? "" : "s"}.`);
  library.forEach((item) => {
    console.log(`- ${item.slug}: ${item.title}`);
  });
}

function loadIgnoreList() {
  const ignoreList = readJSON(IGNORE_FILE);
  return new Set(Array.isArray(ignoreList) ? ignoreList : []);
}

function findArtistDirectories(ignored) {
  return fs.readdirSync(ROOT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("."))
    .filter((name) => !["shared", "templates"].includes(name))
    .filter((name) => !ignored.has(name))
    .map((name) => path.join(ROOT_DIR, name))
    .filter((dirPath) => fs.existsSync(path.join(dirPath, "songs")) && fs.statSync(path.join(dirPath, "songs")).isDirectory())
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

function syncArtistDirectory(dirPath) {
  const slug = path.basename(dirPath);
  const titleDefault = humanize(slug);

  ensureDirectory(path.join(dirPath, "images"));
  ensureDirectory(path.join(dirPath, "songs"));
  ensureDirectory(path.join(dirPath, "lyrics"));

  const playerConfigPath = path.join(dirPath, "player.json");
  const existingPlayerConfig = readJSON(playerConfigPath) || {};
  const playerConfig = {
    slug,
    title: existingPlayerConfig.title || titleDefault,
    artist: existingPlayerConfig.artist || existingPlayerConfig.title || titleDefault
  };
  writeJSON(playerConfigPath, playerConfig);

  ensureArtistTemplate(dirPath);
  const placeholderCover = ensureArtistPlaceholderCover(dirPath, playerConfig);
  const tracks = generateSongsIndex(dirPath, playerConfig, placeholderCover);

  return {
    slug,
    title: playerConfig.title,
    artist: playerConfig.artist,
    page: `${slug}/`,
    tracks: tracks.length
  };
}

function ensureArtistTemplate(dirPath) {
  const artistIndexPath = path.join(dirPath, "index.html");
  if (!fs.existsSync(artistIndexPath)) {
    fs.copyFileSync(TEMPLATE_FILE, artistIndexPath);
    console.log(`Created player template: ${path.relative(ROOT_DIR, artistIndexPath)}`);
  }
}

function ensureArtistPlaceholderCover(dirPath, playerConfig) {
  const fileName = `${playerConfig.slug}-default-cover.svg`;
  const relativePath = path.posix.join("images", fileName);
  const filePath = path.join(dirPath, relativePath);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buildArtistPlaceholderSvg(playerConfig), "utf8");
  }

  return relativePath;
}

function generateSongsIndex(dirPath, playerConfig, placeholderCover) {
  const songsDir = path.join(dirPath, "songs");
  const imagesDir = path.join(dirPath, "images");
  const lyricsDir = path.join(dirPath, "lyrics");
  const mp3Files = fs.readdirSync(songsDir)
    .filter((name) => /\.mp3$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  const existingIndex = normalizeManifest(readJSON(path.join(songsDir, "index.json")) || []);
  const existingManifest = normalizeManifest(readJSON(path.join(songsDir, "manifest.json")) || []);
  const metadataByFile = new Map([...existingManifest, ...existingIndex].map((entry) => [entry.file, entry]));

  const nextIndex = mp3Files.map((file) => {
    const existing = metadataByFile.get(file) || {};
    const autoCoverImage = detectCoverImage(imagesDir, file, playerConfig) || placeholderCover;
    const autoLyrics = detectLyricsFile(lyricsDir, file);

    return {
      file,
      title: existing.title || humanize(file.replace(/\.[^.]+$/, "")),
      artist: existing.artist || playerConfig.artist,
      "cover-image": preservePathIfExists(dirPath, existing["cover-image"]) || autoCoverImage,
      lyrics: preservePathIfExists(dirPath, existing.lyrics) || autoLyrics
    };
  });

  writeJSON(path.join(songsDir, "index.json"), nextIndex);
  return nextIndex;
}

function normalizeManifest(entries) {
  return entries
    .map((entry) => {
      if (typeof entry === "string") {
        return { file: entry };
      }

      if (!entry || typeof entry !== "object") {
        return null;
      }

      const file = entry.file || entry.src;
      if (!file) {
        return null;
      }

      return {
        file,
        title: entry.title || entry.name,
        artist: entry.artist,
        "cover-image": entry["cover-image"] || entry.coverImage || null,
        lyrics: entry.lyrics || null
      };
    })
    .filter(Boolean);
}

function detectCoverImage(imagesDir, file, playerConfig) {
  const baseName = file.replace(/\.[^.]+$/, "");
  const candidates = [
    ...buildImageCandidates(baseName),
    ...buildImageCandidates(playerConfig.slug),
    ...buildImageCandidates(playerConfig.title),
    ...buildImageCandidates(playerConfig.artist)
  ];

  const match = candidates.find((relativePath) => fs.existsSync(path.join(imagesDir, path.basename(relativePath))));
  return match || null;
}

function detectLyricsFile(lyricsDir, file) {
  if (!fs.existsSync(lyricsDir) || !fs.statSync(lyricsDir).isDirectory()) {
    return null;
  }

  const baseName = file.replace(/\.[^.]+$/, "");
  const fileNames = [`${baseName}.md`, `${file}.md`];
  const match = fileNames.find((name) => fs.existsSync(path.join(lyricsDir, name)));
  return match ? `lyrics/${match}` : null;
}

function buildImageCandidates(value) {
  return nameVariants(value).flatMap((name) => [
    `images/${name}.jpg`,
    `images/${name}.jpeg`,
    `images/${name}.png`,
    `images/${name}.webp`,
    `images/${name}.gif`
  ]);
}

function preservePathIfExists(dirPath, relativePath) {
  if (!relativePath) {
    return null;
  }

  return fs.existsSync(path.join(dirPath, relativePath)) ? relativePath : null;
}

function buildArtistPlaceholderSvg(playerConfig) {
  const title = escapeXml(playerConfig.title || playerConfig.slug || "Artist");
  const subtitle = escapeXml(playerConfig.artist || playerConfig.title || "Music Player");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" role="img" aria-labelledby="title desc">
  <title id="title">${title} default cover</title>
  <desc id="desc">Auto-generated placeholder cover for ${title}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="100%" stop-color="#18233f"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#ff4d6d"/>
      <stop offset="100%" stop-color="#6aa4ff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" rx="120" fill="url(#bg)"/>
  <circle cx="600" cy="520" r="285" fill="url(#ring)" opacity="0.96"/>
  <circle cx="600" cy="520" r="150" fill="#0b1020"/>
  <circle cx="600" cy="520" r="42" fill="#f8fafc"/>
  <text x="600" y="930" fill="#f8fafc" font-size="92" font-family="Arial, sans-serif" text-anchor="middle">${title}</text>
  <text x="600" y="1010" fill="#b8c2d8" font-size="42" font-family="Arial, sans-serif" text-anchor="middle">${subtitle}</text>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function nameVariants(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return [];
  }

  const kebab = raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const compact = raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

  return [...new Set([raw, raw.toLowerCase(), raw.replace(/\s+/g, ""), raw.replace(/\s+/g, "-").toLowerCase(), kebab, compact].filter(Boolean))];
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${path.relative(ROOT_DIR, filePath)}: ${error.message}`);
  }
}

function writeJSON(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function humanize(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  findArtistDirectories,
  syncArtistDirectory,
  generateSongsIndex,
  humanize
};
