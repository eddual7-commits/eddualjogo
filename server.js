const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ==================== CONFIGURAÇÕES DO MUNDO ====================
const WORLD_WIDTH = 300;
const WORLD_HEIGHT = 150;
const TILE_SIZE = 16;
const SPAWN_X = Math.floor(WORLD_WIDTH / 2);

// Tipos de blocos
const TILES = {
    AIR: 0,
    DIRT: 1,
    GRASS: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    COAL: 6,
    IRON: 7,
    GOLD: 8,
    DIAMOND: 9,
    SAND: 10,
    COBBLESTONE: 13,
    PLANKS: 14,
    TORCH: 15,
    BEDROCK: 19,
    COPPER: 20,
    SILVER: 21,
    PLATFORM: 25
};

// Propriedades dos blocos
const TILE_PROPS = {
    [TILES.AIR]: { solid: false, hardness: 0, drops: null },
    [TILES.DIRT]: { solid: true, hardness: 1, drops: TILES.DIRT },
    [TILES.GRASS]: { solid: true, hardness: 1, drops: TILES.DIRT },
    [TILES.STONE]: { solid: true, hardness: 3, drops: TILES.COBBLESTONE },
    [TILES.WOOD]: { solid: true, hardness: 2, drops: TILES.WOOD },
    [TILES.LEAVES]: { solid: false, hardness: 0.5, drops: null },
    [TILES.COAL]: { solid: true, hardness: 3, drops: TILES.COAL },
    [TILES.IRON]: { solid: true, hardness: 4, drops: TILES.IRON },
    [TILES.GOLD]: { solid: true, hardness: 4, drops: TILES.GOLD },
    [TILES.DIAMOND]: { solid: true, hardness: 5, drops: TILES.DIAMOND },
    [TILES.SAND]: { solid: true, hardness: 1, drops: TILES.SAND },
    [TILES.COBBLESTONE]: { solid: true, hardness: 3, drops: TILES.COBBLESTONE },
    [TILES.PLANKS]: { solid: true, hardness: 2, drops: TILES.PLANKS },
    [TILES.TORCH]: { solid: false, hardness: 0, drops: TILES.TORCH },
    [TILES.BEDROCK]: { solid: true, hardness: Infinity, drops: null },
    [TILES.COPPER]: { solid: true, hardness: 3, drops: TILES.COPPER },
    [TILES.SILVER]: { solid: true, hardness: 4, drops: TILES.SILVER },
    [TILES.PLATFORM]: { solid: false, hardness: 1, drops: TILES.PLATFORM, platform: true }
};

// ==================== STORAGE ====================
const servers = new Map();
const players = new Map();

// ==================== GERAÇÃO DO MUNDO ====================
function generateWorld() {
    console.log('Gerando mundo...');
    
    const world = {
        tiles: [],
        background: [],
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT
    };
    
    // Inicializa arrays
    for (let x = 0; x < WORLD_WIDTH; x++) {
        world.tiles[x] = [];
        world.background[x] = [];
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            world.tiles[x][y] = TILES.AIR;
            world.background[x][y] = TILES.AIR;
        }
    }
    
    // Gera altura do terreno
    const surfaceHeight = [];
    let height = WORLD_HEIGHT * 0.35;
    
    for (let x = 0; x < WORLD_WIDTH; x++) {
        height += (Math.random() - 0.5) * 2;
        height = Math.max(WORLD_HEIGHT * 0.25, Math.min(WORLD_HEIGHT * 0.45, height));
        surfaceHeight[x] = Math.floor(height);
    }
    
    // Suaviza terreno
    for (let i = 0; i < 3; i++) {
        for (let x = 1; x < WORLD_WIDTH - 1; x++) {
            surfaceHeight[x] = Math.floor((surfaceHeight[x-1] + surfaceHeight[x] + surfaceHeight[x+1]) / 3);
        }
    }
    
    // Preenche terreno
    for (let x = 0; x < WORLD_WIDTH; x++) {
        const surface = surfaceHeight[x];
        
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (y < surface) {
                world.tiles[x][y] = TILES.AIR;
            } else if (y === surface) {
                world.tiles[x][y] = TILES.GRASS;
            } else if (y < surface + 5) {
                world.tiles[x][y] = TILES.DIRT;
            } else if (y >= WORLD_HEIGHT - 1) {
                world.tiles[x][y] = TILES.BEDROCK;
            } else {
                world.tiles[x][y] = TILES.STONE;
            }
            
            if (y > surface) {
                world.background[x][y] = TILES.DIRT;
            }
        }
    }
    
    // Gera cavernas
    generateCaves(world, surfaceHeight);
    
    // Gera minérios
    generateOres(world, surfaceHeight);
    
    // Gera árvores
    generateTrees(world, surfaceHeight);
    
    console.log('Mundo gerado com sucesso!');
    return world;
}

