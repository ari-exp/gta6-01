// Palmera Bay — finishing pass 2026-11-24
// Keyboard and mouse input for the whole game. Held keys are read fresh every frame
// (movement, running, handbrake); discrete presses (confirm, pause, enter car,
// reload, punch, horn, mute) are collected into one bitmask so that a press landing
// between two frames is counted once and never lost. Mouse drag orbits the camera,
// a click is the pistol trigger.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE   = 2;
export const ACTION_ENTER   = 4;
export const ACTION_RELOAD  = 8;
export const ACTION_PUNCH   = 16;
export const ACTION_HORN    = 32;
export const ACTION_MUTE    = 64;
export const ACTION_JUMP    = 128;

const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const PAUSE_KEYS   = new Set(['KeyP', 'Escape']);
const ENTER_KEYS   = new Set(['KeyE']);
const RELOAD_KEYS  = new Set(['KeyR']);
const PUNCH_KEYS   = new Set(['KeyF']);
const HORN_KEYS    = new Set(['KeyH']);
const MUTE_KEYS    = new Set(['KeyN']);
const SWALLOW = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragDX = 0;
  let dragDY = 0;
  let clickPending = false;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (CONFIRM_KEYS.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE_KEYS.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER_KEYS.has(event.code)) actions |= ACTION_ENTER;
    else if (RELOAD_KEYS.has(event.code)) actions |= ACTION_RELOAD;
    else if (PUNCH_KEYS.has(event.code)) actions |= ACTION_PUNCH;
    else if (HORN_KEYS.has(event.code)) actions |= ACTION_HORN;
    else if (MUTE_KEYS.has(event.code)) actions |= ACTION_MUTE;
    if (SWALLOW.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    clickPending = true;
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragDX += event.clientX - lastX;
    dragDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });

  return {
    held(code) { return held.has(code); },
    // Wasd / arrows as a camera-relative stick: x = strafe right, y = forward.
    move() {
      const x = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      const y = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
      return { x, y };
    },
    running() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    jumping() { return held.has('Space'); },
    handbrake() { return held.has('Space'); },
    // Take the accumulated presses, clearing them so the next frame starts empty.
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // Put a subset back (the screens consume confirm/pause, the world still needs
    // enter/reload/punch/horn/mute). Without this, a paused frame would see confirm
    // again and the pause would flicker every frame.
    putBack(flags) { actions |= flags; },
    takeDrag() {
      const d = { x: dragDX, y: dragDY };
      dragDX = 0;
      dragDY = 0;
      return d;
    },
    takeClick() {
      const c = clickPending;
      clickPending = false;
      return c;
    },
  };
}
