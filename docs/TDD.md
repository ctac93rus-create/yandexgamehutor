# TDD Template + Milestone 1 Notes

## Оглавление
1. Архитектура
2. Сцены
3. Менеджеры
4. Данные (JSON/конфиги)
5. Интеграция с Yandex SDK
6. Merge архитектура (Milestone 1)
7. Сохранения
8. Решения и допущения

## Решения и допущения Milestone 0
- Dev mock SDK реализован через Vite middleware и обслуживает только `GET /sdk.js` в `vite serve`.
- `LoadingAPI.ready()` вызывается только через `SDKManager.loadingReadyOnce()` с внутренним idempotent guard.
- События `game_api_pause`/`game_api_resume` подписываются централизованно в `GameApp` и управляют игровым loop + аудио.
- Любые обращения к SDK разрешены только через `SDKManager`, чтобы избежать race condition до `init()`.

## Merge архитектура (Milestone 1)
- Фиксированная доска: `6x7`.
- `MergeGrid` хранит занятость клеток и умеет искать первую свободную клетку.
- `ItemEntity` разделяет runtime-сущность и описание предмета из JSON.
- `MergeResolver` принимает пары itemId и определяет разрешён ли merge и какой следующий item.
- `Generators` держит cooldown/charges per-runtime-item.
- `OverflowPolicy` гарантирует no-softlock (компенсация пылью при полном поле).
- `Inventory` изолирует логику размещения в свободную клетку.

## Raid architecture (Milestone 2)
- `RaidScene` отвечает за спаун, update-loop, контроль конца рейда и переход в merge.
- `Waves` парсит/валидирует `waves.json` и отдаёт курсор таймлайна без лишних аллокаций.
- `Enemy` хранит HP, движение и эффекты (freeze).
- `Defender` реализует автоатаку тотемов по ближайшей цели в диапазоне.
- `Spells` держит кулдаун и массовый эффект (Freeze).
- `RaidController` — state machine завершения рейда.
- `RewardCalculator` считает награды по `economy.json`.
- `RaidHUD` и `RewardModal` — UI-слой рейда.

## Сохранения
- `SaveManager` сохраняет состояние доски, валюты и генераторов в localStorage.
- Если доступен SDK player, состояние дублируется в `player.setData(...)`.
- Автосейв вызывается после merge, спавна, overflow, восстановления зарядов и выдачи рейд-наград.

## Решения и допущения
- Валидация `items.json`, `merge_chains.json`, `economy.json`, `waves.json` через `zod` в рантайме.
- Политика SDK-only сохранена: доступ к SDK только через `SDKManager`.
- При rewarded в рейде удвоение выполняется через `showRewardedVideo` callback `onRewarded`.

## Release hardening (code-splitting)
- Initial scene set сокращён до `BootScene`, `PreloadScene`, `MenuScene`.
- Тяжёлые сцены (`Merge`, `Hut`, `Raid`, `Social`, `Settings`, `Progress`) подключаются через dynamic `import()` из `lazySceneLoader`.
- Перед `scene.start(...)` используется guard, чтобы не вызывать `scene.add(...)` повторно, если сцена уже зарегистрирована.
- `MenuScene` показывает лёгкий `Loading…` overlay во время lazy-загрузки, после чего запускает целевую сцену.
- Подход уменьшает стартовый chunk и оставляет runtime-поведение совместимым с `LoadingAPI.ready()` (по-прежнему вызывается в `MenuScene` один раз).