function generateCaves(world, surfaceHeight) {
    const numCaves = 30;
    
    for (let i = 0; i < numCaves; i++) {
        let x = Math.floor(Math.random() * WORLD_WIDTH);
        let y = Math.floor(surfaceHeight[SPAWN_X] + 15 + Math.random() * 80);
        
        const length = 30 + Math.floor(Math.random() * 100);
        let dirX = Math.random() - 0.5;
        let dirY = Math.random() - 0.3;
        
        for (let j = 0; j < length; j++) {
            const radius = 2 + Math.floor(Math.random() * 3);
            
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (dx*dx + dy*dy <= radius*radius) {
                        const nx = Math.floor(x + dx);
                        const ny = Math.floor(y + dy);
                        
                        if (nx > 0 && nx < WORLD_WIDTH - 1 && ny > surfaceHeight[nx] + 3 && ny < WORLD_HEIGHT - 1) {
                            if (world.tiles[nx][ny] !== TILES.BEDROCK) {
                                world.tiles[nx][ny] = TILES.AIR;
                            }
                        }
                    }
                }
            }
            
            dirX += (Math.random() - 0.5) * 0.3;
            dirY += (Math.random() - 0.5) * 0.3;
            dirX = Math.max(-1, Math.min(1, dirX));
            dirY = Math.max(-0.5, Math.min(0.8, dirY));
            
            x += dirX * 2;
            y += dirY * 2;
            
            if (x < 5 || x > WORLD_WIDTH - 5 || y > WORLD_HEIGHT - 5) break;
        }
    }
}

function generateOres(world, surfaceHeight) {
    const avgSurface = surfaceHeight[SPAWN_X];
    
    const ores = [
        { type: TILES.COAL, minDepth: 0, maxDepth: 0.9, chance: 0.01, veinSize: [3, 8] },
        { type: TILES.COPPER, minDepth: 0.1, maxDepth: 0.7, chance: 0.008, veinSize: [3, 6] },
        { type: TILES.IRON, minDepth: 0.2, maxDepth: 0.8, chance: 0.006, veinSize: [2, 5] },
        { type: TILES.SILVER, minDepth: 0.4, maxDepth: 0.9, chance: 0.004, veinSize: [2, 4] },
        { type: TILES.GOLD, minDepth: 0.5, maxDepth: 0.95, chance: 0.003, veinSize: [2, 4] },
        { type: TILES.DIAMOND, minDepth: 0.8, maxDepth: 0.98, chance: 0.001, veinSize: [1, 3] }
    ];
    
    const undergroundHeight = WORLD_HEIGHT - avgSurface;
    
    for (const ore of ores) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let y = avgSurface; y < WORLD_HEIGHT - 1; y++) {
                const depth = (y - avgSurface) / undergroundHeight;
                
                if (depth >= ore.minDepth && depth <= ore.maxDepth) {
                    if (world.tiles[x][y] === TILES.STONE && Math.random() < ore.chance) {
                        const veinSize = ore.veinSize[0] + Math.floor(Math.random() * (ore.veinSize[1] - ore.veinSize[0]));
                        
                        let vx = x, vy = y;
                        for (let v = 0; v < veinSize; v++) {
                            if (vx >= 0 && vx < WORLD_WIDTH && vy >= 0 && vy < WORLD_HEIGHT - 1) {
                                if (world.tiles[vx][vy] === TILES.STONE) {
                                    world.tiles[vx][vy] = ore.type;
                                }
                            }
                            vx += Math.floor(Math.random() * 3) - 1;
                            vy += Math.floor(Math.random() * 3) - 1;
                        }
                    }
                }
            }
        }
    }
}

