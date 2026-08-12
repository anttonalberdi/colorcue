"use strict";

const STORAGE_KEY = "colorcue-config";
const STORAGE_VERSION = 5;
const MAX_COLORS = 24;
const COMPLETION_DELAY_MS = 300;

const DEFAULT_CONFIG = Object.freeze({
  colors: ["#bd0028", "#ead200", "#0380dc", "#68b936", "#ff9209"],
  colorDuration: 3,
  blackEnabled: true,
  blackDuration: 1,
  countdownEnabled: true,
  countdownDuration: 3,
  countdownSize: "small",
  countdownSoundEnabled: false,
  colorSoundEnabled: false,
  infiniteRounds: true,
  randomizeColors: false,
  rounds: 1,
});

const LIMITS = Object.freeze({
  colorDuration: [0.1, 3600],
  blackDuration: [0.1, 60],
  countdownDuration: [1, 60],
  rounds: [1, 100],
});

const elements = {
  setup: document.querySelector("#setup"),
  form: document.querySelector("#setup-form"),
  colorList: document.querySelector("#color-list"),
  colorTemplate: document.querySelector("#color-row-template"),
  addColor: document.querySelector("#add-color"),
  colorLimitMessage: document.querySelector("#color-limit-message"),
  colorDuration: document.querySelector("#color-duration"),
  infiniteRounds: document.querySelector("#infinite-rounds"),
  rounds: document.querySelector("#rounds"),
  roundsOptions: document.querySelector("#rounds-options"),
  randomizeColors: document.querySelector("#randomize-colors"),
  blackEnabled: document.querySelector("#black-enabled"),
  blackDuration: document.querySelector("#black-duration"),
  blackOptions: document.querySelector("#black-options"),
  countdownEnabled: document.querySelector("#countdown-enabled"),
  countdownDuration: document.querySelector("#countdown-duration"),
  countdownSize: document.querySelector("#countdown-size"),
  countdownOptions: document.querySelector("#countdown-options"),
  countdownSoundEnabled: document.querySelector("#countdown-sound-enabled"),
  colorSoundEnabled: document.querySelector("#color-sound-enabled"),
  sessionSummary: document.querySelector("#session-summary"),
  resetDefaults: document.querySelector("#reset-defaults"),
  session: document.querySelector("#session"),
  countdown: document.querySelector("#countdown"),
  pauseOverlay: document.querySelector("#pause-overlay"),
  completeScreen: document.querySelector("#complete-screen"),
  runAgain: document.querySelector("#run-again"),
  backToSetup: document.querySelector("#back-to-setup"),
};

let config = loadConfig();

function isHex(value) {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function normalizeHex(value) {
  const candidate = value.trim().startsWith("#") ? value.trim() : `#${value.trim()}`;
  return isHex(candidate) ? candidate.toUpperCase() : null;
}

function validNumber(value, key, integer = false) {
  const number = Number(value);
  const [minimum, maximum] = LIMITS[key];
  if (!Number.isFinite(number) || number < minimum || number > maximum) return null;
  if (integer && !Number.isInteger(number)) return null;
  return number;
}

function normalizeConfig(candidate) {
  if (!candidate || typeof candidate !== "object") return null;

  const colors = Array.isArray(candidate.colors)
    ? candidate.colors.map((color) => normalizeHex(String(color))).filter(Boolean)
    : [];

  const normalized = {
    colors: colors.slice(0, MAX_COLORS),
    colorDuration: validNumber(candidate.colorDuration, "colorDuration"),
    blackEnabled: typeof candidate.blackEnabled === "boolean" ? candidate.blackEnabled : null,
    blackDuration: validNumber(candidate.blackDuration, "blackDuration"),
    countdownEnabled: typeof candidate.countdownEnabled === "boolean" ? candidate.countdownEnabled : null,
    countdownDuration: validNumber(candidate.countdownDuration, "countdownDuration", true),
    countdownSize: ["small", "medium", "large"].includes(candidate.countdownSize) ? candidate.countdownSize : null,
    countdownSoundEnabled: typeof candidate.countdownSoundEnabled === "boolean" ? candidate.countdownSoundEnabled : null,
    colorSoundEnabled: typeof candidate.colorSoundEnabled === "boolean" ? candidate.colorSoundEnabled : null,
    infiniteRounds: typeof candidate.infiniteRounds === "boolean" ? candidate.infiniteRounds : null,
    randomizeColors: typeof candidate.randomizeColors === "boolean" ? candidate.randomizeColors : null,
    rounds: validNumber(candidate.rounds, "rounds", true),
  };

  if (
    normalized.colors.length === 0 ||
    normalized.colorDuration === null ||
    normalized.blackEnabled === null ||
    normalized.blackDuration === null ||
    normalized.countdownEnabled === null ||
    normalized.countdownDuration === null ||
    normalized.countdownSize === null ||
    normalized.countdownSoundEnabled === null ||
    normalized.colorSoundEnabled === null ||
    normalized.infiniteRounds === null ||
    normalized.randomizeColors === null ||
    normalized.rounds === null
  ) {
    return null;
  }

  return normalized;
}

function cloneDefaults() {
  return { ...DEFAULT_CONFIG, colors: [...DEFAULT_CONFIG.colors] };
}

function loadConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === STORAGE_VERSION) {
      return normalizeConfig(stored.config) ?? cloneDefaults();
    }

    if (stored?.version === 4) {
      return normalizeConfig({
        ...stored.config,
        countdownSize: "small",
      }) ?? cloneDefaults();
    }

    if (stored?.version === 3) {
      return normalizeConfig({
        ...stored.config,
        randomizeColors: false,
        countdownSize: "small",
      }) ?? cloneDefaults();
    }

    if (stored?.version === 2) {
      return normalizeConfig({
        ...stored.config,
        countdownSoundEnabled: false,
        colorSoundEnabled: false,
        randomizeColors: false,
        countdownSize: "small",
      }) ?? cloneDefaults();
    }

    return cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, config }));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function formatDuration(totalSeconds) {
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const minutePart = `${minutes}m ${String(remainder).padStart(2, "0")}s`;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : minutePart;
}

