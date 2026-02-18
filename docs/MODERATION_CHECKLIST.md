# MODERATION CHECKLIST

## A. Rewarded compliance
- [x] Rewarded точки интегрированы (raid reward x2, merge charge, hut booster).
- [x] Награда выдается только в `onRewarded`.
- [x] Нет выдачи награды в `onOpen/onClose/onError`.

## B. Interstitial compliance
- [x] Interstitial показывается только по частотному гейту.
- [x] Частоты (`N`) берутся из remote flags.
- [x] При `disableAds=true` interstitial полностью отключен.

## C. IAP compliance
- [x] Реализованы `getCatalog` и `purchase`.
- [x] Для consumable: начисление -> `consumePurchase`.
- [x] Обработаны pending purchases на старте (`getPurchases` + дозачисление + consume).

## D. Remote config & fail-safe
- [x] Flags загружаются один раз на старте.
- [x] Есть safe defaults на случай недоступности remote config.
- [x] Локальный mock SDK поддерживает ads/purchases/flags flow.

## E. QA protocol
- [x] Unit: Ads policy gating.
- [x] Unit: pending purchase flow.
- [x] Lint / Typecheck / Test / Build выполнены.
