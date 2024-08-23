const FALLBACK_TRACKS = [
    { file: "heatwaves.mp3", title: "Heat Waves", artist: "Glass Animals" },
    { file: "infinity.mp3", title: "Infinity", artist: "Jaymes Young" },
    { file: "nolie.mp3", title: "No Lie", artist: "Sean Paul & Dua Lipa" },
    { file: "perfect.mp3", title: "Perfect", artist: "Ed Sheeran" },
    { file: "run.mp3", title: "Run", artist: "Taylor Swift & Ed Sheeran" },
    { file: "sunflower.mp3", title: "Sunflower", artist: "Post Malone & Swae Lee" }
];

const DEFAULT_COVER = "./images/mp3.png";
const DEFAULT_COVER_URL = new URL(DEFAULT_COVER, window.location.href).href;
const COVER_EXTENSION = ".jpg";

const audio = document.getElementById("audio");
const coverImage = document.getElementById("cover-image");
const trackTitle = document.getElementById("track-title");
const trackArtist = document.getElementById("track-artist");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const seekBar = document.getElementById("seek-bar");
const playButton = document.getElementById("play-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const shuffleButton = document.getElementById("shuffle-button");
const repeatButton = document.getElementById("repeat-button");
const playlist = document.getElementById("playlist");
const trackCount = document.getElementById("track-count");
const libraryStatus = document.getElementById("library-status");

const state = {
    tracks: [],
    currentIndex: 0,
    shuffle: false,
    repeatMode: "all",
    isSeeking: false
};

function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) {
        return "0:00";
    }

    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function humanizeFileName(fileName) {
    return fileName
        .replace(/\.mp3$/i, "")
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function encodePathSegment(value) {
    return encodeURIComponent(value).replace(/%2F/g, "/");
}

function buildTrack(file, metadata) {
    const baseName = file.replace(/\.mp3$/i, "");

    return {
        file,
        baseName,
        title: metadata?.title || humanizeFileName(file),
        artist: metadata?.artist || "Local file"
    };
}

async function readManifestTracks() {
    try {
        const response = await fetch("./songs/manifest.json", { cache: "no-store" });
        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            return [];
        }

        return data.filter((file) => typeof file === "string" && /\.mp3$/i.test(file));
    } catch (_error) {
        return [];
    }
}

