// The city itself: ground, road grid, sidewalks, buildings with procedural window
// textures, palm trees, the beach and sea, the harbour and street props. It also owns
// the collision boxes and the road helpers the traffic and the player both use.
// Everything here is generated from the seed — no imported models or textures.
const THREE = window.THREE; // three.min.js loads as a classic script in index.html (global THREE).
import { CITY, ROADS, PALETTE } from './config.js';

function windowTexture(random, baseColor) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = baseColor;
  g.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 244; y += 22) {
    for (let x = 10; x < 118; x += 22) {
      const lit = random() < 0.35;
      g.fillStyle = lit ? '#ffe9a8' : '#2c3a4a';
      g.fillRect(x, y, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCity(random) {
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const buildings = [];
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 40, CITY.half * 2 + 400),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.1, 0);
  group.add(ground);

  // Roads: dark strips + centre dashes, both directions.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5e9c8 });
  for (const r of ROADS) {
    for (const [w, d, x, z] of [
      [CITY.half * 2, CITY.roadWidth, 0, r],
      [CITY.roadWidth, CITY.half * 2, r, 0],
    ]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.01, z);
      group.add(road);
    }
    // Sidewalk border around each road crossing is drawn by the blocks themselves.
    for (let t = -CITY.half; t <= CITY.half; t += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(t, 0.02, r);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(r, 0.02, t);
      group.add(dash2);
    }
  }

  // Beach sand + sea to the east.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(70, CITY.half * 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(CITY.half + 35, 0.02, 0);
  group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, CITY.half * 2 + 400),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CITY.half + 270, -0.4, 0);
  group.add(sea);

  // Buildings: one to four boxes per block, heights grow toward the centre.
  const blockCentres = [];
  for (let i = 0; i < ROADS.length - 1; i += 1) {
    for (let j = 0; j < ROADS.length - 1; j += 1) {
      blockCentres.push({ x: (ROADS[i] + ROADS[i + 1]) / 2, z: (ROADS[j] + ROADS[j + 1]) / 2 });
    }
  }
  // The bank plaza (45,45) and the harbour (z=315) stay open.
  const keepOpen = (x, z) => (Math.abs(x - 45) < 46 && Math.abs(z - 45) < 46) || z > 280;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const b of blockCentres) {
    if (keepOpen(b.x, b.z)) continue;
    const distCentre = Math.hypot(b.x, b.z) / CITY.half;
    const count = 1 + Math.floor(random() * 3);
    for (let k = 0; k < count; k += 1) {
      const w = 18 + random() * 22;
      const d = 18 + random() * 22;
      const h = 8 + random() * 26 + (1 - distCentre) * 22;
      const ox = (random() - 0.5) * 30;
      const oz = (random() - 0.5) * 30;
      const x = b.x + ox;
      const z = b.z + oz;
      const color = PALETTE.building[Math.floor(random() * PALETTE.building.length)];
      const hex = `#${color.toString(16).padStart(6, '0')}`;
      const mat = new THREE.MeshLambertMaterial({ map: windowTexture(random, hex) });
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, h / 2, z);
      group.add(mesh);
      // Flat roof cap.
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

  // Palmera Bank: a tall glass tower on the plaza, with a gold roof.
  const bankMat = new THREE.MeshLambertMaterial({ map: windowTexture(random, '#7fb2c9') });
  const bank = new THREE.Mesh(boxGeo, bankMat);
  bank.scale.set(34, 52, 34);
  bank.position.set(45, 26, 45);
  group.add(bank);
  colliders.push({ minX: 28, maxX: 62, minZ: 28, maxZ: 62 });
  buildings.push({ x: 45, z: 45, w: 34, d: 34, h: 52 });

  // Palm trees along the beach and the main avenue.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b4a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 7, 6);
  const leafGeo = new THREE.ConeGeometry(3.2, 2.2, 7);
  function palm(x, z) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    t.add(trunk);
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 7.6;
    t.add(leaves);
    t.position.set(x, 0, z);
    group.add(t);
  }
  for (let z = -330; z <= 330; z += 30) palm(352, z);
  for (let x = -300; x <= 300; x += 60) {
    palm(x, -52);
    palm(x + 30, 52);
  }

  // Harbour crates + containers at the south docks.
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xb07830 });
  const contMat = new THREE.MeshLambertMaterial({ color: 0x4a7a8c });
  for (let i = 0; i < 10; i += 1) {
    const crate = new THREE.Mesh(boxGeo, i % 3 === 0 ? contMat : crateMat);
    const cx = -180 + i * 36;
    const cz = 322 + (i % 2) * 8;
    crate.scale.set(10, i % 3 === 0 ? 5 : 3, 6);
    crate.position.set(cx, crate.scale.y / 2, cz);
    group.add(crate);
    colliders.push({ minX: cx - 5, maxX: cx + 5, minZ: cz - 3, maxZ: cz + 3 });
  }

  // Street lamps at intersections.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const r of ROADS) {
    for (const s of ROADS) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 5), poleMat);
      pole.position.set(r + 9, 3, s + 9);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
      lamp.position.set(r + 9, 6.2, s + 9);
      group.add(lamp);
    }
  }

  // ---- helpers ----
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
  // Push a circle out of every building it overlaps; returns corrected {x, z}.
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
    // City bounds + sea edge.
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
