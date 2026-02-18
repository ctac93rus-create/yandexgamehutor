import type { Enemy } from './Enemy';

export class Spells {
  private readonly cooldownSec: number;
  private readonly freezeSec: number;
  private readonly radius: number;

  private remainingCd = 0;

  public constructor(cooldownSec: number, freezeSec: number, radius: number) {
    this.cooldownSec = cooldownSec;
    this.freezeSec = freezeSec;
    this.radius = radius;
  }

  public update(deltaSec: number): void {
    if (this.remainingCd > 0) {
      this.remainingCd -= deltaSec;
    }
  }

  public tryCast(centerX: number, centerY: number, enemies: Enemy[]): boolean {
    if (this.remainingCd > 0) {
      return false;
    }

    const radiusSq = this.radius * this.radius;
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (!enemy.alive) {
        continue;
      }
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      if (dx * dx + dy * dy <= radiusSq) {
        enemy.freeze(this.freezeSec);
      }
    }

    this.remainingCd = this.cooldownSec;
    return true;
  }

  public get cooldownLeftSec(): number {
    return Math.max(0, this.remainingCd);
  }
}
