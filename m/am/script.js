/*
document.addEventListener("DOMContentLoaded", function () {
    const audio = document.getElementById("audio");
    const playPauseButton = document.getElementById("play-pause");
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const volumeControl = document.getElementById("volume");
    const trackSlider = document.getElementById("track-slider");
    const currentTimeDisplay = document.getElementById("current-time");
    const totalDurationDisplay = document.getElementById("total-duration");
    const ribbon = document.getElementById("ribbon");
    const trackNameDisplay = document.getElementById("track-name");
    const albumPhoto = document.getElementById("album-photo");


    let isPlaying = false;
    let currentTrack = 0;
    let audioPosition = 0;


    // Array of Track URLs
    const trackList = [
      "audio/android_mind_mixtape_312.mp3",
      "audio/cyberlife_tower.mp3",
      "audio/evidence_room.mp3",
      "audio/fight_with_hank.mp3",
      "audio/finding_jericho.mp3",
      "audio/hostage_saving.mp3",
      "audio/kara_search.mp3",
      "audio/talking_with_hank.mp3",

      "audio/c1.mp3",
      "audio/c2.mp3",
      "audio/c3.mp3",
      "audio/c4.mp3",
      "audio/c5.mp3",
      "audio/c6.mp3",
      "audio/c7.mp3",
      "audio/c8.mp3",
      "audio/c9.mp3",
      "audio/c10.mp3",
      "audio/c11.mp3",
      "audio/c12.mp3",
      "audio/c13.mp3",
      "audio/c14.mp3",
      "audio/c15.mp3",
      "audio/c16.mp3",
      "audio/c17.mp3",
      "audio/c18.mp3",
      "audio/c19.mp3",
      "audio/c20.mp3",
      "audio/c21.mp3",
      "audio/c22.mp3",
      // Add more tracks as needed
    ];


    // Array of Album Photos
    const albumPhotos = [
      "images/androidmind1.jpg",
      "images/androidmind2.jpg",
      "images/androidmind3.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",

      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      "images/androidmind0.jpg",
      // Add more corresponding Album Photos
    ];


    // Function to toggle between Play and Pause
    function togglePlayPause() {
      if (!isPlaying) {
        if (audioPosition === 0) {
          // Start from the beginning of the track
          audio.src = trackList[currentTrack];
        }
        audio.load();
        audio.currentTime = audioPosition; // Set the audio position
        audio
          .play()
          .then(() => {
            playPauseButton.textContent = "❚❚";
            isPlaying = true;
            updateTrackName(currentTrack);

            ribbon.style.display = "block"; // Show the ribbon
            ribbon.classList.add("active");
          })
          .catch((error) => {
            console.error("Audio Playback Error: " + error.message);
          });
      } else {
        audioPosition = audio.currentTime; // Store the current audio position
        audio.pause();
        playPauseButton.textContent = "►";
        ribbon.style.display = "none"; // Hide the ribbon
        isPlaying = false;
      }
    }

    playPauseButton.addEventListener("click", togglePlayPause);


    // Function to play the next track
    nextButton.addEventListener("click", function () {
      if (currentTrack < trackList.length - 1) {
        currentTrack++;
      } else {
        currentTrack = 0;
      }
      playTrack(currentTrack);
    });


    // Function to play the previous track
    prevButton.addEventListener("click", function () {
      if (currentTrack > 0) {
        currentTrack--;
      } else {
        currentTrack = trackList.length - 1;
      }
      playTrack(currentTrack);
    });


    // Function to play a specific track

    // function playTrack(trackIndex) {
    //   audio.src = trackList[trackIndex];
    //   audio.load();
    //   audio.play();
    //   playPauseButton.textContent = "❚❚";
    //   isPlaying = true;
    //   updateTrackName(trackIndex); // Updating the track name
    // }

    function playTrack(trackIndex) {
      currentTrack = trackIndex;
      audio.src = trackList[trackIndex];
      audio.load();

      // Wait until the audio is ready before playing
      audio.addEventListener('canplay', function playOnceReady() {
          audio.play();
          playPauseButton.textContent = "❚❚";
          isPlaying = true;
          updateTrackName(trackIndex);
          updateActiveTrack();

          // Remove the event listener after it's called to avoid stacking
          audio.removeEventListener('canplay', playOnceReady);
      });
  }


    // Function to update the track name
    function updateTrackName(trackIndex) {
      const trackName = trackList[trackIndex];
      const cleanedTrackName = trackName.replace("audio/", "");
      trackNameDisplay.textContent = cleanedTrackName;
      albumPhoto.src = albumPhotos[trackIndex];
    }

    volumeControl.addEventListener("input", function () {
      audio.volume = volumeControl.value;
    });


    // Update the audio time displays
    audio.addEventListener("timeupdate", function () {
      const currentTime = formatTime(audio.currentTime);
      const totalDuration = formatTime(audio.duration);
      currentTimeDisplay.textContent = currentTime;
      totalDurationDisplay.textContent = totalDuration;

      // Update the track slider as the audio plays
      const position = (audio.currentTime / audio.duration) * 100;
      trackSlider.value = position;
    });


    // Seek to a position when the user interacts with the track slider
    trackSlider.addEventListener("input", function () {
      const newPosition = (trackSlider.value / 100) * audio.duration;
      audio.currentTime = newPosition;
    });


    // Handle track ending and play the next track
    audio.addEventListener("ended", function () {
      if (currentTrack < trackList.length - 1) {
        currentTrack++;
      } else {
        currentTrack = 0;
      }
      playTrack(currentTrack);
    });

    function formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
    }
  });




  //  TRACK list feature

  // Track list container element
const trackListContainer = document.getElementById("track-list-items");

// Function to play a specific track and update the active track in the list
function playTrack(trackIndex) {
    currentTrack = trackIndex;
    audio.src = trackList[trackIndex];
    audio.load();
    audio.play();
    playPauseButton.textContent = "❚❚";
    isPlaying = true;
    updateTrackName(trackIndex);
    updateActiveTrack();  // Call to highlight the active track
}

// Function to update the track name and album photo when a new track plays
function updateTrackName(trackIndex) {
    const trackName = trackList[trackIndex].replace("audio/", "");
    trackNameDisplay.textContent = trackName;
    albumPhoto.src = albumPhotos[trackIndex];
}

// Function to highlight the currently playing track in the track list
function updateActiveTrack() {
    const trackItems = document.querySelectorAll("#track-list-items li");
    trackItems.forEach((item, index) => {
        item.classList.toggle("active", index === currentTrack);
    });
}

// Function to dynamically generate the track list
// function generateTrackList() {
//     trackList.forEach((track, index) => {
//         const trackItem = document.createElement("li");
//         trackItem.textContent = track.replace("audio/", "").replace(".mp3", "");
//         trackItem.addEventListener("click", () => playTrack(index));
//         trackListContainer.appendChild(trackItem);
//     });
//     updateActiveTrack();  // Initial update to highlight the first track
// }


function generateTrackList() {
  trackList.forEach((track, index) => {
      const trackItem = document.createElement("li");
      trackItem.textContent = track.replace("audio/", "").replace(".mp3", "");
      trackItem.addEventListener("click", () => playTrack(index));
      trackListContainer.appendChild(trackItem);
  });
  updateActiveTrack();  // Initial update to highlight the first track
}

// Generate the track list when the page loads
generateTrackList();

*/

