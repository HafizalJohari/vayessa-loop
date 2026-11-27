import type { MidiBinding, MidiDeviceInfo, PadActionType } from '@/types/studio';
import { useStudioStore } from '@/store/useStudioStore';
import {
  createMidiLogEvent,
  matchesMidiBinding,
  normalizeMidiValue,
  parseMidiMessage,
} from '@/engine/midiUtils';
import { strudelEngine } from '@/engine/strudelEngine';
import { transitionEngine } from '@/engine/transitionEngine';
import { STUDIO_PRESETS } from '@/data/presets';

class MidiEngineService {
  private access: MIDIAccess | null = null;
  private tapTimestamps: number[] = [];

  async init(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      useStudioStore.getState().setMidiSupport(false, false);
      return false;
    }

    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      useStudioStore.getState().setMidiSupport(true, true);
      this.refreshDevices();

      this.access.onstatechange = () => {
        this.refreshDevices();
      };
      return true;
    } catch (err) {
      console.warn('[MidiEngine] WebMIDI access denied or unavailable:', err);
      useStudioStore.getState().setMidiSupport(true, false);
      return false;
    }
  }

  refreshDevices(): void {
    if (!this.access) return;
    const inputs: MidiDeviceInfo[] = [];
    const outputs: MidiDeviceInfo[] = [];

    this.access.inputs.forEach((input) => {
      inputs.push({
        id: input.id,
        name: input.name || 'MIDI Input',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state,
        type: 'input',
      });
      input.onmidimessage = (event: MIDIMessageEvent) => {
        if (!event.data) return;
        this.handleIncomingMidi(input.id, input.name || 'MIDI Input', event.data);
      };
    });

    this.access.outputs.forEach((output) => {
      outputs.push({
        id: output.id,
        name: output.name || 'MIDI Output',
        manufacturer: output.manufacturer || 'Unknown',
        state: output.state,
        type: 'output',
      });
    });

    useStudioStore.getState().setMidiDevices(inputs, outputs);
  }

  /**
   * Simulate an incoming MIDI CC or Note event (useful for testing MIDI Learn & Pads without hardware)
   */
  simulateMidiMessage(bytes: [number, number, number], deviceName = 'Virtual Controller'): void {
    this.handleIncomingMidi('virtual-sim', deviceName, new Uint8Array(bytes));
  }

  private handleIncomingMidi(deviceId: string, deviceName: string, data: Uint8Array): void {
    const msg = parseMidiMessage(data);
    if (msg.type === 'clock' || msg.type === 'other') return;

    const store = useStudioStore.getState();

    // 1. Push to live MIDI activity monitor
    store.pushMidiLog(createMidiLogEvent('in', deviceName, msg));

    // 2. If MIDI Learn mode is active, bind immediately and exit learn mode
    if (store.learningTarget) {
      const target = store.learningTarget;
      const expectsNote = target.kind === 'pad' || target.kind === 'track_mute';
      if ((expectsNote && msg.type === 'noteon') || (!expectsNote && msg.type === 'cc')) {
        const binding: MidiBinding = {
          deviceId,
          deviceName,
          channel: msg.channel,
          type: msg.type === 'cc' ? 'cc' : 'note',
          number: msg.number,
        };
        store.bindMidiToTarget(target, binding);
        return;
      }
      // Also allow CC to bind to pads/mute or Note to bind if user presses whatever they have
      if (msg.type === 'cc' || msg.type === 'noteon') {
        const binding: MidiBinding = {
          deviceId,
          deviceName,
          channel: msg.channel,
          type: msg.type === 'cc' ? 'cc' : 'note',
          number: msg.number,
        };
        store.bindMidiToTarget(target, binding);
        return;
      }
    }

    // 3. Route CC messages to bound Macro Knobs, Track Gains, and BPM
    if (msg.type === 'cc') {
      const norm = normalizeMidiValue(msg.value);

      for (const macro of store.macros) {
        if (matchesMidiBinding(macro.midiBinding, deviceId, msg)) {
          store.setMacroValue(macro.id, norm);
        }
      }

      for (const track of store.tracks) {
        if (matchesMidiBinding(track.midiGainBinding, deviceId, msg)) {
          store.updateTrack(track.id, { gain: norm * 1.4 });
        }
      }

      if (matchesMidiBinding(store.bpmMidiBinding, deviceId, msg)) {
        const mappedBpm = Math.round(60 + norm * 140);
        strudelEngine.setBpm(mappedBpm);
      }
    }

    // 4. Route Pad / Track Mute triggers
    let consumedByPad = false;
    for (const pad of store.padMappings) {
      if (matchesMidiBinding(pad.midiBinding, deviceId, msg)) {
        this.executePadAction(pad.action);
        consumedByPad = true;
      }
    }

    for (const track of store.tracks) {
      if (matchesMidiBinding(track.midiMuteBinding, deviceId, msg)) {
        store.toggleTrackMute(track.id);
        consumedByPad = true;
      }
    }

    // 5. Keyboard Live Play & Note Capture (when not consumed by a mapped pad)
    if (msg.type === 'noteon' && msg.noteName && !consumedByPad) {
      store.noteOn(msg.number, msg.noteName);
      const velocityGain = Math.max(0.15, normalizeMidiValue(msg.value));
      if (store.keyboardSynth === 'studio_osc') {
        void strudelEngine.auditionOscillatorNote(msg.noteName, 0.5, velocityGain);
      } else {
        void strudelEngine.triggerOneShot({
          s: store.keyboardSynth,
          note: msg.noteName,
          gain: velocityGain * 0.85,
          duration: 0.45,
        });
      }
    } else if (msg.type === 'noteoff') {
      store.noteOff(msg.number);
    }
  }

  executePadAction(action: PadActionType): void {
    const store = useStudioStore.getState();

    switch (action) {
      case 'toggle_play':
        if (store.isPlaying) {
          strudelEngine.stop();
        } else {
          void strudelEngine.evaluate(store.code);
        }
        break;
      case 'evaluate':
        void strudelEngine.evaluate(store.code);
        break;
      case 'tap_tempo': {
        const now = performance.now();
        this.tapTimestamps = this.tapTimestamps.filter((t) => now - t < 2500);
        this.tapTimestamps.push(now);
        if (this.tapTimestamps.length >= 2) {
          const diffs = [];
          for (let i = 1; i < this.tapTimestamps.length; i++) {
            diffs.push(this.tapTimestamps[i] - this.tapTimestamps[i - 1]);
          }
          const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          strudelEngine.setBpm(Math.round(60000 / avgMs));
        }
        break;
      }
      case 'mute_track_1':
      case 'mute_track_2':
      case 'mute_track_3':
      case 'mute_track_4': {
        const idx = Number(action.slice(-1)) - 1;
        const track = store.tracks[idx];
        if (track) store.toggleTrackMute(track.id);
        break;
      }
      case 'load_preset_1':
      case 'load_preset_2':
      case 'load_preset_3':
      case 'load_preset_4': {
        const idx = Number(action.slice(-1)) - 1;
        const preset = STUDIO_PRESETS[idx];
        if (preset) {
          store.setCode(preset.code);
          strudelEngine.setBpm(preset.bpm);
          if (store.isPlaying) {
            void strudelEngine.evaluate(preset.code);
          }
        }
        break;
      }
      case 'playlist_next':
        void transitionEngine.playNext();
        break;
      case 'playlist_prev':
        void transitionEngine.playPrev();
        break;
    }
  }

  /**
   * Send a test note to the selected MIDI Output port
   */
  sendTestNoteToOutput(noteNumber = 60): boolean {
    if (!this.access) return false;
    const outputId = useStudioStore.getState().selectedMidiOutputId;
    const output = this.access.outputs.get(outputId);
    if (!output) return false;

    output.send([0x90, noteNumber, 100]);
    setTimeout(() => {
      output.send([0x80, noteNumber, 0]);
    }, 250);

    useStudioStore.getState().pushMidiLog(
      createMidiLogEvent('out', output.name || 'MIDI Out', {
        channel: 1,
        type: 'noteon',
        number: noteNumber,
        value: 100,
        noteName: 'c4',
      })
    );
    return true;
  }
}

export const midiEngine = new MidiEngineService();
