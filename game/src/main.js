// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, the renderer paints what is there. Screens: title, play, paused,
// mission briefing, busted, wasted and win. ?seed=N fixes the city; ?shot=start|
// play|drive|end (with &seed=N) stages that scene instead of running the loop and
// sets window.__shotReady for a screenshot. ?autostart=1 skips the title screen.
import { STEP, BEST_KEY, PLACES, COMBAT } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_RELOAD, ACTION_PUNCH, ACTION_HORN, ACTION_MUTE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { saveGame, loadGame, hasSave, readBest, saveBest } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const autostart = params.get('autostart') === '1';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const random = createRandom(seed);
const world = createWorld(random, audio);
window.__palmera = world.state; // debug/test hook: the live game state.
const renderer = createRenderer(canvas, world.city);
const hud = createHud();
const input = createInput(canvas);

let screen = 'title';
let best = readBest();
let lastMessage = '';
let lastToastAt = 0;

function announce(message) {
  status.textContent = message;
}

function refreshTitleButtons() {
  const cont = document.getElementById('btn-continue');
  if (cont) cont.style.display = hasSave() ? 'inline-block' : 'none';
  const bestEl = document.getElementById('title-best');
  if (bestEl) bestEl.textContent = best > 0 ? `Best cash: $${best.toLocaleString('en-US')}` : 'A brand-new story in Palmera Bay.';
}

function startPlay(fromSave) {
  if (fromSave) {
    const save = loadGame();
    if (save) {
      world.state.player.cash = save.cash;
      world.state.player.x = save.x;
      world.state.player.z = save.z;
      world.state.missions.index = save.missionIndex;
      world.state.missions.done = save.missionsDone;
      world.state.stats.kills = save.kills;
      world.state.stats.carsStolen = save.carsStolen;
    }
  }
  screen = 'play';
  hud.show('play');
  announce('Playing. WASD to move, E to enter a car, M for a mission.');
}

function showMissionBrief() {
  const idx = world.state.missions.index;
  if (idx >= 5) {
    hud.toast('All missions complete — free roam Palmera Bay!', 4);
    return;
  }
  if (world.state.missions.active) {
    hud.toast('Mission already active — follow the yellow marker.', 3);
    return;
  }
  const started = world.startMission(idx);
  if (!started) return;
  screen = 'mission';
  hud.show('mission');
  document.getElementById('mission-title').textContent = started.def.title;
  document.getElementById('mission-giver').textContent = `From ${started.def.giver} — reward $${started.def.reward}`;
  document.getElementById('mission-brief').textContent = started.def.brief;
  document.getElementById('mission-objective').textContent = `Objective: ${started.def.objective}`;
  announce(started.def.brief);
}

function endRun(kind) {
  // kind: 'busted' | 'wasted' | 'win'
  if (kind === 'win') {
    screen = 'win';
    hud.show('win');
    document.getElementById('win-stats').textContent =
      `Cash $${world.state.player.cash.toLocaleString('en-US')} · Missions ${world.state.stats.missionsDone}/5 · Cars stolen ${world.state.stats.carsStolen} · Takedowns ${world.state.stats.kills}`;
    if (world.state.player.cash > best) {
      best = world.state.player.cash;
      saveBest(best);
    }
    announce('You won. The Big Score is yours.');
    return;
  }
  screen = 'over';
  hud.show('over');
  document.getElementById('over-title').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  document.getElementById('over-text').textContent =
    kind === 'busted'
      ? 'The PBPD caught you. You lose $200 bail and wake up at the apartment.'
      : 'Dario went down. The crew drags you back to the apartment — minus $200.';
  world.state.player.cash = Math.max(0, world.state.player.cash - 200);
  if (world.state.player.cash > best) {
    best = world.state.player.cash;
    saveBest(best);
  }
  announce(kind === 'busted' ? 'Busted.' : 'Wasted.');
}

function restart() {
  // A clean world is a fresh page load; autostart skips the title screen.
  window.location.href = `${window.location.pathname}?autostart=1&seed=${seed}`;
}

// GTA-style respawn after Busted / Wasted: back at the apartment, health restored,
// heat cleared, cash already docked by endRun — and the active mission restarts
// fresh instead of wiping the whole story.
function respawn() {
  const s = world.state;
  const p = s.player;
  s.busted = false;
  if (p.inCar) {
    p.car.driver = 'none';
    p.car = null;
    p.inCar = false;
  }
  p.x = PLACES.spawn.x;
  p.z = PLACES.spawn.z;
  p.y = 0;
  p.vy = 0;
  p.health = 100;
  p.dead = false;
  p.ammo = COMBAT.pistolAmmo;
  s.police.wanted = 0;
  s.police.cops = [];
  for (const car of s.police.cars) car.driver = 'none';
  s.police.cars = [];
  s.police.bustT = 0;
  s.police.heat = 0;
  if (s.missions.active) {
    const idx = s.missions.index;
    s.combat.enemies = [];
    s.missions.active = null;
    world.startMission(idx);
  }
  screen = 'play';
  hud.show('play');
  hud.toast('Back on your feet at the apartment. The job is still on — press M if you need the brief again.', 4);
  announce('Back on your feet.');
}

