import type { GridPosition } from './types';

export class MergeGrid {
  private readonly cells = new Map<string, string>();

  public constructor(
    public readonly rows: number,
    public readonly cols: number,
  ) {}

  public inBounds(position: GridPosition): boolean {
    return (
      position.row >= 0 &&
      position.row < this.rows &&
      position.col >= 0 &&
      position.col < this.cols
    );
  }

  public keyOf(position: GridPosition): string {
    return `${position.row}:${position.col}`;
  }

  public get(position: GridPosition): string | null {
    if (!this.inBounds(position)) {
      return null;
    }
    return this.cells.get(this.keyOf(position)) ?? null;
  }

  public set(position: GridPosition, itemId: string): boolean {
    if (!this.inBounds(position)) {
      return false;
    }
    this.cells.set(this.keyOf(position), itemId);
    return true;
  }

  public clear(position: GridPosition): void {
    if (!this.inBounds(position)) {
      return;
    }
    this.cells.delete(this.keyOf(position));
  }

  public move(from: GridPosition, to: GridPosition): boolean {
    const current = this.get(from);
    if (!current || !this.inBounds(to)) {
      return false;
    }
    this.clear(from);
    this.set(to, current);
    return true;
  }

  public findFirstFreeCell(): GridPosition | null {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (!this.cells.has(this.keyOf({ row, col }))) {
          return { row, col };
        }
      }
    }
    return null;
  }

  public occupiedCells(): Array<{ key: string; position: GridPosition; itemId: string }> {
    return [...this.cells.entries()].map(([key, itemId]) => {
      const [row, col] = key.split(':').map((value) => Number(value));
      return { key, position: { row, col }, itemId };
    });
  }
}
