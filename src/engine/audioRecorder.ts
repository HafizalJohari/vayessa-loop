import { strudelEngine } from '@/engine/strudelEngine';
import { encodeWavFromFloat32 } from '@/engine/sampleStorage';
import { useStudioStore } from '@/store/useStudioStore';

export interface RecordedWavResult {
  wavBlob: Blob;
  wavBuffer: ArrayBuffer;
  durationSec: number;
  sampleRate: number;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private connectedSource: AudioNode | null = null;
  private chunks: Blob[] = [];
  private timerId: number | null = null;
  private startedAt = 0;
  private stopResolver: ((res: RecordedWavResult) => void) | null = null;
  private stopRejecter: ((err: Error) => void) | null = null;

  async startRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return;
    }

    await strudelEngine.init();
    const ctx = strudelEngine.getAudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const sourceNode = strudelEngine.getDestinationGainNode();
    if (!sourceNode) {
      throw new Error('Audio output node is not ready yet. Press PLAY first.');
    }

    const streamDest = ctx.createMediaStreamDestination();
    sourceNode.connect(streamDest);
    this.streamDest = streamDest;
    this.connectedSource = sourceNode;
    this.chunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const recorder = new MediaRecorder(
      streamDest.stream,
      mimeType ? { mimeType, audioBitsPerSecond: 256000 } : undefined
    );

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        this.chunks.push(ev.data);
      }
    };

    recorder.onstop = async () => {
      try {
        this.cleanupNodes();
        const rawBlob = new Blob(this.chunks, {
          type: recorder.mimeType || 'audio/webm',
        });
        const rawBuf = await rawBlob.arrayBuffer();
        const decoded = await ctx.decodeAudioData(rawBuf.slice(0));

        const channels: Float32Array[] = [];
        for (let ch = 0; ch < Math.min(2, decoded.numberOfChannels); ch++) {
          channels.push(decoded.getChannelData(ch));
        }

        const wavBuffer = encodeWavFromFloat32(channels, decoded.sampleRate);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        const result: RecordedWavResult = {
          wavBlob,
          wavBuffer,
          durationSec: decoded.duration,
          sampleRate: decoded.sampleRate,
        };
        this.stopResolver?.(result);
      } catch (err) {
        this.stopRejecter?.(err instanceof Error ? err : new Error(String(err)));
      } finally {
        this.stopResolver = null;
        this.stopRejecter = null;
        this.mediaRecorder = null;
      }
    };

    this.mediaRecorder = recorder;
    this.startedAt = performance.now();
    recorder.start(250);

    useStudioStore.getState().setRecordingAudio(true, 0);
    this.timerId = window.setInterval(() => {
      const elapsed = Math.floor((performance.now() - this.startedAt) / 1000);
      useStudioStore.getState().setRecordingAudio(true, elapsed);
    }, 250);
  }

  async stopRecording(): Promise<RecordedWavResult> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      throw new Error('No active recording');
    }

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    useStudioStore.getState().setRecordingAudio(false, 0);

    return new Promise<RecordedWavResult>((resolve, reject) => {
      this.stopResolver = resolve;
      this.stopRejecter = reject;
      this.mediaRecorder?.stop();
    });
  }

  downloadWav(wavBlob: Blob, fileName?: string): string {
    const safeName =
      fileName && fileName.trim()
        ? fileName.trim().endsWith('.wav')
          ? fileName.trim()
          : `${fileName.trim()}.wav`
        : `vayessa-loop-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.wav`;

    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    useStudioStore.getState().setStatusMessage(`Exported WAV: ${safeName}`);
    return safeName;
  }

  /**
   * Timed recording helper for AI MCP (`record_audio` tool):
   * Starts playback if needed, records for `durationSeconds`, returns base64 WAV + metadata.
   */
  async recordTimedWavBase64(
    durationSeconds: number,
    autoPlay = true,
    autoStopAfter = false
  ): Promise<{
    base64Wav: string;
    durationSec: number;
    sampleRate: number;
    byteLength: number;
  }> {
    const clampedSec = Math.max(1, Math.min(120, durationSeconds));
    const store = useStudioStore.getState();

    if (autoPlay && !store.isPlaying) {
      await strudelEngine.evaluate(store.code);
    }

    await this.startRecording();
    await new Promise((r) => setTimeout(r, clampedSec * 1000));
    const res = await this.stopRecording();

    if (autoStopAfter) {
      strudelEngine.stop();
    }

    return {
      base64Wav: arrayBufferToBase64(res.wavBuffer),
      durationSec: Number(res.durationSec.toFixed(2)),
      sampleRate: res.sampleRate,
      byteLength: res.wavBuffer.byteLength,
    };
  }

  private cleanupNodes() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    try {
      if (this.connectedSource && this.streamDest) {
        this.connectedSource.disconnect(this.streamDest);
      }
    } catch {
      // ignore disconnect errors
    }
    this.connectedSource = null;
    this.streamDest = null;
  }
}

export const audioRecorder = new AudioRecorderService();