function getSummary() {
  if (config.infiniteRounds) {
    return { presentations: Infinity, totalSeconds: Infinity };
  }

  const presentations = config.colors.length * config.rounds;
  const colorSeconds = presentations * config.colorDuration;
  const countdownSeconds = config.countdownEnabled ? presentations * config.countdownDuration : 0;
  const blackSeconds = config.blackEnabled ? Math.max(0, presentations - 1) * config.blackDuration : 0;
  return {
    presentations,
    totalSeconds: colorSeconds + countdownSeconds + blackSeconds,
  };
}

function updateSummary() {
  const { presentations, totalSeconds } = getSummary();
  const colorLabel = config.colors.length === 1 ? "color" : "colors";
  if (config.infiniteRounds) {
    elements.sessionSummary.textContent = `${config.colors.length} ${colorLabel} · ∞ rounds · ∞ cues · continuous`;
    return;
  }

  const roundLabel = config.rounds === 1 ? "round" : "rounds";
  const cueLabel = presentations === 1 ? "cue" : "cues";
  elements.sessionSummary.textContent = `${config.colors.length} ${colorLabel} · ${config.rounds} ${roundLabel} · ${presentations} ${cueLabel} · ${formatDuration(totalSeconds)}`;
}

function renderConditionalSettings() {
  elements.roundsOptions.hidden = config.infiniteRounds;
  elements.rounds.disabled = config.infiniteRounds;
  elements.infiniteRounds.setAttribute("aria-expanded", String(!config.infiniteRounds));

  elements.blackOptions.hidden = !config.blackEnabled;
  elements.blackDuration.disabled = !config.blackEnabled;
  elements.blackEnabled.setAttribute("aria-expanded", String(config.blackEnabled));

  elements.countdownOptions.hidden = !config.countdownEnabled;
  elements.countdownDuration.disabled = !config.countdownEnabled;
  elements.countdownSize.disabled = !config.countdownEnabled;
  elements.countdownEnabled.setAttribute("aria-expanded", String(config.countdownEnabled));
}

