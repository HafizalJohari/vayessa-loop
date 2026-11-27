# Strudel Studio — User Manual

Welcome to **Strudel Studio**, a modern DAW-style live-coding music studio powered by the official **Strudel** engine (`@strudel/*`), with built-in **MIDI Controller support**, **Visual WAV/MP3 Sampler & Wave Shifter**, **Visual Oscillator**, **Live Performance Playlists with Audio Fades**, **Hydra 2nd Monitor Visuals**, and **Universal AI MCP Control**.

---

## 1. Quick Start

### Starting the App
In your terminal inside the project folder (`/Users/ppdjhr02-13imac/Desktop/strudel`):
```bash
npm run dev
```
Open **http://localhost:5173/** in **Chrome, Edge, Brave, or Opera** (recommended for full WebMIDI & WebGL support).

### Essential Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| **`Cmd + Enter`** (Mac) / **`Ctrl + Enter`** (Win) | Evaluate & Play / Update Live Pattern |
| **`Cmd + .`** (Mac) / **`Ctrl + .`** (Win) | Stop All Audio (Hush) |
| **`F`** (in Hydra 2nd Monitor window) | Toggle Fullscreen |

---

## 2. Workspace Layout

1. **Top Transport Bar**:
   - **Panel Toggles**: Show/hide the Left Browser, Bottom Dock, or Right Control Panel.
   - **Studio Modes**: Switch between **Practice**, **Jam**, and **Live** modes.
   - **Transport**: **PLAY / LIVE**, **STOP**, Beat 1–4 LEDs, **BPM** input, **TAP Tempo**, and **MIDI Learn BPM**.
   - **Quick Pills**: **Hydra** (launch 2nd monitor), **MCP** (AI setup & live log), **MIDI** (controller status & activity LED), and **Master Volume + Peak Meter**.
2. **Left Sidebar (Sound & Preset Browser)**:
   - **Presets**: Load built-in or your own saved custom presets.
   - **Sounds**: Audition (`🔊`) and 1-click insert (`+`) TR-808, TR-909, synths, and GM Soundfonts.
   - **Syntax**: Quick-insert snippets for FX, scales, Euclidean rhythms, Macros, and native MIDI.
3. **Center Workspace**:
   - **Mode Toolbar**: Context-aware bar for Practice, Jam, or Live Session tools.
   - **Pattern Editor**: CodeMirror 6 editor supporting 100% of Strudel syntax (including `$:` multi-track labels, `slider()`, `._pianoroll()`, `setcps()`, `await initHydra()`, and `midin()`).
   - **Bottom Dock**: Tabbed studio modules (**Piano Roll & Scope**, **Step Sequencer**, **Track Mixer**, **Live Playlist**, **Sampler & Wave Shift**, **Oscillator**, and **Hydra 2nd Monitor**).
4. **Right Panel**:
   - **Macro Knobs (M1–M8)**: 8 assignable rotary dials with MIDI Learn.
   - **MIDI Center**: Device monitor, interactive keyboard + Note Capture, Pad Controller Map, MIDI Out/Clock, and Live MIDI Monitor.

---

## 3. Smart Syntax Error Popup & Safe-Eval

When you run code with a typo or syntax error:
- **Safe-Eval Guard**: If music is already playing, **your previous groove keeps playing** so there is never awkward silence during a live set.
- **Floating Error Popup**: Shows the exact **Line & Column**, highlights the broken line in red inside the editor, explains **How to fix** it, and provides:
  - **Jump to Line**: Scrolls the editor directly to the error.
  - **Auto-Fix** (when available): Fixes common typos (e.g., `.lpff` → `.lpf`, `s.initCam` → `s0.initCam`, missing quotes/brackets) and re-evaluates in 1 click.

---

## 4. Studio Modes (Practice · Jam · Live)

### Practice Mode
Switch to **Practice** in the top bar for focused learning:
- **Metronome ON/OFF**: Crisp WebAudio click track locked to your BPM.
- **Practice Speed (`0.5x` | `0.75x` | `1x`)**: Slow down complex patterns without editing your code.
- **Guided Exercises**: Pick a challenge from the dropdown, read the goal, and toggle **Hint** if you get stuck.

### Jam Mode
The default creative playground:
- **A / B / C / D Snapshots**: Click the bookmark icon (`+`) next to `A`, `B`, `C`, or `D` to save your current pattern & BPM; click the letter anytime to jump back live.
- **Scale & Chord Helpers**: 1-click insert compatible notes/chords (`+C Minor`, `+D Dorian`, `+F Major 7`, `+A Pentatonic`).

### Live Session Mode
Stage-ready performance layout:
- Automatically collapses the left browser and expands the **Live Playlist** dock.
- Displays **Safe-Eval Guard ON**, current setlist track, a large **NEXT TRACK (FADE)** trigger, and a quick **2nd Monitor (Hydra)** button.

