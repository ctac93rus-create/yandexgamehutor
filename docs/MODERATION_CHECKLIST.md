# MODERATION CHECKLIST

## A. SDK lifecycle and readiness
- [x] `LoadingAPI.ready()` вызывается ровно один раз через `sdkManager.loadingReadyOnce()` в `MenuScene`.
- [x] Пауза/возобновление (`game_api_pause` / `game_api_resume`) подключены в `GameApp.bindPauseResume()`.
- [x] В паузе останавливается game loop и аудио; при resume всё корректно восстанавливается.
- [x] `game_api_pause`/`game_api_resume` и `visibilitychange` глушат и восстанавливают как Phaser Sound (`AudioManager`), так и WebAudio `AudioContext` в `SfxManager`.

## B. Rewarded & interstitial compliance
- [x] Rewarded точки интегрированы (raid reward x2, merge charge, hut booster).
- [x] Награда выдаётся только в `onRewarded`.
- [x] Interstitial показывается только по частотному гейту и remote flags.
- [x] При `disableAds=true` interstitial отключается полностью.

## C. Purchases / pending / consume
- [x] Реализованы `getCatalog`, `purchase`, `getPurchases`, `consumePurchase`.
- [x] Для consumable поток: начисление -> `consumePurchase`.
- [x] Pending покупки обрабатываются на старте `processPendingPurchases()`.
- [x] После успешного начисления pending-покупка consume-ится (без повторной выдачи).

## D. Remote config & fail-safe
- [x] Flags загружаются один раз на старте.
- [x] Есть safe defaults на случай недоступности remote config.
- [x] Локальный mock SDK покрывает ads / purchases / flags / pause-resume flow.

## E. QA protocol
- [x] Unit: Ads policy gating.
- [x] Unit: pending purchase flow.
- [x] Lint / Typecheck / Test / Build выполнены.
- [x] Smoke: merge 5 мин, 3 рейда, rewarded, iap (mock), pause/resume.
