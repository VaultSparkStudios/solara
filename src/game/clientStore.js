export const DEFAULT_UI_SCALE = 1;

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadPreferences(defaultPanelOpen) {
  const fallback = {
    showGuide: true,
    panelOpen: defaultPanelOpen,
    uiScale: DEFAULT_UI_SCALE,
    audioOn: false,
    musicOn: true,
    showGhostHud: true,
    ghostPosition: null,
    showObjectiveTracker: true,
    objectivePosition: null,
    tooltipsOn: true,
    compactHud: false,
    showMenuReference: true,
    ambientMotion: true,
  };
  const raw = readJson("solara_preferences", {});
  return {
    ...fallback,
    ...raw,
    uiScale: [0.85, 1, 1.15].includes(raw.uiScale) ? raw.uiScale : fallback.uiScale,
    panelOpen: typeof raw.panelOpen === "boolean" ? raw.panelOpen : fallback.panelOpen,
    ghostPosition:
      raw.ghostPosition && Number.isFinite(raw.ghostPosition.x) && Number.isFinite(raw.ghostPosition.y)
        ? { x: raw.ghostPosition.x, y: raw.ghostPosition.y }
        : fallback.ghostPosition,
    objectivePosition:
      raw.objectivePosition && Number.isFinite(raw.objectivePosition.x) && Number.isFinite(raw.objectivePosition.y)
        ? { x: raw.objectivePosition.x, y: raw.objectivePosition.y }
        : fallback.objectivePosition,
  };
}

export function loadCustomLayouts(slots) {
  const raw = readJson("solara_custom_layouts", {});
  return slots.reduce((acc, slot) => {
    const entry = raw?.[slot];
    acc[slot] = entry && typeof entry === "object" ? entry : null;
    return acc;
  }, {});
}

export function saveCustomLayouts(layouts) {
  return writeJson("solara_custom_layouts", layouts);
}

export function getDailyStreak(seed) {
  const streak = readJson("solara_streak", { lastDate: "", count: 0 });
  return streak.lastDate === seed ? streak.count : 0;
}

export function updateDailyStreak(seed) {
  try {
    const streak = readJson("solara_streak", { lastDate: "", count: 0 });
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = `solara-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const count = streak.lastDate === yesterday ? streak.count + 1 : streak.lastDate === seed ? streak.count : 1;
    writeJson("solara_streak", { lastDate: seed, count });
    return count;
  } catch {
    return 1;
  }
}

export function markDailyPlayedToday(seed) {
  try {
    localStorage.setItem("solara_last_daily_played", seed);
  } catch {}
}

export function hasPlayedDailyToday(seed) {
  try {
    return localStorage.getItem("solara_last_daily_played") === seed;
  } catch {
    return false;
  }
}

export function loadEchoReactions() {
  return readJson("solara_echo_reactions", {});
}

export function loadLocalEchoes(limit = 24) {
  const echoes = readJson("solara_local_echoes", []);
  return Array.isArray(echoes) ? echoes.slice(0, limit) : [];
}

export function appendLocalEcho(echo, limit = 24) {
  const next = [echo, ...loadLocalEchoes(limit)].slice(0, limit);
  writeJson("solara_local_echoes", next);
  return next;
}

export function recordEchoReactionLocal(echoId, reaction) {
  const next = loadEchoReactions();
  if (next[echoId]) {
    return false;
  }
  next[echoId] = reaction;
  writeJson("solara_echo_reactions", next);
  return true;
}
