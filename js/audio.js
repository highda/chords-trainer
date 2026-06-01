let audioCtx = null;
let masterOut = null;
let noiseBuffer = null;

export function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setupMasterChain(audioCtx);
  }
  return audioCtx;
}

export function playChord(notes, strumDuration, volume = 0.55, synthOptions = {}) {
  const ctx = getAudioCtx();
  if (!notes?.length) return;

  const settings = normalizeSynthOptions(synthOptions);
  const now = ctx.currentTime;
  const strumDelay = 0.012 + (1 - settings.pickNoise) * 0.008;
  const totalStrings = 6;

  notes.forEach((note, i) => {
    const t0 = now + i * strumDelay;
    const stringIndex = Number.isFinite(note?.stringIndex) ? note.stringIndex : i;
    const fret = Number.isFinite(note?.fret) ? note.fret : null;
    const isOpen = Boolean(note?.isOpen);
    const fretDamping = fret && fret > 0 ? Math.max(0.8, 1 - fret * 0.015) : 1;
    playStringVoice(
      ctx,
      note.f,
      note.g * volume * fretDamping,
      t0,
      strumDuration,
      settings,
      stringIndex,
      totalStrings,
      { isOpen, fret }
    );
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
  gain.gain.value = accent ? 0.55 : 0.34;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(gain);
  gain.connect(masterOut);
  src.start();
}

function setupMasterChain(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 16;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.002;
  comp.release.value = 0.22;

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 6200;
  tone.Q.value = 0.25;

  const output = ctx.createGain();
  output.gain.value = 1.5;

  comp.connect(tone);
  tone.connect(output);
  output.connect(ctx.destination);
  masterOut = comp;
}

function playStringVoice(ctx, frequency, peak, startTime, strumDuration, settings, stringIndex, totalStrings, voicing = {}) {
  const stringBus = ctx.createGain();
  const bodyPeak = ctx.createBiquadFilter();
  const bodyAir = ctx.createBiquadFilter();
  const tone = ctx.createBiquadFilter();
  const outGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const isOpen = Boolean(voicing.isOpen);
  const fret = Number.isFinite(voicing.fret) ? voicing.fret : 0;

  bodyPeak.type = "peaking";
  bodyPeak.frequency.value = 180;
  bodyPeak.Q.value = 0.9;
  bodyPeak.gain.value = 2 + settings.body * 6.5;

  bodyAir.type = "peaking";
  bodyAir.frequency.value = 820;
  bodyAir.Q.value = 1.15;
  bodyAir.gain.value = 1 + settings.body * 3.5;

  tone.type = "lowpass";
  tone.frequency.value = 2200 + settings.brightness * 5600 + (isOpen ? 220 : 0);
  tone.Q.value = 0.3;

  const fretDamping = fret > 0 ? Math.min(0.22, fret * 0.015) : 0;
  const decayTime = 0.95 + (1 - frequency / 700) * 0.7 + settings.body * 0.4 + (isOpen ? 0.12 : 0) - fretDamping;
  const releaseTime = Math.max(0.75, Math.min(2.1, strumDuration * 1.8 + decayTime));

  outGain.gain.setValueAtTime(0.0001, startTime);
  outGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.9), startTime + 0.012);
  outGain.gain.exponentialRampToValueAtTime(Math.max(0.00012, peak * (0.14 + settings.body * 0.07)), startTime + 0.18);
  outGain.gain.exponentialRampToValueAtTime(0.0001, startTime + releaseTime);

  panner.pan.value = totalStrings > 1 ? -0.12 + (stringIndex / (totalStrings - 1)) * 0.24 : 0;

  stringBus.connect(bodyPeak);
  bodyPeak.connect(bodyAir);
  bodyAir.connect(tone);
  tone.connect(outGain);
  outGain.connect(panner);
  panner.connect(masterOut);

  playPickNoise(ctx, stringBus, peak, startTime, settings);
  playFundamental(ctx, stringBus, frequency, peak, startTime, releaseTime, settings);
  playPartial(ctx, stringBus, frequency * 2.002, peak * 0.32, startTime, Math.min(0.95, releaseTime * 0.58), settings, 0.7);
  playPartial(ctx, stringBus, frequency * 3.01, peak * 0.12, startTime, Math.min(0.55, releaseTime * 0.36), settings, 0.45);
}

function playPickNoise(ctx, target, peak, startTime, settings) {
  const noise = ctx.createBufferSource();
  const pickFilter = ctx.createBiquadFilter();
  const airFilter = ctx.createBiquadFilter();
  const pickGain = ctx.createGain();

  noise.buffer = getNoiseBuffer(ctx);

  pickFilter.type = "bandpass";
  pickFilter.frequency.value = 1100 + settings.brightness * 3400;
  pickFilter.Q.value = 0.8;

  airFilter.type = "highpass";
  airFilter.frequency.value = 140 + settings.pickNoise * 260;

  pickGain.gain.setValueAtTime(0.0001, startTime);
  pickGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * (0.06 + settings.pickNoise * 0.12)), startTime + 0.004);
  pickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.05 + settings.pickNoise * 0.03);

  noise.connect(pickFilter);
  pickFilter.connect(airFilter);
  airFilter.connect(pickGain);
  pickGain.connect(target);

  noise.start(startTime);
  noise.stop(startTime + 0.08);
}

function playFundamental(ctx, target, frequency, peak, startTime, releaseTime, settings) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency * 1.008, startTime);
  osc.frequency.exponentialRampToValueAtTime(frequency, startTime + 0.024);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * (0.72 + settings.body * 0.12)), startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.00012, peak * 0.1), startTime + releaseTime);

  osc.connect(gain);
  gain.connect(target);
  osc.start(startTime);
  osc.stop(startTime + releaseTime + 0.05);
}

function playPartial(ctx, target, frequency, peak, startTime, releaseTime, settings, toneScale) {
  const osc = ctx.createOscillator();
  const filt = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency * 1.003, startTime);
  osc.frequency.exponentialRampToValueAtTime(frequency, startTime + 0.016);

  filt.type = "lowpass";
  filt.frequency.value = 1500 + settings.brightness * 5200 * toneScale;
  filt.Q.value = 0.22;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * (0.7 + settings.brightness * 0.25)), startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + releaseTime);

  osc.connect(filt);
  filt.connect(gain);
  gain.connect(target);
  osc.start(startTime);
  osc.stop(startTime + releaseTime + 0.05);
}

function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = Math.exp(-i / (ctx.sampleRate * 0.018));
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  return noiseBuffer;
}

function normalizeSynthOptions(options) {
  return {
    brightness: clamp01((options.brightness ?? 62) / 100),
    body: clamp01((options.body ?? 58) / 100),
    pickNoise: clamp01((options.pickNoise ?? 36) / 100),
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
