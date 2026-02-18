import Phaser from 'phaser';

import chainsJson from '../data/merge_chains.json';
import economyJson from '../data/economy.json';
import itemsJson from '../data/items.json';
import dailyJson from '../data/quests_daily.json';
import storyJson from '../data/quests_story.json';
import { adsManager } from '../managers/AdsManager';
import { localizationManager } from '../managers/LocalizationManager';
import { remoteConfigManager } from '../managers/RemoteConfigManager';
import { saveManager } from '../managers/SaveManager';
import { settingsManager } from '../managers/SettingsManager';
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

const TUTORIAL_STEPS = [
  { textKey: 'merge.tutorial.step1', x: 360, y: 360, w: 640, h: 480 },
  { textKey: 'merge.tutorial.step2', x: 360, y: 360, w: 640, h: 480 },
  { textKey: 'merge.tutorial.step3', x: 130, y: 150, w: 120, h: 120 },
  { textKey: 'merge.tutorial.step4', x: 645, y: 705, w: 420, h: 60 },
  { textKey: 'merge.tutorial.step5', x: 220, y: 705, w: 350, h: 60 },
] as const;

interface MergeSceneData {
  raidReward?: RaidReward;
}

export class MergeScene extends Phaser.Scene {
  private readonly grid = new MergeGrid(GRID_ROWS, GRID_COLS);
  private readonly generators = new Generators();
  private readonly runtimeItems = new Map<string, ItemEntity>();
  private readonly entityBySprite = new Map<Phaser.GameObjects.GameObject, ItemEntity>();

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

  private tutorialOverlay?: Phaser.GameObjects.Rectangle;
  private tutorialFrame?: Phaser.GameObjects.Rectangle;
  private tutorialText?: Phaser.GameObjects.Text;
  private tutorialButton?: Phaser.GameObjects.Rectangle;
  private tutorialButtonLabel?: Phaser.GameObjects.Text;
  private tutorialStep = 0;

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

    this.tryStartTutorial();
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
    this.add.rectangle(this.scale.width * 0.5, 48, this.scale.width - 40, 72, 0x1e293b, 0.95).setStrokeStyle(2, 0x334155);
    this.add.text(32, 28, localizationManager.t('merge.title'), { color: '#f8fafc', fontSize: '30px' });
    this.goldText = this.add.text(260, 28, '', { color: '#fbbf24', fontSize: '24px' });
    this.dustText = this.add.text(460, 28, '', { color: '#a78bfa', fontSize: '24px' });
    this.toastText = this.add
      .text(this.scale.width / 2, 84, '', {
        color: '#e2e8f0',
        fontSize: '20px',
        backgroundColor: '#334155',
        padding: { x: 12, y: 7 },
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
          .setStrokeStyle(2, 0x475569);
      }
    }

    const navY = 705;
    this.makeButton(100, navY, localizationManager.t('common.backToMenu'), () => this.scene.start('MenuScene'));
    this.makeButton(255, navY, localizationManager.t('common.toHut'), () => this.scene.start('HutScene'));
    this.makeButton(410, navY, localizationManager.t('common.toRaid'), () => this.scene.start('RaidScene'));
    this.makeButton(735, navY, localizationManager.t('merge.rewardedCharge'), () => {
      void adsManager.showRewarded('merge_generator_charge', () => {
        this.grantRewardedGeneratorCharge();
      });
    }, 440, 0x4c1d95, 0xe9d5ff);

