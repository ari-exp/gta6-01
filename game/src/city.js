// Palmera Bay — finishing pass 2026-11-24
// The city itself: ground, road grid, sidewalks, blocks of buildings with procedural
// window textures, palm trees, the beach and the sea, the harbour and street props.
// It owns the collision boxes and the road helpers that the player, the traffic and
// the police all share. Everything is generated from the seed — nothing imported.
const THREE = window.THREE; // vendor/three.min.js loads as a classic script (global THREE).
import { CITY, ROADS, PALETTE } from './config.js';

// A canvas-drawn facade: a base colour with a grid of lit and dark windows.
function windowTexture(random, baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 244; y += 22) {
    for (let x = 10; x < 118; x += 22) {
      ctx.fillStyle = random() < 0.35 ? '#ffe9a8' : '#2c3a4a';
      ctx.fillRect(x, y, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCity(random) {
  const colliders = [];   // {minX,maxX,minZ,maxZ} axis-aligned box collision
  const buildings = [];    // {x,z,w,d,h} for reference / future use
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  // Ground under the whole town. It stops at the beach so it never covers the sea.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 60, CITY.half * 2 + 60),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.1, 0);
  group.add(ground);

  // Roads: dark strips with a dashed centre line, laid on both axes.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5e9c8 });
  for (const r of ROADS) {
    for (const [w, d, x, z] of [
      [CITY.half * 2, CITY.roadWidth, 0, r],
      [CITY.roadWidth, CITY.half * 2, r, 0],
    ]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(x, 0.01, z);
      group.add(strip);
    }
    for (let t = -CITY.half + 6; t <= CITY.half - 6; t += 12) {
      const dashA = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
      dashA.rotation.x = -Math.PI / 2;
      dashA.position.set(t, 0.02, r);
      group.add(dashA);
      const dashB = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
      dashB.rotation.x = -Math.PI / 2;
      dashB.position.set(r, 0.02, t);
      group.add(dashB);
    }
  }

  // Beach sand, then the sea further east. The sea sits lower so it reads as water.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(70, CITY.half * 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(CITY.half + 35, 0.02, 0);
  group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(420, CITY.half * 2 + 120),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CITY.half + 280, -0.5, 0);
  group.add(sea);

  // Sidewalk curbs around every block, so the roads read as streets.
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  for (let i = 0; i < ROADS.length - 1; i += 1) {
    for (let j = 0; j < ROADS.length - 1; j += 1) {
      const cx = (ROADS[i] + ROADS[i + 1]) / 2;
      const cz = (ROADS[j] + ROADS[j + 1]) / 2;
      const size = ROADS[i + 1] - ROADS[i] - CITY.roadWidth;
      const pad = new THREE.Mesh(new THREE.BoxGeometry(size, 0.12, size), walkMat);
      pad.position.set(cx, 0.06, cz);
      group.add(pad);
    }
  }

  // Blocks: one cluster of buildings per gap between roads, skipping the sea side.
  for (let i = 0; i < ROADS.length - 1; i += 1) {
    for (let j = 0; j < ROADS.length - 1; j += 1) {
      const bx = (ROADS[i] + ROADS[i + 1]) / 2;
      const bz = (ROADS[j] + ROADS[j + 1]) / 2;
      if (bx + 30 > CITY.half) continue;         // keep the beach and sea clear
      if (keepOpen(bx, bz)) continue;
      const count = 1 + Math.floor(random() * 3);
      for (let k = 0; k < count; k += 1) {
        const w = 18 + random() * 22;
        const d = 18 + random() * 22;
        const distCentre = Math.hypot(bx, bz) / CITY.half;
        const h = 8 + random() * 26 + (1 - distCentre) * 22;   // downtown grows taller
        const x = bx + (random() - 0.5) * 24;
        const z = bz + (random() - 0.5) * 24;
        const color = PALETTE.building[Math.floor(random() * PALETTE.building.length)];
        const hex = `#${color.toString(16).padStart(6, '0')}`;
        const mesh = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: windowTexture(random, hex) }));
        mesh.scale.set(w, h, d);
        mesh.position.set(x, h / 2, z);
        group.add(mesh);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
          new THREE.MeshLambertMaterial({ color: 0x6b5d4f }),
        );
        roof.position.set(x, h + 0.4, z);
        group.add(roof);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        buildings.push({ x, z, w, d, h });
      }
    }
  }

  // Palmera Bank: a tall glass tower on the plaza, marking the bank district.
  const bank = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: windowTexture(random, '#7fb2c9') }));
  bank.scale.set(34, 52, 34);
  bank.position.set(45, 26, 45);
  group.add(bank);
  colliders.push({ minX: 28, maxX: 62, minZ: 28, maxZ: 62 });
  buildings.push({ x: 45, z: 45, w: 34, d: 34, h: 52 });

  // Palm trees along the beach and the main avenues.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b4a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 7, 6);
  const leafGeo = new THREE.ConeGeometry(3.2, 2.2, 7);
  function palm(x, z) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    tree.add(trunk);
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 7.6;
    tree.add(leaves);
    tree.position.set(x, 0, z);
    group.add(tree);
  }
  for (let z = -330; z <= 330; z += 30) palm(352, z);
  for (let x = -300; x <= 300; x += 60) {
    palm(x, -52);
    palm(x + 30, 52);
  }

  // Harbour crates and containers along the south docks.
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xb07830 });
  const containerMat = new THREE.MeshLambertMaterial({ color: 0x4a7a8c });
  for (let i = 0; i < 10; i += 1) {
    const crate = new THREE.Mesh(boxGeo, i % 3 === 0 ? containerMat : crateMat);
    const cx = -180 + i * 36;
    const cz = 324 + (i % 2) * 8;
    crate.scale.set(10, i % 3 === 0 ? 5 : 3, 6);
    crate.position.set(cx, crate.scale.y / 2, cz);
    group.add(crate);
    colliders.push({ minX: cx - 5, maxX: cx + 5, minZ: cz - 3, maxZ: cz + 3 });
  }

  // Street lamps at every intersection.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 5);
  const lampGeo = new THREE.SphereGeometry(0.5, 8, 6);
  for (const r of ROADS) {
    for (const s of ROADS) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(r + 9, 3, s + 9);
      group.add(pole);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(r + 9, 6.2, s + 9);
      group.add(lamp);
    }
  }

  // ---- helpers shared by everything that moves ----
  function keepOpen(x, z) {
    // Leave the bank plaza and the garage corner open.
    const nearBank = Math.abs(x - 45) < 20 && Math.abs(z - 45) < 20;
    const nearGarage = Math.abs(x + 45) < 18 && Math.abs(z + 45) < 18;
    return nearBank || nearGarage;
  }

  function onRoad(x, z) {
    for (const r of ROADS) {
      if (Math.abs(x - r) < CITY.roadWidth / 2 + 1 || Math.abs(z - r) < CITY.roadWidth / 2 + 1) return true;
    }
    return false;
  }

  function nearestRoadCoord(v) {
    let best = ROADS[0];
    for (const r of ROADS) if (Math.abs(v - r) < Math.abs(v - best)) best = r;
    return best;
  }

  // Push a circle out of every building it overlaps; returns the corrected {x, z}.
  function collide(x, z, radius) {
    let nx = x;
    let nz = z;
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(nx, c.maxX));
      const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
      const dx = nx - cx;
      const dz = nz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 < 1e-6) {
          nx = c.maxX + radius;
        } else {
          const d = Math.sqrt(d2);
          nx = cx + (dx / d) * radius;
          nz = cz + (dz / d) * radius;
        }
      }
    }
    // City bounds and the sea edge.
    nx = Math.max(-CITY.half, Math.min(CITY.half + 30, nx));
    nz = Math.max(-CITY.half, Math.min(CITY.half, nz));
    return { x: nx, z: nz };
  }

  function hitsBuilding(x, z, radius) {
    for (const c of colliders) {
      if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) return true;
    }
    return false;
  }

  return { group, colliders, buildings, onRoad, nearestRoadCoord, collide, hitsBuilding };
}
