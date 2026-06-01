// Chord data: tombatossals/chords-db (MIT) — https://github.com/tombatossals/chords-db
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

const KEY_ALIASES = {
  "C#": "Csharp",
  "F#": "Fsharp",
};

export async function loadGuitarData() {
  const res = await fetch("./vendor/chords-db/lib/guitar.json");
  if (!res.ok) throw new Error(`Failed to load guitar.json: ${res.status}`);
  return res.json();
}

export function getPositions(guitarData, key, suffix) {
  const entries = Object.values(guitarData?.chords?.[normalizeKey(key)] || {});
  const match = entries.find((entry) => entry?.suffix === suffix);
  return match?.positions || [];
}

export function getPosition(guitarData, key, suffix, index) {
  const positions = getPositions(guitarData, key, suffix);
  if (!positions.length) return null;
  return positions[(index + positions.length) % positions.length];
}

export function positionToNotes(position) {
  if (!position) return [];
  const base = Number(position.baseFret || 1) - 1;
  return position.frets
    .map((fret, i) => ({ fret: Number(fret), i }))
    .filter((x) => x.fret >= 0)
    .map(({ fret, i }) => {
      const midi = OPEN_MIDI[i] + (fret === 0 ? 0 : base + fret);
      return {
        f: 440 * 2 ** ((midi - 69) / 12),
        g: 0.65,
        stringIndex: i,
        fret,
        isOpen: fret === 0,
      };
    });
}

export function formatLabel(key, suffix) {
  if (suffix === "major") return key;
  if (suffix === "minor") return `${key}m`;
  return `${key}${suffix}`;
}

export function formatSuffixLabel(suffix) {
  if (suffix === "major") return "Major";
  if (suffix === "minor") return "Minor";
  if (suffix === "dim") return "Dim";
  if (suffix === "aug") return "Aug";
  if (suffix === "sus") return "Sus";
  if (suffix === "sus2") return "Sus2";
  if (suffix === "sus4") return "Sus4";
  return suffix;
}

export function getAvailableSuffixes(guitarData, key) {
  return Object.values(guitarData?.chords?.[normalizeKey(key)] || {})
    .map((entry) => entry?.suffix)
    .filter(Boolean);
}

export function getSuffixFamily(suffix) {
  const s = (suffix || "").toLowerCase();
  if (s === "major" || s === "5" || s === "6" || s === "69" || s.startsWith("maj")) return "major";
  if (s === "minor" || s.startsWith("m") || s.includes("min")) return "minor";
  if (s.includes("sus")) return "suspended";
  if (s.includes("dim") || s.includes("aug") || s.includes("alt") || s.includes("b5") || s.includes("#5")) return "altered";
  if (s === "7" || s.includes("7") || s.includes("9") || s.includes("11") || s.includes("13")) return "extended";
  return "other";
}

function normalizeKey(key) {
  return KEY_ALIASES[key] || key;
}

export function suffixColor(suffix) {
  const s = (suffix || "").toLowerCase();
  if (s.includes("minor") || s === "m") return "#a0c4e8";
  if (s.includes("dim") || s.includes("aug")) return "var(--accent2)";
  if (s.includes("7")) return "#a0d4a0";
  if (s.includes("major") || s.startsWith("maj")) return "var(--accent)";
  return "var(--text)";
}
