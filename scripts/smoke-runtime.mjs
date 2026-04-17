import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  flushEffects,
  getHookState,
  resetHooks,
  resetRuntime,
} from "./smoke/react-stub.mjs";

const projectRoot = process.cwd();
const appEntry = path.resolve(projectRoot, "src/App.jsx");

function installBrowserStubs() {
  const storage = new Map();
  const noop = () => {};

  globalThis.localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
  };

  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
    }
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0, setTargetAtTime: noop },
        connect: noop,
        start: noop,
      };
    }
    createGain() {
      return {
        gain: { value: 0, setTargetAtTime: noop },
        connect: noop,
      };
    }
    createBiquadFilter() {
      return {
        type: "lowpass",
        frequency: { value: 0 },
        connect: noop,
      };
    }
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      innerWidth: 1280,
      innerHeight: 720,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: noop,
      location: { reload: noop },
      AudioContext: FakeAudioContext,
      webkitAudioContext: FakeAudioContext,
    },
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      createElement() {
        return {
          style: {},
          click: noop,
        };
    },
      getElementById() {
        return {};
      },
    },
  });

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: "solara-smoke-test",
      clipboard: {
        writeText: async () => {},
      },
      share: async () => {},
    },
  });

  globalThis.URL = {
    createObjectURL() {
      return "blob:solara-smoke";
    },
  };

  globalThis.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.options = options;
    }
  };

  globalThis.FileReader = class FileReader {
    readAsText() {}
  };

  globalThis.KeyboardEvent = class KeyboardEvent {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  };

  globalThis.confirm = () => false;
  globalThis.__reloadCalled = false;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = noop;
}

function extractText(node) {
  if (node == null || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (typeof node === "object") {
    return extractText(node.props?.children);
  }
  return "";
}

function visitTree(node, visitor) {
  if (node == null || typeof node === "boolean") {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => visitTree(child, visitor));
    return;
  }
  if (typeof node !== "object") {
    return;
  }
  visitor(node);
  visitTree(node.props?.children, visitor);
}

function findButton(tree, labelFragment) {
  let match = null;
  visitTree(tree, (node) => {
    if (match || node.type !== "button") {
      return;
    }
    const text = extractText(node.props?.children);
    if (text.includes(labelFragment)) {
      match = node;
    }
  });
  return match;
}

function findGameStateRef() {
  return getHookState().find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      "current" in entry &&
      entry.current &&
      typeof entry.current === "object" &&
      entry.current.p &&
      entry.current.map,
  );
}

function findRef(predicate) {
  return getHookState().find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      "current" in entry &&
      predicate(entry.current),
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createFakeCanvas() {
  const noop = () => {};
  const fakeContext = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "left",
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    beginPath: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    moveTo: noop,
    lineTo: noop,
    clearRect: noop,
    fillText: noop,
    save: noop,
    restore: noop,
    measureText(text) {
      return { width: String(text).length * 6 };
    },
  };

  return {
    width: 544,
    height: 448,
    style: {},
    getContext() {
      return fakeContext;
    },
    addEventListener: noop,
    removeEventListener: noop,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 544, height: 448 };
    },
  };
}

function render(Component) {
  resetHooks();
  return Component();
}

async function loadComponent() {
  const source = await fs.readFile(appEntry, "utf8");
  const canvasReturnPattern = /return <canvas[\s\S]*?\/>;/;

  let patchedSource = source
    .replace(
      'import React, { useState, useEffect, useRef, useCallback } from "react";',
      'import React, { useState, useEffect, useRef, useCallback } from "../scripts/smoke/react-stub.mjs";',
    )
    .replace(
      "import { isSupabaseConfigured, loadSupabaseClient } from './supabase.js';",
      'import { isSupabaseConfigured, loadSupabaseClient } from "../scripts/smoke/supabase-stub.mjs";',
    )
    .replace(
      'import SharedWorldStatus from "./components/SharedWorldStatus.jsx";',
      'function SharedWorldStatus() { return null; }',
    )
    .replace(
      'import RunDebriefCard from "./components/RunDebriefCard.jsx";',
      'function RunDebriefCard() { return null; }',
    )
    .replace(
      'import SessionDeltaCard from "./components/SessionDeltaCard.jsx";',
      'function SessionDeltaCard() { return null; }',
    )
    .replace(
      'import WorldFeedCard from "./components/WorldFeedCard.jsx";',
      'function WorldFeedCard() { return null; }',
    )
    .replace(
      'const MenuLorePanels = React.lazy(() => import("./components/MenuLorePanels.jsx"));',
      'const MenuLorePanels = () => null;',
    )
    .replaceAll("import.meta.env.VITE_SEASON_NUMBER", "1")
    .replaceAll('import.meta.env.VITE_SEASON_NAME', '"The Wandering Comet"');

  patchedSource = patchedSource.replace(
    canvasReturnPattern,
    "return null;",
  );

  const componentReturnIndex = patchedSource.indexOf("const invSlots=[];");
  if (componentReturnIndex === -1) {
    throw new Error("Could not locate DS smoke cutoff point.");
  }

  patchedSource =
    patchedSource.slice(0, componentReturnIndex) +
    `globalThis.__SOLARA_SMOKE_EXPORTS = {
  startDailyRun,
  startRogueRun,
  saveGame,
  importSavePayload,
  firstSessionPlan,
  objectiveState,
  worldFeed,
  gR,
  dailyRunRef,
  rogueRunRef,
};
return null;
}
`;

  if (!patchedSource.includes("__SOLARA_SMOKE_EXPORTS")) {
    throw new Error("Smoke rewrite did not inject handler exports.");
  }
  const tempPath = path.resolve(projectRoot, "src/.tmp-smoke-runtime.mjs");
  await fs.writeFile(tempPath, patchedSource, "utf8");
  return {
    module: await import(`${pathToFileURL(tempPath).href}?t=${Date.now()}`),
    tempPath,
  };
}

