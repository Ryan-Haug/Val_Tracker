const user = {
  "name": localStorage.getItem("user"),
  "tag": localStorage.getItem("tag"),
  "key": localStorage.getItem("api")
}

const errorPrompt = {
  "container": document.getElementById("alert"),
  "header": document.getElementById("errorHead"),
  "body": document.getElementById("errorBody")
}

let mmrData;
let gameData;

window.addEventListener("userLoggedIn", init)

async function init() {
  console.log("[Init] User logged in, user: ", user)

  mmrData = await fetchMMR();
  gameData = await fetchGames();
  if (mmrData && gameData) {
    console.log('[Init] Fetched mmr data and game data succesfully')
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
  let response = await fetch(`https://api.henrikdev.xyz/valorant/v2/mmr-history/na/pc/${user.name}/${user.tag}`, { headers: { Authorization: `${user.key}` }});

  if (!response.ok) {
    toggleError(true, "Error retrieving data", await response.text())
    throw new Error("[fetchMMR] Error fetching mmr-history");
  }

  let result = await response.json();

  localStorage.setItem(
    "mmrData",
    JSON.stringify({
      time: Date.now(),
      data: result
    })
  );

  console.log("[fetchMMR] data fetched and cached successfully:", result);
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
    `https://api.henrikdev.xyz/valorant/v1/stored-matches/na/${user.name}/${user.tag}?size=8&mode=competitive`,
    {
      headers: { Authorization: `${user.key}` }
    }
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
      data: result
    })
  );

  console.log("[fetchGames] data fetched and cached successfully:", result);
  return result;
}

// Misc functions ==========================================================================

function toggleError(enabled = false, title, errText) {
  if (!enabled) {
    errorPrompt.container.style.display = 'none';
    return;
  }

  errorPrompt.container.style.display = 'block';
  errorPrompt.header.textContent = title;
  errorPrompt.body.textContent = errText;
}

















//template
//
// card.innerHTML = `
//       <div class="cardHeader">
//         <div>
//           <h3>${game.map.name}</h3>
//           <p>${resultClass}</p>
//         </div>
//         <p style="font-size: .8em;">${game.date}</p>
//       </div>

//       <div class="cardBody">
//         <div>
//           <h5>Rank</h5>
//           <p>${game.currenttierpatched}</p>
//         </div>
//         <div>
//           <h5>Match Id</h5>
//           <p>${game.match_id}</p>
//         </div>
//         <div>
//           <h5>Total RR</h5>
//           <p>${game.elo}</p>
//         </div>
//         <div>
//           <h5>RR Change</h5>
//           <p>${game.mmr_change_to_last_game > 0 ? '+' : ''}${game.mmr_change_to_last_game}</p>
//         </div>
//       </div>
//     `;