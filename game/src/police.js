// Palmera Bay — finishing pass 2026-11-24
// The wanted system and the Palmera Bay Police Department. Wanted stars rise with
// each crime and cool off one star at a time when the player stays clean and out of
// sight. Foot officers appear from one star, patrol cars chase from two, and the
// whole force gives up when the heat is gone. Getting caught on foot is Busted.
import { WANTED, COMBAT } from './config.js';
import { createCar } from './vehicles.js';

export function createPolice() {
  return {
    wanted: 0,
    heat: 0,      // seconds since the last crime
    bustT: 0,     // seconds a cop has been on top of the player (2.5 s = Busted)
    cops: [],     // foot officers {x,z,angle,speed,health,shootT,shot}
    cars: [],     // patrol cars (entries in the shared car list, driver 'police')
    nextSpawn: 0,
  };
}

export function addWanted(police, amount, player) {
  police.wanted = Math.min(WANTED.max, police.wanted + amount);
  police.heat = 0;
  return police.wanted;
}

function spawnFootCop(police, player, random) {
  const angle = random() * Math.PI * 2;
  const d = 25 + random() * 15;
  police.cops.push({
    x: player.x + Math.sin(angle) * d,
    z: player.z + Math.cos(angle) * d,
    angle: 0,
    speed: 5.2,
    health: COMBAT.copHealth,
    shootT: 1 + random(),
    shot: false,
  });
}

function spawnPatrolCar(police, player, cars, random) {
  const angle = random() * Math.PI * 2;
  const d = 35 + random() * 15;
  const car = createCar(500 + police.cars.length, 'police', player.x + Math.sin(angle) * d, player.z + Math.cos(angle) * d, angle, 'police');
  car.speed = 12;
  police.cars.push(car);
  cars.push(car);
}

export function stepPolice(police, dt, player, cars, random, onBusted) {
  police.heat += dt;
  if (police.wanted > 0 && police.heat > WANTED.decaySeconds) {
    police.wanted -= 1;
    police.heat = 0;
    if (police.wanted === 0) {
      police.cops = [];
      for (const car of police.cars) car.driver = 'none';
      police.cars = [];
    }
  }
  if (police.wanted === 0) return;

  police.nextSpawn -= dt;
  const wantCops = Math.min(1 + police.wanted, 6);
  const wantCars = police.wanted >= 2 ? Math.min(police.wanted - 1, 3) : 0;
  if (police.nextSpawn <= 0) {
    if (police.cops.length < wantCops) spawnFootCop(police, player, random);
    if (police.cars.length < wantCars) spawnPatrolCar(police, player, cars, random);
    police.nextSpawn = 4;
  }

  const px = player.inCar ? player.car.x : player.x;
  const pz = player.inCar ? player.car.z : player.z;

  let nearestCop = Infinity;
  for (const cop of police.cops) {
    const dx = px - cop.x;
    const dz = pz - cop.z;
    const d = Math.hypot(dx, dz);
    cop.angle = Math.atan2(dx, dz);
    if (d > 2) {
      cop.x += Math.sin(cop.angle) * cop.speed * dt;
      cop.z += Math.cos(cop.angle) * cop.speed * dt;
    }
    nearestCop = Math.min(nearestCop, d);
    cop.shootT -= dt;
    if (d > 12 && d < 45 && cop.shootT <= 0 && player.armed) {
      cop.shootT = 1.6;
      cop.shot = true;
    } else {
      cop.shot = false;
    }
  }
  if (!player.inCar && nearestCop < 2.2) {
    police.bustT += dt;
    if (police.bustT > 2.5) onBusted();
  } else {
    police.bustT = Math.max(0, police.bustT - dt);
  }

  for (const car of police.cars) {
    const dx = px - car.x;
    const dz = pz - car.z;
    const d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    const target = Math.min(car.top, 10 + police.wanted * 3);
    car.speed += (target - car.speed) * dt * 0.8;
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    if (player.inCar && d < 4) {
      player.car.speed *= 0.85;
      car.speed *= 0.7;
    }
  }
}
