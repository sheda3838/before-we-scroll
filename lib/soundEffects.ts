// Web Audio API lightweight sound synthesizer
// Requires zero assets, works offline, and handles browser autoplay gracefully.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Pre-warms or resumes the AudioContext on an explicit user gesture (e.g. clicking "Start Mission").
 */
export function unlockAudio() {
  getAudioContext();
}

/**
 * Short, gentle near-end chime (2 gentle notes).
 * Non-aggressive, plays once, not looped.
 */
export function playNearEndWarningSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // First note: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.28);

    // Second note: 880.00 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.16);

    gain2.gain.setValueAtTime(0, now + 0.16);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.19);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.16);
    osc2.stop(now + 0.52);
  } catch {
    // Autoplay restrictions or unavailable audio handled safely
  }
}

/**
 * Noticeable celebratory final alarm chime (4-note ascending fanfare).
 * Non-looping, polite yet distinct.
 */
export function playMissionCompleteSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.2 }, // C5
      { freq: 659.25, time: 0.14, dur: 0.2 }, // E5
      { freq: 783.99, time: 0.28, dur: 0.22 }, // G5
      { freq: 1046.5, time: 0.44, dur: 0.55 }, // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.2, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  } catch {
    // Autoplay restrictions or unavailable audio handled safely
  }
}
