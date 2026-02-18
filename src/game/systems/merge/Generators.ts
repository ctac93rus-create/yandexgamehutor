import type { GeneratorConfig } from './types';

export interface GeneratorState {
  charges: number;
  lastRefillAt: number;
}

export class Generators {
  private readonly state = new Map<string, GeneratorState>();

  public getState(runtimeId: string, config: GeneratorConfig): GeneratorState {
    const existing = this.state.get(runtimeId);
    if (existing) {
      this.refill(runtimeId, config);
      return this.state.get(runtimeId)!;
    }
    const initial: GeneratorState = {
      charges: config.maxCharges,
      lastRefillAt: Date.now(),
    };
    this.state.set(runtimeId, initial);
    return initial;
  }

  public spendCharge(runtimeId: string, config: GeneratorConfig): boolean {
    const state = this.getState(runtimeId, config);
    this.refill(runtimeId, config);
    if (state.charges <= 0) {
      return false;
    }
    state.charges -= 1;
    return true;
  }

  public refill(runtimeId: string, config: GeneratorConfig): void {
    const state = this.state.get(runtimeId);
    if (!state || state.charges >= config.maxCharges) {
      return;
    }

    const now = Date.now();
    const elapsedMs = now - state.lastRefillAt;
    const gain = Math.floor(elapsedMs / (config.rechargeSeconds * 1000));
    if (gain <= 0) {
      return;
    }

    state.charges = Math.min(config.maxCharges, state.charges + gain);
    state.lastRefillAt = now;
  }

  public exportState(): Record<string, GeneratorState> {
    return Object.fromEntries(this.state.entries());
  }

  public importState(input: Record<string, GeneratorState>): void {
    this.state.clear();
    Object.entries(input).forEach(([key, value]) => {
      this.state.set(key, { ...value });
    });
  }
}
