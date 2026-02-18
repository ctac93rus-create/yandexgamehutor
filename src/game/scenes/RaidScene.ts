import Phaser from 'phaser';

import economyJson from '../data/economy.json';
import dailyJson from '../data/quests_daily.json';
import storyJson from '../data/quests_story.json';
import enemiesJson from '../data/enemies.json';
import wavesJson from '../data/waves.json';
import { adsManager } from '../managers/AdsManager';
import { saveManager } from '../managers/SaveManager';
import { achievementsManager } from '../managers/AchievementsManager';
import { leaderboardsManager } from '../managers/LeaderboardsManager';
import { localizationManager } from '../managers/LocalizationManager';
import { economySchema } from '../systems/merge/schema';
import { QuestEngine } from '../systems/quests/QuestEngine';
import { Defender } from '../systems/raid/Defender';
import { Enemy } from '../systems/raid/Enemy';
import { RaidController } from '../systems/raid/RaidController';
import { RewardCalculator } from '../systems/raid/RewardCalculator';
import { Spells } from '../systems/raid/Spells';
import { Waves } from '../systems/raid/Waves';
import { getDefaultBonuses } from '../systems/meta/bonuses';
import type {
  EnemyDefinition,
  LaneGeometry,
  RaidResult,
  WavesConfig,
} from '../systems/raid/types';
import type { MetaBonuses } from '../systems/meta/bonuses';
import { RaidHUD } from '../ui/hud/RaidHUD';
import { RewardModal } from '../ui/hud/RewardModal';

const LANES: LaneGeometry[] = [
  { index: 0, spawnX: 1230, baseX: 120, y: 220 },
  { index: 1, spawnX: 1230, baseX: 120, y: 360 },
  { index: 2, spawnX: 1230, baseX: 120, y: 500 },
];

interface RaidSceneData {
  bonuses?: MetaBonuses;
}

export class RaidScene extends Phaser.Scene {
  private enemiesById = new Map<string, EnemyDefinition>();
  private waves!: WavesConfig;

  private readonly enemies: Enemy[] = [];
  private readonly defenders: Defender[] = [];
  private readonly controller = new RaidController();
  private spell = new Spells(12, 3.5, 220);

  private hud!: RaidHUD;
  private rewardCalculator!: RewardCalculator;

  private elapsedSec = 0;
  private spawnCursor = 0;
  private kills = 0;
  private baseHp = 1;
  private spellFx?: Phaser.GameObjects.Arc;
  private lastSpellFxAt = -1000;
  private bonuses: MetaBonuses = getDefaultBonuses();

  public constructor() {
    super('RaidScene');
  }

  public init(data: RaidSceneData): void {
    this.bonuses = data.bonuses ?? getDefaultBonuses();
  }

  public create(): void {
    void adsManager.onScreenShown();
    this.cameras.main.setBackgroundColor('#0f172a');
    this.drawLanes();

    const economy = economySchema.parse(economyJson);
    this.rewardCalculator = new RewardCalculator(economy.raid);

    this.waves = Waves.parse(wavesJson);
    this.baseHp = Math.max(1, this.waves.baseHp + this.bonuses.raid.baseHpAdd);
    this.spell = new Spells(
      Math.max(1, 12 * this.bonuses.raid.spellCooldownMult),
      3.5,
      220,
    );

    const enemyDefs = enemiesJson as EnemyDefinition[];
    for (let i = 0; i < enemyDefs.length; i += 1) {
      this.enemiesById.set(enemyDefs[i].id, enemyDefs[i]);
    }

    for (let i = 0; i < LANES.length; i += 1) {
      this.defenders.push(
        new Defender(
          this,
          LANES[i],
          Math.max(1, 18 * this.bonuses.raid.defenderDpsMult),
          360,
        ),
      );
    }

    this.spellFx = this.add
      .circle(550, 360, 220, 0x93c5fd, 0.18)
      .setDepth(2)
      .setVisible(false);

    this.hud = new RaidHUD(this, () => {
      const casted = this.spell.tryCast(550, 360, this.enemies);
      if (casted) {
        this.playSpellFx();
      }
    });
    this.hud.render(this.waves.durationSec, this.baseHp, 0);
  }

