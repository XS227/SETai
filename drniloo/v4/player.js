/* Accessible HTML5 reel player. No cross-origin embed or expiring CDN source. */
(() => {
 'use strict';
 const icon = name => {
  const shapes = {play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',muted:'<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6M22 9l-6 6"/>'};
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${shapes[name]}</svg>`;
 };
 const time = seconds => {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
 };
 document.querySelectorAll('[data-reel-player]').forEach(player => {
  const video = player.querySelector('video');
  if (!video) return;
  const play = player.querySelector('[data-play-toggle]');
  const center = player.querySelector('[data-play-center]');
  const mute = player.querySelector('[data-mute]');
  const seek = player.querySelector('[data-seek]');
  const clock = player.querySelector('[data-time]');
  const fullscreen = player.querySelector('[data-fullscreen]');
  const status = player.querySelector('[data-player-status]');
  let seeking = false;
  const refresh = () => {
   const playing = !video.paused && !video.ended;
   player.classList.toggle('is-playing', playing);
   play.innerHTML = icon(playing ? 'pause' : 'play');
   play.setAttribute('aria-label', playing ? 'توقف ویدیو' : 'پخش ویدیو');
   play.setAttribute('aria-pressed', String(playing));
   center.setAttribute('aria-hidden', String(playing));
   center.tabIndex = playing ? -1 : 0;
   mute.innerHTML = icon(video.muted ? 'muted' : 'sound');
   mute.setAttribute('aria-label', video.muted ? 'روشن کردن صدا' : 'قطع صدا');
   mute.setAttribute('aria-pressed', String(video.muted));
   const duration = video.duration;
   seek.disabled = !Number.isFinite(duration) || duration <= 0;
   if (!seeking) {
    const progress = seek.disabled ? 0 : Math.round(video.currentTime / duration * 1000);
    seek.value = String(progress);
    seek.style.setProperty('--played', `${progress / 10}%`);
   }
   seek.setAttribute('aria-valuetext', `${time(video.currentTime)} / ${time(duration)}`);
   clock.textContent = time(video.currentTime);
   clock.title = `${time(video.currentTime)} / ${time(duration)}`;
  };
  const showError = () => {
   status.textContent = 'برای تماشای نسخه اصلی، «نمایش در اینستاگرام» را انتخاب کنید.';
   status.hidden = false;
   refresh();
  };
  const toggle = async () => {
   if (!video.paused && !video.ended) { video.pause(); return; }
   document.querySelectorAll('[data-reel-player] video').forEach(other => { if (other !== video) other.pause(); });
   status.hidden = true;
   try { await video.play(); } catch { showError(); }
  };
  play.addEventListener('click', toggle);
  center.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  mute.addEventListener('click', () => { video.muted = !video.muted; refresh(); });
  seek.addEventListener('input', () => {
   seeking = true;
   seek.style.setProperty('--played', `${Number(seek.value) / 10}%`);
   if (Number.isFinite(video.duration)) video.currentTime = Number(seek.value) / 1000 * video.duration;
   clock.textContent = time(video.currentTime);
  });
  seek.addEventListener('change', () => { seeking = false; refresh(); });
  seek.addEventListener('blur', () => { seeking = false; refresh(); });
  fullscreen.addEventListener('click', async () => {
   try {
    if (player.classList.contains('is-expanded')) player.classList.remove('is-expanded');
    else if (document.fullscreenElement) await document.exitFullscreen();
    else if (player.requestFullscreen && document.fullscreenEnabled) await player.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else player.classList.add('is-expanded');
   } catch { player.classList.add('is-expanded'); }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') player.classList.remove('is-expanded'); });
  ['play','pause','ended','timeupdate','loadedmetadata','durationchange','volumechange','seeked'].forEach(event => video.addEventListener(event, refresh));
  video.addEventListener('error', showError);
  player.addEventListener('keydown', event => {
   if (event.target.closest('a,input,button')) return;
   if (event.code === 'Space') { event.preventDefault(); toggle(); }
   if (event.code === 'ArrowRight' && Number.isFinite(video.duration)) { event.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 5); }
   if (event.code === 'ArrowLeft' && Number.isFinite(video.duration)) { event.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  video.controls = false;
  player.classList.add('is-enhanced');
  refresh();
 });
})();
