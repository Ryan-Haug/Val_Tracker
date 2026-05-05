// ─── DOM refs ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const errorPrompt = { cont: $('alert'), head: $('alertHead'), body: $('alertBody') };
const charts = { elo: $('eloGraph'), kda: $('kdaGraph'), shots: $('shotGraph') };
const headings = { quickHead: $('qshead'), graphHead: $('graphHead'), gameHead: $('gameHead') };
const quickStats = {
  qs1: $('qs1'), qs2: $('qs2'), qs3: $('qs3'), qs4: $('qs4'),
  qs5: $('qs5'), qs6: $('qs6'), qs7: $('qs7'), qs8: $('qs8')
};
const rankDisplay = { name: $('rankName'), elo: $('rankElo'), rr: $('rankRR') };
const userDisplay = { user: $('userDisplay'), key: $('keyDisplay') };
const cardCont = $('gameCont');
const modal = $('modal');

// ─── State ───────────────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 min
let user, mmr, games;
let currentFilter = 'all';   // 'all' | 'wins' | 'losses'
let currentSort = 'recent'; // 'recent' | 'RR' | 'KD' | 'HS'

// ─── Bootstrap ───────────────────────────────────────────────────────────────
init();

async function init() {
  user = {
    name: localStorage.getItem('name'),
    tag: localStorage.getItem('tag'),
    key: localStorage.getItem('key'),
  };

  if (!user.name || !user.tag || !user.key) {
    window.location.href = '../pages/login.html';
    return;
  }

  console.log('[init] fetching data');
  [mmr, games] = await Promise.all([fetchMMR(), fetchGames()]);

  if (!mmr || !games) throw new Error('Failed to fetch data');
  console.log('[init] data ready, rendering');

  const gameCount = games.data.length;
  const mmrCount = mmr.data.history.length;

  loadGameCards();
  loadQuickStats();
  loadGraphs();

  headings.quickHead.textContent = `Quick Stats · (${gameCount})`;
  headings.graphHead.textContent = `Graphs · (${mmrCount})`;
  headings.gameHead.textContent = `Games · (${gameCount})`;

  loadRankDisplay();
  updateUserDisplay();
  console.log('[init] done');
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { time, data } = JSON.parse(raw);
    return Date.now() - time < CACHE_TTL ? data : null;
  } catch { return null; }
}

function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ time: Date.now(), data }));
}

async function fetchJSON(url, label) {
  const res = await fetch(url, { headers: { Authorization: user.key } });
  if (!res.ok) {
    toggleError(true, `Error retrieving ${label}`, await res.text());
    throw new Error(`[${label}] HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchMMR() {
  const cached = getCached('mmrData');
  if (cached) { console.log('[fetchMMR] cache hit'); return cached; }
  const data = await fetchJSON(
    `https://api.henrikdev.xyz/valorant/v2/mmr-history/na/pc/${user.name}/${user.tag}`,
    'MMR'
  );
  setCache('mmrData', data);
  return data;
}

async function fetchGames() {
  const cached = getCached('gameData');
  if (cached) { console.log('[fetchGames] cache hit'); return cached; }
  const data = await fetchJSON(
    `https://api.henrikdev.xyz/valorant/v1/stored-matches/na/${user.name}/${user.tag}?size=10&mode=competitive`,
    'Games'
  );
  setCache('gameData', data);
  return data;
}

// ─── Game cards ───────────────────────────────────────────────────────────────
function loadGameCards() {
  const gd = games.data;
  const hd = mmr.data.history;

  // Filter
  const indices = gd.reduce((acc, _, i) => {
    if (currentFilter === 'all'
      || (currentFilter === 'wins' && hd[i].last_change > 0)
      || (currentFilter === 'losses' && hd[i].last_change < 0)) acc.push(i);
    return acc;
  }, []);

  // Sort
  const kd = i => gd[i].stats.kills / (gd[i].stats.deaths || 1);
  const hs = i => { const s = gd[i].stats.shots; return s.head / (s.head + s.body + s.leg || 1); };

  const sorters = {
    recent: (a, b) => a - b,
    RR: (a, b) => hd[b].last_change - hd[a].last_change,
    KD: (a, b) => kd(b) - kd(a),
    HS: (a, b) => hs(b) - hs(a),
  };
  indices.sort(sorters[currentSort] || sorters.recent);

  cardCont.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const i of indices) frag.appendChild(createCard(hd[i], gd[i].stats, gd[i].teams));
  cardCont.appendChild(frag);

  updateButtonStyles();
}