async function discoverTracksFromFolder() {
    try {
        const response = await fetch("./songs/", { cache: "no-store" });
        if (!response.ok) {
            return [];
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const files = new Set();
        const baseUrl = response.url.endsWith("/") ? response.url : `${response.url}/`;

        for (const link of doc.querySelectorAll("a[href]")) {
            const href = link.getAttribute("href");
            if (!href || href.startsWith("#") || href.startsWith("?")) {
                continue;
            }

            let filename = "";

            try {
                filename = decodeURIComponent(new URL(href, baseUrl).pathname.split("/").pop() || "");
            } catch (_error) {
                continue;
            }

            if (/\.mp3$/i.test(filename)) {
                files.add(filename);
            }
        }

        return [...files].sort((a, b) => a.localeCompare(b));
    } catch (_error) {
        return [];
    }
}

async function loadTracks() {
    const metadataByFile = new Map(FALLBACK_TRACKS.map((track) => [track.file, track]));
    const manifestFiles = await readManifestTracks();

    if (manifestFiles.length > 0) {
        libraryStatus.textContent = `Loaded ${manifestFiles.length} track${manifestFiles.length === 1 ? "" : "s"} from songs/manifest.json.`;
        return manifestFiles.map((file) => buildTrack(file, metadataByFile.get(file)));
    }

    const discoveredFiles = await discoverTracksFromFolder();

    if (discoveredFiles.length > 0) {
        libraryStatus.textContent = `Loaded ${discoveredFiles.length} track${discoveredFiles.length === 1 ? "" : "s"} from songs/.`;
        return discoveredFiles.map((file) => buildTrack(file, metadataByFile.get(file)));
    }

    libraryStatus.textContent = "Folder scan unavailable here, using bundled track list.";
    return FALLBACK_TRACKS.map((track) => buildTrack(track.file, track));
}

function getTrackAudioUrl(track) {
    return `./songs/${encodePathSegment(track.file)}`;
}

function getTrackCoverUrl(track) {
    return `./images/${encodePathSegment(track.baseName)}${COVER_EXTENSION}`;
}

function renderPlaylist() {
    playlist.innerHTML = "";
    trackCount.textContent = `${state.tracks.length} track${state.tracks.length === 1 ? "" : "s"}`;

    state.tracks.forEach((track, index) => {
        const item = document.createElement("li");
        item.className = "playlist-item";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "playlist-button";
        button.dataset.index = String(index);
        button.innerHTML = `
            <span class="playlist-title">${escapeHtml(track.title)}</span>
            <span class="playlist-subtitle">${escapeHtml(track.artist)}</span>
        `;

        item.appendChild(button);
        playlist.appendChild(item);
    });

    updatePlaylistState();
}

function updatePlaylistState() {
    playlist.querySelectorAll(".playlist-button").forEach((button) => {
        const isCurrent = Number(button.dataset.index) === state.currentIndex;
        button.classList.toggle("is-current", isCurrent);
        button.setAttribute("aria-current", isCurrent ? "true" : "false");
    });
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function updateProgress() {
    const duration = audio.duration || 0;
    const currentTime = audio.currentTime || 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!state.isSeeking) {
        seekBar.value = String(progress);
    }

    seekBar.style.setProperty("--progress", `${progress}%`);
    currentTimeEl.textContent = formatTime(currentTime);
    durationEl.textContent = formatTime(duration);
}

function updatePlayButton() {
    const isPlaying = !audio.paused;
    playButton.textContent = isPlaying ? "❚❚" : "▶";
    playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function updateModeButtons() {
    shuffleButton.classList.toggle("is-active", state.shuffle);
    shuffleButton.setAttribute("aria-pressed", String(state.shuffle));

    const repeatLabels = {
        all: "Repeat: All",
        one: "Repeat: One",
        off: "Repeat: Off"
    };

    repeatButton.textContent = repeatLabels[state.repeatMode];
    repeatButton.dataset.mode = state.repeatMode;
    repeatButton.classList.toggle("is-active", state.repeatMode !== "off");
}

function updateTrackUi(track) {
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    coverImage.src = getTrackCoverUrl(track);
    coverImage.alt = `${track.title} cover art`;
    updatePlaylistState();

    const activeButton = playlist.querySelector(`.playlist-button[data-index="${state.currentIndex}"]`);
    activeButton?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function loadTrack(index, options = {}) {
    if (state.tracks.length === 0) {
        return;
    }

    const normalizedIndex = (index + state.tracks.length) % state.tracks.length;
    state.currentIndex = normalizedIndex;

    const track = state.tracks[normalizedIndex];
    audio.src = getTrackAudioUrl(track);
    audio.load();
    updateTrackUi(track);
    updateProgress();

    if (options.autoplay) {
        audio.play().catch(() => {
            updatePlayButton();
        });
    } else {
        updatePlayButton();
    }
}

function togglePlay() {
    if (!audio.src) {
        loadTrack(state.currentIndex, { autoplay: true });
        return;
    }

    if (audio.paused) {
        audio.play().catch(() => {
            libraryStatus.textContent = "Playback was blocked until a user interaction.";
        });
        return;
    }

    audio.pause();
}

function playNext() {
    if (state.tracks.length === 0) {
        return;
    }

    if (state.shuffle && state.tracks.length > 1) {
        let nextIndex = state.currentIndex;
        while (nextIndex === state.currentIndex) {
            nextIndex = Math.floor(Math.random() * state.tracks.length);
        }
        loadTrack(nextIndex, { autoplay: true });
        return;
    }

    loadTrack(state.currentIndex + 1, { autoplay: true });
}

function playPrevious() {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        updateProgress();
        return;
    }

    loadTrack(state.currentIndex - 1, { autoplay: true });
}

function cycleRepeatMode() {
    const nextMode = {
        all: "one",
        one: "off",
        off: "all"
    };

    state.repeatMode = nextMode[state.repeatMode];
    updateModeButtons();
}

function handleTrackEnded() {
    if (state.repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {
            updatePlayButton();
        });
        return;
    }

    if (state.repeatMode === "off" && !state.shuffle && state.currentIndex === state.tracks.length - 1) {
        updatePlayButton();
        return;
    }

    playNext();
}

function setupEvents() {
    playButton.addEventListener("click", togglePlay);
    prevButton.addEventListener("click", playPrevious);
    nextButton.addEventListener("click", playNext);

    shuffleButton.addEventListener("click", () => {
        state.shuffle = !state.shuffle;
        updateModeButtons();
    });

    repeatButton.addEventListener("click", cycleRepeatMode);

    playlist.addEventListener("click", (event) => {
        const button = event.target.closest(".playlist-button");
        if (!button) {
            return;
        }

        loadTrack(Number(button.dataset.index), { autoplay: true });
    });

    coverImage.addEventListener("error", () => {
        if (coverImage.src !== DEFAULT_COVER_URL) {
            coverImage.src = DEFAULT_COVER;
        }
    });

    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("play", updatePlayButton);
    audio.addEventListener("pause", updatePlayButton);
    audio.addEventListener("ended", handleTrackEnded);

    const commitSeek = () => {
        state.isSeeking = false;
        const duration = audio.duration || 0;
        audio.currentTime = duration * (Number(seekBar.value) / 100);
        updateProgress();
    };

    seekBar.addEventListener("pointerdown", () => {
        state.isSeeking = true;
    });

    seekBar.addEventListener("pointerup", commitSeek);
    seekBar.addEventListener("change", commitSeek);
    seekBar.addEventListener("touchend", commitSeek, { passive: true });
    seekBar.addEventListener("mouseup", commitSeek);

    seekBar.addEventListener("input", () => {
        const progress = Number(seekBar.value);
        seekBar.style.setProperty("--progress", `${progress}%`);
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            currentTimeEl.textContent = formatTime(audio.duration * (progress / 100));
        }
    });
}

