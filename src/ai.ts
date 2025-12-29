// ===== INTELIGÊNCIA ARTIFICIAL =====
import { Game, TILE_SIZE } from './game';
import { Entity, EntityManager, EntityType } from './entities';

// Estados possíveis
export type AIState = 
  | 'idle' 
  | 'wander' 
  | 'seek_food' 
  | 'gather_wood' 
  | 'gather_stone' 
  | 'gather_ore'
  | 'deliver' 
  | 'build' 
  | 'socialize' 
  | 'find_partner' 
  | 'flee' 
  | 'attack' 
  | 'hunt' 
  | 'rest'
  | 'follow';

// Pensamentos por estado
const THOUGHTS: Record<string, string[]> = {
  idle: ['Descansando...', 'Observando...', 'Pensando na vida...', '🤔 Hmm...'],
  wander: ['Explorando...', 'Caminhando...', 'Passeando...', 'Conhecendo o mundo...'],
  seek_food: ['🍖 Com fome!', 'Procurando comida...', 'Preciso comer!', 'Faminto...'],
  gather_wood: ['🪓 Cortando árvore...', 'Coletando madeira...', 'Trabalhando...'],
  gather_stone: ['⛏️ Minerando pedra...', 'Coletando pedras...', 'Quebrando rochas...'],
  gather_ore: ['💎 Minerando minério!', 'Encontrei cristais!', 'Que brilhante!'],
  deliver: ['📦 Entregando...', 'Levando recursos...', 'Voltando pra vila...'],
  build: ['🏠 Construindo!', 'Erguendo estrutura...', 'Quase pronto!'],
  socialize: ['💬 Conversando...', 'Fofocando...', 'Que dia lindo!', 'Conhecendo pessoas...'],
  find_partner: ['💕 Procurando amor...', '❤️ Será o destino?', 'Alguém especial...'],
  flee: ['😱 PERIGO!', 'CORRE!', 'Socorro!', 'Tenho que fugir!'],
  attack: ['⚔️ ATACAR!', 'Pela honra!', 'Morra!', 'Em guarda!'],
  hunt: ['🐺 Caçando...', 'Perseguindo presa...', 'Sinto o cheiro...'],
  rest: ['😴 Cansado...', 'Preciso dormir...', 'Só um cochilo...']
};

export class Brain {
  game: Game;
  
  constructor(game: Game) {
    this.game = game;
  }
  
