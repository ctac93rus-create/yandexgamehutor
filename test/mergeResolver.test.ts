import { describe, expect, it } from 'vitest';

import { MergeResolver } from '../src/game/systems/merge/MergeResolver';

describe('MergeResolver', () => {
  const resolver = new MergeResolver([
    {
      chainId: 'wood',
      tiers: ['twig', 'branch', 'log'],
    },
  ]);

  it('merges identical ids to next tier', () => {
    expect(resolver.canMerge({ sourceId: 'twig', targetId: 'twig' })).toEqual({
      canMerge: true,
      nextItemId: 'branch',
    });
  });

  it('blocks merge for max tier and mixed ids', () => {
    expect(resolver.canMerge({ sourceId: 'log', targetId: 'log' })).toEqual({
      canMerge: false,
      nextItemId: null,
    });
    expect(resolver.canMerge({ sourceId: 'twig', targetId: 'branch' })).toEqual({
      canMerge: false,
      nextItemId: null,
    });
  });
});
