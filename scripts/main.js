const errorPrompt = {
  container: document.getElementById("alert"),
  header: document.getElementById("errorHead"),
  body: document.getElementById("errorBody")
};

const cardCont = document.getElementById("cardCont");

let user;

let mmrData;
let gameData;

window.addEventListener("userLoggedIn", init);

async function init() {
  user = {
    name: localStorage.getItem("user"),
    tag: localStorage.getItem("tag"),
    key: localStorage.getItem("api"),
  };

  console.log("[Init] User logged in, user: ", user);

  mmrData = await fetchMMR();
  gameData = await fetchGames();
  if (mmrData && gameData) {
    console.log("[Init] Fetched mmr data and game data succesfully");
  }

  console.log('[Init] loading game cards');
  cardCont.innerHTML = '';
  for (let i = 0; i < mmrData.data.history.length; i++) { 
    cardCont.appendChild(createCard(mmrData.data.history[i], gameData.data[i].stats, gameData.data[i].teams));
  }

}

async function fetchMMR() {
  console.log("[fetchMMR] fetching data...");
  const cacheTime = 1 * 60 * 1000; // 5 min

  //check if there was data stored locally within the last 5 min
  if (localStorage.getItem("mmrData")) {
    const raw = localStorage.getItem("mmrData");
    const cached = JSON.parse(raw);

    if (Date.now() - cached.time < cacheTime) {
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
  const cacheTime = 1 * 60 * 1000; // 1 min

  // check cache
  if (localStorage.getItem("gamesData")) {
    const raw = localStorage.getItem("gamesData");
    const cached = JSON.parse(raw);

    if (Date.now() - cached.time < cacheTime) {
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
    "gamesData",
    JSON.stringify({
      time: Date.now(),
      data: result,
    }),
  );

  console.log("[fetchGames] data fetched and cached successfully:", result);
  return result;
}

// Misc functions ==========================================================================

function toggleError(enabled = false, title, errText) {
  if (!enabled) {
    errorPrompt.container.style.display = "none";
    return;
  }

  errorPrompt.container.style.display = "block";
  errorPrompt.header.textContent = title;
  errorPrompt.body.textContent = errText;
}

function createCard(mmrData, gameData, rounds) {
  const div = document.createElement("div");

  div.innerHTML = `
    <div class="card ${mmrData.last_change > 0 ? 'win' : 'loss'}">
      <div class="cardHeader">
        <div>
          <h3>${mmrData.map.name} 🞄 ${gameData.character.name}</h3>
          <p>${mmrData.last_change > 0 ? 'Win' : 'Loss'}: ${mmrData.last_change}rr</p>
        </div>
        <p>${new Date(mmrData.date).toLocaleString()}</p>
      </div>

      <div class="cardBody">
        <div>
          <h5>Match Id:</h5>
          <p>${mmrData.match_id}</p>
        </div>
        <div>
          <h5>KDA:</h5>
          <p>${gameData.kills}/${gameData.deaths}/${gameData.assists} | ${Math.round((gameData.kills / gameData.deaths) * 100) / 100}</p>
        </div>
        <div>
          <h5>Rounds:</h5>
          <p>${rounds[gameData.team == "red" ? "blue" : "red"]}/${rounds[gameData.team == "red" ? "red" : "blue"]}</p>
        </div>
        <div>
          <h5>Rank / Elo:</h5>
          <p>${mmrData.tier.name} | ${mmrData.elo}</p>
        </div>
        <div>
          <h5>Combat Score:</h5>
          <p>${gameData.score} | avg: ${Math.round(gameData.score / (rounds.red + rounds.blue))}</p>
        </div>
        <div>
          <h5>Shots (head/body/leg)</h5>
          <p>
            ${gameData.shots.head}/${gameData.shots.body}/${gameData.shots.leg} |
            ${Math.round((gameData.shots.head / (gameData.shots.head + gameData.shots.body + gameData.shots.leg)) * 100)}% hs
          </p>
        </div>
      </div>
    </div>
  `;

  return div.firstElementChild; // return the actual card
}