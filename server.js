const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// ==================== CONFIGURAÇÕES DO MUNDO ====================
const WORLD_WIDTH = 800;  // blocos
const WORLD_HEIGHT = 400; // blocos
const BLOCK_SIZE = 16;
const SURFACE_HEIGHT = 100;
const CAVE_START = 150;

// Tipos de blocos
const BLOCKS = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    COAL: 4,
    IRON: 5,
    GOLD: 6,
    DIAMOND: 7,
    WOOD: 8,
    LEAVES: 9,
    WATER: 10,
    SAND: 11,
    BEDROCK: 12,
    TORCH: 13,
    CRAFTING_TABLE: 14,
    CHEST: 15,
    SPIKE: 16,
    PLATFORM: 17
};

// ==================== ESTADO DO JOGO ====================
const gameState = {
    servers: {},
    worlds: {}
};

// ==================== GERAÇÃO DE MUNDO ====================
function generateWorld(serverId) {
    console.log(`Gerando mundo para servidor ${serverId}...`);
    
    const world = {
        blocks: [],
        lights: [],
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        spawnX: Math.floor(WORLD_WIDTH / 2),
        spawnY: SURFACE_HEIGHT - 5,
        time: 0, // 0-24000 (ciclo dia/noite)
        trees: [],
        backgroundObjects: []
    };
    
    // Inicializa arrays
    for (let x = 0; x < WORLD_WIDTH; x++) {
        world.blocks[x] = [];
        world.lights[x] = [];
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            world.blocks[x][y] = BLOCKS.AIR;
            world.lights[x][y] = 0;
        }
    }
    
    // Gera terreno com Perlin-like noise
    const surfaceNoise = generateNoise(WORLD_WIDTH, 20, 3);
    
    for (let x = 0; x < WORLD_WIDTH; x++) {
        const surfaceY = SURFACE_HEIGHT + Math.floor(surfaceNoise[x] * 15);
        
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (y === WORLD_HEIGHT - 1) {
                world.blocks[x][y] = BLOCKS.BEDROCK;
            } else if (y > surfaceY) {
                if (y === surfaceY + 1) {
                    world.blocks[x][y] = BLOCKS.GRASS;
                } else if (y < surfaceY + 5) {
                    world.blocks[x][y] = BLOCKS.DIRT;
                } else {
                    world.blocks[x][y] = BLOCKS.STONE;
                    
                    // Minérios
                    const oreChance = Math.random();
                    const depth = y - CAVE_START;
                    
                    if (depth > 50 && oreChance < 0.002) {
                        world.blocks[x][y] = BLOCKS.DIAMOND;
                    } else if (depth > 30 && oreChance < 0.008) {
                        world.blocks[x][y] = BLOCKS.GOLD;
                    } else if (depth > 10 && oreChance < 0.02) {
                        world.blocks[x][y] = BLOCKS.IRON;
                    } else if (oreChance < 0.04) {
                        world.blocks[x][y] = BLOCKS.COAL;
                    }
                }
            }
        }
        
        // Gera árvores na superfície
        if (Math.random() < 0.08 && x > 5 && x < WORLD_WIDTH - 5) {
            const treeHeight = 5 + Math.floor(Math.random() * 4);
            const baseY = surfaceY;
            
            // Verifica se há espaço
            let canPlace = true;
            for (let ty = baseY - treeHeight; ty <= baseY; ty++) {
                if (ty >= 0 && world.blocks[x][ty] !== BLOCKS.AIR) {
                    canPlace = false;
                    break;
                }
            }
            
            if (canPlace) {
                // Tronco
                for (let ty = baseY; ty > baseY - treeHeight; ty--) {
                    if (ty >= 0) world.blocks[x][ty] = BLOCKS.WOOD;
                }
                
                // Folhas
                const leafStart = baseY - treeHeight;
                for (let lx = x - 2; lx <= x + 2; lx++) {
                    for (let ly = leafStart - 2; ly <= leafStart + 2; ly++) {
                        if (lx >= 0 && lx < WORLD_WIDTH && ly >= 0) {
                            const dist = Math.abs(lx - x) + Math.abs(ly - leafStart);
                            if (dist <= 3 && world.blocks[lx][ly] === BLOCKS.AIR) {
                                world.blocks[lx][ly] = BLOCKS.LEAVES;
                            }
                        }
                    }
                }
                
                world.trees.push({ x, baseY, height: treeHeight });
            }
        }
    }
    
    // Gera cavernas
    generateCaves(world);
    
    // Gera lagos subterrâneos
    generateUndergroundLakes(world);
    
    // Calcula iluminação inicial
    calculateLighting(world);
    
    console.log(`Mundo gerado! ${WORLD_WIDTH}x${WORLD_HEIGHT} blocos`);
    return world;
}

function generateNoise(length, octaves, scale) {
    const noise = new Array(length).fill(0);
    
    for (let o = 0; o < octaves; o++) {
        const frequency = Math.pow(2, o) * scale;
        const amplitude = 1 / Math.pow(2, o);
        
        const phase = Math.random() * 1000;
        
        for (let i = 0; i < length; i++) {
            noise[i] += Math.sin((i / frequency) + phase) * amplitude;
        }
    }
    
    return noise;
}

function generateCaves(world) {
    const numCaves = Math.floor(WORLD_WIDTH / 20);
    
    for (let c = 0; c < numCaves; c++) {
        let x = Math.floor(Math.random() * WORLD_WIDTH);
        let y = CAVE_START + Math.floor(Math.random() * (WORLD_HEIGHT - CAVE_START - 20));
        
        const length = 50 + Math.floor(Math.random() * 150);
        
        for (let i = 0; i < length; i++) {
            const radius = 2 + Math.floor(Math.random() * 3);
            
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT - 1) {
                        if (dx * dx + dy * dy <= radius * radius) {
                            if (world.blocks[nx][ny] !== BLOCKS.BEDROCK) {
                                world.blocks[nx][ny] = BLOCKS.AIR;
                            }
                        }
                    }
                }
            }
            
            x += Math.floor(Math.random() * 3) - 1;
            y += Math.floor(Math.random() * 3) - 1;
            
            x = Math.max(0, Math.min(WORLD_WIDTH - 1, x));
            y = Math.max(CAVE_START, Math.min(WORLD_HEIGHT - 2, y));
        }
    }
}

function generateUndergroundLakes(world) {
    const numLakes = Math.floor(WORLD_WIDTH / 100);
    
    for (let l = 0; l < numLakes; l++) {
        const lakeX = 20 + Math.floor(Math.random() * (WORLD_WIDTH - 40));
        const lakeY = CAVE_START + 30 + Math.floor(Math.random() * 100);
        const lakeWidth = 10 + Math.floor(Math.random() * 20);
        const lakeHeight = 5 + Math.floor(Math.random() * 8);
        
        for (let x = lakeX - lakeWidth; x <= lakeX + lakeWidth; x++) {
            for (let y = lakeY; y <= lakeY + lakeHeight; y++) {
                if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
                    const dist = Math.pow((x - lakeX) / lakeWidth, 2) + Math.pow((y - lakeY) / lakeHeight, 2);
                    if (dist <= 1 && world.blocks[x][y] === BLOCKS.AIR) {
                        world.blocks[x][y] = BLOCKS.WATER;
                    }
                }
            }
        }
    }
}

function calculateLighting(world) {
    // Reset lights
    for (let x = 0; x < WORLD_WIDTH; x++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            world.lights[x][y] = 0;
        }
    }
    
    // Luz do sol (de cima para baixo)
    for (let x = 0; x < WORLD_WIDTH; x++) {
        let sunLight = 15;
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (world.blocks[x][y] !== BLOCKS.AIR && world.blocks[x][y] !== BLOCKS.WATER) {
                sunLight = Math.max(0, sunLight - 3);
            }
            world.lights[x][y] = Math.max(world.lights[x][y], sunLight);
        }
    }
    
    // Tochas e outras fontes de luz
    for (let x = 0; x < WORLD_WIDTH; x++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (world.blocks[x][y] === BLOCKS.TORCH) {
                spreadLight(world, x, y, 12);
            }
        }
    }
}

function spreadLight(world, startX, startY, intensity) {
    const queue = [{ x: startX, y: startY, light: intensity }];
    
    while (queue.length > 0) {
        const { x, y, light } = queue.shift();
        
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) continue;
        if (light <= world.lights[x][y]) continue;
        
        world.lights[x][y] = light;
        
        if (light > 1) {
            const decay = world.blocks[x][y] === BLOCKS.AIR ? 1 : 2;
            queue.push({ x: x - 1, y, light: light - decay });
            queue.push({ x: x + 1, y, light: light - decay });
            queue.push({ x, y: y - 1, light: light - decay });
            queue.push({ x, y: y + 1, light: light - decay });
        }
    }
}

