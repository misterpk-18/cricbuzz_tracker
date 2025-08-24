function msToHMS(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

async function getMatches() {
  return new Promise(resolve => {
    chrome.storage.local.get({ matches: {} }, data => resolve(data.matches || {}));
  });
}

function render(matchesObj) {
  const matches = Object.values(matchesObj);

  const all = document.getElementById("all");
  all.innerHTML = "";
  matches.sort((a, b) => (b.lastViewed || 0) - (a.lastViewed || 0));
  for (const m of matches) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<a href="${m.url}" target="_blank">${m.title}</a>
                    <div class="meta">Viewed: ${msToHMS(m.totalMs || 0)}</div>`;
    all.appendChild(li);
  }

  const top5 = [...matches].sort((a,b) => (b.totalMs||0) - (a.totalMs||0)).slice(0,5);
  const topList = document.getElementById("top5");
  topList.innerHTML = "";
  for (const m of top5) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<a href="${m.url}" target="_blank">${m.title}</a>
                    <div class="meta">Viewed: ${msToHMS(m.totalMs || 0)}</div>`;
    topList.appendChild(li);
  }
}

async function refresh() {
  const matches = await getMatches();
  render(matches);
}

document.getElementById("refresh").addEventListener("click", refresh);
document.getElementById("clear").addEventListener("click", async () => {
  await new Promise(res => chrome.storage.local.set({ matches: {} }, res));
  refresh();
});
document.getElementById("export").addEventListener("click", async () => {
  const matches = await getMatches();
  const blob = new Blob([JSON.stringify(matches, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cricbuzz-tracker.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.matches) render(changes.matches.newValue || {});
});

refresh();