// Palmera Bay — finishing pass 2026-11-24
// Drawing only: the Three.js scene, the sun and shadows, the camera, and every moving
// mesh. State comes in, pixels go out — no rules live here. One mesh is created per
// entity and then moved for its lifetime, so a frame allocates almost nothing.
const THREE = window.THREE; // vendor/three.min.js loads as a classic script (global THREE).
import { PALETTE } from './config.js';
import { makeCarMesh } from './vehicles.js';

function personMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshLambertMaterial({ color: skin || 0xd9a066 }));
  head.position.y = 1.75;
  g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), new THREE.MeshLambertMaterial({ color: pants || 0x2c3a4a }));
  legs.position.y = 0.3;
  g.add(legs);
  return g;
}

export function createRenderer(canvas, city) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 190, 540);
  scene.add(city.group);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.9));
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.far = 400;
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(sun.target);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1300);

  const playerMesh = personMesh(0x2e7d6b, 0x2c3a4a);
  playerMesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(playerMesh);
  const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.45), new THREE.MeshLambertMaterial({ color: 0x14161a }));
  gunMesh.position.set(0.35, 1.2, 0.3);
  playerMesh.add(gunMesh);

  const carMeshes = new Map();
  const pedMeshes = new Map();
  const copMeshes = new Map();
  const enemyMeshes = new Map();
  const pickupMeshes = new Map();

  // Mission beacon: a column of light and a floating diamond above the marker.
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: PALETTE.marker, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30;
  beacon.add(beam);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshBasicMaterial({ color: PALETTE.marker }));
  diamond.position.y = 8;
  beacon.add(diamond);
  scene.add(beacon);

  // Muzzle flash and tracer for gunfire.
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
  flash.visible = false;
  scene.add(flash);
  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9 }));
  tracer.visible = false;
  tracer.frustumCulled = false;
  scene.add(tracer);

  // Dust: a small ring of points that kicks up around the player while moving.
  const DUST = 48;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST * 3);
  const dustLife = new Float32Array(DUST);
  for (let i = 0; i < DUST; i += 1) dustPos[i * 3 + 1] = -50;
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xe6dcc2, size: 0.5, transparent: true, opacity: 0.55 }));
  dust.frustumCulled = false;
  scene.add(dust);
  let dustCursor = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function carMeshFor(car) {
    let m = carMeshes.get(car.id);
    if (!m) {
      m = makeCarMesh(car.model, car.color);
      m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(m);
      carMeshes.set(car.id, m);
    }
    return m;
  }

  function personFor(map, key, make) {
    let m = map.get(key);
    if (!m) {
      m = make();
      m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(m);
      map.set(key, m);
    }
    return m;
  }

  function pickupMeshFor(p) {
    let m = pickupMeshes.get(p);
    if (!m) {
      const g = new THREE.Group();
      if (p.kind === 'cash') {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.6), new THREE.MeshLambertMaterial({ color: 0x2fae4e })));
      } else if (p.kind === 'health') {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshLambertMaterial({ color: 0xf5f1e8 })));
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xd92a2a }));
        cross.position.z = 0.36;
        g.add(cross);
      } else {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), new THREE.MeshLambertMaterial({ color: 0xf2c94c })));
      }
      g.position.y = 0.8;
      scene.add(g);
      pickupMeshes.set(p, g);
      m = g;
    }
    return m;
  }

  function update(state, dt) {
    const p = state.player;
    const px = p.inCar ? p.car.x : p.x;
    const pz = p.inCar ? p.car.z : p.z;

    // Third-person orbit camera: further out and higher in a car.
    const cam = state.camera;
    const dist = p.inCar ? 13 : 9;
    const height = p.inCar ? 5.5 : 4.2;
    camera.position.set(
      px - Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist,
      height + Math.sin(cam.pitch) * dist,
      pz - Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist,
    );
    camera.lookAt(px + Math.sin(cam.yaw) * 2, p.inCar ? 1.5 : 1.6, pz + Math.cos(cam.yaw) * 2);

    // The sun (and its shadow box) follows the player so shadows stay crisp anywhere.
    sun.position.set(px + 120, 180, pz + 60);
    sun.target.position.set(px, 0, pz);

    playerMesh.visible = !p.inCar && !p.dead;
    if (playerMesh.visible) {
      const moving = Math.hypot(p.vx || 0, p.vz || 0) > 0.5;
      playerMesh.position.set(p.x, (p.y || 0) + (moving ? Math.abs(Math.sin(state.time * 11)) * 0.08 : 0), p.z);
      playerMesh.rotation.y = p.angle;
      gunMesh.visible = p.armed;
    }

    const seenCars = new Set();
    for (const car of state.cars) {
      seenCars.add(car.id);
      const m = carMeshFor(car);
      m.position.set(car.x, car.health < 40 ? Math.sin(state.time * 30) * 0.02 : 0, car.z);
      m.rotation.y = car.angle;
    }
    for (const [id, m] of carMeshes) {
      if (!seenCars.has(id)) { scene.remove(m); carMeshes.delete(id); }
    }

    const seenPeds = new Set();
    for (const ped of state.traffic.peds) {
      seenPeds.add(ped.id);
      const m = personFor(pedMeshes, ped.id, () => personMesh(ped.color, 0x2c3a4a));
      m.visible = ped.state !== 'down';
      m.position.set(ped.x, ped.state === 'down' ? -0.4 : 0, ped.z);
      m.rotation.y = ped.angle;
      m.rotation.x = ped.state === 'down' ? Math.PI / 2 : 0;
    }
    for (const [id, m] of pedMeshes) if (!seenPeds.has(id)) { scene.remove(m); pedMeshes.delete(id); }

    const seenCops = new Set();
    state.police.cops.forEach((cop, i) => {
      seenCops.add(i);
      const m = personFor(copMeshes, i, () => personMesh(0x1d3f7a, 0x14161a, 0xc98a5a));
      m.position.set(cop.x, 0, cop.z);
      m.rotation.y = cop.angle;
      m.rotation.x = 0;
    });
    for (const [id, m] of copMeshes) if (!seenCops.has(id)) { scene.remove(m); copMeshes.delete(id); }

    const seenEnemies = new Set();
    state.combat.enemies.forEach((e, i) => {
      seenEnemies.add(i);
      const m = personFor(enemyMeshes, i, () => personMesh(e.kind === 'guard' ? 0x3a3f46 : 0x7a1f1f, 0x14161a));
      m.visible = e.alive;
      m.position.set(e.x, 0, e.z);
      m.rotation.y = e.angle;
    });
    for (const [id, m] of enemyMeshes) if (!seenEnemies.has(id)) { scene.remove(m); enemyMeshes.delete(id); }

    for (const pk of state.combat.pickups) {
      const m = pickupMeshFor(pk);
      m.visible = !pk.taken;
      m.position.set(pk.x, 0.8 + Math.sin(pk.spin) * 0.15, pk.z);
      m.rotation.y = pk.spin;
    }

    const marker = state.missions.active && state.missions.active.marker;
    beacon.visible = !!marker;
    if (marker) {
      beacon.position.set(marker.x, 0, marker.z);
      diamond.rotation.y += dt * 2;
      diamond.position.y = 8 + Math.sin(state.time * 2.5) * 0.8;
    }

    flash.visible = state.combat.muzzle > 0;
    if (flash.visible) flash.position.set(px + Math.sin(p.angle) * 1.2, 1.3, pz + Math.cos(p.angle) * 1.2);
    const tr = state.combat.tracer;
    tracer.visible = !!tr;
    if (tr) {
      const pos = tracerGeo.attributes.position.array;
      pos[0] = tr.x1; pos[1] = 1.3; pos[2] = tr.z1;
      pos[3] = tr.x2; pos[4] = 1.1; pos[5] = tr.z2;
      tracerGeo.attributes.position.needsUpdate = true;
    }

    // Dust kicked up while the player moves.
    const moving = p.inCar ? Math.abs(p.car.speed) > 6 : Math.hypot(p.vx || 0, p.vz || 0) > 2;
    if (moving) {
      const i = dustCursor;
      dustPos[i * 3] = px + (Math.random() - 0.5) * 1.4;
      dustPos[i * 3 + 1] = 0.25;
      dustPos[i * 3 + 2] = pz + (Math.random() - 0.5) * 1.4;
      dustLife[i] = 1;
      dustCursor = (dustCursor + 1) % DUST;
    }
    for (let i = 0; i < DUST; i += 1) {
      if (dustLife[i] > 0) {
        dustLife[i] -= dt * 1.4;
        dustPos[i * 3 + 1] += dt * 1.6;
        if (dustLife[i] <= 0) dustPos[i * 3 + 1] = -50;
      }
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  return { update, resize, scene, camera, renderer };
}