// ==================== GERENCIAMENTO DE SERVIDORES ====================
function createServer(name, maxPlayers = 10) {
    const id = 'srv_' + Math.random().toString(36).substr(2, 9);
    
    gameState.servers[id] = {
        id,
        name,
        maxPlayers,
        players: {},
        zombies: {},
        drops: {},
        projectiles: {},
        wave: 1,
        time: 6000, // Começa de manhã
        zombieIdCounter: 0,
        dropIdCounter: 0,
        projectileIdCounter: 0
    };
    
    gameState.worlds[id] = generateWorld(id);
    
    return id;
}

// Cria servidor padrão
createServer('Servidor Principal', 20);

// ==================== FÍSICA E COLISÃO ====================
function isCollidingWithBlock(world, x, y, width, height) {
    const startX = Math.floor(x / BLOCK_SIZE);
    const endX = Math.floor((x + width) / BLOCK_SIZE);
    const startY = Math.floor(y / BLOCK_SIZE);
    const endY = Math.floor((y + height) / BLOCK_SIZE);
    
    for (let bx = startX; bx <= endX; bx++) {
        for (let by = startY; by <= endY; by++) {
            if (bx >= 0 && bx < WORLD_WIDTH && by >= 0 && by < WORLD_HEIGHT) {
                const block = world.blocks[bx][by];
                if (block !== BLOCKS.AIR && block !== BLOCKS.WATER && 
                    block !== BLOCKS.TORCH && block !== BLOCKS.PLATFORM) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isOnPlatform(world, x, y, width, height) {
    const startX = Math.floor(x / BLOCK_SIZE);
    const endX = Math.floor((x + width) / BLOCK_SIZE);
    const footY = Math.floor((y + height + 1) / BLOCK_SIZE);
    
    for (let bx = startX; bx <= endX; bx++) {
        if (bx >= 0 && bx < WORLD_WIDTH && footY >= 0 && footY < WORLD_HEIGHT) {
            if (world.blocks[bx][footY] === BLOCKS.PLATFORM) {
                return true;
            }
        }
    }
    return false;
}

function isSolidBlock(blockType) {
    return blockType !== BLOCKS.AIR && 
           blockType !== BLOCKS.WATER && 
           blockType !== BLOCKS.TORCH &&
           blockType !== BLOCKS.PLATFORM;
}

// ==================== ZUMBIS ====================
function spawnZombie(serverId) {
    const server = gameState.servers[serverId];
    const world = gameState.worlds[serverId];
    if (!server || !world) return;
    
    // Só spawna à noite (18000-6000)
    if (server.time > 6000 && server.time < 18000) return;
    
    const players = Object.values(server.players);
    if (players.length === 0) return;
    
    // Escolhe um jogador aleatório para spawnar perto
    const targetPlayer = players[Math.floor(Math.random() * players.length)];
    
    // Spawna fora da tela
    const side = Math.random() < 0.5 ? -1 : 1;
    const spawnX = targetPlayer.x + (side * 400);
    
    // Encontra superfície
    let spawnY = 0;
    const blockX = Math.floor(spawnX / BLOCK_SIZE);
    if (blockX >= 0 && blockX < WORLD_WIDTH) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (world.blocks[blockX][y] !== BLOCKS.AIR) {
                spawnY = (y - 2) * BLOCK_SIZE;
                break;
            }
        }
    }
    
    const types = ['normal', 'fast', 'tank'];
    const waveBonus = Math.floor(server.wave / 5);
    
    // Boss a cada 5 waves
    let type;
    if (server.wave % 5 === 0 && Object.values(server.zombies).filter(z => z.type === 'boss').length === 0) {
        type = 'boss';
    } else {
        type = types[Math.floor(Math.random() * types.length)];
    }
    
    const stats = {
        normal: { hp: 50 + waveBonus * 10, speed: 1.5, damage: 10, width: 24, height: 40 },
        fast: { hp: 30 + waveBonus * 5, speed: 3, damage: 8, width: 20, height: 36 },
        tank: { hp: 150 + waveBonus * 30, speed: 0.8, damage: 20, width: 32, height: 48 },
        boss: { hp: 500 + waveBonus * 100, speed: 1, damage: 30, width: 48, height: 64 }
    };
    
    const id = 'z_' + (server.zombieIdCounter++);
    server.zombies[id] = {
        id,
        type,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        ...stats[type],
        maxHp: stats[type].hp,
        grounded: false,
        direction: targetPlayer.x > spawnX ? 1 : -1,
        attackCooldown: 0,
        animation: 0
    };
}

function updateZombies(serverId, deltaTime) {
    const server = gameState.servers[serverId];
    const world = gameState.worlds[serverId];
    if (!server || !world) return;
    
    const players = Object.values(server.players);
    const gravity = 0.5;
    
    for (const zombie of Object.values(server.zombies)) {
        // Encontra jogador mais próximo
        let closestPlayer = null;
        let closestDist = Infinity;
        
        for (const player of players) {
            if (player.hp <= 0) continue;
            const dist = Math.abs(player.x - zombie.x) + Math.abs(player.y - zombie.y);
            if (dist < closestDist) {
                closestDist = dist;
                closestPlayer = player;
            }
        }
        
        // Movimento horizontal
        if (closestPlayer) {
            zombie.direction = closestPlayer.x > zombie.x ? 1 : -1;
            zombie.vx = zombie.direction * zombie.speed;
            
            // Pula se há obstáculo
            const frontX = zombie.x + zombie.direction * zombie.width;
            const footY = zombie.y + zombie.height;
            
            if (zombie.grounded) {
                const blockX = Math.floor(frontX / BLOCK_SIZE);
                const blockY = Math.floor(zombie.y / BLOCK_SIZE);
                
                if (blockX >= 0 && blockX < WORLD_WIDTH && blockY >= 0 && blockY < WORLD_HEIGHT) {
                    if (isSolidBlock(world.blocks[blockX][blockY])) {
                        zombie.vy = -10; // Pula
                        zombie.grounded = false;
                    }
                }
            }
        }
        
        // Gravidade
        zombie.vy += gravity;
        zombie.vy = Math.min(zombie.vy, 15);
        
        // Move X
        const newX = zombie.x + zombie.vx;
        if (!isCollidingWithBlock(world, newX, zombie.y, zombie.width, zombie.height)) {
            zombie.x = newX;
        }
        
        // Move Y
        const newY = zombie.y + zombie.vy;
        if (!isCollidingWithBlock(world, zombie.x, newY, zombie.width, zombie.height)) {
            zombie.y = newY;
            zombie.grounded = false;
        } else {
            if (zombie.vy > 0) {
                zombie.grounded = true;
                // Ajusta posição para ficar no chão
                zombie.y = Math.floor((zombie.y + zombie.height) / BLOCK_SIZE) * BLOCK_SIZE - zombie.height;
            }
            zombie.vy = 0;
        }
        
        // Ataque
        zombie.attackCooldown -= deltaTime;
        if (closestPlayer && closestDist < 40) {
            if (zombie.attackCooldown <= 0) {
                closestPlayer.hp -= zombie.damage;
                zombie.attackCooldown = 1000;
                
                io.to(serverId).emit('playerDamaged', {
                    playerId: closestPlayer.id,
                    damage: zombie.damage,
                    hp: closestPlayer.hp
                });
                
                if (closestPlayer.hp <= 0) {
                    io.to(serverId).emit('playerDied', { playerId: closestPlayer.id });
                }
            }
        }
        
        // Animação
        zombie.animation += deltaTime * 0.01;
    }
}

// ==================== PROJÉTEIS ====================
function updateProjectiles(serverId, deltaTime) {
    const server = gameState.servers[serverId];
    const world = gameState.worlds[serverId];
    if (!server || !world) return;
    
    for (const [id, proj] of Object.entries(server.projectiles)) {
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.vy += 0.1; // Gravidade
        proj.lifetime -= deltaTime;
        
        // Verifica colisão com blocos
        const blockX = Math.floor(proj.x / BLOCK_SIZE);
        const blockY = Math.floor(proj.y / BLOCK_SIZE);
        
        if (blockX >= 0 && blockX < WORLD_WIDTH && blockY >= 0 && blockY < WORLD_HEIGHT) {
            if (isSolidBlock(world.blocks[blockX][blockY])) {
                delete server.projectiles[id];
                continue;
            }
        }
        
        // Verifica colisão com zumbis
        for (const zombie of Object.values(server.zombies)) {
            if (proj.x > zombie.x && proj.x < zombie.x + zombie.width &&
                proj.y > zombie.y && proj.y < zombie.y + zombie.height) {
                
                zombie.hp -= proj.damage;
                
                io.to(serverId).emit('zombieDamaged', {
                    zombieId: zombie.id,
                    damage: proj.damage,
                    hp: zombie.hp
                });
                
                if (zombie.hp <= 0) {
                    // Drop XP e items
                    const xpAmount = zombie.type === 'boss' ? 100 : 
                                    zombie.type === 'tank' ? 30 : 10;
                    
                    createDrop(serverId, zombie.x + zombie.width/2, zombie.y + zombie.height/2, 'xp', xpAmount);
                    
                    // Chance de dropar item
                    if (Math.random() < 0.3) {
                        const dropTypes = ['coin', 'health_potion', 'ammo'];
                        const dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                        createDrop(serverId, zombie.x + zombie.width/2, zombie.y + zombie.height/2, dropType, 1);
                    }
                    
                    io.to(serverId).emit('zombieDied', { zombieId: zombie.id });
                    delete server.zombies[zombie.id];
                }
                
                delete server.projectiles[id];
                break;
            }
        }
        
        if (proj.lifetime <= 0 || proj.x < 0 || proj.x > WORLD_WIDTH * BLOCK_SIZE) {
            delete server.projectiles[id];
        }
    }
}

// ==================== DROPS ====================
function createDrop(serverId, x, y, type, amount) {
    const server = gameState.servers[serverId];
    if (!server) return;
    
    const id = 'd_' + (server.dropIdCounter++);
    server.drops[id] = {
        id,
        x,
        y,
        vy: -3,
        type,
        amount,
        lifetime: 30000
    };
}

function updateDrops(serverId, deltaTime) {
    const server = gameState.servers[serverId];
    const world = gameState.worlds[serverId];
    if (!server || !world) return;
    
    for (const [id, drop] of Object.entries(server.drops)) {
        // Gravidade
        drop.vy += 0.3;
        drop.vy = Math.min(drop.vy, 10);
        
        const newY = drop.y + drop.vy;
        const blockX = Math.floor(drop.x / BLOCK_SIZE);
        const blockY = Math.floor(newY / BLOCK_SIZE);
        
        if (blockX >= 0 && blockX < WORLD_WIDTH && blockY >= 0 && blockY < WORLD_HEIGHT) {
            if (!isSolidBlock(world.blocks[blockX][blockY])) {
                drop.y = newY;
            } else {
                drop.vy = 0;
            }
        }
        
        drop.lifetime -= deltaTime;
        if (drop.lifetime <= 0) {
            delete server.drops[id];
        }
    }
}

// ==================== GAME LOOP ====================
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

setInterval(() => {
    for (const serverId of Object.keys(gameState.servers)) {
        const server = gameState.servers[serverId];
        if (!server) continue;
        
        // Atualiza tempo
        server.time += 10;
        if (server.time >= 24000) {
            server.time = 0;
            server.wave++;
            io.to(serverId).emit('newWave', { wave: server.wave });
        }
        
        // Spawn zumbis à noite
        if ((server.time < 6000 || server.time > 18000) && Math.random() < 0.02) {
            spawnZombie(serverId);
        }
        
        updateZombies(serverId, TICK_INTERVAL);
        updateProjectiles(serverId, TICK_INTERVAL);
        updateDrops(serverId, TICK_INTERVAL);
        
        // Envia estado para clientes
        io.to(serverId).emit('gameState', {
            players: server.players,
            zombies: server.zombies,
            drops: server.drops,
            projectiles: server.projectiles,
            time: server.time,
            wave: server.wave
        });
    }
}, TICK_INTERVAL);

// ==================== SOCKET HANDLERS ====================
io.on('connection', (socket) => {
    console.log(`Jogador conectado: ${socket.id}`);
    
    let currentServer = null;
    let player = null;
    
    // Lista servidores
    socket.on('getServers', (callback) => {
        const serverList = Object.values(gameState.servers).map(s => ({
            id: s.id,
            name: s.name,
            players: Object.keys(s.players).length,
            maxPlayers: s.maxPlayers,
            wave: s.wave
        }));
        callback(serverList);
    });
    
    // Criar servidor
    socket.on('createServer', (data, callback) => {
        const id = createServer(data.name, data.maxPlayers || 10);
        callback({ success: true, serverId: id });
    });
    
    // Entrar no servidor
    socket.on('joinServer', (data, callback) => {
        const server = gameState.servers[data.serverId];
        const world = gameState.worlds[data.serverId];
        
        if (!server || !world) {
            callback({ success: false, error: 'Servidor não encontrado' });
            return;
        }
        
        if (Object.keys(server.players).length >= server.maxPlayers) {
            callback({ success: false, error: 'Servidor cheio' });
            return;
        }
        
        socket.join(data.serverId);
        currentServer = data.serverId;
        
        player = {
            id: socket.id,
            name: data.name || 'Player',
            color: data.color || '#4a90d9',
            x: world.spawnX * BLOCK_SIZE,
            y: world.spawnY * BLOCK_SIZE,
            vx: 0,
            vy: 0,
            hp: 100,
            maxHp: 100,
            level: 1,
            xp: 0,
            direction: 1,
            grounded: false,
            inventory: createDefaultInventory(),
            selectedSlot: 0,
            animation: 'idle'
        };
        
        server.players[socket.id] = player;
        
        // Envia chunk inicial do mundo
        const chunks = getWorldChunks(world, player.x, player.y);
        
        callback({ 
            success: true, 
            player,
            chunks,
            worldWidth: world.width,
            worldHeight: world.height,
            time: server.time,
            wave: server.wave
        });
        
        socket.to(data.serverId).emit('playerJoined', player);
    });
    
    // Movimento do jogador
    socket.on('playerMove', (data) => {
        if (!currentServer || !player) return;
        
        const world = gameState.worlds[currentServer];
        if (!world) return;
        
        // Valida movimento básico
        player.vx = Math.max(-5, Math.min(5, data.vx || 0));
        player.direction = data.direction || player.direction;
        player.animation = data.animation || 'idle';
        
        // Pulo
        if (data.jump && player.grounded) {
            player.vy = -12;
            player.grounded = false;
        }
        
        // Física
        player.vy += 0.5; // Gravidade
        player.vy = Math.min(player.vy, 15);
        
        // Move X
        const newX = player.x + player.vx;
        if (!isCollidingWithBlock(world, newX, player.y, 24, 40)) {
            player.x = newX;
        }
        
        // Move Y
        const newY = player.y + player.vy;
        if (!isCollidingWithBlock(world, player.x, newY, 24, 40)) {
            player.y = newY;
            player.grounded = false;
        } else {
            if (player.vy > 0) {
                player.grounded = true;
                player.y = Math.floor((player.y + 40) / BLOCK_SIZE) * BLOCK_SIZE - 40;
            }
            player.vy = 0;
        }
    });
    
    // Quebrar bloco
    socket.on('breakBlock', (data) => {
        if (!currentServer || !player) return;
        
        const world = gameState.worlds[currentServer];
        if (!world) return;
        
        const { x, y } = data;
        
        // Verifica distância
        const dist = Math.sqrt(Math.pow(player.x - x * BLOCK_SIZE, 2) + Math.pow(player.y - y * BLOCK_SIZE, 2));
        if (dist > 100) return;
        
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            const block = world.blocks[x][y];
            if (block !== BLOCKS.AIR && block !== BLOCKS.BEDROCK) {
                // Dropa item
                const dropType = getBlockDropType(block);
                if (dropType) {
                    createDrop(currentServer, x * BLOCK_SIZE + 8, y * BLOCK_SIZE + 8, dropType, 1);
                }
                
                world.blocks[x][y] = BLOCKS.AIR;
                calculateLighting(world);
                
                io.to(currentServer).emit('blockUpdate', { x, y, type: BLOCKS.AIR });
            }
        }
    });
    
    // Colocar bloco
    socket.on('placeBlock', (data) => {
        if (!currentServer || !player) return;
        
        const world = gameState.worlds[currentServer];
        if (!world) return;
        
        const { x, y, blockType } = data;
        
        // Verifica distância
        const dist = Math.sqrt(Math.pow(player.x - x * BLOCK_SIZE, 2) + Math.pow(player.y - y * BLOCK_SIZE, 2));
        if (dist > 100) return;
        
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            if (world.blocks[x][y] === BLOCKS.AIR) {
                // Verifica se tem item no inventário
                if (removeFromInventory(player, blockType)) {
                    world.blocks[x][y] = blockType;
                    calculateLighting(world);
                    
                    io.to(currentServer).emit('blockUpdate', { x, y, type: blockType });
                }
            }
        }
    });
    
    // Atirar
    socket.on('shoot', (data) => {
        if (!currentServer || !player) return;
        
        const server = gameState.servers[currentServer];
        if (!server) return;
        
        const angle = data.angle;
        const speed = 15;
        
        const id = 'p_' + (server.projectileIdCounter++);
        server.projectiles[id] = {
            id,
            x: player.x + 12,
            y: player.y + 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage: 25,
            ownerId: socket.id,
            lifetime: 3000
        };
    });
    
    // Pegar drop
    socket.on('pickupDrop', (data) => {
        if (!currentServer || !player) return;
        
        const server = gameState.servers[currentServer];
        const drop = server.drops[data.dropId];
        
        if (!drop) return;
        
        const dist = Math.sqrt(Math.pow(player.x - drop.x, 2) + Math.pow(player.y - drop.y, 2));
        if (dist > 40) return;
        
        if (drop.type === 'xp') {
            player.xp += drop.amount;
            checkLevelUp(player, currentServer);
        } else if (drop.type === 'health_potion') {
            player.hp = Math.min(player.maxHp, player.hp + 30);
        } else {
            addToInventory(player, drop.type, drop.amount);
        }
        
        delete server.drops[data.dropId];
        
        socket.emit('inventoryUpdate', player.inventory);
    });
    
    // Requisita chunks do mundo
    socket.on('requestChunks', (data) => {
        if (!currentServer) return;
        
        const world = gameState.worlds[currentServer];
        if (!world) return;
        
        const chunks = getWorldChunks(world, data.x, data.y);
        socket.emit('worldChunks', chunks);
    });
    
    // Chat
    socket.on('chat', (message) => {
        if (!currentServer || !player) return;
        
        io.to(currentServer).emit('chat', {
            playerId: socket.id,
            playerName: player.name,
            message: message.substring(0, 200)
        });
    });
    
    // Desconexão
    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
        
        if (currentServer && gameState.servers[currentServer]) {
            delete gameState.servers[currentServer].players[socket.id];
            io.to(currentServer).emit('playerLeft', { playerId: socket.id });
        }
    });
});

