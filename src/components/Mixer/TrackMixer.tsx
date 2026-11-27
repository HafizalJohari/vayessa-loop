import { Radio } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import { formatMidiBinding } from '@/engine/midiUtils';

export function TrackMixer() {
  const tracks = useStudioStore((s) => s.tracks);
  const updateTrack = useStudioStore((s) => s.updateTrack);
  const toggleTrackMute = useStudioStore((s) => s.toggleTrackMute);
  const toggleTrackSolo = useStudioStore((s) => s.toggleTrackSolo);
  const learningTarget = useStudioStore((s) => s.learningTarget);
  const setLearningTarget = useStudioStore((s) => s.setLearningTarget);

  return (
    <div className="h-full flex items-stretch gap-3 p-3 overflow-x-auto bg-[#0e1116]">
      {tracks.map((track) => {
        const isLearningGain =
          learningTarget?.kind === 'track_gain' && learningTarget.trackId === track.id;
        const isLearningMute =
          learningTarget?.kind === 'track_mute' && learningTarget.trackId === track.id;

        return (
          <div
            key={track.id}
            className="w-44 shrink-0 flex flex-col justify-between p-3 rounded-xl bg-[#151922] border border-[#232936]"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: track.color }}
                />
                <span className="text-xs font-semibold text-white">{track.name}</span>
              </div>
              <span className="text-[10px] font-mono text-[#6d778a]">
                track(&apos;{track.id}&apos;)
              </span>
            </div>

            {/* Gain Fader */}
            <div className="my-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#8b95a7]">GAIN</span>
                <span className="text-emerald-300">{Math.round(track.gain * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.4}
                step={0.01}
                value={track.gain}
                onChange={(e) => updateTrack(track.id, { gain: Number(e.target.value) })}
                className="studio-slider w-full"
              />
              <button
                type="button"
                onClick={() =>
                  setLearningTarget(
                    isLearningGain ? null : { kind: 'track_gain', trackId: track.id }
                  )
                }
                className={`w-full py-0.5 rounded text-[9.5px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isLearningGain
                    ? 'bg-amber-500 text-black font-bold animate-pulse'
                    : 'bg-[#1c222e] text-[#7c8698] hover:text-amber-300'
                }`}
              >
                <Radio className="w-2.5 h-2.5" />
                <span>
                  {isLearningGain
                    ? 'TWIST FADER...'
                    : track.midiGainBinding
                      ? formatMidiBinding(track.midiGainBinding)
                      : 'MIDI Learn Gain'}
                </span>
              </button>
            </div>

            {/* Quick LPF Filter */}
            <div className="mb-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#8b95a7]">LPF</span>
                <span className="text-cyan-300">
                  {track.lpf >= 1000
                    ? `${(track.lpf / 1000).toFixed(1)}kHz`
                    : `${Math.round(track.lpf)}Hz`}
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={18000}
                step={50}
                value={track.lpf}
                onChange={(e) => updateTrack(track.id, { lpf: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </div>

            {/* Mute / Solo / MIDI Mute */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => toggleTrackMute(track.id)}
                className={`py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  track.muted
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#1f2532] text-[#9aa4b6] hover:text-white'
                }`}
              >
                M
              </button>
              <button
                type="button"
                onClick={() => toggleTrackSolo(track.id)}
                className={`py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  track.solo
                    ? 'bg-amber-400 text-black'
                    : 'bg-[#1f2532] text-[#9aa4b6] hover:text-white'
                }`}
              >
                S
              </button>
              <button
                type="button"
                onClick={() =>
                  setLearningTarget(
                    isLearningMute ? null : { kind: 'track_mute', trackId: track.id }
                  )
                }
                className={`py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                  isLearningMute
                    ? 'bg-amber-500 text-black font-bold animate-pulse'
                    : track.midiMuteBinding
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#1f2532] text-[#6f798c] hover:text-amber-300'
                }`}
                title="MIDI Learn Mute Pad"
              >
                PAD
              </button>
            </div>
          </div>
        );
      })}

      {/* Usage hint card */}
      <div className="w-56 shrink-0 flex flex-col justify-center p-3.5 rounded-xl bg-[#11151d] border border-dashed border-[#262d3b] text-xs text-[#7c8698]">
        <div className="font-semibold text-[#c4cddb] mb-1">Live Track Routing</div>
        <p className="text-[11px] leading-relaxed">
          Wrap any Strudel pattern with{' '}
          <code className="text-emerald-300 font-mono">track(&apos;drums&apos;, ...)</code> to
          control Mute, Solo, Gain, and LPF live — or bind them to your MIDI controller!
        </p>
      </div>
    </div>
  );
}
