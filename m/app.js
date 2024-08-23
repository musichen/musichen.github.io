const audio = document.getElementById("audio");
const coverImage = document.getElementById("coverImage");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const collectionName = document.getElementById("collectionName");
const artistPageLink = document.getElementById("artistPageLink");
const lyricsButton = document.getElementById("lyricsButton");
const lyricsPanel = document.getElementById("lyricsPanel");
const lyricsTitle = document.getElementById("lyricsTitle");
const lyricsContent = document.getElementById("lyricsContent");
const lyricsClose = document.getElementById("lyricsClose");
const searchInput = document.getElementById("searchInput");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const seekBar = document.getElementById("seekBar");
const volumeBar = document.getElementById("volumeBar");
const playButton = document.getElementById("playButton");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const modeButton = document.getElementById("modeButton");
const libraryToggle = document.getElementById("libraryToggle");
const libraryPanel = document.getElementById("libraryPanel");
const libraryList = document.getElementById("libraryList");
const artistCount = document.getElementById("artistCount");
const songCount = document.getElementById("songCount");
const statusText = document.getElementById("statusText");

const SETTINGS_KEY = "music-hub-settings";
const DEFAULT_COVER = "default-cover.svg";
const COVER_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const PLAYBACK_MODES = [
  { key: "all", label: "Loop all" },
  { key: "one", label: "Loop one" },
  { key: "shuffle", label: "Shuffle" }
];

const state = {
  collections: [],
  tracks: [],
  currentIndex: 0,
  lyricsTrackIndex: null,
  isSeeking: false,
  isPlaying: false,
  searchQuery: "",
  coverCache: new Map(),
  lyricsCache: new Map(),
  settings: loadSettings()
};

boot();

async function boot() {
  applySettings();
  bindEvents();
  updateModeButton();

  try {
    const library = await fetchJSON("library.json");
    const collections = await Promise.all(library.map(loadCollection));

    state.collections = collections.filter((collection) => collection.tracks.length > 0);
    state.tracks = state.collections.flatMap((collection) => collection.tracks);

    if (!state.tracks.length) {
      throw new Error("No songs were found. Add artist folders in /m and register them in /m/library.json.");
    }

    renderLibrary();
    artistCount.textContent = `${state.collections.length} artist${state.collections.length === 1 ? "" : "s"}`;
    songCount.textContent = `${state.tracks.length} song${state.tracks.length === 1 ? "" : "s"}`;
    await loadTrack(0, false);
    setStatus(`Ready. Loaded ${state.tracks.length} songs from ${state.collections.length} collections.`);
  } catch (error) {
    trackTitle.textContent = "Library not available";
    trackArtist.textContent = "Check /m/library.json and artist song folders.";
    setStatus(error.message || "Could not load the music hub.");
    console.error(error);
  }
}