function setFilter(filter) {
  currentFilter = currentFilter === filter ? 'all' : filter;
  loadGameCards();
}

function setSortAndFilter(sort) {
  currentSort = currentSort === sort ? 'recent' : sort;
  loadGameCards();
}

function updateButtonStyles() {
  const opac = (id, active) => $(id).style.opacity = active ? '1' : '0.5';
  opac('filterWins', currentFilter === 'wins');
  opac('filterLosses', currentFilter === 'losses');
  opac('sortRR', currentSort === 'RR');
  opac('sortKD', currentSort === 'KD');
  opac('sortHS', currentSort === 'HS');
}

// ─── Quick stats ─────────────────────────────────────────────────────────────
function loadQuickStats() {
  const gd = games.data;
  const hd = mmr.data.history;
  const n = gd.length;

  let wins = 0, losses = 0, draws = 0,
    kills = 0, deaths = 0, assists = 0,
    totalRounds = 0, rrSum = 0,
    streak = 0, streakType = '';

  for (let i = 0; i < n; i++) {
    const change = hd[i].last_change;
    const s = gd[i].stats;
    const t = gd[i].teams;

    // win / loss / draw
    if (change > 0) wins++;
    else if (change < 0) losses++;
    else draws++;

    kills += s.kills;
    deaths += s.deaths;
    assists += s.assists;
    totalRounds += t.red + t.blue;
    rrSum += change;

    // streak (from index 0 = most recent)
    const outcome = change > 0 ? 'W' : change < 0 ? 'L' : 'D';
    if (i === 0) { streak = 1; streakType = outcome; }
    else if (outcome === streakType) streak++;
    else if (streak > 0); // already broken — keep counting stats but don't update streak
  }

  quickStats.qs1.textContent = Math.round(wins / (wins + losses + draws) * 100) + '%';
  quickStats.qs2.textContent = `${wins}/${losses}`;
  quickStats.qs3.textContent = kills;
  quickStats.qs4.textContent = deaths;
  quickStats.qs5.textContent = (rrSum >= 0 ? '+' : '') + Math.round(rrSum / n) + 'rr';
  quickStats.qs6.textContent = streakType + streak;
  quickStats.qs7.textContent = Math.round(totalRounds / n);
  quickStats.qs8.textContent = Math.round((kills + assists) / totalRounds * 100) + '%';
}

// ─── Rank display ─────────────────────────────────────────────────────────────
function loadRankDisplay() {
  const cur = mmr.data.history[0];
  rankDisplay.name.textContent = cur.tier.name;
  rankDisplay.elo.textContent = cur.elo + ' ELO';
  rankDisplay.rr.textContent = (cur.last_change > 0 ? '+' : '') + cur.last_change + 'rr';
  rankDisplay.rr.className = cur.last_change > 0 ? 'badgeWin' : cur.last_change < 0 ? 'badgeLoss' : 'badgeDraw';
}

// ─── User display ─────────────────────────────────────────────────────────────
function updateUserDisplay() {
  userDisplay.user.textContent = `User: ${user.name}#${user.tag}`;
  userDisplay.key.textContent = `Key: ${user.key.substring(0, 8)}…`;
}

