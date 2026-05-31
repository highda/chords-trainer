export function initProgressBar() {
  const progressBarEl = document.getElementById("progressBar");
  return function animateProgress(durationMs) {
    progressBarEl.style.transition = "none";
    progressBarEl.style.width = "0%";
    progressBarEl.classList.add("active");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      progressBarEl.style.transition = `width ${durationMs}ms linear`;
      progressBarEl.style.width = "100%";
    }));
  };
}
