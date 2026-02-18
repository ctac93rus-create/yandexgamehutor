# MONETIZATION

## Ads policy

### Rewarded placements
Rewarded видео используются в 3 точках:
1. `raid_double_reward` — удвоение награды после рейда.
2. `merge_generator_charge` — мгновенная подзарядка генераторов в merge.
3. `hut_booster` — бустер ресурсов в хуторе (золото + пыль).

Награда выдается **только** в `onRewarded` callback (через `AdsManager.showRewarded`).

### Interstitial placements
Интерстициалы показываются только при прохождении частотных гейтов:
- после N завершенных рейдов (`interstitialRaidEvery`),
- после N открытых экранов (`interstitialScreenEvery`).

Оба значения управляются через remote flags.

### disable_ads policy
Флаг `disableAds=true`:
- полностью отключает interstitial.
- rewarded **оставляем включенными**, если `allowRewardedWhenAdsDisabled=true`.

Это решение позволяет сохранить opt-in монетизацию без принудительных показов.

## IAP

### Поток покупки
`PurchasesManager` реализует:
- `getCatalog()`
- `purchase(productId)`
- auto-consume для consumable после начисления награды (`consumePurchase`).

### Pending purchases
На старте приложения вызывается `processPendingPurchases()`:
- `getPurchases()`
- доначисление для известных consumable SKU
- `consumePurchase()` для обработанных токенов.

## Remote flags
Flags читаются 1 раз на старте (`RemoteConfigManager.init` -> `sdk.getFlags({ defaultFlags })`).
Safe defaults:
- `disableAds=false`
- `allowRewardedWhenAdsDisabled=true`
- `interstitialRaidEvery=2`
- `interstitialScreenEvery=3`
- `rewardedMergeGeneratorCharges=1`
- `rewardedHutBoosterGold=30`
- `rewardedHutBoosterDust=10`

## Local mock SDK
Локально используется fallback mock (`SDKManager.createMockSdk`), поэтому:
- rewarded/interstitial вызовы выполняются без внешнего SDK,
- purchases API доступен и не ломает flow,
- getFlags возвращает default flags.
