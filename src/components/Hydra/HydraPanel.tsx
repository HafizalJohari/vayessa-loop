import { useState } from 'react';
import {
  Camera,
  ExternalLink,
  Eye,
  EyeOff,
  Monitor,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { HYDRA_PRESETS } from '@/data/hydraPresets';
import { useStudioStore } from '@/store/useStudioStore';
import { hydraBridge } from '@/engine/hydraBridge';

export function HydraPanel() {
  const hydraCode = useStudioStore((s) => s.hydraCode);
  const hydraPresetId = useStudioStore((s) => s.hydraPresetId);
  const hydraShowOverlay = useStudioStore((s) => s.hydraShowOverlay);
  const hydraStageConnected = useStudioStore((s) => s.hydraStageConnected);
  const customHydraPresets = useStudioStore((s) => s.customHydraPresets);
  const addCustomHydraPreset = useStudioStore((s) => s.addCustomHydraPreset);
  const removeCustomHydraPreset = useStudioStore((s) => s.removeCustomHydraPreset);
  const setHydraCode = useStudioStore((s) => s.setHydraCode);
  const setHydraShowOverlay = useStudioStore((s) => s.setHydraShowOverlay);
  const bpm = useStudioStore((s) => s.bpm);
  const playlist = useStudioStore((s) => s.playlist);
  const activePlaylistId = useStudioStore((s) => s.activePlaylistId);

  const [showNewVisualForm, setShowNewVisualForm] = useState(false);
  const [newVisualName, setNewVisualName] = useState('');
  const [proj3D, setProj3D] = useState({ rotateX: 0, rotateY: 0, scale: 1, showGrid: false });

  const updateProjection3D = (patch: Partial<typeof proj3D>) => {
    const next = { ...proj3D, ...patch };
    setProj3D(next);
    hydraBridge.sendProjection3D(next);
  };

  const activeTitle =
    playlist.find((p) => p.id === activePlaylistId)?.title ?? 'Strudel Studio Live';

  const allPresets = [
    ...customHydraPresets.map((p) => ({ ...p, isCustom: true })),
    ...HYDRA_PRESETS.map((p) => ({ ...p, isCustom: false })),
  ];

  const handleSelectPreset = (id: string, code: string) => {
    setHydraCode(code, id);
    hydraBridge.sendCode(code, id);
  };

  const handleToggleOverlay = () => {
    const next = !hydraShowOverlay;
    setHydraShowOverlay(next);
    hydraBridge.sendOverlay(next, activeTitle, bpm);
  };

  const handleSaveCustomVisual = () => {
    const cleanName = newVisualName.trim();
    if (!cleanName) return;
    const created = addCustomHydraPreset({
      name: cleanName,
      description: 'Custom Hydra visual preset',
      code: hydraCode,
    });
    hydraBridge.sendCode(created.code, created.id);
    setNewVisualName('');
    setShowNewVisualForm(false);
  };

  // Inject modern post-FX chain right before .out(o0) and push live to 2nd Monitor
  const applyModernFxModifier = (fxSnippet: string) => {
    const outRegex = /\.out\s*\(\s*o0\s*\)/;
    const updated = outRegex.test(hydraCode)
      ? hydraCode.replace(outRegex, `\n  ${fxSnippet}\n  .out(o0)`)
      : `${hydraCode.trimEnd()}\n  ${fxSnippet}`;
    setHydraCode(updated);
    hydraBridge.sendCode(updated);
  };

  const MODERN_FX_MODIFIERS = [
    {
      label: '+ RGB Prism',
      code: `.add(src(o0).scrollX(() => 0.008 + studio.high * 0.02).color(0.2, 0.95, 0.85), 0.35)`,
    },
    {
      label: '+ Liquid Trail',
      code: `.blend(src(o0).scale(() => 1.015 + studio.bass * 0.04).brightness(-0.03), 0.78)`,
    },
    {
      label: '+ Monochrome Noir',
      code: `.saturate(0.08).contrast(1.65)`,
    },
    {
      label: '+ Symmetry',
      code: `.kaleid(2).rotate(() => Math.sin(time * 0.2) * 0.15)`,
    },
    {
      label: '+ Pixel Dither',
      code: `.pixelate(() => 48 + Math.floor(studio.m1 * 64), () => 32 + Math.floor(studio.m1 * 48))`,
    },
  ];

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-2.5 p-2.5 bg-[#0e1116] select-none">
      {/* Left: Launch 2nd Monitor + Webcam + Add Custom Visual + Presets */}
      <div className="flex flex-col gap-1.5 min-h-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => hydraBridge.openSecondMonitorWindow()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-fuchsia-500 text-white text-xs font-bold hover:bg-fuchsia-400 cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Open 2nd Monitor</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              const camPreset = HYDRA_PRESETS.find((p) => p.id === 'webcam-drop');
              if (camPreset) {
                handleSelectPreset(camPreset.id, camPreset.code);
              } else {
                hydraBridge.triggerWebcamOnStage();
              }
            }}
            className="p-1.5 rounded-lg border bg-[#171c26] border-[#262e3e] text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40 text-xs cursor-pointer"
            title="Enable Webcam Kaleidoscope (s0.initCam) on 2nd Monitor"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleOverlay}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
              hydraShowOverlay
                ? 'bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200'
                : 'bg-[#171c26] border-[#262e3e] text-[#7c8698]'
            }`}
            title="Toggle Track Title & BPM overlay on 2nd monitor"
          >
            {hydraShowOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Save Current Hydra Code as Custom Preset */}
        {!showNewVisualForm ? (
          <button
            type="button"
            onClick={() => setShowNewVisualForm(true)}
            className="w-full inline-flex items-center justify-center gap-1 py-1 rounded-md bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30 hover:bg-fuchsia-500/25 text-[11px] font-semibold cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add New Hydra Visual</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newVisualName}
              onChange={(e) => setNewVisualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomVisual()}
              placeholder="Visual preset name..."
              autoFocus
              className="flex-1 min-w-0 px-2 py-1 rounded bg-[#161b24] border border-fuchsia-500/50 text-[11px] text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveCustomVisual}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-fuchsia-500 text-white text-[11px] font-bold cursor-pointer"
            >
              <Save className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowNewVisualForm(false)}
              className="px-1.5 py-1 rounded bg-[#1f2634] text-[#8b95a7] text-[11px] cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {allPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id, preset.code)}
              className={`flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                hydraPresetId === preset.id
                  ? 'bg-fuchsia-500/15 border-fuchsia-400/45 text-fuchsia-100'
                  : 'bg-[#151922] border-[#222835] text-[#c3cddc] hover:border-[#343f55]'
              }`}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="truncate">{preset.name}</span>
                  {preset.isCustom && (
                    <span className="px-1 rounded bg-violet-500/25 text-violet-200 text-[8.5px] font-mono">
                      CUSTOM
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#7c8698] truncate">{preset.description}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {preset.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomHydraPreset(preset.id);
                    }}
                    className="p-1 rounded text-[#7c8698] hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {hydraPresetId === preset.id && <Sparkles className="w-3 h-3 text-fuchsia-300" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Live Hydra Code Editor */}
      <div className="md:col-span-2 flex flex-col rounded-xl bg-[#0c0f14] border border-[#222835] overflow-hidden min-h-0">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1d2330] bg-[#12161e]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-300">
              Hydra Visual Synth Code
            </span>
            <span
              className={`text-[10px] font-mono ${
                hydraStageConnected ? 'text-emerald-400' : 'text-[#697386]'
              }`}
            >
              {hydraStageConnected ? '● 2ND MONITOR SYNCED' : '○ CLICK OPEN 2ND MONITOR'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => hydraBridge.sendCode(hydraCode, hydraPresetId)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/35 hover:bg-fuchsia-500/30 text-[10.5px] font-semibold cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Push to 2nd Monitor</span>
          </button>
        </div>

        <textarea
          value={hydraCode}
          onChange={(e) => setHydraCode(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full p-2.5 bg-transparent font-mono text-xs text-fuchsia-100/90 focus:outline-none resize-none"
        />

        {/* 1-Click Modern Post-FX + 3D Projection Mapping Warp Bar */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 border-t border-[#1b212d] bg-[#10141c]">
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-[9.5px] font-mono uppercase text-[#697386] mr-0.5 shrink-0">
              FX:
            </span>
            {MODERN_FX_MODIFIERS.map((fx) => (
              <button
                key={fx.label}
                type="button"
                onClick={() => applyModernFxModifier(fx.code)}
                className="px-1.5 py-0.5 rounded bg-[#181f2c] hover:bg-fuchsia-500/20 border border-[#263044] hover:border-fuchsia-400/40 text-[10px] font-mono text-fuchsia-200 whitespace-nowrap cursor-pointer transition-colors"
              >
                {fx.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-[#8b95a7]">
            <button
              type="button"
              onClick={() => updateProjection3D({ showGrid: !proj3D.showGrid })}
              className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                proj3D.showGrid
                  ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-200 font-bold'
                  : 'bg-[#181f2c] border-[#263044] text-[#9aa4b6] hover:text-white'
              }`}
              title="Toggle 3D Projection Mapping Calibration Grid on 2nd Monitor"
            >
              3D Grid
            </button>
            <label className="flex items-center gap-1">
              <span>X:{proj3D.rotateX}°</span>
              <input
                type="range"
                min={-30}
                max={30}
                step={1}
                value={proj3D.rotateX}
                onChange={(e) => updateProjection3D({ rotateX: Number(e.target.value) })}
                className="studio-slider w-12"
              />
            </label>
            <label className="flex items-center gap-1">
              <span>Y:{proj3D.rotateY}°</span>
              <input
                type="range"
                min={-30}
                max={30}
                step={1}
                value={proj3D.rotateY}
                onChange={(e) => updateProjection3D({ rotateY: Number(e.target.value) })}
                className="studio-slider w-12"
              />
            </label>
            {(proj3D.rotateX !== 0 || proj3D.rotateY !== 0) && (
              <button
                type="button"
                onClick={() => updateProjection3D({ rotateX: 0, rotateY: 0, scale: 1 })}
                className="text-[9.5px] text-amber-300 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
