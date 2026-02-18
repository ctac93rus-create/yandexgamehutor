import type Phaser from 'phaser';

import type { LaneGeometry } from './types';
import type { Enemy } from './Enemy';

export class Defender {
  private readonly laneIndex: number;
  private readonly x: number;
  private readonly range: number;
  private readonly dps: number;

  private cooldownSec = 0;

  public constructor(scene: Phaser.Scene, lane: LaneGeometry, dps: number, range: number) {
    this.laneIndex = lane.index;
    this.x = lane.baseX + 60;
    this.range = range;
    this.dps = dps;

    scene.add.rectangle(this.x, lane.y, 30, 44, 0x16a34a).setDepth(12);
  }

  public update(deltaSec: number, enemies: Enemy[]): void {
    if (this.cooldownSec > 0) {
      this.cooldownSec -= deltaSec;
      return;
    }

    let target: Enemy | null = null;
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (enemy.lane !== this.laneIndex || !enemy.alive) {
        continue;
      }
      const distance = enemy.x - this.x;
      if (distance < 0 || distance > this.range) {
        continue;
      }
      if (!target || enemy.x < target.x) {
        target = enemy;
      }
    }

    if (!target) {
      return;
    }

    target.damage(this.dps);
    this.cooldownSec = 1;
  }
}