function generateTrees(world, surfaceHeight) {
    for (let x = 5; x < WORLD_WIDTH - 5; x++) {
        if (Math.random() < 0.1) {
            const surface = surfaceHeight[x];
            
            if (world.tiles[x][surface] === TILES.GRASS) {
                const height = 5 + Math.floor(Math.random() * 6);
                
                // Tronco
                for (let y = surface - height; y < surface; y++) {
                    if (y >= 0) {
                        world.tiles[x][y] = TILES.WOOD;
                    }
                }
                
                // Copa
                const crownRadius = 2 + Math.floor(Math.random() * 2);
                const crownY = surface - height;
                
                for (let dx = -crownRadius; dx <= crownRadius; dx++) {
                    for (let dy = -crownRadius; dy <= crownRadius; dy++) {
                        const nx = x + dx;
                        const ny = crownY + dy;
                        
                        if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0) {
                            if (dx*dx + dy*dy <= crownRadius*crownRadius) {
                                if (world.tiles[nx][ny] === TILES.AIR) {
                                    world.tiles[nx][ny] = TILES.LEAVES;
                                }
                            }
                        }
                    }
                }
                
                x += 4;
            }
        }
    }
}
// ==================== CRIAR SERVIDOR DE JOGO ====================
function createGameServer(name, maxPlayers = 10) {
    const id = 'server_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const gameServer = {
        id: id,
        name: name,
        maxPlayers: maxPlayers,
        players: new Map(),
        world: generateWorld(),
        zombies: new Map(),
        items: new Map(),
        projectiles: new Map(),
        wave: 1,
        waveTimer: 90,
        dayTime: 0.3,
        spawnTimer: 0,
        lastUpdate: Date.now()
    };
    
    servers.set(id, gameServer);
    console.log('Servidor criado:', name);
    return gameServer;
}

// ==================== FUNÇÕES DE ZUMBI ====================
function createZombie(x, y, wave) {
    const types = ['normal', 'fast', 'tank'];
    const weights = [0.6, 0.25, 0.15];
    
    let rand = Math.random();
    let type = 'normal';
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (rand <= cumulative) {
            type = types[i];
            break;
        }
    }
    
    const stats = {
        normal: { hp: 100, speed: 1.5, damage: 10, xp: 10, width: 24, height: 40 },
        fast: { hp: 50, speed: 3, damage: 8, xp: 15, width: 20, height: 36 },
        tank: { hp: 300, speed: 0.8, damage: 25, xp: 30, width: 32, height: 48 }
    };
    
    const s = stats[type];
    const waveBonus = 1 + (wave - 1) * 0.1;
    
    return {
        id: 'zombie_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: type,
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        width: s.width,
        height: s.height,
        hp: s.hp * waveBonus,
        maxHp: s.hp * waveBonus,
        speed: s.speed,
        damage: s.damage * waveBonus,
        xp: s.xp,
        grounded: false,
        facingRight: Math.random() > 0.5,
        attackCooldown: 0,
        jumpCooldown: 0,
        animFrame: 0
    };
}

function spawnZombies(gameServer) {
    const numToSpawn = Math.min(1 + Math.floor(gameServer.wave / 3), 4);
    
    gameServer.players.forEach((player) => {
        for (let i = 0; i < numToSpawn; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const spawnX = player.x + side * (500 + Math.random() * 200);
            
            if (spawnX < 0 || spawnX > WORLD_WIDTH * TILE_SIZE) continue;
            
            let spawnY = 0;
            const tileX = Math.floor(spawnX / TILE_SIZE);
            
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                if (gameServer.world.tiles[tileX] && gameServer.world.tiles[tileX][y]) {
                    const tile = gameServer.world.tiles[tileX][y];
                    if (TILE_PROPS[tile] && TILE_PROPS[tile].solid) {
                        spawnY = y * TILE_SIZE - 40;
                        break;
                    }
                }
            }
            
            if (spawnY > 0) {
                const zombie = createZombie(spawnX, spawnY, gameServer.wave);
                gameServer.zombies.set(zombie.id, zombie);
            }
        }
    });
}

function spawnBoss(gameServer) {
    let avgX = 0;
    let count = 0;
    
    gameServer.players.forEach((player) => {
        avgX += player.x;
        count++;
    });
    
    if (count === 0) return;
    avgX = avgX / count;
    
    const side = Math.random() > 0.5 ? 1 : -1;
    const spawnX = avgX + side * 600;
    
    const tileX = Math.floor(spawnX / TILE_SIZE);
    let spawnY = 0;
    
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        if (gameServer.world.tiles[tileX] && gameServer.world.tiles[tileX][y]) {
            const tile = gameServer.world.tiles[tileX][y];
            if (TILE_PROPS[tile] && TILE_PROPS[tile].solid) {
                spawnY = y * TILE_SIZE - 80;
                break;
            }
        }
    }
    
    const boss = {
        id: 'boss_' + Date.now(),
        type: 'boss',
        isBoss: true,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        width: 64,
        height: 80,
        hp: 500 * gameServer.wave,
        maxHp: 500 * gameServer.wave,
        speed: 1.2,
        damage: 30 + gameServer.wave * 5,
        xp: 200 * gameServer.wave,
        grounded: false,
        facingRight: side < 0,
        attackCooldown: 0,
        jumpCooldown: 0,
        animFrame: 0
    };
    
    gameServer.zombies.set(boss.id, boss);
    io.to(gameServer.id).emit('bossSpawn', { bossId: boss.id });
}

