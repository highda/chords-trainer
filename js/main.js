import { getPosition, loadGuitarData, formatLabel, suffixColor } from "./chords.js";
import { state } from "./state.js";
import { initChordSelector } from "./ui/chordSelector.js";
import { initBeatDots } from "./ui/beatDots.js";
import { initSpeedup } from "./ui/speedup.js";
import { initSessionTimer } from "./ui/sessionTimer.js";
import { initProgressBar } from "./ui/progressBar.js";
import { playChord, playClick, getAudioCtx } from "./audio.js";
import { renderFretboardSVG } from "./fretboard.js";

function pickRandom(list, exclude) {
  const arr = list.filter((x) => x !== exclude);
  if (!arr.length) return list[0] || null;
  return arr[Math.floor(Math.random() * arr.length)];
}

document.addEventListener("DOMContentLoaded", async () => {
  const warningEl = document.getElementById("warning");
  let guitarData;
  try {
    guitarData = await loadGuitarData();
  } catch (error) {
    warningEl.textContent = "Chord data failed to load. Open the app through http://localhost:8000.";
    warningEl.classList.add("visible");
    throw error;
  }
  const chordDisplayEl = document.getElementById("chordDisplay");
  const chordStageEl = document.getElementById("chordStage");
  const chordHintEl = document.getElementById("chordHint");
  const phaseEl = document.getElementById("phaseIndicator");
  const nextPreviewEl = document.getElementById("nextPreview");
  const progressBarEl = document.getElementById("progressBar");
  const bpmDisplayEl = document.getElementById("bpmDisplay");
  const bpmSliderEl = document.getElementById("bpmSlider");
  const startBtnEl = document.getElementById("startBtn");
  const startBtnTextEl = document.getElementById("startBtnText");
  const focusModeToggleEl = document.getElementById("focusModeToggle");
  const focusChordSelectEl = document.getElementById("focusChordSelect");
  const fretboardMount = document.getElementById("fretboardMount");
  const synthBrightnessEl = document.getElementById("synthBrightness");
  const synthBrightnessValueEl = document.getElementById("synthBrightnessValue");
  const synthBodyEl = document.getElementById("synthBody");
  const synthBodyValueEl = document.getElementById("synthBodyValue");
  const synthPickNoiseEl = document.getElementById("synthPickNoise");
  const synthPickNoiseValueEl = document.getElementById("synthPickNoiseValue");
  const paneEls = [...document.querySelectorAll("[data-mobile-pane]")];
  const tabEls = [...document.querySelectorAll("[data-tab-target]")];
  const speedupDom = {
    speedupPanelEl: document.getElementById("speedupPanel"),
    speedupToggle: document.getElementById("speedupToggle"),
    speedupBody: document.getElementById("speedupBody"),
    speedupChevron: document.getElementById("speedupChevron"),
    suBarsSlider: document.getElementById("suBarsSlider"),
    suStepSlider: document.getElementById("suStepSlider"),
    suMaxSlider: document.getElementById("suMaxSlider"),
    suBarsVal: document.getElementById("suBarsVal"),
    suStepVal: document.getElementById("suStepVal"),
    suMaxVal: document.getElementById("suMaxVal"),
  };

  const updateBeatDots = initBeatDots();
  const animateProgress = initProgressBar();
  const timer = initSessionTimer();
  initSpeedup(speedupDom);

  function syncSynthUi() {
    synthBrightnessEl.value = String(state.synthBrightness);
    synthBrightnessValueEl.textContent = String(state.synthBrightness);
    synthBodyEl.value = String(state.synthBody);
    synthBodyValueEl.textContent = String(state.synthBody);
    synthPickNoiseEl.value = String(state.synthPickNoise);
    synthPickNoiseValueEl.textContent = String(state.synthPickNoise);
  }

  function setMobileTab(tabName) {
    paneEls.forEach((pane) => pane.classList.toggle("is-active", pane.dataset.mobilePane === tabName));
    tabEls.forEach((tab) => {
      const active = tab.dataset.tabTarget === tabName;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  tabEls.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (state.isRunning && tab.dataset.tabTarget === "pick") return;
      setMobileTab(tab.dataset.tabTarget);
    });
  });

  function syncFocusOptions() {
    const selected = [...state.selectedChords.values()];
    focusChordSelectEl.replaceChildren();
    selected.forEach((entry) => {
      const id = `${entry.key}_${entry.suffix}`;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = formatLabel(entry.key, entry.suffix);
      focusChordSelectEl.appendChild(option);
    });
    if (!selected.find((x) => `${x.key}_${x.suffix}` === state.focusedChordId)) {
      state.focusedChordId = selected[0] ? `${selected[0].key}_${selected[0].suffix}` : null;
    }
    focusChordSelectEl.value = state.focusedChordId || "";
    focusChordSelectEl.disabled = !state.focusModeEnabled || state.isRunning || selected.length === 0;
  }

  initChordSelector(guitarData, {
    onSelectionChange() {
      syncFocusOptions();
      warningEl.classList.toggle("visible", state.selectedChords.size < 2);
    },
    onActiveChanged() {
      renderBrowseChord();
    },
  });

  bpmSliderEl.addEventListener("input", () => {
    state.bpm = Number(bpmSliderEl.value);
    bpmDisplayEl.textContent = String(state.bpm);
  });
  synthBrightnessEl.addEventListener("input", () => {
    state.synthBrightness = Number(synthBrightnessEl.value);
    synthBrightnessValueEl.textContent = String(state.synthBrightness);
  });
  synthBodyEl.addEventListener("input", () => {
    state.synthBody = Number(synthBodyEl.value);
    synthBodyValueEl.textContent = String(state.synthBody);
  });
  synthPickNoiseEl.addEventListener("input", () => {
    state.synthPickNoise = Number(synthPickNoiseEl.value);
    synthPickNoiseValueEl.textContent = String(state.synthPickNoise);
  });
  focusModeToggleEl.addEventListener("change", () => {
    state.focusModeEnabled = focusModeToggleEl.checked;
    syncFocusOptions();
  });
  focusChordSelectEl.addEventListener("change", () => {
    state.focusedChordId = focusChordSelectEl.value;
  });

  function getNextChord(previousChordId = null) {
    const ids = [...state.selectedChords.keys()];
    if (!state.focusModeEnabled || !state.focusedChordId || !ids.includes(state.focusedChordId)) {
      return pickRandom(ids, previousChordId);
    }
    const remainder = ids.filter((id) => id !== state.focusedChordId);
    if (!remainder.length) return state.focusedChordId;
    if (state.focusNeedsFocused) {
      state.focusNeedsFocused = false;
      return state.focusedChordId;
    }
    state.focusNeedsFocused = true;
    return pickRandom(remainder, previousChordId);
  }

  function renderCurrentChord() {
    const entry = state.selectedChords.get(state.currentChordId);
    if (!entry) return;
    chordDisplayEl.textContent = formatLabel(entry.key, entry.suffix);
    chordDisplayEl.style.color = suffixColor(entry.suffix);
    fretboardMount.replaceChildren(renderFretboardSVG(entry.position));
  }

  function renderBrowseChord() {
    if (state.isRunning || !state.activeSuffix) return;
    const id = `${state.activeKey}_${state.activeSuffix}`;
    const selectedEntry = state.selectedChords.get(id);
    const position = selectedEntry?.position || getPosition(guitarData, state.activeKey, state.activeSuffix, state.activePositionIndex);
    chordDisplayEl.textContent = formatLabel(state.activeKey, state.activeSuffix);
    chordDisplayEl.style.color = suffixColor(state.activeSuffix);
    chordDisplayEl.classList.add("show");
    chordDisplayEl.classList.remove("playing");
    phaseEl.textContent = "BROWSE";
    chordHintEl.textContent = "Preview the chord and add it to the pool";
    fretboardMount.replaceChildren(renderFretboardSVG(position));
  }

  function onBeat(beat) {
    updateBeatDots(beat);
    const beatDuration = (60 / state.bpm) * 1000;
    const strumDurationSec = (60 / state.bpm) * 1.85;
    if (beat === 0) {
      state.currentChordId = state.nextChordId ?? getNextChord(state.currentChordId);
      state.nextChordId = null;
      renderCurrentChord();
      chordDisplayEl.classList.add("show");
      chordDisplayEl.classList.remove("playing");
      phaseEl.textContent = "PREPARE";
      chordHintEl.textContent = "Get your fingers ready…";
      chordStageEl.classList.remove("playing");
      nextPreviewEl.classList.remove("visible");
      progressBarEl.style.width = "0%";
      progressBarEl.classList.remove("active");
      playClick(true);
    } else if (beat === 1) {
      playClick(false);
      animateProgress(beatDuration * 2);
    } else if (beat === 2) {
      const entry = state.selectedChords.get(state.currentChordId);
      playChord(entry?.notes || [], strumDurationSec, 0.55, {
        brightness: state.synthBrightness,
        body: state.synthBody,
        pickNoise: state.synthPickNoise,
      });
      playClick(true);
      chordDisplayEl.classList.add("playing");
      chordStageEl.classList.add("playing");
      phaseEl.textContent = "STRUM";
      chordHintEl.textContent = "Hold the chord!";
    } else if (beat === 3) {
      playClick(false);
      state.nextChordId = getNextChord(state.currentChordId);
      const next = state.selectedChords.get(state.nextChordId);
      nextPreviewEl.innerHTML = `NEXT → <strong>${next ? formatLabel(next.key, next.suffix) : "—"}</strong>`;
      nextPreviewEl.classList.add("visible");
    }
  }

  function scheduleLoop() {
    const intervalMs = (60 / state.bpm) * 1000;
    state.schedulerTimer = setInterval(() => {
      const beat = state.beatCount % 4;
      state.beatCount += 1;
      onBeat(beat);
    }, intervalMs);
  }

  function start() {
    if (state.selectedChords.size < 2) {
      warningEl.classList.add("visible");
      return;
    }
    getAudioCtx().resume();
    state.isRunning = true;
    state.beatCount = 0;
    state.currentChordId = null;
    state.nextChordId = null;
    state.focusNeedsFocused = true;
    timer.reset();
    timer.start();
    startBtnTextEl.textContent = "■ STOP";
    startBtnEl.classList.add("running");
    bpmSliderEl.disabled = true;
    speedupDom.speedupToggle.disabled = true;
    focusModeToggleEl.disabled = true;
    focusChordSelectEl.disabled = true;
    setMobileTab("play");
    scheduleLoop();
  }

  function stop() {
    state.isRunning = false;
    clearInterval(state.schedulerTimer);
    state.schedulerTimer = null;
    timer.stop();
    startBtnTextEl.textContent = "▶ START";
    startBtnEl.classList.remove("running");
    chordDisplayEl.classList.remove("playing");
    nextPreviewEl.classList.remove("visible");
    chordStageEl.classList.remove("playing");
    progressBarEl.style.width = "0%";
    progressBarEl.classList.remove("active");
    updateBeatDots(-1);
    bpmSliderEl.disabled = false;
    speedupDom.speedupToggle.disabled = false;
    focusModeToggleEl.disabled = false;
    syncFocusOptions();
    renderBrowseChord();
  }

  startBtnEl.addEventListener("click", () => (state.isRunning ? stop() : start()));

  warningEl.classList.toggle("visible", state.selectedChords.size < 2);
  syncFocusOptions();
  syncSynthUi();
  renderBrowseChord();
  setMobileTab("pick");
});