  // Decide próximo estado
  decide(e: Entity, em: EntityManager) {
    const nearby = em.findNearby(e.x, e.y, 15);
    const isAnimal = ['wolf', 'bear', 'dragon'].includes(e.type);
    const isPrey = ['sheep'].includes(e.type);
    const isCivil = ['human', 'elf', 'orc', 'dwarf'].includes(e.type);
    
    let state: AIState = 'idle';
    let priority = 0;
    
    // ===== ANIMAIS PREDADORES =====
    if (isAnimal) {
      // Fome = caçar
      if (e.hunger < 60) {
        const prey = nearby.find(o => 
          o.id !== e.id && 
          (o.type === 'sheep' || o.type === 'human' || o.type === 'elf' || o.type === 'dwarf')
        );
        if (prey) {
          state = 'hunt';
          e.targetEntity = prey.id;
          priority = 90;
        }
      }
      
      // Senão, vagar
      if (priority < 20) {
        state = 'wander';
        priority = 20;
      }
    }
    
    // ===== PRESAS =====
    if (isPrey) {
      // Foge de predadores
      const predator = nearby.find(o => ['wolf', 'bear', 'dragon', 'orc'].includes(o.type));
      if (predator && Math.hypot(e.x - predator.x, e.y - predator.y) < 10) {
        state = 'flee';
        e.targetEntity = predator.id;
        priority = 100;
      }
      
      // Pasta (procura comida)
      if (priority < 50 && e.hunger < 70) {
        state = 'seek_food';
        priority = 50;
      }
      
      if (priority < 20) {
        state = 'wander';
        priority = 20;
      }
    }
    
    // ===== CIVILIZADOS =====
    if (isCivil) {
      const faction = em.getFaction(e.factionId);
      
      // 1. FUGA (prioridade máxima)
      const threat = nearby.find(o => 
        ['wolf', 'bear', 'dragon'].includes(o.type) ||
        (o.factionId !== e.factionId && o.factionId !== 0 && this.isEnemy(e, o, em))
      );
      if (threat && Math.hypot(e.x - threat.x, e.y - threat.y) < 8) {
        // Covardes fogem, corajosos lutam
        if (e.agreeableness < 30 || e.strength > threat.strength) {
          state = 'attack';
          e.targetEntity = threat.id;
          priority = 95;
        } else {
          state = 'flee';
          e.targetEntity = threat.id;
          priority = 100;
        }
      }
      
      // 2. FOME CRÍTICA
      if (priority < 90 && e.hunger < 30) {
        state = 'seek_food';
        priority = 90;
      }
      
      // 3. ENTREGAR RECURSOS
      if (priority < 80 && e.carrying && e.carryAmount > 0) {
        state = 'deliver';
        priority = 80;
      }
      
      // 4. COLETAR RECURSOS
      if (priority < 70 && !e.carrying && faction) {
        if (faction.resources.food < 30 && e.hunger > 50) {
          state = 'seek_food';
          priority = 70;
        } else if (faction.resources.wood < 50) {
          state = 'gather_wood';
          priority = 65;
        } else if (faction.resources.stone < 40) {
          state = 'gather_stone';
          priority = 60;
        } else if (faction.resources.ore < 20 && this.game.era >= 2) {
          state = 'gather_ore';
          priority = 55;
        }
      }
      
      // 5. CONSTRUIR
      if (priority < 50 && faction && faction.resources.wood >= 30 && faction.resources.stone >= 20) {
        if (Math.random() < 0.1) {
          state = 'build';
          priority = 50;
        }
      }
      
      // 6. REPRODUZIR
      if (priority < 40 && e.age >= 18 && e.age <= 45 && e.hunger > 60) {
        const partner = nearby.find(o =>
          o.type === e.type &&
          o.factionId === e.factionId &&
          o.id !== e.id &&
          o.age >= 18 && o.age <= 45
        );
        if (partner && Math.random() < 0.05) {
          state = 'find_partner';
          e.targetEntity = partner.id;
          priority = 40;
        }
      }
      
      // 7. SOCIALIZAR
      if (priority < 30 && e.social < 40 && e.extraversion > 50) {
        const friend = nearby.find(o => o.factionId === e.factionId && o.id !== e.id);
        if (friend) {
          state = 'socialize';
          e.targetEntity = friend.id;
          priority = 30;
        }
      }
      
      // 8. DESCANSAR
      if (priority < 25 && e.energy < 30) {
        state = 'rest';
        priority = 25;
      }
      
      // 9. VAGAR
      if (priority < 20) {
        state = e.openness > 50 ? 'wander' : 'idle';
        priority = 20;
      }
    }
    
    // Aplica estado
    e.state = state;
    e.stateTimer = 2 + Math.random() * 3;
    e.thought = THOUGHTS[state]?.[Math.floor(Math.random() * THOUGHTS[state].length)] || '...';
  }
  