---

## 5. Presets, Track Mixer & Macro Knobs

### Saving Your Own Presets
1. Open the **Presets** tab in the left sidebar.
2. Click **+ Add New Preset**, enter a Name, Genre, and Description, then click **Save**.
3. Your preset is saved permanently in `localStorage` with a `Custom` badge.

### Live Track Mixer (`track(...)`)
Wrap any layer in `track('drums', ...)`, `track('bass', ...)`, `track('chords', ...)`, or `track('lead', ...)`:
```js
stack(
  track('drums', s("bd*4, ~ sd ~ sd, hh*8").bank("RolandTR909")),
  track('bass', note("c2 eb2 f2 g2").s("sawtooth").lpf(600))
)
```
Open **Track Mixer** in the bottom dock to **Mute (M)**, **Solo (S)**, adjust **Gain**, sweep **LPF**, or **MIDI Learn** faders & mute pads in real time.

### Live Macro Knobs (`macro(1)`–`macro(8)`)
Use `macro(1)` through `macro(8)` (or `m1`–`m8`) anywhere in your code:
```js
note("c3 eb3 g3 bb3")
  .s("sawtooth")
  .lpf(macro(1).range(200, 6000))
  .room(macro(2).range(0, 0.85))
```
Drag knobs vertically with your mouse, double-click to reset, or click **Learn** to bind a physical MIDI knob!

---

## 6. MIDI Controller Guide

Plug in any USB MIDI keyboard, knob controller (Arturia MiniLab, Akai MPK, Novation Launchkey), or pad grid (Launchpad, Akai MPD), then open **MIDI Center** (right panel) and click **Refresh**.

- **MIDI Learn (Knobs & Faders)**: Click **Learn** on any Macro Knob, Mixer Fader, or BPM → twist a physical knob on your controller → automatically bound & saved.
- **MIDI Keyboard Live Play & Capture**:
  1. Choose a sound in the dropdown (`Studio Oscillator`, `Rhodes`, `Grand Piano`, `Sawtooth`, etc.).
  2. Play your MIDI keyboard (or click the mini keys).
  3. Click **Capture Notes**, play a riff, then click **+ Insert** to paste `note("c4 eb4 g4 ...")` directly into the editor.
- **Pad Controller Map**: Map physical pads to **Play/Stop**, **Evaluate**, **Tap Tempo**, **Mute Tracks 1–4**, **Load Presets**, or **Playlist Next/Prev (Fade)**.
- **Native Strudel MIDI Syntax**: Full compatibility with `await midin('Device')`, `.midi('Output')`, `.ccn()`, `.ccv()`, and `.midiclock()`.

---

## 7. Hybrid Step Sequencer

Open the **Step Sequencer** tab in the bottom dock:
- Click cells across the 6 lanes (`Kick 909`, `Snare 909`, `Closed Hat`, `Clap 808`, `Sub Bass`, `Synth Stab`) to toggle steps.
- Click a lane's name to audition its sound, or the speaker icon to mute it.
- Toggle **Sync Grid -> Code** (or click **Write & Play**) to automatically write clean Strudel mini-notation into the editor and play in sync!

---

## 8. Visual WAV/MP3 Sampler & Wave Shifter

Open the **Sampler & Wave Shift** tab in the bottom dock:
1. **Import**: Click **Import WAV / MP3** or drag & drop `.wav`, `.mp3`, `.ogg`, or `.m4a` files. Files are stored permanently in your browser's **IndexedDB**.
2. **Cut / Trim**: Adjust **CUT START** and **CUT END** to isolate the exact drum break, vocal chop, or loop you want.
3. **Wave Shifter Controls**:
   - **WAVE SHIFT (`0–100%`)**: Circularly shifts the start phase/offset of the waveform (shown by the amber vertical marker) to relocate the downbeat or transient.
   - **PITCH (`-12` to `+12 st`)**: Shifts pitch in semitones.
   - **WAVE WARP (`0–100%`)**: Applies warm waveshaping saturation.
   - **Rev**: Reverses the trimmed audio.
4. **Slice & Audition**: Choose **1, 4, 8, or 16 slices** and click the numbered **Slice Pads** below the waveform to preview each chop.
5. **Insert into Strudel**:
   - **+ One-Shot**: `s("my_sample")`
   - **+ Sliced**: `s("my_sample").slice(8, "0 1 2 3 4 5 6 7")`
   - **+ Chop Loop**: `s("my_sample").loopAt(2).chop(8)`

---

## 9. Visual Oscillator & Synth Designer