// ==================== FUNÇÕES AUXILIARES ====================
function createDefaultInventory() {
    return {
        hotbar: [
            { type: 'pickaxe', amount: 1 },
            { type: 'sword', amount: 1 },
            { type: 'gun', amount: 1 },
            { type: BLOCKS.TORCH, amount: 10 },
            null, null, null, null, null
        ],
        main: new Array(27).fill(null)
    };
}

function getBlockDropType(blockType) {
    const drops = {
        [BLOCKS.GRASS]: 'dirt',
        [BLOCKS.DIRT]: 'dirt',
        [BLOCKS.STONE]: 'stone',
        [BLOCKS.COAL]: 'coal',
        [BLOCKS.IRON]: 'iron_ore',
        [BLOCKS.GOLD]: 'gold_ore',
        [BLOCKS.DIAMOND]: 'diamond',
        [BLOCKS.WOOD]: 'wood',
        [BLOCKS.LEAVES]: Math.random() < 0.1 ? 'sapling' : null,
        [BLOCKS.SAND]: 'sand'
    };
    return drops[blockType] || null;
}

function addToInventory(player, itemType, amount) {
    // Procura slot existente
    for (let i = 0; i < player.inventory.hotbar.length; i++) {
        if (player.inventory.hotbar[i] && player.inventory.hotbar[i].type === itemType) {
            player.inventory.hotbar[i].amount += amount;
            return true;
        }
    }
    
    // Procura slot vazio
    for (let i = 0; i < player.inventory.hotbar.length; i++) {
        if (!player.inventory.hotbar[i]) {
            player.inventory.hotbar[i] = { type: itemType, amount };
            return true;
        }
    }
    
    // Procura no inventário principal
    for (let i = 0; i < player.inventory.main.length; i++) {
        if (!player.inventory.main[i]) {
            player.inventory.main[i] = { type: itemType, amount };
            return true;
        }
    }
    
    return false;
}