  // Executa estado atual
  execute(e: Entity, em: EntityManager, dt: number) {
    const speed = e.speed;
    
    switch (e.state) {
      case 'idle':
        e.vx *= 0.9;
        e.vy *= 0.9;
        break;
        
      case 'wander':
        if (!e.targetX || !e.targetY || Math.random() < 0.01) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 5 + Math.random() * 10;
          e.targetX = e.x + Math.cos(angle) * dist;
          e.targetY = e.y + Math.sin(angle) * dist;
        }
        this.moveTo(e, e.targetX, e.targetY, speed * 0.5, dt);
        break;
        
      case 'seek_food':
        const food = this.findResource(e, 'forest');
        if (food) {
          if (Math.hypot(e.x - food.x, e.y - food.y) < 1.5) {
            const harvested = this.game.world.harvestResource(food.x, food.y, 20);
            if (harvested > 0) {
              e.hunger = Math.min(100, e.hunger + harvested * 2);
              e.thought = '😋 Delícia!';
              this.game.renderer.spawnParticles(e.x * TILE_SIZE, e.y * TILE_SIZE, 0x00ff00, 5);
            }
            e.stateTimer = 0;
          } else {
            this.moveTo(e, food.x, food.y, speed, dt);
          }
        } else {
          e.state = 'wander';
        }
        break;
        
      case 'gather_wood':
        const tree = this.findResource(e, 'forest');
        if (tree) {
          if (Math.hypot(e.x - tree.x, e.y - tree.y) < 1.5) {
            const harvested = this.game.world.harvestResource(tree.x, tree.y, 15);
            if (harvested > 0) {
              e.carrying = 'wood';
              e.carryAmount += harvested;
              this.game.renderer.spawnParticles(tree.x * TILE_SIZE, tree.y * TILE_SIZE, 0x8B4513, 5);
            }
            if (e.carryAmount >= 20) e.stateTimer = 0;
          } else {
            this.moveTo(e, tree.x, tree.y, speed, dt);
          }
        } else {
          e.state = 'wander';
        }
        break;
        
      case 'gather_stone':
        const rock = this.findResource(e, 'rock');
        if (rock) {
          if (Math.hypot(e.x - rock.x, e.y - rock.y) < 1.5) {
            e.carrying = 'stone';
            e.carryAmount += 10;
            this.game.renderer.spawnParticles(rock.x * TILE_SIZE, rock.y * TILE_SIZE, 0x888888, 5);
            if (e.carryAmount >= 20) e.stateTimer = 0;
          } else {
            this.moveTo(e, rock.x, rock.y, speed, dt);
          }
        } else {
          e.state = 'wander';
        }
        break;
        
      case 'gather_ore':
        const ore = this.findResource(e, 'ore');
        if (ore) {
          if (Math.hypot(e.x - ore.x, e.y - ore.y) < 1.5) {
            const harvested = this.game.world.harvestResource(ore.x, ore.y, 10);
            if (harvested > 0) {
              e.carrying = 'ore';
              e.carryAmount += harvested;
              this.game.renderer.spawnParticles(ore.x * TILE_SIZE, ore.y * TILE_SIZE, 0xaa66ff, 5);
            }
            if (e.carryAmount >= 15) e.stateTimer = 0;
          } else {
            this.moveTo(e, ore.x, ore.y, speed, dt);
          }
        } else {
          e.state = 'wander';
        }
        break;
        
      case 'deliver':
        // Vai pro centro do mapa (simplificado - idealmente iria pra vila)
        const cx = this.game.world.size / 2;
        const cy = this.game.world.size / 2;
        if (Math.hypot(e.x - cx, e.y - cy) < 5) {
          const faction = em.getFaction(e.factionId);
          if (faction && e.carrying) {
            faction.resources[e.carrying as keyof typeof faction.resources] += e.carryAmount;
            this.game.addXP(e.carryAmount);
            e.thought = '✓ Entregue!';
          }
          e.carrying = null;
          e.carryAmount = 0;
          e.stateTimer = 0;
        } else {
          this.moveTo(e, cx, cy, speed, dt);
        }
        break;
        
      case 'build':
        const faction = em.getFaction(e.factionId);
        if (faction && faction.resources.wood >= 30 && faction.resources.stone >= 20) {
          faction.resources.wood -= 30;
          faction.resources.stone -= 20;
          this.game.world.setTile(e.x, e.y, 'building');
          this.game.addXP(50);
          this.game.renderer.spawnParticles(e.x * TILE_SIZE, e.y * TILE_SIZE, 0xffaa00, 15);
          e.thought = '🏠 Construído!';
          this.game.ui.showMessage(`🏠 ${e.name} construiu!`);
        }
        e.stateTimer = 0;
        break;
        
      case 'socialize':
        const friend = e.targetEntity ? em.get(e.targetEntity) : null;
        if (friend) {
          if (Math.hypot(e.x - friend.x, e.y - friend.y) < 2) {
            e.social = Math.min(100, e.social + dt * 10);
            e.vx *= 0.8;
            e.vy *= 0.8;
          } else {
            this.moveTo(e, friend.x, friend.y, speed * 0.7, dt);
          }
        } else {
          e.stateTimer = 0;
        }
        break;
        
      case 'find_partner':
        const partner = e.targetEntity ? em.get(e.targetEntity) : null;
        if (partner) {
          if (Math.hypot(e.x - partner.x, e.y - partner.y) < 1.5) {
            if (Math.random() < 0.02) {
              // Nasce bebê!
              const baby = em.spawn(e.type, e.x + (Math.random() - 0.5) * 2, e.y + (Math.random() - 0.5) * 2);
              if (baby) {
                baby.age = 0;
                baby.scale = 0.3;
                this.game.renderer.spawnParticles(e.x * TILE_SIZE, e.y * TILE_SIZE, 0xff69b4, 20);
                this.game.addXP(30);
                this.game.ui.showMessage(`👶 ${baby.name} nasceu!`);
              }
              e.stateTimer = 0;
            }
          } else {
            this.moveTo(e, partner.x, partner.y, speed * 0.8, dt);
          }
        } else {
          e.stateTimer = 0;
        }
        break;
        
      case 'flee':
        const threat = e.targetEntity ? em.get(e.targetEntity) : null;
        if (threat) {
          const dx = e.x - threat.x;
          const dy = e.y - threat.y;
          const dist = Math.hypot(dx, dy) || 1;
          this.moveTo(e, e.x + (dx / dist) * 15, e.y + (dy / dist) * 15, speed * 1.5, dt);
          
          // Memória de perigo
          e.memories.push({
            type: 'danger',
            x: threat.x,
            y: threat.y,
            entityId: threat.id,
            intensity: 80,
            time: Date.now()
          });
        } else {
          e.stateTimer = 0;
        }
        break;
        
      case 'attack':
      case 'hunt':
        const target = e.targetEntity ? em.get(e.targetEntity) : null;
        if (target) {
          const dist = Math.hypot(e.x - target.x, e.y - target.y);
          if (dist < 1.2) {
            // Ataca!
            const damage = e.strength * dt * 3;
            target.hp -= damage;
            target.flash = 1;
            this.game.renderer.spawnParticles(target.x * TILE_SIZE, target.y * TILE_SIZE, 0xff0000, 3);
            
            if (target.hp <= 0) {
              e.hunger = Math.min(100, e.hunger + 50);
              e.thought = '😋 Vitória!';
              e.stateTimer = 0;
            }
          } else {
            this.moveTo(e, target.x, target.y, speed * 1.3, dt);
          }
        } else {
          e.stateTimer = 0;
        }
        break;
        
      case 'rest':
        e.vx *= 0.9;
        e.vy *= 0.9;
        e.energy = Math.min(100, e.energy + dt * 5);
        if (e.energy >= 80) e.stateTimer = 0;
        break;
    }
  }
  
  // Move em direção a um ponto
  moveTo(e: Entity, tx: number, ty: number, speed: number, dt: number) {
    // Verifica se destino é válido
    if (!this.game.world.isWalkable(tx, ty)) {
      // Tenta achar caminho alternativo
      const angle = Math.atan2(ty - e.y, tx - e.x);
      for (let offset = 0.5; offset < Math.PI; offset += 0.3) {
        for (const dir of [1, -1]) {
          const newAngle = angle + offset * dir;
          const newX = e.x + Math.cos(newAngle) * 3;
          const newY = e.y + Math.sin(newAngle) * 3;
          if (this.game.world.isWalkable(newX, newY)) {
            tx = newX;
            ty = newY;
            break;
          }
        }
      }
    }
    
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.5) {
      const targetVx = (dx / dist) * speed;
      const targetVy = (dy / dist) * speed;
      e.vx += (targetVx - e.vx) * dt * 8;
      e.vy += (targetVy - e.vy) * dt * 8;
    }
  }
  
  // Encontra recurso mais próximo
  findResource(e: Entity, type: string): { x: number; y: number } | null {
    const world = this.game.world;
    const range = 20;
    let nearest: { x: number; y: number; dist: number } | null = null;
    
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const tx = Math.floor(e.x) + dx;
        const ty = Math.floor(e.y) + dy;
        const tile = world.getTile(tx, ty);
        
        if (tile && tile.type === type && tile.resource > 0) {
          const dist = Math.hypot(dx, dy);
          if (!nearest || dist < nearest.dist) {
            nearest = { x: tx + 0.5, y: ty + 0.5, dist };
          }
        }
      }
    }
    
    return nearest;
  }
  
  // Verifica se é inimigo
  isEnemy(e: Entity, other: Entity, em: EntityManager): boolean {
    if (e.factionId === 0 || other.factionId === 0) return false;
    if (e.factionId === other.factionId) return false;
    
    const faction = em.getFaction(e.factionId);
    if (!faction) return false;
    
    const relation = faction.relations.get(other.factionId) || 0;
    return relation < -50;
  }
  }
