const $ = id => document.getElementById(id);
const errorPrompt = { cont: $("alert"), head: $("alertHead"), body: $("alertBody") };
const charts = {elo: $('eloGraph'), kda: $('kdaGraph'), shots: $('shotGraph')};
const headings = {quickHead: $('qshead'), graphHead: $('graphHead'), gameHead: $('gameHead')};

const quickStats = {qs1: $("qs1"), qs2: $("qs2"), qs3: $("qs3"), qs4: $("qs4"), qs5: $("qs5"),
  qs6: $("qs6"), qs7: $("qs7"), qs8: $("qs8")};

const rankDisplay = {name: $("rankName"), elo: $("rankElo"), rr: $("rankRR")};

const cardCont = $("gameCont");

let user, mmr, games, refreshTimer;

//load page
init();

async function init() {
  refreshTimer = 1 * 60 * 1000; //total minutes * (seconds to ms)

  user = {
    name: localStorage.getItem('name'),
    tag: localStorage.getItem('tag'),
    key: localStorage.getItem('key')
  };

  if (!user.name || !user.tag || !user.key) {
    window.location.href = '../pages/login.html'
  }

  console.log('[init] fetching games');
  mmr = await fetchMMR();
  games = await fetchGames();

  if (!mmr || !games) {
    throw new Error("Failed to fetch games");
  }
  console.log('[init] games fetched succesfully, loading data');

  loadGameCards();
  loadQuickStats();
  loadGraphs();

  console.log('[init] data loaded, finalizing headers');
  headings.quickHead.textContent = `Quick Stats · (${games.data.length})`;
  headings.graphHead.textContent = `graphs · (${mmr.data.history.length})`;
  headings.gameHead.textContent = `Games · (${games.data.length})`;

  loadRankDisplay();

  console.log('[init] loading completed');
}

//======================================
//======================================

async function fetchMMR() {
  console.log("[fetchMMR] fetching data...");

  //check if there was data stored locally within the last 5 min
  if (localStorage.getItem("mmrData")) {
    const raw = localStorage.getItem("mmrData");
    const cached = JSON.parse(raw);

    if (Date.now() - cached.time < refreshTimer) {
      console.log("[fetchMMR] using cached data:", cached.data);
      return cached.data;
    }
  }

  //if data not found fetch from src
  let response = await fetch(
    `https://api.henrikdev.xyz/valorant/v2/mmr-history/na/pc/${user.name}/${user.tag}`,
    { headers: { Authorization: `${user.key}` } },
  );

  if (!response.ok) {
    toggleError(true, "Error retrieving data", await response.text());
    throw new Error("[fetchMMR] Error fetching mmr-history");
  }

  let result = await response.json();

  localStorage.setItem(
    "mmrData",
    JSON.stringify({
      time: Date.now(),
      data: result,
    }),
  );

  console.log("[fetchMMR] data fetched and cached successfully: \n", result);
  return result;
}

async function fetchGames() {
  console.log("[fetchGames] fetching data...");

  // check cache
  if (localStorage.getItem("gameData")) {
    const raw = localStorage.getItem("gameData");
    const cached = JSON.parse(raw);

    if (Date.now() - cached.time < refreshTimer) {
      console.log("[fetchGames] using cached data:", cached.data);
      return cached.data;
    }
  }

  // fetch from API
  let response = await fetch(
    `https://api.henrikdev.xyz/valorant/v1/stored-matches/na/${user.name}/${user.tag}?size=10&mode=competitive`,
    {
      headers: { Authorization: `${user.key}` },
    },
  );

  if (!response.ok) {
    toggleError(true, "Error retrieving matches", await response.text());
    throw new Error("[fetchGames] Error fetching stored matches");
  }

  let result = await response.json();

  localStorage.setItem(
    "gameData",
    JSON.stringify({
      time: Date.now(),
      data: result,
    }),
  );

  console.log("[fetchGames] data fetched and cached successfully:", result);
  return result;
}

function loadGameCards() {
  cardCont.innerHTML = '';
  for (let i = 0; i < games.data.length; i++) {
    cardCont.appendChild(createCard(mmr.data.history[i], games.data[i].stats, games.data[i].teams));
  }
}