function removeFromInventory(player, itemType) {
    for (let i = 0; i < player.inventory.hotbar.length; i++) {
        if (player.inventory.hotbar[i] && player.inventory.hotbar[i].type === itemType) {
            player.inventory.hotbar[i].amount--;
            if (player.inventory.hotbar[i].amount <= 0) {
                player.inventory.hotbar[i] = null;
            }
            return true;
        }
    }
    return false;
}

function checkLevelUp(player, serverId) {
    const xpNeeded = player.level * 100;
    if (player.xp >= xpNeeded) {
        player.xp -= xpNeeded;
        player.level++;
        player.maxHp += 10;
        player.hp = player.maxHp;
        
        io.to(serverId).emit('levelUp', {
            playerId: player.id,
            level: player.level
        });
    }
}

function getWorldChunks(world, centerX, centerY) {
    const chunkSize = 32;
    const viewDistance = 3;
    
    const centerChunkX = Math.floor(centerX / BLOCK_SIZE / chunkSize);
    const centerChunkY = Math.floor(centerY / BLOCK_SIZE / chunkSize);
    
    const chunks = [];
    
    for (let cx = centerChunkX - viewDistance; cx <= centerChunkX + viewDistance; cx++) {
        for (let cy = centerChunkY - viewDistance; cy <= centerChunkY + viewDistance; cy++) {
            const startX = cx * chunkSize;
            const startY = cy * chunkSize;
            
            if (startX < 0 || startY < 0 || startX >= WORLD_WIDTH || startY >= WORLD_HEIGHT) continue;
            
            const chunkData = {
                cx,
                cy,
                blocks: [],
                lights: []
            };
            
            for (let x = startX; x < Math.min(startX + chunkSize, WORLD_WIDTH); x++) {
                const colBlocks = [];
                const colLights = [];
                for (let y = startY; y < Math.min(startY + chunkSize, WORLD_HEIGHT); y++) {
                    colBlocks.push(world.blocks[x][y]);
                    colLights.push(world.lights[x][y]);
                }
                chunkData.blocks.push(colBlocks);
                chunkData.lights.push(colLights);
            }
            
            chunks.push(chunkData);
        }
    }
    
    return chunks;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Zombie Terraria Server rodando na porta ${PORT}`);
    console.log(`🌍 Mundo: ${WORLD_WIDTH}x${WORLD_HEIGHT} blocos`);
});
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
const WORLD_WIDTH = 400;  // blocos
const WORLD_HEIGHT = 200; // blocos
const TILE_SIZE = 16;
const SPAWN_X = WORLD_WIDTH / 2;
const SPAWN_Y = 50;

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
    WATER: 11,
    LAVA: 12,
    COBBLESTONE: 13,
    PLANKS: 14,
    TORCH: 15,
    CHEST: 16,
    WORKBENCH: 17,
    FURNACE: 18,
    BEDROCK: 19,
    COPPER: 20,
    SILVER: 21,
    OBSIDIAN: 22,
    GLASS: 23,
    BRICK: 24,
    PLATFORM: 25,
    DOOR_BOTTOM: 26,
    DOOR_TOP: 27,
    SNOW: 28,
    ICE: 29,
    CACTUS: 30
};

// Propriedades dos blocos
const TILE_PROPS = {
    [TILES.AIR]: { solid: false, transparent: true, hardness: 0, drops: null, light: 0 },
    [TILES.DIRT]: { solid: true, transparent: false, hardness: 1, drops: TILES.DIRT, light: 0 },
    [TILES.GRASS]: { solid: true, transparent: false, hardness: 1, drops: TILES.DIRT, light: 0 },
    [TILES.STONE]: { solid: true, transparent: false, hardness: 3, drops: TILES.COBBLESTONE, light: 0 },
    [TILES.WOOD]: { solid: true, transparent: false, hardness: 2, drops: TILES.WOOD, light: 0 },
    [TILES.LEAVES]: { solid: false, transparent: true, hardness: 0.5, drops: null, light: 0 },
    [TILES.COAL]: { solid: true, transparent: false, hardness: 3, drops: TILES.COAL, light: 0 },
    [TILES.IRON]: { solid: true, transparent: false, hardness: 4, drops: TILES.IRON, light: 0 },
    [TILES.GOLD]: { solid: true, transparent: false, hardness: 4, drops: TILES.GOLD, light: 0 },
    [TILES.DIAMOND]: { solid: true, transparent: false, hardness: 5, drops: TILES.DIAMOND, light: 0 },
    [TILES.SAND]: { solid: true, transparent: false, hardness: 1, drops: TILES.SAND, light: 0 },
    [TILES.WATER]: { solid: false, transparent: true, hardness: 0, drops: null, light: 0 },
    [TILES.LAVA]: { solid: false, transparent: true, hardness: 0, drops: null, light: 15 },
    [TILES.COBBLESTONE]: { solid: true, transparent: false, hardness: 3, drops: TILES.COBBLESTONE, light: 0 },
    [TILES.PLANKS]: { solid: true, transparent: false, hardness: 2, drops: TILES.PLANKS, light: 0 },
    [TILES.TORCH]: { solid: false, transparent: true, hardness: 0, drops: TILES.TORCH, light: 14 },
    [TILES.CHEST]: { solid: true, transparent: false, hardness: 2, drops: TILES.CHEST, light: 0 },
    [TILES.WORKBENCH]: { solid: true, transparent: false, hardness: 2, drops: TILES.WORKBENCH, light: 0 },
    [TILES.FURNACE]: { solid: true, transparent: false, hardness: 3, drops: TILES.FURNACE, light: 13 },
    [TILES.BEDROCK]: { solid: true, transparent: false, hardness: Infinity, drops: null, light: 0 },
    [TILES.COPPER]: { solid: true, transparent: false, hardness: 3, drops: TILES.COPPER, light: 0 },
    [TILES.SILVER]: { solid: true, transparent: false, hardness: 4, drops: TILES.SILVER, light: 0 },
    [TILES.OBSIDIAN]: { solid: true, transparent: false, hardness: 10, drops: TILES.OBSIDIAN, light: 0 },
    [TILES.GLASS]: { solid: true, transparent: true, hardness: 0.5, drops: null, light: 0 },
    [TILES.BRICK]: { solid: true, transparent: false, hardness: 4, drops: TILES.BRICK, light: 0 },
    [TILES.PLATFORM]: { solid: false, transparent: true, hardness: 1, drops: TILES.PLATFORM, light: 0, platform: true },
    [TILES.DOOR_BOTTOM]: { solid: true, transparent: false, hardness: 2, drops: TILES.DOOR_BOTTOM, light: 0 },
    [TILES.DOOR_TOP]: { solid: true, transparent: false, hardness: 2, drops: null, light: 0 },
    [TILES.SNOW]: { solid: true, transparent: false, hardness: 1, drops: TILES.SNOW, light: 0 },
    [TILES.ICE]: { solid: true, transparent: true, hardness: 1, drops: null, light: 0 },
    [TILES.CACTUS]: { solid: true, transparent: false, hardness: 1, drops: TILES.CACTUS, light: 0 }
};

// ==================== SERVIDORES/SALAS ====================
const servers = new Map();
const players = new Map();

// ==================== GERAÇÃO DO MUNDO ====================
function generateWorld() {
    const world = {
        tiles: [],
        background: [],
        lightMap: [],
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT
    };
    
    // Inicializa arrays
    for (let x = 0; x < WORLD_WIDTH; x++) {
        world.tiles[x] = [];
        world.background[x] = [];
        world.lightMap[x] = [];
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            world.tiles[x][y] = TILES.AIR;
            world.background[x][y] = TILES.AIR;
            world.lightMap[x][y] = 0;
        }
    }
    
    // Gera terreno com Perlin-like noise
    const surfaceHeight = [];
    let height = WORLD_HEIGHT * 0.35;
    
    for (let x = 0; x < WORLD_WIDTH; x++) {
        // Variação suave do terreno
        height += (Math.random() - 0.5) * 2;
        height = Math.max(WORLD_HEIGHT * 0.25, Math.min(WORLD_HEIGHT * 0.45, height));
        
        // Adiciona colinas ocasionais
        if (Math.random() < 0.02) {
            height -= Math.random() * 10;
        }
        if (Math.random() < 0.02) {
            height += Math.random() * 10;
        }
        
        surfaceHeight[x] = Math.floor(height);
    }
    
    // Suaviza o terreno
    for (let i = 0; i < 3; i++) {
        for (let x = 1; x < WORLD_WIDTH - 1; x++) {
            surfaceHeight[x] = Math.floor((surfaceHeight[x-1] + surfaceHeight[x] + surfaceHeight[x+1]) / 3);
        }
    }
    
    // Preenche o terreno
    for (let x = 0; x < WORLD_WIDTH; x++) {
        const surface = surfaceHeight[x];
        
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            if (y < surface) {
                world.tiles[x][y] = TILES.AIR;
            } else if (y === surface) {
                world.tiles[x][y] = TILES.GRASS;
            } else if (y < surface + 4 + Math.floor(Math.random() * 3)) {
                world.tiles[x][y] = TILES.DIRT;
            } else if (y >= WORLD_HEIGHT - 1) {
                world.tiles[x][y] = TILES.BEDROCK;
            } else {
                world.tiles[x][y] = TILES.STONE;
            }
            
            // Background para áreas subterrâneas
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
    
    // Gera estruturas especiais
    generateStructures(world, surfaceHeight);
    
    return world;
}

function generateCaves(world, surfaceHeight) {
    const numCaves = Math.floor(WORLD_WIDTH * WORLD_HEIGHT * 0.0003);
    
    for (let i = 0; i < numCaves; i++) {
        let x = Math.floor(Math.random() * WORLD_WIDTH);
        let y = Math.floor(surfaceHeight[Math.floor(WORLD_WIDTH/2)] + 10 + Math.random() * (WORLD_HEIGHT - surfaceHeight[Math.floor(WORLD_WIDTH/2)] - 20));
        
        const length = 50 + Math.floor(Math.random() * 150);
        let dirX = Math.random() - 0.5;
        let dirY = Math.random() - 0.3;
        
        for (let j = 0; j < length; j++) {
            const radius = 2 + Math.floor(Math.random() * 4);
            
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (dx*dx + dy*dy <= radius*radius) {
                        const nx = Math.floor(x + dx);
                        const ny = Math.floor(y + dy);
                        
                        if (nx > 0 && nx < WORLD_WIDTH - 1 && ny > surfaceHeight[nx] + 2 && ny < WORLD_HEIGHT - 1) {
                            if (world.tiles[nx][ny] !== TILES.BEDROCK) {
                                world.tiles[nx][ny] = TILES.AIR;
                            }
                        }
                    }
                }
            }
            
            dirX += (Math.random() - 0.5) * 0.2;
            dirY += (Math.random() - 0.5) * 0.2;
            dirX = Math.max(-1, Math.min(1, dirX));
            dirY = Math.max(-0.5, Math.min(0.8, dirY));
            
            x += dirX * 2;
            y += dirY * 2;
            
            if (x < 5 || x > WORLD_WIDTH - 5 || y > WORLD_HEIGHT - 5) break;
        }
    }
}

function generateOres(world, surfaceHeight) {
    const avgSurface = surfaceHeight[Math.floor(WORLD_WIDTH/2)];
    
    // Define profundidade dos minérios
    const ores = [
        { type: TILES.COAL, minDepth: 0, maxDepth: 0.9, chance: 0.008, veinSize: [3, 8] },
        { type: TILES.COPPER, minDepth: 0.1, maxDepth: 0.7, chance: 0.006, veinSize: [3, 6] },
        { type: TILES.IRON, minDepth: 0.2, maxDepth: 0.8, chance: 0.005, veinSize: [2, 5] },
        { type: TILES.SILVER, minDepth: 0.4, maxDepth: 0.9, chance: 0.003, veinSize: [2, 4] },
        { type: TILES.GOLD, minDepth: 0.5, maxDepth: 0.95, chance: 0.002, veinSize: [2, 4] },
        { type: TILES.DIAMOND, minDepth: 0.8, maxDepth: 0.98, chance: 0.001, veinSize: [1, 3] }
    ];
    
    const undergroundHeight = WORLD_HEIGHT - avgSurface;
    
    for (const ore of ores) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let y = avgSurface; y < WORLD_HEIGHT - 1; y++) {
                const depth = (y - avgSurface) / undergroundHeight;
                
                if (depth >= ore.minDepth && depth <= ore.maxDepth) {
                    if (world.tiles[x][y] === TILES.STONE && Math.random() < ore.chance) {
                        // Gera veia de minério
                        const veinSize = ore.veinSize[0] + Math.floor(Math.random() * (ore.veinSize[1] - ore.veinSize[0]));
                        generateOreVein(world, x, y, ore.type, veinSize);
                    }
                }
            }
        }
    }
}

function generateOreVein(world, startX, startY, oreType, size) {
    let x = startX;
    let y = startY;
    
    for (let i = 0; i < size; i++) {
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT - 1) {
            if (world.tiles[x][y] === TILES.STONE) {
                world.tiles[x][y] = oreType;
            }
        }
        
        x += Math.floor(Math.random() * 3) - 1;
        y += Math.floor(Math.random() * 3) - 1;
    }
}

function generateTrees(world, surfaceHeight) {
    for (let x = 5; x < WORLD_WIDTH - 5; x++) {
        if (Math.random() < 0.08) {
            const surface = surfaceHeight[x];
            
            if (world.tiles[x][surface] === TILES.GRASS) {
                const height = 5 + Math.floor(Math.random() * 8);
                
                // Tronco
                for (let y = surface - height; y < surface; y++) {
                    if (y >= 0) {
                        world.tiles[x][y] = TILES.WOOD;
                    }
                }
                
                // Copa
                const crownStart = surface - height;
                const crownRadius = 2 + Math.floor(Math.random() * 2);
                
                for (let dx = -crownRadius; dx <= crownRadius; dx++) {
                    for (let dy = -crownRadius; dy <= crownRadius; dy++) {
                        const nx = x + dx;
                        const ny = crownStart + dy;
                        
                        if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0) {
                            if (dx*dx + dy*dy <= crownRadius*crownRadius + Math.random() * 2) {
                                if (world.tiles[nx][ny] === TILES.AIR) {
                                    world.tiles[nx][ny] = TILES.LEAVES;
                                }
                            }
                        }
                    }
                }
                
                x += 4; // Espaçamento mínimo entre árvores
            }
        }
    }
}

function generateStructures(world, surfaceHeight) {
    // Gera algumas tochas de superfície para iluminação inicial
    for (let x = 20; x < WORLD_WIDTH - 20; x += 30 + Math.floor(Math.random() * 20)) {
        const surface = surfaceHeight[x];
        if (world.tiles[x][surface] === TILES.GRASS && world.tiles[x][surface-1] === TILES.AIR) {
            world.tiles[x][surface-1] = TILES.TORCH;
        }
    }
}

// ==================== ZUMBIS ====================
function createZombie(serverId, x, y) {
    const types = ['normal', 'fast', 'tank', 'crawler'];
    const weights = [0.5, 0.25, 0.15, 0.1];
    
    // Seleciona tipo baseado em peso
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
        tank: { hp: 300, speed: 0.8, damage: 25, xp: 30, width: 32, height: 48 },
        crawler: { hp: 60, speed: 2, damage: 12, xp: 12, width: 32, height: 20 }
    };
    
    const s = stats[type];
    
    return {
        id: `zombie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        x, y,
        vx: 0, vy: 0,
        width: s.width,
        height: s.height,
        hp: s.hp,
        maxHp: s.hp,
        speed: s.speed,
        damage: s.damage,
        xp: s.xp,
        grounded: false,
        facingRight: Math.random() > 0.5,
        attackCooldown: 0,
        jumpCooldown: 0,
        state: 'idle', // idle, walking, jumping, attacking
        animFrame: 0,
        target: null
    };
}

