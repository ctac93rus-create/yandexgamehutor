import Phaser from 'phaser';

import type { RaidReward } from '../../systems/raid/RewardCalculator';
import type { RaidResult } from '../../systems/raid/types';

export class RewardModal {
  public constructor(
    scene: Phaser.Scene,
    result: RaidResult,
    baseReward: RaidReward,
    onClaim: (doubled: boolean) => void,
    onDouble: () => void,
  ) {
    const bg = scene.add.rectangle(scene.scale.width / 2, scene.scale.height / 2, 620, 330, 0x111827, 0.95).setDepth(100);
    bg.setStrokeStyle(3, 0x64748b);

    const title = result.win ? 'Победа!' : 'Поражение';
    scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2 - 120, title, { color: '#f8fafc', fontSize: '42px' })
      .setOrigin(0.5)
      .setDepth(101);

    scene.add
      .text(
        scene.scale.width / 2,
        scene.scale.height / 2 - 45,
        `Золото +${baseReward.gold} | Пыль +${baseReward.dust}`,
        { color: '#fde68a', fontSize: '28px' },
      )
      .setOrigin(0.5)
      .setDepth(101);

    scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2, `Предметы: ${baseReward.itemIds.join(', ')}`, {
        color: '#bbf7d0',
        fontSize: '22px',
      })
      .setOrigin(0.5)
      .setDepth(101);

    scene.add
      .text(scene.scale.width / 2 - 120, scene.scale.height / 2 + 90, 'Забрать', {
        color: '#dcfce7',
        fontSize: '26px',
        backgroundColor: '#166534',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => onClaim(false));

    scene.add
      .text(scene.scale.width / 2 + 130, scene.scale.height / 2 + 90, 'Удвоить (rewarded)', {
        color: '#fef9c3',
        fontSize: '24px',
        backgroundColor: '#854d0e',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onDouble);
  }
}
