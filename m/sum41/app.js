const audio = document.getElementById("audio");
const coverImage = document.getElementById("coverImage");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const seekBar = document.getElementById("seekBar");
const volumeBar = document.getElementById("volumeBar");
const playButton = document.getElementById("playButton");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const modeButton = document.getElementById("modeButton");
const lyricsButton = document.getElementById("lyricsButton");
const lyricsPanel = document.getElementById("lyricsPanel");
const lyricsTitle = document.getElementById("lyricsTitle");
const lyricsContent = document.getElementById("lyricsContent");
const lyricsClose = document.getElementById("lyricsClose");
const searchInput = document.getElementById("searchInput");
const playlistToggle = document.getElementById("playlistToggle");
const playlistCard = document.getElementById("playlistCard");
const playlistEl = document.getElementById("playlist");
const statusText = document.getElementById("statusText");
const trackCount = document.getElementById("trackCount");

const SETTINGS_KEY = "sum41-player-settings";
const COVER_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const DEFAULT_COVER = "images/default-cover.svg";
const PLAYBACK_MODES = [
  { key: "all", label: "Loop all" },
  { key: "one", label: "Loop one" },
  { key: "shuffle", label: "Shuffle" }
];

const state = {
  tracks: [],
  currentIndex: 0,
  lyricsTrackIndex: null,
  isPlaying: false,
  isSeeking: false,
  searchQuery: "",
  coverCache: new Map(),
  lyricsCache: new Map(),
  settings: loadSettings()
};

boot();

async function boot() {
  applySettings();
  bindEvents();

  try {
    const tracks = await loadTracks();
    if (!tracks.length) {
      throw new Error("No audio files were found in songs/");
    }

    state.tracks = tracks;
    state.currentIndex = 0;
    renderPlaylist();
    updateModeButton();
    await loadTrack(state.currentIndex, false);
    setStatus(`Ready. ${tracks.length} track${tracks.length === 1 ? "" : "s"} loaded.`);
  } catch (error) {
    trackTitle.textContent = "No songs found";
    trackArtist.textContent = "Add .mp3 files inside m/sum41/songs";
    setStatus(error.message || "Could not load songs.");
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
    applyPlaylistFilter();
  });

  if (playlistToggle) {
    playlistToggle.addEventListener("click", () => {
      const collapsed = playlistCard.classList.toggle("is-collapsed");
      playlistToggle.setAttribute("aria-expanded", String(!collapsed));
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
  audio.addEventListener("error", () => {
    setStatus("This track could not be played.");
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input")) {
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

async function loadTracks() {
  const manifest = await fetchJSON("songs/index.json").catch(() => []);
  if (manifest.length) {
    return manifest.map((entry) => buildTrack(entry));
  }

  const listedFiles = await loadTrackFilesFromDirectory();
  return listedFiles.map((fileName) => buildTrack({ file: fileName }));
}

async function loadTrackFilesFromDirectory() {
  try {
    const response = await fetch("songs/");
    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    const parser = new DOMParser();
    const html = parser.parseFromString(text, "text/html");
    const hrefs = [...html.querySelectorAll("a[href]")].map((link) => decodeURIComponent(link.getAttribute("href") || ""));
    const files = hrefs
      .map((href) => href.replace(/^\.\//, ""))
      .filter((href) => /\.mp3$/i.test(href))
      .map((href) => href.split("/").pop())
      .filter(Boolean);

    return [...new Set(files)].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function buildTrack(entry) {
  const file = entry.file || entry.src;
  const baseName = file.replace(/\.[^.]+$/, "");
  return {
    file,
    baseName,
    title: entry.title || humanize(baseName),
    artist: entry.artist || "Unknown artist",
    audioSrc: `songs/${file}`,
    coverImage: resolveLocalAssetPath(entry["cover-image"] || entry.coverImage),
    lyricsSrc: resolveLocalAssetPath(entry.lyrics),
    coverCandidates: buildCoverCandidates("images", baseName, [folderName(), entry.artist])
  };
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
  updateLyricsAvailability(track);
  coverImage.src = await resolveCover(track);
  coverImage.alt = `${track.title} cover art`;
  updatePlaylistUI();
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

function resolveLocalAssetPath(value) {
  if (!value) {
    return null;
  }

  if (/^(https?:)?\//.test(value)) {
    return value;
  }

  return String(value).replace(/^\.\//, "");
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

function renderPlaylist() {
  playlistEl.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.tracks.forEach((track, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "track-item";
    button.dataset.index = String(index);
    button.dataset.search = `${track.title} ${track.artist}`.toLowerCase();

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

    const subtitle = document.createElement("span");
    subtitle.className = "track-subtitle";
    subtitle.textContent = track.artist;

    button.append(line, subtitle);
    button.addEventListener("click", (event) => {
      if (event.target.closest(".track-badge")) {
        event.preventDefault();
        openLyricsPanelForTrack(track, index);
        return;
      }
      loadTrack(index, true);
    });
    button.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.closest(".track-badge")) {
        event.preventDefault();
        openLyricsPanelForTrack(track, index);
      }
    });
    item.appendChild(button);
    fragment.appendChild(item);
  });

  playlistEl.appendChild(fragment);
  trackCount.textContent = `${state.tracks.length} track${state.tracks.length === 1 ? "" : "s"}`;
  updatePlaylistUI();
  applyPlaylistFilter();
}

function updatePlaylistUI() {
  const buttons = playlistEl.querySelectorAll(".track-item");
  buttons.forEach((button, index) => {
    const isActive = index === state.currentIndex;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");

    if (isActive) {
      button.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}

function applyPlaylistFilter() {
  const query = state.searchQuery;
  playlistEl.querySelectorAll(".track-item").forEach((button) => {
    const matches = !query || button.dataset.search.includes(query);
    button.classList.toggle("is-filtered", !matches);
  });
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
  const mode = PLAYBACK_MODES.find((entry) => entry.key === state.settings.mode) || PLAYBACK_MODES[0];
  modeButton.textContent = mode.label;
}

function applySettings() {
  audio.volume = clamp(state.settings.volume ?? 0.9, 0, 1);
  volumeBar.value = String(audio.volume);

  if (!PLAYBACK_MODES.some((mode) => mode.key === state.settings.mode)) {
    state.settings.mode = "all";
  }

  const collapsed = window.matchMedia("(max-width: 640px)").matches;
  playlistCard.classList.toggle("is-collapsed", collapsed);
  if (playlistToggle) {
    playlistToggle.setAttribute("aria-expanded", String(!collapsed));
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
    album: "Sum41 Player",
    artwork: [
      { src: coverImage.src || DEFAULT_COVER, sizes: "512x512", type: coverImage.src.endsWith(".svg") ? "image/svg+xml" : "image/jpeg" }
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
      // Ignore unsupported actions on older browsers.
    }
  });
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
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function folderName() {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "artist";
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
