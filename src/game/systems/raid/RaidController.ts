import type { RaidResult } from './types';

export type RaidState = 'running' | 'victory' | 'defeat';

export class RaidController {
  private state: RaidState = 'running';

  public evaluate(elapsedSec: number, durationSec: number, baseHp: number, aliveEnemies: number): RaidState {
    if (this.state !== 'running') {
      return this.state;
    }

    if (baseHp <= 0) {
      this.state = 'defeat';
      return this.state;
    }

    if (elapsedSec >= durationSec && aliveEnemies <= 0) {
      this.state = 'victory';
      return this.state;
    }

    return this.state;
  }

  public finalize(kills: number, baseHpLeft: number, durationSec: number): RaidResult {
    return {
      win: this.state === 'victory',
      kills,
      baseHpLeft,
      durationSec,
    };
  }

  public get currentState(): RaidState {
    return this.state;
  }
}
