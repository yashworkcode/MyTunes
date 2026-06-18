/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Audio Player                 ║
   ╚══════════════════════════════════════════╝ */

const Player = (() => {
  let audio = null;
  let queue = [];           // array of song objects
  let currentIndex = -1;
  let isPlaying = false;
  let shuffleOn = false;
  let repeatMode = 0;       // 0=off 1=all 2=one
  let onChangeCb = () => {};

  function init() {
    audio = document.getElementById('audioEl');
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.volume = 0.8;
  }

  function setQueue(songs, startIndex = 0) {
    queue = songs;
    currentIndex = startIndex;
    playCurrent();
  }

  function playCurrent() {
    const song = queue[currentIndex];
    if (!song) return;

    audio.src = song.audioUrl || '';
    isPlaying = true;
    if (song.audioUrl) {
      audio.play().catch(() => { isPlaying = false; onChangeCb(); });
    } else {
      toast(`⚠️ "${song.title}" has no audio file.`, true);
      isPlaying = false;
    }

    // Log play server-side
    api.songs.logPlay(song._id).catch(() => {});

    onChangeCb();
  }

  function togglePlay() {
    if (currentIndex < 0) return;
    isPlaying = !isPlaying;
    isPlaying ? audio.play().catch(()=>{}) : audio.pause();
    onChangeCb();
  }

  function next() {
    if (!queue.length) return;
    if (shuffleOn) {
      currentIndex = Math.floor(Math.random() * queue.length);
    } else {
      currentIndex = (currentIndex + 1) % queue.length;
    }
    playCurrent();
  }

  function prev() {
    if (!queue.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    currentIndex = (currentIndex - 1 + queue.length) % queue.length;
    playCurrent();
  }

  function handleEnded() {
    if (repeatMode === 2) { audio.currentTime = 0; audio.play(); }
    else next();
  }

  function seekTo(fraction) {
    if (!audio.duration) return;
    audio.currentTime = fraction * audio.duration;
  }

  function setVolume(v) { audio.volume = v; }

  function toggleShuffle() { shuffleOn = !shuffleOn; return shuffleOn; }

  function cycleRepeat() { repeatMode = (repeatMode + 1) % 3; return repeatMode; }

  function updateProgress() {
    onChangeCb('progress');
  }

  function currentSong() { return queue[currentIndex] || null; }
  function getState() { return { isPlaying, shuffleOn, repeatMode, currentIndex, queue }; }
  function onChange(cb) { onChangeCb = cb; }

  return {
    init, setQueue, togglePlay, next, prev, seekTo, setVolume,
    toggleShuffle, cycleRepeat, currentSong, getState, onChange,
    get audio() { return audio; },
  };
})();
