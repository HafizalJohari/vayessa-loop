import { useState } from 'react';
import {
  Code2,
  Disc3,
  Play,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { STUDIO_PRESETS } from '@/data/presets';
import { CODE_SNIPPETS, SAMPLE_CATALOG } from '@/data/samples';
import { useStudioStore } from '@/store/useStudioStore';
import { strudelEngine } from '@/engine/strudelEngine';

interface SoundBrowserProps {
  onInsertSnippet: (snippet: string) => void;
}

type BrowserTab = 'presets' | 'samples' | 'snippets';

export function SoundBrowser({ onInsertSnippet }: SoundBrowserProps) {
  const [tab, setTab] = useState<BrowserTab>('presets');
  const [query, setQuery] = useState('');
  const [sampleCat, setSampleCat] = useState<'all' | 'drums' | 'synths' | 'soundfonts' | 'percussion'>('all');
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetGenre, setPresetGenre] = useState('Custom');
  const [presetDesc, setPresetDesc] = useState('');

  const code = useStudioStore((s) => s.code);
  const bpm = useStudioStore((s) => s.bpm);
  const setCode = useStudioStore((s) => s.setCode);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const customPresets = useStudioStore((s) => s.customPresets);
  const addCustomPreset = useStudioStore((s) => s.addCustomPreset);
  const removeCustomPreset = useStudioStore((s) => s.removeCustomPreset);

  const q = query.trim().toLowerCase();

  const allPresets = [
    ...customPresets.map((p) => ({ ...p, isCustom: true })),
    ...STUDIO_PRESETS.map((p) => ({ ...p, isCustom: false })),
  ];

  const filteredPresets = allPresets.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.genre.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );

  const handleSaveNewPreset = () => {
    const cleanName = presetName.trim();
    if (!cleanName) return;
    addCustomPreset({
      name: cleanName,
      genre: presetGenre.trim() || 'Custom',
      bpm,
      description: presetDesc.trim() || 'Custom user preset saved from editor.',
      code,
    });
    setPresetName('');
    setPresetDesc('');
    setShowNewPresetForm(false);
  };

  const filteredSamples = SAMPLE_CATALOG.filter((s) => {
    if (sampleCat !== 'all' && s.category !== sampleCat) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.sound.toLowerCase().includes(q) ||
      (s.bank?.toLowerCase().includes(q) ?? false)
    );
  });

  const filteredSnippets = CODE_SNIPPETS.filter(
    (sn) =>
      !q ||
      sn.name.toLowerCase().includes(q) ||
      sn.description.toLowerCase().includes(q) ||
      sn.code.toLowerCase().includes(q)
  );

  const handleLoadPreset = (code: string, bpm: number) => {
    setCode(code);
    strudelEngine.setBpm(bpm);
    if (isPlaying) {
      void strudelEngine.evaluate(code);
    }
  };

  return (
    <aside className="w-68 shrink-0 flex flex-col h-full bg-[#11141a] border-r border-[#222732] select-none">
      {/* Top Tabs */}
      <div className="grid grid-cols-3 p-1.5 gap-1 border-b border-[#222732] bg-[#0e1116]">
        {(
          [
            { id: 'presets', label: 'Presets', icon: Sparkles },
            { id: 'samples', label: 'Sounds', icon: Disc3 },
            { id: 'snippets', label: 'Syntax', icon: Code2 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === id
                ? 'bg-[#1e2430] text-emerald-300 shadow-sm'
                : 'text-[#7c8698] hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2.5 border-b border-[#1d222c]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#171b23] border border-[#252c39] text-xs text-white placeholder-[#5d6678] focus:outline-none focus:border-emerald-500/60"
          />
        </div>

        {tab === 'samples' && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(['all', 'drums', 'synths', 'soundfonts', 'percussion'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSampleCat(cat)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors cursor-pointer ${
                  sampleCat === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#171b23] text-[#7c8698] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {tab === 'presets' && (
          <>
            {!showNewPresetForm ? (
              <button
                type="button"
                onClick={() => setShowNewPresetForm(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/25 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Preset</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-lg bg-[#161c26] border border-emerald-500/40 space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-300">
                  Save Editor as Preset ({bpm} BPM)
                </div>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="w-full px-2 py-1 rounded bg-[#0e1117] border border-[#262e3d] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={presetGenre}
                  onChange={(e) => setPresetGenre(e.target.value)}
                  placeholder="Genre (e.g. Gamelan Techno)"
                  className="w-full px-2 py-1 rounded bg-[#0e1117] border border-[#262e3d] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                  placeholder="Short description..."
                  className="w-full px-2 py-1 rounded bg-[#0e1117] border border-[#262e3d] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveNewPreset}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1 rounded bg-emerald-500 text-[#07110b] text-xs font-bold hover:bg-emerald-400 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewPresetForm(false)}
                    className="px-2.5 py-1 rounded bg-[#1f2634] text-[#9aa4b6] hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="group p-2.5 rounded-lg bg-[#161a22] border border-[#232936] hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{preset.name}</span>
                      {preset.isCustom && (
                        <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[9px] font-mono uppercase">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400/80 mt-0.5">
                      {preset.genre} · {preset.bpm} BPM
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {preset.isCustom && (
                      <button
                        type="button"
                        onClick={() => removeCustomPreset(preset.id)}
                        className="p-1.5 rounded-md bg-[#1e2430] text-[#7c8698] hover:text-rose-400 cursor-pointer"
                        title="Delete custom preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        handleLoadPreset(preset.code, preset.bpm);
                        void strudelEngine.evaluate(preset.code);
                      }}
                      className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-[#08110c] transition-colors cursor-pointer"
                      title="Load & Play Preset"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#838d9f] mt-1.5 leading-relaxed">
                  {preset.description}
                </p>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(preset.code, preset.bpm)}
                  className="mt-2 w-full py-1 rounded text-[11px] font-medium bg-[#1e2430] text-[#b9c2d3] hover:text-white hover:bg-[#262e3d] transition-colors cursor-pointer"
                >
                  Load into Editor
                </button>
              </div>
            ))}
          </>
        )}

        {tab === 'samples' &&
          filteredSamples.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#161a22] border border-[#232936] hover:border-[#343e52] transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#e4e9f2] truncate">{item.name}</div>
                <div className="text-[10px] font-mono text-[#6c7689] truncate">
                  {item.sound}
                  {item.bank ? ` · ${item.bank}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    void strudelEngine.triggerOneShot({
                      s: item.sound,
                      bank: item.bank,
                      note: item.previewNote,
                    })
                  }
                  className="p-1.5 rounded bg-[#1e2430] text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                  title="Preview Sound"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onInsertSnippet(item.snippet)}
                  className="p-1.5 rounded bg-[#1e2430] text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  title="Insert into Editor"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

        {tab === 'snippets' &&
          filteredSnippets.map((snip) => (
            <div
              key={snip.id}
              className="p-2.5 rounded-lg bg-[#161a22] border border-[#232936] hover:border-emerald-500/35 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">{snip.name}</span>
                <button
                  type="button"
                  onClick={() => onInsertSnippet(snip.code)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold hover:bg-emerald-500/25 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Insert
                </button>
              </div>
              <p className="text-[11px] text-[#838d9f] mt-1">{snip.description}</p>
              <pre className="mt-1.5 p-1.5 rounded bg-[#0e1015] text-[10.5px] font-mono text-cyan-200/90 overflow-x-auto border border-[#1f2430]">
                {snip.code}
              </pre>
            </div>
          ))}
      </div>
    </aside>
  );
}
