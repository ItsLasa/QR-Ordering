'use client';

// Web Audio API synthesised pleasant 2-tone restaurant order chime
export function playOrderChime() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Pleasant two-tone chime: Note 1 (E5 = 659.25Hz), Note 2 (G5 = 783.99Hz)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope: gentle attack, smooth decay
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(659.25, now, 0.4);       // First bell tone
    playTone(783.99, now + 0.22, 0.6); // Second higher bell tone
  } catch (err) {
    console.warn('Unable to play audio chime:', err);
  }
}
