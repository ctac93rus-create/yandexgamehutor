import Phaser from 'phaser';

import economyJson from '../data/economy.json';
import enemiesJson from '../data/enemies.json';
import wavesJson from '../data/waves.json';
import { saveManager } from '../managers/SaveManager';
import { sdkManager } from '../managers/SDKManager';
import { economySchema } from '../systems/merge/schema';
import { Defender } from '../systems/raid/Defender';
import { Enemy } from '../systems/raid/Enemy';
import { RaidController } from '../systems/raid/RaidController';
import { RewardCalculator } from '../systems/raid/RewardCalculator';
import { Spells } from '../systems/raid/Spells';
import { Waves } from '../systems/raid/Waves';
import type { EnemyDefinition, LaneGeometry, RaidResult, WavesConfig } from '../systems/raid/types';
import { RaidHUD } from '../ui/hud/RaidHUD';
import { RewardModal } from '../ui/hud/RewardModal';

const LANES: LaneGeometry[] = [
  { index: 0, spawnX: 1230, baseX: 120, y: 220 },
  { index: 1, spawnX: 1230, baseX: 120, y: 360 },
  { index: 2, spawnX: 1230, baseX: 120, y: 500 },
];

export class RaidScene extends Phaser.Scene {
  private enemiesById = new Map<string, EnemyDefinition>();
  private waves!: WavesConfig;

  private readonly enemies: Enemy[] = [];
  private readonly defenders: Defender[] = [];
  private readonly controller = new RaidController();
  private readonly spell = new Spells(12, 3.5, 220);

  private hud!: RaidHUD;
  private rewardCalculator!: RewardCalculator;

  private elapsedSec = 0;
  private spawnCursor = 0;
  private kills = 0;
  private baseHp = 1;

  public constructor() {
    super('RaidScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.drawLanes();

    const economy = economySchema.parse(economyJson);
    this.rewardCalculator = new RewardCalculator(economy.raid);

    this.waves = Waves.parse(wavesJson);
    this.baseHp = this.waves.baseHp;

    const enemyDefs = enemiesJson as EnemyDefinition[];
    for (let i = 0; i < enemyDefs.length; i += 1) {
      this.enemiesById.set(enemyDefs[i].id, enemyDefs[i]);
    }

    for (let i = 0; i < LANES.length; i += 1) {
      this.defenders.push(new Defender(this, LANES[i], 18, 360));
    }

    this.hud = new RaidHUD(this, () => {
      const casted = this.spell.tryCast(550, 360, this.enemies);
      if (casted) {
        this.add.circle(550, 360, 220, 0x93c5fd, 0.22).setDepth(2);
      }
    });
    this.hud.render({ timeLeftSec: this.waves.durationSec, baseHp: this.baseHp, spellCooldown: 0 });
  }

  public update(_time: number, deltaMs: number): void {
    if (this.controller.currentState !== 'running') {
      return;
    }

    const deltaSec = deltaMs / 1000;
    this.elapsedSec += deltaSec;
    this.spell.update(deltaSec);

    this.processSpawnTimeline();

    for (let i = 0; i < this.defenders.length; i += 1) {
      this.defenders[i].update(deltaSec, this.enemies);
    }

    let write = 0;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      const result = enemy.update(deltaSec);
      if (result.reachedBase) {
        this.baseHp = Math.max(0, this.baseHp - 1);
      }
      if (result.dead) {
        this.kills += 1;
      }
      if (!result.reachedBase && !result.dead) {
        this.enemies[write] = enemy;
        write += 1;
      }
    }
    this.enemies.length = write;

    this.hud.render({
      timeLeftSec: Math.max(0, this.waves.durationSec - this.elapsedSec),
      baseHp: this.baseHp,
      spellCooldown: this.spell.cooldownLeftSec,
    });

    const state = this.controller.evaluate(this.elapsedSec, this.waves.durationSec, this.baseHp, this.enemies.length);
    if (state !== 'running') {
      this.finishRaid();
    }
  }

  private processSpawnTimeline(): void {
    const nextCursor = Waves.nextBatch(this.waves.timeline, this.elapsedSec, this.spawnCursor);
    while (this.spawnCursor < nextCursor) {
      const spawn = this.waves.timeline[this.spawnCursor];
      const lane = LANES[spawn.lane];
      const enemyDef = this.enemiesById.get(spawn.enemyId);
      if (enemyDef) {
        this.enemies.push(new Enemy(this, lane, enemyDef));
      }
      this.spawnCursor += 1;
    }
  }

  private finishRaid(): void {
    const result = this.controller.finalize(this.kills, this.baseHp, this.elapsedSec);
    const baseReward = this.rewardCalculator.calculate(result, false);

    new RewardModal(
      this,
      result,
      baseReward,
      (doubled) => {
        void this.claimReward(doubled, result);
      },
      () => {
        void sdkManager.showRewardedVideo({
          onRewarded: () => {
            void this.claimReward(true, result);
          },
        });
      },
    );
  }

  private async claimReward(doubled: boolean, result: RaidResult): Promise<void> {
    const reward = this.rewardCalculator.calculate(result, doubled);
    const save = await saveManager.load();
    if (save) {
      await saveManager.save(save);
    }

    this.scene.start('MergeScene', {
      raidReward: reward,
      raidMeta: result,
    });
  }

  private drawLanes(): void {
    this.add.text(40, 24, 'Raid MVP', { color: '#f8fafc', fontSize: '34px' });
    for (let i = 0; i < LANES.length; i += 1) {
      const lane = LANES[i];
      this.add.rectangle(640, lane.y, 1220, 90, 0x1e293b, 0.75).setDepth(1);
      this.add.rectangle(lane.baseX, lane.y, 40, 70, 0x991b1b).setDepth(4);
    }
  }
}
