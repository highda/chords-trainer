const NS = "http://www.w3.org/2000/svg";

function make(name, attrs = {}) {
  const el = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}

export function renderFretboardSVG(position, opts = {}) {
  const { width = 120, height = 150, dotColor = "#e8c84a", mutedColor = "#555" } = opts;
  const svg = make("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
  if (!position) return svg;
  const strings = 6;
  const frets = Math.max(4, Number(position.fretsOnChord || 4));
  const left = 14, right = width - 14, top = 28, bottom = height - 12;
  const sx = (right - left) / (strings - 1);
  const fy = (bottom - top) / frets;
  for (let i = 0; i < strings; i++) svg.appendChild(make("line", { x1: left + i * sx, y1: top, x2: left + i * sx, y2: bottom, stroke: "#777", "stroke-width": 1 }));
  for (let f = 0; f <= frets; f++) svg.appendChild(make("line", { x1: left, y1: top + f * fy, x2: right, y2: top + f * fy, stroke: "#777", "stroke-width": f === 0 && Number(position.baseFret) === 1 ? 4 : 1 }));
  if (Number(position.baseFret) > 1) {
    const txt = make("text", { x: 2, y: top + fy * 0.75, fill: mutedColor, "font-size": 10 });
    txt.textContent = `${position.baseFret}fr`;
    svg.appendChild(txt);
  }
  position.frets.forEach((fret, i) => {
    const x = left + i * sx;
    if (fret === -1) {
      const xTxt = make("text", { x, y: top - 8, "text-anchor": "middle", fill: mutedColor, "font-size": 12 });
      xTxt.textContent = "×"; svg.appendChild(xTxt); return;
    }
    if (fret === 0) {
      svg.appendChild(make("circle", { cx: x, cy: top - 9, r: 3.5, stroke: mutedColor, fill: "none", "stroke-width": 1.5 }));
      return;
    }
    const y = top + (fret - 0.5) * fy;
    svg.appendChild(make("circle", { cx: x, cy: y, r: 6, fill: dotColor }));
  });
  return svg;
}
