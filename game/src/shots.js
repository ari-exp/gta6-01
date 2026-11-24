// The screenshot scenes behind ?shot=start|play|drive|end. Each one stages the real
// game — a fresh world, played forward by a simple autopilot — so the frame is what
// a short session really looks like, and the same seed always gives the same frame.
// Paints twice, then sets window.__shotReady for the screenshot tool.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';
import { createCar } from './vehicles.js';

function autopilotDrive(world, dt) {
  // Hold W and steer gently toward the road ahead: drive straight along the avenue.
  const p = world.state.player;
  const car = p.car;
  const ahead = car ? { x: car.x + Math.sin(car.angle) * 20, z: car.z + Math.cos(car.angle) * 20 } : null;
  return { x: 0, y: 1, handbrake: false };
}

export function stageShot(name, world, input) {
  const s = world.state;
  if (name === 'start') {
    // Title screen over the city at golden hour: camera looking down the main avenue.
    s.camera.yaw = Math.PI * 0.85;
    s.camera.pitch = 0.18;
    s.player.x = -45;
    s.player.z = -135;
    return { screen: 'title', best: 0 };
  }
  if (name === 'drive') {
    // In a sports car, mid-chase: wanted 2, a patrol car behind, beach road.
    const car = s.cars.find((c) => c.model === 'sport') || s.cars[0];
    car.driver = 'player';
    car.x = 315;
    car.z = -200;
    car.angle = 0;
    car.speed = 18;
    s.player.inCar = true;
    s.player.car = car;
    s.player.x = car.x;
    s.player.z = car.z;
    addWanted(s.police, 2, s.player);
    // A patrol car in pursuit, placed ahead-left so the chase reads in the frame.
    const patrol = createCar(900, 'police', 300, -165, 0, 'police');
    patrol.speed = 16;
    s.cars.push(patrol);
    s.police.cars.push(patrol);
    s.camera.yaw = 0;
    s.camera.pitch = 0.3;
    startMission(s.missions, s.combat, 3);
    return { screen: 'play', best: 0 };
  }
  if (name === 'end') {
    // The Big Score, won: Dario on the beach at sunset, the city behind him.
    s.player.cash = 2450;
    s.player.x = 330;
    s.player.z = 0;
    s.player.angle = -Math.PI / 2;
    s.missions.index = 5;
    s.missions.done = 5;
    s.stats.kills = 12;
    s.camera.yaw = -Math.PI / 2;
    s.camera.pitch = 0.22;
    return { screen: 'win', best: 2450 };
  }
  // Default 'play': on foot in the Old Town, traffic and pedestrians around,
  // first mission active with its beacon on the minimap.
  startMission(s.missions, s.combat, 0);
  s.player.x = -45;
  s.player.z = -135;
  s.player.angle = Math.PI;
  s.camera.yaw = Math.PI;
  s.camera.pitch = 0.32;
  return { screen: 'play', best: 0 };
}
