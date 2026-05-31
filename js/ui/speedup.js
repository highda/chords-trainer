import { state } from "../state.js";

export function initSpeedup(dom) {
  const { speedupPanelEl, speedupToggle, speedupBody, speedupChevron, suBarsSlider, suStepSlider, suMaxSlider, suBarsVal, suStepVal, suMaxVal } = dom;
  document.getElementById("speedupHeader").addEventListener("click", () => {
    const open = speedupBody.classList.toggle("open");
    speedupChevron.textContent = open ? "▲" : "▼";
  });
  speedupToggle.addEventListener("change", () => {
    state.suEnabled = speedupToggle.checked;
    speedupPanelEl.classList.toggle("enabled", state.suEnabled);
    [suBarsSlider, suStepSlider, suMaxSlider].forEach((s) => (s.disabled = !state.suEnabled));
  });
  suBarsSlider.addEventListener("input", () => {
    state.suBars = Number(suBarsSlider.value);
    suBarsVal.textContent = String(state.suBars);
  });
  suStepSlider.addEventListener("input", () => {
    state.suStep = Number(suStepSlider.value);
    suStepVal.textContent = String(state.suStep);
    suMaxSlider.min = String(state.bpm + state.suStep);
    if (state.suMax < state.bpm + state.suStep) state.suMax = state.bpm + state.suStep;
    suMaxSlider.value = String(state.suMax);
    suMaxVal.textContent = String(state.suMax);
  });
  suMaxSlider.addEventListener("input", () => {
    state.suMax = Number(suMaxSlider.value);
    suMaxVal.textContent = String(state.suMax);
  });
  [suBarsSlider, suStepSlider, suMaxSlider].forEach((s) => (s.disabled = true));
  suMaxSlider.min = String(state.bpm + state.suStep);
}
