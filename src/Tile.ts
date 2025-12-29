/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - TILE
 * Sistema de tiles com tipos, propriedades e recursos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { 
  TileType, 
  BiomeType, 
  TILE_COLORS, 
  TILE_WALKABLE, 
  TILE_SPEED_MODIFIER,
  WORLD 
} from '../core/Constants';

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE TYPE
// ═══════════════════════════════════════════════════════════════════════════

export enum ResourceType {
  NONE = 0,
  WOOD = 1,
  STONE = 2,
  IRON = 3,
  GOLD = 4,
  FOOD = 5,
  WATER = 6,
  COAL = 7,
  OIL = 8,
  URANIUM = 9,
  CRYSTAL = 10,
}

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  [ResourceType.NONE]: 'Nenhum',
  [ResourceType.WOOD]: 'Madeira',
  [ResourceType.STONE]: 'Pedra',
  [ResourceType.IRON]: 'Ferro',
  [ResourceType.GOLD]: 'Ouro',
  [ResourceType.FOOD]: 'Comida',
  [ResourceType.WATER]: 'Água',
  [ResourceType.COAL]: 'Carvão',
  [ResourceType.OIL]: 'Petróleo',
  [ResourceType.URANIUM]: 'Urânio',
  [ResourceType.CRYSTAL]: 'Cristal',
};

export const RESOURCE_COLORS: Record<ResourceType, number> = {
  [ResourceType.NONE]: 0x000000,
  [ResourceType.WOOD]: 0x8b4513,
  [ResourceType.STONE]: 0x808080,
  [ResourceType.IRON]: 0x434343,
  [ResourceType.GOLD]: 0xffd700,
  [ResourceType.FOOD]: 0xff6b6b,
  [ResourceType.WATER]: 0x4fc3f7,
  [ResourceType.COAL]: 0x1a1a1a,
  [ResourceType.OIL]: 0x2d2d2d,
  [ResourceType.URANIUM]: 0x00ff00,
  [ResourceType.CRYSTAL]: 0xff00ff,
};

// ═══════════════════════════════════════════════════════════════════════════
// TILE DATA
// ═══════════════════════════════════════════════════════════════════════════

export interface TileData {
  x: number;
  y: number;
  type: TileType;
  biome: BiomeType;
  elevation: number;      // 0-1
  moisture: number;       // 0-1
  temperature: number;    // 0-1
  resource: ResourceType;
  resourceAmount: number;
  fertility: number;      // 0-1 (for farming)
  pollution: number;      // 0-1
  explored: boolean;
  ownedBy: number | null; // Faction ID
  buildingId: number | null;
  variant: number;        // Visual variant (0-3)
}

