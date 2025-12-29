/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - WORLD
 * Geração procedural do mundo, gerenciamento de tiles e chunks
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Container, Graphics } from 'pixi.js';
import { WORLD, TileType, BiomeType, TILE_COLORS } from '../core/Constants';
import { PerlinNoise, random, randomChoice } from '../core/Utils';
import { 
  Tile, 
  ResourceType, 
  getTileTypeFromElevationMoisture, 
  getBiomeFromTileType,
  getResourceForBiome 
} from './Tile';
import { Game } from '../core/Game';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WorldConfig {
  width: number;
  height: number;
  seed?: number;
  islandMode?: boolean;
  resourceDensity?: number;
}

export interface Chunk {
  x: number;
  y: number;
  graphics: Graphics;
  isDirty: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// WORLD CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class World {
  // Dimensions
  public readonly width: number;
  public readonly height: number;
  public readonly seed: number;

  // Tiles
  private tiles: Tile[][];

  // Rendering
  private container: Container;
  private chunks: Map<string, Chunk> = new Map();
  private readonly chunkSize: number = WORLD.CHUNK_SIZE;

  // Noise generators
  private elevationNoise: PerlinNoise;
  private moistureNoise: PerlinNoise;
  private temperatureNoise: PerlinNoise;
  private detailNoise: PerlinNoise;

  // Config
  private islandMode: boolean;
  private resourceDensity: number;

  constructor(config: WorldConfig) {
    this.width = config.width || WORLD.WIDTH;
    this.height = config.height || WORLD.HEIGHT;
    this.seed = config.seed ?? Math.random() * 100000;
    this.islandMode = config.islandMode ?? true;
    this.resourceDensity = config.resourceDensity ?? 0.15;

    // Initialize noise generators
    this.elevationNoise = new PerlinNoise(this.seed);
    this.moistureNoise = new PerlinNoise(this.seed + 1000);
    this.temperatureNoise = new PerlinNoise(this.seed + 2000);
    this.detailNoise = new PerlinNoise(this.seed + 3000);

    // Create container
    this.container = new Container();
    this.container.label = 'world';

    // Initialize tile array
    this.tiles = [];
    for (let x = 0; x < this.width; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.height; y++) {
        this.tiles[x][y] = new Tile(x, y, TileType.GRASS);
      }
    }