// ==================== SERVIDOR DE JOGO ====================
function createServer(name, maxPlayers = 10) {
    const id = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const gameServer = {
        id,
        name,
        maxPlayers,
        players: new Map(),
        world: generateWorld(),
        zombies: new Map(),
        items: new Map(),
        projectiles: new Map(),
        particles: [],
        wave: 1,
        waveTimer: 90,
        dayTime: 0.25, // 0 = meia-noite, 0.5 = meio-dia
        dayDuration: 1200, // segundos para um ciclo completo
        spawnTimer: 0,
        lastUpdate: Date.now()
    };
    
    servers.set(id, gameServer);
    return gameServer;
}

// ==================== GAME LOOP ====================
const TICK_RATE = 60;
const GRAVITY = 0.5;
const MAX_FALL_SPEED = 15;
const JUMP_FORCE = 10;

function gameLoop() {
    const now = Date.now();
    
    servers.forEach((server, serverId) => {
        const deltaTime = (now - server.lastUpdate) / 1000;
        server.lastUpdate = now;
        
        if (server.players.size === 0) return;
        
        // Atualiza ciclo dia/noite
        server.dayTime = (server.dayTime + deltaTime / server.dayDuration) % 1;
        
        // Atualiza timer de wave
        server.waveTimer -= deltaTime;
        if (server.waveTimer <= 0) {
            server.wave++;
            server.waveTimer = 90;
            
            // Notifica nova wave
            io.to(serverId).emit('newWave', { wave: server.wave });
            
            // Spawn de boss a cada 5 waves
            if (server.wave % 5 === 0) {
                spawnBoss(server);
            }
        }
        
        // Spawn de zumbis à noite
        const isNight = server.dayTime < 0.25 || server.dayTime > 0.75;
        if (isNight) {
            server.spawnTimer -= deltaTime;
            if (server.spawnTimer <= 0) {
                spawnZombies(server);
                server.spawnTimer = Math.max(0.5, 3 - server.wave * 0.1);
            }
        }
        
        // Atualiza jogadores
        server.players.forEach((player, playerId) => {
            updatePlayer(server, player, deltaTime);
        });
        
        // Atualiza zumbis
        server.zombies.forEach((zombie, zombieId) => {
            updateZombie(server, zombie, deltaTime);
        });
        
        // Atualiza projéteis
        server.projectiles.forEach((proj, projId) => {
            updateProjectile(server, proj, deltaTime);
            if (proj.dead) {
                server.projectiles.delete(projId);
            }
        });
        
        // Atualiza itens
        server.items.forEach((item, itemId) => {
            updateItem(server, item, deltaTime);
            if (item.dead) {
                server.items.delete(itemId);
            }
        });
        
        // Envia estado do jogo
        broadcastGameState(server);
    });
}

