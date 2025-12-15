const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ==================== CONFIGURAÇÕES ====================
const CONFIG = {
    MAP_SIZE: 3200,
    TILE_SIZE: 100,
    PLAYER_SPEED: 4,
    ENEMY_SPAWN_RATE: 4000,
    RESOURCE_RESPAWN: 45000,
    WAVE_DURATION: 90000,
    MAX_ENEMIES: 40,
    BIOME_SIZE: 800
};

// ==================== BIOMAS ====================
const BIOMES = {
    forest: {
        name: 'Floresta',
        color: '#1a472a',
        enemies: ['slime', 'wolf'],
        resources: ['tree', 'bush'],
        drops: { wood: 4, herb: 2 }
    },
    desert: {
        name: 'Deserto',
        color: '#c2a366',
        enemies: ['scorpion', 'mummy'],
        resources: ['cactus', 'sandstone'],
        drops: { stone: 3, bone: 2 }
    },
    ice: {
        name: 'Geleira',
        color: '#a8d4e6',
        enemies: ['ice_golem', 'yeti'],
        resources: ['ice_crystal', 'frozen_tree'],
        drops: { crystal: 3, ice: 2 }
    },
    volcano: {
        name: 'Vulcão',
        color: '#4a1a1a',
        enemies: ['demon', 'fire_spirit'],
        resources: ['obsidian', 'fire_crystal'],
        drops: { obsite: 3, ember: 2 }
    },
    swamp: {
        name: 'Pântano',
        color: '#2d3a2d',
        enemies: ['ghost', 'witch'],
        resources: ['dead_tree', 'mushroom'],
        drops: { wood: 2, poison: 3 }
    },
    plains: {
        name: 'Planície',
        color: '#3d5c3d',
        enemies: ['goblin', 'rabbit'],
        resources: ['tree', 'stone', 'bush'],
        drops: { wood: 3, stone: 2 }
    }
};

// ==================== STATS DOS INIMIGOS ====================
const ENEMY_STATS = {
    slime: { hp: 25, damage: 3, speed: 1.2, xp: 8, attackSpeed: 1500, color: '#2ECC71' },
    wolf: { hp: 35, damage: 5, speed: 2.5, xp: 15, attackSpeed: 1000, color: '#555' },
    goblin: { hp: 30, damage: 4, speed: 1.8, xp: 12, attackSpeed: 1200, color: '#27AE60' },
    rabbit: { hp: 10, damage: 1, speed: 3, xp: 5, attackSpeed: 2000, color: '#D4A574' },
    scorpion: { hp: 40, damage: 6, speed: 1.5, xp: 18, attackSpeed: 1800, color: '#8B4513' },
    mummy: { hp: 60, damage: 8, speed: 1, xp: 25, attackSpeed: 2000, color: '#C4A35A' },
    ice_golem: { hp: 80, damage: 10, speed: 0.8, xp: 35, attackSpeed: 2500, color: '#87CEEB' },
    yeti: { hp: 100, damage: 12, speed: 1.2, xp: 45, attackSpeed: 2000, color: '#E8E8E8' },
    demon: { hp: 120, damage: 15, speed: 1.5, xp: 60, attackSpeed: 1500, color: '#DC143C' },
    fire_spirit: { hp: 50, damage: 10, speed: 2, xp: 40, attackSpeed: 1000, color: '#FF6B35' },
    ghost: { hp: 30, damage: 7, speed: 2.2, xp: 20, attackSpeed: 1200, color: '#9B59B6' },
    witch: { hp: 45, damage: 12, speed: 1, xp: 35, attackSpeed: 3000, color: '#4A0080' }
};

// ==================== FRASES DOS INIMIGOS ====================
const ENEMY_QUOTES = {
    slime: ["Blurp!", "Splash~", "*wobble*"],
    wolf: ["Grrrr!", "Auuuu!", "*rosnado*"],
    goblin: ["Hehe!", "Meu tesouro!", "Atacar!"],
    rabbit: ["...", "*pulo*", "!"],
    scorpion: ["Clack!", "*ferrão*", "Tss!"],
    mummy: ["Uuurgh...", "Morte...", "Maldição..."],
    ice_golem: ["*crack*", "Gelo...", "Congele!"],
    yeti: ["ROOOAR!", "Frio...", "SMASH!"],
    demon: ["QUEIME!", "Inferno!", "Sua alma!"],
    fire_spirit: ["Fogo~", "*chamas*", "Ardaaa!"],
    ghost: ["Buuu~", "Venha...", "Eterno..."],
    witch: ["Hehehe!", "Maldição!", "Poção~"]
};

