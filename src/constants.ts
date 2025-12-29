/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - CONSTANTS
 * Todas as constantes e configurações do jogo
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// GAME SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const GAME = {
  NAME: 'EcoBox Ultimate',
  VERSION: '1.0.0',
  TARGET_FPS: 60,
  FIXED_DELTA: 1000 / 60,
  MAX_DELTA: 100,
  DEBUG: false,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// WORLD SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const WORLD = {
  WIDTH: 200,
  HEIGHT: 200,
  TILE_SIZE: 32,
  CHUNK_SIZE: 16,
  
  // Generation
  NOISE_SCALE: 0.02,
  MOISTURE_SCALE: 0.03,
  TEMPERATURE_SCALE: 0.025,
  
  // Resource regeneration (ms)
  RESOURCE_REGEN_TIME: 30000,
  RESOURCE_MAX_PER_TILE: 100,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TILE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export enum TileType {
  DEEP_WATER = 0,
  SHALLOW_WATER = 1,
  SAND = 2,
  GRASS = 3,
  FOREST = 4,
  DENSE_FOREST = 5,
  STONE = 6,
  MOUNTAIN = 7,
  SNOW = 8,
  ICE = 9,
  DESERT = 10,
  SAVANNA = 11,
  SWAMP = 12,
  VOLCANIC = 13,
  LAVA = 14,
  RUINS = 15,
}

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.DEEP_WATER]: 0x1a5276,
  [TileType.SHALLOW_WATER]: 0x2e86ab,
  [TileType.SAND]: 0xf4d03f,
  [TileType.GRASS]: 0x27ae60,
  [TileType.FOREST]: 0x1e8449,
  [TileType.DENSE_FOREST]: 0x145a32,
  [TileType.STONE]: 0x7f8c8d,
  [TileType.MOUNTAIN]: 0x5d6d7e,
  [TileType.SNOW]: 0xecf0f1,
  [TileType.ICE]: 0xd4e6f1,
  [TileType.DESERT]: 0xe59866,
  [TileType.SAVANNA]: 0xd4ac0d,
  [TileType.SWAMP]: 0x1d4d2e,
  [TileType.VOLCANIC]: 0x4a0000,
  [TileType.LAVA]: 0xff4500,
  [TileType.RUINS]: 0x6c6c6c,
};

export const TILE_WALKABLE: Record<TileType, boolean> = {
  [TileType.DEEP_WATER]: false,
  [TileType.SHALLOW_WATER]: true,
  [TileType.SAND]: true,
  [TileType.GRASS]: true,
  [TileType.FOREST]: true,
  [TileType.DENSE_FOREST]: true,
  [TileType.STONE]: true,
  [TileType.MOUNTAIN]: false,
  [TileType.SNOW]: true,
  [TileType.ICE]: true,
  [TileType.DESERT]: true,
  [TileType.SAVANNA]: true,
  [TileType.SWAMP]: true,
  [TileType.VOLCANIC]: true,
  [TileType.LAVA]: false,
  [TileType.RUINS]: true,
};

export const TILE_SPEED_MODIFIER: Record<TileType, number> = {
  [TileType.DEEP_WATER]: 0.0,
  [TileType.SHALLOW_WATER]: 0.5,
  [TileType.SAND]: 0.8,
  [TileType.GRASS]: 1.0,
  [TileType.FOREST]: 0.9,
  [TileType.DENSE_FOREST]: 0.7,
  [TileType.STONE]: 0.95,
  [TileType.MOUNTAIN]: 0.0,
  [TileType.SNOW]: 0.6,
  [TileType.ICE]: 1.2,
  [TileType.DESERT]: 0.7,
  [TileType.SAVANNA]: 0.95,
  [TileType.SWAMP]: 0.4,
  [TileType.VOLCANIC]: 0.8,
  [TileType.LAVA]: 0.0,
  [TileType.RUINS]: 0.9,
};

// ═══════════════════════════════════════════════════════════════════════════
// BIOMES
// ═══════════════════════════════════════════════════════════════════════════

export enum BiomeType {
  OCEAN = 0,
  BEACH = 1,
  PLAINS = 2,
  FOREST = 3,
  JUNGLE = 4,
  DESERT = 5,
  SAVANNA = 6,
  TUNDRA = 7,
  SNOW = 8,
  MOUNTAINS = 9,
  SWAMP = 10,
  VOLCANIC = 11,
}