function updatePlayer(server, player, dt) {
    // Aplica gravidade
    player.vy += GRAVITY;
    player.vy = Math.min(player.vy, MAX_FALL_SPEED);
    
    // Aplica velocidade horizontal
    if (player.input.left) {
        player.vx = -player.speed;
        player.facingRight = false;
    } else if (player.input.right) {
        player.vx = player.speed;
        player.facingRight = true;
    } else {
        player.vx *= 0.8; // Fricção
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }
    
    // Pulo
    if (player.input.jump && player.grounded) {
        player.vy = -JUMP_FORCE;
        player.grounded = false;
    }
    
    // Move e verifica colisões
    moveEntity(server.world, player, dt);
    
    // Regeneração passiva
    if (player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + 0.5 * dt);
    }
    
    // Atualiza cooldowns
    if (player.attackCooldown > 0) {
        player.attackCooldown -= dt;
    }
}

function updateZombie(server, zombie, dt) {
    // Encontra jogador mais próximo
    let nearestPlayer = null;
    let nearestDist = Infinity;
    
    server.players.forEach((player) => {
        const dist = Math.hypot(player.x - zombie.x, player.y - zombie.y);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlayer = player;
        }
    });
    
    if (nearestPlayer && nearestDist < 500) {
        zombie.target = nearestPlayer;
        
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
        
        // Pula se bloqueado ou se jogador está acima
        if (zombie.grounded && zombie.jumpCooldown <= 0) {
            const ahead = zombie.facingRight ? zombie.x + 20 : zombie.x - 20;
            const tileAhead = getTile(server.world, ahead, zombie.y);
            const playerAbove = nearestPlayer.y < zombie.y - 30;
            
            if ((tileAhead && TILE_PROPS[tileAhead]?.solid) || playerAbove) {
                zombie.vy = -JUMP_FORCE * 0.8;
                zombie.jumpCooldown = 0.5;
            }
        }
        
        // Ataca jogador
        if (nearestDist < 40 && zombie.attackCooldown <= 0) {
            nearestPlayer.hp -= zombie.damage;
            zombie.attackCooldown = 1;
            
            io.to(server.id).emit('playerDamaged', {
                playerId: nearestPlayer.id,
                damage: zombie.damage,
                hp: nearestPlayer.hp
            });
            
            if (nearestPlayer.hp <= 0) {
                handlePlayerDeath(server, nearestPlayer);
            }
        }
    } else {
        // Idle/patrulha
        if (Math.random() < 0.01) {
            zombie.vx = (Math.random() - 0.5) * zombie.speed;
            zombie.facingRight = zombie.vx > 0;
        }
    }
    
    // Aplica gravidade
    zombie.vy += GRAVITY;
    zombie.vy = Math.min(zombie.vy, MAX_FALL_SPEED);
    
    // Atualiza cooldowns
    zombie.jumpCooldown = Math.max(0, zombie.jumpCooldown - dt);
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
    
    // Move
    moveEntity(server.world, zombie, dt);
    
    // Animação
    zombie.animFrame = (zombie.animFrame + dt * 10) % 4;
}

function updateProjectile(server, proj, dt) {
    proj.x += proj.vx * dt * 60;
    proj.y += proj.vy * dt * 60;
    proj.vy += GRAVITY * 0.3;
    
    proj.life -= dt;
    if (proj.life <= 0) {
        proj.dead = true;
        return;
    }
    
    // Colisão com blocos
    const tile = getTile(server.world, proj.x, proj.y);
    if (tile && TILE_PROPS[tile]?.solid) {
        proj.dead = true;
        return;
    }
    
    // Colisão com zumbis
    server.zombies.forEach((zombie, zombieId) => {
        if (proj.dead) return;
        
        if (proj.x > zombie.x - zombie.width/2 && 
            proj.x < zombie.x + zombie.width/2 &&
            proj.y > zombie.y - zombie.height/2 && 
            proj.y < zombie.y + zombie.height/2) {
            
            zombie.hp -= proj.damage;
            proj.dead = true;
            
            if (zombie.hp <= 0) {
                handleZombieDeath(server, zombie, proj.ownerId);
            }
        }
    });
}

