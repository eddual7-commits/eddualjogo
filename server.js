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
