import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

interface SmokeStep {
  id: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

interface CdpMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message?: string };
}

class CdpClient {
  private ws: WebSocket;
  private nextId = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private eventListeners = new Map<string, Array<(params: Record<string, unknown>) => void>>();

  public constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (typeof message.id === 'number') {
        const request = this.pending.get(message.id);
        if (!request) {
          return;
        }
        this.pending.delete(message.id);
        if (message.error) {
          request.reject(new Error(message.error.message ?? 'CDP error'));
        } else {
          request.resolve(message.result ?? {});
        }
        return;
      }

      if (!message.method) {
        return;
      }
      const listeners = this.eventListeners.get(message.method) ?? [];
      listeners.forEach((listener) => listener((message.params ?? {}) as Record<string, unknown>));
    });
  }

  public async waitOpen(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', () => reject(new Error('WebSocket open failed')), { once: true });
    });
  }

  public send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
    });
  }

  public on(method: string, listener: (params: Record<string, unknown>) => void): void {
    const existing = this.eventListeners.get(method) ?? [];
    existing.push(listener);
    this.eventListeners.set(method, existing);
  }

  public close(): void {
    this.ws.close();
  }
}

const smokeLogPath = 'artifacts/smoke/smoke.log';
const artifactsDir = 'artifacts/smoke';


async function resolveChromiumPath(): Promise<string | null> {
  const candidates = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  for (const candidate of candidates) {
    try {
      const stat = await import('node:fs/promises').then((fs) => fs.stat(candidate));
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // continue
    }
  }
  return null;
}


const steps: SmokeStep[] = [];
const warnings: string[] = [];
const errors: string[] = [];

