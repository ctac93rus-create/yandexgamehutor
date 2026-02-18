import type Phaser from 'phaser';

import type { EnemyDefinition, EnemyUpdateResult, LaneGeometry } from './types';

export class Enemy {
  public readonly lane: number;
  public readonly rewardGold: number;

  public hp: number;
  public frozenSec = 0;

  private readonly maxHp: number;
  private readonly speed: number;
  private readonly baseX: number;
  private readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;

  public constructor(scene: Phaser.Scene, lane: LaneGeometry, config: EnemyDefinition) {
    this.lane = lane.index;
    this.baseX = lane.baseX;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.rewardGold = config.rewardGold;

    this.sprite = scene.add.rectangle(lane.spawnX, lane.y, 28, 28, config.color).setDepth(10);
    this.hpBar = scene.add.rectangle(lane.spawnX, lane.y - 22, 28, 4, 0xef4444).setDepth(11);
  }

  public update(deltaSec: number): EnemyUpdateResult {
    if (this.frozenSec > 0) {
      this.frozenSec -= deltaSec;
    } else {
      this.sprite.x -= this.speed * deltaSec;
      this.hpBar.x = this.sprite.x;
    }

    if (this.hp <= 0) {
      this.destroy();
      return { reachedBase: false, dead: true };
    }

    if (this.sprite.x <= this.baseX) {
      this.destroy();
      return { reachedBase: true, dead: false };
    }

    return { reachedBase: false, dead: false };
  }

  public damage(amount: number): void {
    if (amount <= 0 || this.hp <= 0) {
      return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.hpBar.scaleX = this.hp / this.maxHp;
  }

  public freeze(seconds: number): void {
    this.frozenSec = Math.max(this.frozenSec, seconds);
    this.sprite.setFillStyle(0x60a5fa);
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }

  public get alive(): boolean {
    return this.hp > 0;
  }

  public destroy(): void {
    this.sprite.destroy();
    this.hpBar.destroy();
  }
}
