import Phaser from 'phaser';

import chainsJson from '../data/merge_chains.json';
import economyJson from '../data/economy.json';
import itemsJson from '../data/items.json';
import dailyJson from '../data/quests_daily.json';
import storyJson from '../data/quests_story.json';
import { adsManager } from '../managers/AdsManager';
import { remoteConfigManager } from '../managers/RemoteConfigManager';
import { saveManager } from '../managers/SaveManager';
import { Generators } from '../systems/merge/Generators';
import { GRID_CELL_SIZE, ItemEntity } from '../systems/merge/ItemEntity';
import { Inventory } from '../systems/merge/Inventory';
import { MergeGrid } from '../systems/merge/MergeGrid';
import { MergeResolver } from '../systems/merge/MergeResolver';
import { OverflowPolicy } from '../systems/merge/OverflowPolicy';
import { economySchema, itemsSchema, mergeChainsSchema } from '../systems/merge/schema';
import type { EconomyConfig, GridPosition, ItemDefinition, SaveState } from '../systems/merge/types';
import { QuestEngine } from '../systems/quests/QuestEngine';
import type { MetaProgressState } from '../systems/quests/types';
import type { RaidReward } from '../systems/raid/RewardCalculator';

const GRID_ROWS = 6;
const GRID_COLS = 7;
const GRID_ORIGIN = { x: 60, y: 110 };

interface MergeSceneData {
  raidReward?: RaidReward;
}

export class MergeScene extends Phaser.Scene {
  private readonly grid = new MergeGrid(GRID_ROWS, GRID_COLS);
  private readonly generators = new Generators();
  private readonly runtimeItems = new Map<string, ItemEntity>();

  private itemsById = new Map<string, ItemDefinition>();
  private mergeResolver!: MergeResolver;
  private inventory = new Inventory(this.grid);
  private overflowPolicy!: OverflowPolicy;

  private gold = 0;
  private dust = 0;
  private meta!: MetaProgressState;
  private questEngine!: QuestEngine;
  private pendingRaidReward: RaidReward | null = null;

  private goldText!: Phaser.GameObjects.Text;
  private dustText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  public constructor() {
    super('MergeScene');
  }

  public init(data: MergeSceneData): void {
    this.pendingRaidReward = data.raidReward ?? null;
  }

