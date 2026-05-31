import { chordId, state } from "../state.js";
import {
  formatLabel,
  formatSuffixLabel,
  getAvailableSuffixes,
  getPosition,
  getPositions,
  getSuffixFamily,
  positionToNotes,
} from "../chords.js";

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const FAMILY_ORDER = ["common", "major", "minor", "extended", "suspended", "altered", "other"];
const FAMILY_LABELS = {
  common: "Common",
  major: "Major",
  minor: "Minor",
  extended: "7/9/11/13",
  suspended: "Sus",
  altered: "Alt",
  other: "Other",
};
const COMMON_SUFFIXES = ["major", "minor", "7", "maj7", "m7", "sus2", "sus4", "dim", "aug"];

export function initChordSelector(guitarData, { onSelectionChange, onActiveChanged } = {}) {
  const mount = document.getElementById("chordSelector");
  const wrap = document.createElement("div");
  wrap.className = "selector-wrap";
  const keyRow = document.createElement("div");
  keyRow.className = "key-row";
  const suffixGrid = document.createElement("div");
  suffixGrid.className = "suffix-grid";
  const familyRow = document.createElement("div");
  familyRow.className = "family-row";
  const preview = document.createElement("div");
  preview.className = "selector-preview";
  const tags = document.createElement("div");
  tags.className = "selected-tags";
  wrap.append(keyRow, familyRow, suffixGrid, preview, tags);
  mount.replaceChildren(wrap);

  let activeFamily = "common";

  function getActiveEntry() {
    const suffix = state.activeSuffix || getAvailableSuffixes(guitarData, state.activeKey)[0] || null;
    if (!suffix) return null;
    const id = chordId(state.activeKey, suffix);
    const existing = state.selectedChords.get(id);
    if (existing) return { id, ...existing, selected: true };
    const position = getPosition(guitarData, state.activeKey, suffix, state.activePositionIndex);
    if (!position) return null;
    return {
      id,
      key: state.activeKey,
      suffix,
      positionIndex: state.activePositionIndex,
      notes: positionToNotes(position),
      position,
      selected: false,
    };
  }

  function buildEntry(key, suffix, positionIndex = 0) {
    const position = getPosition(guitarData, key, suffix, positionIndex);
    return {
      key,
      suffix,
      positionIndex,
      notes: positionToNotes(position),
      position,
    };
  }

  function setActive(key, suffix) {
    state.activeKey = key;
    state.activeSuffix = suffix;
    const existing = state.selectedChords.get(chordId(key, suffix));
    state.activePositionIndex = existing?.positionIndex || 0;
    renderKeys();
    renderFamilies();
    renderSuffixes();
    renderPreview();
    onActiveChanged?.();
  }

  function renderKeys() {
    keyRow.replaceChildren();
    KEYS.forEach((key) => {
      const b = document.createElement("button");
      b.className = `chord-btn ${state.activeKey === key ? "active" : ""}`;
      b.textContent = key;
      b.onclick = () => {
        if (state.isRunning) return;
        const suffixes = getAvailableSuffixes(guitarData, key);
        const nextSuffix = suffixes.includes(state.activeSuffix) ? state.activeSuffix : (suffixes[0] || null);
        if (!nextSuffix) return;
        setActive(key, nextSuffix);
      };
      keyRow.appendChild(b);
    });
  }

  function renderTags() {
    tags.replaceChildren();
    [...state.selectedChords.values()].forEach((entry) => {
      const row = document.createElement("div");
      row.className = "selected-tag";

      const activate = document.createElement("button");
      activate.className = "selected-tag-main";
      activate.textContent = formatLabel(entry.key, entry.suffix);
      activate.onclick = () => {
        if (state.isRunning) return;
        setActive(entry.key, entry.suffix);
      };

      const remove = document.createElement("button");
      remove.className = "selected-tag-remove";
      remove.textContent = "×";
      remove.onclick = () => {
        if (state.isRunning) return;
        state.selectedChords.delete(chordId(entry.key, entry.suffix));
        renderSuffixes();
        renderPreview();
        renderTags();
        onSelectionChange?.();
      };

      row.append(activate, remove);
      tags.appendChild(row);
    });
  }

  function renderFamilies() {
    familyRow.replaceChildren();
    const suffixes = getAvailableSuffixes(guitarData, state.activeKey);
    const availableFamilies = new Set(
      suffixes.flatMap((suffix) => COMMON_SUFFIXES.includes(suffix) ? ["common", getSuffixFamily(suffix)] : [getSuffixFamily(suffix)])
    );
    FAMILY_ORDER.filter((family) => availableFamilies.has(family)).forEach((family) => {
      const b = document.createElement("button");
      b.className = `family-chip ${activeFamily === family ? "active" : ""}`;
      b.textContent = FAMILY_LABELS[family];
      b.onclick = () => {
        if (state.isRunning) return;
        activeFamily = family;
        renderFamilies();
        renderSuffixes();
      };
      familyRow.appendChild(b);
    });
  }

  function renderSuffixes() {
    suffixGrid.replaceChildren();
    const suffixes = getAvailableSuffixes(guitarData, state.activeKey)
      .filter((suffix) => {
        if (activeFamily === "common") return COMMON_SUFFIXES.includes(suffix);
        return getSuffixFamily(suffix) === activeFamily;
      })
      .sort((a, b) => formatSuffixLabel(a).localeCompare(formatSuffixLabel(b)));

    suffixes.forEach((suffix) => {
      const id = chordId(state.activeKey, suffix);
      const b = document.createElement("button");
      const active = state.selectedChords.has(id);
      b.className = `chord-btn chord-suffix-btn ${state.activeSuffix === suffix ? "browse-active" : ""} ${active ? "active" : ""}`;
      b.textContent = formatSuffixLabel(suffix);
      b.onclick = () => {
        if (state.isRunning) return;
        setActive(state.activeKey, suffix);
      };
      suffixGrid.appendChild(b);
    });
  }

  function renderPreview() {
    preview.replaceChildren();
    const entry = getActiveEntry();
    if (!entry) return;

    const title = document.createElement("div");
    title.className = "selector-preview-title";
    title.textContent = formatLabel(entry.key, entry.suffix);

    const meta = document.createElement("div");
    meta.className = "selector-preview-meta";
    meta.textContent = `${formatSuffixLabel(entry.suffix)} | ${getPositions(guitarData, entry.key, entry.suffix).length} voicings`;

    const controls = document.createElement("div");
    controls.className = "voicing-controls";

    const prev = document.createElement("button");
    prev.className = "voicing-btn";
    prev.textContent = "◀";
    prev.onclick = () => {
      if (state.isRunning) return;
      const positions = getPositions(guitarData, entry.key, entry.suffix);
      const nextIndex = (entry.positionIndex - 1 + positions.length) % positions.length;
      const nextEntry = buildEntry(entry.key, entry.suffix, nextIndex);
      const id = chordId(entry.key, entry.suffix);
      state.activePositionIndex = nextIndex;
      if (state.selectedChords.has(id)) state.selectedChords.set(id, nextEntry);
      state.activeSuffix = entry.suffix;
      renderPreview();
      renderTags();
      onSelectionChange?.();
      onActiveChanged?.();
    };

    const count = document.createElement("div");
    count.className = "voicing-count";
    count.textContent = `${entry.positionIndex + 1}/${getPositions(guitarData, entry.key, entry.suffix).length}`;

    const next = document.createElement("button");
    next.className = "voicing-btn";
    next.textContent = "▶";
    next.onclick = () => {
      if (state.isRunning) return;
      const positions = getPositions(guitarData, entry.key, entry.suffix);
      const nextIndex = (entry.positionIndex + 1) % positions.length;
      const nextEntry = buildEntry(entry.key, entry.suffix, nextIndex);
      const id = chordId(entry.key, entry.suffix);
      state.activePositionIndex = nextIndex;
      if (state.selectedChords.has(id)) state.selectedChords.set(id, nextEntry);
      state.activeSuffix = entry.suffix;
      renderPreview();
      renderTags();
      onSelectionChange?.();
      onActiveChanged?.();
    };

    const toggle = document.createElement("button");
    toggle.className = `pool-toggle ${entry.selected ? "active" : ""}`;
    toggle.textContent = entry.selected ? "Remove From Pool" : "Add To Pool";
    toggle.onclick = () => {
      if (state.isRunning) return;
      if (entry.selected) {
        state.selectedChords.delete(entry.id);
      } else {
        state.selectedChords.set(entry.id, buildEntry(entry.key, entry.suffix, entry.positionIndex));
      }
      state.activePositionIndex = entry.positionIndex;
      renderSuffixes();
      renderPreview();
      renderTags();
      onSelectionChange?.();
    };

    controls.append(prev, count, next, toggle);
    preview.append(title, meta, controls);
  }

  const initialSuffixes = getAvailableSuffixes(guitarData, state.activeKey);
  if (!initialSuffixes.includes(state.activeSuffix)) state.activeSuffix = initialSuffixes[0] || null;
  state.activePositionIndex = 0;
  renderKeys();
  renderFamilies();
  renderSuffixes();
  renderPreview();
  renderTags();
}
