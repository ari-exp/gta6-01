// Palmera Bay — finishing pass 2026-11-24
// Vehicles: the car meshes, spawning parked cars, and the driving model
// (acceleration, steering, braking and collisions against buildings and other cars).
// A car is plain state; render.js turns that state into a Three.js mesh. Finding the
// nearest stealable car lives here too, because stealing is a vehicles concern.
const THREE = window.THREE; // vendor/three.min.js loads as a classic script (global THREE).
import { CAR, ROADS } from './config.js';

export function makeCarMesh(model, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), bodyMat);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glassMat);
  cabin.position.set(0, 1.15, -0.2);
  g.add(cabin);

  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, 0.38, z);
    g.add(wheel);
  }
  if (model === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    bar.position.set(0, 1.55, -0.2);
    g.add(bar);
  }
  if (model === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    sign.position.set(0, 1.55, -0.2);
    g.add(sign);
  }
  return g;
}

export function createCar(id, model, x, z, angle, driver) {
  const spec = CAR.models[model] || CAR.models.sedan;
  return {
    id, model, name: spec.name, top: spec.top, color: spec.color,
    x, z, angle, speed: 0,
    driver: driver || 'none',   // 'none' | 'player' | 'traffic' | 'police'
    route: [], routeIdx: 0,
    health: 100,
  };
}

// Parked cars along the roads and in the open plazas — the cars a thief can take.
export function spawnParkedCars(random, city) {
  const cars = [];
  const models = ['sedan', 'sedan', 'taxi', 'sport', 'van', 'sedan'];
  let id = 0;
  for (let i = 0; i < 12; i += 1) {
    const road = ROADS[Math.floor(random() * ROADS.length)];
    const along = -300 + random() * 600;
    const horizontal = random() < 0.5;
    const x = horizontal ? along : road + (random() < 0.5 ? 5.5 : -5.5);
    const z = horizontal ? road + (random() < 0.5 ? 5.5 : -5.5) : along;
    const angle = horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    if (city.hitsBuilding(x, z, 3)) continue;
    cars.push(createCar(id, models[i % models.length], x, z, angle, 'none'));
    id += 1;
  }
  // A guaranteed sports car near the apartment so a fresh player can always steal one.
  cars.push(createCar(id, 'sport', -30, -135, Math.PI / 2, 'none'));
  return cars;
}

export function nearestCar(cars, x, z, maxDist, driver) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (driver !== undefined && car.driver !== driver) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

// One driving step for a player-driven car. Returns true when it hit something hard.
export function driveCar(car, controls, dt, city, otherCars) {
  const top = car.top;
  const steer = controls.x * CAR.steer * (car.speed >= 0 ? 1 : -1);
  if (Math.abs(car.speed) > 0.5) car.angle += steer * dt * Math.min(1, Math.abs(car.speed) / 8);
  if (controls.y > 0) {
    car.speed += CAR.accel * dt * (1 - car.speed / top);
  } else if (controls.y < 0) {
    car.speed += car.speed > 0.5 ? -CAR.brake * dt : -CAR.accel * 0.6 * dt;
    if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
  } else {
    car.speed -= car.speed * CAR.drag * dt * 2;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }
  if (controls.handbrake) car.speed *= Math.max(0, 1 - 3 * dt);

  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  let crashed = false;
  if (city.hitsBuilding(nx, nz, CAR.radius)) {
    car.speed *= -0.25;
    crashed = true;
  } else {
    car.x = nx;
    car.z = nz;
  }
  const fixed = city.collide(car.x, car.z, CAR.radius);
  car.x = fixed.x;
  car.z = fixed.z;

  // Bump into other cars (including traffic and patrol cars).
  for (const other of otherCars) {
    if (other === car) continue;
    const dx = car.x - other.x;
    const dz = car.z - other.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.4 && d > 0.01) {
      car.x = other.x + (dx / d) * 3.4;
      car.z = other.z + (dz / d) * 3.4;
      car.speed *= 0.5;
      crashed = true;
    }
  }
  return crashed;
}