// ═══════════════════════════════════════════════════════════════════════════
// TILE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Tile implements TileData {
  public x: number;
  public y: number;
  public type: TileType;
  public biome: BiomeType;
  public elevation: number;
  public moisture: number;
  public temperature: number;
  public resource: ResourceType;
  public resourceAmount: number;
  public fertility: number;
  public pollution: number;
  public explored: boolean;
  public ownedBy: number | null;
  public buildingId: number | null;
  public variant: number;

  // Cached values
  private _color: number;
  private _walkable: boolean;
  private _speedModifier: number;
  private _isDirty: boolean = true;

  constructor(x: number, y: number, type: TileType = TileType.GRASS) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.biome = BiomeType.PLAINS;
    this.elevation = 0.5;
    this.moisture = 0.5;
    this.temperature = 0.5;
    this.resource = ResourceType.NONE;
    this.resourceAmount = 0;
    this.fertility = 0.5;
    this.pollution = 0;
    this.explored = false;
    this.ownedBy = null;
    this.buildingId = null;
    this.variant = Math.floor(Math.random() * 4);

    this._color = TILE_COLORS[type];
    this._walkable = TILE_WALKABLE[type];
    this._speedModifier = TILE_SPEED_MODIFIER[type];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  get color(): number {
    if (this._isDirty) {
      this.updateCachedValues();
    }
    return this._color;
  }

  get walkable(): boolean {
    if (this._isDirty) {
      this.updateCachedValues();
    }
    return this._walkable;
  }

  get speedModifier(): number {
    if (this._isDirty) {
      this.updateCachedValues();
    }
    return this._speedModifier;
  }

  get worldX(): number {
    return this.x * WORLD.TILE_SIZE;
  }

  get worldY(): number {
    return this.y * WORLD.TILE_SIZE;
  }

  get centerX(): number {
    return this.worldX + WORLD.TILE_SIZE / 2;
  }

  get centerY(): number {
    return this.worldY + WORLD.TILE_SIZE / 2;
  }

  get hasResource(): boolean {
    return this.resource !== ResourceType.NONE && this.resourceAmount > 0;
  }

  get hasBuilding(): boolean {
    return this.buildingId !== null;
  }

  get isOwned(): boolean {
    return this.ownedBy !== null;
  }

  get isWater(): boolean {
    return this.type === TileType.DEEP_WATER || this.type === TileType.SHALLOW_WATER;
  }

  get isForest(): boolean {
    return this.type === TileType.FOREST || this.type === TileType.DENSE_FOREST;
  }

  get isMountain(): boolean {
    return this.type === TileType.MOUNTAIN || this.type === TileType.STONE;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  setType(type: TileType): void {
    if (this.type !== type) {
      this.type = type;
      this._isDirty = true;
    }
  }

  setBiome(biome: BiomeType): void {
    this.biome = biome;
  }

  setResource(type: ResourceType, amount: number): void {
    this.resource = type;
    this.resourceAmount = Math.max(0, Math.min(amount, WORLD.RESOURCE_MAX_PER_TILE));
  }

  setOwner(factionId: number | null): void {
    this.ownedBy = factionId;
  }

  setBuilding(buildingId: number | null): void {
    this.buildingId = buildingId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private updateCachedValues(): void {
    this._color = TILE_COLORS[this.type];
    this._walkable = TILE_WALKABLE[this.type];
    this._speedModifier = TILE_SPEED_MODIFIER[this.type];
    
    // Adjust walkability based on building
    if (this.buildingId !== null) {
      this._walkable = false;
    }
    
    // Adjust speed based on pollution
    if (this.pollution > 0.5) {
      this._speedModifier *= 0.8;
    }
    
    this._isDirty = false;
  }

  harvestResource(amount: number): number {
    const harvested = Math.min(amount, this.resourceAmount);
    this.resourceAmount -= harvested;
    
    if (this.resourceAmount <= 0) {
      this.resource = ResourceType.NONE;
      this.resourceAmount = 0;
    }
    
    return harvested;
  }

  addResource(type: ResourceType, amount: number): void {
    if (this.resource === ResourceType.NONE) {
      this.resource = type;
      this.resourceAmount = amount;
    } else if (this.resource === type) {
      this.resourceAmount = Math.min(
        this.resourceAmount + amount,
        WORLD.RESOURCE_MAX_PER_TILE
      );
    }
  }

  regenerateResource(delta: number): void {
    // Only regenerate natural resources
    if (this.resource === ResourceType.NONE) return;
    if (this.resourceAmount >= WORLD.RESOURCE_MAX_PER_TILE) return;
    
    const regenRate = this.fertility * (1 - this.pollution);
    const regen = (delta / WORLD.RESOURCE_REGEN_TIME) * WORLD.RESOURCE_MAX_PER_TILE * regenRate;
    
    this.resourceAmount = Math.min(
      this.resourceAmount + regen,
      WORLD.RESOURCE_MAX_PER_TILE
    );
  }

  addPollution(amount: number): void {
    this.pollution = Math.min(1, this.pollution + amount);
    this._isDirty = true;
  }

  reducePollution(amount: number): void {
    this.pollution = Math.max(0, this.pollution - amount);
    this._isDirty = true;
  }

  explore(): void {
    this.explored = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTANCE
  // ═══════════════════════════════════════════════════════════════════════════

  distanceTo(other: Tile): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  manhattanDistanceTo(other: Tile): number {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  toData(): TileData {
    return {
      x: this.x,
      y: this.y,
      type: this.type,
      biome: this.biome,
      elevation: this.elevation,
      moisture: this.moisture,
      temperature: this.temperature,
      resource: this.resource,
      resourceAmount: this.resourceAmount,
      fertility: this.fertility,
      pollution: this.pollution,
      explored: this.explored,
      ownedBy: this.ownedBy,
      buildingId: this.buildingId,
      variant: this.variant,
    };
  }

  static fromData(data: TileData): Tile {
    const tile = new Tile(data.x, data.y, data.type);
    tile.biome = data.biome;
    tile.elevation = data.elevation;
    tile.moisture = data.moisture;
    tile.temperature = data.temperature;
    tile.resource = data.resource;
    tile.resourceAmount = data.resourceAmount;
    tile.fertility = data.fertility;
    tile.pollution = data.pollution;
    tile.explored = data.explored;
    tile.ownedBy = data.ownedBy;
    tile.buildingId = data.buildingId;
    tile.variant = data.variant;
    return tile;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TILE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function getTileTypeFromElevationMoisture(
  elevation: number,
  moisture: number,
  temperature: number
): TileType {
  // Deep water
  if (elevation < 0.2) {
    return TileType.DEEP_WATER;
  }
  
  // Shallow water
  if (elevation < 0.3) {
    return TileType.SHALLOW_WATER;
  }
  
  // Beach/Sand
  if (elevation < 0.35) {
    return TileType.SAND;
  }
  
  // High mountains
  if (elevation > 0.85) {
    if (temperature < 0.3) {
      return TileType.SNOW;
    }
    return TileType.MOUNTAIN;
  }
  
  // Hills/Stone
  if (elevation > 0.75) {
    if (temperature < 0.25) {
      return TileType.SNOW;
    }
    return TileType.STONE;
  }
  
  // Cold regions
  if (temperature < 0.2) {
    if (moisture > 0.5) {
      return TileType.ICE;
    }
    return TileType.SNOW;
  }
  
  // Hot regions
  if (temperature > 0.8) {
    if (moisture < 0.2) {
      return TileType.DESERT;
    }
    if (moisture < 0.4) {
      return TileType.SAVANNA;
    }
    // Jungle represented by dense forest
    return TileType.DENSE_FOREST;
  }
  
  // Volcanic (rare, hot + dry + medium elevation)
  if (temperature > 0.7 && moisture < 0.15 && elevation > 0.6) {
    return Math.random() < 0.3 ? TileType.VOLCANIC : TileType.STONE;
  }
  
  // Swamp (wet + low elevation)
  if (moisture > 0.8 && elevation < 0.45) {
    return TileType.SWAMP;
  }
  
  // Temperate regions based on moisture
  if (moisture > 0.7) {
    return TileType.DENSE_FOREST;
  }
  
  if (moisture > 0.5) {
    return TileType.FOREST;
  }
  
  if (moisture > 0.3) {
    return TileType.GRASS;
  }
  
  if (moisture > 0.15) {
    return TileType.SAVANNA;
  }
  
  return TileType.DESERT;
}

export function getBiomeFromTileType(type: TileType): BiomeType {
  switch (type) {
    case TileType.DEEP_WATER:
    case TileType.SHALLOW_WATER:
      return BiomeType.OCEAN;
    case TileType.SAND:
      return BiomeType.BEACH;
    case TileType.GRASS:
      return BiomeType.PLAINS;
    case TileType.FOREST:
    case TileType.DENSE_FOREST:
      return BiomeType.FOREST;
    case TileType.DESERT:
      return BiomeType.DESERT;
    case TileType.SAVANNA:
      return BiomeType.SAVANNA;
    case TileType.SNOW:
    case TileType.ICE:
      return BiomeType.SNOW;
    case TileType.STONE:
    case TileType.MOUNTAIN:
      return BiomeType.MOUNTAINS;
    case TileType.SWAMP:
      return BiomeType.SWAMP;
    case TileType.VOLCANIC:
    case TileType.LAVA:
      return BiomeType.VOLCANIC;
    default:
      return BiomeType.PLAINS;
  }
}

export function getResourceForBiome(biome: BiomeType): { type: ResourceType; chance: number }[] {
  switch (biome) {
    case BiomeType.FOREST:
      return [
        { type: ResourceType.WOOD, chance: 0.4 },
        { type: ResourceType.FOOD, chance: 0.2 },
      ];
    case BiomeType.MOUNTAINS:
      return [
        { type: ResourceType.STONE, chance: 0.5 },
        { type: ResourceType.IRON, chance: 0.2 },
        { type: ResourceType.GOLD, chance: 0.05 },
        { type: ResourceType.COAL, chance: 0.15 },
      ];
    case BiomeType.PLAINS:
      return [
        { type: ResourceType.FOOD, chance: 0.3 },
      ];
    case BiomeType.DESERT:
      return [
        { type: ResourceType.STONE, chance: 0.1 },
        { type: ResourceType.OIL, chance: 0.1 },
        { type: ResourceType.GOLD, chance: 0.05 },
      ];
    case BiomeType.OCEAN:
      return [
        { type: ResourceType.FOOD, chance: 0.3 },
      ];
    case BiomeType.SWAMP:
      return [
        { type: ResourceType.FOOD, chance: 0.2 },
        { type: ResourceType.OIL, chance: 0.15 },
      ];
    case BiomeType.SNOW:
    case BiomeType.TUNDRA:
      return [
        { type: ResourceType.IRON, chance: 0.1 },
        { type: ResourceType.CRYSTAL, chance: 0.05 },
      ];
    case BiomeType.VOLCANIC:
      return [
        { type: ResourceType.IRON, chance: 0.3 },
        { type: ResourceType.CRYSTAL, chance: 0.15 },
        { type: ResourceType.URANIUM, chance: 0.05 },
      ];
    default:
      return [];
  }
  }