// ─── Graphs ───────────────────────────────────────────────────────────────────
function loadGraphs() {
  const C = getComputedStyle(document.documentElement);
  const get = v => C.getPropertyValue(v).trim();
  const bg = get('--bg'), bgCard = get('--bg-card'), border = get('--border'),
    text1 = get('--text-1'), text2 = get('--text-2'), text3 = get('--text-3'),
    win = get('--win'), loss = get('--loss'), blue = get('--blue'), cyan = get('--cyan');
  const mono = "'JetBrains Mono', monospace";

  const base = {
    responsive: true,
    animation: { duration: 600 },
    plugins: {
      legend: { labels: { color: text2, font: { family: mono, size: 11 }, boxWidth: 10, padding: 16 } },
      tooltip: {
        backgroundColor: bgCard, borderColor: border, borderWidth: 1,
        titleColor: text1, bodyColor: text2,
        titleFont: { family: mono, size: 11 }, bodyFont: { family: mono, size: 11 },
        padding: 10, cornerRadius: 6
      },
      title: { display: true, color: '#f5f7fb' },
    },
    scales: {
      x: { grid: { color: 'rgba(36,48,64,0.6)', lineWidth: 1 }, ticks: { color: text3, font: { family: mono, size: 10 } }, border: { color: border } },
      y: { grid: { color: 'rgba(36,48,64,0.6)', lineWidth: 1 }, ticks: { color: text3, font: { family: mono, size: 10 } }, border: { color: border } },
    },
  };

  // ── ELO — uses full mmr history ─────────────────────────────────────────────
  const eloHistory = mmr.data.history.slice().reverse(); // oldest → newest
  new Chart(charts.elo, {
    type: 'line',
    data: {
      labels: eloHistory.map((_, i) => `G${i + 1}`),
      datasets: [{
        label: 'Elo',
        data: eloHistory.map(g => g.elo),
        borderColor: cyan, backgroundColor: 'rgba(34,211,238,0.07)',
        tension: 0.4, fill: true,
        pointBackgroundColor: eloHistory.map(g => g.last_change >= 0 ? win : loss),
        pointBorderColor: bg, pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
      }],
    },
    options: {
      ...base, scales: { ...base.scales, y: { ...base.scales.y, beginAtZero: false } },
      plugins: { ...base.plugins, title: { ...base.plugins.title, text: 'Rank Rating History' } }
    },
  });

  // ── KDA — uses all games ────────────────────────────────────────────────────
  const gdRev = games.data.slice().reverse(); // oldest → newest
  const mmrRev = mmr.data.history.slice(0, games.data.length).reverse();
  new Chart(charts.kda, {
    type: 'bar',
    data: {
      labels: gdRev.map((_, i) => `G${i + 1}`),
      datasets: [
        { label: 'Kills', data: gdRev.map(g => g.stats.kills), backgroundColor: 'rgba(52,211,153,0.75)', borderColor: win, borderWidth: 1, borderRadius: 3 },
        { label: 'Deaths', data: gdRev.map(g => g.stats.deaths), backgroundColor: 'rgba(248,113,113,0.75)', borderColor: loss, borderWidth: 1, borderRadius: 3 },
        { label: 'Assists', data: gdRev.map(g => g.stats.assists), backgroundColor: 'rgba(29,110,245,0.75)', borderColor: blue, borderWidth: 1, borderRadius: 3 },
      ],
    },
    options: {
      ...base, scales: { ...base.scales, y: { ...base.scales.y, beginAtZero: true } },
      plugins: { ...base.plugins, title: { ...base.plugins.title, text: 'KDA Per Game' } }
    },
  });

  // ── Shot distribution — aggregate all games ─────────────────────────────────
  let head = 0, body = 0, leg = 0;
  for (const g of games.data) { head += g.stats.shots.head; body += g.stats.shots.body; leg += g.stats.shots.leg; }

  new Chart(charts.shots, {
    type: 'doughnut',
    data: {
      labels: ['Headshots', 'Bodyshots', 'Legshots'],
      datasets: [{
        data: [head, body, leg],
        backgroundColor: ['rgba(34,211,238,0.8)', 'rgba(29,110,245,0.8)', 'rgba(143,163,191,0.8)'],
        borderColor: bg, borderWidth: 3, hoverOffset: 6
      }],
    },
    options: {
      ...base, cutout: '65%', scales: {},
      plugins: {
        ...base.plugins, legend: { ...base.plugins.legend, position: 'top' },
        title: { ...base.plugins.title, text: 'Shot Distribution' }
      }
    },
  });
}

