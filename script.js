const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const header = document.querySelector('.site-header');
const data = window.SKANK_E_DATA || { site: {}, releases: [], players: [], dubLab: {}, links: [] };

const DEFAULT_DUB_LAB = {
  eyebrow: 'LIVE FX / NO AUTOPLAY',
  title: 'Make some\nnoise.',
  description: 'Tap the controls for a little sound-system theatre.',
  armedStatus: 'FX armed. Click a button to fire.',
  rigLabel: 'SKANK-E MOBILE SOUND',
  effects: [
    { label: 'SIREN', sublabel: 'WOOOOP', source: 'generated', engine: 'siren', params: {} },
    { label: 'ECHO', sublabel: 'CHOP', source: 'generated', engine: 'echo', params: {} },
    { label: 'SPRING', sublabel: 'BOING', source: 'generated', engine: 'spring', params: {} }
  ]
};

function closeMenu() {
  nav?.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}

menuToggle?.addEventListener('click', () => {
  const isOpen = nav?.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
});

document.querySelectorAll('.site-nav a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeMenu();
    menuToggle?.focus();
  }
});

document.addEventListener('click', event => {
  if (nav?.classList.contains('open') && header && !header.contains(event.target)) closeMenu();
});

const desktopNav = window.matchMedia('(min-width: 901px)');
desktopNav.addEventListener?.('change', event => {
  if (event.matches) closeMenu();
});

document.getElementById('year').textContent = new Date().getFullYear();

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function multilineHTML(value = '') {
  return escapeHTML(value).replace(/\n/g, '<br>');
}

function safeUrl(value = '') {
  const url = String(value).trim();
  if (!url) return '';
  if (/^(https?:|mailto:)/i.test(url)) return url;
  return '';
}

function safeAudioUrl(value = '') {
  const url = String(value).trim();
  if (!url) return '';
  if (/^(javascript:|data:|vbscript:)/i.test(url)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url)) return '';
  return url;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && typeof value === 'string') el.textContent = value;
}

function applySiteText() {
  const site = data.site || {};
  const hero = document.getElementById('hero-tagline');
  if (hero && site.heroTagline) {
    hero.innerHTML = escapeHTML(site.heroTagline).split('×').join('<span>×</span>');
  }
  setText('hero-sub', site.heroSub || '');
  setText('about-kicker', site.aboutKicker || '');
  const aboutTitle = document.getElementById('about-title');
  if (aboutTitle && typeof site.aboutTitle === 'string') aboutTitle.innerHTML = multilineHTML(site.aboutTitle);
  setText('about-p1', site.aboutParagraph1 || '');
  setText('about-p2', site.aboutParagraph2 || '');
  setText('contact-eyebrow', site.contactEyebrow || '');
  setText('contact-title', site.contactTitle || '');
  setText('contact-note', site.contactNote || '');
  setText('footer-text', site.footerText || 'SKANK-E · MASH IT UP · PLAY IT LOUD');
}

function youtubeId(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
    if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
    return u.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function mixcloudPath(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`;
  } catch {
    return '';
  }
}

function tiktokId(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/(?:video|photo)\/(\d+)/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function embedSrc(type, url) {
  const clean = safeUrl(url);
  if (!clean || !/^https?:/i.test(clean)) return '';
  if (type === 'soundcloud') {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&color=%23f4c52d&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`;
  }
  if (type === 'mixcloud') {
    const path = mixcloudPath(clean);
    return path ? `https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=0&feed=${encodeURIComponent(path)}` : '';
  }
  if (type === 'youtube') {
    const id = youtubeId(clean);
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1` : '';
  }
  if (type === 'tiktok') {
    const id = tiktokId(clean);
    return id ? `https://www.tiktok.com/player/v1/${encodeURIComponent(id)}?autoplay=0&controls=1&music_info=1&description=0&rel=0` : '';
  }
  return '';
}

function platformLabel(type = '') {
  return ({ soundcloud: 'SOUNDCLOUD', mixcloud: 'MIXCLOUD', youtube: 'YOUTUBE', tiktok: 'TIKTOK' })[type] || String(type).toUpperCase();
}

function artworkClass(value) {
  return ['artwork-a', 'artwork-b', 'artwork-c'].includes(value) ? value : 'artwork-a';
}

