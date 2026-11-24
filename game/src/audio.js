// All sound and music are synthesised with WebAudio — no audio files, no network,
// nothing copied. Engine hum, siren, gunshots, pickups, mission jingles and a small
// sun-soaked synth loop are all oscillators and filtered noise made here.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine: two detuned saws through a low-pass, pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 500;
      engineOsc.connect(filt);
      filt.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: a sine that the update loop wails up and down.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq || 3000;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t);
  }

  // A lazy 8-step bass + sparkle loop in A minor, 112 BPM.
  const BASS = [55, 0, 55, 65.41, 55, 0, 49, 58.27];
  const CHORD = [220, 261.63, 329.63, 440];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (!ctx || muted || ctx.state !== 'running') return;
      const step = musicStep % 8;
      musicStep += 1;
      if (BASS[step]) tone(BASS[step], 0.5, 'triangle', 0.1);
      if (step % 2 === 0) tone(CHORD[(musicStep / 2) % 4 | 0], 0.4, 'sine', 0.045);
      if (step === 4) tone(880, 0.18, 'sine', 0.04);
    }, 268);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      noise(0.14, 0.5, 2600);
      tone(180, 0.08, 'square', 0.12, 60);
    },
    punch() {
      noise(0.08, 0.3, 900);
    },
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
    crash() {
      noise(0.25, 0.45, 700);
    },
    busted() {
      [440, 415, 392, 370].forEach((f, i) => window.setTimeout(() => tone(f, 0.35, 'sawtooth', 0.14), i * 160));
    },
    update(speed01, wanted, time) {
      if (!ctx || muted) return;
      if (engineGain) {
        engineGain.gain.value = 0.02 + speed01 * 0.09;
        engineOsc.frequency.value = 55 + speed01 * 130;
      }
      if (sirenGain) {
        const on = wanted >= 2;
        sirenGain.gain.value = on ? 0.045 : 0;
        if (on) sirenOsc.frequency.value = 650 + 250 * Math.sin(time * 4.5);
      }
    },
  };
}
