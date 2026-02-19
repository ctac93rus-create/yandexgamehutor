import { settingsManager } from './SettingsManager';

type ToneName = 'click' | 'success' | 'error';

interface ToneConfig {
  frequency: number;
  durationSec: number;
  type: OscillatorType;
  gain: number;
}

const TONES: Record<ToneName, ToneConfig> = {
  click: { frequency: 760, durationSec: 0.06, type: 'square', gain: 0.025 },
  success: { frequency: 980, durationSec: 0.11, type: 'triangle', gain: 0.035 },
  error: { frequency: 210, durationSec: 0.09, type: 'sawtooth', gain: 0.03 },
};

export class SfxManager {
  private context: AudioContext | null = null;
  private unlocked = false;
  private unlockBound = false;
  private wasRunningBeforePause = false;
  private pauseDepth = 0;

  public constructor() {
    this.bindGestureUnlock();
  }

  public playClick(): void {
    this.play('click');
  }

  public playSuccess(): void {
    this.play('success');
  }

  public playError(): void {
    this.play('error');
  }

  public play(name: ToneName): void {
    if (!settingsManager.getState().sfxEnabled || !this.unlocked) {
      return;
    }

    const context = this.getContext();
    if (!context || context.state !== 'running') {
      return;
    }

    const tone = TONES[name];
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, now);
    gainNode.gain.setValueAtTime(tone.gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + tone.durationSec);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + tone.durationSec);
  }

  public unlockFromGesture(): void {
    this.unlocked = true;
    const context = this.getContext();
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      void context.resume();
    }
  }

  public onGamePause(): void {
    this.pauseDepth += 1;
    if (this.pauseDepth > 1) {
      return;
    }

    const context = this.context;
    if (!context) {
      this.wasRunningBeforePause = false;
      return;
    }

    this.wasRunningBeforePause = context.state === 'running';
    if (this.wasRunningBeforePause) {
      void context.suspend();
    }
  }

  public onGameResume(): void {
    if (this.pauseDepth <= 0) {
      this.wasRunningBeforePause = false;
      return;
    }

    this.pauseDepth -= 1;
    if (this.pauseDepth > 0) {
      return;
    }

    const context = this.context;
    if (!context) {
      this.wasRunningBeforePause = false;
      return;
    }

    const shouldResume =
      this.wasRunningBeforePause &&
      this.unlocked &&
      settingsManager.getState().sfxEnabled &&
      context.state === 'suspended';
    this.wasRunningBeforePause = false;
    if (shouldResume) {
      void context.resume();
    }
  }

  private bindGestureUnlock(): void {
    const target = globalThis as typeof globalThis & {
      addEventListener?: (type: string, listener: () => void, options?: AddEventListenerOptions) => void;
    };

    if (!target.addEventListener || this.unlockBound) {
      return;
    }
    this.unlockBound = true;

    const unlock = () => {
      this.unlockFromGesture();
    };
    target.addEventListener('pointerdown', unlock, { once: true, passive: true });
    target.addEventListener('keydown', unlock, { once: true, passive: true });
    target.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const AudioContextCtor = this.resolveAudioContextCtor();
    if (!AudioContextCtor) {
      return null;
    }

    this.context = new AudioContextCtor();
    return this.context;
  }

  private resolveAudioContextCtor(): (new () => AudioContext) | null {
    const scope = globalThis as typeof globalThis & {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    };
    return scope.AudioContext ?? scope.webkitAudioContext ?? null;
  }
}

export const sfxManager = new SfxManager();