function updateItem(server, item, dt) {
    // Gravidade
    item.vy = (item.vy || 0) + GRAVITY * 0.5;
    item.y += item.vy;
    
    // Colisão com chão
    const tile = getTile(server.world, item.x, item.y + 8);
    if (tile && TILE_PROPS[tile]?.solid) {
        item.y = Math.floor(item.y / TILE_SIZE) * TILE_SIZE;
        item.vy = 0;
    }
    
    // Lifetime
    item.lifetime -= dt;
    if (item.lifetime <= 0) {
        item.dead = true;
        return;
    }
    
    // Coleta por jogadores
    server.players.forEach((player) => {
        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < 40) {
            // Adiciona ao inventário
            addToInventory(player, item.type, item.amount);
            item.dead = true;
            
            io.to(server.id).emit('itemCollected', {
                playerId: player.id,
                itemType: item.type,
                amount: item.amount
            });
        }
    });
}

function moveEntity(world, entity, dt) {
    const steps = 4;
    const stepX = (entity.vx * dt * 60) / steps;
    const stepY = (entity.vy * dt * 60) / steps;
    
    entity.grounded = false;
    
    for (let i = 0; i < steps; i++) {
        // Move X
        entity.x += stepX;
        if (checkCollision(world, entity)) {
            entity.x -= stepX;
            entity.vx = 0;
        }
        
        // Move Y
        entity.y += stepY;
        if (checkCollision(world, entity)) {
            entity.y -= stepY;
            if (entity.vy > 0) {
                entity.grounded = true;
            }
            entity.vy = 0;
        }
    }
    
    // Limites do mundo
    entity.x = Math.max(entity.width/2, Math.min(WORLD_WIDTH * TILE_SIZE - entity.width/2, entity.x));
    entity.y = Math.max(0, Math.min(WORLD_HEIGHT * TILE_SIZE - entity.height, entity.y));
}

function checkCollision(world, entity) {
    const left = Math.floor((entity.x - entity.width/2) / TILE_SIZE);
    const right = Math.floor((entity.x + entity.width/2) / TILE_SIZE);
    const top = Math.floor((entity.y - entity.height/2) / TILE_SIZE);
    const bottom = Math.floor((entity.y + entity.height/2) / TILE_SIZE);
    
    for (let x = left; x <= right; x++) {
        for (let y = top; y <= bottom; y++) {
            const tile = getTile(world, x * TILE_SIZE, y * TILE_SIZE);
            if (tile && TILE_PROPS[tile]?.solid) {
                return true;
            }
        }
    }
    
    return false;
}

function getTile(world, pixelX, pixelY) {
    const x = Math.floor(pixelX / TILE_SIZE);
    const y = Math.floor(pixelY / TILE_SIZE);
    
    if (x < 0 || x >= world.width || y < 0 || y >= world.height) {
        return TILES.BEDROCK;
    }
    
    return world.tiles[x][y];
}

function setTile(world, pixelX, pixelY, tileType) {
    const x = Math.floor(pixelX / TILE_SIZE);
    const y = Math.floor(pixelY / TILE_SIZE);
    
    if (x < 0 || x >= world.width || y < 0 || y >= world.height) {
        return false;
    }
    
    if (world.tiles[x][y] === TILES.BEDROCK) {
        return false;
    }
    
    world.tiles[x][y] = tileType;
    return true;
}

function spawnZombies(server) {
    const numToSpawn = Math.min(1 + Math.floor(server.wave / 3), 5);
    
    server.players.forEach((player) => {
        for (let i = 0; i < numToSpawn; i++) {
            // Spawn fora da tela do jogador
            const side = Math.random() > 0.5 ? 1 : -1;
            const spawnX = player.x + side * (600 + Math.random() * 200);
            
            // Encontra superfície
            let spawnY = 0;
            for (let y = 0; y < server.world.height; y++) {
                const tile = server.world.tiles[Math.floor(spawnX / TILE_SIZE)]?.[y];
                if (tile && TILE_PROPS[tile]?.solid) {
                    spawnY = y * TILE_SIZE - 20;
                    break;
                }
            }
            
            if (spawnX > 0 && spawnX < WORLD_WIDTH * TILE_SIZE) {
                const zombie = createZombie(server.id, spawnX, spawnY);
                
                // Buff baseado na wave
                zombie.hp *= 1 + (server.wave - 1) * 0.1;
                zombie.maxHp = zombie.hp;
                zombie.damage *= 1 + (server.wave - 1) * 0.05;
                
                server.zombies.set(zombie.id, zombie);
            }
        }
    });
}

function spawnBoss(server) {
    const bossTypes = ['giant', 'necromancer', 'berserker'];
    const type = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    
    // Spawn no centro dos jogadores
    let avgX = 0, count = 0;
    server.players.forEach((player) => {
        avgX += player.x;
        count++;
    });
    
    if (count === 0) return;
    avgX /= count;
    
    const side = Math.random() > 0.5 ? 1 : -1;
    const spawnX = avgX + side * 800;
    
    let spawnY = 0;
    for (let y = 0; y < server.world.height; y++) {
        const tile = server.world.tiles[Math.floor(spawnX / TILE_SIZE)]?.[y];
        if (tile && TILE_PROPS[tile]?.solid) {
            spawnY = y * TILE_SIZE - 40;
            break;
        }
    }
    
    const boss = {
        id: `boss_${Date.now()}`,
        type,
        isBoss: true,
        x: spawnX,
        y: spawnY,
        vx: 0, vy: 0,
        width: 64,
        height: 80,
        hp: 1000 * server.wave,
        maxHp: 1000 * server.wave,
        speed: 1.2,
        damage: 30 + server.wave * 5,
        xp: 200 * server.wave,
        grounded: false,
        facingRight: side < 0,
        attackCooldown: 0,
        jumpCooldown: 0,
        state: 'idle',
        animFrame: 0,
        target: null
    };
    
    server.zombies.set(boss.id, boss);
    
    io.to(server.id).emit('bossSpawn', { boss });
}

function handleZombieDeath(server, zombie, killerId) {
    // Drop XP e itens
    const item = {
        id: `item_${Date.now()}_${Math.random()}`,
        type: 'xp',
        amount: zombie.xp,
        x: zombie.x,
        y: zombie.y,
        vy: -5,
        lifetime: 30
    };
    
    server.items.set(item.id, item);
    
    // Chance de drop de itens especiais
    if (Math.random() < 0.1) {
        const drops = ['coin', 'health_potion', 'ammo'];
        const dropItem = {
            id: `item_${Date.now()}_${Math.random()}`,
            type: drops[Math.floor(Math.random() * drops.length)],
            amount: 1,
            x: zombie.x + (Math.random() - 0.5) * 20,
            y: zombie.y,
            vy: -5,
            lifetime: 60
        };
        server.items.set(dropItem.id, dropItem);
    }
    
    // Remove zumbi
    server.zombies.delete(zombie.id);
    
    // Notifica
    io.to(server.id).emit('zombieDeath', {
        zombieId: zombie.id,
        x: zombie.x,
        y: zombie.y,
        killerId
    });
    
    // Dá XP ao jogador
    const killer = server.players.get(killerId);
    if (killer) {
        killer.xp += zombie.xp;
        checkLevelUp(killer);
    }
}

function handlePlayerDeath(server, player) {
    // Drop de itens
    // TODO: implementar drop do inventário
    
    // Respawn
    player.hp = player.maxHp;
    player.x = SPAWN_X * TILE_SIZE;
    player.y = findSpawnY(server.world, SPAWN_X) * TILE_SIZE;
    
    io.to(server.id).emit('playerDeath', {
        playerId: player.id,
        x: player.x,
        y: player.y
    });
}

function findSpawnY(world, x) {
    for (let y = 0; y < world.height; y++) {
        if (world.tiles[x]?.[y] && TILE_PROPS[world.tiles[x][y]]?.solid) {
            return y - 2;
        }
    }
    return 50;
}

function addToInventory(player, itemType, amount) {
    // Encontra slot existente ou vazio
    for (let i = 0; i < player.inventory.length; i++) {
        if (player.inventory[i]?.type === itemType) {
            player.inventory[i].amount += amount;
            return;
        }
    }
    
    for (let i = 0; i < player.inventory.length; i++) {
        if (!player.inventory[i]) {
            player.inventory[i] = { type: itemType, amount };
            return;
        }
    }
}

function checkLevelUp(player) {
    const xpNeeded = 100 * Math.pow(1.5, player.level - 1);
    
    while (player.xp >= xpNeeded) {
        player.xp -= xpNeeded;
        player.level++;
        player.maxHp += 10;
        player.hp = player.maxHp;
        player.damage += 2;
        
        io.to(player.serverId).emit('levelUp', {
            playerId: player.id,
            level: player.level
        });
    }
}

