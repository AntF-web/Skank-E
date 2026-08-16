(() => {
  const isLocal = location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  const publicBlock = document.getElementById('public-block');
  const editorApp = document.getElementById('editor-app');

  if (!isLocal) {
    publicBlock.hidden = false;
    editorApp.hidden = true;
    return;
  }

  const DRAFT_KEY = 'skank-e-private-editor-draft-v1';
  const baseData = structuredClone(window.SKANK_E_DATA || { site: {}, releases: [], players: [], dubLab: {}, links: [] });
  let state = loadDraft() || structuredClone(baseData);
  let saveTimer;
  let previewTimer;

  const status = document.getElementById('save-status');
  const releaseContainer = document.getElementById('release-editors');
  const playerContainer = document.getElementById('player-editors');
  const fxContainer = document.getElementById('fx-editors');
  const linkContainer = document.getElementById('link-editors');
  const preview = document.getElementById('site-preview');
  const releaseTemplate = document.getElementById('release-template');
  const fxTemplate = document.getElementById('fx-template');

  function clone(value) {
    return structuredClone(value);
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function effectParamDefaults(engine) {
    if (engine === 'echo') {
      return { burstDuration: 0.09, filterFrequency: 850, delayTime: 0.22, feedback: 0.48, volume: 0.18, audioVolume: 0.8, playbackRate: 1 };
    }
    if (engine === 'spring') {
      return { baseFrequency: 130, frequencySpread: 57, decay: 0.24, taps: 4, volume: 0.05, audioVolume: 0.8, playbackRate: 1 };
    }
    return {
      waveform: 'sawtooth', startFrequency: 440, peakFrequency: 880, endFrequency: 520,
      peakTime: 0.45, duration: 1.05, filterFrequency: 2200, volume: 0.12,
      audioVolume: 0.8, playbackRate: 1
    };
  }

  function normalizeEffect(effect = {}) {
    const engine = ['siren', 'echo', 'spring'].includes(effect.engine) ? effect.engine : 'siren';
    const source = effect.source === 'audio' ? 'audio' : 'generated';
    return {
      label: effect.label || 'FX',
      sublabel: effect.sublabel || '',
      source,
      engine,
      audioUrl: effect.audioUrl || '',
      params: { ...effectParamDefaults(engine), ...(effect.params || {}) }
    };
  }

  function normalizeState(input) {
    const baseDub = baseData.dubLab || {};
    const incomingDub = input.dubLab || {};
    const rawEffects = Array.isArray(incomingDub.effects)
      ? incomingDub.effects
      : (Array.isArray(baseDub.effects) ? baseDub.effects : []);

    return {
      site: { ...(baseData.site || {}), ...(input.site || {}) },
      releases: Array.isArray(input.releases) ? input.releases : [],
      players: Array.isArray(input.players) ? input.players : [],
      dubLab: {
        ...baseDub,
        ...incomingDub,
        effects: rawEffects.map(normalizeEffect)
      },
      links: Array.isArray(input.links) ? input.links : []
    };
  }

  state = normalizeState(state);

  function setStatus(message, saved = false) {
    status.textContent = message;
    status.classList.toggle('saved', saved);
  }

  function queueSave() {
    clearTimeout(saveTimer);
    clearTimeout(previewTimer);
    setStatus('Unsaved editor change…');
    previewTimer = setTimeout(sendPreview, 120);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
        setStatus('Private draft auto-saved in this browser', true);
      } catch {
        setStatus('Could not save browser draft');
      }
    }, 420);
  }

  function fillSiteFields() {
    document.querySelectorAll('[data-site-field]').forEach(input => {
      const key = input.dataset.siteField;
      input.value = state.site[key] ?? '';
      input.addEventListener('input', () => {
        state.site[key] = input.value;
        queueSave();
      });
    });
  }

  function fillDubLabFields() {
    document.querySelectorAll('[data-dub-field]').forEach(input => {
      const key = input.dataset.dubField;
      input.value = state.dubLab[key] ?? '';
      input.addEventListener('input', () => {
        state.dubLab[key] = input.value;
        queueSave();
      });
    });
  }

  function releaseDefaults() {
    const n = state.releases.length + 1;
    return {
      number: String(n).padStart(3, '0'),
      title: 'NEW BOOTLEG',
      subtitle: '',
      type: 'soundcloud',
      url: '',
      downloadUrl: '',
      artworkClass: ['artwork-a', 'artwork-b', 'artwork-c'][(n - 1) % 3],
      label: 'DUBPLATE'
    };
  }

  function effectDefaults() {
    return {
      label: 'NEW FX',
      sublabel: 'FIRE',
      source: 'audio',
      engine: 'siren',
      audioUrl: '',
      params: effectParamDefaults('siren')
    };
  }

  function renderReleases() {
    releaseContainer.innerHTML = '';
    state.releases.forEach((release, index) => {
      const node = releaseTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector('.item-title').textContent = `Release ${index + 1} · ${release.title || 'Untitled'}`;
      node.querySelectorAll('[data-key]').forEach(input => {
        const key = input.dataset.key;
        input.value = release[key] ?? '';
        input.addEventListener('input', () => {
          state.releases[index][key] = input.value;
          node.querySelector('.item-title').textContent = `Release ${index + 1} · ${state.releases[index].title || 'Untitled'}`;
          queueSave();
        });
        input.addEventListener('change', () => {
          state.releases[index][key] = input.value;
          queueSave();
        });
      });
      node.querySelector('[data-action="remove"]').addEventListener('click', () => {
        if (state.releases.length === 1 && !confirm('Remove the last release card?')) return;
        state.releases.splice(index, 1);
        renderReleases();
        queueSave();
      });
      node.querySelector('[data-action="move-up"]').addEventListener('click', () => {
        if (!index) return;
        [state.releases[index - 1], state.releases[index]] = [state.releases[index], state.releases[index - 1]];
        renderReleases();
        queueSave();
      });
      node.querySelector('[data-action="move-down"]').addEventListener('click', () => {
        if (index >= state.releases.length - 1) return;
        [state.releases[index + 1], state.releases[index]] = [state.releases[index], state.releases[index + 1]];
        renderReleases();
        queueSave();
      });
      releaseContainer.appendChild(node);
    });
  }

  function renderPlayers() {
    playerContainer.innerHTML = '';
    state.players.forEach((player, index) => {
      const row = document.createElement('div');
      row.className = 'simple-item';
      row.innerHTML = `
        <label class="field"><span>Label</span><input type="text" data-role="label"></label>
        <label class="field"><span>${platformName(player.type)} URL</span><input type="url" data-role="url" placeholder="https://…"></label>
        <div class="field"><span>Platform</span><input type="text" value="${platformName(player.type)}" disabled></div>`;
      const label = row.querySelector('[data-role="label"]');
      const url = row.querySelector('[data-role="url"]');
      label.value = player.label || platformName(player.type).toUpperCase();
      url.value = player.url || '';
      label.addEventListener('input', () => { state.players[index].label = label.value; queueSave(); });
      url.addEventListener('input', () => { state.players[index].url = url.value; queueSave(); });
      playerContainer.appendChild(row);
    });
  }

  function platformName(type) {
    return ({ soundcloud: 'SoundCloud', mixcloud: 'Mixcloud', youtube: 'YouTube' })[type] || type || 'Player';
  }

  function tuningFields(engine, params) {
    const n = (label, key, min, max, step) => `
      <label class="field"><span>${label}</span><input type="number" min="${min}" max="${max}" step="${step}" data-param="${key}" value="${params[key] ?? ''}"></label>`;

    if (engine === 'echo') {
      return `<div class="field-grid compact">
        ${n('Noise burst (seconds)', 'burstDuration', 0.02, 1, 0.01)}
        ${n('Filter frequency (Hz)', 'filterFrequency', 80, 12000, 10)}
        ${n('Delay time (seconds)', 'delayTime', 0.03, 1.5, 0.01)}
        ${n('Feedback (0–0.92)', 'feedback', 0, 0.92, 0.01)}
        ${n('Volume (0–1)', 'volume', 0, 1, 0.01)}
      </div>`;
    }

    if (engine === 'spring') {
      return `<div class="field-grid compact">
        ${n('Base frequency (Hz)', 'baseFrequency', 30, 2000, 1)}
        ${n('Frequency spread (Hz)', 'frequencySpread', 1, 500, 1)}
        ${n('Decay (seconds)', 'decay', 0.05, 2, 0.01)}
        ${n('Spring taps', 'taps', 1, 8, 1)}
        ${n('Volume (0–1)', 'volume', 0, 1, 0.01)}
      </div>`;
    }

    return `<div class="field-grid compact">
      <label class="field"><span>Waveform</span>
        <select data-param="waveform">
          ${['sawtooth','square','triangle','sine'].map(w => `<option value="${w}" ${params.waveform === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </label>
      ${n('Start frequency (Hz)', 'startFrequency', 20, 12000, 1)}
      ${n('Peak frequency (Hz)', 'peakFrequency', 20, 12000, 1)}
      ${n('End frequency (Hz)', 'endFrequency', 20, 12000, 1)}
      ${n('Peak time (seconds)', 'peakTime', 0.02, 4.5, 0.01)}
      ${n('Duration (seconds)', 'duration', 0.1, 5, 0.01)}
      ${n('Filter frequency (Hz)', 'filterFrequency', 100, 16000, 10)}
      ${n('Volume (0–1)', 'volume', 0, 1, 0.01)}
    </div>`;
  }

  function bindParamInputs(node, effect) {
    node.querySelectorAll('[data-param]').forEach(input => {
      const key = input.dataset.param;
      if (key === 'waveform') {
        input.value = effect.params.waveform || 'sawtooth';
      } else if (!input.value) {
        input.value = effect.params[key] ?? '';
      }
      const update = () => {
        effect.params[key] = key === 'waveform' ? input.value : Number(input.value);
        queueSave();
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });
  }

  function renderDubLab() {
    fxContainer.innerHTML = '';
    state.dubLab.effects.forEach((effect, index) => {
      effect = state.dubLab.effects[index] = normalizeEffect(effect);
      const node = fxTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector('.item-title').textContent = `FX ${index + 1} · ${effect.label || 'Untitled'}`;

      const labelInput = node.querySelector('[data-key="label"]');
      const sublabelInput = node.querySelector('[data-key="sublabel"]');
      const sourceInput = node.querySelector('[data-key="source"]');
      const engineInput = node.querySelector('[data-key="engine"]');
      const audioInput = node.querySelector('[data-key="audioUrl"]');
      labelInput.value = effect.label;
      sublabelInput.value = effect.sublabel;
      sourceInput.value = effect.source;
      engineInput.value = effect.engine;
      audioInput.value = effect.audioUrl;

      labelInput.addEventListener('input', () => {
        effect.label = labelInput.value;
        node.querySelector('.item-title').textContent = `FX ${index + 1} · ${effect.label || 'Untitled'}`;
        queueSave();
      });
      sublabelInput.addEventListener('input', () => { effect.sublabel = sublabelInput.value; queueSave(); });
      audioInput.addEventListener('input', () => { effect.audioUrl = audioInput.value; queueSave(); });

      sourceInput.addEventListener('change', () => {
        effect.source = sourceInput.value === 'audio' ? 'audio' : 'generated';
        effect.params.audioVolume ??= 0.8;
        effect.params.playbackRate ??= 1;
        renderDubLab();
        queueSave();
      });
      engineInput.addEventListener('change', () => {
        effect.engine = engineInput.value;
        effect.params = effectParamDefaults(effect.engine);
        renderDubLab();
        queueSave();
      });

      const generated = effect.source !== 'audio';
      node.querySelectorAll('.generated-only').forEach(el => { el.hidden = !generated; });
      node.querySelectorAll('.audio-only').forEach(el => { el.hidden = generated; });
      const settings = node.querySelector('[data-settings]');
      settings.innerHTML = tuningFields(effect.engine, effect.params);
      bindParamInputs(node, effect);

      node.querySelector('[data-action="remove"]').addEventListener('click', () => {
        if (state.dubLab.effects.length === 1 && !confirm('Remove the last Dub Lab effect?')) return;
        state.dubLab.effects.splice(index, 1);
        renderDubLab();
        queueSave();
      });
      node.querySelector('[data-action="move-up"]').addEventListener('click', () => {
        if (!index) return;
        [state.dubLab.effects[index - 1], state.dubLab.effects[index]] = [state.dubLab.effects[index], state.dubLab.effects[index - 1]];
        renderDubLab();
        queueSave();
      });
      node.querySelector('[data-action="move-down"]').addEventListener('click', () => {
        if (index >= state.dubLab.effects.length - 1) return;
        [state.dubLab.effects[index + 1], state.dubLab.effects[index]] = [state.dubLab.effects[index], state.dubLab.effects[index + 1]];
        renderDubLab();
        queueSave();
      });

      fxContainer.appendChild(node);
    });
  }

  function renderLinks() {
    linkContainer.innerHTML = '';
    state.links.forEach((link, index) => {
      const row = document.createElement('div');
      row.className = 'simple-item';
      row.innerHTML = `
        <label class="field"><span>Label</span><input type="text" data-role="label"></label>
        <label class="field"><span>URL / mailto:</span><input type="text" data-role="url" placeholder="https://… or mailto:…"></label>
        <button type="button" class="remove-link">Remove</button>`;
      const label = row.querySelector('[data-role="label"]');
      const url = row.querySelector('[data-role="url"]');
      label.value = link.label || '';
      url.value = link.url || '';
      label.addEventListener('input', () => { state.links[index].label = label.value; queueSave(); });
      url.addEventListener('input', () => { state.links[index].url = url.value; queueSave(); });
      row.querySelector('.remove-link').addEventListener('click', () => {
        state.links.splice(index, 1);
        renderLinks();
        queueSave();
      });
      linkContainer.appendChild(row);
    });
  }

  function sendPreview() {
    if (!preview.contentWindow) return;
    preview.contentWindow.postMessage({ type: 'SKANK_E_PREVIEW', data: clone(state) }, '*');
  }

  function downloadBlob(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function exportSiteData() {
    const header = `/* Generated by Skank-E private editor. */\n\nwindow.SKANK_E_DATA = `;
    downloadBlob('site-data.js', `${header}${JSON.stringify(state, null, 2)};\n`, 'text/javascript;charset=utf-8');
    setStatus('site-data.js downloaded — replace the old file to publish', true);
  }

  function exportBackup() {
    downloadBlob('skank-e-content-backup.json', `${JSON.stringify(state, null, 2)}\n`, 'application/json;charset=utf-8');
    setStatus('JSON backup downloaded', true);
  }

  document.getElementById('add-release').addEventListener('click', () => {
    state.releases.push(releaseDefaults());
    renderReleases();
    queueSave();
    releaseContainer.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('add-fx').addEventListener('click', () => {
    state.dubLab.effects.push(effectDefaults());
    renderDubLab();
    queueSave();
    fxContainer.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('add-link').addEventListener('click', () => {
    state.links.push({ label: 'New link', url: '' });
    renderLinks();
    queueSave();
  });

  document.getElementById('reset-draft').addEventListener('click', () => {
    if (!confirm('Reset the editor draft to the current site-data.js file?')) return;
    localStorage.removeItem(DRAFT_KEY);
    location.reload();
  });

  document.getElementById('download-data').addEventListener('click', exportSiteData);
  document.getElementById('download-data-bottom').addEventListener('click', exportSiteData);
  document.getElementById('download-backup').addEventListener('click', exportBackup);
  document.getElementById('refresh-preview').addEventListener('click', () => {
    preview.src = `index.html?editor-preview=1&t=${Date.now()}`;
  });
  preview.addEventListener('load', () => setTimeout(sendPreview, 80));

  fillSiteFields();
  fillDubLabFields();
  renderReleases();
  renderPlayers();
  renderDubLab();
  renderLinks();

  if (loadDraft()) setStatus('Private browser draft restored', true);
  else setStatus('Loaded from site-data.js');
  setTimeout(sendPreview, 220);
})();