function renderColors(focusIndex = null) {
  elements.colorList.replaceChildren();

  config.colors.forEach((color, index) => {
    const fragment = elements.colorTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".color-row");
    const sequenceNumber = fragment.querySelector(".sequence-number");
    const picker = fragment.querySelector(".color-picker");
    const pickerLabel = fragment.querySelector(".color-picker-label");
    const hexInput = fragment.querySelector(".hex-input");
    const hexLabel = fragment.querySelector(".hex-label");
    const swatch = fragment.querySelector(".color-swatch");
    const moveUp = fragment.querySelector(".move-up");
    const moveDown = fragment.querySelector(".move-down");
    const remove = fragment.querySelector(".remove-color");
    const controlId = `color-${index + 1}`;
    const hexId = `hex-${index + 1}`;

    row.dataset.index = String(index);
    sequenceNumber.textContent = String(index + 1).padStart(2, "0");
    picker.id = controlId;
    picker.value = color;
    pickerLabel.htmlFor = controlId;
    pickerLabel.textContent = `Choose color ${index + 1}`;
    hexInput.id = hexId;
    hexInput.value = color;
    hexLabel.htmlFor = hexId;
    hexLabel.textContent = `Hex value for color ${index + 1}`;
    swatch.style.backgroundColor = color;
    moveUp.disabled = index === 0;
    moveDown.disabled = index === config.colors.length - 1;
    remove.disabled = config.colors.length === 1;
    moveUp.setAttribute("aria-label", `Move color ${index + 1} up`);
    moveDown.setAttribute("aria-label", `Move color ${index + 1} down`);
    remove.setAttribute("aria-label", `Remove color ${index + 1}, ${color}`);
    elements.colorList.append(fragment);
  });

  const atLimit = config.colors.length >= MAX_COLORS;
  elements.addColor.disabled = atLimit;
  elements.colorLimitMessage.textContent = atLimit ? `Maximum of ${MAX_COLORS} colors reached.` : "";

  if (focusIndex !== null) {
    const focusTarget = elements.colorList.querySelector(`[data-index="${focusIndex}"] .hex-input`);
    focusTarget?.focus();
  }
}

function renderForm() {
  elements.colorDuration.value = String(config.colorDuration);
  elements.infiniteRounds.checked = config.infiniteRounds;
  elements.randomizeColors.checked = config.randomizeColors;
  elements.rounds.value = String(config.rounds);
  elements.blackEnabled.checked = config.blackEnabled;
  elements.blackDuration.value = String(config.blackDuration);
  elements.countdownEnabled.checked = config.countdownEnabled;
  elements.countdownDuration.value = String(config.countdownDuration);
  elements.countdownSize.value = config.countdownSize;
  elements.countdownSoundEnabled.checked = config.countdownSoundEnabled;
  elements.colorSoundEnabled.checked = config.colorSoundEnabled;
  renderColors();
  renderConditionalSettings();
  updateSummary();
}

function commitConfig() {
  saveConfig();
  updateSummary();
}

function updateColor(index, color) {
  config.colors[index] = color;
  commitConfig();
}

function handleColorListInput(event) {
  const row = event.target.closest(".color-row");
  if (!row) return;
  const index = Number(row.dataset.index);
  const picker = row.querySelector(".color-picker");
  const hexInput = row.querySelector(".hex-input");
  const swatch = row.querySelector(".color-swatch");

  if (event.target.matches(".color-picker")) {
    const color = event.target.value.toUpperCase();
    hexInput.value = color;
    hexInput.setAttribute("aria-invalid", "false");
    swatch.style.backgroundColor = color;
    updateColor(index, color);
  }

  if (event.target.matches(".hex-input")) {
    const color = normalizeHex(event.target.value);
    event.target.setAttribute("aria-invalid", String(!color));
    if (!color) return;
    picker.value = color;
    swatch.style.backgroundColor = color;
    updateColor(index, color);
  }
}

function handleColorListChange(event) {
  if (!event.target.matches(".hex-input")) return;
  const row = event.target.closest(".color-row");
  const index = Number(row.dataset.index);
  const color = normalizeHex(event.target.value);
  if (color) {
    event.target.value = color;
    event.target.setAttribute("aria-invalid", "false");
  } else {
    event.target.value = config.colors[index];
    event.target.setAttribute("aria-invalid", "false");
  }
}

function handleColorListClick(event) {
  const button = event.target.closest("button");
  const row = event.target.closest(".color-row");
  if (!button || !row) return;

  const index = Number(row.dataset.index);
  if (button.matches(".move-up") && index > 0) {
    [config.colors[index - 1], config.colors[index]] = [config.colors[index], config.colors[index - 1]];
    renderColors(index - 1);
  } else if (button.matches(".move-down") && index < config.colors.length - 1) {
    [config.colors[index + 1], config.colors[index]] = [config.colors[index], config.colors[index + 1]];
    renderColors(index + 1);
  } else if (button.matches(".remove-color") && config.colors.length > 1) {
    config.colors.splice(index, 1);
    renderColors(Math.min(index, config.colors.length - 1));
  } else {
    return;
  }
  commitConfig();
}

