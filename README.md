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
npm run zip
```

## Локальная разработка
- `npm run dev` запускает Vite.
- Запрос `/sdk.js` в dev-режиме обслуживается middleware из `vite.config.ts`.
- Мок определяет `window.YaGames.init()` и минимальные API для рекламы, player, payments, flags и событий.

## Продакшен
- В production build мок `/sdk.js` не публикуется как статический файл.
- Для Яндекс Игр загрузите архив содержимого `dist/` (или `npm run zip`, если нужен zip-артефакт).

## Yandex SDK правила
- `LoadingAPI.ready()` вызывается один раз в `MenuScene` через `sdkManager.loadingReadyOnce()`.
- Реклама и покупки выполняются только через `SDKManager`.