Open the **Oscillator** tab in the bottom dock:
- Pick a waveform (**Sine**, **Triangle**, **Saw**, **Square**, **Supersaw**) or load one of the 5 **Synth Patches** (*Warm Analog Saw*, *Deep Sub Sine*, *FM Glass Bell*, *Acid 303 Squelch*, *Lush Supersaw Pad*).
- Sculpt your tone while watching the live **Oscillator Wave** and **ADSR Envelope** visualizers (**Octave, FM Depth/Ratio, LPF Cutoff, Resonance Q, ADSR, Vibrato LFO, Reverb & Delay**).
- Audition using the note buttons (`C3`–`C4`) or click **Route MIDI Keys** to play your custom Oscillator patch from your MIDI keyboard.
- Click **Insert Code** for static Strudel code, or **Insert Live `oscSynth()`** so your pattern reacts **live** as you move Oscillator sliders!

---

## 10. Live Performance Playlists & Audio Fades

Open the **Live Playlist** tab in the bottom dock (or switch to **Live** mode):
- **Multiple Playlists**: Click **New Playlist** to create separate setlists (e.g., *"Club Set"*, *"Ambient Set"*), and switch between them using the dropdown.
- **Add Tracks**: Type a title and click **+ Add Track** to save your current editor pattern, BPM, and active Hydra visual into the playlist.
- **Per-Track Fade Settings**:
  - **Smooth Fade**: Equal-power volume fade out → track & BPM swap → fade in.
  - **Filter Sweep**: Sweeps Low-Pass Filter closed during fade out, swaps tracks, then sweeps open.
  - **Instant Cut**: Immediate switch with no fade.
  - Choose fade duration from **`0s` to `12s`**.
- **Per-Track Hydra Visual**: Pick a Hydra visual for each track so your **2nd Monitor** automatically switches visuals when the track fades in.
- Trigger transitions via **Next with Fade / Prev**, clicking any track's Play button, a **MIDI Pad**, or an **AI MCP** command.

---

## 11. Hydra Visuals for 2nd Monitor

1. Click **Hydra** in the top bar (or **Open 2nd Monitor** in the **Hydra 2nd Monitor** dock tab) to launch the clean stage window (`http://localhost:5173/?view=hydra`).
2. Drag that window to your **2nd monitor or projector** and press **`F`** for fullscreen.
3. **Two Ways to Drive Hydra**:
   - **Hydra Panel Presets & Custom Visuals**: Select any built-in preset (including **Webcam Kaleidoscope Drop** via the 📷 button), edit Hydra code using live variables (`studio.bass`, `studio.mid`, `studio.high`, `studio.m1..m8`), and click **+ Add New Hydra Visual** to save your own presets.
   - **Inline Strudel `await initHydra()` Scripts**: Paste full Strudel + Hydra multi-scene scripts (with `s0.initCam()`, `o0..o3`, `render()`, `a.fft[0..3]`) right in the Pattern Editor — visuals run offscreen so the main DAW stays clean and stream at **60fps** directly to the 2nd Monitor!

---

## 12. Controlling Strudel Studio with Any Frontier AI (MCP)

Strudel Studio includes a universal **Model Context Protocol (MCP)** server (`dist-mcp/mcp-server/index.js`) with **19 AI tools** and **3 resources** so **Claude Desktop, Claude Code, Antigravity, Cursor, Windsurf, Gemini CLI**, or any MCP client can compose, mix, fade playlists, sculpt the Oscillator, and switch Hydra visuals live.

### Setup
1. Build the MCP server once (already built if you ran `npm run build`):
   ```bash
   npm run build:mcp
   ```
2. Add this to your AI client's MCP config (or click the **MCP** pill in the top bar to copy it):
   ```json
   {
     "mcpServers": {
       "strudel-studio": {
         "command": "node",
         "args": ["/Users/ppdjhr02-13imac/Desktop/strudel/dist-mcp/mcp-server/index.js"]
       }
     }
   }
   ```
3. Keep Strudel Studio open at **http://localhost:5173/** — the **MCP** pill turns glowing violet (**AI MCP**) as soon as your AI client connects!

### Example AI Prompts You Can Try
- *"Write a 124 BPM Deep House track in Strudel Studio using `track('drums', ...)` and `macro(1)` on the chords filter, then play it."*
- *"Slowly open Macro 1 to 0.85 and mute the drums track."*
- *"Switch the Oscillator to an FM Glass Bell patch and add a new track to my Live Playlist."*
- *"Fade to the next track in my Live Playlist and switch Hydra to Cyber Audio Grid."*

---

## Credits

Powered by **[Strudel](https://codeberg.org/uzu/strudel)** (`https://codeberg.org/uzu/strudel`) and **[Hydra](https://hydra.ojack.xyz/)**. Full credit to Felix Roos, Alex McLean, Olivia Jack, and the open-source Strudel / TidalCycles community.
