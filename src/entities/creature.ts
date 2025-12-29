import { Graphics } from 'pixi.js';
import { Entity } from './entity';
import { Brain, ActionType, EmotionType } from '../ai/brain';
import { NeedsSystem } from '../ai/needs';
import { Race, Era, RACE_BASE_STATS, RACE_SKIN_COLORS } from '../core/constants';
import { random, randomChoice, Vector2 } from '../core/utils';
import { spriteFactory } from '../render/spritefactory';

export class Creature extends Entity {
  public race: Race;
  public era: Era = Era.PRIMITIVE;
  public age: number = 0;
  public name: string;
  public factionId: number = 0;
  
  public attack: number;
  public defense: number;
  
  public brain: Brain;
  public needs: NeedsSystem;
  
  private targetPos: Vector2 | null = null;
  private wanderTimer: number = 0;
  private skinColor: number;

  constructor(x: number, y: number, race: Race) {
    super(x, y);
    this.race = race;
    this.name = this.generateName();
    
    // Stats da raça
    const stats = RACE_BASE_STATS[race];
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.attack = stats.attack;
    this.defense = stats.defense;
    this.speed = stats.speed;
    this.skinColor = randomChoice(RACE_SKIN_COLORS[race]);
    
    // IA
    this.needs = new NeedsSystem();
    this.brain = new Brain(this.needs);
    
    this.render();
  }

  private generateName(): string {
    const prefixes = ['Ar', 'El', 'Gon', 'Tha', 'Mor', 'Fen', 'Kel', 'Bran', 'Zor', 'Val'];
    const suffixes = ['don', 'wen', 'mir', 'las', 'dor', 'ric', 'gar', 'ion', 'ak', 'un'];
    return randomChoice(prefixes) + randomChoice(suffixes);
  }

  update(delta: number): void {
    if (!this.isAlive) return;
    
    // Atualiza necessidades e IA
    this.needs.update(delta);
    const action = this.brain.update(delta);
    
    // Morre se necessidades críticas
    if (this.needs.isDying()) {
      this.takeDamage(delta * 0.01);
    }
    
    // Executa ação
    this.executeAction(action, delta);
    
    // Aplica velocidade
    if (this.vx !== 0 || this.vy !== 0) {
      this.moveBy(this.vx * delta * 0.05, this.vy * delta * 0.05);
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
    
    this.age += delta * 0.00001;
  }

  private executeAction(action: ActionType, delta: number): void {
    switch (action) {
      case ActionType.WANDER:
        this.wander(delta);
        break;
      case ActionType.SEEK_FOOD:
        this.seekResource('food', delta);
        break;
      case ActionType.SEEK_WATER:
        this.seekResource('water', delta);
        break;
      case ActionType.REST:
        this.rest(delta);
        break;
      case ActionType.FLEE:
        this.flee(delta);
        break;
      case ActionType.IDLE:
      default:
        this.vx = 0;
        this.vy = 0;
        break;
    }
  }

  private wander(delta: number): void {
    this.wanderTimer -= delta;
    
    if (this.wanderTimer <= 0 || !this.targetPos) {
      this.targetPos = new Vector2(
        this.x + random(-100, 100),
        this.y + random(-100, 100)
      );
      this.wanderTimer = random(2000, 5000);
    }
    
    this.moveToward(this.targetPos, delta);
  }

  private seekResource(type: string, delta: number): void {
    // Por enquanto, vagueia procurando
    // TODO: integrar com World para achar recursos
    this.wander(delta);
    
    // Simula encontrar comida/água às vezes
    if (random() < 0.001) {
      if (type === 'food') this.needs.satisfy('hunger', 30);
      if (type === 'water') this.needs.satisfy('thirst', 40);
      this.brain.remember(type + '_source', this.x, this.y);
    }
  }

  private rest(delta: number): void {
    this.vx = 0;
    this.vy = 0;
    this.needs.satisfy('energy', delta * 0.02);
  }

  private flee(delta: number): void {
    const action = this.brain.getCurrentAction();
    if (action.targetId) {
      // Foge na direção oposta (simplificado)
      this.vx = random(-2, 2) * this.speed;
      this.vy = random(-2, 2) * this.speed;
    }
  }

  private moveToward(target: Vector2, delta: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    } else {
      this.targetPos = null;
    }
  }

  render(): void {
    this.graphics.clear();
    const h = this.size / 2;
    
    // Corpo
    this.graphics.ellipse(0, h * 0.3, h * 0.4, h * 0.5);
    this.graphics.fill({ color: this.getBodyColor() });
    
    // Cabeça
    this.graphics.circle(0, -h * 0.3, h * 0.35);
    this.graphics.fill({ color: this.skinColor });
    
    // Olhos
    this.graphics.circle(-h * 0.12, -h * 0.35, h * 0.08);
    this.graphics.circle(h * 0.12, -h * 0.35, h * 0.08);
    this.graphics.fill({ color: 0x000000 });
    
    // Indicador de emoção (pequeno círculo colorido)
    if (this.brain.emotion !== EmotionType.NEUTRAL) {
      this.graphics.circle(0, -h * 0.8, h * 0.15);
      this.graphics.fill({ color: this.brain.getEmotionColor(), alpha: 0.7 });
    }
    
    // Barra de vida se não estiver cheio
    if (this.hp < this.maxHp) {
      const barWidth = this.size;
      const hpPercent = this.hp / this.maxHp;
      this.graphics.rect(-barWidth / 2, -this.size - 4, barWidth, 3);
      this.graphics.fill({ color: 0x000000, alpha: 0.5 });
      this.graphics.rect(-barWidth / 2, -this.size - 4, barWidth * hpPercent, 3);
      this.graphics.fill({ color: hpPercent > 0.3 ? 0x00FF00 : 0xFF0000 });
    }
  }

  private getBodyColor(): number {
    const eraColors: number[] = [
      0x8B4513, 0x8B7355, 0xCD7F32, 0x708090, 0x8B0000,
      0x800080, 0x191970, 0x2F4F4F, 0x1E90FF, 0x00CED1,
      0x4169E1, 0x00FFFF
    ];
    return eraColors[this.era] || 0x8B4513;
  }

  setFaction(factionId: number): void {
    this.factionId = factionId;
  }
      }
