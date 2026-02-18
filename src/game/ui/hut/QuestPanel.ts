import Phaser from 'phaser';

import type { QuestSnapshot } from '../../systems/quests/types';

interface QuestPanelHandlers {
  onClaimStory: (id: string) => void;
  onClaimDaily: (id: string) => void;
}

export class QuestPanel {
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly handlers: QuestPanelHandlers,
  ) {}

  public render(snapshot: QuestSnapshot): void {
    const titleStyle = { color: '#f8fafc', fontSize: '24px', fontFamily: 'Arial' };
    const textStyle = { color: '#cbd5e1', fontSize: '18px', fontFamily: 'Arial' };

    this.scene.add.text(40, 120, 'Сюжетные квесты', titleStyle);

    snapshot.story.slice(0, 4).forEach((quest, index) => {
      const y = 160 + index * 62;
      const progress = `${Math.min(quest.stepCurrent, quest.stepTarget)}/${quest.stepTarget}`;
      this.scene.add.text(50, y, `${quest.title}: ${progress}`, textStyle);
      if (quest.completed && !quest.rewardClaimed) {
        this.scene.add
          .text(470, y, 'Забрать', { color: '#86efac', fontSize: '16px', backgroundColor: '#14532d', padding: { x: 6, y: 3 } })
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.handlers.onClaimStory(quest.id));
      }
    });

    this.scene.add.text(40, 440, 'Ежедневные квесты (3 слота)', titleStyle);

    snapshot.daily.forEach((quest, index) => {
      const y = 482 + index * 58;
      const progress = `${Math.min(quest.current, quest.target)}/${quest.target}`;
      this.scene.add.text(50, y, `${quest.title}: ${progress}`, textStyle);
      if (quest.completed && !quest.rewardClaimed) {
        this.scene.add
          .text(470, y, 'Забрать', { color: '#fcd34d', fontSize: '16px', backgroundColor: '#78350f', padding: { x: 6, y: 3 } })
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.handlers.onClaimDaily(quest.id));
      }
    });
  }
}