  public async create(): Promise<void> {
    this.bootstrapData();
    this.drawLayout();

    await this.restoreOrSeedBoard();
    await this.applyPendingRaidReward();
    await adsManager.onScreenShown();

    this.bindDragAndDrop();
    this.bindGeneratorTap();

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        let changed = false;
        this.runtimeItems.forEach((entity) => {
          if (!entity.item.generator) {
            return;
          }
          const before = this.generators.getState(entity.runtimeId, entity.item.generator).charges;
          this.generators.refill(entity.runtimeId, entity.item.generator);
          const after = this.generators.getState(entity.runtimeId, entity.item.generator).charges;
          if (after !== before) {
            changed = true;
          }
        });
        if (changed) {
          void this.persistState('generator_refill');
          this.refreshHud();
        }
      },
    });
  }

  private bootstrapData(): void {
    const parsedItems = itemsSchema.parse(itemsJson);
    const parsedChains = mergeChainsSchema.parse(chainsJson);
    const parsedEconomy = economySchema.parse(economyJson) as EconomyConfig;

    this.itemsById = new Map(parsedItems.map((item) => [item.id, item]));
    this.mergeResolver = new MergeResolver(parsedChains);
    this.overflowPolicy = new OverflowPolicy(parsedEconomy);
    this.gold = parsedEconomy.startGold;
    this.dust = parsedEconomy.startDust;
  }

  private drawLayout(): void {
    this.cameras.main.setBackgroundColor('#111827');
    this.add.text(30, 20, 'Merge MVP', { color: '#f8fafc', fontSize: '28px' });
    this.goldText = this.add.text(280, 20, '', { color: '#fbbf24', fontSize: '24px' });
    this.dustText = this.add.text(470, 20, '', { color: '#a78bfa', fontSize: '24px' });
    this.toastText = this.add
      .text(this.scale.width / 2, 70, '', {
        color: '#fecaca',
        fontSize: '20px',
        backgroundColor: '#7f1d1d',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        this.add
          .rectangle(
            GRID_ORIGIN.x + col * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
            GRID_ORIGIN.y + row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
            GRID_CELL_SIZE - 4,
            GRID_CELL_SIZE - 4,
            0x1f2937,
          )
          .setStrokeStyle(2, 0x374151);
      }
    }

    const buttonStyle = {
      color: '#d1fae5',
      fontSize: '20px',
      backgroundColor: '#064e3b',
      padding: { x: 8, y: 4 },
    };
    this.add
      .text(60, 705, 'В меню', buttonStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('MenuScene'));
    this.add
      .text(190, 705, 'В хутор', buttonStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('HutScene'));
    this.add
      .text(320, 705, 'В рейд', buttonStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('RaidScene'));
    this.add
      .text(450, 705, 'Заряд генератора (rewarded)', {
        ...buttonStyle,
        color: '#e9d5ff',
        backgroundColor: '#4c1d95',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        void adsManager.showRewarded('merge_generator_charge', () => {
          this.grantRewardedGeneratorCharge();
        });
      });

    this.refreshHud();
  }

  private async restoreOrSeedBoard(): Promise<void> {
    const save = await saveManager.load();
    if (save) {
      this.gold = save.gold;
      this.dust = save.dust;
      this.meta = save.meta ?? QuestEngine.defaultState();
      this.questEngine = new QuestEngine(this.meta, storyJson, dailyJson);
      this.generators.importState(save.generators);
      save.occupiedCells.forEach((cell) => {
        const item = this.itemsById.get(cell.itemId);
        if (!item) {
          return;
        }
        const runtimeId = crypto.randomUUID();
        this.grid.set({ row: cell.row, col: cell.col }, runtimeId);
        this.runtimeItems.set(runtimeId, new ItemEntity(this, runtimeId, item, { row: cell.row, col: cell.col }, GRID_ORIGIN));
      });
      this.refreshHud();
      return;
    }

    this.meta = QuestEngine.defaultState();
    this.questEngine = new QuestEngine(this.meta, storyJson, dailyJson);
    this.spawnItemById('campfire');
    this.spawnItemById('twig');
    this.spawnItemById('twig');
    await this.persistState('seed_board');
  }

  private async applyPendingRaidReward(): Promise<void> {
    if (!this.pendingRaidReward) {
      return;
    }

    this.gold += this.pendingRaidReward.gold;
    this.dust += this.pendingRaidReward.dust;

    for (let i = 0; i < this.pendingRaidReward.itemIds.length; i += 1) {
      const itemId = this.pendingRaidReward.itemIds[i];
      const free = this.inventory.placeToFreeCell(crypto.randomUUID());
      if (!free) {
        this.dust += this.overflowPolicy.resolveNoSpace().grantedDust;
        continue;
      }
      const runtimeId = this.grid.get(free);
      const item = this.itemsById.get(itemId);
      if (runtimeId && item) {
        this.runtimeItems.set(runtimeId, new ItemEntity(this, runtimeId, item, free, GRID_ORIGIN));
      }
    }

    this.showToast(`Рейд: +${this.pendingRaidReward.gold} золота, +${this.pendingRaidReward.dust} пыли`);
    this.pendingRaidReward = null;
    this.refreshHud();
    await this.persistState('raid_reward_claim');
  }

  private bindDragAndDrop(): void {
    this.input.on('dragstart', (_pointer, target: Phaser.GameObjects.GameObject) => {
      const entity = this.findEntityBySprite(target);
      if (!entity) {
        return;
      }
      entity.setDepth(40);
    });

    this.input.on('drag', (_pointer, target, dragX: number, dragY: number) => {
      const entity = this.findEntityBySprite(target);
      if (!entity) {
        return;
      }
      entity.setWorldPosition(dragX, dragY);
    });

    this.input.on('dragend', (_pointer, target) => {
      const entity = this.findEntityBySprite(target);
      if (!entity) {
        return;
      }

      const dropCell = this.cellFromWorld(entity.sprite.x, entity.sprite.y);
      if (!dropCell) {
        entity.setGridPosition(entity.position);
        entity.setDepth(2);
        return;
      }

      const targetRuntimeId = this.grid.get(dropCell);
      if (!targetRuntimeId || targetRuntimeId === entity.runtimeId) {
        this.grid.clear(entity.position);
        this.grid.set(dropCell, entity.runtimeId);
        entity.setGridPosition(dropCell);
        entity.setDepth(2);
        void this.persistState('drag_move');
        return;
      }

      const targetEntity = this.runtimeItems.get(targetRuntimeId);
      if (!targetEntity) {
        entity.setGridPosition(entity.position);
        entity.setDepth(2);
        return;
      }

      const merge = this.mergeResolver.canMerge({ sourceId: entity.item.id, targetId: targetEntity.item.id });
      if (!merge.canMerge || !merge.nextItemId) {
        entity.setGridPosition(entity.position);
        entity.setDepth(2);
        return;
      }

      const next = this.itemsById.get(merge.nextItemId);
      if (!next) {
        entity.setGridPosition(entity.position);
        entity.setDepth(2);
        return;
      }

      this.grid.clear(entity.position);
      this.grid.clear(targetEntity.position);

      entity.destroy();
      targetEntity.destroy();
      this.runtimeItems.delete(entity.runtimeId);
      this.runtimeItems.delete(targetEntity.runtimeId);

      const mergedRuntimeId = crypto.randomUUID();
      this.grid.set(dropCell, mergedRuntimeId);
      const merged = new ItemEntity(this, mergedRuntimeId, next, dropCell, GRID_ORIGIN);
      merged.setDepth(3);
      this.runtimeItems.set(mergedRuntimeId, merged);
      this.tweens.add({ targets: [merged.sprite, merged.label], scale: { from: 1.25, to: 1 }, duration: 180 });

      this.questEngine.onEvent('merge_done', 1);
      this.showToast(`Merge: ${next.name}`);
      this.refreshHud();
      void this.persistState('merge');
    });
  }

  private bindGeneratorTap(): void {
    this.input.on('gameobjectup', (_pointer, target: Phaser.GameObjects.GameObject) => {
      const entity = this.findEntityBySprite(target);
      if (!entity?.item.generator) {
        return;
      }
      const generator = entity.item.generator;
      const hasCharge = this.generators.spendCharge(entity.runtimeId, generator);
      if (!hasCharge) {
        this.showToast('Генератор перезаряжается...');
        return;
      }

      const spawnTarget = this.inventory.placeToFreeCell(crypto.randomUUID());
      if (!spawnTarget) {
        const overflow = this.overflowPolicy.resolveNoSpace();
        this.dust += overflow.grantedDust;
        this.showToast(`Нет места: +${overflow.grantedDust} пыли`);
        this.refreshHud();
        void this.persistState('overflow');
        return;
      }

      const produced = this.itemsById.get(generator.producesItemId);
      if (!produced) {
        return;
      }

      const runtimeId = this.grid.get(spawnTarget);
      if (!runtimeId) {
        return;
      }
      this.runtimeItems.set(runtimeId, new ItemEntity(this, runtimeId, produced, spawnTarget, GRID_ORIGIN));
      this.questEngine.onEvent('generator_spawn', 1);
      this.showToast(`+ ${produced.name}`);
      this.refreshHud();
      void this.persistState('generator_spawn');
    });
  }


  private grantRewardedGeneratorCharge(): void {
    const flags = remoteConfigManager.getFlags();
    let granted = 0;
    this.runtimeItems.forEach((entity) => {
      if (!entity.item.generator) {
        return;
      }
      for (let i = 0; i < flags.rewardedMergeGeneratorCharges; i += 1) {
        const state = this.generators.getState(entity.runtimeId, entity.item.generator);
        if (state.charges >= entity.item.generator.maxCharges) {
          break;
        }
        state.charges = Math.min(entity.item.generator.maxCharges, state.charges + 1);
        state.lastRefillAt = Date.now();
        granted += 1;
      }
    });

    this.showToast(granted > 0 ? `Rewarded: +${granted} зарядов` : 'Генераторы уже заряжены');
    this.refreshHud();
    void this.persistState('rewarded_generator_charge');
  }

  private spawnItemById(itemId: string): boolean {
    const item = this.itemsById.get(itemId);
    if (!item) {
      return false;
    }
    const free = this.grid.findFirstFreeCell();
    if (!free) {
      const overflow = this.overflowPolicy.resolveNoSpace();
      this.dust += overflow.grantedDust;
      return false;
    }
    const runtimeId = crypto.randomUUID();
    this.grid.set(free, runtimeId);
    this.runtimeItems.set(runtimeId, new ItemEntity(this, runtimeId, item, free, GRID_ORIGIN));
    return true;
  }

  private findEntityBySprite(target: Phaser.GameObjects.GameObject): ItemEntity | null {
    for (const entity of this.runtimeItems.values()) {
      if (entity.sprite === target) {
        return entity;
      }
    }
    return null;
  }

  private cellFromWorld(x: number, y: number): GridPosition | null {
    const col = Math.floor((x - GRID_ORIGIN.x) / GRID_CELL_SIZE);
    const row = Math.floor((y - GRID_ORIGIN.y) / GRID_CELL_SIZE);
    const cell = { row, col };
    return this.grid.inBounds(cell) ? cell : null;
  }

  private showToast(text: string): void {
    this.toastText.setText(text).setVisible(true);
    this.time.delayedCall(1200, () => {
      this.toastText.setVisible(false);
    });
  }

  private refreshHud(): void {
    this.goldText.setText(`Золото: ${this.gold}`);
    this.dustText.setText(`Пыль: ${this.dust}`);
  }

  private buildSaveState(): SaveState {
    return {
      gold: this.gold,
      dust: this.dust,
      occupiedCells: this.grid.occupiedCells().map((cell) => {
        const entity = this.runtimeItems.get(cell.itemId);
        return {
          row: cell.position.row,
          col: cell.position.col,
          itemId: entity?.item.id ?? 'twig',
        };
      }),
      generators: this.generators.exportState(),
      meta: this.questEngine.getState(),
    };
  }

  private async persistState(_reason: string): Promise<void> {
    await saveManager.save(this.buildSaveState());
  }
}
