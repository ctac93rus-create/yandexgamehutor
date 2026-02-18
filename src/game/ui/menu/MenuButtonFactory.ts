import Phaser from 'phaser';

export type MenuIconType = 'merge' | 'hut' | 'raid' | 'leaderboard' | 'achievements' | 'progress' | 'settings';

interface MenuButtonOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  icon: MenuIconType;
  onClick: () => void;
}

function drawIcon(graphics: Phaser.GameObjects.Graphics, type: MenuIconType): void {
  graphics.clear();
  graphics.fillStyle(0xe2e8f0, 1);
  graphics.lineStyle(3, 0x0f172a, 1);

  if (type === 'hut') {
    graphics.fillTriangle(-14, 3, 0, -14, 14, 3);
    graphics.fillRect(-12, 3, 24, 14);
    graphics.fillStyle(0x0f172a, 1);
    graphics.fillRect(-3, 8, 6, 9);
    return;
  }

  if (type === 'raid') {
    graphics.lineStyle(4, 0xe2e8f0, 1);
    graphics.beginPath();
    graphics.moveTo(-14, -12);
    graphics.lineTo(14, 12);
    graphics.moveTo(14, -12);
    graphics.lineTo(-14, 12);
    graphics.strokePath();
    return;
  }

  if (type === 'settings') {
    graphics.lineStyle(4, 0xe2e8f0, 1);
    graphics.strokeCircle(0, 0, 11);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const x1 = Math.cos(angle) * 14;
      const y1 = Math.sin(angle) * 14;
      const x2 = Math.cos(angle) * 18;
      const y2 = Math.sin(angle) * 18;
      graphics.beginPath();
      graphics.moveTo(x1, y1);
      graphics.lineTo(x2, y2);
      graphics.strokePath();
    }
    return;
  }

  if (type === 'merge') {
    graphics.fillStyle(0xe2e8f0, 1);
    graphics.fillRect(-12, -12, 12, 12);
    graphics.fillRect(2, -12, 12, 12);
    graphics.fillRect(-5, 2, 10, 10);
    return;
  }

  if (type === 'leaderboard') {
    graphics.fillRect(-14, 4, 7, 10);
    graphics.fillRect(-3, -2, 7, 16);
    graphics.fillRect(8, -8, 7, 22);
    return;
  }

  if (type === 'achievements') {
    graphics.fillStyle(0xfacc15, 1);
    graphics.fillPoints([
      new Phaser.Geom.Point(0, -15),
      new Phaser.Geom.Point(4, -5),
      new Phaser.Geom.Point(15, -4),
      new Phaser.Geom.Point(6, 3),
      new Phaser.Geom.Point(9, 14),
      new Phaser.Geom.Point(0, 8),
      new Phaser.Geom.Point(-9, 14),
      new Phaser.Geom.Point(-6, 3),
      new Phaser.Geom.Point(-15, -4),
      new Phaser.Geom.Point(-4, -5),
    ], true);
    return;
  }

  if (type === 'progress') {
    graphics.lineStyle(4, 0xe2e8f0, 1);
    graphics.strokeRect(-14, -14, 28, 28);
    graphics.beginPath();
    graphics.moveTo(-9, 8);
    graphics.lineTo(-2, 1);
    graphics.lineTo(4, 6);
    graphics.lineTo(10, -6);
    graphics.strokePath();
  }
}

export function createMenuButton(options: MenuButtonOptions): Phaser.GameObjects.Container {
  const { scene, x, y, width, height, label, icon, onClick } = options;
  const container = scene.add.container(x, y);
  const background = scene.add
    .rectangle(0, 0, width, height, 0x0f766e, 0.97)
    .setStrokeStyle(3, 0x5eead4)
    .setInteractive({ useHandCursor: true });
  const iconBg = scene.add.circle(-width * 0.35, 0, 28, 0x0b3a36, 1).setStrokeStyle(2, 0x67e8f9);
  const iconShape = scene.add.graphics({ x: -width * 0.35, y: 0 });
  drawIcon(iconShape, icon);
  const text = scene.add
    .text(-width * 0.23, 0, label, {
      color: '#ecfeff',
      fontSize: '28px',
      fontFamily: 'Arial',
    })
    .setOrigin(0, 0.5);

  container.add([background, iconBg, iconShape, text]);

  const animateTo = (scale: number, duration: number) => {
    scene.tweens.add({
      targets: container,
      scale,
      duration,
      ease: 'Sine.easeOut',
    });
  };

  background.on('pointerover', () => animateTo(1.03, 90));
  background.on('pointerout', () => animateTo(1, 100));
  background.on('pointerdown', () => animateTo(0.96, 70));
  background.on('pointerup', () => {
    scene.tweens.add({
      targets: container,
      scale: 1.06,
      duration: 90,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: onClick,
    });
  });

  return container;
}
