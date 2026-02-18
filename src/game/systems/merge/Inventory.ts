import type { MergeGrid } from './MergeGrid';
import type { GridPosition } from './types';

export class Inventory {
  public constructor(private readonly grid: MergeGrid) {}

  public placeToFreeCell(itemRuntimeId: string): GridPosition | null {
    const free = this.grid.findFirstFreeCell();
    if (!free) {
      return null;
    }
    this.grid.set(free, itemRuntimeId);
    return free;
  }
}