async function runScenario(Component, buttonLabel, expectedRefPredicate) {
  resetRuntime();
  render(Component);
  const hookState = getHookState();
  if (hookState[0] && hookState[0].current === null) {
    hookState[0].current = createFakeCanvas();
  }
  const cleanup = flushEffects();
  render(Component);

  const gameRef = findGameStateRef();
  assert(gameRef, "Game state ref was not initialized on mount.");

  const handlers = globalThis.__SOLARA_SMOKE_EXPORTS;
  assert(handlers, "Smoke exports were not populated during render.");

  const handler =
    buttonLabel === "Play Today's Dungeon"
      ? handlers.startDailyRun
      : handlers.startRogueRun;
  assert(typeof handler === "function", `Missing startup handler for "${buttonLabel}".`);

  handler();
  render(Component);

  const runRef = findRef(expectedRefPredicate);
  assert(runRef, `Scenario "${buttonLabel}" did not create the expected run state.`);
  assert(
    gameRef.current.p.x === 9 && gameRef.current.p.y === 55,
    `Scenario "${buttonLabel}" did not move the player to the dungeon entrance.`,
  );

  cleanup();
}

async function runSaveScenario(Component) {
  resetRuntime();
  render(Component);
  const hookState = getHookState();
  if (hookState[0] && hookState[0].current === null) {
    hookState[0].current = createFakeCanvas();
  }
  const cleanup = flushEffects();
  render(Component);

  const handlers = globalThis.__SOLARA_SMOKE_EXPORTS;
  assert(typeof handlers.saveGame === "function", "Missing saveGame smoke export.");
  assert(typeof handlers.importSavePayload === "function", "Missing importSavePayload smoke export.");
  assert(handlers.firstSessionPlan?.steps?.length >= 4, "First-session plan did not expose the expected route.");
  assert(handlers.objectiveState?.title, "Objective state was not available for smoke validation.");
  assert(Array.isArray(handlers.worldFeed) && handlers.worldFeed.length >= 2, "World feed did not expose actionable entries.");
  assert(handlers.worldFeed.every((entry) => entry.action), "World feed entries should expose action metadata.");

  const saved = handlers.saveGame();
  assert(saved && saved.ver >= 1, "Save scenario did not return a payload.");
  assert(globalThis.localStorage.getItem("solara_save"), "Save scenario did not write localStorage.");

  const imported = handlers.importSavePayload({ ver: 1, inv: [{ i: "bread", c: 1 }], hp: 999, mhp: 10 }, { reload: false });
  assert(imported?.data?.ver >= 1, "Import scenario did not sanitize a payload.");
  assert(imported.issues.length >= 1, "Import scenario did not report repairs for legacy save.");

  cleanup();
}

async function main() {
  installBrowserStubs();
  const { module, tempPath } = await loadComponent();
  const Component = module.default;
  assert(typeof Component === "function", "App default export is not a component.");

  try {
    await runScenario(
      Component,
      "Play Today's Dungeon",
      (current) => current && Array.isArray(current.rooms) && current.done === false,
    );

    await runScenario(
      Component,
      "Start Roguelite Run",
      (current) => current && current.mode === "roguelite" && current.done === false,
    );

    await runSaveScenario(Component);

    console.log("Smoke test passed: app mounts, Daily/Roguelite startup flows initialize, and save/import paths work.");
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {}
  }
}

main().catch((error) => {
  console.error("Smoke test failed.");
  console.error(error?.stack || error);
  process.exitCode = 1;
});
