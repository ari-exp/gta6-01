// Keyboard and mouse input. Held keys are read every frame; one-shot presses
// (confirm, pause, enter car, reload, punch, horn) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
// Mouse drag orbits the third-person camera; a click is the pistol trigger.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RELOAD = 8;
export const ACTION_PUNCH = 16;
export const ACTION_HORN = 32;
export const ACTION_MUTE = 64;
export const ACTION_JUMP = 128;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const RELOAD = new Set(['KeyR']);
const PUNCH = new Set(['KeyF']);
const HORN = new Set(['KeyH']);
const MUTE = new Set(['KeyN']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDown = false;
  let mouseClicked = false;
  let dragDX = 0;
  let dragDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER.has(event.code)) actions |= ACTION_ENTER;
    else if (RELOAD.has(event.code)) actions |= ACTION_RELOAD;
    else if (PUNCH.has(event.code)) actions |= ACTION_PUNCH;
    else if (HORN.has(event.code)) actions |= ACTION_HORN;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    mouseDown = true;
    mouseClicked = true;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
    mouseDown = false;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragDX += event.clientX - lastX;
    dragDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });

  return {
    held(code) {
      return keys.has(code);
    },
    // WASD / arrows, camera-relative: x = strafe right, y = forward.
    move() {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      return { x, y };
    },
    running() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    jumping() {
      return keys.has('Space');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // Put actions back for the world step after the screen handled its own keys.
    pushActions(back) {
      actions |= back;
    },
    takeDrag() {
      const d = { x: dragDX, y: dragDY };
      dragDX = 0;
      dragDY = 0;
      return d;
    },
    takeClick() {
      const c = mouseClicked;
      mouseClicked = false;
      return c;
    },
    mouseDown() {
      return mouseDown;
    },
  };
}