// ─── Card factory ─────────────────────────────────────────────────────────────
function createCard(mmrData, s, rounds) {
  const change = mmrData.last_change;
  const outcome = change > 0 ? 'win' : change < 0 ? 'loss' : 'draw';
  const myRounds = rounds[s.team === 'Red' ? 'red' : 'blue'];
  const theirRounds = rounds[s.team === 'Red' ? 'blue' : 'red'];
  const totalShots = s.shots.head + s.shots.body + s.shots.leg;
  const kd = Math.round(s.kills / (s.deaths || 1) * 100) / 100;
  const hsP = Math.round(s.shots.head / totalShots * 100);

  const el = document.createElement('div');
  el.className = `card ${outcome}`;
  el.innerHTML = `
    <div class="cardHeader">
      <div>
        <h4>${mmrData.map.name} · ${s.character.name}</h4>
        <p>${new Date(mmrData.date).toLocaleString()}</p>
      </div>
      <p class="RRbadge">${outcome}: ${change > 0 ? '+' : ''}${change}rr</p>
    </div>
    <div class="cardBody">
      <div><p>Rank / Elo</p><h3>${mmrData.tier.name} | ${mmrData.elo}</h3></div>
      <div><p>Rounds</p><h3>${myRounds}/${theirRounds}</h3></div>
      <div><p>Combat Score</p><h3>${s.score} | avg: ${Math.round(s.score / (rounds.red + rounds.blue))}</h3></div>
      <div><p>KDA</p><h3>${s.kills}/${s.deaths}/${s.assists} | ${kd}</h3></div>
      <div><p>Shots (h/b/l)</p><h3>${s.shots.head}/${s.shots.body}/${s.shots.leg} | ${hsP}% hs</h3></div>
      <div><p>Match ID</p><h5>${mmrData.match_id}</h5></div>
    </div>`;
  return el;
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
function changeUser() {
  showModal('Change User', 'Enter your Valorant username and tag',
    [{ type: 'text', id: 'newName', placeholder: 'Username', value: user.name },
    { type: 'text', id: 'newTag', placeholder: 'Tag (e.g., 1234)', value: user.tag }],
    () => {
      const name = $('newName')?.value.trim();
      const tag = $('newTag')?.value.trim();
      if (!name || name.length < 3 || name.length > 16) return showError('Error', 'Username must be 3–16 characters');
      if (!tag || tag.length < 3 || tag.length > 5) return showError('Error', 'Tag must be 3–5 characters');
      localStorage.setItem('name', name);
      localStorage.setItem('tag', tag);
      user.name = name; user.tag = tag;
      refreshData();
    }
  );
}

function changeKey() {
  showModal('Change API Key', 'Enter your Valorant API key',
    [{ type: 'password', id: 'newKey', placeholder: 'API Key (starts with HDEV)', value: user.key }],
    () => {
      const key = $('newKey')?.value.trim();
      if (!key) return showError('Error', 'API key is required');
      if (!key.startsWith('HDEV')) return showError('Error', 'Invalid API key (must start with HDEV)');
      localStorage.setItem('key', key);
      user.key = key;
      refreshData();
    }
  );
}

function refreshData() {
  localStorage.removeItem('mmrData');
  localStorage.removeItem('gameData');
  location.reload();
}

function clearData() {
  localStorage.clear();
  location.reload();
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function showModal(title, message, inputs = [], onConfirm = null, isError = false) {
  $('modalTitle').textContent = title;
  $('modalMessage').textContent = message;

  const inputsEl = $('modalInputs');
  const confirmBtn = $('modalConfirm');
  const cancelBtn = $('modalCancel');

  inputsEl.innerHTML = '';
  for (const { type, id, placeholder, value = '' } of inputs) {
    const el = document.createElement('input');
    Object.assign(el, { type, id, placeholder, value, className: 'modal-input' });
    inputsEl.appendChild(el);
  }

  if (isError) {
    cancelBtn.style.display = 'none';
    confirmBtn.textContent = 'OK';
    confirmBtn.onclick = closeModal;
  } else {
    cancelBtn.style.display = '';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.onclick = () => { onConfirm?.(); closeModal(); };
  }

  modal.classList.remove('hidden');
}

function showError(title, message) {
  showModal(title, message, [], null, true);
}

// called from fetch helpers on HTTP errors
function toggleError(visible, title = '', message = '') {
  if (visible) showError(title, message);
  else closeModal();
}

function closeModal() {
  modal.classList.add('hidden');
  $('modalInputs').innerHTML = '';
  $('modalCancel').style.display = '';
  $('modalConfirm').textContent = 'Confirm';
}