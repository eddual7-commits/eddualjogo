// ===== MUNDO / MAPA =====
import { Container, Graphics } from 'pixi.js';
import { Game, TILE_SIZE, CONFIG } from './game';

export type TileType = 'void' | 'water' | 'deepwater' | 'sand' | 'grass' | 'forest' | 'rock' | 'mountain' | 'ore' | 'wall' | 'building';

interface Tile {
  type: TileType;
  resource: number;
}

const COLORS: Record<TileType, number> = {
  void: 0x0a0a1a,
  deepwater: 0x1a3a5c,
  water: 0x2980b9,
  sand: 0xf4d03f,
  grass: 0x27ae60,
  forest: 0x1d7a3f,
  rock: 0x7f8c8d,
  mountain: 0x5d4e37,
  ore: 0x8e44ad,
  wall: 0x5d4037,
  building: 0x8d6e63
};

export class World {
  game: Game;
  size: number;
  tiles: Tile[][] = [];
  container: Container;
  graphics: Graphics;
  
  constructor(game: Game) {
    this.game = game;
    this.size = CONFIG.WORLD_SIZE;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    this.generate();
    this.render();
  }
  
  generate() {
    const cx = this.size / 2;
    const cy = this.size / 2;
    const radius = CONFIG.WORLD_RADIUS;
    
    for (let y = 0; y < this.size; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.size; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        const norm = dist / radius;
        
        let type: TileType = 'void';
        let resource = 0;
        
        if (norm <= 1.0) {
          // Dentro da ilha
          const noise = this.noise(x * 0.1, y * 0.1);
          const noise2 = this.noise(x * 0.05 + 50, y * 0.05 + 50);
          
          if (norm > 0.92) {
            type = 'water';
          } else if (norm > 0.85) {
            type = 'sand';
          } else if (noise > 0.7 && norm < 0.6) {
            type = 'mountain';
          } else if (noise > 0.55 && norm < 0.7) {
            type = 'rock';
            if (Math.random() < 0.1) {
              type = 'ore';
              resource = 50;
            }
          } else if (noise2 > 0.5) {
            type = 'forest';
            resource = 100;
          } else {
            type = 'grass';
          }
        } else if (norm <= 1.1) {
          type = 'water';
        } else if (norm <= 1.2) {
          type = 'deepwater';
        }
        
        this.tiles[y][x] = { type, resource };
      }
    }
  }
  
  noise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }
  
  render() {
    this.graphics.clear();
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        this.drawTile(x, y);
      }
    }
  }
  
  drawTile(x: number, y: number) {
    const tile = this.tiles[y]?.[x];
    if (!tile) return;
    
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const color = COLORS[tile.type];
    
    this.graphics.rect(px, py, TILE_SIZE, TILE_SIZE);
    this.graphics.fill({ color });
    
    // Detalhes
    if (tile.type === 'forest' && tile.resource > 0) {
      // Tronco
      this.graphics.rect(px + 5, py + 8, 2, 4);
      this.graphics.fill({ color: 0x5d4037 });
      // Copa
      this.graphics.circle(px + 6, py + 5, 4);
      this.graphics.fill({ color: 0x2e7d32 });
    } else if (tile.type === 'ore' && tile.resource > 0) {
      this.graphics.circle(px + 4, py + 6, 2);
      this.graphics.circle(px + 8, py + 8, 2);
      this.graphics.fill({ color: 0xaa66ff });
    } else if (tile.type === 'wall') {
      this.graphics.rect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      this.graphics.fill({ color: 0x6d4c41 });
    }
  }
  
  getTile(x: number, y: number): Tile | null {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    return this.tiles[ty]?.[tx] || null;
  }
  
  setTile(x: number, y: number, type: TileType) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (!this.tiles[ty]?.[tx]) return;
    
    this.tiles[ty][tx].type = type;
    this.tiles[ty][tx].resource = type === 'forest' ? 100 : type === 'ore' ? 50 : 0;
    this.drawTile(tx, ty);
  }
  
  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
    const blocked = ['void', 'deepwater', 'water', 'mountain', 'wall'];
    return !blocked.includes(tile.type);
  }
  
  isWater(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile?.type === 'water' || tile?.type === 'deepwater';
  }
  
  crater(x: number, y: number, radius: number) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const tx = Math.floor(x + dx);
          const ty = Math.floor(y + dy);
          if (this.tiles[ty]?.[tx] && this.tiles[ty][tx].type !== 'void') {
            this.tiles[ty][tx].type = 'sand';
            this.tiles[ty][tx].resource = 0;
            this.drawTile(tx, ty);
          }
        }
      }
    }
  }
  
  harvestResource(x: number, y: number, amount: number): number {
    const tile = this.getTile(x, y);
    if (!tile || tile.resource <= 0) return 0;
    
    const harvested = Math.min(amount, tile.resource);
    tile.resource -= harvested;
    
    if (tile.resource <= 0 && tile.type === 'forest') {
      tile.type = 'grass';
      this.drawTile(Math.floor(x), Math.floor(y));
    }
    
    return harvested;
  }
                       }
