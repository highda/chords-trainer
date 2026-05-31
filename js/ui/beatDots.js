export function initBeatDots() {
  return function updateBeatDots(beat) {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`dot${i}`);
      dot.classList.remove("lit", "accent");
      if (i === beat) {
        dot.classList.add("lit");
        if (i === 0) dot.classList.add("accent");
      }
    }
  };
}
