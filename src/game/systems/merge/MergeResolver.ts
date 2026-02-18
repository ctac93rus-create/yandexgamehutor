import type { MergeAttempt, MergeChain, MergeResult } from './types';

export class MergeResolver {
  private readonly orderByItemId = new Map<string, { chainId: string; index: number }>();

  public constructor(chains: MergeChain[]) {
    chains.forEach((chain) => {
      chain.tiers.forEach((itemId, index) => {
        this.orderByItemId.set(itemId, { chainId: chain.chainId, index });
      });
    });
  }

  public canMerge(input: MergeAttempt): MergeResult {
    if (input.sourceId !== input.targetId) {
      return { canMerge: false, nextItemId: null };
    }

    const source = this.orderByItemId.get(input.sourceId);
    if (!source) {
      return { canMerge: false, nextItemId: null };
    }

    const next = [...this.orderByItemId.entries()].find(
      ([, value]) => value.chainId === source.chainId && value.index === source.index + 1,
    );

    return {
      canMerge: Boolean(next),
      nextItemId: next?.[0] ?? null,
    };
  }
}
