const $ = id => document.getElementById(id);
const errorPrompt = { cont: $("alert"), head: $("alertHead"), body: $("alertBody") };
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

  console.log('[init] fetching games')
  mmr = await fetchMMR();
  games = await fetchGames();

  if (!mmr || !games) {
    throw new Error("Failed to fetch games");
  }

  loadGameCards();
  loadQuickStats();
  loadGraphs();
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

}

function loadGraphs() {

}

//=========================================================
// Helper Functions
//=========================================================

function createCard(mmrData, gameData, rounds) {
  const div = document.createElement("div");

  div.innerHTML = `
    <div class="card ${mmrData.last_change > 0 ? 'win' : 'loss'}">
            <div class="cardHeader">
              <div>
                <h4>${mmrData.map.name} · ${gameData.character.name}</h4>
                <p>${new Date(mmrData.date).toLocaleString()}</p>
              </div>
              <p class="RRbadge">${mmrData.last_change > 0 ? 'Win' : 'Loss'}: ${mmrData.last_change}rr</p>
            </div>

            <div class="cardBody">
              <div>
                <p>Rounds</p>
                <h3>${rounds[gameData.team == "red" ? "blue" : "red"]}/${rounds[gameData.team == "red" ? "red" : "blue"]}</h3>
              </div>
              <div>
                <p>Rank / Elo</p>
                <h3>${mmrData.tier.name} | ${mmrData.elo}</h3>
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