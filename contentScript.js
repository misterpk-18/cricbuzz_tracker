(() => {
  const hostOk = location.hostname.includes("cricbuzz.com");
  const patterns = [
    "live-cricket-score",
    "live-cricket-scores",
    "cricket-match",
    "full-scorecard",
    "scorecard",
    "commentary",
    "/matches/",
    "/match/"
  ];
  const isMatchPage = hostOk && patterns.some(p => location.pathname.includes(p));
  if (!isMatchPage) return;

  const matchUrl = location.origin + location.pathname;
  const matchTitle = document.title || "Cricbuzz Match";
  let visibleSince = null;
  let autosaveTimer = null;

  async function getMatches() {
    return new Promise(resolve => {
      chrome.storage.local.get({ matches: {} }, data => resolve(data.matches || {}));
    });
  }

  async function saveDelta(deltaMs) {
    if (!deltaMs || deltaMs < 0) return;
    const matches = await getMatches();
    const prev = matches[matchUrl] || { title: matchTitle, url: matchUrl, totalMs: 0, lastViewed: 0, visits: 0 };
    const updated = {
      ...prev,
      title: matchTitle,
      url: matchUrl,
      totalMs: (prev.totalMs || 0) + deltaMs,
      lastViewed: Date.now(),
      visits: prev.visits
    };
    matches[matchUrl] = updated;
    await new Promise(res => chrome.storage.local.set({ matches }, res));
  }

  async function bumpVisit() {
    const matches = await getMatches();
    const prev = matches[matchUrl] || { title: matchTitle, url: matchUrl, totalMs: 0, lastViewed: 0, visits: 0 };
    prev.title = matchTitle;
    prev.url = matchUrl;
    prev.lastViewed = Date.now();
    prev.visits = (prev.visits || 0) + 1;
    matches[matchUrl] = prev;
    await new Promise(res => chrome.storage.local.set({ matches }, res));
  }

  function onVisible() {
    if (visibleSince == null && !document.hidden) {
      visibleSince = Date.now();
      clearInterval(autosaveTimer);
      autosaveTimer = setInterval(async () => {
        if (visibleSince != null) {
          const now = Date.now();
          const delta = now - visibleSince;
          visibleSince = now;
          await saveDelta(delta);
        }
      }, 15000);
    }
  }

  async function onHidden() {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
    if (visibleSince != null) {
      const delta = Date.now() - visibleSince;
      visibleSince = null;
      await saveDelta(delta);
    }
  }

  bumpVisit();
  if (!document.hidden) onVisible();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) onHidden();
    else onVisible();
  });
})();