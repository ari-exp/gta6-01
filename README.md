# Palmera Bay — An Open-World Crime Story (gta6-01)

An original open-world crime game in the spirit of GTA 6, built entirely from
scratch: its own city, characters, vehicles, names, story, art, sounds and music.
Nothing from Rockstar Games or any other commercial game is used.

**Play it:** serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and play offline in a desktop browser — keyboard + mouse,
no network requests. Three.js 0.186.1 (MIT) is vendored at
`game/vendor/three.min.js`.

## The game

Dario Cruz is back in Palmera Bay with $150 and a phone call from Mara Solis.
Explore a sun-soaked coastal city on foot and by car, steal cars, outrun the
Palmera Bay Police Department, and run five story missions to pull off the Big
Score at the Palmera Bank.

- **On foot:** WASD to move, Shift to run, Space to jump, mouse drag to orbit the camera.
- **Cars:** press E next to any car to steal and drive it (W/S gas and brake,
  A/D steer, Space handbrake). Stealing raises your wanted level.
- **Traffic & pedestrians:** 14 AI traffic cars drive the road grid; 24 pedestrians
  walk the sidewalks and flee from gunshots and speeding cars.
- **Wanted & police:** 0–5 stars. Crimes raise the heat; foot officers chase from
  1 star, patrol cars ram you from 2 stars. Stay clean and unseen and the heat fades.
  Get caught on foot and you are Busted; lose all health and you are Wasted.
- **Missions & story (5, chained, from Mara Solis, press M):** 1 First Wheels,
  2 Sunset Delivery (timed), 3 Harbor Heat (shootout), 4 Beach Getaway (police
  chase), 5 The Big Score (rob the Palmera Bank vault and escape to the hideout).
- **Combat:** click to shoot the pistol (R reloads, ammo boxes restock), F to punch.
  Gangsters and bank guards shoot back.
- **HUD & minimap:** cash, health, wanted stars, ammo, objective with distance and
  timer, speedometer, city clock, and a live top-down minimap (player, cars, police,
  enemies, mission marker).
- **Start & save:** title screen with Start / Continue / Missions, pause menu with
  Save (localStorage), Busted / Wasted / Win screens, best-cash record.
- **Polish:** golden-hour sun with shadows, procedural window textures, palm trees,
  beach and sea, harbour, WebAudio-synthesised engine, sirens, gunshots, pickups
  and a synth music loop (M mutes). No audio files, no copied assets.

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

`screenshots/` holds four renders of the game itself: title, on-foot play,
police chase while driving, and the winning Big Score.

## Structure

One file, one job, under `game/src/`: `config` (tuning + story data), `random`
(seed), `input` (keyboard + mouse), `audio` (WebAudio synth), `city` (city mesh
+ collisions + roads), `vehicles` (car meshes + driving), `traffic` (AI cars +
pedestrians), `police` (wanted + officers + patrol cars), `combat` (pistol,
punch, enemies, pickups), `missions` (5 story jobs), `hud` (HUD + minimap +
screens), `save` (localStorage), `render` (Three.js scene + camera), `world`
(rules + one step), `shots` (screenshot scenes), `main` (boot + loop).

## License

MIT — see `LICENSE`. Three.js is MIT, see `game/vendor/THREE-LICENSE.txt`.
