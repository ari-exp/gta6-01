// Palmera Bay — finishing pass 2026-11-24
// Every tuning number and every name in one place. Palmera Bay is an original,
// fictional, sun-soaked coastal city: no commercial game's name, character, map or
// asset appears anywhere in this entry. The city is a road grid; between the roads
// sit the blocks, buildings stand on those blocks, the beach and the sea are east,
// the harbour is south, the bank district is the middle of town.

export const STEP = 1 / 60;              // fixed simulation step, seconds
export const SAVE_KEY = 'palmera-bay.save.v1';
export const BEST_KEY = 'palmera-bay.best.v1';

export const CITY = {
  half: 360,        // half the playable width in metres; the sea starts past +half
  roadGap: 90,      // spacing between road centre lines
  roadWidth: 14,
  sidewalk: 4,
};

// Road centre lines, used on BOTH axes (x and z) so the grid is consistent.
export const ROADS = [-315, -225, -135, -45, 45, 135, 225, 315];

export const PLAYER = {
  radius: 0.6,
  walkSpeed: 6,
  runSpeed: 10.5,
  jumpSpeed: 7,
  gravity: 22,
  health: 100,
  cash: 150,
};

export const CAR = {
  radius: 1.6,
  accel: 14,
  brake: 26,
  reverseMax: 9,
  drag: 0.55,
  steer: 1.9,
  // top speed per model, metres per second
  models: {
    sedan:  { top: 26, color: 0x3f6fb5, name: 'Marlin Sedan' },
    taxi:   { top: 24, color: 0xf2c94c, name: 'Sol Taxi' },
    sport:  { top: 34, color: 0xd94f3d, name: 'Comet GT' },
    van:    { top: 21, color: 0x7a8a99, name: 'Bison Van' },
    police: { top: 30, color: 0x232a34, name: 'PBPD Interceptor' },
  },
};

// How much heat each crime adds, how long a clean stretch cools one star.
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
  enemyDamageNear: 0.4,   // per-hit damage roll, close range
  enemyDamageFar: 0.22,   // per-hit damage roll, long range
  copDamage: 0.35,
};

// The five story jobs, chained, each with an objective, a marker and a cash reward.
export const MISSIONS = [
  {
    id: 'first-wheels',
    title: '1 — First Wheels',
    giver: 'Mara Solis',
    brief:
      'Mara: "Dario, you need wheels in this town. Walk up to any car and press E to take it, then bring it to the Sunset Garage marker."',
    objective: 'Steal a car and drive it to the Sunset Garage',
    reward: 200,
  },
  {
    id: 'sunset-delivery',
    title: '2 — Sunset Delivery',
    giver: 'Mara Solis',
    brief:
      'Mara: "Three packages, three drop-offs before the sun goes down. Drive fast and keep your head low. You have 150 seconds."',
    objective: 'Deliver 3 packages before the clock runs out',
    reward: 400,
    timeLimit: 150,
  },
  {
    id: 'harbor-heat',
    title: '3 — Harbor Heat',
    giver: 'Mara Solis',
    brief:
      'Mara: "The Dockside crew lifted our crate. Go down to the harbour, put the four guards down and bring the crate back. Click to fire — R reloads."',
    objective: 'Defeat the 4 dock guards and collect the crate',
    reward: 600,
  },
  {
    id: 'beach-getaway',
    title: '4 — Beach Getaway',
    giver: 'Mara Solis',
    brief:
      'Mara: "The PBPD is onto us. Lose them along the beach road — hit all three checkpoints with the heat on. Do not get busted."',
    objective: 'Hit 3 beach checkpoints while wanted',
    reward: 800,
    timeLimit: 180,
  },
  {
    id: 'big-score',
    title: '5 — The Big Score',
    giver: 'Mara Solis',
    brief:
      'Mara: "One last job: the Palmera Bank vault. Get to the door on the south side, grab the cash, survive the guards and run for the hideout out west. This is the big one, Dario."',
    objective: 'Rob the Palmera Bank vault and escape to the hideout',
    reward: 1500,
  },
];

// Fixed story places (x, z) on the city grid.
export const PLACES = {
  spawn:   { x: -45, z: -135, label: 'Apartment' },
  garage:  { x: -45, z: -45,  label: 'Sunset Garage' },
  drop1:   { x: 225, z: -225, label: 'Drop-off: Marina' },
  drop2:   { x: -225, z: 135, label: 'Drop-off: Old Town' },
  drop3:   { x: 135, z: 225,  label: 'Drop-off: Market' },
  harbor:  { x: -45, z: 315,  label: 'Dockside Harbour' },
  beach1:  { x: 315, z: -135, label: 'Checkpoint: North Beach' },
  beach2:  { x: 315, z: 45,   label: 'Checkpoint: Pier' },
  beach3:  { x: 315, z: 225,  label: 'Checkpoint: South Beach' },
  bank:    { x: 45,  z: 45,   label: 'Palmera Bank' },
  bankDoor:{ x: 45,  z: 24,   label: 'Vault cash' },   // just outside the south wall, reachable
  hideout: { x: -315, z: -315, label: 'Hideout' },
};

// Starting spots for the dedicated screenshot scenes (?shot=...&seed=N).
export const PALETTE = {
  sky: 0x8cc7e8,
  sun: 0xfff1cb,
  ground: 0x9c917b,
  road: 0x4f555d,
  sidewalk: 0xb9b1a1,
  sand: 0xe9d39b,
  sea: 0x2d80a9,
  building: [0xe8b48a, 0xd98a7a, 0x90b9ca, 0xc9d6a0, 0xe8d29a, 0xb89ac9, 0x9ac9b0, 0xd9a05a],
  text: '#f5f1e8',
  muted: '#cdc6b6',
  accent: '#ffb347',
  cash: '#82dc86',
  danger: '#ff5a4e',
  police: '#4f8ef7',
  marker: '#ffd23f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