function broadcastGameState(server) {
    const state = {
        time: server.dayTime,
        wave: server.wave,
        waveTimer: Math.ceil(server.waveTimer),
        players: Array.from(server.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            x: p.x, y: p.y,
            vx: p.vx, vy: p.vy,
            hp: p.hp, maxHp: p.maxHp,
            level: p.level,
            facingRight: p.facingRight,
            grounded: p.grounded,
            color: p.color,
            selectedSlot: p.selectedSlot
        })),
        zombies: Array.from(server.zombies.values()).map(z => ({
            id: z.id,
            type: z.type,
            x: z.x, y: z.y,
            hp: z.hp, maxHp: z.maxHp,
            facingRight: z.facingRight,
            isBoss: z.isBoss,
            animFrame: Math.floor(z.animFrame)
        })),
        projectiles: Array.from(server.projectiles.values()).map(p => ({
            id: p.id, type: p.type,
            x: p.x, y: p.y,
            vx: p.vx, vy: p.vy
        })),
        items: Array.from(server.items.values()).map(i => ({
            id: i.id, type: i.type,
            x: i.x, y: i.y,
            amount: i.amount
        }))
    };
    
    io.to(server.id).emit('gameState', state);
}

// ==================== SOCKET HANDLERS ====================
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Lista servidores
    socket.on('getServers', () => {
        const serverList = Array.from(servers.values()).map(s => ({
            id: s.id,
            name: s.name,
            players: s.players.size,
            maxPlayers: s.maxPlayers,
            wave: s.wave
        }));
        socket.emit('serverList', serverList);
    });
    
    // Criar servidor
    socket.on('createServer', (data) => {
        const server = createServer(data.serverName || 'New Server', data.maxPlayers || 10);
        socket.emit('serverCreated', { serverId: server.id });
    });
    
    // Entrar no jogo
    socket.on('joinGame', (data) => {
        const { serverId, playerName, playerColor } = data;
        
        let server = servers.get(serverId);
        if (!server) {
            // Cria servidor padrão se não existir
            server = createServer('Main Server');
        }
        
        if (server.players.size >= server.maxPlayers) {
            socket.emit('joinError', { message: 'Server is full' });
            return;
        }
        
        // Encontra spawn
        const spawnY = findSpawnY(server.world, SPAWN_X);
        
        const player = {
            id: socket.id,
            name: playerName || 'Player',
            color: playerColor || '#00ff00',
            x: SPAWN_X * TILE_SIZE,
            y: spawnY * TILE_SIZE,
            vx: 0, vy: 0,
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
            inventory: new Array(40).fill(null),
            hotbar: new Array(9).fill(null),
            selectedSlot: 0,
            input: { left: false, right: false, jump: false },
            attackCooldown: 0,
            serverId: server.id
        };
        
        // Itens iniciais
        player.hotbar[0] = { type: 'pickaxe', amount: 1, damage: 5 };
        player.hotbar[1] = { type: 'sword', amount: 1, damage: 15 };
        player.hotbar[2] = { type: 'torch', amount: 50 };
        player.hotbar[3] = { type: 'wood', amount: 20 };
        
        server.players.set(socket.id, player);
        players.set(socket.id, { serverId: server.id, player });
        
        socket.join(server.id);
        
        // Envia mundo para o jogador
        socket.emit('joinSuccess', {
            playerId: socket.id,
            player,
            world: {
                width: server.world.width,
                height: server.world.height,
                tiles: server.world.tiles,
                background: server.world.background
            },
            time: server.dayTime,
            wave: server.wave,
            waveTimer: server.waveTimer
        });
        
        // Notifica outros jogadores
        socket.to(server.id).emit('playerJoined', { player });
    });
    
    // Input do jogador
    socket.on('playerInput', (input) => {
        const data = players.get(socket.id);
        if (data?.player) {
            data.player.input = input;
        }
    });
    
    // Clique/ataque
    socket.on('playerAction', (action) => {
        const data = players.get(socket.id);
        if (!data) return;
        
        const { player, serverId } = data;
        const server = servers.get(serverId);
        if (!server) return;
        
        const { type, x, y } = action;
        
        if (type === 'break') {
            // Quebra bloco
            const tile = getTile(server.world, x, y);
            if (tile && tile !== TILES.AIR && tile !== TILES.BEDROCK) {
                const props = TILE_PROPS[tile];
                
                // Verifica distância
                const dist = Math.hypot(player.x - x, player.y - y);
                if (dist > 100) return;
                
                // Remove bloco
                setTile(server.world, x, y, TILES.AIR);
                
                // Drop
                if (props?.drops) {
                    const item = {
                        id: `item_${Date.now()}_${Math.random()}`,
                        type: 'block',
                        tileType: props.drops,
                        amount: 1,
                        x, y,
                        vy: -3,
                        lifetime: 60
                    };
                    server.items.set(item.id, item);
                }
                
                // Notifica
                io.to(serverId).emit('blockBroken', {
                    x: Math.floor(x / TILE_SIZE),
                    y: Math.floor(y / TILE_SIZE)
                });
            }
        } else if (type === 'place') {
            // Coloca bloco
            const tile = getTile(server.world, x, y);
            if (tile === TILES.AIR) {
                const selected = player.hotbar[player.selectedSlot];
                if (selected && selected.type === 'block' && selected.amount > 0) {
                    setTile(server.world, x, y, selected.tileType);
                    selected.amount--;
                    if (selected.amount <= 0) {
                        player.hotbar[player.selectedSlot] = null;
                    }
                    
                    io.to(serverId).emit('blockPlaced', {
                        x: Math.floor(x / TILE_SIZE),
                        y: Math.floor(y / TILE_SIZE),
                        tile: selected.tileType
                    });
                }
            }
        } else if (type === 'attack') {
            const selected = player.hotbar[player.selectedSlot];
            
            if (player.attackCooldown <= 0) {
                if (selected?.type === 'sword') {
                    // Ataque melee
                    const attackRange = 50;
                    const attackDir = player.facingRight ? 1 : -1;
                    
                    server.zombies.forEach((zombie) => {
                        const dx = zombie.x - player.x;
                        const dy = zombie.y - player.y;
                        const dist = Math.hypot(dx, dy);
                        
                        if (dist < attackRange && Math.sign(dx) === attackDir) {
                            zombie.hp -= player.damage + (selected.damage || 0);
                            if (zombie.hp <= 0) {
                                handleZombieDeath(server, zombie, socket.id);
                            }
                        }
                    });
                    
                    player.attackCooldown = 0.4;
                    io.to(serverId).emit('playerAttack', { playerId: socket.id, type: 'melee' });
                    
                } else if (selected?.type === 'bow' || selected?.type === 'gun') {
                    // Ataque ranged
                    const angle = Math.atan2(y - player.y, x - player.x);
                    const speed = selected.type === 'gun' ? 20 : 12;
                    
                    const projectile = {
                        id: `proj_${Date.now()}_${Math.random()}`,
                        type: selected.type === 'gun' ? 'bullet' : 'arrow',
                        ownerId: socket.id,
                        x: player.x,
                        y: player.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        damage: player.damage + (selected.damage || 0),
                        life: 3
                    };
                    
                    server.projectiles.set(projectile.id, projectile);
                    player.attackCooldown = selected.type === 'gun' ? 0.15 : 0.6;
                }
            }
        }
    });
    
    // Troca de slot
    socket.on('selectSlot', (slot) => {
        const data = players.get(socket.id);
        if (data?.player && slot >= 0 && slot < 9) {
            data.player.selectedSlot = slot;
        }
    });
    
    // Chat
    socket.on('chatMessage', (message) => {
        const data = players.get(socket.id);
        if (data) {
            io.to(data.serverId).emit('chatMessage', {
                playerId: socket.id,
                playerName: data.player.name,
                message: message.substring(0, 200)
            });
        }
    });
    
    // Desconexão
    socket.on('disconnect', () => {
        const data = players.get(socket.id);
        if (data) {
            const server = servers.get(data.serverId);
            if (server) {
                server.players.delete(socket.id);
                io.to(data.serverId).emit('playerLeft', { playerId: socket.id });
                
                // Remove servidor vazio após 5 minutos
                if (server.players.size === 0) {
                    setTimeout(() => {
                        if (server.players.size === 0) {
                            servers.delete(server.id);
                        }
                    }, 300000);
                }
            }
            players.delete(socket.id);
        }
        console.log('Player disconnected:', socket.id);
    });
});

// Inicia game loop
setInterval(gameLoop, 1000 / TICK_RATE);

// Inicia servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🧟 Zombie Survival Terraria server running on port ${PORT}`);
});
