// Palmera Bay — finishing pass 2026-11-24
// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, the renderer paints whatever is there. Screens are title, play,
// paused, mission briefing, busted, wasted and win. ?seed=N fixes the city;
// ?shot=start|play|drive|end (with &seed=N) stages that scene instead of running the
// loop and sets window.__shotReady; ?autostart=1 skips the title screen (for tests).
import { STEP, PLACES, COMBAT } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_RELOAD, ACTION_PUNCH, ACTION_HORN, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { saveGame, loadGame, hasSave, readBest, saveBest } from './save.js';
import { stageShot, warmUpShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const autostart = params.get('autostart') === '1';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const audio = createAudio();
const random = createRandom(seed);
const world = createWorld(random, audio);
window.__palmera = world.state; // debug / test hook: the live game state
const renderer = createRenderer(canvas, world.city);
const hud = createHud();
const input = createInput(canvas);

let screen = 'title';
let best = readBest();
let lastMessage = '';

function announce(message) { statusEl.textContent = message; }

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
  if (idx >= 5) { hud.toast('All missions complete — free roam Palmera Bay!', 4); return; }
  if (world.state.missions.active) { hud.toast('Mission already active — follow the yellow marker.', 3); return; }
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
  if (kind === 'win') {
    screen = 'win';
    hud.show('win');
    document.getElementById('win-stats').textContent =
      `Cash $${world.state.player.cash.toLocaleString('en-US')} · Missions ${world.state.stats.missionsDone}/5 · Cars stolen ${world.state.stats.carsStolen} · Takedowns ${world.state.stats.kills}`;
    if (world.state.player.cash > best) { best = world.state.player.cash; saveBest(best); }
    announce('You won. The Big Score is yours.');
    return;
  }
  screen = 'over';
  hud.show('over');
  document.getElementById('over-title').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  document.getElementById('over-text').textContent = kind === 'busted'
    ? 'The PBPD caught you. You lose $200 bail and wake up back at the apartment.'
    : 'Dario went down. The crew drags you back to the apartment — minus $200.';
  world.state.player.cash = Math.max(0, world.state.player.cash - 200);
  if (world.state.player.cash > best) { best = world.state.player.cash; saveBest(best); }
  if (audio) audio.busted();
  announce(kind === 'busted' ? 'Busted.' : 'Wasted.');
}

function restart() {
  // A clean world is a fresh page load; autostart skips the title screen.
  window.location.href = `${window.location.pathname}?autostart=1&seed=${seed}`;
}

// GTA-style respawn after Busted / Wasted: back at the apartment, health restored,
// heat cleared, and the active mission restarted — but story progress is kept and
// the page never reloads.
function respawn() {
  const s = world.state;
  const p = s.player;
  s.busted = false;
  if (p.inCar) { p.car.driver = 'none'; p.car = null; p.inCar = false; }
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
  hud.toast('Back on your feet at the apartment. The job is still on — press M for the brief.', 4);
  announce('Back on your feet.');
}

// ?shot=… — stage one of the four scenes, warm it up, paint twice, then signal the
// screenshot tool. All content comes from the game rules above.
function runShot(name) {
  const scene = stageShot(name, world);
  warmUpShot(name, world);
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

  document.getElementById('btn-start').addEventListener('click', () => { audio.unlock(); startPlay(false); });
  document.getElementById('btn-continue').addEventListener('click', () => { audio.unlock(); startPlay(true); });
  document.getElementById('btn-mission').addEventListener('click', () => { audio.unlock(); showMissionBrief(); });
  document.getElementById('btn-resume').addEventListener('click', () => { screen = 'play'; hud.show('play'); });
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
  document.getElementById('btn-accept').addEventListener('click', () => { screen = 'play'; hud.show('play'); audio.unlock(); });
  document.getElementById('btn-again').addEventListener('click', respawn);
  document.getElementById('btn-title').addEventListener('click', () => { screen = 'title'; refreshTitleButtons(); hud.show('title'); });
  document.getElementById('btn-win-again').addEventListener('click', restart);

  // M opens the next mission while playing.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && screen === 'play' && !world.state.missions.active && world.state.missions.index < 5) showMissionBrief();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over' || screen === 'win')) {
      if (screen === 'title') { audio.unlock(); startPlay(false); }
      else respawn();
    } else if (actions & ACTION_PAUSE) {
      if (screen === 'play') { screen = 'paused'; hud.show('pause'); announce('Paused.'); }
      else if (screen === 'paused') { screen = 'play'; hud.show('play'); }
    } else if (actions & ACTION_CONFIRM && screen === 'mission') {
      screen = 'play';
      hud.show('play');
    }
    // Hand only the world actions back — NOT confirm/pause, or the pause screen would
    // toggle every frame and the overlay would flicker.
    input.putBack(actions & (ACTION_ENTER | ACTION_RELOAD | ACTION_PUNCH | ACTION_HORN | ACTION_MUTE));

    if (screen === 'play') {
      while (accumulator >= STEP) {
        world.step(STEP, input);
        accumulator -= STEP;
      }
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
        // A slow cinematic pan behind the title screen.
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
