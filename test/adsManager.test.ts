import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdsManager } from '../src/game/managers/AdsManager';
import { remoteConfigManager } from '../src/game/managers/RemoteConfigManager';
import { sdkManager } from '../src/game/managers/SDKManager';

describe('AdsManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows interstitial only on configured frequency and only when ads are enabled', async () => {
    const manager = new AdsManager();
    vi.spyOn(remoteConfigManager, 'getFlags').mockReturnValue({
      ...remoteConfigManager.defaults,
      disableAds: false,
      interstitialRaidEvery: 2,
      interstitialScreenEvery: 2,
    });
    const interstitialSpy = vi.spyOn(sdkManager, 'showFullscreenAdv').mockResolvedValue();

    await expect(manager.onRaidFinished()).resolves.toBe(false);
    await expect(manager.onRaidFinished()).resolves.toBe(true);

    vi.spyOn(remoteConfigManager, 'getFlags').mockReturnValue({
      ...remoteConfigManager.defaults,
      disableAds: true,
      interstitialRaidEvery: 2,
      interstitialScreenEvery: 2,
    });

    await expect(manager.onRaidFinished()).resolves.toBe(false);
    expect(interstitialSpy).toHaveBeenCalledTimes(1);
  });

  it('grants rewarded only from onRewarded callback', async () => {
    const manager = new AdsManager();
    vi.spyOn(remoteConfigManager, 'getFlags').mockReturnValue({
      ...remoteConfigManager.defaults,
      disableAds: false,
      allowRewardedWhenAdsDisabled: true,
    });

    const rewardFn = vi.fn();
    vi.spyOn(sdkManager, 'showRewardedVideo').mockImplementation(async (callbacks) => {
      callbacks?.onClose?.(true);
    });

    await expect(manager.showRewarded('raid_double_reward', rewardFn)).resolves.toBe(false);
    expect(rewardFn).not.toHaveBeenCalled();

    vi.spyOn(sdkManager, 'showRewardedVideo').mockImplementation(async (callbacks) => {
      callbacks?.onRewarded?.();
      callbacks?.onClose?.(true);
    });

    await expect(manager.showRewarded('raid_double_reward', rewardFn)).resolves.toBe(true);
    expect(rewardFn).toHaveBeenCalledTimes(1);
  });
});
