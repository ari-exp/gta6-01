<!-- Palmera Bay — finishing pass 2026-11-24 -->
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/ari-exp/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/ari-exp/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Palmera Bay — An Open-World Crime Story (gta6-01)

An original open-world crime game in the spirit of GTA 6, built entirely from scratch:
its own city, characters, vehicles, names, story, art, sounds and music. Nothing from
Rockstar Games or any other commercial game is used.

**Play it:** serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and play offline in a desktop browser — keyboard and mouse,
no network requests. Three.js 0.186.1 (MIT) is vendored at `game/vendor/three.min.js`.

## The game

Dario Cruz is back in Palmera Bay with $150 and a phone call from Mara Solis. Explore a
sun-soaked coastal city on foot and by car, steal cars, outrun the Palmera Bay Police
Department, and run five story missions to pull off the Big Score at the Palmera Bank.

- **On foot:** WASD to move (camera-relative), Shift to run, Space to jump, mouse drag to orbit the camera.
- **Cars:** press E next to any car to steal and drive it (W/S gas and brake, A/D steer, Space handbrake).
  Stealing raises your wanted level; cars collide with buildings and each other.
- **Traffic and pedestrians:** 14 AI traffic cars drive the road grid; 24 pedestrians walk the
  sidewalks and flee from gunshots and from cars coming at them.
- **Wanted and police:** 0–5 stars. Crimes raise the heat; foot officers chase from one star,
  patrol cars ram you from two. Stay clean and unseen and the heat fades. Caught on foot = Busted;
  out of health = Wasted. Either way you respawn at the apartment, the active job restarts, and your
  progress is kept — the page never reloads.
- **Missions and story (5, chained, from Mara Solis — press M):** 1 First Wheels, 2 Sunset Delivery
  (timed), 3 Harbor Heat (shootout), 4 Beach Getaway (police chase), 5 The Big Score (rob the
  Palmera Bank vault at the door on the south side and escape to the hideout).
- **Combat:** click to shoot the pistol (R reloads, ammo boxes restock), F to punch. Gangsters and
  bank guards shoot back — lightly, so a fight is survivable.
- **HUD and minimap:** cash, health, wanted stars, ammo, objective with distance and timer,
  speedometer, city clock, and a live top-down minimap (roads, sea, player, cars, police, marker).
- **Start and save:** title screen with Start / Continue / Missions, pause menu with Save
  (localStorage `palmera-bay.save.v1`), Busted / Wasted / Win screens, best-cash record.
- **Polish:** a hot afternoon sun with shadows, procedural window textures (CanvasTexture), palm
  trees, beach and sea, harbour, dust and muzzle-flash particles, damage vignette, and WebAudio-
  synthesised engine, sirens, gunshots, pickups and a synth music loop. No audio files, no copied
  assets, no network.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move / drive |
| Shift | Run |
| Mouse drag | Orbit camera |
| Click | Shoot pistol |
| E | Steal / enter / exit car |
| F | Punch |
| R | Reload |
| M | Next mission |
| Space | Jump / handbrake |
| H | Horn |
| N | Mute / unmute sound |
| P / Esc | Pause |

## Screenshots

`screenshots/` holds four renders of the game itself, staged from the real rules by
`?shot=start|play|drive|end&seed=1` (see `shots.json`): the title, on-foot play, a police
chase while driving, and the winning Big Score.

## Structure

One file, one job, under `game/src/`: `config` (tuning and story data), `random` (seeded RNG),
`input` (keyboard and mouse), `audio` (WebAudio synth), `city` (city mesh, collisions and roads),
`vehicles` (car meshes and driving), `traffic` (AI cars and pedestrians), `police` (wanted, officers,
patrol cars), `combat` (pistol, punch, enemies, pickups), `missions` (the five story missions),
`hud` (HUD, minimap and screens), `save` (localStorage), `render` (Three.js scene and camera),
`world` (the rules and one step), `shots` (the screenshot scenes), `main` (boot and the loop).

## License

MIT — see `LICENSE`. Three.js is MIT, see `game/vendor/THREE-LICENSE.txt`.
