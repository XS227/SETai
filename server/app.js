'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const translations = window.STATUS_TRANSLATIONS;
  let language = 'en';
  try { language = new URLSearchParams(location.search).get('lang') || localStorage.getItem('server-language') || 'en'; } catch {}
  if (!['en', 'fa'].includes(language)) language = 'en';
  const locale = () => language === 'fa' ? 'fa-IR' : 'en-GB';
  const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.split('{' + name + '}').join(String(value)), translations[language][key] ?? translations.en[key] ?? key);
  const number = (n, digits = 0) => Number(n).toLocaleString(locale(), {maximumFractionDigits: digits, minimumFractionDigits: digits});
  const clock = timestamp => new Date(timestamp * 1000).toLocaleTimeString(locale(), {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  const bytes = n => {
    if (!Number.isFinite(n)) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(Math.max(n, 1)) / Math.log(1024)));
    return number(n / 1024 ** index, index > 1 ? 1 : 0) + ' ' + units[index];
  };
  let sample = null, history = [], lastHistory = 0, fetching = false, testing = false;
  const servers = {setaei: 'SETAEI / Web', biab: 'Apps / BIAP'};
  let selected = 'setaei', generation = 0, lastLatency = null;
  let projectSort = 'disk_bytes', projectDescending = true;
  let speedData = null, speedNoteKey = 'shortTest', speedNoteValues = {};
  const states = {};
  const tabTimes = {}, tabErrors = {};
  const endpoint = (id, kind) => id === 'setaei' ? `/server/${kind}.json` : `/server/remote/${id}/${kind}`;
  $('year').textContent = new Date().getFullYear();
  const set = (id, text) => { $(id).textContent = text; };
  function value(id, n, unit) {
    $(id).replaceChildren(document.createTextNode(n === null ? '—' : number(n, unit === '%' ? 1 : 0)));
    const suffix = document.createElement('span'); suffix.textContent = unit === '%' ? t('percent') : unit === 'ms' ? t('ms') : unit; $(id).append(suffix);
  }
  function bar(id, n) {
    $(id).style.width = Math.max(0, Math.min(100, n)) + '%';
    $(id).style.background = n >= 95 ? 'var(--red)' : n >= 85 ? 'var(--orange)' : '';
  }
  function line(points, field, width, height, max = 100, start = null, end = null) {
    const valid = points.filter(p => Number.isFinite(p[field]));
    if (valid.length < 2) return '';
    const from = start ?? valid[0].timestamp, to = end ?? valid.at(-1).timestamp;
    return valid.map((p, i) => `${i ? 'L' : 'M'}${Math.max(0, Math.min(width, (p.timestamp - from) / Math.max(1, to - from) * width)).toFixed(1)},${(height - Math.max(0, Math.min(max, p[field])) / Math.max(max, 1) * (height - 4) - 2).toFixed(1)}`).join(' ');
  }
  function path(d, color, extra = '') { return d ? `<path class="data-line" d="${d}" stroke="${color}" ${extra}/>` : ''; }
  function charts() {
    const points = history.filter(p => sample && p.timestamp >= sample.timestamp - 900);
    $('cpu-spark').innerHTML = path(line(points.slice(-36), 'cpu', 300, 46), 'var(--orange)');
    $('ram-spark').innerHTML = path(line(points.slice(-36), 'memory', 300, 46), 'var(--blue)');
    $('chart-empty').hidden = points.length >= 2;
    if (points.length < 2) {
      $('history-chart').innerHTML = '<path class="gridline" d="M0 1H1000 M0 100H1000 M0 199H1000"/>';
      $('network-chart').innerHTML = '';
      return;
    }
    const end = sample.timestamp, start = end - 900;
    $('history-chart').innerHTML = '<path class="gridline" d="M0 1H1000 M0 100H1000 M0 199H1000"/>' + path(line(points, 'memory', 1000, 200, 100, start, end), 'var(--blue)') + path(line(points, 'cpu', 1000, 200, 100, start, end), 'var(--orange)');
    set('chart-start', clock(start)); set('chart-end', clock(end));
    const duration = Math.max(0, points.at(-1).timestamp - points[0].timestamp);
    set('chart-note', duration < 900 ? t('minutesData', {n: number(duration / 60, 1)}) : t('fullHistory'));
    const recent = points.slice(-60), scale = Math.max(1024, ...recent.flatMap(p => [p.rx, p.tx]));
    $('network-chart').innerHTML = path(line(recent, 'rx', 600, 80, scale), 'var(--blue)') + path(line(recent, 'tx', 600, 80, scale), 'var(--orange)');
  }
  function connection(state, message) {
    $('connection').className = 'live-badge ' + state;
    $('connection').lastElementChild.textContent = message;
    document.body.classList.toggle('unavailable', state !== '');
    tabErrors[selected] = state === 'error';
    updateBadges();
    set('network-live', t(state ? 'paused' : 'live'));
  }
  function updateBadges() {
    for (const id of Object.keys(servers)) {
      const indicator = $('state-' + id), stamp = tabTimes[id];
      const age = stamp ? Math.max(0, Date.now() / 1000 - stamp) : Infinity;
      indicator.textContent = tabErrors[id] ? t('disconnected') : !stamp ? t('waiting') : age > 60 ? t('oldSample') : age > 20 ? t('waitingData') : t('live');
      indicator.className = tabErrors[id] || (stamp && age > 60) ? 'error' : !stamp || age > 20 ? 'stale' : 'good';
    }
  }
  async function probeOtherServers() {
    if (document.hidden || testing) return;
    await Promise.all(Object.keys(servers).filter(id => id !== selected).map(async id => {
      try {
        const data = await (await request(endpoint(id, 'live') + '?t=' + Date.now())).json();
        if (data.schema !== 1 || !Number.isFinite(data.timestamp) || (id !== 'setaei' && data.server_id !== id)) throw new Error('Invalid measurement');
        tabTimes[id] = data.timestamp; tabErrors[id] = false;
      } catch { tabErrors[id] = true; }
    }));
    updateBadges();
  }
  function freshness() {
    updateBadges();
    if (!sample) return;
    const age = Math.max(0, Date.now() / 1000 - sample.timestamp);
    if (age > 60) {
      connection('error', t('unavailable'));
      set('health-title', t('unavailable'));
      set('health-description', t('tooOld'));
      set('health-icon', '!');
      for (const id of ['service-web', 'service-php']) { set(id, t('unknown') + ' · ' + t('oldSample')); $(id).className = ''; }
    } else if (age > 20) {
      connection('stale', t('waitingData'));
      set('health-title', t('delayed'));
      set('health-description', t('lastKnown'));
    }
  }
  function render(data, latency) {
    sample = data; lastLatency = latency;
    tabTimes[selected] = data.timestamp;
    connection('', t('connected'));
    set('last-update', clock(data.timestamp));
    const days = Math.floor(data.uptime_seconds / 86400), hours = Math.floor(data.uptime_seconds % 86400 / 3600), minutes = Math.floor(data.uptime_seconds % 3600 / 60);
    set('uptime', (days ? number(days) + ' ' + t('day') + ' ' : '') + number(hours) + ' ' + t('hour') + ' ' + number(minutes) + ' ' + t('minute'));
    value('cpu-value', data.cpu.percent, '%'); value('ram-value', data.memory.percent, '%'); value('disk-value', data.disk.percent, '%'); value('latency-value', latency, 'ms');
    bar('cpu-bar', data.cpu.percent ?? 0); bar('ram-bar', data.memory.percent); bar('disk-bar', data.disk.percent); bar('swap-bar', data.swap.percent);
    set('cpu-detail', t('cpuDetail', {n: number(data.cpu.cores)}));
    set('ram-detail', t('usedOf', {used: bytes(data.memory.used), total: bytes(data.memory.total)}));
    set('disk-detail', t('usedOf', {used: bytes(data.disk.used), total: bytes(data.disk.total)})); set('disk-free', t('available', {n: bytes(data.disk.available)}));
    set('network-in', bytes(data.network.rx_bytes_per_second) + t('perSecond')); set('network-out', bytes(data.network.tx_bytes_per_second) + t('perSecond'));
    set('swap-value', data.swap.total ? number(data.swap.percent, 1) + ' ' + t('percent') : t('notConfigured'));
    set('swap-detail', t('swapDetail', {used: bytes(data.swap.used), total: bytes(data.swap.total)}));
    data.load_average.forEach((n, i) => set(['load-1', 'load-5', 'load-15'][i], number(n, 2)));
    set('load-detail', t('loadDetail', {n: number(data.cpu.cores)}));
    for (const [key, id] of [['web', 'service-web'], ['php', 'service-php']]) {
      const state = data.services[key]; set(id, state === true ? '● ' + t('running') : state === false ? '● ' + t('stopped') : t('unknown')); $(id).className = state === true ? 'good' : state === false ? 'bad' : '';
    }
    const warnings = [];
    if (data.cpu.percent >= 90) warnings.push(t('cpuHigh'));
    if (data.memory.percent >= 90) warnings.push(t('ramHigh'));
    if (data.disk.percent >= 85) warnings.push(t('diskHigh'));
    if (data.swap.percent >= 85) warnings.push(t('swapHigh'));
    const stopped = Object.values(data.services).some(s => s === false);
    $('alert').hidden = !warnings.length; set('alert', warnings.join(' '));
    set('health-title', stopped ? t('serviceAttention') : warnings.length ? t('capacityWarning') : t('serverRunning'));
    set('health-description', stopped ? t('seeServices') : warnings.length ? t('seeCapacity') : t('receiving', {server: servers[selected]}));
    set('health-icon', stopped || warnings.length ? '!' : '✓');
    $('health-icon').style.color = stopped ? 'var(--red)' : warnings.length ? 'var(--orange)' : '';
    if (!history.length || history.at(-1).timestamp < data.timestamp) history.push({timestamp: data.timestamp, cpu: data.cpu.percent, memory: data.memory.percent, rx: data.network.rx_bytes_per_second, tx: data.network.tx_bytes_per_second});
    history = history.slice(-180); charts(); renderProjects(); freshness();
  }
  async function request(url, timeout = 6000) {
    const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(timeout)});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response;
  }
  async function refresh() {
    if (fetching || testing || document.hidden) return;
    fetching = true;
    const ownGeneration = generation, ownServer = selected;
    try {
      const start = performance.now();
      const response = await request(endpoint(ownServer, 'live') + '?t=' + Date.now());
      const data = await response.json(); const latency = performance.now() - start;
      if (ownGeneration !== generation) return;
      if (data.schema !== 1 || !Number.isFinite(data.timestamp) || !data.memory || !data.cpu) throw new Error('Invalid measurements');
      if (ownServer !== 'setaei' && data.server_id !== ownServer) throw new Error('Wrong server');
      render(data, latency);
      if (Date.now() - lastHistory > 30000) {
        try {
          const past = await (await request(endpoint(ownServer, 'history') + '?t=' + Date.now())).json();
          if (ownGeneration !== generation) return;
          if (!Array.isArray(past.points)) throw new Error('Invalid history');
          history = past.points.filter(p => Number.isFinite(p.timestamp)).slice(-180); lastHistory = Date.now(); charts();
        } catch { /* Keep the already measured local history. */ }
      }
    } catch {
      if (ownGeneration !== generation) return;
      connection('error', t('disconnected'));
      set('health-title', t('cannotFetch'));
      set('health-description', sample ? t('lastFor', {server: servers[selected]}) : t('noneFor', {server: servers[selected]}));
      set('health-icon', '!');
      for (const id of ['service-web', 'service-php']) { set(id, t('unknown')); $(id).className = ''; }
    } finally { if (ownGeneration === generation) fetching = false; }
  }
  function selectServer(id) {
    if (!Object.hasOwn(servers, id)) id = 'setaei';
    if (sample) states[selected] = {sample, history, lastHistory};
    selected = id; generation++; fetching = false;
    sample = null; history = []; lastHistory = 0; lastLatency = null;
    for (const tab of document.querySelectorAll('[data-server]')) {
      const active = tab.dataset.server === selected;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    }
    $('server-view').setAttribute('aria-labelledby', 'tab-' + selected);
    set('server-label', t('serverLabel', {server: servers[selected]}));
    set('health-title', t('loadingServer', {server: servers[selected]}));
    set('health-description', t('selectedConnecting'));
    set('health-icon', '◌'); $('health-icon').style.color = '';
    for (const id of ['cpu-value', 'ram-value', 'disk-value']) value(id, null, '%');
    value('latency-value', null, 'ms');
    for (const id of ['cpu-bar', 'ram-bar', 'disk-bar', 'swap-bar']) bar(id, 0);
    for (const id of ['last-update', 'uptime', 'cpu-detail', 'ram-detail', 'disk-detail', 'disk-free', 'network-in', 'network-out', 'swap-value', 'swap-detail', 'load-1', 'load-5', 'load-15', 'chart-start']) set(id, '—');
    for (const id of ['service-web', 'service-php']) { set(id, t('unknown')); $(id).className = ''; }
    set('chart-note', t('historyFor', {server: servers[selected]})); set('chart-end', t('now'));
    $('alert').hidden = true; connection('stale', t('connectingServer', {server: servers[selected]}));
    if (states[id]) { history = states[id].history; lastHistory = states[id].lastHistory; render(states[id].sample, null); }
    charts(); renderProjects(); refresh();
  }
  const tabs = [...document.querySelectorAll('[data-server]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { location.hash = tab.dataset.server; });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus(); location.hash = tabs[next].dataset.server;
    });
  });
  window.addEventListener('hashchange', () => selectServer(location.hash.slice(1)));
  function renderSpeed() {
    if (speedData) {
      $('speed-result').replaceChildren(document.createTextNode(number(speedData.rate, 1) + ' '));
      const unit = document.createElement('small'); unit.textContent = 'Mbit/s'; $('speed-result').append(unit);
      $('speed-latency').replaceChildren(document.createTextNode(number(speedData.latency) + ' '));
      const ms = document.createElement('small'); ms.textContent = t('ms'); $('speed-latency').append(ms);
    }
    set('speed-button-label', t(testing ? 'measuring' : speedData ? 'tryAgain' : 'startTest'));
    set('speed-note', t(speedNoteKey, speedNoteValues));
  }
  $('speed-test').addEventListener('click', async () => {
    if (testing) return;
    testing = true; $('speed-test').disabled = true; speedNoteKey = 'speedMeasuring'; renderSpeed();
    try {
      const timings = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now(); await (await request('/server/live.json?probe=' + Date.now())).arrayBuffer(); timings.push(performance.now() - start);
      }
      const start = performance.now();
      const payload = await (await request('/server/speed.bin?t=' + Date.now(), 20000)).arrayBuffer();
      const elapsed = (performance.now() - start) / 1000;
      if (payload.byteLength !== 524288 || elapsed <= 0) throw new Error('Incomplete download');
      speedData = {rate: payload.byteLength * 8 / elapsed / 1000000, latency: timings.sort((a, b) => a - b)[1]};
      speedNoteKey = 'speedDone'; speedNoteValues = {time: clock(Date.now() / 1000)};
    } catch { speedNoteKey = 'speedFailed'; }
    finally { testing = false; $('speed-test').disabled = false; renderSpeed(); refresh(); }
  });
  function renderProjects() {
    const projects = sample?.projects;
    const rows = projects?.rows ?? [];
    $('project-table').hidden = rows.length === 0;
    $('projects-empty').hidden = rows.length > 0;
    set('projects-empty', t(sample ? 'noProjects' : 'projectsLoading'));
    set('projects-count', rows.length ? t('projectsCount', {n: number(rows.length)}) : '—');
    const body = $('project-rows'); body.replaceChildren();
    const sorted = [...rows].sort((a, b) => {
      if (a[projectSort] === null && b[projectSort] !== null) return 1;
      if (b[projectSort] === null && a[projectSort] !== null) return -1;
      const diff = (a[projectSort] ?? 0) - (b[projectSort] ?? 0);
      return (projectDescending ? -diff : diff) || a.name.localeCompare(b.name);
    });
    for (const row of sorted) {
      const tr = document.createElement('tr');
      const name = document.createElement('td'); name.className = 'project-name';
      const title = document.createElement('strong'); title.textContent = language === 'fa' ? row.name_fa : row.name; title.dir = 'auto'; name.append(title);
      const state = document.createElement('span'); state.className = 'project-state ' + row.status; state.textContent = t(row.status); name.append(state); tr.append(name);
      for (const [key, label, display] of [['cpu_percent', 'cpuColumn', row.cpu_percent === null ? '—' : number(row.cpu_percent, 1) + t('percent')], ['memory_bytes', 'ramColumn', bytes(row.memory_bytes)], ['disk_bytes', 'diskColumn', row.disk_bytes === null ? row.disk_timestamp ? '—' : t('scanning') : (row.disk_complete ? '' : '≥ ') + bytes(row.disk_bytes)], ['processes', 'processes', row.processes ? number(row.processes) : '—']]) {
        const td = document.createElement('td'); td.dataset.label = t(label); td.className = 'project-number';
        const span = document.createElement('span'); span.textContent = display; td.append(span);
        if (key === 'disk_bytes' && row.disk_bytes !== null && !row.disk_complete) { const partial = document.createElement('small'); partial.textContent = t('partial'); partial.className = 'partial'; td.append(partial); }
        tr.append(td);
      }
      body.append(tr);
    }
    const diskTimes = rows.map(row => row.disk_timestamp).filter(Number.isFinite);
    set('projects-scan', t(projects?.disk_scanning ? 'diskScanning' : diskTimes.length ? 'diskScanned' : 'diskWaiting', {time: diskTimes.length ? clock(Math.max(...diskTimes)) : '—'}));
    for (const button of document.querySelectorAll('[data-sort]')) {
      const selectedSort = button.dataset.sort === projectSort;
      button.parentElement.setAttribute('aria-sort', selectedSort ? (projectDescending ? 'descending' : 'ascending') : 'none');
      const key = {cpu_percent: 'cpuColumn', memory_bytes: 'ramColumn', disk_bytes: 'diskColumn'}[button.dataset.sort];
      button.textContent = t(key) + (selectedSort ? projectDescending ? ' ↓' : ' ↑' : '');
    }
  }
  for (const button of document.querySelectorAll('[data-sort]')) button.addEventListener('click', () => {
    projectDescending = projectSort === button.dataset.sort ? !projectDescending : true;
    projectSort = button.dataset.sort; renderProjects();
  });
  function applyLanguage(next) {
    language = next === 'fa' ? 'fa' : 'en';
    document.documentElement.lang = language; document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.title = t('title');
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
    for (const element of document.querySelectorAll('[data-aria]')) element.setAttribute('aria-label', t(element.dataset.aria));
    for (const button of document.querySelectorAll('[data-lang]')) button.setAttribute('aria-pressed', String(button.dataset.lang === language));
    try { localStorage.setItem('server-language', language); } catch {}
    set('year', new Date().getFullYear().toLocaleString(locale(), {useGrouping: false}));
    set('server-label', t('serverLabel', {server: servers[selected]}));
    if (sample) render(sample, lastLatency); else { set('health-title', t('loadingServer', {server: servers[selected]})); updateBadges(); renderProjects(); }
    renderSpeed();
  }
  for (const button of document.querySelectorAll('[data-lang]')) button.addEventListener('click', () => applyLanguage(button.dataset.lang));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { freshness(); refresh(); } });
  window.addEventListener('online', refresh);
  setInterval(refresh, 5000); setInterval(freshness, 1000); setInterval(probeOtherServers, 10000);
  applyLanguage(language); selectServer(location.hash.slice(1)); probeOtherServers();
})();
