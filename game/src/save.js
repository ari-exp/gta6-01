// Palmera Bay — finishing pass 2026-11-24
// Saving and loading with localStorage (this browser only): cash, mission progress
// and the statistics. A failed write is swallowed so play never stops; the game just
// carries on without a save.
import { SAVE_KEY, BEST_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      cash: state.player.cash,
      missionIndex: state.missions.index,
      missionsDone: state.missions.done,
      kills: state.stats.kills,
      carsStolen: state.stats.carsStolen,
      x: state.player.inCar ? state.player.car.x : state.player.x,
      z: state.player.inCar ? state.player.car.z : state.player.z,
      time: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage off: the best cash lasts this visit only.
  }
}