// ==================== FÍSICA ====================
const GRAVITY = 0.5;
const MAX_FALL_SPEED = 15;
const JUMP_FORCE = 10;

function getTile(world, pixelX, pixelY) {
    const x = Math.floor(pixelX / TILE_SIZE);
    const y = Math.floor(pixelY / TILE_SIZE);
    
    if (x < 0 || x >= world.width || y < 0 || y >= world.height) {
        return TILES.BEDROCK;
    }
    
    return world.tiles[x][y];
}

function isSolid(world, pixelX, pixelY) {
    const tile = getTile(world, pixelX, pixelY);
    return TILE_PROPS[tile] && TILE_PROPS[tile].solid;
}

function checkCollision(world, entity) {
    const left = entity.x - entity.width / 2;
    const right = entity.x + entity.width / 2;
    const top = entity.y - entity.height / 2;
    const bottom = entity.y + entity.height / 2;
    
    return isSolid(world, left, top) ||
           isSolid(world, right, top) ||
           isSolid(world, left, bottom) ||
           isSolid(world, right, bottom);
}

function moveEntity(world, entity, dt) {
    // Aplica gravidade
    entity.vy += GRAVITY;
    if (entity.vy > MAX_FALL_SPEED) entity.vy = MAX_FALL_SPEED;
    
    entity.grounded = false;
    
    // Move X
    const newX = entity.x + entity.vx;
    const oldX = entity.x;
    entity.x = newX;
    
    if (checkCollision(world, entity)) {
        entity.x = oldX;
        entity.vx = 0;
    }
    
    // Move Y
    const newY = entity.y + entity.vy;
    const oldY = entity.y;
    entity.y = newY;
    
    if (checkCollision(world, entity)) {
        entity.y = oldY;
        if (entity.vy > 0) {
            entity.grounded = true;
        }
        entity.vy = 0;
    }
    
    // Limites do mundo
    entity.x = Math.max(entity.width / 2, Math.min(WORLD_WIDTH * TILE_SIZE - entity.width / 2, entity.x));
    entity.y = Math.max(0, Math.min(WORLD_HEIGHT * TILE_SIZE - entity.height, entity.y));
}

// ==================== ATUALIZAÇÃO DO JOGO ====================
function updatePlayer(gameServer, player, dt) {
    // Movimento horizontal
    if (player.input.left) {
        player.vx = -player.speed;
        player.facingRight = false;
    } else if (player.input.right) {
        player.vx = player.speed;
        player.facingRight = true;
    } else {
        player.vx *= 0.8;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }
    
    // Pulo
    if (player.input.jump && player.grounded) {
        player.vy = -JUMP_FORCE;
        player.grounded = false;
    }
    
    // Física
    moveEntity(gameServer.world, player, dt);
    
    // Regeneração
    if (player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + 0.3 * dt);
    }
    
    // Cooldown de ataque
    if (player.attackCooldown > 0) {
        player.attackCooldown -= dt;
    }
}

