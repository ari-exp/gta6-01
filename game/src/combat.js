// Palmera Bay — finishing pass 2026-11-24
// Combat: the pistol (a hitscan ray toward where the camera aims), the punch, the
// enemy shooters and the pickups. Enemies are mission gangsters and bank guards;
// they hold their ground and shoot when the player is in range with a clear line of
// sight. Damage comes back to world.js as a number, which it applies to the player.
import { COMBAT } from './config.js';

export function createCombat() {
  return {
    enemies: [],   // {x,z,angle,health,alive,kind,shootT,shot}
    pickups: [],   // {x,z,kind:'cash'|'health'|'ammo',taken,applied,spin}
    muzzle: 0,     // seconds of muzzle flash left
    tracer: null,  // {x1,z1,x2,z2,t} for the render flash
  };
}

export function spawnEnemies(combat, spots, kind) {
  for (const s of spots) {
    combat.enemies.push({
      x: s.x, z: s.z, angle: s.angle || 0,
      health: COMBAT.enemyHealth, alive: true, kind,
      shootT: 0.8 + Math.random() * 1.2,
      shot: false,
    });
  }
}

export function spawnPickups(combat, spots) {
  for (const s of spots) {
    combat.pickups.push({ x: s.x, z: s.z, kind: s.kind, taken: false, applied: false, spin: Math.random() * 6 });
  }
}

function hasLineOfSight(city, x1, z1, x2, z2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 3);
  for (let i = 1; i < steps; i += 1) {
    const x = x1 + ((x2 - x1) * i) / steps;
    const z = z1 + ((z2 - z1) * i) / steps;
    if (city.hitsBuilding(x, z, 0.4)) return false;
  }
  return true;
}

// Fire the pistol from (x,z) along `angle` (radians, atan2(dx,dz) convention).
// Returns {hit, target} for the first thing in the ray, so world.js can react.
export function shoot(combat, police, traffic, x, z, angle, range) {
  const dx = Math.sin(angle);
  const dz = Math.cos(angle);
  const maxD = range || COMBAT.pistolRange;
  let best = null;
  let bestD = maxD;
  const consider = (tx, tz, radius, ref) => {
    const rx = tx - x;
    const rz = tz - z;
    const along = rx * dx + rz * dz;
    if (along < 0 || along > bestD) return;
    const perp = Math.abs(rx * dz - rz * dx);
    if (perp < radius + 0.6) {
      bestD = along;
      best = ref;
    }
  };
  for (const e of combat.enemies) if (e.alive) consider(e.x, e.z, 0.8, { hit: 'enemy', target: e });
  for (const c of police.cops) consider(c.x, c.z, 0.8, { hit: 'cop', target: c });
  for (const p of traffic.peds) if (p.state !== 'down') consider(p.x, p.z, 0.7, { hit: 'ped', target: p });

  combat.tracer = { x1: x, z1: z, x2: x + dx * bestD, z2: z + dz * bestD, t: 0.12 };
  combat.muzzle = 0.08;

  if (!best) return { hit: 'none', target: null };
  if (best.hit === 'enemy') {
    best.target.health -= COMBAT.pistolDamage;
    if (best.target.health <= 0) best.target.alive = false;
  } else if (best.hit === 'cop') {
    best.target.health -= COMBAT.pistolDamage;
    if (best.target.health <= 0) {
      best.target.dead = true;
      police.cops = police.cops.filter((c) => c !== best.target);
    }
  } else if (best.hit === 'ped') {
    best.target.state = 'down';
  }
  return best;
}

export function stepCombat(combat, dt, player, city, onPlayerHit) {
  if (combat.muzzle > 0) combat.muzzle -= dt;
  if (combat.tracer) {
    combat.tracer.t -= dt;
    if (combat.tracer.t <= 0) combat.tracer = null;
  }
  const px = player.inCar ? player.car.x : player.x;
  const pz = player.inCar ? player.car.z : player.z;

  for (const e of combat.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(px - e.x, pz - e.z);
    e.angle = Math.atan2(px - e.x, pz - e.z);
    e.shootT -= dt;
    if (d < 42 && e.shootT <= 0 && hasLineOfSight(city, e.x, e.z, px, pz)) {
      e.shootT = 1.4 + Math.random() * 0.8;
      e.shot = true;
      // Damage is deliberately low: a long fight is survivable, as it should be.
      const chance = d < 18 ? COMBAT.enemyDamageNear : COMBAT.enemyDamageFar;
      if (Math.random() < chance) onPlayerHit(6 + Math.random() * 6);
    } else {
      e.shot = false;
    }
  }

  // Pickups: walk or drive over them to collect.
  for (const p of combat.pickups) {
    if (p.taken) continue;
    p.spin += dt * 2;
    if (Math.hypot(px - p.x, pz - p.z) < 2.4) {
      p.taken = true;
      p.collected = true;
    }
  }
}
