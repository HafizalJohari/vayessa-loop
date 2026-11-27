import * as strudelWebaudio from '@strudel/webaudio';
import type { ImportedSampleMeta } from '@/types/studio';
import {
  computeWaveformPeaks,
  deleteSampleRecord,
  encodeWavFromFloat32,
  loadAllSampleRecords,
  processWaveChannel,
  sanitizeSampleName,
  saveSampleRecord,
  type StoredSampleRecord,
} from '@/engine/sampleStorage';

class SamplerEngineService {
  private decodedBuffers = new Map<string, AudioBuffer>();
  private rawRecords = new Map<string, StoredSampleRecord>();
  private blobUrls = new Map<string, string>();
  private sampleMetas = new Map<string, ImportedSampleMeta>();
  private listeners = new Set<() => void>();
  private loaded = false;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }

  getAllMetas(): ImportedSampleMeta[] {
    return Array.from(this.sampleMetas.values());
  }

  private getAudioCtx(): AudioContext {
    try {
      return strudelWebaudio.getAudioContext();
    } catch {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      return new Ctx();
    }
  }

  async loadSavedSamples(): Promise<ImportedSampleMeta[]> {
    if (this.loaded) return this.getAllMetas();
    this.loaded = true;
    try {
      const records = await loadAllSampleRecords();
      for (const rec of records) {
        await this.hydrateRecord(rec);
      }
      this.emit();
    } catch (err) {
      console.warn('[SamplerEngine] IndexedDB load skipped:', err);
    }
    return this.getAllMetas();
  }

  async importFile(file: File): Promise<ImportedSampleMeta> {
    const arrayBuffer = await file.arrayBuffer();
    const id = `smp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let baseName = sanitizeSampleName(file.name);

    // Ensure unique Strudel sample name
    const existingNames = new Set(Array.from(this.sampleMetas.values()).map((m) => m.name));
    let suffix = 2;
    while (existingNames.has(baseName)) {
      baseName = `${sanitizeSampleName(file.name)}_${suffix++}`;
    }

    const record: StoredSampleRecord = {
      id,
      name: baseName,
      fileName: file.name,
      mimeType: file.type || 'audio/wav',
      arrayBuffer,
      trimStart: 0,
      trimEnd: 1,
      waveShift: 0,
      pitchSemitones: 0,
      waveShape: 0,
      sliceCount: 8,
      reversed: false,
    };

    const meta = await this.hydrateRecord(record);
    await saveSampleRecord(record).catch(() => {});
    this.emit();
    return meta;
  }

  /**
   * Update trim/cut, waveShift, pitch, waveShape, sliceCount, reverse, or name,
   * re-encode the processed WAV Blob, and re-register into Strudel!
   */
  async updateSample(
    id: string,
    patch: Partial<
      Pick<
        ImportedSampleMeta,
        'name' | 'trimStart' | 'trimEnd' | 'waveShift' | 'pitchSemitones' | 'waveShape' | 'sliceCount' | 'reversed'
      >
    >
  ): Promise<ImportedSampleMeta | null> {
    const rec = this.rawRecords.get(id);
    const decoded = this.decodedBuffers.get(id);
    if (!rec || !decoded) return null;

    const updated: StoredSampleRecord = {
      ...rec,
      name: patch.name !== undefined ? sanitizeSampleName(patch.name) : rec.name,
      trimStart: patch.trimStart ?? rec.trimStart,
      trimEnd: patch.trimEnd ?? rec.trimEnd,
      waveShift: patch.waveShift ?? rec.waveShift,
      pitchSemitones: patch.pitchSemitones ?? rec.pitchSemitones,
      waveShape: patch.waveShape ?? rec.waveShape,
      sliceCount: patch.sliceCount ?? rec.sliceCount,
      reversed: patch.reversed ?? rec.reversed,
    };

    this.rawRecords.set(id, updated);
    const meta = await this.rebuildProcessedWav(updated, decoded);
    await saveSampleRecord(updated).catch(() => {});
    this.emit();
    return meta;
  }

  async removeSample(id: string): Promise<void> {
    const oldUrl = this.blobUrls.get(id);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    this.blobUrls.delete(id);
    this.decodedBuffers.delete(id);
    this.rawRecords.delete(id);
    this.sampleMetas.delete(id);
    await deleteSampleRecord(id).catch(() => {});
    this.emit();
  }

  /**
   * Audition either the whole processed sample or a specific slice (0..sliceCount-1)
   */
  async previewSlice(id: string, sliceIndex?: number): Promise<void> {
    const decoded = this.decodedBuffers.get(id);
    const meta = this.sampleMetas.get(id);
    if (!decoded || !meta) return;

    const ctx = this.getAudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < Math.min(2, decoded.numberOfChannels); ch++) {
      channels.push(
        processWaveChannel(decoded.getChannelData(ch), {
          trimStart: meta.trimStart,
          trimEnd: meta.trimEnd,
          waveShift: meta.waveShift,
          reversed: meta.reversed,
          waveShape: meta.waveShape,
        })
      );
    }

    const len = channels[0]?.length ?? 0;
    if (len === 0) return;

    const buf = ctx.createBuffer(channels.length, len, decoded.sampleRate);
    channels.forEach((data, ch) => buf.copyToChannel(new Float32Array(data), ch));

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, meta.pitchSemitones / 12);
    src.connect(ctx.destination);

    if (sliceIndex !== undefined && meta.sliceCount > 1) {
      const sliceDur = buf.duration / meta.sliceCount;
      const offset = Math.max(0, Math.min(buf.duration - 0.01, sliceIndex * sliceDur));
      src.start(0, offset, sliceDur);
    } else {
      src.start(0);
    }
  }

  /**
   * Re-register all imported samples into Strudel's sound map (safe to call after strudelEngine.init())
   */
  async registerAllWithStrudel(): Promise<void> {
    const map: Record<string, string> = {};
    for (const meta of this.sampleMetas.values()) {
      if (meta.blobUrl) {
        map[meta.name] = meta.blobUrl;
      }
    }
    if (Object.keys(map).length === 0) return;
    try {
      const samplesFn = strudelWebaudio.samples as (src: Record<string, string>) => Promise<unknown>;
      if (typeof samplesFn === 'function') {
        await samplesFn(map);
      }
    } catch (err) {
      console.warn('[SamplerEngine] Failed to register custom samples:', err);
    }
  }

  private async hydrateRecord(record: StoredSampleRecord): Promise<ImportedSampleMeta> {
    const ctx = this.getAudioCtx();
    // Clone ArrayBuffer because decodeAudioData detaches it
    const copy = record.arrayBuffer.slice(0);
    const decoded = await ctx.decodeAudioData(copy);
    this.decodedBuffers.set(record.id, decoded);
    this.rawRecords.set(record.id, record);
    return this.rebuildProcessedWav(record, decoded);
  }

  private async rebuildProcessedWav(
    record: StoredSampleRecord,
    decoded: AudioBuffer
  ): Promise<ImportedSampleMeta> {
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < Math.min(2, decoded.numberOfChannels); ch++) {
      channels.push(
        processWaveChannel(decoded.getChannelData(ch), {
          trimStart: record.trimStart,
          trimEnd: record.trimEnd,
          waveShift: record.waveShift,
          reversed: record.reversed,
          waveShape: record.waveShape,
        })
      );
    }

    const wavBuf = encodeWavFromFloat32(channels, decoded.sampleRate);
    const blob = new Blob([wavBuf], { type: 'audio/wav' });

    const prevUrl = this.blobUrls.get(record.id);
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    const blobUrl = URL.createObjectURL(blob);
    this.blobUrls.set(record.id, blobUrl);

    const peaks = computeWaveformPeaks(decoded.getChannelData(0), 140);

    const meta: ImportedSampleMeta = {
      id: record.id,
      name: record.name,
      fileName: record.fileName,
      duration: decoded.duration,
      trimStart: record.trimStart,
      trimEnd: record.trimEnd,
      waveShift: record.waveShift,
      pitchSemitones: record.pitchSemitones,
      waveShape: record.waveShape,
      sliceCount: record.sliceCount,
      reversed: record.reversed,
      peaks,
      blobUrl,
    };

    this.sampleMetas.set(record.id, meta);

    // Immediately register in Strudel so s("name") works right away
    try {
      const samplesFn = strudelWebaudio.samples as (src: Record<string, string>) => Promise<unknown>;
      if (typeof samplesFn === 'function') {
        await samplesFn({ [meta.name]: blobUrl });
      }
    } catch {
      // Will also be registered on strudelEngine.init()
    }

    return meta;
  }
}

export const samplerEngine = new SamplerEngineService();
