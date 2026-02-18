import Phaser from 'phaser';

import { localizationManager } from '../../managers/LocalizationManager';
import type { RaidReward } from '../../systems/raid/RewardCalculator';
import type { RaidResult } from '../../systems/raid/types';

interface RewardReport {
  rewardedMultiplier: number;
  softCapMultiplier: number;
  score: number;
}

export class RewardModal {
  public constructor(
    scene: Phaser.Scene,
    result: RaidResult,
    baseReward: RaidReward,
    report: RewardReport,
    onClaim: (doubled: boolean) => void,
    onDouble: () => void,
  ) {
    const bg = scene.add.rectangle(scene.scale.width / 2, scene.scale.height / 2, 760, 430, 0x111827, 0.95).setDepth(100);
    bg.setStrokeStyle(3, 0x64748b);

    const title = result.win ? localizationManager.t('raid.resultWin') : localizationManager.t('raid.resultLose');
    scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2 - 166, title, { color: '#f8fafc', fontSize: '42px' })
      .setOrigin(0.5)
      .setDepth(101);

    scene.add
      .text(
        scene.scale.width / 2,
        scene.scale.height / 2 - 96,
        localizationManager.t('raid.rewardLine', { gold: baseReward.gold, dust: baseReward.dust }),
        { color: '#fde68a', fontSize: '28px' },
      )
      .setOrigin(0.5)
      .setDepth(101);

    scene.add
      .text(
        scene.scale.width / 2,
        scene.scale.height / 2 - 48,
        localizationManager.t('raid.itemsLine', { value: baseReward.itemIds.join(', ') || '—' }),
        {
          color: '#bbf7d0',
          fontSize: '22px',
        },
      )
      .setOrigin(0.5)
      .setDepth(101);

    scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2 + 8, localizationManager.t('raid.miniReportTitle'), {
        color: '#93c5fd',
        fontSize: '24px',
      })
      .setOrigin(0.5)
      .setDepth(101);

    const reportLines = [
      localizationManager.t('raid.miniReportKills', { value: result.kills }),
      localizationManager.t('raid.miniReportScore', { value: report.score }),
      localizationManager.t('raid.miniReportMultiplier', {
        rewarded: report.rewardedMultiplier.toFixed(1),
        softCap: report.softCapMultiplier.toFixed(2),
      }),
    ].join('\n');

    scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2 + 64, reportLines, {
        color: '#e2e8f0',
        fontSize: '21px',
        align: 'center',
        lineSpacing: 7,
      })
      .setOrigin(0.5)
      .setDepth(101);

    scene.add
      .text(scene.scale.width / 2 - 140, scene.scale.height / 2 + 166, localizationManager.t('raid.claim'), {
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
      .text(scene.scale.width / 2 + 170, scene.scale.height / 2 + 166, localizationManager.t('raid.doubleRewarded'), {
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
