import Phaser from 'phaser';

import type { HutUpgradeDefinition } from '../../systems/quests/types';

interface HutUpgradesPanelHandlers {
  onBuy: (id: string) => void;
}

export class HutUpgradesPanel {
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly handlers: HutUpgradesPanelHandlers,
  ) {}

  public render(upgrades: HutUpgradeDefinition[], purchasedIds: string[]): void {
    this.scene.add.text(680, 120, 'Апгрейды хутора', { color: '#f8fafc', fontSize: '24px', fontFamily: 'Arial' });

    upgrades.forEach((upgrade, index) => {
      const y = 170 + index * 116;
      const purchased = purchasedIds.includes(upgrade.id);
      this.scene.add.rectangle(940, y + 28, 510, 98, 0x1f2937, 0.75).setStrokeStyle(1, 0x334155);
      this.scene.add.text(700, y, upgrade.title, { color: '#e2e8f0', fontSize: '20px' });
      this.scene.add.text(700, y + 30, `${upgrade.description}`, { color: '#94a3b8', fontSize: '15px' });
      this.scene.add.text(700, y + 58, `Цена: ${upgrade.costGold} золота / ${upgrade.costDust} пыли`, { color: '#fbbf24', fontSize: '15px' });

      if (purchased) {
        this.scene.add.text(1115, y + 34, 'Куплено', { color: '#4ade80', fontSize: '16px' });
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
}
