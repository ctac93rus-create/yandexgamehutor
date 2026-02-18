import { z } from 'zod';

export const generatorConfigSchema = z.object({
  producesItemId: z.string().min(1),
  maxCharges: z.number().int().positive(),
  rechargeSeconds: z.number().positive(),
});

export const itemDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: z.number().int().min(1),
  chainId: z.string().min(1),
  spriteColor: z.number().int().nonnegative(),
  valueDust: z.number().int().nonnegative(),
  stackable: z.boolean(),
  generator: generatorConfigSchema.optional(),
});

export const mergeChainSchema = z.object({
  chainId: z.string().min(1),
  tiers: z.array(z.string().min(1)).min(2),
});

export const raidEconomySchema = z.object({
  baseGold: z.number().int().nonnegative(),
  goldPerKill: z.number().int().nonnegative(),
  baseDust: z.number().int().nonnegative(),
  dustPerSurvivedHp: z.number().int().nonnegative(),
  rewardItems: z.array(z.string().min(1)).min(1),
});

export const economySchema = z.object({
  overflowDustPerItem: z.number().int().nonnegative(),
  startGold: z.number().int().nonnegative(),
  startDust: z.number().int().nonnegative(),
  raid: raidEconomySchema,
});

export const itemsSchema = z.array(itemDefinitionSchema).min(1);
export const mergeChainsSchema = z.array(mergeChainSchema).min(1);
