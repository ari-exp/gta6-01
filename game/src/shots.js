// Palmera Bay — finishing pass 2026-11-24
// The four staged screenshot scenes behind ?shot=start|play|drive|end&seed=N. Each
// one takes the real world and plays it forward a little, so the frame shows what a
// short session really looks like (never a pasted image), and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';
import { createCar } from './vehicles.js';

// A neutral input so the world can be stepped forward without a keyboard attached.
export function neutralInput(forward) {
  return {
    takeDrag: () => ({ x: 0, y: 0 }),
    takeActions: () => 0,
    takeClick: () => false,
    move: () => ({ x: 0, y: forward ? 1 : 0 }),
    held: () => false,
    running: () => false,
    jumping: () => false,
    handbrake: () => false,
  };
}

// Arrange the world for a named scene. Returns {screen, best} for the boot code.
export function stageShot(name, world) {
  const s = world.state;
  if (name === 'start') {
    // Title screen over the city at golden hour: the camera looks down the avenue.
    s.camera.yaw = Math.PI * 0.85;
    s.camera.pitch = 0.18;
    s.player.x = -45;
    s.player.z = -135;
    s.player.angle = Math.PI * 0.85;
    return { screen: 'title', best: 0 };
  }
  if (name === 'drive') {
    // In a sports car, mid-chase: wanted 2, a patrol car behind, on the beach road.
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
    const patrol = createCar(900, 'police', 300, -168, 0, 'police');
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
  // Default 'play': on foot in Old Town, traffic and pedestrians around, the first
  // mission active with its beacon on the minimap.
  startMission(s.missions, s.combat, 0);
  s.player.x = -45;
  s.player.z = -135;
  s.player.angle = Math.PI;
  s.camera.yaw = Math.PI;
  s.camera.pitch = 0.32;
  return { screen: 'play', best: 0 };
}

// Let the city breathe before the shot: traffic and pedestrians settle into place.
export function warmUpShot(name, world) {
  if (name === 'drive') {
    for (let i = 0; i < 90; i += 1) world.step(STEP, neutralInput(true));
  } else if (name === 'play') {
    for (let i = 0; i < 150; i += 1) world.step(STEP, neutralInput(false));
  }
}
