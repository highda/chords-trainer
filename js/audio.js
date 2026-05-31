let audioCtx = null;

export function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function playChord(notes, strumDuration, volume = 0.55) {
  const ctx = getAudioCtx();
  if (!notes?.length) return;
  const now = ctx.currentTime;
  const strumDelay = 0.018;
  const attackTime = 0.008;
  const decayTime = 0.12;
  const sustainLevel = 0.3;
  const holdTime = Math.max(0.05, strumDuration - attackTime - decayTime - 0.1);
  const releaseTime = Math.min(0.18 + strumDuration * 0.25, 0.55);

  notes.forEach((note, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.value = note.f;
    filt.type = "lowpass";
    filt.frequency.value = 2400 + note.f * 0.5;
    filt.Q.value = 0.8;
    const t0 = now + i * strumDelay;
    const peak = note.g * volume * 0.55;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + attackTime);
    gain.gain.linearRampToValueAtTime(sustainLevel * peak, t0 + attackTime + decayTime);
    gain.gain.setValueAtTime(sustainLevel * peak, t0 + attackTime + decayTime + holdTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attackTime + decayTime + holdTime + releaseTime);
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + attackTime + decayTime + holdTime + releaseTime + 0.05);
  });

  notes.slice(0, 3).forEach((note, i) => {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.value = note.f * 2;
    const t0 = now + i * strumDelay;
    const peak = note.g * volume * 0.08;
    gain2.gain.setValueAtTime(0, t0);
    gain2.gain.linearRampToValueAtTime(peak, t0 + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(strumDuration * 0.6, 0.8));
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t0);
    osc2.stop(t0 + Math.min(strumDuration * 0.6, 0.8) + 0.05);
  });
}

export function playClick(accent = false) {
  const ctx = getAudioCtx();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = accent ? 1200 : 800;
  filt.Q.value = accent ? 2 : 3;
  gain.gain.value = accent ? 0.5 : 0.3;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}