function bindEvents() {
  playButton.addEventListener("click", togglePlayback);
  prevButton.addEventListener("click", () => stepTrack(-1));
  nextButton.addEventListener("click", () => stepTrack(1));
  modeButton.addEventListener("click", cyclePlaybackMode);
  lyricsButton.addEventListener("click", () => toggleLyricsPanel(state.currentIndex));
  lyricsClose.addEventListener("click", closeLyricsPanel);
  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value.trim().toLowerCase();
    applyLibraryFilter();
  });

  if (libraryToggle) {
    libraryToggle.addEventListener("click", () => {
      const collapsed = libraryPanel.classList.toggle("is-collapsed");
      libraryToggle.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  volumeBar.addEventListener("input", () => {
    audio.volume = Number(volumeBar.value);
    state.settings.volume = audio.volume;
    saveSettings();
  });

  seekBar.addEventListener("input", () => {
    state.isSeeking = true;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const nextTime = (Number(seekBar.value) / Number(seekBar.max)) * audio.duration;
    currentTimeEl.textContent = formatTime(nextTime);
  });

  const commitSeek = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      state.isSeeking = false;
      return;
    }

    const nextTime = (Number(seekBar.value) / Number(seekBar.max)) * audio.duration;
    audio.currentTime = nextTime;
    state.isSeeking = false;
  };

  seekBar.addEventListener("change", commitSeek);
  seekBar.addEventListener("pointerup", commitSeek);
  seekBar.addEventListener("touchend", commitSeek, { passive: true });

  audio.addEventListener("loadedmetadata", () => {
    totalTimeEl.textContent = formatTime(audio.duration);
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("timeupdate", () => {
    if (!state.isSeeking && Number.isFinite(audio.duration) && audio.duration > 0) {
      const progress = (audio.currentTime / audio.duration) * Number(seekBar.max);
      seekBar.value = String(Math.min(Number(seekBar.max), Math.max(0, progress)));
      currentTimeEl.textContent = formatTime(audio.currentTime);
      totalTimeEl.textContent = formatTime(audio.duration);
    }
  });

  audio.addEventListener("play", () => {
    state.isPlaying = true;
    playButton.textContent = "⏸";
    playButton.setAttribute("aria-label", "Pause");
    const track = state.tracks[state.currentIndex];
    setStatus(`Playing ${track?.title || "track"}`);
    updateMediaSession();
  });

  audio.addEventListener("pause", () => {
    state.isPlaying = false;
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", "Play");
    if (state.tracks.length) {
      setStatus(`Paused ${state.tracks[state.currentIndex]?.title || "track"}`);
    }
    updateMediaSession();
  });

  audio.addEventListener("ended", handleTrackEnd);
  audio.addEventListener("error", () => setStatus("This track could not be played."));

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea")) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    } else if (event.code === "ArrowRight") {
      event.preventDefault();
      stepTrack(1);
    } else if (event.code === "ArrowLeft") {
      event.preventDefault();
      stepTrack(-1);
    }
  });
}

async function loadCollection(entry) {
  const collection = {
    slug: entry.slug,
    title: entry.title || humanize(entry.slug),
    artist: entry.artist || entry.title || humanize(entry.slug),
    page: entry.page || "",
    tracks: []
  };

  const [manifestEntries, listedFiles] = await Promise.all([
    loadCollectionManifest(collection.slug),
    listAudioFiles(`${collection.slug}/songs/`)
  ]);

  const metadataByFile = new Map(manifestEntries.map((item) => [item.file, item]));
  const mergedFiles = listedFiles.length ? listedFiles : manifestEntries.map((item) => item.file).filter(Boolean);
  const finalEntries = mergedFiles.map((file) => ({ ...metadataByFile.get(file), file }));

  collection.tracks = finalEntries.map((trackEntry) => buildTrack(collection, trackEntry));
  return collection;
}

async function loadCollectionManifest(slug) {
  const indexManifest = await fetchJSON(`${slug}/songs/index.json`).catch(() => null);
  if (Array.isArray(indexManifest)) {
    return normalizeManifest(indexManifest);
  }

  const simpleManifest = await fetchJSON(`${slug}/songs/manifest.json`).catch(() => null);
  if (Array.isArray(simpleManifest)) {
    return normalizeManifest(simpleManifest);
  }

  return [];
}

function normalizeManifest(entries) {
  return entries
    .map((entry) => {
      if (typeof entry === "string") {
        return { file: entry };
      }

      const file = entry.file || entry.src;
      if (!file) {
        return null;
      }

      return {
        file,
        title: entry.title || entry.name,
        artist: entry.artist,
        coverImage: entry["cover-image"] || entry.coverImage || null,
        lyrics: entry.lyrics || null
      };
    })
    .filter(Boolean);
}

