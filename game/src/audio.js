// Palmera Bay — finishing pass 2026-11-24
// All sound and music are synthesised with the Web Audio API — there is not a single
// audio file, so the game still makes noise fully offline. An engine hum that follows
// speed, a two-tone siren when the heat is on, gunshots and punches from filtered
// noise, pickup and mission jingles, and a small sun-soaked synth loop underneath.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engine = null;
  let engineGain = null;
  let siren = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;

  function ready() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 520;
      engine.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engine.start();

      siren = ctx.createOscillator();
      siren.type = 'sine';
      siren.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      siren.connect(sirenGain);
      sirenGain.connect(master);
      siren.start();

      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, cutoff) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff || 3000;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  // A lazy eight-step bass and chord loop in A minor at ~112 BPM, all oscillators.
  const BASS = [55, 0, 55, 65.41, 55, 0, 49, 58.27];
  const CHORD = [220, 261.63, 329.63, 440];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (!ctx || muted || ctx.state !== 'running') return;
      const step = musicStep % 8;
      musicStep += 1;
      if (BASS[step]) tone(BASS[step], 0.5, 'triangle', 0.1);
      if (step % 2 === 0) tone(CHORD[Math.floor(musicStep / 2) % 4], 0.4, 'sine', 0.045);
      if (step === 4) tone(880, 0.18, 'sine', 0.04);
    }, 268);
  }

  return {
    unlock() { ready(); },
    isMuted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() {
      noise(0.13, 0.5, 2600);
      tone(180, 0.08, 'square', 0.12, 60);
    },
    punch() { noise(0.08, 0.3, 900); },
    crash() { noise(0.25, 0.45, 700); },
    pickup() {
      tone(660, 0.09, 'sine', 0.2);
      window.setTimeout(() => tone(990, 0.14, 'sine', 0.2), 70);
    },
    cash() {
      tone(880, 0.1, 'triangle', 0.2);
      window.setTimeout(() => tone(1174, 0.1, 'triangle', 0.2), 80);
      window.setTimeout(() => tone(1568, 0.22, 'triangle', 0.22), 160);
    },
    missionDone() {
      [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => tone(f, 0.25, 'triangle', 0.22), i * 110));
    },
    missionFail() {
      [392, 330, 262].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'sawtooth', 0.12), i * 140));
    },
    horn() {
      tone(370, 0.35, 'square', 0.14);
      tone(466, 0.35, 'square', 0.1);
    },
    busted() {
      [440, 415, 392, 370].forEach((f, i) => window.setTimeout(() => tone(f, 0.35, 'sawtooth', 0.14), i * 160));
    },
    // Called every step: speed01 is 0..1, wanted is 0..5.
    update(speed01, wanted, time) {
      if (!ctx || muted) return;
      if (engineGain) {
        engineGain.gain.value = 0.02 + speed01 * 0.09;
        engine.frequency.value = 55 + speed01 * 130;
      }
      if (sirenGain) {
        const on = wanted >= 2;
        sirenGain.gain.value = on ? 0.045 : 0;
        if (on) siren.frequency.value = 650 + 250 * Math.sin(time * 4.5);
      }
    },
  };
}