function addStep(id: string, status: 'PASS' | 'FAIL', details: string): void {
  steps.push({ id, status, details });
  console.log(`[${status}] ${id}: ${details}`);
}

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await delay(300);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function spawnDevServer(port: number): ChildProcess {
  return spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function spawnChromium(port: number, chromiumPath: string): ChildProcess {
  return spawn(
    chromiumPath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${port}`,
      '--user-data-dir=/tmp/ygh-smoke-profile',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

async function evalValue<T>(cdp: CdpClient, expression: string): Promise<T> {
  const result = await cdp.send<{ result: { value?: T; description?: string } }>('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return (result.result.value as T) ?? (result.result.description as T);
}

async function main(): Promise<void> {
  await mkdir(artifactsDir, { recursive: true });
  await rm('/tmp/ygh-smoke-profile', { recursive: true, force: true });

  const port = 5173;
  const cdpPort = 9222;
  const chromiumPath = await resolveChromiumPath();
  if (!chromiumPath) {
    errors.push('Chromium binary not found (/usr/bin/chromium, /usr/bin/chromium-browser, /usr/bin/google-chrome)');
    await writeFile(smokeLogPath, `timestamp=${new Date().toISOString()}\nERROR ${errors[0]}\n`, 'utf8');
    process.exitCode = 1;
    return;
  }

  const devServer = spawnDevServer(port);
  const chromium = spawnChromium(cdpPort, chromiumPath);

  let cdp: CdpClient | null = null;

  try {
    await waitForHttp(`http://127.0.0.1:${port}`, 30000);
    await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`, 15000);

    const created = await fetch(`http://127.0.0.1:${cdpPort}/json/new?http://127.0.0.1:${port}`);
    if (!created.ok) {
      throw new Error(`Failed to open tab: ${created.status}`);
    }
    const target = (await created.json()) as { webSocketDebuggerUrl?: string };
    if (!target.webSocketDebuggerUrl) {
      throw new Error('Missing webSocketDebuggerUrl');
    }

    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.waitOpen();

    cdp.on('Runtime.exceptionThrown', (params) => {
      errors.push(JSON.stringify(params));
    });
    cdp.on('Runtime.consoleAPICalled', (params) => {
      const level = String(params.type ?? 'log');
      if (level === 'error') {
        errors.push(JSON.stringify(params));
      }
    });

    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await delay(3000);
    const ping = await evalValue<string>(cdp, 'window.__YGH_DEV__?.ping?.()');
    if (ping !== 'pong') {
      throw new Error('Dev hooks not ready');
    }

    const noScroll = await evalValue<boolean>(
      cdp,
      `(() => {
        const body = document.body;
        return body.scrollHeight <= body.clientHeight || getComputedStyle(body).overflow === 'hidden';
      })()`,
    );
    addStep('viewport-no-scroll', noScroll ? 'PASS' : 'FAIL', `noScroll=${String(noScroll)}`);

    const shotLoad = await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png' });
    await writeFile('artifacts/smoke/after-load.png', Buffer.from(shotLoad.data, 'base64'));

    await delay(1500);
    const counts = await evalValue<{ loadingReadyCalls: number; fullscreenShown: number; rewardedShown: number }>(
      cdp,
      'window.__YGH_DEV__.getCounts()',
    );
    addStep('S1', counts.loadingReadyCalls === 1 ? 'PASS' : 'FAIL', JSON.stringify(counts));

    await evalValue(cdp, 'window.__YGH_DEV__.emitPause()');
    await delay(500);
    const paused = await evalValue<{ phaserMutedOrPaused: boolean; audioContextState?: string }>(
      cdp,
      'window.__YGH_DEV__.getAudioState()',
    );
    await evalValue(cdp, 'window.__YGH_DEV__.emitResume()');
    await delay(500);
    const resumed = await evalValue<{ phaserMutedOrPaused: boolean; audioContextState?: string }>(
      cdp,
      'window.__YGH_DEV__.getAudioState()',
    );
    const s2Pass = paused.phaserMutedOrPaused && !resumed.phaserMutedOrPaused;
    addStep('S2', s2Pass ? 'PASS' : 'FAIL', `pause=${JSON.stringify(paused)} resume=${JSON.stringify(resumed)}`);

    const rewardSuccess = await evalValue<{ rewarded: boolean }>(cdp, 'window.__YGH_DEV__.showRewardedSuccess()');
    const rewardCancel = await evalValue<{ rewarded: boolean }>(cdp, 'window.__YGH_DEV__.showRewardedCancel()');
    const countsAfterRewarded = await evalValue<{ rewardedShown: number }>(cdp, 'window.__YGH_DEV__.getCounts()');
    const s3Pass = rewardSuccess.rewarded && !rewardCancel.rewarded && countsAfterRewarded.rewardedShown >= 2;
    addStep(
      'S3',
      s3Pass ? 'PASS' : 'FAIL',
      `success=${rewardSuccess.rewarded} cancel=${rewardCancel.rewarded} counters=${JSON.stringify(countsAfterRewarded)}`,
    );

    const interstitial = await evalValue<{ shown: boolean }>(cdp, 'window.__YGH_DEV__.showInterstitial()');
    addStep('S4', interstitial.shown ? 'PASS' : 'FAIL', JSON.stringify(interstitial));

    const beforeSave = await evalValue<{ gold?: number; dust?: number }>(cdp, 'window.__YGH_DEV__.getSaveSnapshot()');
    const buyGold = await evalValue<{ ok: boolean; error?: string }>(cdp, `window.__YGH_DEV__.buy('pack_gold_small')`);
    const afterGold = await evalValue<{ gold?: number; dust?: number }>(cdp, 'window.__YGH_DEV__.getSaveSnapshot()');
    const buyDisableAds = await evalValue<{ ok: boolean; error?: string }>(cdp, `window.__YGH_DEV__.buy('disable_ads')`);
    const entitlements = await evalValue<{ disableAds: boolean }>(cdp, 'window.__YGH_DEV__.getEntitlements()');
    const goldIncreased = (afterGold.gold ?? 0) > (beforeSave.gold ?? 0);
    const s5Pass = buyGold.ok && goldIncreased && buyDisableAds.ok && entitlements.disableAds;
    addStep(
      'S5',
      s5Pass ? 'PASS' : 'FAIL',
      `buyGold=${JSON.stringify(buyGold)} buyDisableAds=${JSON.stringify(buyDisableAds)} before=${JSON.stringify(beforeSave)} after=${JSON.stringify(afterGold)} entitlements=${JSON.stringify(entitlements)}`,
    );

    const shotAfterDisable = await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png' });
    await writeFile('artifacts/smoke/after-disable-ads.png', Buffer.from(shotAfterDisable.data, 'base64'));

    const interstitialAfterDisable = await evalValue<{ shown: boolean }>(cdp, 'window.__YGH_DEV__.showInterstitial()');
    const rewardedAfterDisable = await evalValue<{ rewarded: boolean }>(cdp, 'window.__YGH_DEV__.showRewardedSuccess()');
    const s6Pass = !interstitialAfterDisable.shown;
    addStep(
      'S6',
      s6Pass ? 'PASS' : 'FAIL',
      `interstitialAfterDisable=${JSON.stringify(interstitialAfterDisable)} rewardedAfterDisable=${JSON.stringify(rewardedAfterDisable)}`,
    );

    await cdp.send('Page.reload');
    await delay(2500);
    const entitlementsReload = await evalValue<{ disableAds: boolean }>(cdp, 'window.__YGH_DEV__.getEntitlements()');
    const saveReload = await evalValue<{ gold?: number; dust?: number }>(cdp, 'window.__YGH_DEV__.getSaveSnapshot()');
    const s7Pass = entitlementsReload.disableAds && (saveReload.gold ?? 0) >= (afterGold.gold ?? 0);
    addStep('S7', s7Pass ? 'PASS' : 'FAIL', `entitlements=${JSON.stringify(entitlementsReload)} save=${JSON.stringify(saveReload)}`);

    const shotReload = await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png' });
    await writeFile('artifacts/smoke/after-reload.png', Buffer.from(shotReload.data, 'base64'));
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    errors.push(message);
  } finally {
    cdp?.close();
    devServer.kill('SIGTERM');
    chromium.kill('SIGTERM');
  }

  const failedSteps = steps.filter((step) => step.status === 'FAIL');
  const lines = [
    `timestamp=${new Date().toISOString()}`,
    ...steps.map((step) => `${step.id} ${step.status} ${step.details}`),
    ...warnings.map((warning) => `WARN ${warning}`),
    ...errors.map((error) => `ERROR ${error}`),
  ];
  await writeFile(smokeLogPath, `${lines.join('\n')}\n`, 'utf8');

  if (errors.length > 0 || failedSteps.length > 0) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

void main();