  public override update(_time: number, deltaMs: number): void {
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

    this.hud.render(
      Math.max(0, this.waves.durationSec - this.elapsedSec),
      this.baseHp,
      this.spell.cooldownLeftSec,
    );

    const state = this.controller.evaluate(
      this.elapsedSec,
      this.waves.durationSec,
      this.baseHp,
      this.enemies.length,
    );
    if (state !== 'running') {
      this.finishRaid();
    }
  }

  private processSpawnTimeline(): void {
    const nextCursor = Waves.nextBatch(
      this.waves.timeline,
      this.elapsedSec,
      this.spawnCursor,
    );
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
    const result = this.controller.finalize(
      this.kills,
      this.baseHp,
      this.elapsedSec,
    );
    const baseReward = this.rewardCalculator.calculate(result, false);

    new RewardModal(
      this,
      result,
      baseReward,
      (doubled) => {
        void this.claimReward(doubled, result);
      },
      () => {
        void adsManager.showRewarded('raid_double_reward', () => {
          void this.claimReward(true, result);
        });
      },
    );

    void adsManager.onRaidFinished();
  }

  private async claimReward(
    doubled: boolean,
    result: RaidResult,
  ): Promise<void> {
    const reward = this.rewardCalculator.calculate(result, doubled);
    const save = await saveManager.load();
    const meta = save?.meta ?? QuestEngine.defaultState();
    const questEngine = new QuestEngine(meta, storyJson, dailyJson);
    questEngine.onEvent('raid_complete', 1);
    if (result.win) {
      questEngine.onEvent('raid_win', 1);
    }
    const nextMeta = questEngine.getState();
    const previousBest = nextMeta.stats.bestRaidKills ?? 0;
    const updatedBest = Math.max(previousBest, result.kills);
    nextMeta.stats.bestRaidKills = updatedBest;
    await achievementsManager.process(nextMeta);

    if (save) {
      await saveManager.save({ ...save, meta: nextMeta });
    } else {
      await saveManager.save({
        gold: 0,
        dust: 0,
        occupiedCells: [],
        generators: {},
        meta: nextMeta,
      });
    }

    if (updatedBest > previousBest) {
      void leaderboardsManager.submitBestRaidKills(updatedBest);
    }

    this.scene.start('MergeScene', {
      raidReward: reward,
      raidMeta: result,
    });
  }

  private playSpellFx(): void {
    const now = this.time.now;
    if (!this.spellFx || now - this.lastSpellFxAt < 120) {
      return;
    }
    this.lastSpellFxAt = now;
    this.spellFx.setScale(0.65).setAlpha(0.3).setVisible(true);
    this.tweens.add({
      targets: this.spellFx,
      scale: 1,
      alpha: 0,
      duration: 240,
      onComplete: () => {
        this.spellFx?.setVisible(false);
      },
    });
  }
  private drawLanes(): void {
    this.add
      .rectangle(
        this.scale.width * 0.5,
        54,
        this.scale.width - 60,
        82,
        0x1e293b,
        0.95,
      )
      .setStrokeStyle(2, 0x334155);
    this.add.text(40, 28, localizationManager.t('raid.title'), {
      color: '#f8fafc',
      fontSize: '36px',
    });
    for (let i = 0; i < LANES.length; i += 1) {
      const lane = LANES[i];
      this.add.rectangle(640, lane.y, 1220, 90, 0x1e293b, 0.75).setDepth(1);
      this.add.rectangle(lane.baseX, lane.y, 40, 70, 0x991b1b).setDepth(4);
    }
  }
}