function makeArtwork(release, index) {
  return `
    <div class="release-art ${artworkClass(release.artworkClass)}" data-release-artwork="${index}">
      <div class="art-no">${escapeHTML(release.number || '000')}</div>
      <div class="art-logo"><img src="assets/Skank-E_logo.png" alt=""></div>
      <div class="art-label">${escapeHTML(release.label || 'DUBPLATE')}</div>
      <div class="art-hole"></div>
    </div>`;
}

// Release artwork is an enhancement only. The cards are rendered first with
// the original Skank-E artwork, then platform/custom artwork is attempted in
// the background. Any network, API, CORS or image error simply leaves the
// original artwork in place, so a failed artwork lookup can never blank a
// release or another section of the page.
const releaseArtworkCache = new Map();
let releaseArtworkRenderVersion = 0;

function safeImageUrl(value = '') {
  let url = String(value).trim();
  if (!url) return '';
  if (/^(javascript:|data:|vbscript:)/i.test(url)) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url)) return '';
  if (/^http:/i.test(url)) url = url.replace(/^http:/i, 'https:');
  return url;
}

function withFetchTimeout(url, milliseconds = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return fetch(url, { signal: controller.signal, mode: 'cors', cache: 'force-cache' })
    .then(response => response.ok ? response.json() : null)
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}

function highResSoundCloudArtwork(url = '') {
  const clean = safeImageUrl(url);
  if (!clean) return '';
  // SoundCloud commonly returns a small "-large" image. Requesting the
  // t500x500 variant gives release cards a sharper square image when present.
  return clean.replace(/-large(\.[a-z0-9]+)(?:\?.*)?$/i, '-t500x500$1');
}

