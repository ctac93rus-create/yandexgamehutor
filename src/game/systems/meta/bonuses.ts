import type { EconomyConfig } from '../merge/types';
import type { MetaProgressState } from '../quests/types';

export interface MetaBonuses {
  merge: {
    generatorRechargeMult: number;
    generatorMaxChargesAdd: number;
  };
  raid: {
    defenderDpsMult: number;
    baseHpAdd: number;
    spellCooldownMult: number;
  };
}

const MULT_MIN = 0.5;
const MULT_MAX = 2;

export function getDefaultBonuses(): MetaBonuses {
  return {
    merge: {
      generatorRechargeMult: 1,
      generatorMaxChargesAdd: 0,
    },
    raid: {
      defenderDpsMult: 1,
      baseHpAdd: 0,
      spellCooldownMult: 1,
    },
  };
}

export function computeBonuses(
  meta: MetaProgressState,
  economy: EconomyConfig,
): MetaBonuses {
  const bonuses = getDefaultBonuses();
  const upgrades = new Map(
    (economy.hutUpgrades ?? []).map((upgrade) => [upgrade.id, upgrade]),
  );

  for (let i = 0; i < meta.purchasedUpgradeIds.length; i += 1) {
    const upgrade = upgrades.get(meta.purchasedUpgradeIds[i]);
    if (!upgrade?.effects) {
      continue;
    }

    const mergeEffects = upgrade.effects.merge;
    if (mergeEffects) {
      bonuses.merge.generatorRechargeMult *=
        mergeEffects.generatorRechargeMult ?? 1;
      bonuses.merge.generatorMaxChargesAdd +=
        mergeEffects.generatorMaxChargesAdd ?? 0;
    }

    const raidEffects = upgrade.effects.raid;
    if (raidEffects) {
      bonuses.raid.defenderDpsMult *= raidEffects.defenderDpsMult ?? 1;
      bonuses.raid.baseHpAdd += raidEffects.baseHpAdd ?? 0;
      bonuses.raid.spellCooldownMult *= raidEffects.spellCooldownMult ?? 1;
    }
  }

  bonuses.merge.generatorRechargeMult = clampMultiplier(
    bonuses.merge.generatorRechargeMult,
  );
  bonuses.raid.defenderDpsMult = clampMultiplier(bonuses.raid.defenderDpsMult);
  bonuses.raid.spellCooldownMult = clampMultiplier(
    bonuses.raid.spellCooldownMult,
  );

  return bonuses;
}

function clampMultiplier(value: number): number {
  return Math.min(MULT_MAX, Math.max(MULT_MIN, value));
}
