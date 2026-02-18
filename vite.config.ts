import { defineConfig, type Plugin } from 'vite';

const sdkMockSource = `
(() => {
  const listeners = new Map();
  const playerData = {};
  const playerStats = {};
  const purchases = [];

  const emit = (event, payload) => {
    const set = listeners.get(event);
    if (!set) return;
    [...set].forEach((cb) => cb(payload));
  };

  const player = {
    getData: async () => ({ ...playerData }),
    setData: async (data) => { Object.assign(playerData, data); },
    getStats: async () => ({ ...playerStats }),
    setStats: async (data) => { Object.assign(playerStats, data); },
    incrementStats: async (data) => {
      Object.entries(data).forEach(([key, value]) => {
        const current = Number(playerStats[key] ?? 0);
        playerStats[key] = current + Number(value);
      });
      return { ...playerStats };
    },
  };

  const payments = {
    getCatalog: async () => ({ products: [] }),
    getPurchases: async () => [...purchases],
    purchase: async ({ id }) => {
      const purchase = { id: String(id), purchaseToken: String(Date.now()) };
      purchases.push(purchase);
      return purchase;
    },
    consumePurchase: async (token) => {
      const index = purchases.findIndex((item) => item.purchaseToken === token);
      if (index >= 0) purchases.splice(index, 1);
    },
  };

  const sdk = {
    features: {
      LoadingAPI: {
        ready: () => {
          console.log('[sdk-mock] LoadingAPI.ready()');
        },
      },
    },
    adv: {
      showFullscreenAdv: ({ callbacks } = {}) => {
        callbacks?.onOpen?.();
        setTimeout(() => callbacks?.onClose?.(true), 300);
      },
      showRewardedVideo: ({ callbacks } = {}) => {
        callbacks?.onOpen?.();
        setTimeout(() => {
          callbacks?.onRewarded?.();
          callbacks?.onClose?.();
        }, 500);
      },
    },
    getFlags: async ({ defaultFlags } = {}) => ({ ...(defaultFlags ?? {}) }),
    getPlayer: async () => player,
    getPayments: async () => payments,
    on: (event, cb) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(cb);
    },
    off: (event, cb) => {
      listeners.get(event)?.delete(cb);
    },
    __emit: emit,
  };

  window.YaGames = {
    init: async () => sdk,
  };
})();
`;

function yandexSdkMockPlugin(): Plugin {
  return {
    name: 'yandex-sdk-mock',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/sdk.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.end(sdkMockSource);
      });
    },
  };
}

export default defineConfig({
  plugins: [yandexSdkMockPlugin()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
