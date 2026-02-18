import { beforeEach, describe, expect, it, vi } from 'vitest';

import { settingsManager } from '../src/game/managers/SettingsManager';
import { SfxManager } from '../src/game/managers/SfxManager';

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
});
