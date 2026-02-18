# TDD Template

## Оглавление
1. Архитектура
2. Сцены
3. Менеджеры
4. Данные (JSON/конфиги)
5. Интеграция с Yandex SDK
6. Решения и допущения Milestone 0
7. План расширения

## Решения и допущения Milestone 0
- Dev mock SDK реализован через Vite middleware и обслуживает только `GET /sdk.js` в `vite serve`.
- `LoadingAPI.ready()` вызывается только через `SDKManager.loadingReadyOnce()` с внутренним idempotent guard.
- События `game_api_pause`/`game_api_resume` подписываются централизованно в `GameApp` и управляют игровым loop + аудио.
- Любые обращения к SDK разрешены только через `SDKManager`, чтобы избежать race condition до `init()`.