function runShot(name) {
  const scene = stageShot(name, world, input);
  // Let traffic settle for a few seconds so the frame is alive, then paint.
  const fakeInput = {
    takeDrag: () => ({ x: 0, y: 0 }),
    takeActions: () => 0,
    takeClick: () => false,
    move: () => ({ x: 0, y: 1 }),
    held: () => false,
    running: () => false,
    jumping: () => false,
  };
  if (name === 'drive') {
    for (let i = 0; i < 60; i += 1) world.step(STEP, fakeInput);
  } else if (name === 'play') {
    for (let i = 0; i < 120; i += 1) world.step(STEP, { ...fakeInput, move: () => ({ x: 0, y: 0 }) });
  }
  hud.update(world.state);
  if (scene.screen === 'title') {
    hud.show('title');
    refreshTitleButtons();
  } else if (scene.screen === 'win') {
    hud.show('win');
    document.getElementById('win-stats').textContent =
      `Cash $${world.state.player.cash.toLocaleString('en-US')} · Missions 5/5 · The Big Score complete`;
  } else {
    hud.show('play');
  }
  let painted = 0;
  function paint() {
    renderer.update(world.state, STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  refreshTitleButtons();
  hud.show('title');
  announce('Palmera Bay. Press Space or click to start.');

  document.getElementById('btn-start').addEventListener('click', () => {
    audio.unlock();
    startPlay(false);
  });
  document.getElementById('btn-continue').addEventListener('click', () => {
    audio.unlock();
    startPlay(true);
  });
  document.getElementById('btn-mission').addEventListener('click', () => {
    audio.unlock();
    showMissionBrief();
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    screen = 'play';
    hud.show('play');
  });
  document.getElementById('btn-save').addEventListener('click', () => {
    const ok = saveGame(world.state);
    hud.toast(ok ? 'Game saved.' : 'Save failed (storage unavailable).', 2.5);
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    saveGame(world.state);
    screen = 'title';
    refreshTitleButtons();
    hud.show('title');
  });
  document.getElementById('btn-accept').addEventListener('click', () => {
    screen = 'play';
    hud.show('play');
    audio.unlock();
  });
  document.getElementById('btn-retry').addEventListener('click', respawn);
  document.getElementById('btn-title').addEventListener('click', () => {
    screen = 'title';
    refreshTitleButtons();
    hud.show('title');
  });
  document.getElementById('btn-win-again').addEventListener('click', restart);

  // Keyboard shortcuts on the overlays.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && screen === 'play' && !world.state.missions.active && world.state.missions.index < 5) {
      showMissionBrief();
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over' || screen === 'win')) {
      if (screen === 'title') {
        audio.unlock();
        startPlay(false);
      } else restart();
    } else if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        hud.show('pause');
        announce('Paused.');
      } else if (screen === 'paused') {
        screen = 'play';
        hud.show('play');
      }
    } else if (actions & ACTION_CONFIRM && screen === 'mission') {
      screen = 'play';
      hud.show('play');
    }
    // Clicking the title's Start button is a DOM click; canvas clicks start too.
    // Hand the world-only actions back so the world step still sees E/R/F/H/N —
    // but NOT confirm/pause, or the pause screen would toggle every frame.
    input.pushActions(actions & (ACTION_ENTER | ACTION_RELOAD | ACTION_PUNCH | ACTION_HORN | ACTION_MUTE));
    if (screen === 'play') {
      while (accumulator >= STEP) {
        world.step(STEP, input);
        accumulator -= STEP;
      }
      // Toasts from the world (mission briefs, pickups, crimes).
      const msg = world.state.missions.message;
      if (msg && msg !== lastMessage && world.state.missions.messageT > 0) {
        lastMessage = msg;
        hud.toast(msg, Math.min(6, Math.max(2.5, world.state.missions.messageT)));
      }
      if (world.state.busted) endRun('busted');
      else if (world.state.player.dead) endRun('wasted');
      else if (world.state.won) endRun('win');
      hud.update(world.state);
    } else {
      accumulator = 0;
      if (screen === 'title') {
        // Slow cinematic orbit behind the title screen.
        world.state.camera.yaw += STEP * 0.05;
        world.state.time += STEP;
      }
    }
    renderer.update(world.state, STEP);
  }

  if (autostart) startPlay(false);
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
