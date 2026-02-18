export interface GridPosition {
  row: number;
  col: number;
}

export interface GeneratorConfig {
  producesItemId: string;
  maxCharges: number;
  rechargeSeconds: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  tier: number;
  chainId: string;
  spriteColor: number;
  valueDust: number;
  stackable: boolean;
  generator?: GeneratorConfig;
}

export interface MergeChain {
  chainId: string;
  tiers: string[];
}

export interface RaidEconomyConfig {
  baseGold: number;
  goldPerKill: number;
  baseDust: number;
  dustPerSurvivedHp: number;
  rewardItems: string[];
}

export interface EconomyConfig {
  overflowDustPerItem: number;
  startGold: number;
  startDust: number;
  raid: RaidEconomyConfig;
  hutUpgrades?: Array<{
    id: string;
    title: string;
    description: string;
    costGold: number;
    costDust: number;
    unlockFlag?: string;
    unlockChapterId?: string;
    effects?: {
      merge?: {
        generatorRechargeMult?: number;
        generatorMaxChargesAdd?: number;
      };
      raid?: {
        defenderDpsMult?: number;
        baseHpAdd?: number;
        spellCooldownMult?: number;
      };
    };
  }>;
}

export interface SaveState {
  gold: number;
  dust: number;
  updatedAt?: number;
  occupiedCells: Array<{
    row: number;
    col: number;
    itemId: string;
  }>;
  generators: Record<string, { charges: number; lastRefillAt: number }>;
  meta?: import('../quests/types').MetaProgressState;
}

export interface MergeAttempt {
  sourceId: string;
  targetId: string;
}

export interface MergeResult {
  canMerge: boolean;
  nextItemId: string | null;
}
