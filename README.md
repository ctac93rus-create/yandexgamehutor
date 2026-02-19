# yandexgamehutor

Каркас HTML5 SPA под Яндекс Игры: Vite + Phaser + TypeScript strict + SDKManager.

## Команды

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run build:report
npm run zip
npm run release:prepare
```

## Локальная разработка
- `npm run dev` запускает Vite.
- Запрос `/sdk.js` в dev-режиме обслуживается middleware из `vite.config.ts`.
- Мок определяет `window.YaGames.init()` и API для рекламы, player, payments, flags и pause/resume событий.

## Milestone 5 (релиз-кандидат)
- Онбординг: tutorial в `MergeScene` (5 шагов с подсветками).
- Локализация RU/EN: `src/game/data/localization/ru.json` + `en.json`, переключение в `SettingsScene`.
- UX: крупные кнопки, мягкие панели, no-scroll, mobile safe-area (`viewport-fit=cover` + env insets).
- Перф: меньше лишних аллокаций в рейде/merge (кэш HUD, lookup-индекс спрайтов, throttled spell FX).

## Сборка и релиз в Яндекс Игры
1. Прогнать quality gates:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
2. Снять отчёт по размеру бандла:
   - `npm run build:report`
3. Подготовить upload-ready архив:
   - `npm run zip`
   - результат: `artifacts/dist.zip`
   - в корне архива должен быть `index.html` (без вложенной папки `dist/`)
4. Либо сделать всё за один проход:
   - `npm run release:prepare`
5. Перед отправкой на модерацию пройти `docs/RELEASE_CHECKLIST.md` и `docs/MODERATION_CHECKLIST.md`.

## Релизный smoke-check (ручной)
- Merge: 5 минут core loop без зависаний/просадок.
- Raid: 3 последовательных рейда.
- Rewarded: merge charge, hut booster, raid x2.
- IAP (mock): покупка + consume + отсутствие повторного grant.
- SDK lifecycle: `game_api_pause` / `game_api_resume`.
- Protocol A–E: StoryChapters, DailyQuests, QuestEngine, Hut upgrades, Merge/Raid events.

## Yandex SDK правила
- `LoadingAPI.ready()` вызывается один раз в `MenuScene` через `sdkManager.loadingReadyOnce()`.
- Реклама и покупки выполняются только через `SDKManager` + профильные менеджеры.
