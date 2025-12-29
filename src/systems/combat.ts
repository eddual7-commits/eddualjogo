import { Entity } from '../entities/entity';
import { Creature } from '../entities/creature';
import { Animal } from '../entities/animal';
import { random } from '../core/utils';

export interface CombatResult {
  attacker: Entity;
  defender: Entity;
  damage: number;
  isCritical: boolean;
  isDodged: boolean;
}

/**
 * Sistema de combate
 */
export class CombatSystem {
  private static readonly CRIT_CHANCE = 0.1;
  private static readonly DODGE_CHANCE = 0.05;
  private static readonly CRIT_MULTIPLIER = 2;

  /**
   * Calcula e aplica dano
   */
  static attack(attacker: Entity, defender: Entity): CombatResult {
    let damage = 0;
    let isCritical = false;
    let isDodged = false;

    // Pega stats
    let attackPower = 10;
    let defensePower = 0;

    if (attacker instanceof Creature) {
      attackPower = attacker.attack * attacker.needs.getStatPenalty();
    } else if (attacker instanceof Animal) {
      const stats = { wolf: 12, bear: 25, boar: 15 };
      attackPower = 8;
    }

    if (defender instanceof Creature) {
      defensePower = defender.defense;
    }

    // Dodge check
    if (random() < this.DODGE_CHANCE) {
      isDodged = true;
    } else {
      // Calcula dano
      damage = Math.max(1, attackPower - defensePower / 2);
      
      // Variação
      damage *= random(0.8, 1.2);
      
      // Critical
      if (random() < this.CRIT_CHANCE) {
        damage *= this.CRIT_MULTIPLIER;
        isCritical = true;
      }
      
      damage = Math.floor(damage);
      defender.takeDamage(damage);
    }

    return { attacker, defender, damage, isCritical, isDodged };
  }

  /**
   * Verifica se pode atacar (range)
   */
  static inRange(attacker: Entity, defender: Entity, range: number = 30): boolean {
    return attacker.distanceTo(defender) <= range;
  }

  /**
   * Checa se são inimigos
   */
  static areEnemies(a: Entity, b: Entity): boolean {
    if (a instanceof Creature && b instanceof Creature) {
      // Mesma facção = amigos
      if (a.factionId === b.factionId && a.factionId !== 0) return false;
      // Raças diferentes podem ser hostis
      return a.race !== b.race && random() < 0.3;
    }
    
    if (a instanceof Animal && a.isHostile) return true;
    if (b instanceof Animal && b.isHostile) return true;
    
    return false;
  }
  }
