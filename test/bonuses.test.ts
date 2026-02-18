import { describe, expect, it } from 'vitest';

import {
  computeBonuses,
  getDefaultBonuses,
} from '../src/game/systems/meta/bonuses';
import type { EconomyConfig } from '../src/game/systems/merge/types';
import { QuestEngine } from '../src/game/systems/quests/QuestEngine';

describe('meta bonuses', () => {
  it('returns defaults for empty purchased upgrades', () => {
    const meta = QuestEngine.defaultState();
    const economy: EconomyConfig = {
      overflowDustPerItem: 2,
      startGold: 100,
      startDust: 0,
      raid: {
        baseGold: 20,
        goldPerKill: 1,
        baseDust: 3,
        dustPerSurvivedHp: 1,
        rewardItems: ['twig'],
      },
      hutUpgrades: [
        {
          id: 'upgrade_1',
          title: 'Upgrade',
          description: 'Desc',
          costGold: 10,
          costDust: 5,
          effects: {
            merge: { generatorRechargeMult: 0.9 },
          },
        },
      ],
    };

    expect(computeBonuses(meta, economy)).toEqual(getDefaultBonuses());
  });

  it('aggregates multipliers and additive effects', () => {
    const meta = QuestEngine.defaultState();
    meta.purchasedUpgradeIds = ['a', 'b', 'c'];

    const economy: EconomyConfig = {
      overflowDustPerItem: 2,
      startGold: 100,
      startDust: 0,
      raid: {
        baseGold: 20,
        goldPerKill: 1,
        baseDust: 3,
        dustPerSurvivedHp: 1,
        rewardItems: ['twig'],
      },
      hutUpgrades: [
        {
          id: 'a',
          title: 'A',
          description: 'A',
          costGold: 10,
          costDust: 0,
          effects: {
            merge: { generatorRechargeMult: 0.9, generatorMaxChargesAdd: 1 },
          },
        },
        {
          id: 'b',
          title: 'B',
          description: 'B',
          costGold: 10,
          costDust: 0,
          effects: {
            raid: { defenderDpsMult: 1.1, baseHpAdd: 10 },
          },
        },
        {
          id: 'c',
          title: 'C',
          description: 'C',
          costGold: 10,
          costDust: 0,
          effects: {
            raid: { spellCooldownMult: 0.9 },
          },
        },
      ],
    };

    expect(computeBonuses(meta, economy)).toEqual({
      merge: {
        generatorRechargeMult: 0.9,
        generatorMaxChargesAdd: 1,
      },
      raid: {
        defenderDpsMult: 1.1,
        baseHpAdd: 10,
        spellCooldownMult: 0.9,
      },
    });
  });
});
