import { Creature } from '../entities/creature';
import { random, randomChoice, generateId } from '../core/utils';

export interface Faction {
  id: number;
  name: string;
  color: number;
  members: Set<number>; // creature ids
  relations: Map<number, number>; // faction id -> relation (-100 a 100)
  territory: Set<string>; // "x,y" tile keys
}

const FACTION_NAMES = [
  'Reino do Sol', 'Clã da Lua', 'Tribo da Montanha', 'Povo do Rio',
  'Império das Sombras', 'Aliança do Norte', 'Confederação do Sul',
  'Ordem da Estrela', 'Legião de Ferro', 'Pacto Ancestral'
];

const FACTION_COLORS = [
  0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF,
  0xFF8C00, 0x8B0000, 0x006400, 0x4B0082, 0xFFD700, 0x4169E1
];

/**
 * Sistema de facções/reinos
 */
export class FactionSystem {
  private factions: Map<number, Faction> = new Map();
  private usedColors: Set<number> = new Set();
  private usedNames: Set<string> = new Set();

  /**
   * Cria nova facção
   */
  createFaction(leader?: Creature): Faction {
    // Escolhe nome e cor únicos
    let name = randomChoice(FACTION_NAMES.filter(n => !this.usedNames.has(n)));
    if (!name) name = `Facção ${this.factions.size + 1}`;
    this.usedNames.add(name);

    let color = randomChoice(FACTION_COLORS.filter(c => !this.usedColors.has(c)));
    if (!color) color = Math.floor(random(0, 0xFFFFFF));
    this.usedColors.add(color);

    const faction: Faction = {
      id: generateId(),
      name,
      color,
      members: new Set(),
      relations: new Map(),
      territory: new Set(),
    };

    this.factions.set(faction.id, faction);

    if (leader) {
      this.addMember(faction.id, leader);
    }

    return faction;
  }

  /**
   * Adiciona membro à facção
   */
  addMember(factionId: number, creature: Creature): void {
    const faction = this.factions.get(factionId);
    if (faction) {
      // Remove da facção anterior
      if (creature.factionId !== 0) {
        this.removeMember(creature.factionId, creature);
      }
      
      faction.members.add(creature.id);
      creature.setFaction(factionId);
    }
  }

  /**
   * Remove membro da facção
   */
  removeMember(factionId: number, creature: Creature): void {
    const faction = this.factions.get(factionId);
    if (faction) {
      faction.members.delete(creature.id);
      creature.setFaction(0);
    }
  }

  /**
   * Retorna facção por ID
   */
  getFaction(id: number): Faction | undefined {
    return this.factions.get(id);
  }

  /**
   * Retorna cor da facção
   */
  getColor(factionId: number): number {
    return this.factions.get(factionId)?.color || 0xFFFFFF;
  }

  /**
   * Define relação entre facções
   */
  setRelation(faction1: number, faction2: number, value: number): void {
    const f1 = this.factions.get(faction1);
    const f2 = this.factions.get(faction2);
    
    if (f1 && f2) {
      const clamped = Math.max(-100, Math.min(100, value));
      f1.relations.set(faction2, clamped);
      f2.relations.set(faction1, clamped);
    }
  }

  /**
   * Retorna relação entre facções
   */
  getRelation(faction1: number, faction2: number): number {
    if (faction1 === faction2) return 100;
    return this.factions.get(faction1)?.relations.get(faction2) || 0;
  }

  /**
   * Verifica se são aliados
   */
  areAllies(faction1: number, faction2: number): boolean {
    return this.getRelation(faction1, faction2) > 50;
  }

  /**
   * Verifica se são inimigos
   */
  areEnemies(faction1: number, faction2: number): boolean {
    return this.getRelation(faction1, faction2) < -50;
  }

  /**
   * Lista todas as facções
   */
  getAll(): Faction[] {
    return Array.from(this.factions.values());
  }

  /**
   * Contagem de membros
   */
  getMemberCount(factionId: number): number {
    return this.factions.get(factionId)?.members.size || 0;
  }

  /**
   * Atualiza (diplomacia automática, etc)
   */
  update(delta: number): void {
    // Relações mudam lentamente com o tempo
    // TODO: eventos diplomáticos
  }
      }