function setupParticles() {
    if (typeof window.particlesJS !== "function") {
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    window.particlesJS("particles-js", {
        particles: {
            number: {
                value: isMobile ? 16 : 28,
                density: {
                    enable: true,
                    value_area: 900
                }
            },
            color: {
                value: ["#23c483", "#47b7ff", "#ef476f"]
            },
            shape: {
                type: "circle"
            },
            opacity: {
                value: 0.35,
                random: true
            },
            size: {
                value: isMobile ? 2.5 : 3.5,
                random: true
            },
            line_linked: {
                enable: false
            },
            move: {
                enable: true,
                speed: isMobile ? 1 : 1.6,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out"
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: {
                    enable: !isMobile,
                    mode: "repulse"
                },
                onclick: {
                    enable: false
                },
                resize: true
            },
            modes: {
                repulse: {
                    distance: 80,
                    duration: 0.25
                }
            }
        },
        retina_detect: true
    });
}

async function init() {
    setupEvents();
    updateModeButtons();
    state.tracks = await loadTracks();

    if (state.tracks.length === 0) {
        trackTitle.textContent = "No tracks found";
        trackArtist.textContent = "Add MP3 files to songs/.";
        trackCount.textContent = "0 tracks";
        libraryStatus.textContent = "No playable files were found in songs/.";
        return;
    }

    renderPlaylist();
    loadTrack(0, { autoplay: false });
    setupParticles();
}

init();