function updateZombie(gameServer, zombie, dt) {
    // Encontra jogador mais próximo
    let nearestPlayer = null;
    let nearestDist = Infinity;
    
    gameServer.players.forEach((player) => {
        const dist = Math.hypot(player.x - zombie.x, player.y - zombie.y);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlayer = player;
        }
    });
    
    if (nearestPlayer && nearestDist < 500) {
        // Move em direção ao jogador
        if (zombie.x < nearestPlayer.x - 20) {
            zombie.vx = zombie.speed;
            zombie.facingRight = true;
        } else if (zombie.x > nearestPlayer.x + 20) {
            zombie.vx = -zombie.speed;
            zombie.facingRight = false;
        } else {
            zombie.vx = 0;
        }
        
        // Pula se bloqueado
        if (zombie.grounded && zombie.jumpCooldown <= 0) {
            const aheadX = zombie.x + (zombie.facingRight ? 30 : -30);
            if (isSolid(gameServer.world, aheadX, zombie.y)) {
                zombie.vy = -JUMP_FORCE * 0.8;
                zombie.jumpCooldown = 0.5;
            }
            
            // Pula se jogador está acima
            if (nearestPlayer.y < zombie.y - 40) {
                zombie.vy = -JUMP_FORCE;
                zombie.jumpCooldown = 0.5;
            }
        }
        
        // Ataca
        if (nearestDist < 40 && zombie.attackCooldown <= 0) {
            nearestPlayer.hp -= zombie.damage;
            zombie.attackCooldown = 1;
            
            io.to(gameServer.id).emit('playerDamaged', {
                playerId: nearestPlayer.id,
                damage: zombie.damage,
                hp: nearestPlayer.hp
            });
            
            if (nearestPlayer.hp <= 0) {
                respawnPlayer(gameServer, nearestPlayer);
            }
        }
    } else {
        // Patrulha
        if (Math.random() < 0.02) {
            zombie.vx = (Math.random() - 0.5) * zombie.speed;
            zombie.facingRight = zombie.vx > 0;
        }
    }
    
    // Cooldowns
    zombie.jumpCooldown = Math.max(0, zombie.jumpCooldown - dt);
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
    
    // Física
    moveEntity(gameServer.world, zombie, dt);
    
    // Animação
    zombie.animFrame = (zombie.animFrame + dt * 8) % 4;
}

function updateProjectile(gameServer, proj, dt) {
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.vy += GRAVITY * 0.3;
    proj.life -= dt;
    
    if (proj.life <= 0) {
        return true; // Remove
    }
    
    // Colisão com bloco
    if (isSolid(gameServer.world, proj.x, proj.y)) {
        return true;
    }
    
    // Colisão com zumbis
    let hit = false;
    gameServer.zombies.forEach((zombie, zombieId) => {
        if (hit) return;
        
        const dx = proj.x - zombie.x;
        const dy = proj.y - zombie.y;
        
        if (Math.abs(dx) < zombie.width / 2 && Math.abs(dy) < zombie.height / 2) {
            zombie.hp -= proj.damage;
            hit = true;
            
            if (zombie.hp <= 0) {
                killZombie(gameServer, zombie, proj.ownerId);
            }
        }
    });
    
    return hit;
}

function updateItem(gameServer, item, dt) {
    // Gravidade
    item.vy = (item.vy || 0) + GRAVITY * 0.5;
    item.y += item.vy;
    
    // Colisão com chão
    if (isSolid(gameServer.world, item.x, item.y + 8)) {
        item.y = Math.floor(item.y / TILE_SIZE) * TILE_SIZE;
        item.vy = 0;
    }
    
    // Tempo de vida
    item.lifetime -= dt;
    if (item.lifetime <= 0) {
        return true;
    }
    
    // Coleta
    let collected = false;
    gameServer.players.forEach((player) => {
        if (collected) return;
        
        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < 40) {
            addToInventory(player, item.itemType, item.amount);
            collected = true;
            
            io.to(gameServer.id).emit('itemCollected', {
                playerId: player.id,
                itemId: item.id
            });
        }
    });
    
    return collected;
}
// ==================== FUNÇÕES AUXILIARES ====================
function killZombie(gameServer, zombie, killerId) {
    // Cria item de XP
    const xpItem = {
        id: 'item_' + Date.now() + '_' + Math.random(),
        itemType: 'xp',
        amount: zombie.xp,
        x: zombie.x,
        y: zombie.y,
        vy: -5,
        lifetime: 30
    };
    gameServer.items.set(xpItem.id, xpItem);
    
    // Chance de drop
    if (Math.random() < 0.15) {
        const drops = ['coin', 'health_potion'];
        const dropItem = {
            id: 'item_' + Date.now() + '_' + Math.random(),
            itemType: drops[Math.floor(Math.random() * drops.length)],
            amount: 1,
            x: zombie.x + (Math.random() - 0.5) * 20,
            y: zombie.y,
            vy: -3,
            lifetime: 60
        };
        gameServer.items.set(dropItem.id, dropItem);
    }
    
    // Remove zumbi
    gameServer.zombies.delete(zombie.id);
    
    io.to(gameServer.id).emit('zombieDeath', {
        zombieId: zombie.id,
        x: zombie.x,
        y: zombie.y
    });
    
    // XP para o jogador
    const killer = gameServer.players.get(killerId);
    if (killer) {
        killer.xp += zombie.xp;
        checkLevelUp(gameServer, killer);
    }
}

