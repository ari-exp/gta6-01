// Traffic and pedestrians: the living city. Traffic cars drive the road grid from
// intersection to intersection; pedestrians walk the sidewalks and flee from
// gunshots and from cars coming at them. Both are plain state for render.js.
import { CAR, ROADS, CITY } from './config.js';
import { createCar } from './vehicles.js';

function randomRoute(random) {
  const route = [];
  let x = ROADS[Math.floor(random() * ROADS.length)];
  let z = ROADS[Math.floor(random() * ROADS.length)];
  route.push({ x, z });
  for (let i = 0; i < 6; i += 1) {
    if (random() < 0.5) x = ROADS[Math.floor(random() * ROADS.length)];
    else z = ROADS[Math.floor(random() * ROADS.length)];
    route.push({ x, z });
  }
  return route;
}

export function createTraffic(random) {
  const cars = [];
  for (let i = 0; i < 14; i += 1) {
    const model = ['sedan', 'sedan', 'taxi', 'van', 'sedan'][i % 5];
    const route = randomRoute(random);
    const car = createCar(100 + i, model, route[0].x, route[0].z, 0, 'traffic');
    car.route = route;
    car.routeIdx = 1;
    car.speed = 8 + random() * 4;
    cars.push(car);
  }
  const peds = [];
  const shirtColors = [0xd94f3d, 0x4f8ef7, 0x7ddc7d, 0xf2c94c, 0xc98ab8, 0x8a6fd9, 0xe8e8e8, 0x3a3f46];
  for (let i = 0; i < 24; i += 1) {
    const road = ROADS[Math.floor(random() * ROADS.length)];
    const along = -320 + random() * 640;
    const horiz = random() < 0.5;
    peds.push({
      id: i,
      x: horiz ? along : road + 9,
      z: horiz ? road + 9 : along,
      angle: random() * Math.PI * 2,
      speed: 1.2 + random() * 0.9,
      color: shirtColors[i % shirtColors.length],
      state: 'walk', // 'walk' | 'flee' | 'down'
      fleeT: 0,
      wanderT: 2 + random() * 4,
    });
  }
  return { cars, peds };
}

export function stepTraffic(traffic, dt, city, danger) {
  // danger: {x, z, radius} — a gunshot or a speeding car; peds inside it flee.
  for (const car of traffic.cars) {
    const target = car.route[car.routeIdx];
    if (!target) continue;
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) {
      car.routeIdx += 1;
      if (car.routeIdx >= car.route.length) {
        car.route = randomRoute(Math.random);
        car.routeIdx = 1;
      }
      continue;
    }
    const want = Math.atan2(dx, dz);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
  }
  for (const ped of traffic.peds) {
    if (ped.state === 'down') continue;
    if (danger && Math.hypot(ped.x - danger.x, ped.z - danger.z) < danger.radius) {
      ped.state = 'flee';
      ped.fleeT = 3;
      ped.angle = Math.atan2(ped.x - danger.x, ped.z - danger.z);
    }
    if (ped.state === 'flee') {
      ped.fleeT -= dt;
      if (ped.fleeT <= 0) ped.state = 'walk';
    } else {
      ped.wanderT -= dt;
      if (ped.wanderT <= 0) {
        ped.wanderT = 3 + Math.random() * 5;
        ped.angle = Math.random() * Math.PI * 2;
      }
    }
    const speed = ped.state === 'flee' ? 4.5 : ped.speed;
    let nx = ped.x + Math.sin(ped.angle) * speed * dt;
    let nz = ped.z + Math.cos(ped.angle) * speed * dt;
    if (city.hitsBuilding(nx, nz, 0.6)) {
      ped.angle += Math.PI / 2;
      nx = ped.x;
      nz = ped.z;
    }
    nx = Math.max(-CITY.half, Math.min(CITY.half, nx));
    nz = Math.max(-CITY.half, Math.min(CITY.half, nz));
    ped.x = nx;
    ped.z = nz;
  }
}

// A traffic car or a pedestrian hit by the player's car: returns what was hit.
export function checkRunOver(traffic, x, z, radius) {
  for (const ped of traffic.peds) {
    if (ped.state === 'down') continue;
    if (Math.hypot(ped.x - x, ped.z - z) < radius + 0.7) {
      ped.state = 'down';
      return { kind: 'ped', ped };
    }
  }
  return null;
}
