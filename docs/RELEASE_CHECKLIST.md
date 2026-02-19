# Release checklist (Yandex Games)

## 1) Локальный pre-release прогон
1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`
6. `npm run build:report`
7. `npm run zip`

## 2) Ручная проверка в браузере
- Меню открывается, `LoadingAPI.ready()` вызывается один раз при доступности меню.
- Переходы: `menu -> merge -> raid -> merge -> hut -> menu` без ошибок и зависаний.
- Награды: rewarded в Merge/Hut/Raid выдаются корректно.
- Покупки: проверить `disable_ads`, затем consumable покупку золота.
- После покупки `disable_ads` interstitial/rewarded поведение соответствует entitlement.
- Проверить паузу/резюм (`game_api_pause`, `game_api_resume`, скрытие/возврат вкладки) и аудио.
- Guest play: игра стартует и сохраняет прогресс без авторизованного пользователя.

## 3) Модерационные обязательные пункты
- SDK-интеграция только через `ysdk`-менеджеры (ads/purchases/player/loading).
- `LoadingAPI.ready()` строго один раз.
- Pause/resume не ломает loop и звук.
- Реклама/покупки проходят через Яндекс API (без кастомных внешних провайдеров).

## 4) SKU каталог
- `disable_ads` — **non-consumable**.
- `gold_500` — **consumable**.
- `gold_1500` — **consumable**.
- `starter_pack` — **consumable**.

## 5) Build warnings policy
- Warning `"<script src=\"/sdk.js\"> ... can't be bundled without type=\"module\""` — **non-blocking**.
- Причина: `sdk.js` подключается как обычный script по требованиям Yandex SDK, не как ESM-модуль.
- Этот warning допустим, пока runtime интеграция SDK инициализируется корректно.

## 6) Подготовка upload-архива
- Команда: `npm run zip`.
- Результат: `artifacts/dist.zip`.
- В корне архива должен лежать `index.html` (не `dist/index.html`).
- В Яндекс Игры загружается именно `artifacts/dist.zip`.
