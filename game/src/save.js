// Saving and loading: cash, mission progress, stats and the player's spot, kept in
// localStorage (this browser only). Saving never blocks play: a failed write is
// swallowed and the game simply keeps going.
import { SAVE_KEY, BEST_KEY } from './config.js';

export function saveGame(s) {
  try {
    const data = {
      cash: s.player.cash,
      missionIndex: s.missions.index,
      missionsDone: s.missions.done,
      kills: s.stats.kills,
      carsStolen: s.stats.carsStolen,
      x: s.player.inCar ? s.player.car.x : s.player.x,
      z: s.player.inCar ? s.player.car.z : s.player.z,
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
    if (!raw) return null;
    return JSON.parse(raw);
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
