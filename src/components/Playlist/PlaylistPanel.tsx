import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  ListMusic,
  Monitor,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { useStudioStore, type FadeStyle } from '@/store/useStudioStore';
import { transitionEngine } from '@/engine/transitionEngine';
import { HYDRA_PRESETS } from '@/data/hydraPresets';

export function PlaylistPanel() {
  const playlists = useStudioStore((s) => s.playlists);
  const activePlaylistCollectionId = useStudioStore((s) => s.activePlaylistCollectionId);
  const createPlaylist = useStudioStore((s) => s.createPlaylist);
  const deletePlaylist = useStudioStore((s) => s.deletePlaylist);
  const setActivePlaylistCollection = useStudioStore((s) => s.setActivePlaylistCollection);

  const playlist = useStudioStore((s) => s.playlist);
  const activePlaylistId = useStudioStore((s) => s.activePlaylistId);
  const isTransitioning = useStudioStore((s) => s.isTransitioning);
  const transitionProgress = useStudioStore((s) => s.transitionProgress);
  const transitionLabel = useStudioStore((s) => s.transitionLabel);

  const customHydraPresets = useStudioStore((s) => s.customHydraPresets);
  const hydraPresetId = useStudioStore((s) => s.hydraPresetId);

  const code = useStudioStore((s) => s.code);
  const bpm = useStudioStore((s) => s.bpm);
  const addPlaylistItem = useStudioStore((s) => s.addPlaylistItem);
  const updatePlaylistItem = useStudioStore((s) => s.updatePlaylistItem);
  const removePlaylistItem = useStudioStore((s) => s.removePlaylistItem);
  const movePlaylistItem = useStudioStore((s) => s.movePlaylistItem);

  const [newTitle, setNewTitle] = useState('');
  const [showNewSetForm, setShowNewSetForm] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  const allHydraOptions = [...customHydraPresets, ...HYDRA_PRESETS];

  const handleAddCurrent = () => {
    const title = newTitle.trim() || `Live Track ${playlist.length + 1}`;
    addPlaylistItem({
      title,
      bpm,
      code,
      fadeSeconds: 4,
      fadeStyle: 'smooth',
      hydraPresetId,
    });
    setNewTitle('');
  };

  const handleCreatePlaylist = () => {
    if (!newSetName.trim()) return;
    createPlaylist(newSetName.trim());
    setNewSetName('');
    setShowNewSetForm(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0e1116] p-2.5 select-none">
      {/* Top Deck Bar: Multi-Playlist Switcher + Transport + Add Track */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Playlist Collection Selector */}
          <select
            value={activePlaylistCollectionId}
            onChange={(e) => setActivePlaylistCollection(e.target.value)}
            className="bg-[#161c26] border border-[#283244] rounded-md px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
            title="Switch Live Playlist"
          >
            {playlists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} ({pl.items.length})
              </option>
            ))}
          </select>

          {!showNewSetForm ? (
            <button
              type="button"
              onClick={() => setShowNewSetForm(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a2230] text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 text-[11px] font-semibold cursor-pointer"
              title="Create a new playlist"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Playlist</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                placeholder="Playlist name..."
                autoFocus
                className="w-32 px-2 py-1 rounded-md bg-[#161b24] border border-cyan-500/60 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreatePlaylist}
                className="px-2 py-1 rounded bg-cyan-500 text-black text-[11px] font-bold cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewSetForm(false)}
                className="px-1.5 py-1 rounded bg-[#1d2330] text-[#8b95a7] text-[11px] cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {playlists.length > 1 && (
            <button
              type="button"
              onClick={() => deletePlaylist(activePlaylistCollectionId)}
              className="p-1 rounded-md bg-[#1a202c] text-[#7c8698] hover:text-rose-400 cursor-pointer"
              title="Delete current playlist"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-px bg-[#242b3a] mx-0.5" />

          <button
            type="button"
            onClick={() => void transitionEngine.playPrev()}
            disabled={playlist.length === 0}
            className="p-1.5 rounded-md bg-[#1a202c] text-[#b4bfd2] hover:text-white disabled:opacity-40 cursor-pointer"
            title="Previous track with fade"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void transitionEngine.playNext()}
            disabled={playlist.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500 text-[#08120c] text-xs font-bold hover:bg-emerald-400 disabled:opacity-40 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
            <span>Next with Fade</span>
          </button>

          {isTransitioning && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30">
              <span className="text-[10.5px] font-mono text-emerald-300">{transitionLabel}</span>
              <div className="w-16 h-1.5 bg-[#1b222e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.round(transitionProgress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Save current editor code into active Playlist */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCurrent()}
            placeholder="Track title..."
            className="w-32 px-2 py-1 rounded-md bg-[#161b24] border border-[#262e3e] text-xs text-white placeholder-[#5c6678] focus:outline-none focus:border-emerald-500/60"
          />
          <button
            type="button"
            onClick={handleAddCurrent}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1c2330] text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Track</span>
          </button>
        </div>
      </div>

      {/* Playlist Rows */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {playlist.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-[#697386] gap-1">
            <ListMusic className="w-5 h-5 opacity-60" />
            <span>This playlist is empty. Click &quot;Add Track&quot; to save your current pattern.</span>
          </div>
        ) : (
          playlist.map((item, idx) => {
            const isActive = item.id === activePlaylistId;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-emerald-500/12 border-emerald-500/45'
                    : 'bg-[#151922] border-[#222835] hover:border-[#323c4f]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[10px] font-mono text-[#697386] w-4 text-right">
                    {idx + 1}.
                  </span>
                  <button
                    type="button"
                    onClick={() => void transitionEngine.transitionToTrack(item)}
                    className={`p-1.5 rounded-md cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-[#08120c]'
                        : 'bg-[#1e2533] text-emerald-300 hover:bg-emerald-500/25'
                    }`}
                    title={`Transition to "${item.title}" (${item.fadeSeconds}s ${item.fadeStyle})`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>

                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updatePlaylistItem(item.id, { title: e.target.value })}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none border-b border-transparent focus:border-emerald-500/50 truncate min-w-0 flex-1"
                  />
                  <span className="text-[10.5px] font-mono text-emerald-300/80 shrink-0">
                    {item.bpm} BPM
                  </span>
                </div>

                {/* Per-track Hydra Visual + Fade Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 bg-[#0f131a] border border-[#252d3c] rounded px-1.5 py-0.5">
                    <Monitor className="w-3 h-3 text-fuchsia-400 shrink-0" />
                    <select
                      value={item.hydraPresetId ?? ''}
                      onChange={(e) =>
                        updatePlaylistItem(item.id, {
                          hydraPresetId: e.target.value || undefined,
                        })
                      }
                      className="bg-transparent text-[10px] text-fuchsia-200 focus:outline-none max-w-28"
                      title="Hydra Visual for 2nd Monitor on this track"
                    >
                      <option value="">Keep Visual</option>
                      {allHydraOptions.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={item.fadeStyle}
                    onChange={(e) =>
                      updatePlaylistItem(item.id, { fadeStyle: e.target.value as FadeStyle })
                    }
                    className="bg-[#0f131a] border border-[#252d3c] rounded px-1.5 py-0.5 text-[10.5px] text-[#c5cfdf]"
                    title="Transition fade style"
                  >
                    <option value="smooth">Smooth Fade</option>
                    <option value="filter">Filter Sweep</option>
                    <option value="cut">Instant Cut</option>
                  </select>

                  <select
                    value={item.fadeSeconds}
                    onChange={(e) =>
                      updatePlaylistItem(item.id, { fadeSeconds: Number(e.target.value) })
                    }
                    disabled={item.fadeStyle === 'cut'}
                    className="bg-[#0f131a] border border-[#252d3c] rounded px-1.5 py-0.5 text-[10.5px] font-mono text-amber-300 disabled:opacity-40"
                    title="Fade duration in seconds"
                  >
                    {[0, 2, 4, 6, 8, 12].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}s
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => movePlaylistItem(item.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded text-[#7c8698] hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlaylistItem(item.id, 'down')}
                    disabled={idx === playlist.length - 1}
                    className="p-1 rounded text-[#7c8698] hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlaylistItem(item.id)}
                    className="p-1 rounded text-[#7c8698] hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