async function listAudioFiles(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    const parser = new DOMParser();
    const html = parser.parseFromString(text, "text/html");
    const hrefs = [...html.querySelectorAll("a[href]")].map((link) => decodeURIComponent(link.getAttribute("href") || ""));

    return [...new Set(
      hrefs
        .map((href) => href.replace(/^\.\//, ""))
        .filter((href) => /\.mp3$/i.test(href))
        .map((href) => href.split("/").pop())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function buildTrack(collection, entry) {
  const file = entry.file;
  const baseName = file.replace(/\.[^.]+$/, "");

  return {
    collectionSlug: collection.slug,
    collectionTitle: collection.title,
    collectionArtist: collection.artist,
    collectionPage: collection.page,
    file,
    baseName,
    title: entry.title || humanize(baseName),
    artist: entry.artist || collection.artist,
    audioSrc: `${collection.slug}/songs/${file}`,
    coverImage: resolveTrackAssetPath(collection.slug, entry.coverImage),
    lyricsSrc: resolveTrackAssetPath(collection.slug, entry.lyrics),
    coverCandidates: buildCoverCandidates(`${collection.slug}/images`, baseName, [collection.slug, collection.title, collection.artist])
  };
}

function renderLibrary() {
  libraryList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.collections.forEach((collection) => {
    const collectionCard = document.createElement("section");
    collectionCard.className = "collection-card";

    const top = document.createElement("div");
    top.className = "collection-top";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "collection-title";
    title.textContent = collection.title;

    const subtitle = document.createElement("p");
    subtitle.className = "collection-subtitle";
    subtitle.textContent = `${collection.tracks.length} song${collection.tracks.length === 1 ? "" : "s"}`;

    titleWrap.append(title, subtitle);

    const actions = document.createElement("div");
    actions.className = "collection-actions";

    if (collection.page) {
      const link = document.createElement("a");
      link.className = "collection-link";
      link.href = collection.page;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open page";
      actions.appendChild(link);
    }

    const playAll = document.createElement("button");
    playAll.type = "button";
    playAll.className = "collection-link";
    playAll.textContent = "Play collection";
    playAll.addEventListener("click", async () => {
      const firstTrack = state.tracks.findIndex((track) => track.collectionSlug === collection.slug);
      if (firstTrack >= 0) {
        await loadTrack(firstTrack, true);
      }
    });

    actions.appendChild(playAll);
    top.append(titleWrap, actions);

    const songList = document.createElement("ul");
    songList.className = "song-list";

    collection.tracks.forEach((track) => {
      const globalIndex = state.tracks.findIndex((item) => item.audioSrc === track.audioSrc);
      const item = document.createElement("li");
      item.className = "track-entry";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "track-button";
      button.dataset.index = String(globalIndex);
      button.dataset.search = `${track.title} ${track.artist} ${track.collectionTitle}`.toLowerCase();

      const line = document.createElement("span");
      line.className = "track-line";

      const name = document.createElement("span");
      name.className = "track-name";
      name.textContent = track.title;

      line.appendChild(name);

      if (track.lyricsSrc) {
        const badge = document.createElement("span");
        badge.className = "track-badge";
        badge.title = "Open lyrics";
        badge.setAttribute("role", "button");
        badge.setAttribute("tabindex", "0");
        badge.dataset.action = "lyrics";
        badge.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v13H8a3 3 0 0 0-3 3V5.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 8h7M8 11h7M8 14h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
        line.appendChild(badge);
      }

      const meta = document.createElement("span");
      meta.className = "track-meta";
      meta.textContent = track.artist;

      button.append(line, meta);
      button.addEventListener("click", (event) => {
        if (event.target.closest(".track-badge")) {
          event.preventDefault();
          openLyricsPanelForTrack(track, globalIndex);
          return;
        }
        loadTrack(globalIndex, true);
      });
      button.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target.closest(".track-badge")) {
          event.preventDefault();
          openLyricsPanelForTrack(track, globalIndex);
        }
      });
      item.appendChild(button);
      songList.appendChild(item);
    });

    collectionCard.append(top, songList);
    fragment.appendChild(collectionCard);
  });

  libraryList.appendChild(fragment);
  updateLibraryUI();
  applyLibraryFilter();
}

async function loadTrack(index, autoplay = false) {
  const track = state.tracks[index];
  if (!track) {
    return;
  }

  state.currentIndex = index;
  audio.src = track.audioSrc;
  audio.load();
  seekBar.value = "0";
  currentTimeEl.textContent = "0:00";
  totalTimeEl.textContent = "0:00";
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  collectionName.textContent = track.collectionTitle;
  updateLyricsAvailability(track);
  coverImage.src = await resolveCover(track);
  coverImage.alt = `${track.title} cover art`;
  updateArtistLink(track);
  updateLibraryUI();
  updateMediaSession();

  if (autoplay) {
    try {
      await audio.play();
    } catch (error) {
      setStatus("Tap play to start audio.");
      console.warn(error);
    }
  }
}

function updateArtistLink(track) {
  if (track.collectionPage) {
    artistPageLink.hidden = false;
    artistPageLink.href = track.collectionPage;
  } else {
    artistPageLink.hidden = true;
    artistPageLink.removeAttribute("href");
  }
}

function updateLyricsAvailability(track) {
  const hasLyrics = Boolean(track?.lyricsSrc);
  lyricsButton.hidden = !hasLyrics;

  if (!hasLyrics && state.lyricsTrackIndex === state.currentIndex) {
    closeLyricsPanel();
  } else if (!lyricsPanel.hidden && state.lyricsTrackIndex === state.currentIndex && hasLyrics) {
    openLyricsPanelForTrack(track, state.currentIndex);
  }
}

function updateLibraryUI() {
  const buttons = libraryList.querySelectorAll(".track-button");
  buttons.forEach((button) => {
    const isActive = Number(button.dataset.index) === state.currentIndex;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");

    if (isActive) {
      button.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}

function applyLibraryFilter() {
  const query = state.searchQuery;
  const collections = libraryList.querySelectorAll(".collection-card");

  collections.forEach((collectionCard) => {
    let visibleTracks = 0;
    collectionCard.querySelectorAll(".track-entry").forEach((entry) => {
      const button = entry.querySelector(".track-button");
      const matches = !query || button.dataset.search.includes(query);
      entry.classList.toggle("is-filtered", !matches);
      if (matches) {
        visibleTracks += 1;
      }
    });

    collectionCard.classList.toggle("is-filtered", visibleTracks === 0);
  });
}

async function resolveCover(track) {
  if (state.coverCache.has(track.audioSrc)) {
    return state.coverCache.get(track.audioSrc);
  }

  if (track.coverImage && await imageExists(track.coverImage)) {
    state.coverCache.set(track.audioSrc, track.coverImage);
    return track.coverImage;
  }

  for (const candidate of track.coverCandidates) {
    const exists = await imageExists(candidate);
    if (exists) {
      state.coverCache.set(track.audioSrc, candidate);
      return candidate;
    }
  }

  state.coverCache.set(track.audioSrc, DEFAULT_COVER);
  return DEFAULT_COVER;
}

function resolveTrackAssetPath(collectionSlug, value) {
  if (!value) {
    return null;
  }

  if (/^(https?:)?\//.test(value)) {
    return value;
  }

  return `${collectionSlug}/${String(value).replace(/^\.\//, "")}`;
}

function buildCoverCandidates(basePath, primaryName, artistNames = []) {
  const names = [primaryName, ...artistNames.flatMap(nameVariants)];
  return [...new Set(names.flatMap((name) => COVER_EXTENSIONS.map((ext) => `${basePath}/${name}.${ext}`)))];
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

function imageExists(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

function toggleLyricsPanel(trackIndex = state.currentIndex) {
  if (!lyricsPanel.hidden && state.lyricsTrackIndex === trackIndex) {
    closeLyricsPanel();
    return;
  }

  openLyricsPanelForTrack(state.tracks[trackIndex], trackIndex);
}

async function openLyricsPanelForTrack(track, trackIndex) {
  if (!track?.lyricsSrc) {
    return;
  }

  state.lyricsTrackIndex = trackIndex;
  lyricsPanel.hidden = false;
  lyricsTitle.textContent = `${track.title} — Lyrics`;
  lyricsContent.textContent = "Loading lyrics…";

  if (state.lyricsCache.has(track.lyricsSrc)) {
    lyricsContent.innerHTML = renderMarkdown(state.lyricsCache.get(track.lyricsSrc));
    return;
  }

  try {
    const response = await fetch(track.lyricsSrc);
    if (!response.ok) {
      throw new Error("Failed to load lyrics");
    }
    const text = await response.text();
    state.lyricsCache.set(track.lyricsSrc, text);
    lyricsContent.innerHTML = renderMarkdown(text);
  } catch {
    lyricsContent.textContent = "Lyrics could not be loaded.";
  }
}

function closeLyricsPanel() {
  lyricsPanel.hidden = true;
  state.lyricsTrackIndex = null;
}

async function togglePlayback() {
  if (!state.tracks.length) {
    return;
  }

  if (!audio.src) {
    await loadTrack(state.currentIndex, false);
  }

  if (audio.paused) {
    try {
      await audio.play();
    } catch (error) {
      setStatus("Playback was blocked. Tap again to start.");
      console.warn(error);
    }
  } else {
    audio.pause();
  }
}

async function stepTrack(direction) {
  if (!state.tracks.length) {
    return;
  }

  if (state.settings.mode === "shuffle" && state.tracks.length > 1) {
    let nextIndex = state.currentIndex;
    while (nextIndex === state.currentIndex) {
      nextIndex = Math.floor(Math.random() * state.tracks.length);
    }
    await loadTrack(nextIndex, true);
    return;
  }

  const nextIndex = (state.currentIndex + direction + state.tracks.length) % state.tracks.length;
  await loadTrack(nextIndex, true);
}

async function handleTrackEnd() {
  if (state.settings.mode === "one") {
    audio.currentTime = 0;
    await audio.play();
    return;
  }

  await stepTrack(1);
}

function cyclePlaybackMode() {
  const currentModeIndex = PLAYBACK_MODES.findIndex((mode) => mode.key === state.settings.mode);
  const nextMode = PLAYBACK_MODES[(currentModeIndex + 1) % PLAYBACK_MODES.length];
  state.settings.mode = nextMode.key;
  updateModeButton();
  saveSettings();
  setStatus(`Playback mode: ${nextMode.label}`);
}

function updateModeButton() {
  const mode = PLAYBACK_MODES.find((item) => item.key === state.settings.mode) || PLAYBACK_MODES[0];
  modeButton.textContent = mode.label;
}

function applySettings() {
  audio.volume = clamp(state.settings.volume ?? 0.9, 0, 1);
  volumeBar.value = String(audio.volume);

  if (!PLAYBACK_MODES.some((mode) => mode.key === state.settings.mode)) {
    state.settings.mode = "all";
  }

  const collapsed = window.matchMedia("(max-width: 640px)").matches;
  libraryPanel.classList.toggle("is-collapsed", collapsed);
  if (libraryToggle) {
    libraryToggle.setAttribute("aria-expanded", String(!collapsed));
  }
}

function updateMediaSession() {
  const track = state.tracks[state.currentIndex];
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined" || !track) {
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.collectionTitle,
    artwork: [
      {
        src: coverImage.src || DEFAULT_COVER,
        sizes: "512x512",
        type: (coverImage.src || "").endsWith(".svg") ? "image/svg+xml" : "image/jpeg"
      }
    ]
  });

  navigator.mediaSession.playbackState = state.isPlaying ? "playing" : "paused";

  const handlers = {
    play: () => togglePlayback(),
    pause: () => togglePlayback(),
    previoustrack: () => stepTrack(-1),
    nexttrack: () => stepTrack(1),
    seekto: (details) => {
      if (typeof details.seekTime === "number") {
        audio.currentTime = details.seekTime;
      }
    }
  };

  Object.entries(handlers).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Ignore unsupported actions.
    }
  });
}

async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function setStatus(message) {
  statusText.textContent = message;
}

function renderMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let inList = false;
  let paragraphLines = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }
    html.push(`<p>${paragraphLines.map(formatMarkdownInline).join("<br>")}</p>`);
    paragraphLines = [];
  };

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${formatMarkdownInline(heading[2])}</h${level}>`);
      continue;
    }

    const lyricsSection = trimmed.match(/^\[(.+)\]$/) || trimmed.match(/^(verse|chorus|bridge|intro|outro|pre-chorus|post-chorus|hook|refrain)(\s+\d+)?\s*:?$/i);
    if (lyricsSection) {
      flushParagraph();
      closeList();
      const label = Array.isArray(lyricsSection) && lyricsSection[1]
        ? trimmed.replace(/^\[|\]$/g, "")
        : trimmed;
      html.push(`<h4 class="lyrics-section">${formatMarkdownInline(label)}</h4>`);
      continue;
    }

    const listItem = trimmed.match(/^[-*]\s+(.*)$/);
    if (listItem) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${formatMarkdownInline(listItem[1])}</li>`);
      continue;
    }

    closeList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  closeList();
  return html.join("") || "<p>No lyrics available.</p>";
}

function formatMarkdownInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function humanize(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { volume: 0.9, mode: "all" };
  } catch {
    return { volume: 0.9, mode: "all" };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    // Ignore storage failures.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