function loadQuickStats() {
  let wins = 0, losses = 0, draws = 0, kills = 0, deaths = 0, assists = 0, totalRounds = 0, rrChanges = [];
  let currentStreak = 0, streakType = '';

  // Calculate streak from most recent game only (index 0 is most recent)
  for (let i = 0; i < games.data.length; i++) {
    const mmrData = mmr.data.history[i];

    // Determine outcome
    let outcome;
    if (mmrData.last_change > 0) {
      outcome = 'W';
    } else if (mmrData.last_change < 0) {
      outcome = 'L';
    } else {
      outcome = 'D';
    }

    // Calculate current streak from most recent game (index 0)
    if (i === 0) {
      currentStreak = 1;
      streakType = outcome;
    } else if (outcome === streakType) {
      currentStreak++;
    } else {
      break; // Stop counting streak when outcome changes
    }
  }

  // Calculate all stats from all 10 games (index 0 is most recent)
  for (let i = 0; i < games.data.length; i++) {
    const mmrData = mmr.data.history[i];
    const gameData = games.data[i].stats;
    const roundData = games.data[i].teams;

    // Win/Loss/Draw counts
    if (mmrData.last_change > 0) {
      wins++;
    } else if (mmrData.last_change < 0) {
      losses++;
    } else {
      draws++;
    }

    // KDA
    kills += gameData.kills;
    deaths += gameData.deaths;
    assists += gameData.assists;

    // Rounds
    totalRounds += roundData.red + roundData.blue;

    // RR changes
    rrChanges.push(mmrData.last_change);
  }

  const winrate = Math.round((wins / (wins + losses + draws)) * 100);
  const averageChange = Math.round(rrChanges.reduce((a, b) => a + b, 0) / rrChanges.length);
  const averageRounds = Math.round(totalRounds / games.data.length);
  const roundPartic = Math.round(((kills + assists) / totalRounds) * 100);
  const WLstreak = streakType + currentStreak;

  // Update UI
  quickStats.qs1.textContent = winrate + '%';
  quickStats.qs2.textContent = wins + '/' + losses;
  quickStats.qs3.textContent = kills;
  quickStats.qs4.textContent = deaths;
  quickStats.qs5.textContent = (averageChange > 0 ? '+' : '') + averageChange + 'rr';
  quickStats.qs6.textContent = WLstreak;
  quickStats.qs7.textContent = averageRounds;
  quickStats.qs8.textContent = roundPartic + '%';
}

function loadRankDisplay() {
  const currentMMR = mmr.data.history[0]; // Most recent MMR data
  rankDisplay.name.textContent = currentMMR.tier.name;
  rankDisplay.elo.textContent = currentMMR.elo + ' ELO';
  rankDisplay.rr.textContent = (currentMMR.last_change > 0 ? '+' : '') + currentMMR.last_change + 'rr';
  rankDisplay.rr.className = currentMMR.last_change > 0 ? 'badgeWin' : currentMMR.last_change < 0 ? 'badgeLoss' : 'badgeDraw';
}