function handleNumericInput(element, key, integer = false) {
  const number = validNumber(element.value, key, integer);
  if (number === null) return;
  config[key] = number;
  commitConfig();
}

function shuffleColors(colors, previousOrder = null) {
  const shuffled = [...colors];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const matchesPrevious =
    previousOrder &&
    shuffled.length > 1 &&
    shuffled.every((color, index) => color === previousOrder[index]);

  if (matchesPrevious) shuffled.push(shuffled.shift());
  return shuffled;
}

function buildRoundStages(sessionConfig, colors, hasFollowingRound) {
  const stages = [];
  colors.forEach((color, colorIndex) => {
    if (sessionConfig.countdownEnabled) {
      for (let value = sessionConfig.countdownDuration; value >= 1; value -= 1) {
        stages.push({ type: "countdown", value, durationMs: 1000 });
      }
    }

    stages.push({ type: "color", color, durationMs: sessionConfig.colorDuration * 1000 });

    if (
      sessionConfig.blackEnabled &&
      (colorIndex < colors.length - 1 || hasFollowingRound)
    ) {
      stages.push({ type: "black", durationMs: sessionConfig.blackDuration * 1000 });
    }
  });

  return stages;
}

function getRoundOrder(sessionConfig, previousOrder = null) {
  return sessionConfig.randomizeColors
    ? shuffleColors(sessionConfig.colors, previousOrder)
    : [...sessionConfig.colors];
}

function buildStages(sessionConfig) {
  const stages = [];
  let previousOrder = null;

  for (let round = 0; round < sessionConfig.rounds; round += 1) {
    const colors = getRoundOrder(sessionConfig, previousOrder);
    const hasFollowingRound = round < sessionConfig.rounds - 1;
    stages.push(...buildRoundStages(sessionConfig, colors, hasFollowingRound));
    previousOrder = colors;
  }

  return stages;
}

function createInfiniteRoundFactory(sessionConfig) {
  let previousOrder = null;

  return () => {
    const colors = getRoundOrder(sessionConfig, previousOrder);
    previousOrder = colors;
    return buildRoundStages(sessionConfig, colors, true);
  };
}

class AudioCueEngine {
  constructor() {
    this.context = null;
    this.activeOscillators = new Set();
    this.countdownEnabled = false;
    this.colorEnabled = false;
  }

  prepare({ countdownSoundEnabled, colorSoundEnabled }) {
    this.stopAll();
    this.countdownEnabled = countdownSoundEnabled;
    this.colorEnabled = colorSoundEnabled;
    if (!this.countdownEnabled && !this.colorEnabled) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.context ??= new AudioContextClass();
      if (this.context.state === "suspended") {
        this.context.resume().catch(() => {});
      }
    } catch {
      this.context = null;
    }
  }

  playCountdown() {
    if (!this.countdownEnabled) return;
    this.playTone(520, 0.085, 1);
  }

  playColorTransition() {
    if (!this.colorEnabled) return;
    this.playTone(920, 0.13, 0.9);
  }

  playTone(frequency, durationSeconds, volume) {
    if (!this.context) return;

    try {
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      this.activeOscillators.add(oscillator);
      oscillator.onended = () => {
        this.activeOscillators.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(now);
      oscillator.stop(now + durationSeconds);
    } catch {
      // Audio is supplementary; the visual session continues if audio fails.
    }
  }

  stopAll() {
    this.activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // The oscillator may already have ended.
      }
    });
    this.activeOscillators.clear();
  }

  close() {
    this.stopAll();
    if (this.context && this.context.state !== "closed") {
      this.context.close().catch(() => {});
    }
    this.context = null;
  }
}

const audioCueEngine = new AudioCueEngine();

class SessionController {
  constructor({ renderStage, renderPaused, onComplete }) {
    this.renderStage = renderStage;
    this.renderPaused = renderPaused;
    this.onComplete = onComplete;
    this.stages = [];
    this.stageIndex = -1;
    this.timerId = null;
    this.deadline = 0;
    this.remainingMs = 0;
    this.loop = false;
    this.onLoop = null;
    this.status = "idle";
  }

  start(stages, { loop = false, onLoop = null } = {}) {
    this.stop();
    this.stages = stages;
    this.loop = loop;
    this.onLoop = onLoop;
    this.stageIndex = -1;
    this.status = "running";
    this.advance(0);
  }

