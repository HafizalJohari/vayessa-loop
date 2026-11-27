export interface StoredSampleRecord {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  arrayBuffer: ArrayBuffer;
  trimStart: number;
  trimEnd: number;
  waveShift: number;
  pitchSemitones: number;
  waveShape: number;
  sliceCount: 1 | 4 | 8 | 16;
  reversed: boolean;
}

const DB_NAME = 'strudel-studio-samples';
const STORE_NAME = 'samples';
const DB_VERSION = 1;

/**
 * Turn any uploaded filename (e.g. "My Vocal Chop (120bpm).mp3") into a valid Strudel sample name ("my_vocal_chop_120bpm")
 */
export function sanitizeSampleName(raw: string): string {
  const withoutExt = raw.replace(/\.[^.]+$/, '');
  const clean = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!clean) return 'custom_sample';
  return /^[0-9]/.test(clean) ? `s_${clean}` : clean.slice(0, 28);
}

/**
 * Downsample Float32Array channel data into N normalized peak values (0..1) for waveform canvas rendering
 */
export function computeWaveformPeaks(channelData: Float32Array, numBars = 140): number[] {
  if (channelData.length === 0 || numBars <= 0) return [];
  const blockSize = Math.max(1, Math.floor(channelData.length / numBars));
  const peaks: number[] = [];
  for (let i = 0; i < numBars; i++) {
    const start = i * blockSize;
    const end = Math.min(channelData.length, start + blockSize);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(Math.min(1, max));
  }
  return peaks;
}

/**
 * Apply trim, circular wave shift (phase/offset shift), optional reverse, and soft waveshaper warp
 * to an audio channel, returning a new Float32Array ready for WAV encoding.
 */
export function processWaveChannel(
  input: Float32Array,
  opts: {
    trimStart: number;
    trimEnd: number;
    waveShift: number;
    reversed: boolean;
    waveShape: number;
  }
): Float32Array {
  const startIdx = Math.max(0, Math.min(input.length - 1, Math.floor(opts.trimStart * input.length)));
  const endIdx = Math.max(startIdx + 1, Math.min(input.length, Math.floor(opts.trimEnd * input.length)));
  const len = endIdx - startIdx;
  const out = new Float32Array(len);

  const shiftSamples = Math.floor(((opts.waveShift % 1) + 1) % 1 * len);
  const drive = 1 + Math.max(0, Math.min(1, opts.waveShape)) * 8;

  for (let i = 0; i < len; i++) {
    const shifted = (i + shiftSamples) % len;
    const srcIdx = opts.reversed ? endIdx - 1 - shifted : startIdx + shifted;
    let sample = input[srcIdx] ?? 0;

    // Soft-clipping waveshaper when waveShape > 0
    if (opts.waveShape > 0.01) {
      sample = Math.tanh(sample * drive) / Math.tanh(drive);
    }
    out[i] = Math.max(-1, Math.min(1, sample));
  }
  return out;
}

/**
 * Encode one or two Float32Array channels into a standard 16-bit PCM WAV ArrayBuffer
 */
export function encodeWavFromFloat32(
  channels: Float32Array[],
  sampleRate: number
): ArrayBuffer {
  const numChannels = Math.max(1, Math.min(2, channels.length));
  const length = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i] ?? 0));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

function openSamplesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSampleRecord(record: StoredSampleRecord): Promise<void> {
  const db = await openSamplesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllSampleRecords(): Promise<StoredSampleRecord[]> {
  const db = await openSamplesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as StoredSampleRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSampleRecord(id: string): Promise<void> {
  const db = await openSamplesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
