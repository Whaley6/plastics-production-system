/**
 * Plays a subtle, modern high-tech chime using Web Audio API
 * No external audio files or downloads needed.
 */
let audioCtx: AudioContext | null = null;

export function playNotificationChime(priority: 'normal' | 'high' | 'urgent' = 'normal') {
  try {
    if (typeof window === 'undefined') return;
    
    // Check if user has muted sound
    const isMuted = localStorage.getItem('notifications_sound_muted') === 'true';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (priority === 'urgent') {
      // 3-tone urgent alert
      playTone(audioCtx, 659.25, now, 0.12, 0.2); // E5
      playTone(audioCtx, 880.00, now + 0.14, 0.12, 0.25); // A5
      playTone(audioCtx, 1046.50, now + 0.28, 0.25, 0.3); // C6
    } else if (priority === 'high') {
      // 2-tone pleasant high chime
      playTone(audioCtx, 587.33, now, 0.1, 0.18); // D5
      playTone(audioCtx, 880.00, now + 0.12, 0.2, 0.22); // A5
    } else {
      // Soft gentle 2-tone chime
      playTone(audioCtx, 523.25, now, 0.09, 0.15); // C5
      playTone(audioCtx, 659.25, now + 0.1, 0.18, 0.18); // E5
    }
  } catch {
    // Fail silently if browser audio policies prevent autoplay before first user gesture
  }
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}
