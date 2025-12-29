import { Container, Graphics } from 'pixi.js';
import { Vector2, generateId } from '../core/utils';
import { WORLD } from '../core/constants';

export abstract class Entity {
  public readonly id: number;
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  
  public hp: number = 100;
  public maxHp: number = 100;
  public speed: number = 1;
  public isAlive: boolean = true;
  
  protected container: Container;
  protected graphics: Graphics;
  protected size: number = 16;

  constructor(x: number, y: number) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.updatePosition();
  }

  get tileX(): number { return Math.floor(this.x / WORLD.TILE_SIZE); }
  get tileY(): number { return Math.floor(this.y / WORLD.TILE_SIZE); }
  get position(): Vector2 { return new Vector2(this.x, this.y); }

  protected updatePosition(): void {
    this.container.x = this.x;
    this.container.y = this.y;
  }

  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.updatePosition();
  }

  moveBy(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.updatePosition();
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.die();
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  die(): void {
    this.isAlive = false;
  }

  distanceTo(other: Entity): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  abstract update(delta: number): void;
  abstract render(): void;

  getContainer(): Container { return this.container; }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
