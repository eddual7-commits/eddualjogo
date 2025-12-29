/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - UTILITIES
 * Funções auxiliares e classes úteis
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// VECTOR 2D
// ═══════════════════════════════════════════════════════════════════════════

export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  static from(v: { x: number; y: number }): Vector2 {
    return new Vector2(v.x, v.y);
  }

  static random(): Vector2 {
    const angle = Math.random() * Math.PI * 2;
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }

  static distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return new Vector2(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t
    );
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mul(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  div(scalar: number): this {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    }
    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  normalized(): Vector2 {
    return this.clone().normalize();
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angleTo(v: Vector2): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  distanceTo(v: Vector2): number {
    return Vector2.distance(this, v);
  }

  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }

  floor(): this {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
  }

  round(): this {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  clamp(min: Vector2, max: Vector2): this {
    this.x = clamp(this.x, min.x, max.x);
    this.y = clamp(this.y, min.y, max.y);
    return this;
  }

  equals(v: Vector2, epsilon: number = 0.001): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  return (value - a) / (b - a);
}

export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, t);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RANDOM UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function random(min: number = 0, max: number = 1): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

export function randomBool(chance: number = 0.5): boolean {
  return Math.random() < chance;
}

export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomWeighted<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERLIN NOISE (Simplex-like)
// ═══════════════════════════════════════════════════════════════════════════

export class PerlinNoise {
  private perm: number[] = [];
  
  constructor(seed: number = Math.random() * 10000) {
    this.setSeed(seed);
  }
  
  setSeed(seed: number): void {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    // Shuffle based on seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    this.perm = [...p, ...p];
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    
    const result = lerp(
      lerp(this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y), u),
      lerp(this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
    
    return (result + 1) / 2; // Normalize to 0-1
  }
  
  octave(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    return total / maxValue;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) + (g << 8) + b;
}

export function lerpColor(color1: number, color2: number, t: number): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  return rgbToHex(
    Math.round(lerp(rgb1.r, rgb2.r, t)),
    Math.round(lerp(rgb1.g, rgb2.g, t)),
    Math.round(lerp(rgb1.b, rgb2.b, t))
  );
}

export function darkenColor(color: number, amount: number): number {
  const rgb = hexToRgb(color);
  return rgbToHex(
    Math.max(0, Math.round(rgb.r * (1 - amount))),
    Math.max(0, Math.round(rgb.g * (1 - amount))),
    Math.max(0, Math.round(rgb.b * (1 - amount)))
  );
}

export function lightenColor(color: number, amount: number): number {
  const rgb = hexToRgb(color);
  return rgbToHex(
    Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount)),
    Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount)),
    Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SPATIAL HASH GRID
// ═══════════════════════════════════════════════════════════════════════════

export class SpatialHash<T extends { x: number; y: number; id: number }> {
  private cells: Map<string, Set<T>> = new Map();
  private entityCells: Map<number, string[]> = new Map();
  
  constructor(private cellSize: number = 64) {}
  
  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
  
  insert(entity: T): void {
    const key = this.getKey(entity.x, entity.y);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    
    this.cells.get(key)!.add(entity);
    
    if (!this.entityCells.has(entity.id)) {
      this.entityCells.set(entity.id, []);
    }
    this.entityCells.get(entity.id)!.push(key);
  }
  
  remove(entity: T): void {
    const keys = this.entityCells.get(entity.id) || [];
    
    for (const key of keys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(entity);
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }
    
    this.entityCells.delete(entity.id);
  }
  
  update(entity: T): void {
    this.remove(entity);
    this.insert(entity);
  }
  
