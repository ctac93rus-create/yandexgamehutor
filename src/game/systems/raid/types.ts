export interface EnemyDefinition {
  id: string;
  name: string;
  hp: number;
  speed: number;
  rewardGold: number;
  color: number;
}

export interface WaveSpawn {
  atSec: number;
  lane: number;
  enemyId: string;
}

export interface WavesConfig {
  durationSec: number;
  baseHp: number;
  timeline: WaveSpawn[];
}

export interface LaneGeometry {
  index: number;
  spawnX: number;
  baseX: number;
  y: number;
}

export interface EnemyUpdateResult {
  reachedBase: boolean;
  dead: boolean;
}

export interface RaidResult {
  win: boolean;
  kills: number;
  baseHpLeft: number;
  durationSec: number;
}
