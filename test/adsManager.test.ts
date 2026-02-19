import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdsManager } from '../src/game/managers/AdsManager';
import { entitlementsManager } from '../src/game/managers/EntitlementsManager';
import { remoteConfigManager } from '../src/game/managers/RemoteConfigManager';
import { sdkManager } from '../src/game/managers/SDKManager';

describe('AdsManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    vi.restoreAllMocks();
    vi.spyOn(entitlementsManager, 'getState').mockReturnValue({ disableAds: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows interstitials only by frequency gate and interval', async () => {
    const manager = new AdsManager();
    vi.spyOn(remoteConfigManager, 'getFlags').mockReturnValue({
      ...remoteConfigManager.defaults,
      disableAds: false,
      interstitialRaidEvery: 2,
      interstitialScreenEvery: 2,
      adsInterstitialMinIntervalSec: 5,
    });
    const interstitialSpy = vi.spyOn(sdkManager, 'showFullscreenAdv').mockResolvedValue();

    await expect(manager.onRaidFinished()).resolves.toBe(false);
    await expect(manager.onRaidFinished()).resolves.toBe(true);

    await expect(manager.onRaidFinished()).resolves.toBe(false);
    vi.advanceTimersByTime(6000);
    await expect(manager.onRaidFinished()).resolves.toBe(true);

    vi.spyOn(remoteConfigManager, 'getFlags').mockReturnValue({
      ...remoteConfigManager.defaults,
      disableAds: true,
      interstitialRaidEvery: 2,
      interstitialScreenEvery: 2,
      adsInterstitialMinIntervalSec: 5,
    });

    await expect(manager.onRaidFinished()).resolves.toBe(false);
    expect(interstitialSpy).toHaveBeenCalledTimes(2);
  });

  it('disables interstitials when disable_ads entitlement is owned', async () => {
    const manager = new AdsManager();
    vi.spyOn(entitlementsManager, 'getState').mockReturnValue({ disableAds: true });
    vi.spyOn(remoteConfigManager, 'getFlags').mockReturnValue({
      ...remoteConfigManager.defaults,
      disableAds: false,
      interstitialRaidEvery: 1,
      interstitialScreenEvery: 1,
    });
    const interstitialSpy = vi.spyOn(sdkManager, 'showFullscreenAdv').mockResolvedValue();

    await expect(manager.onRaidFinished()).resolves.toBe(false);
    expect(interstitialSpy).not.toHaveBeenCalled();
  });

  it('grants rewarded only from onRewarded callback and respects cooldown', async () => {
    const manager = new AdsManager();
    vi.spyOn(remoteConfigManager, 'getFlags').mockReturnValue({
      ...remoteConfigManager.defaults,
      disableAds: false,
      allowRewardedWhenAdsDisabled: true,
      rewardedCooldownSec: 30,
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
    await expect(manager.showRewarded('raid_double_reward', rewardFn)).resolves.toBe(false);
    vi.advanceTimersByTime(31000);
    await expect(manager.showRewarded('raid_double_reward', rewardFn)).resolves.toBe(true);
    expect(rewardFn).toHaveBeenCalledTimes(2);
  });
});