// ==================== CUSTOS DE CONSTRUÇÃO ====================
const BUILD_COSTS = {
    wall: { wood: 8, stone: 0, crystal: 0, hp: 150 },
    turret: { wood: 15, stone: 10, crystal: 2, hp: 100, damage: 8, range: 180 },
    campfire: { wood: 12, stone: 5, crystal: 0, hp: 80, healRate: 2 },
    spikes: { wood: 5, stone: 5, crystal: 0, hp: 50, damage: 10 },
    tower: { wood: 25, stone: 20, crystal: 5, hp: 200, range: 250, damage: 15 }
};

// ==================== SALAS ====================
const rooms = {};

// ==================== FUNÇÕES UTILITÁRIAS ====================
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for(let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function getBiome(x, y) {
    const biomeX = Math.floor(x / CONFIG.BIOME_SIZE);
    const biomeY = Math.floor(y / CONFIG.BIOME_SIZE);
    const biomeIndex = (biomeX + biomeY * 4) % 6;
    const biomeNames = ['plains', 'forest', 'desert', 'ice', 'swamp', 'volcano'];
    return biomeNames[biomeIndex];
}

function getPlayerColor(index) {
    const baseColors = [
        { h: 174, s: 72, l: 56 }, // Cyan Miku
        { h: 180, s: 65, l: 50 },
        { h: 190, s: 60, l: 45 },
        { h: 200, s: 55, l: 40 },
        { h: 210, s: 50, l: 35 },
        { h: 220, s: 45, l: 30 }
    ];
    const color = baseColors[Math.min(index, baseColors.length - 1)];
    return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
}

// ==================== CRIAR JOGADOR ====================
function createPlayer(name, colorIndex) {
    return {
        name: name || 'Miku',
        x: CONFIG.MAP_SIZE / 2,
        y: CONFIG.MAP_SIZE / 2,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        level: 1,
        xp: 0,
        nextXp: 80,
        wood: 0,
        stone: 0,
        crystal: 0,
        food: 5,
        speed: CONFIG.PLAYER_SPEED,
        damage: 8,
        attackRange: 80,
        attackSpeed: 400,
        lastAttack: 0,
        state: 'idle',
        animFrame: 0,
        angle: 0,
        facing: 1,
        color: getPlayerColor(colorIndex),
        colorIndex: colorIndex,
        upgrades: [],
        kills: 0,
        alive: true
    };
}

// ==================== GERAR RECURSOS ====================
function generateResources() {
    const resources = [];
    
    for(let x = 0; x < CONFIG.MAP_SIZE; x += CONFIG.BIOME_SIZE) {
        for(let y = 0; y < CONFIG.MAP_SIZE; y += CONFIG.BIOME_SIZE) {
            const biome = getBiome(x + CONFIG.BIOME_SIZE/2, y + CONFIG.BIOME_SIZE/2);
            const biomeData = BIOMES[biome];
            
            // Gerar recursos do bioma
            for(let i = 0; i < 15; i++) {
                const type = biomeData.resources[Math.floor(Math.random() * biomeData.resources.length)];
                resources.push({
                    id: `res_${x}_${y}_${i}`,
                    type: type,
                    biome: biome,
                    x: x + 50 + Math.random() * (CONFIG.BIOME_SIZE - 100),
                    y: y + 50 + Math.random() * (CONFIG.BIOME_SIZE - 100),
                    hp: 40,
                    maxHp: 40,
                    depleted: false,
                    respawnTime: 0
                });
            }
        }
    }
    
    // Cristais especiais (raros)
    for(let i = 0; i < 30; i++) {
        resources.push({
            id: `crystal_${i}`,
            type: 'crystal',
            biome: 'any',
            x: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            y: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            hp: 60,
            maxHp: 60,
            depleted: false,
            respawnTime: 0
        });
    }
    
    return resources;
}

// ==================== CRIAR INIMIGO ====================
function createEnemy(wave, biome) {
    const biomeData = BIOMES[biome] || BIOMES.plains;
    const type = biomeData.enemies[Math.floor(Math.random() * biomeData.enemies.length)];
    const stats = ENEMY_STATS[type];
    
    const isBoss = wave >= 3 && Math.random() < 0.05 * wave;
    const waveMultiplier = 1 + (wave - 1) * 0.15;
    const bossMultiplier = isBoss ? 3 : 1;
    
    // Posição dentro do bioma
    const biomeX = Math.floor(Math.random() * 4);
    const biomeY = Math.floor(Math.random() * 4);
    
    return {
        id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        biome: biome,
        x: biomeX * CONFIG.BIOME_SIZE + Math.random() * CONFIG.BIOME_SIZE,
        y: biomeY * CONFIG.BIOME_SIZE + Math.random() * CONFIG.BIOME_SIZE,
        hp: Math.floor(stats.hp * waveMultiplier * bossMultiplier),
        maxHp: Math.floor(stats.hp * waveMultiplier * bossMultiplier),
        damage: Math.floor(stats.damage * waveMultiplier * (isBoss ? 1.5 : 1)),
        speed: stats.speed * (isBoss ? 0.7 : 1),
        xp: Math.floor(stats.xp * waveMultiplier * (isBoss ? 5 : 1)),
        attackSpeed: stats.attackSpeed,
        lastAttack: 0,
        color: stats.color,
        isBoss: isBoss,
        target: null,
        state: 'idle',
        animFrame: 0,
        lastSpeak: 0,
        knockback: { x: 0, y: 0 }
    };
}

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
    console.log('🎮 Player conectado:', socket.id);
    
    // CRIAR SALA
    socket.on('createRoom', (playerName) => {
        const roomCode = generateRoomCode();
        
        rooms[roomCode] = {
            code: roomCode,
            players: {},
            playerCount: 0,
            enemies: [],
            resources: generateResources(),
            buildings: [],
            projectiles: [],
            orbs: [],
            damageTexts: [],
            wave: 1,
            lastEnemySpawn: Date.now(),
            lastWaveTime: Date.now(),
            createdAt: Date.now()
        };
        
        rooms[roomCode].playerCount++;
        rooms[roomCode].players[socket.id] = createPlayer(playerName, 0);
        
        socket.join(roomCode);
        socket.roomCode = roomCode;
        
        socket.emit('roomJoined', { 
            roomCode: roomCode,
            playerId: socket.id,
            biomes: BIOMES,
            buildCosts: BUILD_COSTS
        });
        
        console.log('🌍 Sala criada:', roomCode);
    });
    
    // ENTRAR NA SALA
    socket.on('joinRoom', ({ code, name }) => {
        const roomCode = code.toUpperCase().trim();
        
        if(!rooms[roomCode]) {
            socket.emit('error', { message: 'Sala não encontrada!' });
            return;
        }
        
        const room = rooms[roomCode];
        const colorIndex = room.playerCount;
        room.playerCount++;
        room.players[socket.id] = createPlayer(name, colorIndex);
        
        socket.join(roomCode);
        socket.roomCode = roomCode;
        
        socket.emit('roomJoined', { 
            roomCode: roomCode,
            playerId: socket.id,
            biomes: BIOMES,
            buildCosts: BUILD_COSTS
        });
        
        // Notificar outros players
        socket.to(roomCode).emit('playerJoined', {
            id: socket.id,
            name: name,
            color: room.players[socket.id].color
        });
        
        console.log('🚪 Player entrou na sala:', roomCode);
    });
    
    // MOVIMENTO
    socket.on('playerMove', (data) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        if(!player.alive) return;
        
        // Atualizar posição com limites
        player.x = Math.max(30, Math.min(CONFIG.MAP_SIZE - 30, data.x));
        player.y = Math.max(30, Math.min(CONFIG.MAP_SIZE - 30, data.y));
        player.vx = data.vx || 0;
        player.vy = data.vy || 0;
        player.state = data.state;
        player.animFrame = data.animFrame || 0;
        player.angle = data.angle;
        player.facing = data.facing;
        
        // Coletar orbs
        room.orbs = room.orbs.filter(orb => {
            const dist = Math.hypot(orb.x - player.x, orb.y - player.y);
            if(dist < 40) {
                player.xp += orb.value;
                
                // Level up
                while(player.xp >= player.nextXp) {
                    player.level++;
                    player.xp -= player.nextXp;
                    player.nextXp = Math.floor(player.nextXp * 1.4);
                    player.maxHp += 15;
                    player.hp = player.maxHp;
                    player.damage += 2;
                    
                    socket.emit('levelUp', {
                        level: player.level,
                        stats: {
                            hp: player.maxHp,
                            damage: player.damage
                        }
                    });
                }
                return false;
            }
            return true;
        });
        
        // Curar em fogueira
        room.buildings.forEach(b => {
            if(b.type === 'campfire' && b.hp > 0) {
                const dist = Math.hypot(b.x - player.x, b.y - player.y);
                if(dist < 80 && player.hp < player.maxHp) {
                    player.hp = Math.min(player.maxHp, player.hp + 0.1);
                }
            }
        });
    });
    
    // ATAQUE
    socket.on('playerAttack', (data) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        if(!player.alive) return;
        
        const now = Date.now();
        if(now - player.lastAttack < player.attackSpeed) return;
        player.lastAttack = now;
        
        const angle = data.angle;
        const attackRange = player.attackRange + player.level * 5;
        const attackArc = 0.8;
        
        // Atacar inimigos
        room.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            let angleDiff = Math.abs(angle - angleToEnemy);
            if(angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            
            if(dist < attackRange && angleDiff < attackArc) {
                const crit = Math.random() < 0.15;
                const damage = Math.floor(player.damage * (crit ? 2 : 1) * (1 + Math.random() * 0.3));
                enemy.hp -= damage;
                
                // Knockback
                enemy.knockback.x = Math.cos(angleToEnemy) * 15;
                enemy.knockback.y = Math.sin(angleToEnemy) * 15;
                
                // Efeito de hit
                room.damageTexts.push({
                    x: enemy.x,
                    y: enemy.y - 30,
                    damage: damage,
                    crit: crit,
                    life: 40
                });
                
                if(enemy.hp <= 0) {
                    player.kills++;
                    
                    // Drops
                    const orbCount = enemy.isBoss ? 8 : 3;
                    for(let i = 0; i < orbCount; i++) {
                        room.orbs.push({
                            x: enemy.x + (Math.random() - 0.5) * 40,
                            y: enemy.y + (Math.random() - 0.5) * 40,
                            value: Math.floor(enemy.xp / orbCount),
                            type: 'xp'
                        });
                    }
                    
                    // Drop de comida
                    if(Math.random() < 0.25) {
                        player.food = Math.min(10, player.food + 1);
                    }
                    
                    // Drop de recursos baseado no bioma
                    const biomeData = BIOMES[enemy.biome] || BIOMES.plains;
                    if(Math.random() < 0.3) {
                        const dropType = Object.keys(biomeData.drops)[0];
                        if(dropType === 'wood') player.wood += 2;
                        else if(dropType === 'stone') player.stone += 2;
                        else if(dropType === 'crystal') player.crystal += 1;
                    }
                }
            }
        });
        
        // Atacar recursos
        room.resources.forEach(resource => {
            if(resource.depleted) return;
            
            const dist = Math.hypot(resource.x - player.x, resource.y - player.y);
            
            if(dist < 70) {
                resource.hp -= 12;
                
                // Efeito de hit no recurso
                room.damageTexts.push({
                    x: resource.x,
                    y: resource.y - 20,
                    damage: 12,
                    crit: false,
                    life: 30,
                    color: '#8B4513'
                });
                
                if(resource.hp <= 0 && !resource.depleted) {
                    resource.depleted = true;
                    resource.respawnTime = Date.now() + CONFIG.RESOURCE_RESPAWN;
                    
                    // Dar recursos baseado no tipo
                    switch(resource.type) {
                        case 'tree':
                        case 'dead_tree':
                        case 'frozen_tree':
                            player.wood += 4 + Math.floor(Math.random() * 3);
                            break;
                        case 'stone':
                        case 'sandstone':
                        case 'obsidian':
                            player.stone += 3 + Math.floor(Math.random() * 2);
                            break;
                        case 'crystal':
                        case 'ice_crystal':
                        case 'fire_crystal':
                            player.crystal += 2 + Math.floor(Math.random() * 2);
                            break;
                        case 'bush':
                        case 'cactus':
                        case 'mushroom':
                            player.food = Math.min(10, player.food + 1);
                            break;
                    }
                    
                    socket.emit('resourceCollected', {
                        id: resource.id,
                        wood: player.wood,
                        stone: player.stone,
                        crystal: player.crystal,
                        food: player.food
                    });
                }
            }
        });
    });
    
    // CONSTRUIR
    socket.on('build', (data) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        const cost = BUILD_COSTS[data.type];
        
        if(!cost) {
            socket.emit('buildError', { message: 'Construção inválida!' });
            return;
        }
        
        // Verificar recursos
        if(player.wood < cost.wood || 
           player.stone < cost.stone || 
           player.crystal < cost.crystal) {
            socket.emit('buildError', { 
                message: 'Recursos insuficientes!',
                need: cost,
                have: { wood: player.wood, stone: player.stone, crystal: player.crystal }
            });
            return;
        }
        
        // Verificar se não tem outra construção muito perto
        const tooClose = room.buildings.some(b => {
            return Math.hypot(b.x - player.x, b.y - player.y) < 60;
        });
        
        if(tooClose) {
            socket.emit('buildError', { message: 'Muito perto de outra construção!' });
            return;
        }
        
        // Construir
        player.wood -= cost.wood;
        player.stone -= cost.stone;
        player.crystal -= cost.crystal;
        
        const building = {
            id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: data.type,
            x: player.x + Math.cos(player.angle) * 50,
            y: player.y + Math.sin(player.angle) * 50,
            hp: cost.hp,
            maxHp: cost.hp,
            owner: socket.id,
            damage: cost.damage || 0,
            range: cost.range || 0,
            lastAttack: 0
        };
        
        room.buildings.push(building);
        
        socket.emit('buildSuccess', {
            building: building,
            resources: { wood: player.wood, stone: player.stone, crystal: player.crystal }
        });
        
        io.to(socket.roomCode).emit('newBuilding', building);
    });
    
    // USAR COMIDA
    socket.on('useFood', () => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        if(player.food > 0 && player.hp < player.maxHp) {
            player.food--;
            player.hp = Math.min(player.maxHp, player.hp + 35);
            
            socket.emit('foodUsed', {
                hp: player.hp,
                maxHp: player.maxHp,
                food: player.food
            });
        }
    });
    
    // ESCOLHER UPGRADE
    socket.on('chooseUpgrade', (upgrade) => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        player.upgrades.push(upgrade);
        
        switch(upgrade) {
            case 'damage':
                player.damage += 5;
                break;
            case 'health':
                player.maxHp += 30;
                player.hp = player.maxHp;
                break;
            case 'speed':
                player.speed += 1;
                break;
            case 'range':
                player.attackRange += 20;
                break;
            case 'attackSpeed':
                player.attackSpeed = Math.max(200, player.attackSpeed - 50);
                break;
            case 'lifesteal':
                player.lifesteal = (player.lifesteal || 0) + 0.1;
                break;
        }
        
        socket.emit('upgradeApplied', {
            upgrade: upgrade,
            stats: {
                damage: player.damage,
                maxHp: player.maxHp,
                speed: player.speed,
                attackRange: player.attackRange,
                attackSpeed: player.attackSpeed
            }
        });
    });
    
    // RESPAWN
    socket.on('respawn', () => {
        const room = rooms[socket.roomCode];
        if(!room || !room.players[socket.id]) return;
        
        const player = room.players[socket.id];
        player.hp = player.maxHp;
        player.x = CONFIG.MAP_SIZE / 2;
        player.y = CONFIG.MAP_SIZE / 2;
        player.alive = true;
        player.wood = Math.floor(player.wood / 2);
        player.stone = Math.floor(player.stone / 2);
        player.crystal = Math.floor(player.crystal / 2);
        
        socket.emit('respawned', {
            x: player.x,
            y: player.y,
            hp: player.hp,
            resources: { wood: player.wood, stone: player.stone, crystal: player.crystal }
        });
    });
    
    // DESCONECTAR
    socket.on('disconnect', () => {
        console.log('👋 Player desconectado:', socket.id);
        
        if(socket.roomCode && rooms[socket.roomCode]) {
            const room = rooms[socket.roomCode];
            
            // Remover construções do player
            room.buildings = room.buildings.filter(b => b.owner !== socket.id);
            
            delete room.players[socket.id];
            
            // Notificar outros
            socket.to(socket.roomCode).emit('playerLeft', { id: socket.id });
            
            // Deletar sala se vazia
            if(Object.keys(room.players).length === 0) {
                delete rooms[socket.roomCode];
                console.log('🗑️ Sala deletada:', socket.roomCode);
            }
        }
    });
});