  query(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const radiusSq = radius * radius;
    
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        
        if (cell) {
          for (const entity of cell) {
            const dx = entity.x - x;
            const dy = entity.y - y;
            if (dx * dx + dy * dy <= radiusSq) {
              results.push(entity);
            }
          }
        }
      }
    }
    
    return results;
  }
  
  queryRect(x: number, y: number, width: number, height: number): T[] {
    const results: T[] = [];
    
    const minCx = Math.floor(x / this.cellSize);
    const maxCx = Math.floor((x + width) / this.cellSize);
    const minCy = Math.floor(y / this.cellSize);
    const maxCy = Math.floor((y + height) / this.cellSize);
    
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        
        if (cell) {
          for (const entity of cell) {
            if (entity.x >= x && entity.x <= x + width &&
                entity.y >= y && entity.y <= y + height) {
              results.push(entity);
            }
          }
        }
      }
    }
    
    return results;
  }
  
  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }
  
  get size(): number {
    let total = 0;
    for (const cell of this.cells.values()) {
      total += cell.size;
    }
    return total;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OBJECT POOL
// ═══════════════════════════════════════════════════════════════════════════

export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  
  constructor(
    private factory: () => T,
    private reset: (obj: T) => void,
    initialSize: number = 100
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire(): T {
    const obj = this.pool.length > 0 ? this.pool.pop()! : this.factory();
    this.active.add(obj);
    return obj;
  }
  
  release(obj: T): void {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      this.reset(obj);
      this.pool.push(obj);
    }
  }
  
  releaseAll(): void {
    for (const obj of this.active) {
      this.reset(obj);
      this.pool.push(obj);
    }
    this.active.clear();
  }
  
  get activeCount(): number {
    return this.active.size;
  }
  
  get poolSize(): number {
    return this.pool.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT EMITTER
// ═══════════════════════════════════════════════════════════════════════════

export type EventCallback<T = unknown> = (data: T) => void;

export class EventEmitter<T extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Map<keyof T, Set<EventCallback<unknown>>> = new Map();
  
  on<K extends keyof T>(event: K, callback: EventCallback<T[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);
  }
  
  off<K extends keyof T>(event: K, callback: EventCallback<T[K]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback<unknown>);
    }
  }
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }
  
  once<K extends keyof T>(event: K, callback: EventCallback<T[K]>): void {
    const wrapper: EventCallback<T[K]> = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
  
  clear(): void {
    this.listeners.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY QUEUE (for A* pathfinding)
// ═══════════════════════════════════════════════════════════════════════════

export class PriorityQueue<T> {
  private heap: { item: T; priority: number }[] = [];
  
  get length(): number {
    return this.heap.length;
  }
  
  isEmpty(): boolean {
    return this.heap.length === 0;
  }
  
  enqueue(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }
  
  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    
    const result = this.heap[0].item;
    const last = this.heap.pop()!;
    
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    
    return result;
  }
  
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }
  
  private bubbleDown(index: number): void {
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      
      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      
      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      
      if (smallest === index) break;
      
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
  
  clear(): void {
    this.heap = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STRING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(0);
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function generateName(): string {
  const prefixes = ['Ar', 'El', 'Gon', 'Tha', 'Mor', 'Fen', 'Kel', 'Bran', 'Dor', 'Val', 'Zar', 'Kir'];
  const middles = ['a', 'e', 'i', 'o', 'u', 'an', 'en', 'or', 'ir', 'ar', ''];
  const suffixes = ['don', 'wen', 'mir', 'las', 'dor', 'ric', 'gar', 'mund', 'bert', 'wyn', 'thor', 'vald'];
  
  return randomChoice(prefixes) + randomChoice(middles) + randomChoice(suffixes);
}

export function generateFactionName(): string {
  const adjectives = ['Grande', 'Sagrado', 'Antigo', 'Eterno', 'Glorioso', 'Supremo', 'Nobre', 'Dourado'];
  const nouns = ['Reino', 'Império', 'Clã', 'Ordem', 'Liga', 'Aliança', 'Dinastia', 'Confederação'];
  const suffixes = ['do Norte', 'do Sul', 'das Montanhas', 'das Águas', 'dos Ventos', 'do Sol', 'da Lua', ''];
  
  return `${randomChoice(adjectives)} ${randomChoice(nouns)} ${randomChoice(suffixes)}`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// ID GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

let _nextId = 0;

export function generateId(): number {
  return _nextId++;
}

export function resetIdCounter(): void {
  _nextId = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export class Timer {
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isPaused: boolean = false;
  
  start(): void {
    this.startTime = performance.now();
    this.pausedTime = 0;
    this.isPaused = false;
  }
  
  pause(): void {
    if (!this.isPaused) {
      this.pausedTime = this.elapsed;
      this.isPaused = true;
    }
  }
  
  resume(): void {
    if (this.isPaused) {
      this.startTime = performance.now() - this.pausedTime;
      this.isPaused = false;
    }
  }
  
  get elapsed(): number {
    if (this.isPaused) {
      return this.pausedTime;
    }
    return performance.now() - this.startTime;
  }
  
  get elapsedSeconds(): number {
    return this.elapsed / 1000;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RECTANGLE
// ═══════════════════════════════════════════════════════════════════════════

export class Rectangle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0
  ) {}
  
  get left(): number { return this.x; }
  get right(): number { return this.x + this.width; }
  get top(): number { return this.y; }
  get bottom(): number { return this.y + this.height; }
  get centerX(): number { return this.x + this.width / 2; }
  get centerY(): number { return this.y + this.height / 2; }
  
  contains(x: number, y: number): boolean {
    return x >= this.x && x <= this.right && y >= this.y && y <= this.bottom;
  }
  
  intersects(other: Rectangle): boolean {
    return this.x < other.right && this.right > other.x &&
           this.y < other.bottom && this.bottom > other.y;
  }
  
  clone(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height);
  }
  }