export const BIOME_NAMES: Record<BiomeType, string> = {
  [BiomeType.OCEAN]: 'Oceano',
  [BiomeType.BEACH]: 'Praia',
  [BiomeType.PLAINS]: 'Planície',
  [BiomeType.FOREST]: 'Floresta',
  [BiomeType.JUNGLE]: 'Selva',
  [BiomeType.DESERT]: 'Deserto',
  [BiomeType.SAVANNA]: 'Savana',
  [BiomeType.TUNDRA]: 'Tundra',
  [BiomeType.SNOW]: 'Neve',
  [BiomeType.MOUNTAINS]: 'Montanhas',
  [BiomeType.SWAMP]: 'Pântano',
  [BiomeType.VOLCANIC]: 'Vulcânico',
};

// ═══════════════════════════════════════════════════════════════════════════
// ERAS
// ═══════════════════════════════════════════════════════════════════════════

export enum Era {
  PRIMITIVE = 0,
  STONE = 1,
  BRONZE = 2,
  IRON = 3,
  MEDIEVAL = 4,
  RENAISSANCE = 5,
  COLONIAL = 6,
  INDUSTRIAL = 7,
  MODERN = 8,
  DIGITAL = 9,
  SPACE = 10,
  SINGULARITY = 11,
}

export const ERA_NAMES: Record<Era, string> = {
  [Era.PRIMITIVE]: 'Era Primitiva',
  [Era.STONE]: 'Era da Pedra',
  [Era.BRONZE]: 'Era do Bronze',
  [Era.IRON]: 'Era do Ferro',
  [Era.MEDIEVAL]: 'Era Medieval',
  [Era.RENAISSANCE]: 'Renascimento',
  [Era.COLONIAL]: 'Era Colonial',
  [Era.INDUSTRIAL]: 'Era Industrial',
  [Era.MODERN]: 'Era Moderna',
  [Era.DIGITAL]: 'Era Digital',
  [Era.SPACE]: 'Era Espacial',
  [Era.SINGULARITY]: 'Singularidade',
};

export const ERA_COLORS: Record<Era, number> = {
  [Era.PRIMITIVE]: 0x8b4513,
  [Era.STONE]: 0x808080,
  [Era.BRONZE]: 0xcd7f32,
  [Era.IRON]: 0x434343,
  [Era.MEDIEVAL]: 0x4a0080,
  [Era.RENAISSANCE]: 0xffd700,
  [Era.COLONIAL]: 0x228b22,
  [Era.INDUSTRIAL]: 0x2f4f4f,
  [Era.MODERN]: 0x4169e1,
  [Era.DIGITAL]: 0x00ff00,
  [Era.SPACE]: 0x9400d3,
  [Era.SINGULARITY]: 0x00ffff,
};

export const ERA_POPULATION_REQUIREMENT: Record<Era, number> = {
  [Era.PRIMITIVE]: 0,
  [Era.STONE]: 10,
  [Era.BRONZE]: 30,
  [Era.IRON]: 60,
  [Era.MEDIEVAL]: 100,
  [Era.RENAISSANCE]: 200,
  [Era.COLONIAL]: 350,
  [Era.INDUSTRIAL]: 500,
  [Era.MODERN]: 750,
  [Era.DIGITAL]: 1000,
  [Era.SPACE]: 1500,
  [Era.SINGULARITY]: 2500,
};

// ═══════════════════════════════════════════════════════════════════════════
// RACES
// ═══════════════════════════════════════════════════════════════════════════

export enum Race {
  HUMAN = 0,
  ELF = 1,
  ORC = 2,
  DWARF = 3,
  VAMPIRE = 4,
  UNDEAD = 5,
  ANGEL = 6,
  DEMON = 7,
}

export const RACE_NAMES: Record<Race, string> = {
  [Race.HUMAN]: 'Humano',
  [Race.ELF]: 'Elfo',
  [Race.ORC]: 'Orc',
  [Race.DWARF]: 'Anão',
  [Race.VAMPIRE]: 'Vampiro',
  [Race.UNDEAD]: 'Morto-Vivo',
  [Race.ANGEL]: 'Anjo',
  [Race.DEMON]: 'Demônio',
};

