// Every tuning number and name in one place. Palmera Bay is an original fictional
// sun-soaked coastal city: no Rockstar names, characters, map or assets anywhere.
// The city is a road grid; roads run at the coordinates in ROADS, blocks between them
// hold the buildings, the beach and sea are east, the harbour is south.
export const STEP = 1 / 60;
export const SAVE_KEY = 'palmera-bay.save.v1';
export const BEST_KEY = 'palmera-bay.best.v1';

export const CITY = {
  half: 360, // playable half-size in metres; the sea starts just past +x
  roadGap: 90,
  roadWidth: 14,
  sidewalk: 4,
};
// Road centre lines, both axes.
export const ROADS = [-315, -225, -135, -45, 45, 135, 225, 315];

export const PLAYER = {
  radius: 0.6,
  walkSpeed: 6,
  runSpeed: 10.5,
  jumpSpeed: 7,
  health: 100,
  turnSpeed: 9,
};

export const CAR = {
  radius: 1.6,
  accel: 14,
  brake: 26,
  reverseMax: 9,
  drag: 0.55,
  steer: 1.9,
  // top speed per model, m/s
  models: {
    sedan: { top: 26, color: 0x3f6fb5, name: 'Marlin Sedan' },
    taxi: { top: 24, color: 0xf2c94c, name: 'Sol Taxi' },
    sport: { top: 34, color: 0xd94f3d, name: 'Comet GT' },
    van: { top: 21, color: 0x7a8a99, name: 'Bison Van' },
    police: { top: 30, color: 0x222831, name: 'PBPD Interceptor' },
  },
};

export const WANTED = {
  stealCar: 1,
  hitPed: 1,
  shoot: 1,
  killCop: 2,
  decaySeconds: 22,
  max: 5,
};

export const COMBAT = {
  pistolDamage: 34,
  pistolRange: 70,
  pistolAmmo: 12,
  punchDamage: 20,
  punchRange: 2.4,
  enemyHealth: 70,
  copHealth: 60,
};

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: '1 — First Wheels',
    giver: 'Mara Solis',
    brief:
      'Mara: "Dario, you need wheels. Take any car on the street — press E next to one — and bring it to the Sunset Garage marker."',
    objective: 'Steal a car and drive to the Sunset Garage',
    reward: 200,
  },
  {
    id: 'sunset-delivery',
    title: '2 — Sunset Delivery',
    giver: 'Mara Solis',
    brief:
      'Mara: "Three packages, three drop-offs, before the sun sets. Drive fast, stay out of trouble. You have 150 seconds."',
    objective: 'Deliver 3 packages before time runs out',
    reward: 400,
    timeLimit: 150,
  },
  {
    id: 'harbor-heat',
    title: '3 — Harbor Heat',
    giver: 'Mara Solis',
    brief:
      'Mara: "The Dockside crew took our crate. Go to the harbour, deal with the four guards, and take the crate back. Gun’s loaded — click to shoot."',
    objective: 'Defeat the 4 dock guards and collect the crate',
    reward: 600,
  },
  {
    id: 'beach-getaway',
    title: '4 — Beach Getaway',
    giver: 'Mara Solis',
    brief:
      'Mara: "The PBPD is onto us. Lose them along the beach road — hit all 3 checkpoints with the heat on. Do not get busted."',
    objective: 'Hit 3 beach checkpoints while wanted',
    reward: 800,
    timeLimit: 180,
  },
  {
    id: 'big-score',
    title: '5 — The Big Score',
    giver: 'Mara Solis',
    brief:
      'Mara: "One last job: the Palmera Bank vault. Get inside, grab the cash, survive the guards, and escape to the hideout. This is the big one, Dario."',
    objective: 'Rob the Palmera Bank vault and escape to the hideout',
    reward: 1500,
  },
];

// Fixed story places (x, z) on the city grid.
export const PLACES = {
  garage: { x: -45, z: -45, label: 'Sunset Garage' },
  drop1: { x: 225, z: -225, label: 'Drop-off: Marina' },
  drop2: { x: -225, z: 135, label: 'Drop-off: Old Town' },
  drop3: { x: 135, z: 225, label: 'Drop-off: Market' },
  harbor: { x: -45, z: 315, label: 'Dockside Harbour' },
  beach1: { x: 315, z: -135, label: 'Checkpoint: North Beach' },
  beach2: { x: 315, z: 45, label: 'Checkpoint: Pier' },
  beach3: { x: 315, z: 225, label: 'Checkpoint: South Beach' },
  bank: { x: 45, z: 45, label: 'Palmera Bank' },
  hideout: { x: -315, z: -315, label: 'Hideout' },
  spawn: { x: -45, z: -135, label: 'Apartment' },
};

export const PALETTE = {
  sky: 0x87c5e8,
  sun: 0xfff2cf,
  ground: 0x9a8f7a,
  road: 0x50565e,
  sidewalk: 0xb8b0a0,
  sand: 0xe8d29a,
  sea: 0x2e7fa8,
  building: [0xe8b48a, 0xd98a7a, 0x8fb8c9, 0xc9d6a0, 0xe8d29a, 0xb89ac9, 0x9ac9b0, 0xd9a05a],
  text: '#f5f1e8',
  muted: '#cfc8b8',
  accent: '#ffb347',
  cash: '#7ddc7d',
  danger: '#ff5a4e',
  police: '#4f8ef7',
  marker: '#ffd23f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
