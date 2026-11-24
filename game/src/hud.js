// The HUD and the minimap: cash, health, wanted stars, ammo, objective, speed,
// the clock, toasts, and the title / pause / mission / busted / win overlays.
// The minimap is a top-down canvas: roads, the sea, the player, cars, police,
// enemies and the mission marker. All of it is DOM + 2D canvas over the 3D view.
import { PALETTE, FONT, ROADS, CITY } from './config.js';

export function createHud() {
  const root = document.getElementById('hud');
  const map = document.getElementById('minimap');
  const mapCtx = map.getContext('2d');
  const els = {};
  for (const id of ['cash', 'health', 'healthbar', 'stars', 'ammo', 'objective', 'speed', 'clock', 'toast', 'crosshair', 'damage']) {
    els[id] = document.getElementById(id);
  }
  const overlays = {
    title: document.getElementById('screen-title'),
    pause: document.getElementById('screen-pause'),
    mission: document.getElementById('screen-mission'),
    over: document.getElementById('screen-over'),
    win: document.getElementById('screen-win'),
  };
  let lastToast = '';

  function show(name) {
    for (const [key, el] of Object.entries(overlays)) {
      if (el) el.style.display = key === name ? 'flex' : 'none';
    }
    root.style.display = name === 'play' || name === null ? 'block' : 'none';
    if (name === 'play' || name === null) {
      for (const el of Object.values(overlays)) if (el) el.style.display = 'none';
    }
  }

  function toast(text, seconds) {
    lastToast = text;
    els.toast.textContent = text;
    els.toast.style.opacity = '1';
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => {
      els.toast.style.opacity = '0';
    }, (seconds || 4) * 1000);
  }

  function drawMinimap(s) {
    const w = map.width;
    const h = map.height;
    const scale = w / (CITY.half * 2 + 80);
    const toX = (x) => (x + CITY.half + 40) * scale;
    const toY = (z) => (z + CITY.half + 40) * scale;
    mapCtx.fillStyle = '#20262e';
    mapCtx.fillRect(0, 0, w, h);
    // Sea
    mapCtx.fillStyle = '#2e7fa8';
    mapCtx.fillRect(toX(CITY.half), 0, w - toX(CITY.half), h);
    mapCtx.fillStyle = '#e8d29a';
    mapCtx.fillRect(toX(CITY.half), 0, 8, h);
    // Roads
    mapCtx.strokeStyle = '#6a7078';
    mapCtx.lineWidth = 4;
    for (const r of ROADS) {
      mapCtx.beginPath();
      mapCtx.moveTo(toX(r), 0);
      mapCtx.lineTo(toX(r), h);
      mapCtx.stroke();
      mapCtx.beginPath();
      mapCtx.moveTo(0, toY(r));
      mapCtx.lineTo(w, toY(r));
      mapCtx.stroke();
    }
    const dot = (x, z, color, r) => {
      mapCtx.fillStyle = color;
      mapCtx.beginPath();
      mapCtx.arc(toX(x), toY(z), r || 3, 0, Math.PI * 2);
      mapCtx.fill();
    };
    // Mission marker (pulsing yellow diamond)
    const m = s.missions.active && s.missions.active.marker;
    if (m) {
      const pulse = 5 + Math.sin(s.time * 5) * 2;
      mapCtx.fillStyle = '#ffd23f';
      mapCtx.save();
      mapCtx.translate(toX(m.x), toY(m.z));
      mapCtx.rotate(Math.PI / 4);
      mapCtx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
      mapCtx.restore();
    }
    for (const car of s.cars) {
      if (car.driver === 'police') dot(car.x, car.z, '#4f8ef7', 3);
      else if (car.driver === 'player') continue;
      else dot(car.x, car.z, '#c8c8c8', 2);
    }
    for (const e of s.combat.enemies) if (e.alive) dot(e.x, e.z, '#ff5a4e', 3);
    for (const c of s.police.cops) dot(c.x, c.z, '#4f8ef7', 2.5);
    const px = s.player.inCar ? s.player.car.x : s.player.x;
    const pz = s.player.inCar ? s.player.car.z : s.player.z;
    dot(px, pz, '#ffffff', 4);
    mapCtx.strokeStyle = '#ffffff';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.arc(toX(px), toY(pz), 6, 0, Math.PI * 2);
    mapCtx.stroke();
  }

  function update(s) {
    els.cash.textContent = `$${s.player.cash.toLocaleString('en-US')}`;
    els.health.textContent = `${Math.max(0, Math.ceil(s.player.health))}`;
    els.healthbar.style.width = `${Math.max(0, s.player.health)}%`;
    els.healthbar.style.background = s.player.health > 50 ? '#7ddc7d' : s.player.health > 25 ? '#ffb347' : '#ff5a4e';
    els.stars.textContent = '★'.repeat(s.police.wanted) + '☆'.repeat(5 - s.police.wanted);
    els.stars.style.color = s.police.wanted > 0 ? '#ffb347' : '#8b93a3';
    els.ammo.textContent = s.player.armed ? `◉ ${s.player.ammo} / ∞` : 'Fists';
    const m = s.missions.active;
    if (m) {
      const d = m.marker ? Math.round(Math.hypot((s.player.inCar ? s.player.car.x : s.player.x) - m.marker.x, (s.player.inCar ? s.player.car.z : s.player.z) - m.marker.z)) : 0;
      els.objective.textContent = `${m.def.title} — ${m.def.objective}  ·  ${d}m${m.timer > 0 ? `  ·  ${Math.ceil(m.timer)}s` : ''}`;
    } else if (s.missions.index >= 5) {
      els.objective.textContent = 'All missions complete — free roam Palmera Bay!';
    } else {
      els.objective.textContent = 'Press M for the next mission — talk to Mara (phone icon)';
    }
    if (s.player.inCar) {
      const kmh = Math.round(Math.abs(s.player.car.speed) * 3.6);
      els.speed.textContent = `${kmh} km/h · ${s.player.car.name}`;
    } else {
      els.speed.textContent = '';
    }
    const hours = 9 + Math.floor(s.time / 3600) % 12;
    const mins = Math.floor((s.time / 60) % 60);
    els.clock.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}  Palmera Bay`;
    els.crosshair.style.display = s.player.armed && !s.player.inCar ? 'block' : 'none';
    els.damage.style.opacity = s.player.health < 35 ? String(0.55 - s.player.health / 100) : '0';
    drawMinimap(s);
  }

  function setOverlayText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return { show, toast, update, setOverlayText, overlays, els };
}