export const RACE_SKIN_COLORS: Record<Race, number[]> = {
  [Race.HUMAN]: [0xf5d0c5, 0xd4a574, 0xc68642, 0x8d5524, 0x6b3e26],
  [Race.ELF]: [0xf5e6d3, 0xe8d5c4, 0xdcc5b3],
  [Race.ORC]: [0x4a7c4e, 0x3d6640, 0x2d4d30],
  [Race.DWARF]: [0xf5d0c5, 0xd4a574, 0xc68642],
  [Race.VAMPIRE]: [0xe8e8e8, 0xd4d4d4, 0xc0c0c0],
  [Race.UNDEAD]: [0x6b6b6b, 0x4a4a4a, 0x3d5c3d],
  [Race.ANGEL]: [0xfff5ee, 0xffefd5, 0xfffaf0],
  [Race.DEMON]: [0x8b0000, 0xa52a2a, 0xb22222],
};

export const RACE_BASE_STATS: Record<Race, {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  lifespan: number;
}> = {
  [Race.HUMAN]: { hp: 100, attack: 10, defense: 5, speed: 1.0, lifespan: 80 },
  [Race.ELF]: { hp: 80, attack: 12, defense: 4, speed: 1.2, lifespan: 500 },
  [Race.ORC]: { hp: 150, attack: 18, defense: 8, speed: 0.9, lifespan: 50 },
  [Race.DWARF]: { hp: 120, attack: 14, defense: 10, speed: 0.8, lifespan: 200 },
  [Race.VAMPIRE]: { hp: 90, attack: 15, defense: 6, speed: 1.3, lifespan: 1000 },
  [Race.UNDEAD]: { hp: 60, attack: 8, defense: 3, speed: 0.7, lifespan: Infinity },
  [Race.ANGEL]: { hp: 200, attack: 25, defense: 15, speed: 1.5, lifespan: Infinity },
  [Race.DEMON]: { hp: 180, attack: 30, defense: 12, speed: 1.4, lifespan: Infinity },
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMALS
// ═══════════════════════════════════════════════════════════════════════════

export enum AnimalType {
  WOLF = 0,
  BEAR = 1,
  SHEEP = 2,
  COW = 3,
  CHICKEN = 4,
  FISH = 5,
  DEER = 6,
  RABBIT = 7,
  BOAR = 8,
  HORSE = 9,
}

export const ANIMAL_NAMES: Record<AnimalType, string> = {
  [AnimalType.WOLF]: 'Lobo',
  [AnimalType.BEAR]: 'Urso',
  [AnimalType.SHEEP]: 'Ovelha',
  [AnimalType.COW]: 'Vaca',
  [AnimalType.CHICKEN]: 'Galinha',
  [AnimalType.FISH]: 'Peixe',
  [AnimalType.DEER]: 'Cervo',
  [AnimalType.RABBIT]: 'Coelho',
  [AnimalType.BOAR]: 'Javali',
  [AnimalType.HORSE]: 'Cavalo',
};

export const ANIMAL_STATS: Record<AnimalType, {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  hostile: boolean;
  predator: boolean;
}> = {
  [AnimalType.WOLF]: { hp: 40, attack: 12, defense: 3, speed: 1.4, hostile: true, predator: true },
  [AnimalType.BEAR]: { hp: 100, attack: 25, defense: 10, speed: 0.9, hostile: true, predator: true },
  [AnimalType.SHEEP]: { hp: 20, attack: 0, defense: 1, speed: 0.8, hostile: false, predator: false },
  [AnimalType.COW]: { hp: 40, attack: 5, defense: 3, speed: 0.6, hostile: false, predator: false },
  [AnimalType.CHICKEN]: { hp: 10, attack: 0, defense: 0, speed: 0.9, hostile: false, predator: false },
  [AnimalType.FISH]: { hp: 5, attack: 0, defense: 0, speed: 1.0, hostile: false, predator: false },
  [AnimalType.DEER]: { hp: 30, attack: 5, defense: 2, speed: 1.5, hostile: false, predator: false },
  [AnimalType.RABBIT]: { hp: 8, attack: 0, defense: 0, speed: 1.8, hostile: false, predator: false },
  [AnimalType.BOAR]: { hp: 50, attack: 15, defense: 5, speed: 1.0, hostile: true, predator: false },
  [AnimalType.HORSE]: { hp: 60, attack: 8, defense: 4, speed: 2.0, hostile: false, predator: false },
};

// ═══════════════════════════════════════════════════════════════════════════
// BOSSES
// ═══════════════════════════════════════════════════════════════════════════

export enum BossType {
  DRAGON = 0,
  DEMON_LORD = 1,
  TITAN = 2,
  ALIEN_QUEEN = 3,
  LICH_KING = 4,
  KRAKEN = 5,
}

export const BOSS_NAMES: Record<BossType, string> = {
  [BossType.DRAGON]: 'Dragão Ancião',
  [BossType.DEMON_LORD]: 'Lorde Demônio',
  [BossType.TITAN]: 'Titã Primordial',
  [BossType.ALIEN_QUEEN]: 'Rainha Alienígena',
  [BossType.LICH_KING]: 'Rei Lich',
  [BossType.KRAKEN]: 'Kraken',
};

export const BOSS_STATS: Record<BossType, {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  size: number;
}> = {
  [BossType.DRAGON]: { hp: 5000, attack: 150, defense: 50, speed: 1.2, size: 4 },
  [BossType.DEMON_LORD]: { hp: 8000, attack: 200, defense: 70, speed: 1.0, size: 3 },
  [BossType.TITAN]: { hp: 15000, attack: 300, defense: 100, speed: 0.5, size: 6 },
  [BossType.ALIEN_QUEEN]: { hp: 6000, attack: 180, defense: 60, speed: 1.5, size: 3 },
  [BossType.LICH_KING]: { hp: 4000, attack: 120, defense: 40, speed: 0.8, size: 2 },
  [BossType.KRAKEN]: { hp: 10000, attack: 250, defense: 80, speed: 0.7, size: 5 },
};

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════════════════

export const CAMERA = {
  MIN_ZOOM: 0.2,
  MAX_ZOOM: 3.0,
  DEFAULT_ZOOM: 1.0,
  ZOOM_SPEED: 0.1,
  PAN_SPEED: 10,
  SMOOTHING: 0.1,
  EDGE_SCROLL_MARGIN: 50,
  EDGE_SCROLL_SPEED: 8,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════

export const INPUT = {
  DOUBLE_CLICK_TIME: 300,
  LONG_PRESS_TIME: 500,
  DRAG_THRESHOLD: 10,
  PINCH_ZOOM_SPEED: 0.01,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY
// ═══════════════════════════════════════════════════════════════════════════

export const ENTITY = {
  BASE_SIZE: 16,
  MAX_ENTITIES: 5000,
  UPDATE_RADIUS: 100,
  VISION_RANGE: 8,
  INTERACTION_RANGE: 1.5,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// NEEDS (0-100)
// ═══════════════════════════════════════════════════════════════════════════

export const NEEDS = {
  MAX: 100,
  MIN: 0,
  CRITICAL_THRESHOLD: 20,
  LOW_THRESHOLD: 40,
  DECAY_RATE: {
    hunger: 0.5,      // per second
    thirst: 0.7,
    energy: 0.3,
    social: 0.1,
    comfort: 0.2,
  },
  DEATH_THRESHOLD: 0,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// EMOTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const EMOTIONS = {
  DECAY_RATE: 0.02,   // per second
  MAX: 100,
  MIN: -100,
  NEUTRAL: 0,
  TRIGGER_THRESHOLDS: {
    happiness: 50,
    sadness: -30,
    anger: 40,
    fear: 30,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// COMBAT
// ═══════════════════════════════════════════════════════════════════════════

export const COMBAT = {
  BASE_CRIT_CHANCE: 0.05,
  BASE_CRIT_MULTIPLIER: 2.0,
  BASE_DODGE_CHANCE: 0.1,
  ATTACK_COOLDOWN: 1000,  // ms
  DAMAGE_VARIANCE: 0.2,   // ±20%
  ARMOR_REDUCTION_CAP: 0.75,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const FACTION_COLORS = [
  0xe74c3c, // Red
  0x3498db, // Blue
  0x2ecc71, // Green
  0xf39c12, // Orange
  0x9b59b6, // Purple
  0x1abc9c, // Teal
  0xe91e63, // Pink
  0x00bcd4, // Cyan
  0xff5722, // Deep Orange
  0x795548, // Brown
] as const;

export const FACTION = {
  MIN_DISTANCE: 30,
  TERRITORY_RADIUS: 20,
  MAX_FACTIONS: 10,
  STARTING_POPULATION: 5,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DIPLOMACY
// ═══════════════════════════════════════════════════════════════════════════

export enum DiplomacyState {
  WAR = -2,
  HOSTILE = -1,
  NEUTRAL = 0,
  FRIENDLY = 1,
  ALLIED = 2,
}

// ═══════════════════════════════════════════════════════════════════════════
// DISASTERS
// ═══════════════════════════════════════════════════════════════════════════

export enum DisasterType {
  EARTHQUAKE = 0,
  VOLCANO = 1,
  TSUNAMI = 2,
  TORNADO = 3,
  METEOR = 4,
  PLAGUE = 5,
  DEMON_INVASION = 6,
  ZOMBIE_OUTBREAK = 7,
  DROUGHT = 8,
  FLOOD = 9,
  BLIZZARD = 10,
  SOLAR_FLARE = 11,
}

export const DISASTER_NAMES: Record<DisasterType, string> = {
  [DisasterType.EARTHQUAKE]: 'Terremoto',
  [DisasterType.VOLCANO]: 'Erupção Vulcânica',
  [DisasterType.TSUNAMI]: 'Tsunami',
  [DisasterType.TORNADO]: 'Tornado',
  [DisasterType.METEOR]: 'Meteoro',
  [DisasterType.PLAGUE]: 'Praga',
  [DisasterType.DEMON_INVASION]: 'Invasão Demoníaca',
  [DisasterType.ZOMBIE_OUTBREAK]: 'Apocalipse Zumbi',
  [DisasterType.DROUGHT]: 'Seca',
  [DisasterType.FLOOD]: 'Inundação',
  [DisasterType.BLIZZARD]: 'Nevasca',
  [DisasterType.SOLAR_FLARE]: 'Tempestade Solar',
};

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS (God Powers)
// ═══════════════════════════════════════════════════════════════════════════

export enum ToolType {
  SELECT = 0,
  INSPECT = 1,
  SPAWN_CREATURE = 2,
  SPAWN_ANIMAL = 3,
  SPAWN_BOSS = 4,
  PLACE_TILE = 5,
  TERRAFORM_RAISE = 6,
  TERRAFORM_LOWER = 7,
  BLESS = 8,
  CURSE = 9,
  SMITE = 10,
  HEAL = 11,
  FIRE = 12,
  ICE = 13,
  LIGHTNING = 14,
  EARTHQUAKE = 15,
  SPAWN_RESOURCE = 16,
  DELETE = 17,
  POSSESS = 18,
}

export const TOOL_NAMES: Record<ToolType, string> = {
  [ToolType.SELECT]: 'Selecionar',
  [ToolType.INSPECT]: 'Inspecionar',
  [ToolType.SPAWN_CREATURE]: 'Criar Criatura',
  [ToolType.SPAWN_ANIMAL]: 'Criar Animal',
  [ToolType.SPAWN_BOSS]: 'Invocar Boss',
  [ToolType.PLACE_TILE]: 'Colocar Tile',
  [ToolType.TERRAFORM_RAISE]: 'Elevar Terreno',
  [ToolType.TERRAFORM_LOWER]: 'Baixar Terreno',
  [ToolType.BLESS]: 'Abençoar',
  [ToolType.CURSE]: 'Amaldiçoar',
  [ToolType.SMITE]: 'Punir',
  [ToolType.HEAL]: 'Curar',
  [ToolType.FIRE]: 'Fogo',
  [ToolType.ICE]: 'Gelo',
  [ToolType.LIGHTNING]: 'Raio',
  [ToolType.EARTHQUAKE]: 'Terremoto',
  [ToolType.SPAWN_RESOURCE]: 'Criar Recurso',
  [ToolType.DELETE]: 'Deletar',
  [ToolType.POSSESS]: 'Possuir',
};

export const TOOL_ICONS: Record<ToolType, string> = {
  [ToolType.SELECT]: '👆',
  [ToolType.INSPECT]: '🔍',
  [ToolType.SPAWN_CREATURE]: '🚶',
  [ToolType.SPAWN_ANIMAL]: '🐺',
  [ToolType.SPAWN_BOSS]: '🐉',
  [ToolType.PLACE_TILE]: '🟫',
  [ToolType.TERRAFORM_RAISE]: '⬆️',
  [ToolType.TERRAFORM_LOWER]: '⬇️',
  [ToolType.BLESS]: '👼',
  [ToolType.CURSE]: '👹',
  [ToolType.SMITE]: '⚡',
  [ToolType.HEAL]: '❤️',
  [ToolType.FIRE]: '🔥',
  [ToolType.ICE]: '❄️',
  [ToolType.LIGHTNING]: '🌩️',
  [ToolType.EARTHQUAKE]: '🌋',
  [ToolType.SPAWN_RESOURCE]: '💎',
  [ToolType.DELETE]: '💀',
  [ToolType.POSSESS]: '👁️',
};

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION SPEEDS
// ═══════════════════════════════════════════════════════════════════════════

export const SPEEDS = [0, 1, 2, 5, 10, 50, 100] as const;
export const SPEED_LABELS = ['⏸️', '1x', '2x', '5x', '10x', '50x', '100x'] as const;

// ═══════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════

export const COLORS = {
  // UI Colors
  UI_BACKGROUND: 0x1a1a2e,
  UI_PANEL: 0x16213e,
  UI_ACCENT: 0x4ecdc4,
  UI_TEXT: 0xffffff,
  UI_TEXT_SECONDARY: 0xaaaaaa,
  UI_SUCCESS: 0x2ecc71,
  UI_WARNING: 0xf39c12,
  UI_DANGER: 0xe74c3c,
  UI_INFO: 0x3498db,
  
  // Health bar colors
  HEALTH_HIGH: 0x2ecc71,
  HEALTH_MEDIUM: 0xf39c12,
  HEALTH_LOW: 0xe74c3c,
  HEALTH_BACKGROUND: 0x333333,
  
  // Selection
  SELECTION: 0xffff00,
  HOVER: 0x88ff88,
  
  // Effects
  FIRE: 0xff4500,
  ICE: 0x00bfff,
  LIGHTNING: 0xffff00,
  MAGIC: 0xff00ff,
  HOLY: 0xffffd0,
  DARK: 0x4a0080,
  POISON: 0x00ff00,
  BLOOD: 0x8b0000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════════════════

export const PARTICLES = {
  MAX_PARTICLES: 2000,
  POOL_SIZE: 500,
  
  BLOOD: {
    count: 8,
    speed: 3,
    lifetime: 500,
    size: 3,
    gravity: 0.3,
  },
  
  FIRE: {
    count: 12,
    speed: 2,
    lifetime: 800,
    size: 5,
    gravity: -0.1,
  },
  
  SMOKE: {
    count: 6,
    speed: 1,
    lifetime: 1200,
    size: 8,
    gravity: -0.05,
  },
  
  MAGIC: {
    count: 15,
    speed: 2,
    lifetime: 600,
    size: 4,
    gravity: 0,
  },
  
  DEBRIS: {
    count: 10,
    speed: 4,
    lifetime: 700,
    size: 4,
    gravity: 0.4,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO (Placeholder for future)
// ═══════════════════════════════════════════════════════════════════════════

export const AUDIO = {
  MASTER_VOLUME: 0.7,
  MUSIC_VOLUME: 0.5,
  SFX_VOLUME: 0.8,
  AMBIENT_VOLUME: 0.4,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Z-INDEX LAYERS
// ═══════════════════════════════════════════════════════════════════════════

export const LAYERS = {
  TERRAIN: 0,
  RESOURCES: 1,
  BUILDINGS: 2,
  SHADOWS: 3,
  ENTITIES: 4,
  EFFECTS: 5,
  PROJECTILES: 6,
  PARTICLES: 7,
  UI_WORLD: 8,
  UI_OVERLAY: 9,
} as const;