function respawnPlayer(gameServer, player) {
    player.hp = player.maxHp;
    player.x = SPAWN_X * TILE_SIZE;
    player.y = findSpawnY(gameServer.world) * TILE_SIZE;
    
    io.to(gameServer.id).emit('playerRespawn', {
        playerId: player.id,
        x: player.x,
        y: player.y
    });
}

function findSpawnY(world) {
    for (let y = 0; y < world.height; y++) {
        if (world.tiles[SPAWN_X] && world.tiles[SPAWN_X][y]) {
            const tile = world.tiles[SPAWN_X][y];
            if (TILE_PROPS[tile] && TILE_PROPS[tile].solid) {
                return y - 3;
            }
        }
    }
    return 50;
}

function addToInventory(player, itemType, amount) {
    if (itemType === 'xp') {
        player.xp += amount;
        return;
    }
    
    // Procura slot existente
    for (let i = 0; i < player.hotbar.length; i++) {
        if (player.hotbar[i] && player.hotbar[i].type === itemType) {
            player.hotbar[i].amount += amount;
            return;
        }
    }
    
    // Procura slot vazio
    for (let i = 0; i < player.hotbar.length; i++) {
        if (!player.hotbar[i]) {
            player.hotbar[i] = { type: itemType, amount: amount };
            return;
        }
    }
}

function checkLevelUp(gameServer, player) {
    const xpNeeded = 100 * Math.pow(1.5, player.level - 1);
    
    while (player.xp >= xpNeeded) {
        player.xp -= xpNeeded;
        player.level++;
        player.maxHp += 10;
        player.hp = player.maxHp;
        player.damage += 2;
        
        io.to(gameServer.id).emit('levelUp', {
            playerId: player.id,
            level: player.level
        });
    }
}

// ==================== GAME LOOP ====================
const TICK_RATE = 60;

function gameLoop() {
    const now = Date.now();
    
    servers.forEach((gameServer) => {
        const dt = (now - gameServer.lastUpdate) / 1000;
        gameServer.lastUpdate = now;
        
        if (gameServer.players.size === 0) return;
        
        // Ciclo dia/noite
        gameServer.dayTime = (gameServer.dayTime + dt / 600) % 1;
        
        // Timer de wave
        gameServer.waveTimer -= dt;
        if (gameServer.waveTimer <= 0) {
            gameServer.wave++;
            gameServer.waveTimer = 90;
            
            io.to(gameServer.id).emit('newWave', { wave: gameServer.wave });
            
            if (gameServer.wave % 5 === 0) {
                spawnBoss(gameServer);
            }
        }
        
        // Spawn de zumbis à noite
        const isNight = gameServer.dayTime < 0.25 || gameServer.dayTime > 0.75;
        if (isNight) {
            gameServer.spawnTimer -= dt;
            if (gameServer.spawnTimer <= 0) {
                spawnZombies(gameServer);
                gameServer.spawnTimer = Math.max(1, 4 - gameServer.wave * 0.2);
            }
        }
        
        // Atualiza jogadores
        gameServer.players.forEach((player) => {
            updatePlayer(gameServer, player, dt);
        });
        
        // Atualiza zumbis
        gameServer.zombies.forEach((zombie) => {
            updateZombie(gameServer, zombie, dt);
        });
        
        // Atualiza projéteis
        gameServer.projectiles.forEach((proj, projId) => {
            if (updateProjectile(gameServer, proj, dt)) {
                gameServer.projectiles.delete(projId);
            }
        });
        
        // Atualiza itens
        gameServer.items.forEach((item, itemId) => {
            if (updateItem(gameServer, item, dt)) {
                gameServer.items.delete(itemId);
            }
        });
        
        // Envia estado
        broadcastGameState(gameServer);
    });
}

function broadcastGameState(gameServer) {
    const state = {
        time: gameServer.dayTime,
        wave: gameServer.wave,
        waveTimer: Math.ceil(gameServer.waveTimer),
        players: [],
        zombies: [],
        projectiles: [],
        items: []
    };
    
    gameServer.players.forEach((p) => {
        state.players.push({
            id: p.id,
            name: p.name,
            x: p.x,
            y: p.y,
            vx: p.vx,
            hp: p.hp,
            maxHp: p.maxHp,
            level: p.level,
            xp: p.xp,
            facingRight: p.facingRight,
            grounded: p.grounded,
            color: p.color,
            selectedSlot: p.selectedSlot,
            hotbar: p.hotbar
        });
    });
    
    gameServer.zombies.forEach((z) => {
        state.zombies.push({
            id: z.id,
            type: z.type,
            x: z.x,
            y: z.y,
            hp: z.hp,
            maxHp: z.maxHp,
            facingRight: z.facingRight,
            isBoss: z.isBoss,
            animFrame: Math.floor(z.animFrame)
        });
    });
    
    gameServer.projectiles.forEach((p) => {
        state.projectiles.push({
            id: p.id,
            type: p.type,
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy
        });
    });
    
    gameServer.items.forEach((i) => {
        state.items.push({
            id: i.id,
            type: i.itemType,
            x: i.x,
            y: i.y,
            amount: i.amount
        });
    });
    
    io.to(gameServer.id).emit('gameState', state);
}

