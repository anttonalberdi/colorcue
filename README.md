# ColorCue

ColorCue is a minimal training utility for presenting programmable, full-screen visual cues. Configure a color sequence, optional starting-position figures, and their timing, then start a distraction-free session that fills the browser viewport.

## Features

- Editable color sequence with native color pickers, exact hex values, reordering, and removal
- Built-in library of 16 starting-position figures that can precede, follow, or replace the color cues
- Per-color duration, indefinite looping by default, optional finite rounds, countdowns, and black intervals
- Small, medium, or near-full-screen countdown number and position figure sizes
- Optional color-order and position-order randomization that reshuffles for every round
- Optional generated audio cues for countdown numbers and color or position transitions, with loud, medium, and faint presets
- Live summary of cue count and total programmed duration
- Full-viewport session mode with a best-effort Fullscreen API request
- Accurate centralized timing with pause/resume support
- Keyboard-accessible setup and session controls
- Versioned configuration persistence in `localStorage`
- Responsive layout for desktop, tablet, and mobile
- No framework, external dependency, backend, or build step

Sound cues use the browser's Web Audio API and do not require audio files. Countdown and cue-transition sounds can be enabled independently; both are off by default. Their shared volume can be set to loud, medium, or faint. Colors and positions use distinct pitches for the transition chime.

## Starting positions

The 16 position pictograms live in `positions/` as PNGs with transparent backgrounds. Enable **Show starting positions** to pick which of them can appear, then choose where the figure lands in each cue:

| Placement | Stage order per cue |
| --- | --- |
| Instead of colors | countdown → position |
| Before countdown | position → countdown → color |
| Before color | countdown → position → color |
| After color | countdown → color → position |

Every pictogram shares one crop of the source artwork, so the figures keep a common ground line and a consistent scale relative to each other; the session scales each one to fit the chosen figure size. The session inverts them with a CSS filter to show white on black, while the picker shows them as-is. Positions cycle through the selected library independently of the colors, so the two sequences can differ in length. **Instead of colors** turns the session into a position-only sequence and hides the color controls; every other placement leaves the color sequence exactly as it was.

The picker's sixteen images are only built once positions are switched on, and a session preloads just the positions it will use.

## Run locally

You can open `index.html` directly in a modern browser. For the most consistent Fullscreen API behavior, serve the repository through a local HTTP server instead:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

All asset paths are relative, so ColorCue also works when hosted below a project path such as `/colorcue/`.

## Session controls

- **Space** — pause or resume the active timed stage
- **Esc** — end the current session and return to setup

Indefinite sessions continue until you press **Esc**. After a finite session's final cue, choose **Run Again** to repeat the same configuration or **Back to Setup** to edit it.

## Configuration persistence

ColorCue saves the complete configuration to the browser's `localStorage` whenever it changes. The stored object includes a schema version; configurations saved by earlier versions are upgraded by filling in whatever settings they predate. Malformed, missing, or inaccessible storage falls back to the default five-color sequence and indefinite rounds.

**Reset to defaults** asks for confirmation before replacing the current saved configuration.

## Deploy to GitHub Pages

No build is required. To publish from the repository:

1. Push the files to the repository's default branch.
2. Open the repository on GitHub and go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the default branch and the **`/ (root)`** folder, then save.

GitHub Pages will publish the static files directly, typically at `https://<username>.github.io/colorcue/`.

## Project structure

- `index.html` — semantic setup and session interfaces
- `styles.css` — responsive setup design and pure full-viewport session styles
- `app.js` — configuration, persistence, stage construction, rendering, and the session controller
- `positions/` — the 16 starting-position pictograms, one PNG per position id
