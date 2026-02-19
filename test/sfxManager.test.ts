import { beforeEach, describe, expect, it, vi } from 'vitest';

import { settingsManager } from '../src/game/managers/SettingsManager';
import { SfxManager } from '../src/game/managers/SfxManager';

class FakeAudioContext {
  public state: AudioContextState = 'running';

  public currentTime = 0;

  public destination = {} as AudioDestinationNode;

  public createOscillator = vi.fn();

  public createGain = vi.fn();

  public suspend = vi.fn(async () => {
    this.state = 'suspended';
  });

  public resume = vi.fn(async () => {
    this.state = 'running';
  });
}

describe('SfxManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { AudioContext?: unknown }).AudioContext;
  });

  it('does not throw without AudioContext', () => {
    const manager = new SfxManager();
    manager.unlockFromGesture();
    expect(() => manager.playClick()).not.toThrow();
  });

  it('respects sfxEnabled and skips playback when disabled', () => {
    const createOscillator = vi.fn();
    const createGain = vi.fn();

    const mockContext = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator,
      createGain,
      resume: vi.fn(),
      suspend: vi.fn(),
    };
    (globalThis as { AudioContext?: unknown }).AudioContext = vi.fn(() => mockContext);

    const getStateSpy = vi.spyOn(settingsManager, 'getState').mockReturnValue({
      locale: 'ru',
      tutorialCompleted: false,
      sfxEnabled: false,
    });

    const manager = new SfxManager();
    manager.unlockFromGesture();
    manager.playSuccess();

    expect(getStateSpy).toHaveBeenCalled();
    expect(createOscillator).not.toHaveBeenCalled();
    expect(createGain).not.toHaveBeenCalled();
  });

  it('suspends context on pause when currently running', async () => {
    const fakeContext = new FakeAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = vi.fn(() => fakeContext);

    const manager = new SfxManager();
    manager.unlockFromGesture();
    await Promise.resolve();

    manager.onGamePause();

    expect(fakeContext.suspend).toHaveBeenCalledTimes(1);
  });


  it('pause x2, resume x2 resumes exactly once on final resume', async () => {
    const fakeContext = new FakeAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = vi.fn(() => fakeContext);
    vi.spyOn(settingsManager, 'getState').mockReturnValue({
      locale: 'ru',
      tutorialCompleted: false,
      sfxEnabled: true,
    });

    const manager = new SfxManager();
    manager.unlockFromGesture();
    await Promise.resolve();

    manager.onGamePause();
    manager.onGamePause();
    expect(fakeContext.suspend).toHaveBeenCalledTimes(1);

    manager.onGameResume();
    expect(fakeContext.resume).toHaveBeenCalledTimes(0);

    manager.onGameResume();
    expect(fakeContext.resume).toHaveBeenCalledTimes(1);
  });

  it('resumes only if context was running before pause', async () => {
    const fakeContext = new FakeAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = vi.fn(() => fakeContext);
    vi.spyOn(settingsManager, 'getState').mockReturnValue({
      locale: 'ru',
      tutorialCompleted: false,
      sfxEnabled: true,
    });

    const manager = new SfxManager();

    manager.onGameResume();
    expect(fakeContext.resume).toHaveBeenCalledTimes(0);

    manager.unlockFromGesture();
    await Promise.resolve();
    manager.onGamePause();
    manager.onGameResume();

    expect(fakeContext.resume).toHaveBeenCalledTimes(1);
  });
});