function loadGraphs() {
  const C = getComputedStyle(document.documentElement);
  const get = v => C.getPropertyValue(v).trim();

  const bg       = get('--bg');
  const bgCard   = get('--bg-card');
  const border   = get('--border');
  const text1    = get('--text-1');
  const text2    = get('--text-2');
  const text3    = get('--text-3');
  const win      = get('--win');
  const loss     = get('--loss');
  const blue     = get('--blue');
  const cyan     = get('--cyan');

  const fontSmall = "'JetBrains Mono', monospace";

  const baseOptions = {
    responsive: true,
    animation: { duration: 600 },
    plugins: {
      legend: {
        labels: {
          color: text2,
          font: { family: fontSmall, size: 11 },
          boxWidth: 10,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: bgCard,
        borderColor: border,
        borderWidth: 1,
        titleColor: text1,
        bodyColor: text2,
        titleFont: { family: fontSmall, size: 11 },
        bodyFont:  { family: fontSmall, size: 11 },
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        grid:  { color: 'rgba(36,48,64,0.6)', lineWidth: 1 },
        ticks: { color: text3, font: { family: fontSmall, size: 10 } },
        border: { color: border }
      },
      y: {
        grid:  { color: 'rgba(36,48,64,0.6)', lineWidth: 1 },
        ticks: { color: text3, font: { family: fontSmall, size: 10 } },
        border: { color: border }
      }
    }
  };

  // ── ELO Over Time ──────────────────────────────────────────
  const eloHistory = mmr.data.history.slice().reverse();

  new Chart(charts.elo, {
    type: 'line',
    data: {
      labels: eloHistory.map((_, i) => `G${i + 1}`),
      datasets: [{
        label: 'Elo',
        data: eloHistory.map(g => g.elo),
        borderColor: cyan,
        backgroundColor: 'rgba(34,211,238,0.07)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: cyan,
        pointBorderColor: bg,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      ...baseOptions,
      scales: {
        ...baseOptions.scales,
        y: { ...baseOptions.scales.y, beginAtZero: false }
      },
      plugins: {
        title: {
          display: true,
          color: '#f5f7fb',
          text: 'Rank Rating History'
        }
      }
    }
  });

  // ── KDA Per Game ───────────────────────────────────────────
  new Chart(charts.kda, {
    type: 'bar',
    data: {
      labels: games.data.slice().reverse().map((_, i) => `G${i + 1}`),
      datasets: [
        {
          label: 'Kills',
          data: games.data.slice().reverse().map(g => g.stats.kills),
          backgroundColor: 'rgba(52,211,153,0.75)',
          borderColor: win,
          borderWidth: 1,
          borderRadius: 3
        },
        {
          label: 'Deaths',
          data: games.data.slice().reverse().map(g => g.stats.deaths),
          backgroundColor: 'rgba(248,113,113,0.75)',
          borderColor: loss,
          borderWidth: 1,
          borderRadius: 3
        },
        {
          label: 'Assists',
          data: games.data.slice().reverse().map(g => g.stats.assists),
          backgroundColor: 'rgba(29,110,245,0.75)',
          borderColor: blue,
          borderWidth: 1,
          borderRadius: 3
        }
      ]
    },
    options: {
      ...baseOptions,
      scales: {
        ...baseOptions.scales,
        y: { ...baseOptions.scales.y, beginAtZero: true }
      },
      plugins: {
        title: {
          display: true,
          color: '#f5f7fb',
          text: 'KDA'
        }
      }
    }
  });

  // ── Shot Distribution ──────────────────────────────────────
  let head = 0, body = 0, leg = 0;
  games.data.forEach(g => {
    head += g.stats.shots.head;
    body += g.stats.shots.body;
    leg  += g.stats.shots.leg;
  });

  new Chart(charts.shots, {
    type: 'doughnut',
    data: {
      labels: ['Headshots', 'Bodyshots', 'Legshots'],
      datasets: [{
        data: [head, body, leg],
        backgroundColor: [
          'rgba(34,211,238,0.8)',   // cyan  — headshots
          'rgba(29,110,245,0.8)',   // blue  — bodyshots
          'rgba(143,163,191,0.8)'   // text-2 — legshots
        ],
        borderColor: bg,
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      ...baseOptions,
      cutout: '65%',
      scales: {},   // no axes on doughnut
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins.legend,
          position: 'top'
        },
        title: {
          display: true,
          color: '#f5f7fb',
          text: 'Shot Distribution'
        }
      }
    }
  });
}

//=========================================================
// Helper Functions
//=========================================================

function createCard(mmrData, gameData, rounds) {
  const div = document.createElement("div");

  div.innerHTML = `
    <div class="card ${mmrData.last_change > 0 ? 'win' : mmrData.last_change < 0 ? 'loss' : ''}">
            <div class="cardHeader">
              <div>
                <h4>${mmrData.map.name} · ${gameData.character.name}</h4>
                <p>${new Date(mmrData.date).toLocaleString()}</p>
              </div>
              <p class="RRbadge">${mmrData.last_change > 0 ? 'win' : mmrData.last_change < 0 ? 'loss' : 'draw'}: ${mmrData.last_change}rr</p>
            </div>

            <div class="cardBody">
              <div>
                <p>Rank / Elo</p>
                <h3>${mmrData.tier.name} | ${mmrData.elo}</h3>
              </div>
              <div>
                <p>Rounds</p>
                <h3>${rounds[gameData.team == "Red" ? "red" : "blue"]}/${rounds[gameData.team == "Red" ? "blue" : "red"]}</h3>
              </div>
              <div>
                <p>Combat Score</p>
                <h3>${gameData.score} | avg: ${Math.round(gameData.score / (rounds.red + rounds.blue))}</h3>
              </div>
              <div>
                <p>KDA</p>
                <h3>${gameData.kills}/${gameData.deaths}/${gameData.assists} | ${Math.round((gameData.kills / gameData.deaths) * 100) / 100}</h3>
              </div>
              <div>
                <p>Shots (h/b/l)</p>
                <h3>${gameData.shots.head}/${gameData.shots.body}/${gameData.shots.leg} |
                ${Math.round((gameData.shots.head / (gameData.shots.head + gameData.shots.body + gameData.shots.leg)) * 100)}% hs</h3>
              </div>
              <div>
                <p>match id</p>
                <h5>${mmrData.match_id}</h5>
              </div>
            </div>
          </div>
`;

  return div.firstElementChild; // return the actual card
}

//=================================================================================
//    Buttons
//=================================================================================

function changeUser() {
  showModal(
    'Change User',
    'Enter your Valorant username and tag',
    [
      { type: 'text', id: 'newName', placeholder: 'Username', value: user.name },
      { type: 'text', id: 'newTag', placeholder: 'Tag (e.g., #1234)', value: user.tag }
    ],
    () => {
      const newName = document.getElementById('newName')?.value.trim();
      const newTag = document.getElementById('newTag')?.value.trim();

      // Validation
      if (!newName) {
        showError('Error', 'Username is required');
        return;
      }
      if (newName.length < 3 || newName.length > 16) {
        showError('Error', 'Username must be 3-16 characters');
        return;
      }
      if (!newTag) {
        showError('Error', 'Tag is required');
        return;
      }
      if (newTag.length < 3 || newTag.length > 5) {
        showError('Error', 'Tag must be 3-5 characters');
        return;
      }

      localStorage.setItem('name', newName);
      localStorage.setItem('tag', newTag);
      user.name = newName;
      user.tag = newTag;
      location.reload();
    }
  );
}

function changeKey() {
  showModal(
    'Change API Key',
    'Enter your Valorant API key',
    [
      { type: 'password', id: 'newKey', placeholder: 'API Key (starts with HDEV)', value: user.key }
    ],
    () => {
      const newKey = document.getElementById('newKey')?.value.trim();

      // Validation
      if (!newKey) {
        showError('Error', 'API key is required');
        return;
      }
      if (!newKey.startsWith('HDEV')) {
        showError('Error', 'Invalid API key (must start with HDEV)');
        return;
      }

      localStorage.setItem('key', newKey);
      user.key = newKey;
      location.reload();
    }
  );
}

function refreshData() {
  localStorage.setItem('mmrData', '');
  localStorage.setItem('gameData', '');
  location.reload();
}

function clearData() {
  localStorage.clear();
  location.reload();
}

//=================================================================================
//    Modal Functions
//=================================================================================

function showModal(title, message, inputs = [], onConfirm = null) {
  const modal = document.getElementById('modal');
  const titleEl = document.getElementById('modalTitle');
  const messageEl = document.getElementById('modalMessage');
  const inputsEl = document.getElementById('modalInputs');
  const confirmBtn = document.getElementById('modalConfirm');

  titleEl.textContent = title;
  messageEl.textContent = message;
  inputsEl.innerHTML = '';

  // Create input fields
  inputs.forEach(input => {
    const inputEl = document.createElement('input');
    inputEl.type = input.type;
    inputEl.id = input.id;
    inputEl.placeholder = input.placeholder;
    inputEl.value = input.value || '';
    inputEl.className = 'modal-input';
    inputsEl.appendChild(inputEl);
  });

  // Set confirm handler
  confirmBtn.onclick = () => {
    if (onConfirm) onConfirm();
    closeModal();
  };

  modal.classList.remove('hidden');
}

function showError(title, message) {
  showModal(title, message, [], null);
  document.getElementById('modalCancel').style.display = 'none';
  document.getElementById('modalConfirm').textContent = 'OK';
  document.getElementById('modalConfirm').onclick = closeModal;
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  document.getElementById('modalInputs').innerHTML = '';
  document.getElementById('modalCancel').style.display = '';
  document.getElementById('modalConfirm').textContent = 'Confirm';
}