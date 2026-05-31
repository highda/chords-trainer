import { state } from "../state.js";

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function initSessionTimer() {
  const el = document.getElementById("sessionTimer");
  function update() {
    const now = Date.now();
    const currentMs = state.sessionElapsedMs + (state.isRunning ? now - state.sessionStartTime : 0);
    el.textContent = formatTime(currentMs);
  }
  return {
    start() {
      state.sessionStartTime = Date.now();
      el.classList.add("running");
      state.timerInterval = setInterval(update, 100);
    },
    stop() {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      state.sessionElapsedMs += Date.now() - state.sessionStartTime;
      el.classList.remove("running");
      update();
    },
    reset() {
      state.sessionElapsedMs = 0;
      state.sessionStartTime = Date.now();
      el.textContent = "0:00";
    },
  };
}
