import type { LocalAudioTrack } from 'livekit-client';

export interface MicLevelMeter {
    /** RMS level normalised to 0–1, computed from time-domain samples. */
    getLevel(): number;
    /** Detach the analyser and close the dedicated AudioContext. Idempotent. */
    dispose(): void;
}

/**
 * Attach an AnalyserNode to a LiveKit LocalAudioTrack so callers can poll
 * RMS energy for a TX level meter.
 *
 * Uses a *dedicated* AudioContext rather than the shared playback one so
 * the analyser can never affect what the user hears — it's a measurement
 * tap only. The analyser is intentionally NOT connected to the destination.
 */
export function attachMicLevelMeter(track: LocalAudioTrack): MicLevelMeter | null {
    if (typeof window === 'undefined') return null;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const mediaStreamTrack = track.mediaStreamTrack;
    if (!mediaStreamTrack) return null;

    let context: AudioContext;
    try {
        context = new AudioCtx();
    } catch {
        return null;
    }

    let source: MediaStreamAudioSourceNode;
    let analyser: AnalyserNode;
    try {
        const stream = new MediaStream([mediaStreamTrack]);
        source = context.createMediaStreamSource(stream);
        analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        // Deliberately NOT connecting analyser → destination: that would echo
        // the user's mic back to themselves.
    } catch (err) {
        console.warn('[micLevel] failed to attach analyser', err);
        try { context.close(); } catch { /* noop */ }
        return null;
    }

    const buffer = new Uint8Array(analyser.fftSize);
    let disposed = false;

    return {
        getLevel(): number {
            if (disposed) return 0;
            try {
                analyser.getByteTimeDomainData(buffer);
                // RMS over centred (-1, +1) samples. Bytes are 0..255 around 128.
                let sumSquares = 0;
                for (let i = 0; i < buffer.length; i++) {
                    const centred = (buffer[i] - 128) / 128;
                    sumSquares += centred * centred;
                }
                const rms = Math.sqrt(sumSquares / buffer.length);
                // Voice RMS rarely exceeds ~0.3; scale for visual range so
                // normal speech reaches the upper segments of the meter.
                return Math.min(1, rms * 3);
            } catch {
                return 0;
            }
        },
        dispose(): void {
            if (disposed) return;
            disposed = true;
            try { source.disconnect(); } catch { /* noop */ }
            try { analyser.disconnect(); } catch { /* noop */ }
            context.close().catch(() => { /* noop */ });
        },
    };
}