document.addEventListener("DOMContentLoaded", function () {
  const audio = document.getElementById("audio");
  const playPauseButton = document.getElementById("play-pause");
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const volumeControl = document.getElementById("volume");
  const trackSlider = document.getElementById("track-slider");
  const currentTimeDisplay = document.getElementById("current-time");
  const totalDurationDisplay = document.getElementById("total-duration");
  const ribbon = document.getElementById("ribbon");
  const trackNameDisplay = document.getElementById("track-name");
  const albumPhoto = document.getElementById("album-photo");
  const trackListContainer = document.getElementById("track-list-items"); // Fix here

  let isPlaying = false;
  let currentTrack = 0;
  let audioPosition = 0;

  // Array of Track URLs
  const trackList = [
    "audio/android_mind_mixtape_312.mp3",
    "audio/cyberlife_tower.mp3",
    "audio/evidence_room.mp3",
    "audio/fight_with_hank.mp3",
    "audio/finding_jericho.mp3",
    "audio/hostage_saving.mp3",
    "audio/kara_search.mp3",
    "audio/talking_with_hank.mp3",

    "audio/c1.mp3",
    "audio/c2.mp3",
    "audio/c3.mp3",
    "audio/c4.mp3",
    "audio/c5.mp3",
    "audio/c6.mp3",
    "audio/c7.mp3",
    "audio/c8.mp3",
    "audio/c9.mp3",
    "audio/c10.mp3",
    "audio/c11.mp3",
    "audio/c12.mp3",
    "audio/c13.mp3",
    "audio/c14.mp3",
    "audio/c15.mp3",
    "audio/c16.mp3",
    "audio/c17.mp3",
    "audio/c18.mp3",
    "audio/c19.mp3",
    "audio/c20.mp3",
    "audio/c21.mp3",
    "audio/c22.mp3",
    // Add more tracks as needed
  ];

  // Array of Album Photos
  const albumPhotos = [
    "images/androidmind1.jpg",
    "images/androidmind2.jpg",
    "images/androidmind3.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",

    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",
    "images/androidmind0.jpg",

    // Add more corresponding Album Photos
  ];

  // Function to toggle between Play and Pause
  function togglePlayPause() {
    if (!isPlaying) {
      if (audioPosition === 0) {
        audio.src = trackList[currentTrack];
      }
      audio.load();
      audio.currentTime = audioPosition;
      audio
        .play()
        .then(() => {
          playPauseButton.textContent = "❚❚";
          isPlaying = true;
          updateTrackName(currentTrack);
          ribbon.style.display = "block";
          ribbon.classList.add("active");
        })
        .catch((error) => {
          console.error("Audio Playback Error: " + error.message);
        });
    } else {
      audioPosition = audio.currentTime;
      audio.pause();
      playPauseButton.textContent = "►";
      ribbon.style.display = "none";
      isPlaying = false;
    }
  }

  playPauseButton.addEventListener("click", togglePlayPause);

  nextButton.addEventListener("click", function () {
    currentTrack = (currentTrack + 1) % trackList.length;
    playTrack(currentTrack);
  });

  prevButton.addEventListener("click", function () {
    currentTrack = (currentTrack - 1 + trackList.length) % trackList.length;
    playTrack(currentTrack);
  });

  function playTrack(trackIndex) {
    currentTrack = trackIndex;
    audio.src = trackList[trackIndex];
    audio.load();

    audio.addEventListener("canplay", function playOnceReady() {
      audio.play();
      playPauseButton.textContent = "❚❚";
      isPlaying = true;
      updateTrackName(trackIndex);
      updateActiveTrack();
      audio.removeEventListener("canplay", playOnceReady);
    });
  }

  function updateTrackName(trackIndex) {
    const trackName = trackList[trackIndex].replace("audio/", "");
    trackNameDisplay.textContent = trackName;
    albumPhoto.src = albumPhotos[trackIndex];
  }

  function updateActiveTrack() {
    const trackItems = document.querySelectorAll("#track-list-items li");
    trackItems.forEach((item, index) => {
      item.classList.toggle("active", index === currentTrack);
    });
  }

  function generateTrackList() {
    trackList.forEach((track, index) => {
      const trackItem = document.createElement("li");
      trackItem.textContent = track.replace("audio/", "").replace(".mp3", "");
      trackItem.addEventListener("click", () => playTrack(index));
      trackListContainer.appendChild(trackItem);
    });
    updateActiveTrack();
  }

  audio.addEventListener("timeupdate", function () {
    const currentTime = formatTime(audio.currentTime);
    const totalDuration = formatTime(audio.duration);
    currentTimeDisplay.textContent = currentTime;
    totalDurationDisplay.textContent = totalDuration;

    const position = (audio.currentTime / audio.duration) * 100;
    trackSlider.value = position;
  });

  trackSlider.addEventListener("input", function () {
    audio.currentTime = (trackSlider.value / 100) * audio.duration;
  });

  audio.addEventListener("ended", function () {
    currentTrack = (currentTrack + 1) % trackList.length;
    playTrack(currentTrack);
  });

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  }

  volumeControl.addEventListener("input", function () {
    audio.volume = volumeControl.value;
  });

  generateTrackList(); // Initialize the track list on load
});
