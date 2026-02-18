import Phaser from 'phaser';

import type { GridPosition, ItemDefinition } from './types';

const CELL_SIZE = 96;

export class ItemEntity {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly label: Phaser.GameObjects.Text;
  public position: GridPosition;

  public constructor(
    private readonly scene: Phaser.Scene,
    public readonly runtimeId: string,
    public item: ItemDefinition,
    position: GridPosition,
    private readonly origin: { x: number; y: number },
  ) {
    this.position = position;
    const world = this.toWorld(position);
    this.sprite = this.scene.add
      .rectangle(world.x, world.y, CELL_SIZE - 10, CELL_SIZE - 10, item.spriteColor)
      .setStrokeStyle(3, 0x0f172a)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.label = this.scene.add
      .text(world.x, world.y, `${item.name}\nT${item.tier}`, {
        color: '#f8fafc',
        fontSize: '15px',
        align: 'center',
      })
      .setOrigin(0.5);
    this.setDepth(2);
  }

  public updateItem(item: ItemDefinition): void {
    this.item = item;
    this.sprite.setFillStyle(item.spriteColor);
    this.label.setText(`${item.name}\nT${item.tier}`);
  }

  public setGridPosition(position: GridPosition): void {
    this.position = position;
    const world = this.toWorld(position);
    this.sprite.setPosition(world.x, world.y);
    this.label.setPosition(world.x, world.y);
  }

  public setWorldPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.label.setPosition(x, y);
  }

  public setDepth(value: number): void {
    this.sprite.setDepth(value);
    this.label.setDepth(value + 1);
  }

  public destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }

  public toWorld(position: GridPosition): { x: number; y: number } {
    return {
      x: this.origin.x + position.col * CELL_SIZE + CELL_SIZE / 2,
      y: this.origin.y + position.row * CELL_SIZE + CELL_SIZE / 2,
    };
  }
}

export const GRID_CELL_SIZE = CELL_SIZE;
