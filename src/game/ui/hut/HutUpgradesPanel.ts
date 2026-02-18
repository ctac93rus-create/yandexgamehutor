import Phaser from 'phaser';

import { localizationManager } from '../../managers/LocalizationManager';
import type { HutUpgradeDefinition } from '../../systems/quests/types';

interface HutUpgradesPanelHandlers {
  onBuy: (id: string) => void;
}

export class HutUpgradesPanel {
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly handlers: HutUpgradesPanelHandlers,
  ) {}

  public render(
    upgrades: HutUpgradeDefinition[],
    purchasedIds: string[],
  ): void {
    this.scene.add.text(680, 120, 'Апгрейды хутора', {
      color: '#f8fafc',
      fontSize: '24px',
      fontFamily: 'Arial',
    });

    upgrades.forEach((upgrade, index) => {
      const y = 170 + index * 116;
      const purchased = purchasedIds.includes(upgrade.id);
      this.scene.add
        .rectangle(940, y + 28, 510, 98, 0x1f2937, 0.75)
        .setStrokeStyle(1, 0x334155);
      this.scene.add.text(700, y, upgrade.title, {
        color: '#e2e8f0',
        fontSize: '20px',
      });
      this.scene.add.text(700, y + 30, `${upgrade.description}`, {
        color: '#94a3b8',
        fontSize: '15px',
      });
      const effectDescription = this.getEffectDescription(upgrade);
      if (effectDescription) {
        this.scene.add.text(
          700,
          y + 48,
          localizationManager.t('hut.bonusLine', { value: effectDescription }),
          {
            color: '#86efac',
            fontSize: '14px',
          },
        );
      }
      this.scene.add.text(
        700,
        y + 66,
        `Цена: ${upgrade.costGold} золота / ${upgrade.costDust} пыли`,
        { color: '#fbbf24', fontSize: '15px' },
      );

      if (purchased) {
        this.scene.add.text(1115, y + 34, 'Куплено', {
          color: '#4ade80',
          fontSize: '16px',
        });
      } else {
        this.scene.add
          .text(1110, y + 34, 'Купить', {
            color: '#d9f99d',
            fontSize: '16px',
            backgroundColor: '#365314',
            padding: { x: 6, y: 4 },
          })
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.handlers.onBuy(upgrade.id));
      }
    });
  }

  private getEffectDescription(upgrade: HutUpgradeDefinition): string | null {
    const recharge = upgrade.effects?.merge?.generatorRechargeMult;
    if (recharge !== undefined && recharge > 0 && recharge !== 1) {
      const percent = Math.round((1 - recharge) * 100);
      if (percent !== 0) {
        return localizationManager.t('hut.effectGeneratorRecharge', {
          value: Math.abs(percent),
        });
      }
    }

    const maxCharges = upgrade.effects?.merge?.generatorMaxChargesAdd;
    if (maxCharges !== undefined && maxCharges !== 0) {
      return localizationManager.t('hut.effectGeneratorCharges', {
        value: maxCharges,
      });
    }

    const defenderDps = upgrade.effects?.raid?.defenderDpsMult;
    if (defenderDps !== undefined && defenderDps !== 1) {
      const percent = Math.round((defenderDps - 1) * 100);
      if (percent !== 0) {
        return localizationManager.t('hut.effectDefenderDps', {
          value: percent,
        });
      }
    }

    const baseHp = upgrade.effects?.raid?.baseHpAdd;
    if (baseHp !== undefined && baseHp !== 0) {
      return localizationManager.t('hut.effectBaseHp', { value: baseHp });
    }

    const spellCooldown = upgrade.effects?.raid?.spellCooldownMult;
    if (
      spellCooldown !== undefined &&
      spellCooldown > 0 &&
      spellCooldown !== 1
    ) {
      const percent = Math.round((1 - spellCooldown) * 100);
      if (percent !== 0) {
        return localizationManager.t('hut.effectSpellCooldown', {
          value: Math.abs(percent),
        });
      }
    }

    return null;
  }
}