    this.refreshHud();
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 140,
    bgColor = 0x14532d,
    textColor = 0xecfeff,
  ): void {
    const button = this.add
      .rectangle(x, y, width, 54, bgColor, 0.98)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { color: Phaser.Display.Color.IntegerToColor(textColor).rgba, fontSize: '20px' }).setOrigin(0.5);
    button.on('pointerup', onClick);
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
        this.addRuntimeItem(runtimeId, item, { row: cell.row, col: cell.col });
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
        this.addRuntimeItem(runtimeId, item, free);
      }
    }

    this.showToast(localizationManager.t('merge.raidReward', { gold: this.pendingRaidReward.gold, dust: this.pendingRaidReward.dust }));
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

      this.removeRuntimeEntity(entity);
      this.removeRuntimeEntity(targetEntity);

      const mergedRuntimeId = crypto.randomUUID();
      this.grid.set(dropCell, mergedRuntimeId);
      const merged = this.addRuntimeItem(mergedRuntimeId, next, dropCell);
      merged.setDepth(3);
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
        this.showToast(localizationManager.t('merge.generatorCooldown'));
        return;
      }

      const spawnTarget = this.inventory.placeToFreeCell(crypto.randomUUID());
      if (!spawnTarget) {
        const overflow = this.overflowPolicy.resolveNoSpace();
        this.dust += overflow.grantedDust;
        this.showToast(localizationManager.t('merge.overflow', { dust: overflow.grantedDust }));
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
      this.addRuntimeItem(runtimeId, produced, spawnTarget);
      this.questEngine.onEvent('generator_spawn', 1);
      this.showToast(`+ ${produced.name}`);
      this.refreshHud();
      void this.persistState('generator_spawn');
    });
  }

  private addRuntimeItem(runtimeId: string, item: ItemDefinition, position: GridPosition): ItemEntity {
    const entity = new ItemEntity(this, runtimeId, item, position, GRID_ORIGIN);
    this.runtimeItems.set(runtimeId, entity);
    this.entityBySprite.set(entity.sprite, entity);
    return entity;
  }

  private removeRuntimeEntity(entity: ItemEntity): void {
    this.entityBySprite.delete(entity.sprite);
    this.runtimeItems.delete(entity.runtimeId);
    entity.destroy();
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

    this.showToast(
      granted > 0
        ? localizationManager.t('merge.rewardedCharges', { value: granted })
        : localizationManager.t('merge.generatorsFull'),
    );
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
    this.addRuntimeItem(runtimeId, item, free);
    return true;
  }

  private findEntityBySprite(target: Phaser.GameObjects.GameObject): ItemEntity | null {
    return this.entityBySprite.get(target) ?? null;
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
    this.goldText.setText(localizationManager.t('merge.gold', { value: this.gold }));
    this.dustText.setText(localizationManager.t('merge.dust', { value: this.dust }));
  }

  private tryStartTutorial(): void {
    if (settingsManager.getState().tutorialCompleted) {
      return;
    }

    this.tutorialOverlay = this.add.rectangle(this.scale.width * 0.5, this.scale.height * 0.5, this.scale.width, this.scale.height, 0x020617, 0.7).setDepth(200);
    this.tutorialFrame = this.add.rectangle(0, 0, 100, 100, 0x000000, 0).setStrokeStyle(4, 0xfde68a).setDepth(201);
    this.tutorialText = this.add.text(this.scale.width * 0.5, 560, '', {
      color: '#f8fafc',
      fontSize: '28px',
      align: 'center',
      backgroundColor: '#1e293b',
      padding: { x: 14, y: 10 },
      wordWrap: { width: 980 },
    }).setOrigin(0.5).setDepth(202);

    this.tutorialButton = this.add.rectangle(this.scale.width * 0.5, 650, 220, 64, 0x14532d, 0.98)
      .setStrokeStyle(2, 0x86efac)
      .setDepth(202)
      .setInteractive({ useHandCursor: true });
    this.tutorialButtonLabel = this.add.text(this.scale.width * 0.5, 650, '', {
      color: '#ecfeff',
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(203);

    this.tutorialButton.on('pointerup', () => {
      this.tutorialStep += 1;
      if (this.tutorialStep >= TUTORIAL_STEPS.length) {
        settingsManager.setTutorialCompleted(true);
        this.destroyTutorial();
        return;
      }
      this.renderTutorialStep();
    });

    this.renderTutorialStep();
  }

  private renderTutorialStep(): void {
    const step = TUTORIAL_STEPS[this.tutorialStep];
    this.tutorialFrame?.setPosition(step.x, step.y).setSize(step.w, step.h);
    this.tutorialText?.setText(localizationManager.t(step.textKey));
    this.tutorialButtonLabel?.setText(
      this.tutorialStep === TUTORIAL_STEPS.length - 1
        ? localizationManager.t('merge.tutorial.done')
        : localizationManager.t('merge.tutorial.next'),
    );
  }

  private destroyTutorial(): void {
    this.tutorialOverlay?.destroy();
    this.tutorialFrame?.destroy();
    this.tutorialText?.destroy();
    this.tutorialButton?.destroy();
    this.tutorialButtonLabel?.destroy();
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