  advance(overshootMs = 0) {
    if (this.status !== "running") return;
    this.clearTimer();
    this.stageIndex += 1;

    while (this.stageIndex < this.stages.length || this.loop) {
      if (this.stageIndex >= this.stages.length) {
        this.stages = this.onLoop?.() ?? this.stages;
        this.stageIndex = 0;
      }
      const stage = this.stages[this.stageIndex];
      const adjustedDuration = stage.durationMs - overshootMs;
      if (adjustedDuration > 0) {
        this.renderStage(stage);
        this.remainingMs = adjustedDuration;
        this.deadline = performance.now() + adjustedDuration;
        this.timerId = window.setTimeout(() => {
          const lateBy = Math.max(0, performance.now() - this.deadline);
          this.advance(lateBy);
        }, adjustedDuration);
        return;
      }
      overshootMs = Math.abs(adjustedDuration);
      this.stageIndex += 1;
    }

    this.status = "complete";
    this.onComplete();
  }

  togglePause() {
    if (this.status === "running") {
      this.remainingMs = Math.max(0, this.deadline - performance.now());
      this.clearTimer();
      this.status = "paused";
      this.renderPaused(true);
      return;
    }

    if (this.status === "paused") {
      this.status = "running";
      this.renderPaused(false);
      this.deadline = performance.now() + this.remainingMs;
      this.timerId = window.setTimeout(() => {
        const lateBy = Math.max(0, performance.now() - this.deadline);
        this.advance(lateBy);
      }, this.remainingMs);
    }
  }

  clearTimer() {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  stop() {
    this.clearTimer();
    this.stages = [];
    this.stageIndex = -1;
    this.remainingMs = 0;
    this.loop = false;
    this.onLoop = null;
    this.status = "idle";
    this.renderPaused(false);
  }
}

function renderStage(stage) {
  elements.completeScreen.hidden = true;
  if (stage.type === "color") {
    elements.session.style.backgroundColor = stage.color;
    elements.countdown.value = "";
    elements.countdown.textContent = "";
    audioCueEngine.playColorTransition();
    return;
  }

  elements.session.style.backgroundColor = "#000000";
  const countdownText = stage.type === "countdown" ? String(stage.value) : "";
  elements.countdown.value = countdownText;
  elements.countdown.textContent = countdownText;
  if (stage.type === "countdown") audioCueEngine.playCountdown();
}

function renderPaused(isPaused) {
  elements.pauseOverlay.hidden = !isPaused;
}

function showComplete() {
  elements.session.style.backgroundColor = "#000000";
  elements.countdown.value = "";
  elements.countdown.textContent = "";
  window.clearTimeout(completionTimerId);
  completionTimerId = window.setTimeout(() => {
    completionTimerId = null;
    if (sessionController.status !== "complete") return;
    elements.completeScreen.hidden = false;
    elements.runAgain.focus();
  }, COMPLETION_DELAY_MS);
}

const sessionController = new SessionController({
  renderStage,
  renderPaused,
  onComplete: showComplete,
});

let cursorTimerId = null;
let completionTimerId = null;
let sessionEnteredFullscreen = false;

function showCursorTemporarily() {
  if (!document.body.classList.contains("in-session")) return;
  document.body.classList.remove("cursor-hidden");
  window.clearTimeout(cursorTimerId);
  cursorTimerId = window.setTimeout(() => {
    if (sessionController.status === "running") document.body.classList.add("cursor-hidden");
  }, 1800);
}

function requestFullscreen() {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().then(() => {
      if (!document.body.classList.contains("in-session")) exitFullscreen();
    }).catch(() => {});
  }
}

function exitFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function startSession({ requestFullScreen = true } = {}) {
  const snapshot = normalizeConfig(config);
  if (!snapshot) return;

  audioCueEngine.prepare(snapshot);
  if (requestFullScreen) requestFullscreen();
  window.clearTimeout(completionTimerId);
  completionTimerId = null;
  elements.session.setAttribute("aria-hidden", "false");
  elements.session.dataset.countdownSize = snapshot.countdownSize;
  elements.completeScreen.hidden = true;
  elements.pauseOverlay.hidden = true;
  document.activeElement?.blur();
  document.body.classList.add("in-session");
  document.body.classList.remove("cursor-hidden");
  showCursorTemporarily();
  const infiniteRoundFactory = snapshot.infiniteRounds
    ? createInfiniteRoundFactory(snapshot)
    : null;
  const stages = infiniteRoundFactory ? infiniteRoundFactory() : buildStages(snapshot);
  sessionController.start(stages, {
    loop: snapshot.infiniteRounds,
    onLoop: infiniteRoundFactory,
  });
}