// ==================== GAME LOOP DO SERVIDOR ====================
const TICK_RATE = 60;
let lastTick = Date.now();

setInterval(() => {
    const now = Date.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;
    
    for(const roomCode in rooms) {
        const room = rooms[roomCode];
        
        // Spawn de inimigos
        if(now - room.lastEnemySpawn > CONFIG.ENEMY_SPAWN_RATE && room.enemies.length < CONFIG.MAX_ENEMIES) {
            room.lastEnemySpawn = now;
            
            // Spawn em bioma aleatório
            const biomeNames = Object.keys(BIOMES);
            const randomBiome = biomeNames[Math.floor(Math.random() * biomeNames.length)];
            room.enemies.push(createEnemy(room.wave, randomBiome));
        }
        
        // Sistema de waves
        if(now - room.lastWaveTime > CONFIG.WAVE_DURATION) {
            room.lastWaveTime = now;
            room.wave++;
            
            // Spawn extra na nova wave
            const spawnCount = Math.min(room.wave * 3, 15);
            for(let i = 0; i < spawnCount; i++) {
                setTimeout(() => {
                    if(room.enemies.length < CONFIG.MAX_ENEMIES + 10) {
                        const biomeNames = Object.keys(BIOMES);
                        const randomBiome = biomeNames[Math.floor(Math.random() * biomeNames.length)];
                        room.enemies.push(createEnemy(room.wave, randomBiome));
                    }
                }, i * 300);
            }
            
            io.to(roomCode).emit('newWave', { 
                wave: room.wave,
                message: `Wave ${room.wave} começou!`
            });
        }
        
        // Update inimigos
        room.enemies = room.enemies.filter(enemy => {
            if(enemy.hp <= 0) return false;
            
            // Aplicar knockback
            enemy.x += enemy.knockback.x;
            enemy.y += enemy.knockback.y;
            enemy.knockback.x *= 0.8;
            enemy.knockback.y *= 0.8;
            
            // Encontrar player mais próximo
            let closestPlayer = null;
            let closestDist = 400; // Range de detecção
            
            for(const playerId in room.players) {
                const player = room.players[playerId];
                if(!player.alive) continue;
                
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                if(dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                    enemy.target = playerId;
                }
            }
            
            if(closestPlayer) {
                enemy.state = 'chase';
                
                // Mover em direção ao player
                const angle = Math.atan2(closestPlayer.y - enemy.y, closestPlayer.x - enemy.x);
                
                if(closestDist > 35) {
                    enemy.x += Math.cos(angle) * enemy.speed;
                    enemy.y += Math.sin(angle) * enemy.speed;
                }
                
                // Manter nos limites
                enemy.x = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, enemy.x));
                enemy.y = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, enemy.y));
                
                // Atacar
                if(closestDist < 40 && now - enemy.lastAttack > enemy.attackSpeed) {
                    enemy.lastAttack = now;
                    closestPlayer.hp -= enemy.damage;
                    enemy.state = 'attack';
                    
                    // Knockback no player
                    const knockAngle = Math.atan2(closestPlayer.y - enemy.y, closestPlayer.x - enemy.x);
                    closestPlayer.x += Math.cos(knockAngle) * 10;
                    closestPlayer.y += Math.sin(knockAngle) * 10;
                    
                    io.to(roomCode).emit('playerHit', {
                        playerId: enemy.target,
                        damage: enemy.damage,
                        hp: closestPlayer.hp,
                        maxHp: closestPlayer.maxHp
                    });
                    
                    if(closestPlayer.hp <= 0) {
                        closestPlayer.alive = false;
                        io.to(roomCode).emit('playerDied', { playerId: enemy.target });
                    }
                }
                
                // Falar frases
                if(now - enemy.lastSpeak > 8000 && Math.random() < 0.05) {
                    enemy.lastSpeak = now;
                    const quotes = ENEMY_QUOTES[enemy.type] || ["..."];
                    const quote = quotes[Math.floor(Math.random() * quotes.length)];
                    
                    io.to(roomCode).emit('enemySpeak', {
                        id: enemy.id,
                        message: quote,
                        x: enemy.x,
                        y: enemy.y
                    });
                }
            } else {
                enemy.state = 'idle';
                
                // Movimento aleatório quando idle
                if(Math.random() < 0.02) {
                    const randAngle = Math.random() * Math.PI * 2;
                    enemy.x += Math.cos(randAngle) * enemy.speed * 0.5;
                    enemy.y += Math.sin(randAngle) * enemy.speed * 0.5;
                }
            }
            
            return true;
        });
        
        // Torretas e torres atacam
        room.buildings.forEach(building => {
            if((building.type === 'turret' || building.type === 'tower') && building.hp > 0) {
                if(now - building.lastAttack > 1000) {
                    const nearbyEnemy = room.enemies.find(e => {
                        return Math.hypot(e.x - building.x, e.y - building.y) < building.range;
                    });
                    
                    if(nearbyEnemy) {
                        building.lastAttack = now;
                        nearbyEnemy.hp -= building.damage;
                        
                        io.to(roomCode).emit('turretShot', {
                            from: { x: building.x, y: building.y },
                            to: { x: nearbyEnemy.x, y: nearbyEnemy.y },
                            damage: building.damage
                        });
                    }
                }
            }
            
            // Espinhos causam dano
            if(building.type === 'spikes' && building.hp > 0) {
                room.enemies.forEach(e => {
                    if(Math.hypot(e.x - building.x, e.y - building.y) < 40) {
                        if(now - (e.lastSpikeDamage || 0) > 500) {
                            e.lastSpikeDamage = now;
                            e.hp -= building.damage;
                            building.hp -= 5;
                        }
                    }
                });
            }
        });
        
        // Remover construções destruídas
        room.buildings = room.buildings.filter(b => b.hp > 0);
        
        // Respawn de recursos
        room.resources.forEach(r => {
            if(r.depleted && now > r.respawnTime) {
                r.depleted = false;
                r.hp = r.maxHp;
            }
        });
        
        // Limpar textos de dano antigos
        room.damageTexts = room.damageTexts.filter(t => t.life > 0);
        room.damageTexts.forEach(t => t.life--);
        
        // Enviar estado do jogo
        io.to(roomCode).emit('gameState', {
            players: room.players,
            enemies: room.enemies,
            resources: room.resources.filter(r => !r.depleted),
            buildings: room.buildings,
            orbs: room.orbs,
            damageTexts: room.damageTexts,
            wave: room.wave
        });
    }
}, 1000 / TICK_RATE);

// ==================== INICIAR SERVIDOR ====================
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  🎮 RPG LEGENDS - MIKU EDITION V9     ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  ✅ Servidor rodando na porta ${PORT}     ║
║  ✅ Biomas: 6 tipos únicos            ║
║  ✅ Inimigos: 12 tipos                ║
║  ✅ Construções: 5 tipos              ║
╚════════════════════════════════════════╝
    `);
});