    // Generate world
    this.generate();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  generate(): void {
    console.log(`🌍 Generating world (${this.width}x${this.height}) with seed ${this.seed}...`);

    const startTime = performance.now();

    // Generate terrain
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.generateTile(x, y);
      }
    }

    // Generate resources
    this.generateResources();

    // Mark all chunks as dirty
    this.markAllChunksDirty();

    const elapsed = performance.now() - startTime;
    console.log(`✅ World generated in ${elapsed.toFixed(2)}ms`);
  }

  private generateTile(x: number, y: number): void {
    const tile = this.tiles[x][y];

    // Normalized coordinates
    const nx = x / this.width;
    const ny = y / this.height;

    // Generate elevation with multiple octaves
    let elevation = this.elevationNoise.octave(
      x * WORLD.NOISE_SCALE,
      y * WORLD.NOISE_SCALE,
      6,
      0.5
    );

    // Add detail noise
    elevation += this.detailNoise.noise2D(
      x * WORLD.NOISE_SCALE * 4,
      y * WORLD.NOISE_SCALE * 4
    ) * 0.1;

    // Island mode - lower edges
    if (this.islandMode) {
      const distFromCenter = Math.sqrt(
        Math.pow((nx - 0.5) * 2, 2) + Math.pow((ny - 0.5) * 2, 2)
      );
      const falloff = 1 - Math.pow(distFromCenter, 2);
      elevation = elevation * falloff;
    }

    // Clamp elevation
    elevation = Math.max(0, Math.min(1, elevation));

    // Generate moisture
    let moisture = this.moistureNoise.octave(
      x * WORLD.MOISTURE_SCALE,
      y * WORLD.MOISTURE_SCALE,
      4,
      0.6
    );

    // Higher elevation = less moisture (rain shadow)
    moisture *= 1 - elevation * 0.3;
    moisture = Math.max(0, Math.min(1, moisture));

    // Generate temperature
    let temperature = this.temperatureNoise.octave(
      x * WORLD.TEMPERATURE_SCALE,
      y * WORLD.TEMPERATURE_SCALE,
      3,
      0.7
    );

    // Latitude effect (hotter at center, colder at edges)
    const latitudeEffect = 1 - Math.abs(ny - 0.5) * 1.5;
    temperature = temperature * 0.5 + latitudeEffect * 0.5;

    // Higher elevation = colder
    temperature -= elevation * 0.4;
    temperature = Math.max(0, Math.min(1, temperature));

    // Determine tile type
    const tileType = getTileTypeFromElevationMoisture(elevation, moisture, temperature);
    const biome = getBiomeFromTileType(tileType);

    // Set tile properties
    tile.setType(tileType);
    tile.setBiome(biome);
    tile.elevation = elevation;
    tile.moisture = moisture;
    tile.temperature = temperature;
    tile.fertility = this.calculateFertility(tileType, moisture, temperature);
  }

  private calculateFertility(type: TileType, moisture: number, temperature: number): number {
    // Base fertility by tile type
    let fertility = 0;

    switch (type) {
      case TileType.GRASS:
        fertility = 0.8;
        break;
      case TileType.FOREST:
        fertility = 0.6;
        break;
      case TileType.DENSE_FOREST:
        fertility = 0.5;
        break;
      case TileType.SAVANNA:
        fertility = 0.4;
        break;
      case TileType.SWAMP:
        fertility = 0.3;
        break;
      case TileType.SAND:
        fertility = 0.1;
        break;
      default:
        fertility = 0;
    }

    // Modify by moisture and temperature
    fertility *= moisture * 0.5 + 0.5;
    fertility *= 1 - Math.abs(temperature - 0.5);

    return Math.max(0, Math.min(1, fertility));
  }

  private generateResources(): void {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const tile = this.tiles[x][y];
        const resources = getResourceForBiome(tile.biome);

        for (const res of resources) {
          if (Math.random() < res.chance * this.resourceDensity) {
            const amount = Math.floor(random(30, 100));
            tile.setResource(res.type, amount);
            break; // Only one resource per tile
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TILE ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[x][y];
  }

  getTileAtWorld(worldX: number, worldY: number): Tile | null {
    const x = Math.floor(worldX / WORLD.TILE_SIZE);
    const y = Math.floor(worldY / WORLD.TILE_SIZE);
    return this.getTile(x, y);
  }

  setTile(x: number, y: number, type: TileType): void {
    const tile = this.getTile(x, y);
    if (tile) {
      tile.setType(type);
      tile.setBiome(getBiomeFromTileType(type));
      this.markChunkDirty(x, y);
    }
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile ? tile.walkable : false;
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORS
  // ═══════════════════════════════════════════════════════════════════════════

  getNeighbors(x: number, y: number, includeDiagonals: boolean = false): Tile[] {
    const neighbors: Tile[] = [];
    const directions = includeDiagonals
      ? [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
      : [[0, -1], [-1, 0], [1, 0], [0, 1]];

    for (const [dx, dy] of directions) {
      const tile = this.getTile(x + dx, y + dy);
      if (tile) {
        neighbors.push(tile);
      }
    }

    return neighbors;
  }

  getWalkableNeighbors(x: number, y: number, includeDiagonals: boolean = false): Tile[] {
    return this.getNeighbors(x, y, includeDiagonals).filter(t => t.walkable);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINDING
  // ═══════════════════════════════════════════════════════════════════════════

  findTilesInRadius(centerX: number, centerY: number, radius: number): Tile[] {
    const tiles: Tile[] = [];
    const radiusSq = radius * radius;

    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radiusSq) {
          tiles.push(this.tiles[x][y]);
        }
      }
    }

    return tiles;
  }

  findNearestTileOfType(fromX: number, fromY: number, type: TileType, maxRadius: number = 50): Tile | null {
    let nearest: Tile | null = null;
    let nearestDist = Infinity;

    const tiles = this.findTilesInRadius(fromX, fromY, maxRadius);
    
    for (const tile of tiles) {
      if (tile.type === type) {
        const dist = tile.distanceTo(this.tiles[fromX][fromY]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = tile;
        }
      }
    }

    return nearest;
  }

  findNearestResource(fromX: number, fromY: number, resourceType?: ResourceType, maxRadius: number = 50): Tile | null {
    let nearest: Tile | null = null;
    let nearestDist = Infinity;

    const tiles = this.findTilesInRadius(fromX, fromY, maxRadius);
    
    for (const tile of tiles) {
      if (tile.hasResource) {
        if (resourceType === undefined || tile.resource === resourceType) {
          const dist = tile.distanceTo(this.tiles[fromX][fromY]);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = tile;
          }
        }
      }
    }

    return nearest;
  }

  findSpawnLocation(preferredBiome?: BiomeType): Tile | null {
    const candidates: Tile[] = [];

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const tile = this.tiles[x][y];
        if (tile.walkable && !tile.hasBuilding) {
          if (preferredBiome === undefined || tile.biome === preferredBiome) {
            candidates.push(tile);
          }
        }
      }
    }

    if (candidates.length === 0) {
      // Fallback: any walkable tile
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          const tile = this.tiles[x][y];
          if (tile.walkable) {
            candidates.push(tile);
          }
        }
      }
    }

    return candidates.length > 0 ? randomChoice(candidates) : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHUNK RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  private getChunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private markChunkDirty(tileX: number, tileY: number): void {
    const cx = Math.floor(tileX / this.chunkSize);
    const cy = Math.floor(tileY / this.chunkSize);
    const key = this.getChunkKey(cx, cy);
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.isDirty = true;
    }
  }

  private markAllChunksDirty(): void {
    for (const chunk of this.chunks.values()) {
      chunk.isDirty = true;
    }
  }

  private getOrCreateChunk(cx: number, cy: number): Chunk {
    const key = this.getChunkKey(cx, cy);
    
    if (!this.chunks.has(key)) {
      const graphics = new Graphics();
      graphics.x = cx * this.chunkSize * WORLD.TILE_SIZE;
      graphics.y = cy * this.chunkSize * WORLD.TILE_SIZE;
      this.container.addChild(graphics);

      const chunk: Chunk = {
        x: cx,
        y: cy,
        graphics,
        isDirty: true,
      };
      
      this.chunks.set(key, chunk);
    }

    return this.chunks.get(key)!;
  }

  private renderChunk(chunk: Chunk): void {
    const g = chunk.graphics;
    g.clear();

    const startX = chunk.x * this.chunkSize;
    const startY = chunk.y * this.chunkSize;
    const endX = Math.min(startX + this.chunkSize, this.width);
    const endY = Math.min(startY + this.chunkSize, this.height);

    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        const tile = this.tiles[x][y];
        const px = (x - startX) * WORLD.TILE_SIZE;
        const py = (y - startY) * WORLD.TILE_SIZE;

        // Draw tile base
        g.rect(px, py, WORLD.TILE_SIZE, WORLD.TILE_SIZE);
        g.fill({ color: tile.color });

        // Draw tile variation/detail
        this.drawTileDetails(g, tile, px, py);

        // Draw resource indicator
        if (tile.hasResource) {
          this.drawResourceIndicator(g, tile, px, py);
        }
      }
    }

    chunk.isDirty = false;
  }

  private drawTileDetails(g: Graphics, tile: Tile, px: number, py: number): void {
    const size = WORLD.TILE_SIZE;
    const variant = tile.variant;

    switch (tile.type) {
      case TileType.GRASS:
        // Small grass tufts
        g.circle(px + 8 + variant * 3, py + 8, 1);
        g.circle(px + 20 + variant * 2, py + 20, 1);
        g.circle(px + 24 - variant * 2, py + 10, 1);
        g.fill({ color: 0x1e8449, alpha: 0.5 });
        break;

      case TileType.FOREST:
        // Tree dot
        g.circle(px + size / 2, py + size / 2, 4 + variant);
        g.fill({ color: 0x145a32 });
        break;

      case TileType.DENSE_FOREST:
        // Multiple tree dots
        g.circle(px + 8, py + 8, 4);
        g.circle(px + 24, py + 12, 5);
        g.circle(px + 16, py + 24, 4);
        g.fill({ color: 0x0d3d1f });
        break;

      case TileType.SHALLOW_WATER:
        // Wave lines
        g.moveTo(px + 4, py + 10 + variant * 2);
        g.bezierCurveTo(px + 12, py + 6, px + 20, py + 14, px + 28, py + 10);
        g.stroke({ color: 0x5dade2, width: 1, alpha: 0.4 });
        break;

      case TileType.SAND:
        // Sand dots
        for (let i = 0; i < 3; i++) {
          g.circle(
            px + 8 + (variant + i) * 7 % 24,
            py + 8 + (variant + i * 2) * 5 % 24,
            1
          );
        }
        g.fill({ color: 0xd4ac0d, alpha: 0.3 });
        break;

      case TileType.SNOW:
        // Sparkle
        if (variant === 0) {
          g.star(px + 16, py + 16, 4, 2, 1);
          g.fill({ color: 0xffffff, alpha: 0.5 });
        }
        break;

      case TileType.VOLCANIC:
        // Cracks
        g.moveTo(px + 8, py + 8);
        g.lineTo(px + 16 + variant, py + 16);
        g.lineTo(px + 24, py + 12);
        g.stroke({ color: 0xff4500, width: 1, alpha: 0.5 });
        break;

      case TileType.STONE:
      case TileType.MOUNTAIN:
        // Rock texture
        g.circle(px + 10, py + 12, 3);
        g.circle(px + 22, py + 18, 4);
        g.fill({ color: 0x566573, alpha: 0.3 });
        break;
    }
  }

  private drawResourceIndicator(g: Graphics, tile: Tile, px: number, py: number): void {
    const size = 6;
    const x = px + WORLD.TILE_SIZE - size - 2;
    const y = py + 2;

    // Resource icon background
    g.roundRect(x, y, size, size, 1);
    
    // Color based on resource type
    let color = 0x888888;
    switch (tile.resource) {
      case ResourceType.WOOD:
        color = 0x8b4513;
        break;
      case ResourceType.STONE:
        color = 0x808080;
        break;
      case ResourceType.IRON:
        color = 0x434343;
        break;
      case ResourceType.GOLD:
        color = 0xffd700;
        break;
      case ResourceType.FOOD:
        color = 0xff6b6b;
        break;
      case ResourceType.COAL:
        color = 0x1a1a1a;
        break;
      case ResourceType.OIL:
        color = 0x2d2d2d;
        break;
      case ResourceType.CRYSTAL:
        color = 0xff00ff;
        break;
    }
    
    g.fill({ color });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE & RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  update(delta: number): void {
    // Regenerate resources
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const tile = this.tiles[x][y];
        if (tile.hasResource) {
          tile.regenerateResource(delta);
        }
        
        // Slowly reduce pollution
        if (tile.pollution > 0) {
          tile.reducePollution(delta * 0.00001);
        }
      }
    }
  }

  render(camera: { visibleBounds: { x: number; y: number; width: number; height: number } }): void {
    const bounds = camera.visibleBounds;
    const margin = WORLD.TILE_SIZE * 2;

    // Calculate visible chunk range
    const minCx = Math.max(0, Math.floor((bounds.x - margin) / (this.chunkSize * WORLD.TILE_SIZE)));
    const maxCx = Math.min(
      Math.ceil(this.width / this.chunkSize),
      Math.ceil((bounds.x + bounds.width + margin) / (this.chunkSize * WORLD.TILE_SIZE))
    );
    const minCy = Math.max(0, Math.floor((bounds.y - margin) / (this.chunkSize * WORLD.TILE_SIZE)));
    const maxCy = Math.min(
      Math.ceil(this.height / this.chunkSize),
      Math.ceil((bounds.y + bounds.height + margin) / (this.chunkSize * WORLD.TILE_SIZE))
    );

    // Hide all chunks first
    for (const chunk of this.chunks.values()) {
      chunk.graphics.visible = false;
    }

    // Render visible chunks
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const chunk = this.getOrCreateChunk(cx, cy);
        chunk.graphics.visible = true;

        if (chunk.isDirty) {
          this.renderChunk(chunk);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTAINER ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  getContainer(): Container {
    return this.container;
  }

  addToStage(parent: Container): void {
    parent.addChildAt(this.container, 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TERRAFORM
  // ═══════════════════════════════════════════════════════════════════════════

  terraform(centerX: number, centerY: number, radius: number, type: TileType): void {
    const tiles = this.findTilesInRadius(centerX, centerY, radius);
    
    for (const tile of tiles) {
      tile.setType(type);
      tile.setBiome(getBiomeFromTileType(type));
      this.markChunkDirty(tile.x, tile.y);
    }
  }

  raiseElevation(centerX: number, centerY: number, radius: number, amount: number): void {
    const tiles = this.findTilesInRadius(centerX, centerY, radius);
    
    for (const tile of tiles) {
      const dist = Math.sqrt(
        Math.pow(tile.x - centerX, 2) + Math.pow(tile.y - centerY, 2)
      );
      const factor = 1 - dist / radius;
      tile.elevation = Math.min(1, tile.elevation + amount * factor);
      
      // Recalculate tile type
      const newType = getTileTypeFromElevationMoisture(
        tile.elevation,
        tile.moisture,
        tile.temperature
      );
      tile.setType(newType);
      tile.setBiome(getBiomeFromTileType(newType));
      this.markChunkDirty(tile.x, tile.y);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  getStatistics(): {
    totalTiles: number;
    biomeDistribution: Record<BiomeType, number>;
    resourceDistribution: Record<ResourceType, number>;
    averageElevation: number;
    averageMoisture: number;
    averageTemperature: number;
  } {
    const biomeDistribution: Record<number, number> = {};
    const resourceDistribution: Record<number, number> = {};
    let totalElevation = 0;
    let totalMoisture = 0;
    let totalTemperature = 0;

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const tile = this.tiles[x][y];
        
        biomeDistribution[tile.biome] = (biomeDistribution[tile.biome] || 0) + 1;
        
        if (tile.hasResource) {
          resourceDistribution[tile.resource] = (resourceDistribution[tile.resource] || 0) + 1;
        }
        
        totalElevation += tile.elevation;
        totalMoisture += tile.moisture;
        totalTemperature += tile.temperature;
      }
    }

    const totalTiles = this.width * this.height;

    return {
      totalTiles,
      biomeDistribution: biomeDistribution as Record<BiomeType, number>,
      resourceDistribution: resourceDistribution as Record<ResourceType, number>,
      averageElevation: totalElevation / totalTiles,
      averageMoisture: totalMoisture / totalTiles,
      averageTemperature: totalTemperature / totalTiles,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  destroy(): void {
    for (const chunk of this.chunks.values()) {
      chunk.graphics.destroy();
    }
    this.chunks.clear();
    this.container.destroy();
  }
      }
