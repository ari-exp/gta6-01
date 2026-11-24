// Missions and the story: five chained jobs from Mara Solis, each with an objective,
// a map marker, a timer where the job is timed, and a cash reward. The mission
// module owns the state machine; world.js feeds it events (arrivals, kills, pickups).
import { MISSIONS, PLACES } from './config.js';
import { spawnEnemies, spawnPickups } from './combat.js';

export function createMissions() {
  return {
    index: 0, // next mission to play (0..4); 5 = all done
    active: null, // {def, stage, timer, marker, dropsLeft, checkpoints, gotCrate}
    done: 0,
    message: '',
    messageT: 0,
  };
}

function marker(x, z, label) {
  return { x, z, label };
}

export function startMission(missions, combat, index) {
  const def = MISSIONS[index];
  if (!def) return null;
  const m = { def, stage: 0, timer: def.timeLimit || 0, dropsLeft: 0, checkpoints: 0, gotCrate: false, marker: null };
  if (def.id === 'first-wheels') {
    m.marker = marker(PLACES.garage.x, PLACES.garage.z, PLACES.garage.label);
  } else if (def.id === 'sunset-delivery') {
    m.dropsLeft = 3;
    m.dropIdx = 0;
    m.marker = marker(PLACES.drop1.x, PLACES.drop1.z, PLACES.drop1.label);
  } else if (def.id === 'harbor-heat') {
    m.marker = marker(PLACES.harbor.x, PLACES.harbor.z, PLACES.harbor.label);
    spawnEnemies(combat, [
      { x: -60, z: 310, angle: 0 }, { x: -30, z: 318, angle: 0 },
      { x: -70, z: 325, angle: 0 }, { x: -10, z: 312, angle: 0 },
    ], 'gang');
  } else if (def.id === 'beach-getaway') {
    m.marker = marker(PLACES.beach1.x, PLACES.beach1.z, PLACES.beach1.label);
  } else if (def.id === 'big-score') {
    m.marker = marker(PLACES.bank.x, PLACES.bank.z, PLACES.bank.label);
    spawnEnemies(combat, [
      { x: 30, z: 30, angle: 0 }, { x: 60, z: 30, angle: 0 },
      { x: 30, z: 62, angle: 0 }, { x: 62, z: 62, angle: 0 },
      { x: 45, z: 20, angle: 0 }, { x: 20, z: 45, angle: 0 },
    ], 'guard');
  }
  missions.active = m;
  missions.message = def.brief;
  missions.messageT = 9;
  return m;
}

// Called every step while a mission is active. Returns 'done' | 'failed' | null.
// `s` is the world state (player position, combat, police, stats).
export function stepMission(missions, combat, police, s, dt) {
  const m = missions.active;
  if (!m) return null;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) return 'failed';
  }
  const px = s.player.inCar ? s.player.car.x : s.player.x;
  const pz = s.player.inCar ? s.player.car.z : s.player.z;
  const near = (pt, r) => Math.hypot(px - pt.x, pz - pt.z) < r;

  if (m.def.id === 'first-wheels') {
    if (s.player.inCar && near(PLACES.garage, 10)) return 'done';
  } else if (m.def.id === 'sunset-delivery') {
    const drops = [PLACES.drop1, PLACES.drop2, PLACES.drop3];
    const cur = drops[m.dropIdx];
    if (cur && near(cur, 9)) {
      m.dropIdx += 1;
      m.dropsLeft -= 1;
      s.player.cash += 0; // reward comes at completion
      missions.message = `Package delivered (${3 - m.dropsLeft}/3).`;
      missions.messageT = 3;
      if (m.dropIdx >= 3) return 'done';
      const next = drops[m.dropIdx];
      m.marker = marker(next.x, next.z, next.label);
    }
  } else if (m.def.id === 'harbor-heat') {
    const alive = combat.enemies.filter((e) => e.alive && e.kind === 'gang').length;
    if (alive === 0 && !m.gotCrate) {
      m.gotCrate = true;
      spawnPickups(combat, [{ x: PLACES.harbor.x, z: PLACES.harbor.z, kind: 'cash' }]);
      missions.message = 'Guards down! Grab the crate at the dock.';
      missions.messageT = 4;
      m.marker = marker(PLACES.harbor.x, PLACES.harbor.z, 'The crate');
    }
    if (m.gotCrate && near(PLACES.harbor, 8)) {
      const crate = combat.pickups.find((p) => p.kind === 'cash' && !p.taken && Math.hypot(p.x - PLACES.harbor.x, p.z - PLACES.harbor.z) < 3);
      if (!crate) return 'done';
    }
  } else if (m.def.id === 'beach-getaway') {
    const points = [PLACES.beach1, PLACES.beach2, PLACES.beach3];
    const cur = points[m.checkpoints];
    if (cur && near(cur, 10) && police.wanted >= 1) {
      m.checkpoints += 1;
      missions.message = `Checkpoint ${m.checkpoints}/3 — keep running!`;
      missions.messageT = 3;
      if (m.checkpoints >= 3) return 'done';
      const next = points[m.checkpoints];
      m.marker = marker(next.x, next.z, next.label);
    }
  } else if (m.def.id === 'big-score') {
    if (m.stage === 0) {
      // The bank entrance faces south at (45, 24); the vault cash waits just inside it.
      if (near({ x: 45, z: 24 }, 8)) {
        m.stage = 1;
        spawnPickups(combat, [{ x: 45, z: 24, kind: 'cash' }]);
        missions.message = 'Inside! Grab the vault cash, then run to the hideout.';
        missions.messageT = 4;
        m.marker = marker(45, 24, 'Vault cash');
      }
    } else if (m.stage === 1) {
      const vault = combat.pickups.find((p) => p.kind === 'cash' && !p.taken && Math.hypot(p.x - 45, p.z - 24) < 4);
      if (!vault) {
        m.stage = 2;
        missions.message = 'Cash secured! Escape to the hideout in the north-west.';
        missions.messageT = 4;
        m.marker = marker(PLACES.hideout.x, PLACES.hideout.z, PLACES.hideout.label);
      }
    } else if (m.stage === 2) {
      if (near(PLACES.hideout, 10)) return 'done';
    }
  }
  return null;
}

export function finishMission(missions, success) {
  const m = missions.active;
  missions.active = null;
  if (!m) return 0;
  if (success) {
    missions.done += 1;
    missions.index += 1;
    return m.def.reward;
  }
  return 0;
}