async function automaticArtworkUrl(release) {
  const type = String(release?.type || '').toLowerCase();
  const releaseUrl = safeUrl(release?.url);
  if (!releaseUrl || !/^https?:/i.test(releaseUrl)) return '';

  const key = `${type}:${releaseUrl}`;
  if (releaseArtworkCache.has(key)) return releaseArtworkCache.get(key);

  let result = '';
  try {
    if (type === 'youtube') {
      const id = youtubeId(releaseUrl);
      if (id) result = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    } else if (type === 'soundcloud') {
      const endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(releaseUrl)}`;
      const payload = await withFetchTimeout(endpoint);
      result = highResSoundCloudArtwork(payload?.thumbnail_url || '');
    } else if (type === 'mixcloud') {
      const path = mixcloudPath(releaseUrl);
      if (path) {
        const payload = await withFetchTimeout(`https://api.mixcloud.com${path}`);
        result = safeImageUrl(payload?.pictures?.extra_large || payload?.pictures?.large || payload?.pictures?.medium || payload?.picture || '');
      }
    } else if (type === 'tiktok') {
      const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(releaseUrl)}`;
      const payload = await withFetchTimeout(endpoint);
      result = safeImageUrl(payload?.thumbnail_url || '');
    }
  } catch {
    result = '';
  }

  result = safeImageUrl(result);
  releaseArtworkCache.set(key, result);
  return result;
}

function artworkUrlForRelease(release) {
  const mode = ['auto', 'custom', 'graphic'].includes(release?.artworkMode) ? release.artworkMode : 'auto';
  if (mode === 'graphic') return Promise.resolve('');
  if (mode === 'custom') return Promise.resolve(safeImageUrl(release?.artworkUrl));
  return automaticArtworkUrl(release);
}

function resolveArtworkSrc(value = '') {
  let clean = safeImageUrl(value);
  if (!clean) return '';

  // Be forgiving with paths pasted from Windows and with leading slashes.
  // Local artwork should stay relative to the current GitHub Pages project.
  clean = clean.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(clean)) return clean;
  clean = clean.replace(/^\/+/, '').replace(/^\.\//, '');

  try {
    return new URL(clean, document.baseURI).href;
  } catch {
    return clean;
  }
}

function attachArtworkImage(art, url, renderVersion) {
  const src = resolveArtworkSrc(url);
  if (!art || !src) return;

  // Attach the image to the DOM immediately and reveal it only after a
  // successful load. This is more reliable than preloading a detached image
  // (especially when lazy-loading is involved) and keeps the graphic fallback
  // visible if the file path is wrong or the remote image fails.
  const image = new Image();
  image.className = 'release-art-image';
  image.alt = '';
  image.decoding = 'async';
  image.loading = 'eager';

  image.addEventListener('load', () => {
    if (renderVersion !== releaseArtworkRenderVersion || !art.isConnected) {
      image.remove();
      return;
    }
    art.classList.add('has-release-image');
  }, { once: true });

  image.addEventListener('error', () => {
    image.remove();
    art.classList.remove('has-release-image');
  }, { once: true });

  art.prepend(image);
  image.src = src;
}

async function enhanceReleaseArtwork(releases, renderVersion) {
  await Promise.allSettled(releases.map(async (release, index) => {
    const url = await artworkUrlForRelease(release);
    if (!url || renderVersion !== releaseArtworkRenderVersion) return;

    const art = document.querySelector(`[data-release-artwork="${index}"]`);
    if (!art) return;
    attachArtworkImage(art, url, renderVersion);
  }));
}

function renderReleases() {
  const grid = document.getElementById('release-grid');
  if (!grid) return;
  const releases = Array.isArray(data.releases) ? data.releases : [];
  const renderVersion = ++releaseArtworkRenderVersion;

  grid.innerHTML = releases.map((release, index) => {
    const src = embedSrc(release.type, release.url);
    const releaseUrl = safeUrl(release.url);
    const downloadUrl = safeUrl(release.downloadUrl);
    const platform = platformLabel(release.type);
    const action = releaseUrl
      ? `<a class="text-link" href="${escapeHTML(releaseUrl)}" target="_blank" rel="noopener">Open on ${escapeHTML(platform)} ↗</a>`
      : `<span class="pending-link">ADD REAL ${escapeHTML(platform)} URL IN THE PRIVATE EDITOR</span>`;

    const download = downloadUrl
      ? `<a class="download-chip" href="${escapeHTML(downloadUrl)}" target="_blank" rel="noopener">FREE DL ↗</a>`
      : '';

    return `
      <article class="release-card">
        ${makeArtwork(release, index)}
        <div class="release-meta">
          <div class="release-topline"><span>${escapeHTML(release.number || '')}</span><span>${escapeHTML(platform)}</span></div>
          <h3>${escapeHTML(release.title || '')}</h3>
          <p>${escapeHTML(release.subtitle || '')}</p>
          <div class="release-actions">${action}${download}</div>
          ${src ? `<iframe class="release-mini-player ${escapeHTML(release.type)}" title="${escapeHTML(release.title || 'Release')}" src="${escapeHTML(src)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>` : ''}
        </div>
      </article>`;
  }).join('');

  // Never await this: page content is already complete and usable.
  enhanceReleaseArtwork(releases, renderVersion).catch(() => {});
}

function renderPlayers() {
  const grid = document.getElementById('player-grid');
  if (!grid) return;
  const players = Array.isArray(data.players) ? data.players : [];

  grid.innerHTML = players.map(player => {
    const platform = platformLabel(player.type);
    const label = player.label || platform;
    const src = embedSrc(player.type, player.url);
    if (!src) {
      return `
        <article class="player-card player-empty">
          <div class="player-head"><span>${escapeHTML(label)}</span><b>READY</b></div>
          <div class="player-placeholder">
            <div class="placeholder-icon">▶</div>
            <strong>PLAYER READY</strong>
            <p>Add the real ${escapeHTML(platform)} URL in the private editor.</p>
          </div>
        </article>`;
    }

    return `
      <article class="player-card">
        <div class="player-head"><span>${escapeHTML(label)}</span><b>LIVE</b></div>
        <iframe class="platform-player ${escapeHTML(player.type)}" title="${escapeHTML(label)} player" src="${escapeHTML(src)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
      </article>`;
  }).join('');
}

function renderLinks() {
  const stack = document.getElementById('link-stack');
  if (!stack) return;
  const links = Array.isArray(data.links) ? data.links : [];
  stack.innerHTML = links.map(link => {
    const url = safeUrl(link.url);
    const label = escapeHTML(link.label || 'Link');
    if (!url) {
      return `<div class="link-row is-pending" aria-disabled="true"><span>${label}</span><span>ADD URL</span></div>`;
    }
    const external = /^https?:/i.test(url);
    return `<a href="${escapeHTML(url)}" ${external ? 'target="_blank" rel="noopener"' : ''}><span>${label}</span><span>↗</span></a>`;
  }).join('');
}

function currentDubLab() {
  const lab = data.dubLab || {};
  return {
    ...DEFAULT_DUB_LAB,
    ...lab,
    effects: Array.isArray(lab.effects) ? lab.effects : DEFAULT_DUB_LAB.effects
  };
}

function renderDubLab() {
  const lab = currentDubLab();
  setText('dub-eyebrow', lab.eyebrow || '');
  setText('dub-description', lab.description || '');
  setText('rig-label', lab.rigLabel || '');

  const title = document.getElementById('dub-title');
  if (title) title.innerHTML = multilineHTML(lab.title || '');

  const controls = document.getElementById('fx-controls');
  if (controls) {
    controls.innerHTML = lab.effects.length
      ? lab.effects.map((effect, index) => `
          <button class="fx-button" type="button" data-fx-index="${index}">
            <span>${escapeHTML(effect.label || `FX ${index + 1}`)}</span>
            <small>${escapeHTML(effect.sublabel || 'FIRE')}</small>
          </button>`).join('')
      : '<span class="fx-empty">NO FX LOADED</span>';
  }

  const fxStatus = document.getElementById('fx-status');
  if (fxStatus) fxStatus.textContent = lab.armedStatus || DEFAULT_DUB_LAB.armedStatus;
}

function renderEditableContent() {
  applySiteText();
  renderReleases();
  renderPlayers();
  renderDubLab();
  renderLinks();
}

renderEditableContent();

// The local private editor sends temporary data to the preview iframe.
window.addEventListener('message', event => {
  if (event.data?.type !== 'SKANK_E_PREVIEW' || !event.data.data) return;
  const incoming = event.data.data;
  data.site = incoming.site || {};
  data.releases = Array.isArray(incoming.releases) ? incoming.releases : [];
  data.players = Array.isArray(incoming.players) ? incoming.players : [];
  data.dubLab = incoming.dubLab || {};
  data.links = Array.isArray(incoming.links) ? incoming.links : [];
  renderEditableContent();
});

// Speaker pulse animation: visual only, no microphone or media access.
// It pauses off-screen, in background tabs and when reduced motion is requested.
const cones = [...document.querySelectorAll('.cone, .rig-bass i, .rig-mids i')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const visiblePulseSections = new Set();

if ('IntersectionObserver' in window) {
  const pulseObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visiblePulseSections.add(entry.target);
      else visiblePulseSections.delete(entry.target);
    });
  }, { rootMargin: '120px 0px' });
  document.querySelectorAll('.hero, .dub-lab-section').forEach(section => pulseObserver.observe(section));
} else {
  document.querySelectorAll('.hero, .dub-lab-section').forEach(section => visiblePulseSections.add(section));
}

function speakerPulse() {
  if (!document.hidden && !reduceMotion.matches && visiblePulseSections.size) {
    cones.forEach((cone, index) => {
      const strength = 1 + Math.random() * (index % 2 ? 0.035 : 0.06);
      cone.style.setProperty('--pulse', strength.toFixed(3));
    });
  }
  setTimeout(speakerPulse, 150 + Math.random() * 260);
}
speakerPulse();

// Dub Lab -------------------------------------------------------
// All generated sounds are deliberately short one-shots. AudioContext starts
// only after the visitor clicks an FX control.
let audioContext;
const activeAudio = new Set();

function ctx() {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function param(effect, key, fallback, min, max) {
  return clamp(effect?.params?.[key], min, max, fallback);
}

function noiseBuffer(duration = 0.15) {
  const c = ctx();
  const safeDuration = clamp(duration, 0.02, 1, 0.15);
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * safeDuration)), c.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  return buffer;
}

function fireSiren(effect) {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  const waveform = ['sawtooth', 'square', 'triangle', 'sine'].includes(effect?.params?.waveform)
    ? effect.params.waveform
    : 'sawtooth';
  const startFrequency = param(effect, 'startFrequency', 440, 20, 12000);
  const peakFrequency = param(effect, 'peakFrequency', 880, 20, 12000);
  const endFrequency = param(effect, 'endFrequency', 520, 20, 12000);
  const duration = param(effect, 'duration', 1.05, 0.1, 5);
  const peakTime = Math.min(param(effect, 'peakTime', 0.45, 0.02, 4.5), Math.max(0.03, duration * 0.88));
  const filterFrequency = param(effect, 'filterFrequency', 2200, 100, 16000);
  const volume = param(effect, 'volume', 0.12, 0, 1);

  osc.type = waveform;
  filter.type = 'lowpass';
  filter.frequency.value = filterFrequency;
  osc.frequency.setValueAtTime(startFrequency, now);
  osc.frequency.exponentialRampToValueAtTime(peakFrequency, now + peakTime);
  osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration * 0.92);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + Math.min(0.03, duration * 0.15));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(filter).connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.04);
}

function fireEcho(effect) {
  const c = ctx();
  const now = c.currentTime;
  const burstDuration = param(effect, 'burstDuration', 0.09, 0.02, 1);
  const filterFrequency = param(effect, 'filterFrequency', 850, 80, 12000);
  const delayTime = param(effect, 'delayTime', 0.22, 0.03, 1.5);
  const feedbackAmount = param(effect, 'feedback', 0.48, 0, 0.92);
  const volume = param(effect, 'volume', 0.18, 0, 1);

  const source = c.createBufferSource();
  source.buffer = noiseBuffer(burstDuration);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFrequency;
  const dry = c.createGain();
  dry.gain.value = volume;
  const wet = c.createGain();
  wet.gain.value = volume * 0.9;
  const delay = c.createDelay(1.6);
  delay.delayTime.value = delayTime;
  const feedback = c.createGain();
  feedback.gain.value = feedbackAmount;

  source.connect(filter);
  filter.connect(dry).connect(c.destination);
  filter.connect(delay);
  delay.connect(wet).connect(c.destination);
  delay.connect(feedback).connect(delay);
  source.start(now);
}

function fireSpring(effect) {
  const c = ctx();
  const now = c.currentTime;
  const baseFrequency = param(effect, 'baseFrequency', 130, 30, 2000);
  const frequencySpread = param(effect, 'frequencySpread', 57, 1, 500);
  const decay = param(effect, 'decay', 0.24, 0.05, 2);
  const taps = Math.round(param(effect, 'taps', 4, 1, 8));
  const volume = param(effect, 'volume', 0.05, 0, 1);

  for (let i = 0; i < taps; i++) {
    const offset = i * 0.035 + i * i * 0.004;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const startFrequency = baseFrequency + i * frequencySpread;
    osc.type = i % 2 ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(startFrequency, now + offset);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, startFrequency * 0.56), now + offset + decay * 0.84);
    gain.gain.setValueAtTime(Math.max(0.0001, volume / (i + 1)), now + offset);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + decay);
    osc.connect(gain).connect(c.destination);
    osc.start(now + offset);
    osc.stop(now + offset + decay + 0.03);
  }
}

function playCustomAudio(effect) {
  const url = safeAudioUrl(effect?.audioUrl);
  if (!url) return Promise.reject(new Error('No audio file configured'));
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.volume = param(effect, 'audioVolume', 0.8, 0, 1);
  audio.playbackRate = param(effect, 'playbackRate', 1, 0.25, 4);
  activeAudio.add(audio);
  const release = () => activeAudio.delete(audio);
  audio.addEventListener('ended', release, { once: true });
  audio.addEventListener('error', release, { once: true });
  return audio.play().catch(error => {
    release();
    throw error;
  });
}

async function fireEffect(effect) {
  if (effect?.source === 'audio') {
    await playCustomAudio(effect);
    return;
  }
  const c = ctx();
  if (c.state === 'suspended') await c.resume();
  if (effect?.engine === 'echo') fireEcho(effect);
  else if (effect?.engine === 'spring') fireSpring(effect);
  else fireSiren(effect);
}

const fxControls = document.getElementById('fx-controls');
fxControls?.addEventListener('click', async event => {
  const button = event.target.closest('[data-fx-index]');
  if (!button || !fxControls.contains(button)) return;
  const effects = currentDubLab().effects;
  const index = Number(button.dataset.fxIndex);
  const effect = effects[index];
  if (!effect) return;

  button.classList.add('fired');
  setTimeout(() => button.classList.remove('fired'), 260);
  const fxStatus = document.getElementById('fx-status');
  try {
    await fireEffect(effect);
    if (fxStatus) fxStatus.textContent = `${String(effect.label || 'FX').toUpperCase()} fired — forward the bass!`;
  } catch {
    if (fxStatus) fxStatus.textContent = `${String(effect.label || 'FX').toUpperCase()} could not play — check the audio path / URL.`;
  }
});
