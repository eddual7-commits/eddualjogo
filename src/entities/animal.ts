import { Entity } from './entity';
import { AnimalType, ANIMAL_STATS } from '../core/constants';
import { random, Vector2 } from '../core/utils';

export class Animal extends Entity {
  public type: AnimalType;
  public isHostile: boolean;
  public isPredator: boolean;
  
  private targetPos: Vector2 | null = null;
  private wanderTimer: number = 0;
  private fleeFrom: Entity | null = null;

  constructor(x: number, y: number, type: AnimalType) {
    super(x, y);
    this.type = type;
    
    const stats = ANIMAL_STATS[type];
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.isHostile = stats.hostile;
    this.isPredator = stats.predator;
    this.size = type === AnimalType.BEAR ? 20 : type === AnimalType.RABBIT ? 8 : 14;
    
    this.render();
  }

  update(delta: number): void {
    if (!this.isAlive) return;
    
    // Comportamento simples
    if (this.fleeFrom && this.fleeFrom.isAlive) {
      this.fleeFromEntity(delta);
    } else {
      this.wander(delta);
    }
    
    // Aplica movimento
    if (this.vx !== 0 || this.vy !== 0) {
      this.moveBy(this.vx * delta * 0.05, this.vy * delta * 0.05);
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
  }

  private wander(delta: number): void {
    this.wanderTimer -= delta;
    
    if (this.wanderTimer <= 0 || !this.targetPos) {
      this.targetPos = new Vector2(
        this.x + random(-80, 80),
        this.y + random(-80, 80)
      );
      this.wanderTimer = random(3000, 8000);
    }
    
    const dx = this.targetPos.x - this.x;
    const dy = this.targetPos.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      this.vx = (dx / dist) * this.speed * 0.5;
      this.vy = (dy / dist) * this.speed * 0.5;
    } else {
      this.targetPos = null;
    }
  }

  private fleeFromEntity(delta: number): void {
    if (!this.fleeFrom) return;
    
    const dx = this.x - this.fleeFrom.x;
    const dy = this.y - this.fleeFrom.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 200) {
      this.fleeFrom = null;
      return;
    }
    
    this.vx = (dx / dist) * this.speed * 1.5;
    this.vy = (dy / dist) * this.speed * 1.5;
  }

  flee(from: Entity): void {
    if (!this.isHostile) {
      this.fleeFrom = from;
    }
  }

  render(): void {
    this.graphics.clear();
    const h = this.size / 2;
    const color = this.getColor();
    
    // Corpo (elipse horizontal para quadrúpedes)
    this.graphics.ellipse(0, 0, h * 0.7, h * 0.4);
    this.graphics.fill({ color });
    
    // Cabeça
    this.graphics.circle(-h * 0.5, -h * 0.1, h * 0.3);
    this.graphics.fill({ color });
    
    // Olho
    this.graphics.circle(-h * 0.55, -h * 0.15, h * 0.08);
    this.graphics.fill({ color: 0x000000 });
    
    // Indicador de hostil
    if (this.isHostile) {
      this.graphics.circle(0, -h * 0.7, h * 0.12);
      this.graphics.fill({ color: 0xFF0000, alpha: 0.6 });
    }
  }

  private getColor(): number {
    const colors: Record<AnimalType, number> = {
      [AnimalType.WOLF]: 0x696969,
      [AnimalType.BEAR]: 0x8B4513,
      [AnimalType.SHEEP]: 0xFFFAF0,
      [AnimalType.COW]: 0xFFFFFF,
      [AnimalType.CHICKEN]: 0xFFFFFF,
      [AnimalType.FISH]: 0x4169E1,
      [AnimalType.DEER]: 0xD2691E,
      [AnimalType.RABBIT]: 0xD2B48C,
      [AnimalType.BOAR]: 0x4A2C2A,
      [AnimalType.HORSE]: 0x8B4513,
    };
    return colors[this.type];
  }
  }
