# SMOKE_REPORT_2026-02-19

## I) Environment
- OS: Linux (container)
- Node.js: v22.21.1
- npm: 11.4.2
- Commit: `7ffc582b23e7b22937e2eceb8f5a623976435be3`
- `/mnt/data`: missing in current environment (`/mnt/data` does not exist)

## II) Quality gates
| Gate | Result | Notes |
|---|---|---|
| `npm ci` | PASS | Dependencies installed from lockfile |
| `npm run lint` | PASS | No lint violations |
| `npm run typecheck` | PASS | No TS errors |
| `npm run test` | PASS | 16 files / 51 tests passed |
| `npm run build` | PASS | Production bundle built successfully |

## III) Browser smoke results
Headless smoke runner `scripts/smoke_e2e.ts` executed with `npm run smoke:e2e`.

**Overall:** FAIL (environment limitation)

Root failure from `artifacts/smoke/smoke.log`:
- `Chromium binary not found (/usr/bin/chromium, /usr/bin/chromium-browser, /usr/bin/google-chrome)`

| Step | Result | Evidence |
|---|---|---|
| S1 Ready once | UNKNOWN | Could not run browser session due missing Chromium |
| S2 Pause/Resume audio | UNKNOWN | Could not run browser session due missing Chromium |
| S3 Rewarded success/cancel | UNKNOWN | Could not run browser session due missing Chromium |
| S4 Interstitial | UNKNOWN | Could not run browser session due missing Chromium |
| S5 Purchases | UNKNOWN | Could not run browser session due missing Chromium |
| S6 disable_ads gating | UNKNOWN | Could not run browser session due missing Chromium |
| S7 Persistence | UNKNOWN | Could not run browser session due missing Chromium |

## IV) Yandex moderation mini-checklist (facts from code)
| Check | Status | Evidence |
|---|---|---|
| `/sdk.js` is loaded before bundle | PASS | `index.html` includes `/sdk.js` before module script |
| `YaGames.init` guarded | PASS | SDK manager uses `YaGames` when present, otherwise mock fallback |
| `LoadingAPI.ready` once | PASS (code path) / UNKNOWN (runtime proof) | `loadingReadyOnce` guards with `loadingReadySent`; runtime counter exists but smoke blocked |
| Pause/Resume mutes Phaser + AudioContext observable | PASS (code path) / UNKNOWN (runtime proof) | `GameApp` pause/resume handlers pause loop and audio; dev hooks expose `getAudioState` |
| Ads only via `ysdk.adv.*` | PASS | Ads paths call `sdkManager.showFullscreenAdv/showRewardedVideo`, which delegate to `ysdk.adv.*` |
| Reward only via `onRewarded` | PASS | Rewarded flow grants only inside `onRewarded` callback in `AdsManager.showRewarded` |
| Interstitial anti-spam policy | PASS | Cooldown + frequency gates in `AdsManager.showInterstitialIfNeeded` |
| Purchases consumable/non-consumable rules | PASS | Consumables consume token after grant; non-consumable `disable_ads` registered without consume and persisted via entitlements manager |
| Guest play ok, auth by button | PASS | SDK fallback supports no-auth flow; auth only via explicit `openAuthDialog` call in manager |
| Mobile viewport no-scroll | PASS (CSS) / UNKNOWN (runtime proof) | `html, body` enforce `overflow:hidden`, `overscroll-behavior:none`, `touch-action:none` |

## V) Artifacts
- Smoke log: `artifacts/smoke/smoke.log`
- Manual screenshot (browser tool fallback): `browser:/tmp/codex_browser_invocations/e9b6232836b28392/artifacts/artifacts/smoke/manual-after-load.png`
- Automated smoke screenshots from script: not produced (Chromium unavailable)

## Notes on requested `puppeteer-core`
- Attempted: `npm i -D puppeteer-core`
- Result: `403 Forbidden` from npm registry policy in current environment.
- Workaround implemented: dependency-free CDP smoke runner using system Chromium (would work once Chromium binary is available).
