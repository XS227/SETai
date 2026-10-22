'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const number = (n, digits = 0) => Number(n).toLocaleString('nb-NO', {maximumFractionDigits: digits, minimumFractionDigits: digits});
  const clock = timestamp => new Date(timestamp * 1000).toLocaleTimeString('nb-NO', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  const bytes = n => {
    if (!Number.isFinite(n)) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(Math.max(n, 1)) / Math.log(1024)));
    return number(n / 1024 ** index, index > 1 ? 1 : 0) + ' ' + units[index];
  };
  let sample = null, history = [], lastHistory = 0, fetching = false, testing = false;
  const servers = {setaei: 'SETAEI', realgram: 'Realgram', biab: 'BIAB'};
  let selected = 'setaei', generation = 0;
  const states = {};
  const tabTimes = {}, tabErrors = {};
  const endpoint = (id, kind) => id === 'setaei' ? `/server/${kind}.json` : `/server/remote/${id}/${kind}`;
  $('year').textContent = new Date().getFullYear();
  const set = (id, text) => { $(id).textContent = text; };
  function value(id, n, unit) {
    $(id).replaceChildren(document.createTextNode(n === null ? '—' : number(n, unit === '%' ? 1 : 0)));
    const suffix = document.createElement('span'); suffix.textContent = unit; $(id).append(suffix);
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
    set('chart-note', duration < 900 ? `${number(duration / 60, 1)} minutter med målte data` : '180 målepunkter · 5 sekunders intervall');
    const recent = points.slice(-60), scale = Math.max(1024, ...recent.flatMap(p => [p.rx, p.tx]));
    $('network-chart').innerHTML = path(line(recent, 'rx', 600, 80, scale), 'var(--blue)') + path(line(recent, 'tx', 600, 80, scale), 'var(--orange)');
  }
  function connection(state, message) {
    $('connection').className = 'live-badge ' + state;
    $('connection').lastElementChild.textContent = message;
    document.body.classList.toggle('unavailable', state !== '');
    tabErrors[selected] = state === 'error';
    updateBadges();
    for (const icon of document.querySelectorAll('.small-live')) { icon.style.color = state ? 'var(--muted)' : ''; icon.lastChild.textContent = state ? ' PAUSE' : ' LIVE'; }
  }
  function updateBadges() {
    for (const id of Object.keys(servers)) {
      const indicator = $('state-' + id), stamp = tabTimes[id];
      const age = stamp ? Math.max(0, Date.now() / 1000 - stamp) : Infinity;
      indicator.textContent = tabErrors[id] ? 'Ingen forbindelse' : !stamp ? 'Venter' : age > 60 ? 'Eldre måling' : age > 20 ? 'Venter på data' : 'Live';
      indicator.className = tabErrors[id] || (stamp && age > 60) ? 'error' : !stamp || age > 20 ? 'stale' : 'good';
    }
  }
  async function probeOtherServers() {
    if (document.hidden || testing) return;
    await Promise.all(Object.keys(servers).filter(id => id !== selected).map(async id => {
      try {
        const data = await (await request(endpoint(id, 'live') + '?t=' + Date.now())).json();
        if (data.schema !== 1 || !Number.isFinite(data.timestamp) || (id !== 'setaei' && data.server_id !== id)) throw new Error('Ugyldig måling');
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
      connection('error', 'Ingen ferske målinger');
      set('health-title', 'Målinger er utilgjengelige');
      set('health-description', 'Siste måling er over ett minutt gammel. Prøver igjen automatisk.');
      set('health-icon', '!');
      for (const id of ['service-web', 'service-php']) { set(id, 'Ukjent · eldre måling'); $(id).className = ''; }
    } else if (age > 20) {
      connection('stale', 'Venter på nye data');
      set('health-title', 'Målingene er forsinket');
      set('health-description', 'Verdiene nedenfor viser siste mottatte måling.');
    }
  }
  function render(data, latency) {
    sample = data;
    tabTimes[selected] = data.timestamp;
    connection('', 'Live · tilkoblet');
    set('last-update', clock(data.timestamp));
    const days = Math.floor(data.uptime_seconds / 86400), hours = Math.floor(data.uptime_seconds % 86400 / 3600), minutes = Math.floor(data.uptime_seconds % 3600 / 60);
    set('uptime', (days ? days + ' d ' : '') + hours + ' t ' + minutes + ' min');
    value('cpu-value', data.cpu.percent, '%'); value('ram-value', data.memory.percent, '%'); value('disk-value', data.disk.percent, '%'); value('latency-value', latency, 'ms');
    bar('cpu-bar', data.cpu.percent ?? 0); bar('ram-bar', data.memory.percent); bar('disk-bar', data.disk.percent); bar('swap-bar', data.swap.percent);
    set('cpu-detail', `${data.cpu.cores} ${data.cpu.cores === 1 ? 'vCPU' : 'vCPU-er'} · målt over ${data.interval_seconds} sekunder`);
    set('ram-detail', `${bytes(data.memory.used)} av ${bytes(data.memory.total)} i bruk`);
    set('disk-detail', `${bytes(data.disk.used)} brukt av ${bytes(data.disk.total)}`); set('disk-free', `${bytes(data.disk.available)} tilgjengelig`);
    set('network-in', bytes(data.network.rx_bytes_per_second) + '/s'); set('network-out', bytes(data.network.tx_bytes_per_second) + '/s');
    set('swap-value', data.swap.total ? number(data.swap.percent, 1) + ' %' : 'Ikke konfigurert');
    set('swap-detail', `${bytes(data.swap.used)} av ${bytes(data.swap.total)} · lagringsplass som ekstra minne`);
    data.load_average.forEach((n, i) => set(['load-1', 'load-5', 'load-15'][i], number(n, 2)));
    set('load-detail', `Belastning per ${data.cpu.cores} vCPU. Over ${data.cpu.cores} kan bety at oppgaver venter.`);
    for (const [key, id] of [['web', 'service-web'], ['php', 'service-php']]) {
      const state = data.services[key]; set(id, state === true ? '● Kjører' : state === false ? '● Stoppet' : 'Ukjent'); $(id).className = state === true ? 'good' : state === false ? 'bad' : '';
    }
    const warnings = [];
    if (data.cpu.percent >= 90) warnings.push('Høy CPU-bruk akkurat nå.');
    if (data.memory.percent >= 90) warnings.push('Lite ledig arbeidsminne.');
    if (data.disk.percent >= 85) warnings.push('Disken begynner å bli full.');
    if (data.swap.percent >= 85) warnings.push('Mye swap er i bruk.');
    const stopped = Object.values(data.services).some(s => s === false);
    $('alert').hidden = !warnings.length; set('alert', warnings.join(' '));
    set('health-title', stopped ? 'En tjeneste trenger tilsyn' : warnings.length ? 'Serveren kjører · kapasitetsvarsel' : 'Serveren er i drift');
    set('health-description', stopped ? 'Se tjenestestatus nedenfor.' : warnings.length ? 'Se kapasitetsvarselet og de løpende målingene.' : `Live målinger mottas fra ${servers[selected]}-serveren.`);
    set('health-icon', stopped || warnings.length ? '!' : '✓');
    $('health-icon').style.color = stopped ? 'var(--red)' : warnings.length ? 'var(--orange)' : '';
    if (!history.length || history.at(-1).timestamp < data.timestamp) history.push({timestamp: data.timestamp, cpu: data.cpu.percent, memory: data.memory.percent, rx: data.network.rx_bytes_per_second, tx: data.network.tx_bytes_per_second});
    history = history.slice(-180); charts(); freshness();
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
      if (data.schema !== 1 || !Number.isFinite(data.timestamp) || !data.memory || !data.cpu) throw new Error('Ugyldige målinger');
      if (ownServer !== 'setaei' && data.server_id !== ownServer) throw new Error('Feil server');
      render(data, latency);
      if (Date.now() - lastHistory > 30000) {
        try {
          const past = await (await request(endpoint(ownServer, 'history') + '?t=' + Date.now())).json();
          if (ownGeneration !== generation) return;
          if (!Array.isArray(past.points)) throw new Error('Ugyldig historikk');
          history = past.points.filter(p => Number.isFinite(p.timestamp)).slice(-180); lastHistory = Date.now(); charts();
        } catch { /* Keep the already measured local history. */ }
      }
    } catch {
      if (ownGeneration !== generation) return;
      connection('error', 'Tilkobling avbrutt');
      set('health-title', 'Kan ikke hente serverstatus');
      set('health-description', sample ? 'Viser siste mottatte måling for ' + servers[selected] + '. Prøver igjen automatisk.' : 'Ingen målinger fra ' + servers[selected] + ' er tilgjengelige.');
      set('health-icon', '!');
      for (const id of ['service-web', 'service-php']) { set(id, 'Ukjent'); $(id).className = ''; }
    } finally { if (ownGeneration === generation) fetching = false; }
  }
  function selectServer(id) {
    if (!Object.hasOwn(servers, id)) id = 'setaei';
    if (sample) states[selected] = {sample, history, lastHistory};
    selected = id; generation++; fetching = false;
    sample = null; history = []; lastHistory = 0;
    for (const tab of document.querySelectorAll('[data-server]')) {
      const active = tab.dataset.server === selected;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    }
    $('server-view').setAttribute('aria-labelledby', 'tab-' + selected);
    set('server-label', servers[selected].toUpperCase() + ' / SERVERSTATUS');
    set('health-title', 'Henter målinger fra ' + servers[selected]);
    set('health-description', 'Kobler til valgt server …');
    set('health-icon', '◌'); $('health-icon').style.color = '';
    for (const id of ['cpu-value', 'ram-value', 'disk-value']) value(id, null, '%');
    value('latency-value', null, 'ms');
    for (const id of ['cpu-bar', 'ram-bar', 'disk-bar', 'swap-bar']) bar(id, 0);
    for (const id of ['last-update', 'uptime', 'cpu-detail', 'ram-detail', 'disk-detail', 'disk-free', 'network-in', 'network-out', 'swap-value', 'swap-detail', 'load-1', 'load-5', 'load-15', 'chart-start']) set(id, '—');
    for (const id of ['service-web', 'service-php']) { set(id, 'Ukjent'); $(id).className = ''; }
    set('chart-note', 'Historikk for ' + servers[selected]); set('chart-end', 'Nå');
    $('alert').hidden = true; connection('stale', 'Kobler til ' + servers[selected]);
    if (states[id]) { history = states[id].history; lastHistory = states[id].lastHistory; render(states[id].sample, null); }
    charts(); refresh();
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
  $('speed-test').addEventListener('click', async () => {
    if (testing) return;
    testing = true; $('speed-test').disabled = true; $('speed-test').firstChild.textContent = 'Måler forbindelsen … ';
    set('speed-note', 'Måler tre responstider og laster ned 512 KB.');
    try {
      const timings = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now(); await (await request('/server/live.json?probe=' + Date.now())).arrayBuffer(); timings.push(performance.now() - start);
      }
      const start = performance.now();
      const payload = await (await request('/server/speed.bin?t=' + Date.now(), 20000)).arrayBuffer();
      const elapsed = (performance.now() - start) / 1000;
      if (payload.byteLength !== 524288 || elapsed <= 0) throw new Error('Ufullstendig nedlasting');
      const speed = payload.byteLength * 8 / elapsed / 1000000;
      $('speed-result').innerHTML = number(speed, 1) + ' <small>Mbit/s</small>';
      $('speed-latency').innerHTML = number(timings.sort((a, b) => a - b)[1]) + ' <small>ms</small>';
      set('speed-note', 'Fullført ' + new Date().toLocaleTimeString('nb-NO') + ' · Kort test; resultatet påvirkes av Wi-Fi, mobilnett og avstand.');
    } catch { set('speed-note', 'Testen kunne ikke fullføres. Sjekk forbindelsen og prøv igjen.'); }
    finally { testing = false; $('speed-test').disabled = false; $('speed-test').firstChild.textContent = 'Test igjen '; refresh(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { freshness(); refresh(); } });
  window.addEventListener('online', refresh);
  setInterval(refresh, 5000); setInterval(freshness, 1000); setInterval(probeOtherServers, 30000);
  selectServer(location.hash.slice(1)); probeOtherServers();
})();
