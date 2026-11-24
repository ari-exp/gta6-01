// Palmera Bay — finishing pass 2026-11-24
// A tiny seeded pseudo-random generator (mulberry32). One integer seed drives the
// whole city, the traffic routes and the screenshot scenes, so ?seed=N always gives
// the same town and the same frame, and a fresh seed gives a fresh town.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one element of an array with the given generator.
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

// A number in [min, max).
export function range(random, min, max) {
  return min + random() * (max - min);
}
