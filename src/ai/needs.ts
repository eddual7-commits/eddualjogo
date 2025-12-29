import { NEEDS } from '../core/constants';
import { clamp } from '../core/utils';

export interface NeedValues {
  hunger: number;      // 0 = morrendo de fome, 100 = satisfeito
  thirst: number;      // 0 = desidratado, 100 = hidratado
  energy: number;      // 0 = exausto, 100 = energizado
  social: number;      // 0 = solitário, 100 = socialmente satisfeito
  comfort: number;     // 0 = desconfortável, 100 = confortável
  safety: number;      // 0 = em perigo, 100 = seguro
}

export type NeedType = keyof NeedValues;

/**
 * Sistema de necessidades da criatura
 */
export class NeedsSystem {
  private needs: NeedValues;
  private decayMultiplier: number = 1;

  constructor() {
    // Começa com necessidades parcialmente satisfeitas
    this.needs = {
      hunger: 80,
      thirst: 80,
      energy: 100,
      social: 50,
      comfort: 70,
      safety: 100,
    };
  }

  /**
   * Retorna valor de uma necessidade (0-100)
   */
  get(need: NeedType): number {
    return this.needs[need];
  }

  /**
   * Retorna todas as necessidades
   */
  getAll(): NeedValues {
    return { ...this.needs };
  }

  /**
   * Modifica uma necessidade
   */
  modify(need: NeedType, amount: number): void {
    this.needs[need] = clamp(this.needs[need] + amount, 0, 100);
  }

  /**
   * Define valor de uma necessidade
   */
  set(need: NeedType, value: number): void {
    this.needs[need] = clamp(value, 0, 100);
  }

  /**
   * Verifica se necessidade está crítica (< 20)
   */
  isCritical(need: NeedType): boolean {
    return this.needs[need] < 20;
  }

  /**
   * Verifica se necessidade está baixa (< 40)
   */
  isLow(need: NeedType): boolean {
    return this.needs[need] < 40;
  }

  /**
   * Retorna a necessidade mais urgente
   */
  getMostUrgent(): { need: NeedType; value: number } {
    let mostUrgent: NeedType = 'hunger';
    let lowestValue = 100;

    for (const [need, value] of Object.entries(this.needs) as [NeedType, number][]) {
      // Pondera por importância (safety > hunger > thirst > energy > others)
      const weights: Record<NeedType, number> = {
        safety: 1.5,
        hunger: 1.3,
        thirst: 1.4,
        energy: 1.1,
        social: 0.8,
        comfort: 0.7,
      };
      
      const weightedValue = value / weights[need];
      if (weightedValue < lowestValue) {
        lowestValue = weightedValue;
        mostUrgent = need;
      }
    }

    return { need: mostUrgent, value: this.needs[mostUrgent] };
  }

  /**
   * Define multiplicador de decay (ex: 0.5 = decai pela metade)
   */
  setDecayMultiplier(mult: number): void {
    this.decayMultiplier = mult;
  }

  /**
   * Atualiza decay natural das necessidades
   */
  update(delta: number): void {
    const deltaSeconds = delta / 1000;
    
    // Aplica decay baseado nas taxas definidas em constants
    this.needs.hunger -= NEEDS.DECAY_RATE.hunger * deltaSeconds * this.decayMultiplier;
    this.needs.thirst -= NEEDS.DECAY_RATE.thirst * deltaSeconds * this.decayMultiplier;
    this.needs.energy -= NEEDS.DECAY_RATE.energy * deltaSeconds * this.decayMultiplier;
    this.needs.social -= NEEDS.DECAY_RATE.social * deltaSeconds * this.decayMultiplier;
    this.needs.comfort -= NEEDS.DECAY_RATE.comfort * deltaSeconds * this.decayMultiplier;
    
    // Clamp todos os valores
    for (const need of Object.keys(this.needs) as NeedType[]) {
      this.needs[need] = clamp(this.needs[need], 0, 100);
    }
  }

  /**
   * Satisfaz necessidade (comer, beber, dormir, etc)
   */
  satisfy(need: NeedType, amount: number): void {
    this.modify(need, Math.abs(amount));
  }

  /**
   * Retorna penalidade de stats baseada em necessidades baixas
   */
  getStatPenalty(): number {
    let penalty = 1;
    
    if (this.needs.hunger < 30) penalty *= 0.8;
    if (this.needs.hunger < 10) penalty *= 0.5;
    
    if (this.needs.thirst < 30) penalty *= 0.85;
    if (this.needs.thirst < 10) penalty *= 0.4;
    
    if (this.needs.energy < 30) penalty *= 0.9;
    if (this.needs.energy < 10) penalty *= 0.6;
    
    return penalty;
  }

  /**
   * Verifica se está morrendo (alguma necessidade vital em 0)
   */
  isDying(): boolean {
    return this.needs.hunger <= 0 || this.needs.thirst <= 0;
  }

  /**
   * Serializa para save
   */
  serialize(): NeedValues {
    return { ...this.needs };
  }

  /**
   * Carrega de save
   */
  deserialize(data: NeedValues): void {
    this.needs = { ...data };
  }
}
