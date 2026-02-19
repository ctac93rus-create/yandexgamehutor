import { GameApp } from './game/GameApp';

const app = new GameApp();

if (import.meta.env.DEV) {
  void import('./devtools/DevHooks').then(({ installDevHooks }) => {
    installDevHooks(app);
  });
}

void app.start();