function endSession() {
  sessionController.stop();
  audioCueEngine.stopAll();
  sessionEnteredFullscreen = false;
  window.clearTimeout(cursorTimerId);
  window.clearTimeout(completionTimerId);
  completionTimerId = null;
  elements.countdown.value = "";
  elements.countdown.textContent = "";
  elements.completeScreen.hidden = true;
  elements.session.setAttribute("aria-hidden", "true");
  delete elements.session.dataset.countdownSize;
  elements.session.style.backgroundColor = "#000000";
  document.body.classList.remove("in-session", "cursor-hidden");
  exitFullscreen();
  elements.form.querySelector("#start-session").focus();
}

function resetDefaults() {
  if (!window.confirm("Reset the entire ColorCue configuration to its defaults?")) return;
  config = cloneDefaults();
  saveConfig();
  renderForm();
}

elements.colorList.addEventListener("input", handleColorListInput);
elements.colorList.addEventListener("change", handleColorListChange);
elements.colorList.addEventListener("click", handleColorListClick);

elements.addColor.addEventListener("click", () => {
  if (config.colors.length >= MAX_COLORS) return;
  const palette = ["#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];
  config.colors.push(palette[(config.colors.length - DEFAULT_CONFIG.colors.length) % palette.length]);
  renderColors(config.colors.length - 1);
  commitConfig();
});

elements.colorDuration.addEventListener("input", () => handleNumericInput(elements.colorDuration, "colorDuration"));
elements.rounds.addEventListener("input", () => handleNumericInput(elements.rounds, "rounds", true));
elements.blackDuration.addEventListener("input", () => handleNumericInput(elements.blackDuration, "blackDuration"));
elements.countdownDuration.addEventListener("input", () => handleNumericInput(elements.countdownDuration, "countdownDuration", true));

elements.countdownSize.addEventListener("change", () => {
  config.countdownSize = elements.countdownSize.value;
  commitConfig();
});

elements.countdownSoundEnabled.addEventListener("change", () => {
  config.countdownSoundEnabled = elements.countdownSoundEnabled.checked;
  commitConfig();
});

elements.colorSoundEnabled.addEventListener("change", () => {
  config.colorSoundEnabled = elements.colorSoundEnabled.checked;
  commitConfig();
});

elements.infiniteRounds.addEventListener("change", () => {
  config.infiniteRounds = elements.infiniteRounds.checked;
  renderConditionalSettings();
  commitConfig();
});

elements.randomizeColors.addEventListener("change", () => {
  config.randomizeColors = elements.randomizeColors.checked;
  commitConfig();
});

elements.blackEnabled.addEventListener("change", () => {
  config.blackEnabled = elements.blackEnabled.checked;
  renderConditionalSettings();
  commitConfig();
});

elements.countdownEnabled.addEventListener("change", () => {
  config.countdownEnabled = elements.countdownEnabled.checked;
  renderConditionalSettings();
  commitConfig();
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!elements.form.checkValidity()) {
    elements.form.reportValidity();
    return;
  }
  startSession();
});

elements.resetDefaults.addEventListener("click", resetDefaults);
elements.runAgain.addEventListener("click", () => startSession({ requestFullScreen: true }));
elements.backToSetup.addEventListener("click", endSession);
elements.session.addEventListener("mousemove", showCursorTemporarily);
elements.session.addEventListener("pointerdown", showCursorTemporarily);

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    sessionEnteredFullscreen = document.body.classList.contains("in-session");
    return;
  }

  if (sessionEnteredFullscreen && document.body.classList.contains("in-session")) {
    sessionEnteredFullscreen = false;
    endSession();
  }
});

document.addEventListener("keydown", (event) => {
  if (!document.body.classList.contains("in-session")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    endSession();
    return;
  }

  if (
    event.code === "Space" &&
    !event.repeat &&
    ["running", "paused"].includes(sessionController.status)
  ) {
    event.preventDefault();
    sessionController.togglePause();
    showCursorTemporarily();
  }
});

window.addEventListener("pagehide", () => {
  sessionController.stop();
  audioCueEngine.close();
  window.clearTimeout(cursorTimerId);
  window.clearTimeout(completionTimerId);
});

renderForm();
