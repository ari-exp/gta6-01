// Palmera Bay — finishing pass 2026-11-24
// The rules: one state object and one step. Player movement (on foot and in a car),
// stealing cars, shooting, punching, pickups, the wanted heat, Busted and Wasted,
// missions and the camera all live here; render.js only draws what this produces.
import { STEP, PLAYER, CAR, WANTED, COMBAT, PLACES } from './config.js';
import { createCity } from './city.js';
import { spawnParkedCars, nearestCar, driveCar } from './vehicles.js';
import { createTraffic, stepTraffic, checkRunOver } from './traffic.js';
import { createPolice, addWanted, stepPolice } from './police.js';
import { createCombat, shoot, stepCombat, spawnPickups } from './combat.js';
import { createMissions, startMission, stepMission, finishMission } from './missions.js';
import { ACTION_ENTER, ACTION_RELOAD, ACTION_PUNCH, ACTION_HORN, ACTION_MUTE } from './input.js';

export function createWorld(random, audio) {
  const city = createCity(random);
  const traffic = createTraffic(random);
  const parked = spawnParkedCars(random, city);
  const cars = [...parked, ...traffic.cars];
  const police = createPolice();
  const combat = createCombat();
  const missions = createMissions();

  const state = {
    time: 0,
    random,
    city,
    cars,
    traffic,
    police,
    combat,
    missions,
    camera: { yaw: Math.PI, pitch: 0.32 },
    player: {
      x: PLACES.spawn.x, z: PLACES.spawn.z, y: 0, vy: 0,
      angle: Math.PI, vx: 0, vz: 0,
      health: PLAYER.health, cash: PLAYER.cash, ammo: COMBAT.pistolAmmo,
      armed: true, inCar: false, car: null, dead: false,
    },
    stats: { kills: 0, carsStolen: 0, shots: 0, missionsDone: 0 },
    busted: false,
    won: false,
    flashT: 0,
    danger: null,
  };

  // Pickups scattered around town: cash on the sidewalks, health by the corners,
  // ammo near the harbour and the bank door.
  spawnPickups(combat, [
    { x: -135, z: -45, kind: 'cash' }, { x: 135, z: -135, kind: 'cash' },
    { x: -225, z: 225, kind: 'cash' }, { x: 225, z: 135, kind: 'cash' },
    { x: 45, z: -225, kind: 'cash' }, { x: -45, z: 135, kind: 'cash' },
    { x: -135, z: 225, kind: 'health' }, { x: 135, z: -45, kind: 'health' },
    { x: -45, z: 315, kind: 'ammo' }, { x: 45, z: 20, kind: 'ammo' },
    { x: 315, z: -225, kind: 'health' }, { x: -315, z: -135, kind: 'ammo' },
  ]);

  function hurtPlayer(amount) {
    const p = state.player;
    if (p.dead) return;
    p.health -= amount;
    state.flashT = 0.4;
    if (p.health <= 0) { p.health = 0; p.dead = true; }
  }

  function enterCar() {
    const p = state.player;
    if (p.inCar) {
      const car = p.car;
      const side = car.angle + Math.PI / 2;
      const fixed = city.collide(car.x + Math.sin(side) * 2.4, car.z + Math.cos(side) * 2.4, PLAYER.radius);
      p.x = fixed.x;
      p.z = fixed.z;
      p.angle = car.angle;
      car.driver = 'none';
      p.car = null;
      p.inCar = false;
      return;
    }
    const car = nearestCar(cars, p.x, p.z, 4.5);
    if (!car) return;
    car.driver = 'player';
    p.car = car;
    p.inCar = true;
    p.angle = car.angle;
    state.stats.carsStolen += 1;
    if (audio) audio.pickup();
    addWanted(police, WANTED.stealCar, p);
    state.missions.message = `You took the ${car.name}. The PBPD noticed.`;
    state.missions.messageT = 3;
  }

  function firePistol() {
    const p = state.player;
    if (p.inCar || p.dead) return;
    if (p.ammo <= 0) {
      state.missions.message = 'Out of ammo — press R to reload, or find an ammo box.';
      state.missions.messageT = 2.5;
      return;
    }
    p.ammo -= 1;
    p.angle = state.camera.yaw;
    state.stats.shots += 1;
    if (audio) audio.shoot();
    const res = shoot(combat, police, traffic, p.x, p.z, p.angle, COMBAT.pistolRange);
    addWanted(police, WANTED.shoot, p);
    if (res.hit === 'enemy' && !res.target.alive) {
      state.stats.kills += 1;
      p.cash += 25;
      state.missions.message = 'Target down. +$25';
      state.missions.messageT = 2;
    } else if (res.hit === 'cop' && res.target.dead) {
      addWanted(police, WANTED.killCop, p);
      state.stats.kills += 1;
    } else if (res.hit === 'ped') {
      addWanted(police, WANTED.hitPed, p);
    }
    state.danger = { x: p.x, z: p.z, radius: 40 };
  }

  function punch() {
    const p = state.player;
    if (p.inCar || p.dead) return;
    if (audio) audio.punch();
    const fx = Math.sin(p.angle);
    const fz = Math.cos(p.angle);
    const targets = [
      ...combat.enemies.filter((e) => e.alive).map((e) => ({ x: e.x, z: e.z, ref: e, kind: 'enemy' })),
      ...police.cops.map((c) => ({ x: c.x, z: c.z, ref: c, kind: 'cop' })),
      ...traffic.peds.filter((pd) => pd.state !== 'down').map((pd) => ({ x: pd.x, z: pd.z, ref: pd, kind: 'ped' })),
    ];
    for (const t of targets) {
      const dx = t.x - p.x;
      const dz = t.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < COMBAT.punchRange && dx * fx + dz * fz > 0) {
        if (t.kind === 'enemy') {
          t.ref.health -= COMBAT.punchDamage;
          if (t.ref.health <= 0) { t.ref.alive = false; state.stats.kills += 1; p.cash += 25; }
        } else if (t.kind === 'cop') {
          t.ref.health -= COMBAT.punchDamage;
          if (t.ref.health <= 0) police.cops = police.cops.filter((c) => c !== t.ref);
        } else {
          t.ref.state = 'down';
          addWanted(police, WANTED.hitPed, p);
        }
        break;
      }
    }
  }

  function collectPickups() {
    const p = state.player;
    for (const pk of combat.pickups) {
      if (pk.taken && !pk.applied) {
        pk.applied = true;
        if (pk.kind === 'cash') { p.cash += 50; state.missions.message = 'Picked up $50.'; }
        else if (pk.kind === 'health') { p.health = Math.min(PLAYER.health, p.health + 35); state.missions.message = 'Health restored.'; }
        else { p.ammo += COMBAT.pistolAmmo; state.missions.message = 'Ammo restocked.'; }
        state.missions.messageT = 2;
        if (audio) audio.pickup();
      }
    }
  }

  function step(dt, input) {
    const p = state.player;
    state.time += dt;
    if (state.flashT > 0) state.flashT -= dt;
    if (state.missions.messageT > 0) state.missions.messageT -= dt;

    // Camera orbit from a mouse drag.
    const drag = input.takeDrag();
    state.camera.yaw -= drag.x * 0.005;
    state.camera.pitch = Math.max(-0.1, Math.min(0.9, state.camera.pitch + drag.y * 0.003));

    const actions = input.takeActions();
    if (actions & ACTION_MUTE && audio) {
      const muted = audio.toggleMute();
      state.missions.message = muted ? 'Sound muted (N to unmute).' : 'Sound on.';
      state.missions.messageT = 2;
    }
    if (actions & ACTION_ENTER && !p.dead) enterCar();
    if (actions & ACTION_RELOAD) {
      p.ammo = COMBAT.pistolAmmo;
      state.missions.message = 'Reloaded.';
      state.missions.messageT = 1.5;
    }
    if (actions & ACTION_PUNCH && !p.dead) punch();
    if (actions & ACTION_HORN && p.inCar && audio) audio.horn();
    if (input.takeClick() && !p.dead) firePistol();

    if (!p.dead) {
      if (p.inCar) {
        const car = p.car;
        const move = input.move();
        const crashed = driveCar(car, { x: -move.x, y: move.y, handbrake: input.handbrake() }, dt, city, cars);
        if (crashed && audio && Math.abs(car.speed) > 4) audio.crash();
        p.x = car.x;
        p.z = car.z;
        p.angle = car.angle;
        if (Math.abs(car.speed) > 4) {
          const hit = checkRunOver(traffic, car.x, car.z, CAR.radius);
          if (hit) {
            addWanted(police, WANTED.hitPed, p);
            state.missions.message = 'You hit a pedestrian! The PBPD is coming.';
            state.missions.messageT = 3;
            if (audio) audio.crash();
          }
        }
      } else {
        const move = input.move();
        const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
        const yaw = state.camera.yaw;
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        const rx = Math.cos(yaw);
        const rz = -Math.sin(yaw);
        let mx = fx * move.y + rx * move.x;
        let mz = fz * move.y + rz * move.x;
        const len = Math.hypot(mx, mz);
        if (len > 0) {
          mx /= len;
          mz /= len;
          p.angle = Math.atan2(mx, mz);
          p.vx = mx * speed;
          p.vz = mz * speed;
        } else {
          p.vx = 0;
          p.vz = 0;
        }
        if (input.jumping() && p.y === 0) p.vy = PLAYER.jumpSpeed;
        if (p.y > 0 || p.vy !== 0) {
          p.vy -= PLAYER.gravity * dt;
          p.y += p.vy * dt;
          if (p.y <= 0) { p.y = 0; p.vy = 0; }
        }
        const fixed = city.collide(p.x + p.vx * dt, p.z + p.vz * dt, PLAYER.radius);
        p.x = fixed.x;
        p.z = fixed.z;
      }
    }

    // The living city keeps moving.
    const danger = state.danger;
    state.danger = null;
    stepTraffic(traffic, dt, city, danger);
    stepCombat(combat, dt, p, city, (dmg) => hurtPlayer(dmg));
    collectPickups();

    stepPolice(police, dt, p, cars, random, () => { state.busted = true; });
    for (const cop of police.cops) {
      if (cop.shot) {
        cop.shot = false;
        if (Math.random() < COMBAT.copDamage) hurtPlayer(7 + Math.random() * 6);
        if (audio) audio.shoot();
      }
    }

    if (missions.active) {
      const result = stepMission(missions, combat, police, state, dt);
      if (result === 'done') {
        const reward = finishMission(missions, true);
        p.cash += reward;
        state.stats.missionsDone += 1;
        state.missions.message = `Mission complete! +$${reward}`;
        state.missions.messageT = 5;
        if (audio) audio.missionDone();
        if (missions.index >= 5) state.won = true;
      } else if (result === 'failed') {
        finishMission(missions, false);
        state.missions.message = 'Mission failed — press M to try again.';
        state.missions.messageT = 5;
        if (audio) audio.missionFail();
      }
    }

    if (audio) {
      const speed01 = p.inCar ? Math.abs(p.car.speed) / p.car.top : Math.hypot(p.vx, p.vz) / PLAYER.runSpeed;
      audio.update(Math.min(1, speed01), police.wanted, state.time);
    }
    return state;
  }

  return {
    state,
    step,
    city,
    startMission(index) {
      const m = startMission(missions, combat, index);
      if (m && m.def.id === 'beach-getaway') addWanted(police, 2, state.player);
      return m;
    },
  };
}
