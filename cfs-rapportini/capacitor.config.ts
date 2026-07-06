class AudioSynth {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;

  private getContext() {
    if (!this.ctx) {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
        }
      }
    }
    return this.ctx;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, startTimeOffset = 0) {
    if (!this.isEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset);
        
        gain.gain.setValueAtTime(vol, ctx.currentTime + startTimeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + startTimeOffset);
        osc.stop(ctx.currentTime + startTimeOffset + duration);
    } catch(e) {
        // Ignore Audio API errors
    }
  }

  public playSuccess() {
    this.playTone(523.25, 'sine', 0.1, 0.05, 0); // C5
    this.playTone(659.25, 'sine', 0.1, 0.05, 0.1); // E5
    this.playTone(783.99, 'sine', 0.3, 0.05, 0.2); // G5
  }

  public playDelete() {
    this.playTone(300, 'sawtooth', 0.1, 0.05, 0);
    this.playTone(200, 'sawtooth', 0.2, 0.05, 0.1);
  }

  public playPop() {
    this.playTone(800, 'sine', 0.05, 0.02, 0);
  }

  public playSlide() {
    this.playTone(400, 'triangle', 0.05, 0.01, 0);
    this.playTone(600, 'triangle', 0.05, 0.01, 0.03);
  }
}

export const sounds = new AudioSynth();
