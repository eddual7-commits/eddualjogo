// ===== ENTIDADES =====
import { Game, TILE_SIZE, CONFIG } from './game';
import { Brain } from './ai';

export enum EntityType {
  HUMAN = 'human',
  ELF = 'elf',
  ORC = 'orc',
  DWARF = 'dwarf',
  WOLF = 'wolf',
  SHEEP = 'sheep',
  BEAR = 'bear',
  DRAGON = 'dragon'
}

const NAMES = {
  human: ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Julia', 'Miguel', 'Sofia', 'Lucas', 'Laura', 'Gabriel', 'Isabella'],
  elf: ['Aelindor', 'Caelynn', 'Thranduil', 'Galadriel', 'Legolas', 'Arwen', 'Erevan', 'Faelyn', 'Sylvara'],
  orc: ['Grok', 'Muzgash', 'Urzul', 'Bogrul', 'Shagrat', 'Ugluk', 'Lurtz', 'Azog', 'Grommash'],
  dwarf: ['Thorin', 'Gimli', 'Balin', 'Dwalin', 'Bifur', 'Bofur', 'Bombur', 'Gloin', 'Oin'],
  wolf: ['Lobo', 'Fenrir', 'Ghost', 'Shadow', 'Fang'],
  sheep: ['Dolly', 'Fluffy', 'Woolly', 'Cotton'],
  bear: ['Urso', 'Bruno', 'Koda'],
  dragon: ['Smaug', 'Balerion', 'Drogon']
};

export interface Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  
  // Info
  name: string;
  age: number;
  
  // Stats
  hp: number;
  maxHp: number;
  hunger: number;
  energy: number;
  social: number;
  
  // Atributos
  strength: number;
  speed: number;
  
  // Personalidade (Big Five)
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  
  // Estado
  state: string;
  thought: string;
  targetX: number | null;
  targetY: number | null;
  targetEntity: number | null;
  stateTimer: number;
  
  // Inventário
  carrying: string | null;
  carryAmount: number;
  
  // Facção
  factionId: number;
  
  // Visual
  dir: number;
  animTime: number;
  scale: number;
  flash: number;
  
  // IA
  brain: Brain;
  
  // Memória
  memories: Memory[];
  relationships: Map<number, number>;
}

interface Memory {
  type: 'danger' | 'food' | 'friend' | 'enemy' | 'trauma';
  x: number;
  y: number;
  entityId?: number;
  intensity: number;
  time: number;
}

interface Faction {
  id: number;
  name: string;
  color: number;
  type: EntityType;
  resources: { wood: number; stone: number; ore: number; food: number };
  relations: Map<number, number>;
}

let nextId = 1;
let nextFactionId = 1;

export class EntityManager {
  game: Game;
  entities: Map<number, Entity> = new Map();
  factions: Map<number, Faction> = new Map();
  
  constructor(game: Game) {
    this.game = game;
  }
  
  spawn(type: EntityType, x: number, y: number): Entity | null {
    if (!this.game.world.isWalkable(x, y)) return null;
    if (this.entities.size >= CONFIG.MAX_ENTITIES) return null;
    
    const isAnimal = ['wolf', 'sheep', 'bear', 'dragon'].includes(type);
    const isCivil = ['human', 'elf', 'orc', 'dwarf'].includes(type);
    
    // Encontra ou cria facção
    let factionId = 0;
    if (isCivil) {
      let faction = Array.from(this.factions.values()).find(f => f.type === type);
      if (!faction) {
        faction = this.createFaction(type);
      }
      factionId = faction.id;
    }
    
    const e: Entity = {
      id: nextId++,
      type,
      x, y,
      vx: 0, vy: 0,
      
      name: NAMES[type]?.[Math.floor(Math.random() * NAMES[type].length)] || 'Criatura',
      age: isAnimal ? Math.random() * 5 : 18 + Math.random() * 20,
      
      hp: 100,
      maxHp: 100,
      hunger: 100,
      energy: 100,
      social: 50,
      
      strength: type === 'orc' ? 15 : type === 'wolf' ? 12 : type === 'bear' ? 20 : type === 'dragon' ? 50 : 8 + Math.random() * 4,
      speed: type === 'elf' ? 2.5 : type === 'dwarf' ? 1.5 : type === 'wolf' ? 3 : 2,
      
      openness: Math.random() * 100,
      conscientiousness: Math.random() * 100,
      extraversion: Math.random() * 100,
      agreeableness: Math.random() * 100,
      neuroticism: Math.random() * 100,
      
      state: 'idle',
      thought: 'Olhando ao redor...',
      targetX: null,
      targetY: null,
      targetEntity: null,
      stateTimer: Math.random() * 2,
      
      carrying: null,
      carryAmount: 0,
      
      factionId,
      
      dir: Math.random() > 0.5 ? 1 : -1,
      animTime: Math.random() * 10,
      scale: 0.3,
      flash: 0,
      
      brain: new Brain(this.game),
      
      memories: [],
      relationships: new Map()
    };
    
    this.entities.set(e.id, e);
    this.game.renderer.createSprite(e);
    this.game.addXP(5);
    
    return e;
  }
  
