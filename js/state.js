export const state = {
  selectedChords: new Map(),
  activeKey: "G",
  activeSuffix: "major",
  activePositionIndex: 0,
  isRunning: false,
  bpm: 80,
  currentChordId: null,
  nextChordId: null,
  beatCount: 0,
  schedulerTimer: null,
  suEnabled: false,
  suBars: 4,
  suStep: 5,
  suMax: 120,
  suStartBpm: 80,
  suBarCount: 0,
  suReachedMax: false,
  focusModeEnabled: false,
  focusedChordId: null,
  focusNeedsFocused: true,
  sessionStartTime: 0,
  sessionElapsedMs: 0,
  timerInterval: null,
  synthBrightness: 100,
  synthBody: 10,
  synthPickNoise: 80,
};

export function chordId(key, suffix) {
  return `${key}_${suffix}`;
}