// ==================== SOCKET HANDLERS ====================
io.on('connection', (socket) => {
    console.log('Jogador conectou:', socket.id);
    
    socket.on('getServers', () => {
        const serverList = [];
        servers.forEach((s) => {
            serverList.push({
                id: s.id,
                name: s.name,
                players: s.players.size,
                maxPlayers: s.maxPlayers,
                wave: s.wave
            });
        });
        socket.emit('serverList', serverList);
    });
    
    socket.on('createServer', (data) => {
        const server = createGameServer(data.serverName || 'Novo Servidor', data.maxPlayers || 10);
        socket.emit('serverCreated', { serverId: server.id });
    });
    
    socket.on('joinGame', (data) => {
        let gameServer;
        
        if (data.serverId) {
            gameServer = servers.get(data.serverId);
        }
        
        if (!gameServer) {
            // Cria servidor padrão
            if (servers.size === 0) {
                gameServer = createGameServer('Servidor Principal');
            } else {
                gameServer = servers.values().next().value;
            }
        }
        
        if (gameServer.players.size >= gameServer.maxPlayers) {
            socket.emit('joinError', { message: 'Servidor cheio!' });
            return;
        }
        
        const spawnY = findSpawnY(gameServer.world);
        
        const player = {
            id: socket.id,
            name: data.playerName || 'Jogador',
            color: data.playerColor || '#00ff44',
            x: SPAWN_X * TILE_SIZE,
            y: spawnY * TILE_SIZE,
            vx: 0,
            vy: 0,
            width: 24,
            height: 40,
            hp: 100,
            maxHp: 100,
            speed: 4,
            damage: 10,
            level: 1,
            xp: 0,
            grounded: false,
            facingRight: true,
            selectedSlot: 0,
            attackCooldown: 0,
            input: { left: false, right: false, jump: false },
            hotbar: [
                { type: 'pickaxe', amount: 1, damage: 5 },
                { type: 'sword', amount: 1, damage: 15 },
                { type: 'torch', amount: 50 },
                { type: 'wood', amount: 20 },
                null, null, null, null, null
            ]
        };
        
        gameServer.players.set(socket.id, player);
        players.set(socket.id, { serverId: gameServer.id, player: player });
        
        socket.join(gameServer.id);
        
        socket.emit('joinSuccess', {
            playerId: socket.id,
            player: player,
            world: {
                width: gameServer.world.width,
                height: gameServer.world.height,
                tiles: gameServer.world.tiles,
                background: gameServer.world.background
            },
            time: gameServer.dayTime,
            wave: gameServer.wave,
            waveTimer: gameServer.waveTimer
        });
        
        socket.to(gameServer.id).emit('playerJoined', { player: player });
    });
    
    socket.on('playerInput', (input) => {
        const data = players.get(socket.id);
        if (data && data.player) {
            data.player.input = input;
        }
    });
    
    socket.on('playerAction', (action) => {
        const data = players.get(socket.id);
        if (!data) return;
        
        const gameServer = servers.get(data.serverId);
        if (!gameServer) return;
        
        const player = data.player;
        
        if (action.type === 'break') {
            const tileX = Math.floor(action.x / TILE_SIZE);
            const tileY = Math.floor(action.y / TILE_SIZE);
            
            if (tileX < 0 || tileX >= WORLD_WIDTH || tileY < 0 || tileY >= WORLD_HEIGHT) return;
            
            const dist = Math.hypot(action.x - player.x, action.y - player.y);
            if (dist > 100) return;
            
            const tile = gameServer.world.tiles[tileX][tileY];
            if (tile && tile !== TILES.AIR && tile !== TILES.BEDROCK) {
                gameServer.world.tiles[tileX][tileY] = TILES.AIR;
                
                // Drop
                const props = TILE_PROPS[tile];
                if (props && props.drops) {
                    const item = {
                        id: 'item_' + Date.now(),
                        itemType: 'block_' + props.drops,
                        tileType: props.drops,
                        amount: 1,
                        x: tileX * TILE_SIZE + 8,
                        y: tileY * TILE_SIZE,
                        vy: -2,
                        lifetime: 60
                    };
                    gameServer.items.set(item.id, item);
                }
                
                io.to(gameServer.id).emit('blockBroken', { x: tileX, y: tileY });
            }
        } else if (action.type === 'place') {
            const tileX = Math.floor(action.x / TILE_SIZE);
            const tileY = Math.floor(action.y / TILE_SIZE);
            
            if (tileX < 0 || tileX >= WORLD_WIDTH || tileY < 0 || tileY >= WORLD_HEIGHT) return;
            
            const dist = Math.hypot(action.x - player.x, action.y - player.y);
            if (dist > 100) return;
            
            if (gameServer.world.tiles[tileX][tileY] === TILES.AIR) {
                const item = player.hotbar[player.selectedSlot];
                if (item && item.type.startsWith('block_') && item.amount > 0) {
                    const tileType = parseInt(item.type.split('_')[1]);
                    gameServer.world.tiles[tileX][tileY] = tileType;
                    item.amount--;
                    if (item.amount <= 0) {
                        player.hotbar[player.selectedSlot] = null;
                    }
                    io.to(gameServer.id).emit('blockPlaced', { x: tileX, y: tileY, tile: tileType });
                } else if (item && item.type === 'wood' && item.amount > 0) {
                    gameServer.world.tiles[tileX][tileY] = TILES.PLANKS;
                    item.amount--;
                    if (item.amount <= 0) {
                        player.hotbar[player.selectedSlot] = null;
                    }
                    io.to(gameServer.id).emit('blockPlaced', { x: tileX, y: tileY, tile: TILES.PLANKS });
                } else if (item && item.type === 'torch' && item.amount > 0) {
                    gameServer.world.tiles[tileX][tileY] = TILES.TORCH;
                    item.amount--;
                    if (item.amount <= 0) {
                        player.hotbar[player.selectedSlot] = null;
                    }
                    io.to(gameServer.id).emit('blockPlaced', { x: tileX, y: tileY, tile: TILES.TORCH });
                }
            }
        } else if (action.type === 'attack') {
            if (player.attackCooldown > 0) return;
            
            const item = player.hotbar[player.selectedSlot];
            
            if (item && item.type === 'sword') {
                const attackRange = 50;
                
                gameServer.zombies.forEach((zombie) => {
                    const dx = zombie.x - player.x;
                    const dy = zombie.y - player.y;
                    const dist = Math.hypot(dx, dy);
                    
                    const correctDirection = player.facingRight ? dx > 0 : dx < 0;
                    
                    if (dist < attackRange && correctDirection) {
                        const damage = player.damage + (item.damage || 0);
                        zombie.hp -= damage;
                        
                        io.to(gameServer.id).emit('zombieHit', {
                            zombieId: zombie.id,
                            damage: damage
                        });
                        
                        if (zombie.hp <= 0) {
                            killZombie(gameServer, zombie, socket.id);
                        }
                    }
                });
                
                player.attackCooldown = 0.4;
                io.to(gameServer.id).emit('playerAttack', { playerId: socket.id });
            }
        }
    });
    
    socket.on('selectSlot', (slot) => {
        const data = players.get(socket.id);
        if (data && data.player && slot >= 0 && slot < 9) {
            data.player.selectedSlot = slot;
        }
    });
    
    socket.on('chatMessage', (message) => {
        const data = players.get(socket.id);
        if (data) {
            io.to(data.serverId).emit('chatMessage', {
                playerId: socket.id,
                playerName: data.player.name,
                message: String(message).substring(0, 200)
            });
        }
    });
    
    socket.on('disconnect', () => {
        const data = players.get(socket.id);
        if (data) {
            const gameServer = servers.get(data.serverId);
            if (gameServer) {
                gameServer.players.delete(socket.id);
                io.to(data.serverId).emit('playerLeft', { playerId: socket.id });
            }
            players.delete(socket.id);
        }
        console.log('Jogador desconectou:', socket.id);
    });
});

// Inicia game loop
setInterval(gameLoop, 1000 / TICK_RATE);

// Inicia servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🧟 ZOMBIE SURVIVAL - TERRARIA STYLE');
    console.log('='.repeat(50));
    console.log('Servidor rodando na porta ' + PORT);
    console.log('Acesse: http://localhost:' + PORT);
    console.log('='.repeat(50));
});
