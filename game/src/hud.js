// Palmera Bay — finishing pass 2026-11-24
// The HUD and the minimap: cash, health, wanted stars, ammo, the objective with its
// distance and timer, the speedometer, the city clock, toasts, the damage vignette
// and the title / pause / mission / busted / win overlays. The minimap is a top-down
// 2D canvas: roads, the sea, the mission marker, cars, police and the player.
import { PALETTE, ROADS, CITY } from './config.js';

export function createHud() {
  const root = document.getElementById('hud');
  const map = document.getElementById('minimap');
  const mapCtx = map.getContext('2d');
  const el = {};
  for (const id of ['cash', 'hp', 'bar-fill', 'stars', 'ammo', 'objective', 'speed', 'clock', 'toast', 'crosshair', 'damage']) {
    el[id] = document.getElementById(id);
  }
  const overlays = {
    title: document.getElementById('screen-title'),
    pause: document.getElementById('screen-pause'),
    mission: document.getElementById('screen-mission'),
    over: document.getElementById('screen-over'),
    win: document.getElementById('screen-win'),
  };
  let toastTimer = null;

  function show(name) {
    for (const [key, node] of Object.entries(overlays)) {
      if (node) node.style.display = key === name ? 'flex' : 'none';
    }
    root.style.display = (name === 'play' || name === null) ? 'block' : 'none';
  }

  function toast(text, seconds) {
    el.toast.textContent = text;
    el.toast.style.opacity = '1';
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { el.toast.style.opacity = '0'; }, (seconds || 4) * 1000);
  }

  function drawMinimap(s) {
    const w = map.width;
    const h = map.height;
    const scale = w / (CITY.half * 2 + 80);
    const toX = (x) => (x + CITY.half + 40) * scale;
    const toY = (z) => (z + CITY.half + 40) * scale;

    mapCtx.fillStyle = '#1c222b';
    mapCtx.fillRect(0, 0, w, h);
    // Sea and a strip of sand on the east edge.
    mapCtx.fillStyle = PALETTE.sea === 0x2d80a9 ? '#2d80a9' : '#2d80a9';
    mapCtx.fillRect(toX(CITY.half), 0, w - toX(CITY.half), h);
    mapCtx.fillStyle = '#e9d39b';
    mapCtx.fillRect(toX(CITY.half), 0, 7, h);
    // Roads.
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
    // The current mission marker, as a pulsing diamond.
    const m = s.missions.active && s.missions.active.marker;
    if (m) {
      const pulse = 6 + Math.sin(s.time * 5) * 2;
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
    el.cash.textContent = `$${s.player.cash.toLocaleString('en-US')}`;
    el.hp.textContent = `${Math.max(0, Math.ceil(s.player.health))}`;
    el['bar-fill'].style.width = `${Math.max(0, Math.min(100, s.player.health))}%`;
    el['bar-fill'].style.background = s.player.health > 50 ? '#82dc86' : s.player.health > 25 ? '#ffb347' : '#ff5a4e';
    el.stars.textContent = '★'.repeat(s.police.wanted) + '☆'.repeat(5 - s.police.wanted);
    el.stars.style.color = s.police.wanted > 0 ? '#ffb347' : '#8b93a3';
    el.ammo.textContent = s.player.armed ? `◉ ${s.player.ammo}` : 'Fists';

    const m = s.missions.active;
    if (m) {
      const d = m.marker
        ? Math.round(Math.hypot((s.player.inCar ? s.player.car.x : s.player.x) - m.marker.x, (s.player.inCar ? s.player.car.z : s.player.z) - m.marker.z))
        : 0;
      el.objective.textContent = `${m.def.title} — ${m.def.objective}  ·  ${d}m${m.timer > 0 ? `  ·  ${Math.ceil(m.timer)}s` : ''}`;
    } else if (s.missions.index >= 5) {
      el.objective.textContent = 'All missions complete — free roam Palmera Bay!';
    } else {
      el.objective.textContent = 'Press M for the next mission — Mara Solis is calling';
    }

    el.speed.textContent = s.player.inCar ? `${Math.round(Math.abs(s.player.car.speed) * 3.6)} km/h · ${s.player.car.name}` : '';

    const hours = (9 + Math.floor(s.time / 3600)) % 24;
    const mins = Math.floor((s.time / 60) % 60);
    el.clock.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}  Palmera Bay`;

    el.crosshair.style.display = s.player.armed && !s.player.inCar && !s.player.dead ? 'block' : 'none';
    el.damage.style.opacity = s.player.health < 35 ? String((0.55 - s.player.health / 100).toFixed(2)) : '0';
    drawMinimap(s);
  }

  return { show, toast, update, overlays, el };
}
