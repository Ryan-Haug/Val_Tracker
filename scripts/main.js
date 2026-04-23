const $ = id => document.getElementById(id);
const errorPrompt = { cont: $("alert"), head: $("alertHead"), body: $("alertBody") };
let user, mmr, games, refreshTimer;

//load page
init();

async function init() {
  user = {
    name: localStorage.getItem('user'),
    tag: localStorage.getItem('tag'),
    key: localStorage.getItem('key')
  };

  if (!user.name || !user.name || !user.name) {
    window.location.href = '../pages/login.html'
  }
}