  createFaction(type: EntityType): Faction {
    const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf39c12, 0x1abc9c, 0xe67e22];
    const faction: Faction = {
      id: nextFactionId++,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}s`,
      color: colors[this.factions.size % colors.length],
      type,
      resources: { wood: 20, stone: 10, ore: 0, food: 30 },
      relations: new Map()
    };
    this.factions.set(faction.id, faction);
    return faction;
  }
  
  get(id: number): Entity | undefined {
    return this.entities.get(id);
  }
  
  getFaction(id: number): Faction | undefined {
    return this.factions.get(id);
  }
  
  update(dt: number) {
    if (dt <= 0) return;
    
    for (const e of this.entities.values()) {
      this.updateEntity(e, dt);
    }
  }
  
  updateEntity(e: Entity, dt: number) {
    // Animação
    e.animTime += dt * 5;
    e.scale = Math.min(1, e.scale + dt * 3);
    e.flash = Math.max(0, e.flash - dt * 4);
    
    // Envelhecimento
    e.age += dt * 0.01;
    
    // Necessidades
    e.hunger -= dt * 0.3;
    e.energy -= dt * 0.1;
    
    if (e.hunger <= 0) {
      e.hp -= dt * 0.5;
      e.thought = '😵 Morrendo de fome!';
    }
    
    // Morte
    if (e.hp <= 0) {
      this.kill(e);
      return;
    }
    
    // Morte por idade
    const maxAge = e.type === 'elf' ? 500 : e.type === 'dwarf' ? 150 : e.type === 'human' ? 70 : 15;
    if (e.age > maxAge) {
      this.kill(e);
      return;
    }
    
    // IA
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      e.brain.decide(e, this);
    }
    e.brain.execute(e, this, dt);
    
    // Movimento
    const nx = e.x + e.vx * dt;
    const ny = e.y + e.vy * dt;
    
    if (this.game.world.isWalkable(nx, ny)) {
      e.x = nx;
      e.y = ny;
    } else {
      e.vx *= -0.5;
      e.vy *= -0.5;
      e.targetX = null;
      e.targetY = null;
    }
    
    // Afogamento
    if (this.game.world.isWater(e.x, e.y)) {
      e.hp -= dt * 10;
      e.thought = '💧 Afogando!';
    }
    
    // Direção
    if (Math.abs(e.vx) > 0.1) {
      e.dir = e.vx > 0 ? 1 : -1;
    }
    
    // Atualiza sprite
    this.game.renderer.updateSprite(e);
  }
  
  kill(e: Entity) {
    this.entities.delete(e.id);
    this.game.renderer.removeSprite(e.id);
    this.game.renderer.spawnParticles(e.x * TILE_SIZE, e.y * TILE_SIZE, 0xff0000, 10);
    
    if (this.game.selectedId === e.id) {
      this.game.selectedId = null;
      this.game.ui.hideInspector();
    }
  }
  
  killAt(x: number, y: number, radius: number) {
    const toKill: Entity[] = [];
    for (const e of this.entities.values()) {
      if (Math.hypot(e.x - x, e.y - y) <= radius) {
        toKill.push(e);
      }
    }
    toKill.forEach(e => this.kill(e));
  }
  
  findAt(x: number, y: number, radius: number): Entity | null {
    let nearest: Entity | null = null;
    let nearestDist = radius;
    
    for (const e of this.entities.values()) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }
    
    return nearest;
  }
  
  findNearby(x: number, y: number, radius: number, filter?: (e: Entity) => boolean): Entity[] {
    const result: Entity[] = [];
    for (const e of this.entities.values()) {
      if (Math.hypot(e.x - x, e.y - y) <= radius) {
        if (!filter || filter(e)) {
          result.push(e);
        }
      }
    }
    return result;
  }
  
  count(type?: EntityType): number {
    if (!type) return this.entities.size;
    let n = 0;
    for (const e of this.entities.values()) {
      if (e.type === type) n++;
    }
    return n;
  }
                                     }
