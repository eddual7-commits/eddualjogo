const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ============ CONFIGURAÇÕES ============
const CONFIG = {
    MAP_SIZE: 3200,
    TILE_SIZE: 100,
    PLAYER_SPEED: 4,
    ENEMY_BASE_SPAWN: 5000,
    RESOURCE_RESPAWN: 45000,
    WAVE_DURATION: 90000,
    MAX_ENEMIES: 40,
    BIOME_SIZE: 800
};

// ============ BIOMAS ============
const BIOMES = {
    forest: {
        name: 'Floresta',
        color: '#1a4d1a',
        enemies: ['slime', 'goblin', 'wolf'],
        resources: ['tree', 'bush', 'mushroom'],
        drops: { wood: 3, herb: 1 }
    },
    desert: {
        name: 'Deserto',
        color: '#c2a645',
        enemies: ['scorpion', 'mummy', 'sandworm'],
        resources: ['cactus', 'bone', 'fossil'],
        drops: { stone: 2, bone: 1 }
    },
    snow: {
        name: 'Neve',
        color: '#a8c8d8',
        enemies: ['yeti', 'ice_wolf', 'frost_spirit'],
        resources: ['ice_rock', 'frozen_tree', 'crystal'],
        drops: { crystal: 2, ice: 1 }
    },
    volcano: {
        name: 'Vulcão',
        color: '#4a1a1a',
        enemies: ['fire_demon', 'lava_slime', 'dragon'],
        resources: ['obsidian', 'fire_crystal', 'magma_rock'],
        drops: { obsidian: 2, fire_crystal: 1 }
    },
    swamp: {
        name: 'Pântano',
        color: '#2d4a2d',
        enemies: ['toad', 'poison_slime', 'witch'],
        resources: ['vine', 'poison_mushroom', 'swamp_tree'],
        drops: { vine: 2, poison: 1 }
    }
};

// ============ STATS DOS INIMIGOS ============
const ENEMY_STATS = {
    // Floresta
    slime: { hp: 25, damage: 3, speed: 1.2, xp: 8, attackRate: 1500, color: '#2ECC71' },
    goblin: { hp: 40, damage: 5, speed: 1.8, xp: 15, attackRate: 1200, color: '#27AE60' },
    wolf: { hp: 50, damage: 8, speed: 2.5, xp: 20, attackRate: 1000, color: '#7F8C8D' },
    
    // Deserto
    scorpion: { hp: 35, damage: 6, speed: 2, xp: 18, attackRate: 1300, color: '#D35400' },
    mummy: { hp: 60, damage: 7, speed: 1, xp: 25, attackRate: 1800, color: '#BDC3C7' },
    sandworm: { hp: 80, damage: 12, speed: 1.5, xp: 35, attackRate: 2000, color: '#E67E22' },
    
    // Neve
    yeti: { hp: 100, damage: 15, speed: 1.3, xp: 40, attackRate: 2000, color: '#ECF0F1' },
    ice_wolf: { hp: 45, damage: 8, speed: 2.8, xp: 22, attackRate: 900, color: '#3498DB' },
    frost_spirit: { hp: 30, damage: 10, speed: 2, xp: 28, attackRate: 1400, color: '#00D4FF' },
    
    // Vulcão
    fire_demon: { hp: 120, damage: 20, speed: 1.5, xp: 60, attackRate: 1500, color: '#E74C3C' },
    lava_slime: { hp: 50, damage: 8, speed: 1, xp: 25, attackRate: 1200, color: '#FF6B35' },
    dragon: { hp: 200, damage: 30, speed: 1.2, xp: 100, attackRate: 2500, color: '#C0392B' },
    
    // Pântano
    toad: { hp: 30, damage: 4, speed: 1.5, xp: 12, attackRate: 1400, color: '#1ABC9C' },
    poison_slime: { hp: 35, damage: 5, speed: 1.3, xp: 15, attackRate: 1300, color: '#9B59B6' },
    witch: { hp: 45, damage: 12, speed: 1.8, xp: 30, attackRate: 2000, color: '#8E44AD' }
};

// ============ FRASES DOS INIMIGOS ============
const ENEMY_QUOTES = {
    slime: ["Blurp!", "Splash~", "*plop*"],
    goblin: ["Hehe!", "Meu ouro!", "Grrr!"],
    wolf: ["Auuuu!", "*rosnado*", "Grrrr!"],
    scorpion: ["*click click*", "Veneno!", "*sting*"],
    mummy: ["Descanso...", "Eternidade...", "Areia..."],
    sandworm: ["*TREMOR*", "TERRA!", "*emerge*"],
    yeti: ["FRIO!", "RAWR!", "*urro*"],
    ice_wolf: ["Gelaado~", "*uivo*", "Gelo!"],
    frost_spirit: ["Venha...", "Congele...", "Eterno..."],
    fire_demon: ["QUEIME!", "FOGO!", "HAHAHA!"],
    lava_slime: ["*borbulha*", "Quente!", "*splash*"],
    dragon: ["MORTAIS!", "CHAMAS!", "*ROAR*"],
    toad: ["Croac!", "Ribbit!", "*pulo*"],
    poison_slime: ["Tóxico~", "*borbulha*", "Veneno!"],
    witch: ["Hehehe!", "Magia!", "Maldição!"]
};

// ============ CUSTOS DE CONSTRUÇÃO ============
const BUILD_COSTS = {
    wall: { wood: 8, stone: 0, crystal: 0, hp: 150 },
    turret: { wood: 15, stone: 10, crystal: 2, hp: 100, damage: 8, range: 180 },
    campfire: { wood: 12, stone: 5, crystal: 0, hp: 80, healRate: 2 },
    spikes: { wood: 5, stone: 5, crystal: 0, hp: 60, damage: 10 },
    tower: { wood: 25, stone: 20, crystal: 5, hp: 200, damage: 15, range: 250 }
};

// ============ ARMAZENAMENTO ============
const rooms = new Map();
let playerColorIndex = 0;

// Cores que escurecem progressivamente
const PLAYER_COLORS = [
    { hair: '#39C5BB', dress: '#1A1A2E', accent: '#00BFFF' },  // Miku original
    { hair: '#2E9D94', dress: '#161626', accent: '#0099CC' },  // Mais escuro
    { hair: '#247A73', dress: '#12121E', accent: '#007799' },  // Ainda mais
    { hair: '#1A5752', dress: '#0E0E16', accent: '#005566' },  // Bem escuro
    { hair: '#103431', dress: '#0A0A0E', accent: '#003344' },  // Muito escuro
    { hair: '#FF6B9D', dress: '#2E1A2E', accent: '#FF4488' },  // Rosa
    { hair: '#CC5580', dress: '#261626', accent: '#CC3366' },
    { hair: '#FFD700', dress: '#2E2E1A', accent: '#FFAA00' },  // Dourado
    { hair: '#CC9900', dress: '#262616', accent: '#CC8800' }
];

// ============ FUNÇÕES AUXILIARES ============
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for(let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function getBiomeAt(x, y) {
    const biomeNames = Object.keys(BIOMES);
    const bx = Math.floor(x / CONFIG.BIOME_SIZE);
    const by = Math.floor(y / CONFIG.BIOME_SIZE);
    const index = Math.abs((bx * 7 + by * 13) % biomeNames.length);
    return biomeNames[index];
}

function getPlayerColor() {
    const color = PLAYER_COLORS[playerColorIndex % PLAYER_COLORS.length];
    playerColorIndex++;
    return color;
}

function createPlayer(name, socketId) {
    const color = getPlayerColor();
    return {
        id: socketId,
        name: name.substring(0, 12) || 'Miku',
        x: CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
        y: CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
        hp: 100,
        maxHp: 100,
        level: 1,
        xp: 0,
        nextXp: 80,
        wood: 0,
        stone: 0,
        crystal: 0,
        food: 5,
        herb: 0,
        bone: 0,
        ice: 0,
        obsidian: 0,
        poison: 0,
        vine: 0,
        speed: CONFIG.PLAYER_SPEED,
        damage: 8,
        defense: 0,
        state: 'idle',
        animFrame: 0,
        angle: 0,
        facing: 1,
        color: color,
        upgrades: [],
        lastAttack: 0,
        attackCooldown: 400,
        isDead: false,
        kills: 0
    };
}

function generateResources(biome) {
    const resources = [];
    const biomeData = BIOMES[biome];
    
    // Determinar área do bioma
    const biomeIndex = Object.keys(BIOMES).indexOf(biome);
    const startX = (biomeIndex % 4) * CONFIG.BIOME_SIZE;
    const startY = Math.floor(biomeIndex / 4) * CONFIG.BIOME_SIZE;
    
    return resources;
}

function generateAllResources() {
    const resources = [];
    let id = 0;
    
    // Gerar recursos por todo o mapa
    for(let x = 100; x < CONFIG.MAP_SIZE - 100; x += 150) {
        for(let y = 100; y < CONFIG.MAP_SIZE - 100; y += 150) {
            if(Math.random() > 0.6) continue;
            
            const biome = getBiomeAt(x, y);
            const biomeData = BIOMES[biome];
            const resourceTypes = biomeData.resources;
            const type = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            
            resources.push({
                id: 'res_' + id++,
                type: type,
                biome: biome,
                x: x + (Math.random() - 0.5) * 100,
                y: y + (Math.random() - 0.5) * 100,
                hp: 30,
                maxHp: 30,
                depleted: false,
                respawnAt: 0
            });
        }
    }
    
    // Cristais especiais (menos frequentes)
    for(let i = 0; i < 30; i++) {
        resources.push({
            id: 'crystal_' + i,
            type: 'crystal',
            biome: 'snow',
            x: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            y: 100 + Math.random() * (CONFIG.MAP_SIZE - 200),
            hp: 50,
            maxHp: 50,
            depleted: false,
            respawnAt: 0
        });
    }
    
    return resources;
}

function createEnemy(wave, biome = null) {
    const biomeName = biome || Object.keys(BIOMES)[Math.floor(Math.random() * Object.keys(BIOMES).length)];
    const biomeData = BIOMES[biomeName];
    
    // Limitar tipos de inimigos baseado na wave
    let availableEnemies = biomeData.enemies.slice(0, Math.min(wave, biomeData.enemies.length));
    const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
    
    const stats = ENEMY_STATS[type] || ENEMY_STATS.slime;
    const isBoss = wave >= 3 && Math.random() < 0.05 * wave;
    
    // Escalar dificuldade mais suavemente
    const waveMultiplier = 1 + (wave - 1) * 0.08;
    
    // Posição baseada no bioma
    const biomeIndex = Object.keys(BIOMES).indexOf(biomeName);
    const baseX = (biomeIndex % 4) * CONFIG.BIOME_SIZE + CONFIG.BIOME_SIZE / 2;
    const baseY = Math.floor(biomeIndex / 4) * CONFIG.BIOME_SIZE + CONFIG.BIOME_SIZE / 2;
    
    return {
        id: 'enemy_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        type: type,
        biome: biomeName,
        x: Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, baseX + (Math.random() - 0.5) * CONFIG.BIOME_SIZE)),
        y: Math.max(50, Math.min(CONFIG.MAP_SIZE - 50, baseY + (Math.random() - 0.5) * CONFIG.BIOME_SIZE)),
        hp: Math.floor(stats.hp * waveMultiplier * (isBoss ? 4 : 1)),
        maxHp: Math.floor(stats.hp * waveMultiplier * (isBoss ? 4 : 1)),
        damage: Math.floor(stats.damage * waveMultiplier * (isBoss ? 1.5 : 1)),
        speed: stats.speed * (isBoss ? 0.8 : 1),
        xp: Math.floor(stats.xp * waveMultiplier * (isBoss ? 5 : 1)),
        attackRate: stats.attackRate,
        color: stats.color,
        isBoss: isBoss,
        target: null,
        lastAttack: 0,
        lastSpeak: 0,
        state: 'idle',
        animFrame: 0
    };
}

function createRoom(code) {
    return {
        code: code,
        players: new Map(),
        enemies: [],
        resources: generateAllResources(),
        buildings: [],
        projectiles: [],
        orbs: [],
        wave: 1,
        lastEnemySpawn: Date.now(),
        lastWaveTime: Date.now(),
        createdAt: Date.now()
    };
}

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
    console.log('✅ Player conectado:', socket.id);
    
    // Criar sala
    socket.on('createRoom', (playerName) => {
        try {
            const roomCode = generateRoomCode();
            const room = createRoom(roomCode);
            const player = createPlayer(playerName, socket.id);
            
            room.players.set(socket.id, player);
            rooms.set(roomCode, room);
            
            socket.join(roomCode);
            socket.roomCode = roomCode;
            socket.playerId = socket.id;
            
            console.log('🏠 Sala criada:', roomCode, 'por', playerName);
            
            socket.emit('roomJoined', {
                roomCode: roomCode,
                playerId: socket.id,
                player: player
            });
            
            // Spawn inicial de inimigos
            for(let i = 0; i < 5; i++) {
                room.enemies.push(createEnemy(1));
            }
            
        } catch(error) {
            console.error('Erro ao criar sala:', error);
            socket.emit('error', 'Erro ao criar sala');
        }
    });
    
    // Entrar na sala
    socket.on('joinRoom', (data) => {
        try {
            const roomCode = data.code.toUpperCase().trim();
            const room = rooms.get(roomCode);
            
            if(!room) {
                socket.emit('error', 'Sala não encontrada!');
                return;
            }
            
            const player = createPlayer(data.name, socket.id);
            room.players.set(socket.id, player);
            
            socket.join(roomCode);
            socket.roomCode = roomCode;
            socket.playerId = socket.id;
            
            console.log('👋 Player entrou:', roomCode, data.name);
            
            socket.emit('roomJoined', {
                roomCode: roomCode,
                playerId: socket.id,
                player: player
            });
            
            // Notificar outros
            socket.to(roomCode).emit('playerJoined', {
                id: socket.id,
                name: player.name
            });
            
        } catch(error) {
            console.error('Erro ao entrar na sala:', error);
            socket.emit('error', 'Erro ao entrar na sala');
        }
    });
    
    // Movimento do player
    socket.on('playerMove', (data) => {
        const room = rooms.get(socket.roomCode);
        if(!room) return;
        
        const player = room.players.get(socket.id);
        if(!player || player.isDead) return;
        
        player.x = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, data.x));
        player.y = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, data.y));
        player.state = data.state || 'idle';
        player.animFrame = data.animFrame || 0;
        player.angle = data.angle || 0;
        player.facing = data.facing || 1;
        
        // Coletar orbs
        const orbsToRemove = [];
        room.orbs.forEach((orb, index) => {
            const dist = Math.hypot(orb.x - player.x, orb.y - player.y);
            if(dist < 40) {
                player.xp += orb.value;
                orbsToRemove.push(index);
                
                // Level up
                while(player.xp >= player.nextXp) {
                    player.xp -= player.nextXp;
                    player.level++;
                    player.nextXp = Math.floor(player.nextXp * 1.4);
                    player.maxHp += 15;
                    player.hp = player.maxHp;
                    player.damage += 2;
                    
                    socket.emit('levelUp', {
                        level: player.level,
                        stats: {
                            maxHp: player.maxHp,
                            damage: player.damage
                        }
                    });
                }
            }
        });
        
        // Remover orbs coletados (de trás para frente)
        orbsToRemove.reverse().forEach(i => room.orbs.splice(i, 1));
        
        // Cura de fogueira
        room.buildings.forEach(b => {
            if(b.type === 'campfire') {
                const dist = Math.hypot(b.x - player.x, b.y - player.y);
                if(dist < 80 && player.hp < player.maxHp) {
                    player.hp = Math.min(player.maxHp, player.hp + 0.1);
                }
            }
        });
    });
    
    // Ataque do player
    socket.on('playerAttack', (data) => {
        const room = rooms.get(socket.roomCode);
        if(!room) return;
        
        const player = room.players.get(socket.id);
        if(!player || player.isDead) return;
        
        const now = Date.now();
        if(now - player.lastAttack < player.attackCooldown) return;
        player.lastAttack = now;
        
        const attackAngle = data.angle;
        const attackRange = 80;
        const attackArc = 0.8; // Arco de 45 graus de cada lado
        
        // Atacar inimigos
        room.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if(dist > attackRange) return;
            
            const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            let angleDiff = Math.abs(attackAngle - angleToEnemy);
            if(angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            
            if(angleDiff < attackArc) {
                const isCrit = Math.random() < 0.15;
                const damage = Math.floor(player.damage * (isCrit ? 2 : 1) * (0.9 + Math.random() * 0.2));
                
                enemy.hp -= damage;
                
                io.to(socket.roomCode).emit('hitEffect', {
                    x: enemy.x,
                    y: enemy.y,
                    damage: damage,
                    crit: isCrit,
                    type: 'enemy'
                });
                
                if(enemy.hp <= 0) {
                    player.kills++;
                    
                    // Drop orbs
                    for(let i = 0; i < 3 + (enemy.isBoss ? 5 : 0); i++) {
                        room.orbs.push({
                            x: enemy.x + (Math.random() - 0.5) * 40,
                            y: enemy.y + (Math.random() - 0.5) * 40,
                            value: Math.floor(enemy.xp / 3)
                        });
                    }
                    
                    // Chance de drop de comida
                    if(Math.random() < 0.25) {
                        player.food++;
                    }
                    
                    // Drop específico do bioma
                    const biomeData = BIOMES[enemy.biome];
                    if(biomeData && biomeData.drops) {
                        Object.entries(biomeData.drops).forEach(([resource, amount]) => {
                            if(Math.random() < 0.3 && player[resource] !== undefined) {
                                player[resource] += Math.ceil(amount * Math.random());
                            }
                        });
                    }
                    
                    room.enemies = room.enemies.filter(e => e.id !== enemy.id);
                    
                    io.to(socket.roomCode).emit('enemyDied', {
                        id: enemy.id,
                        x: enemy.x,
                        y: enemy.y,
                        isBoss: enemy.isBoss
                    });
                }
            }
        });
        
        // Atacar recursos
        room.resources.forEach(resource => {
            if(resource.depleted) return;
            
            const dist = Math.hypot(resource.x - player.x, resource.y - player.y);
            if(dist > 70) return;
            
            resource.hp -= 10;
            
            io.to(socket.roomCode).emit('resourceHit', {
                id: resource.id,
                hp: resource.hp,
                maxHp: resource.maxHp
            });
            
            if(resource.hp <= 0) {
                resource.depleted = true;
                resource.hp = 0;
                resource.respawnAt = Date.now() + CONFIG.RESOURCE_RESPAWN;
                
                // Dar recursos baseado no tipo
                const biomeData = BIOMES[resource.biome];
                
                switch(resource.type) {
                    case 'tree':
                    case 'frozen_tree':
                    case 'swamp_tree':
                        player.wood += 3 + Math.floor(Math.random() * 3);
                        break;
                    case 'stone':
                    case 'ice_rock':
                    case 'magma_rock':
                        player.stone += 2 + Math.floor(Math.random() * 2);
                        break;
                    case 'crystal':
                    case 'fire_crystal':
                        player.crystal += 1 + Math.floor(Math.random() * 2);
                        break;
                    case 'cactus':
                        player.wood += 1;
                        player.food += 1;
                        break;
                    case 'bone':
                    case 'fossil':
                        player.bone += 2;
                        break;
                    case 'bush':
                    case 'mushroom':
                        player.herb += 2;
                        player.food += 1;
                        break;
                    case 'obsidian':
                        player.obsidian += 2;
                        break;
                    case 'vine':
                    case 'poison_mushroom':
                        player.vine += 1;
                        player.poison += 1;
                        break;
                }
                
                io.to(socket.roomCode).emit('resourceDepleted', {
                    id: resource.id
                });
            }
        });
    });
    
    // Construir
    socket.on('build', (data) => {
        const room = rooms.get(socket.roomCode);
        if(!room) return;
        
        const player = room.players.get(socket.id);
        if(!player || player.isDead) return;
        
        const cost = BUILD_COSTS[data.type];
        if(!cost) {
            socket.emit('buildFailed', 'Tipo de construção inválido');
            return;
        }
        
        // Verificar recursos
        if(player.wood < cost.wood || 
           player.stone < cost.stone || 
           player.crystal < cost.crystal) {
            socket.emit('buildFailed', 'Recursos insuficientes');
            return;
        }
        
        // Verificar se não há construção próxima
        const tooClose = room.buildings.some(b => {
            return Math.hypot(b.x - player.x, b.y - player.y) < 50;
        });
        
        if(tooClose) {
            socket.emit('buildFailed', 'Muito perto de outra construção');
            return;
        }
        
        // Deduzir recursos
        player.wood -= cost.wood;
        player.stone -= cost.stone;
        player.crystal -= cost.crystal;
        
        // Criar construção
        const building = {
            id: 'build_' + Date.now(),
            type: data.type,
            x: player.x + player.facing * 50,
            y: player.y,
            hp: cost.hp,
            maxHp: cost.hp,
            owner: socket.id,
            damage: cost.damage || 0,
            range: cost.range || 0,
            lastShot: 0
        };
        
        room.buildings.push(building);
        
        io.to(socket.roomCode).emit('buildingCreated', building);
        socket.emit('buildSuccess', data.type);
    });
    
    // Usar comida
    socket.on('useFood', () => {
        const room = rooms.get(socket.roomCode);
        if(!room) return;
        
        const player = room.players.get(socket.id);
        if(!player || player.isDead) return;
        
        if(player.food > 0 && player.hp < player.maxHp) {
            player.food--;
            player.hp = Math.min(player.maxHp, player.hp + 35);
            socket.emit('healed', player.hp);
        }
    });
    
    // Escolher upgrade
    socket.on('chooseUpgrade', (upgrade) => {
        const room = rooms.get(socket.roomCode);
        if(!room) return;
        
        const player = room.players.get(socket.id);
        if(!player) return;
        
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
            case 'defense':
                player.defense += 3;
                break;
            case 'attackSpeed':
                player.attackCooldown = Math.max(200, player.attackCooldown - 50);
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
                defense: player.defense
            }
        });
    });
    
    // Respawn
    socket.on('respawn', () => {
        const room = rooms.get(socket.roomCode);
        if(!room) return;
        
        const player = room.players.get(socket.id);
        if(!player) return;
        
        player.isDead = false;
        player.hp = player.maxHp;
        player.x = CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200;
        player.y = CONFIG.MAP_SIZE / 2 + (Math.random() - 0.5) * 200;
        
        // Perder metade dos recursos
        player.wood = Math.floor(player.wood / 2);
        player.stone = Math.floor(player.stone / 2);
        player.crystal = Math.floor(player.crystal / 2);
        
        socket.emit('respawned', player);
    });
    
    // Desconectar
    socket.on('disconnect', () => {
        console.log('❌ Player desconectado:', socket.id);
        
        if(socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if(room) {
                room.players.delete(socket.id);
                
                // Remover construções do player
                room.buildings = room.buildings.filter(b => b.owner !== socket.id);
                
                // Notificar outros
                io.to(socket.roomCode).emit('playerLeft', socket.id);
                
                // Deletar sala se vazia
                if(room.players.size === 0) {
                    rooms.delete(socket.roomCode);
                    console.log('🗑️ Sala deletada:', socket.roomCode);
                }
            }
        }
    });
});

// ============ GAME LOOP ============
setInterval(() => {
    const now = Date.now();
    
    rooms.forEach((room, roomCode) => {
        // Respawn de recursos
        room.resources.forEach(resource => {
            if(resource.depleted && now >= resource.respawnAt) {
                resource.depleted = false;
                resource.hp = resource.maxHp;
                io.to(roomCode).emit('resourceRespawned', resource.id);
            }
        });
        
        // Spawn de inimigos
        const spawnRate = Math.max(2000, CONFIG.ENEMY_BASE_SPAWN - room.wave * 300);
        if(now - room.lastEnemySpawn > spawnRate && room.enemies.length < CONFIG.MAX_ENEMIES) {
            room.lastEnemySpawn = now;
            
            // Spawn em bioma aleatório
            const biomes = Object.keys(BIOMES);
            const biome = biomes[Math.floor(Math.random() * biomes.length)];
            room.enemies.push(createEnemy(room.wave, biome));
        }
        
        // Sistema de waves
        if(now - room.lastWaveTime > CONFIG.WAVE_DURATION) {
            room.lastWaveTime = now;
            room.wave++;
            
            // Spawn extra de inimigos na nova wave
            const extraEnemies = Math.min(room.wave * 2, 15);
            for(let i = 0; i < extraEnemies; i++) {
                setTimeout(() => {
                    if(room.enemies.length < CONFIG.MAX_ENEMIES + 10) {
                        room.enemies.push(createEnemy(room.wave));
                    }
                }, i * 400);
            }
            
            io.to(roomCode).emit('newWave', {
                wave: room.wave,
                message: `WAVE ${room.wave}!`
            });
        }
        
        // IA dos inimigos
        room.enemies.forEach(enemy => {
            // Encontrar player mais próximo
            let closestPlayer = null;
            let closestDist = Infinity;
            
            room.players.forEach((player, playerId) => {
                if(player.isDead) return;
                
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                if(dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                    enemy.target = playerId;
                }
            });
            
            // Perseguir player se estiver perto
            if(closestPlayer && closestDist < 400) {
                enemy.state = 'chase';
                
                const angle = Math.atan2(
                    closestPlayer.y - enemy.y,
                    closestPlayer.x - enemy.x
                );
                
                enemy.x += Math.cos(angle) * enemy.speed;
                enemy.y += Math.sin(angle) * enemy.speed;
                
                // Manter dentro do mapa
                enemy.x = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, enemy.x));
                enemy.y = Math.max(20, Math.min(CONFIG.MAP_SIZE - 20, enemy.y));
                
                // Atacar se perto o suficiente
                if(closestDist < 35 && now - enemy.lastAttack > enemy.attackRate) {
                    enemy.lastAttack = now;
                    enemy.state = 'attack';
                    
                    const actualDamage = Math.max(1, enemy.damage - closestPlayer.defense);
                    closestPlayer.hp -= actualDamage;
                    
                    io.to(roomCode).emit('hitEffect', {
                        x: closestPlayer.x,
                        y: closestPlayer.y,
                        damage: actualDamage,
                        crit: false,
                        type: 'player'
                    });
                    
                    if(closestPlayer.hp <= 0) {
                        closestPlayer.hp = 0;
                        closestPlayer.isDead = true;
                        io.to(roomCode).emit('playerDied', enemy.target);
                    }
                }
                
                // Falar frases ocasionalmente
                if(now - enemy.lastSpeak > 8000 && Math.random() < 0.02) {
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
                if(Math.random() < 0.01) {
                    enemy.x += (Math.random() - 0.5) * 30;
                    enemy.y += (Math.random() - 0.5) * 30;
                }
            }
        });
        
        // Dano de espinhos
        room.buildings.forEach(building => {
            if(building.type === 'spikes') {
                room.enemies.forEach(enemy => {
                    const dist = Math.hypot(enemy.x - building.x, enemy.y - building.y);
                    if(dist < 40) {
                        enemy.hp -= 2;
                        if(enemy.hp <= 0) {
                            room.enemies = room.enemies.filter(e => e.id !== enemy.id);
                        }
                    }
                });
            }
        });
        
        // Torretas automáticas
        room.buildings.forEach(building => {
            if((building.type === 'turret' || building.type === 'tower') && now - building.lastShot > 800) {
                const nearbyEnemy = room.enemies.find(e => {
                    const dist = Math.hypot(e.x - building.x, e.y - building.y);
                    return dist < building.range;
                });
                
                if(nearbyEnemy) {
                    building.lastShot = now;
                    nearbyEnemy.hp -= building.damage;
                    
                    io.to(roomCode).emit('turretShot', {
                        from: { x: building.x, y: building.y },
                        to: { x: nearbyEnemy.x, y: nearbyEnemy.y }
                    });
                    
                    if(nearbyEnemy.hp <= 0) {
                        // Drop orbs
                        for(let i = 0; i < 2; i++) {
                            room.orbs.push({
                                x: nearbyEnemy.x + (Math.random() - 0.5) * 30,
                                y: nearbyEnemy.y + (Math.random() - 0.5) * 30,
                                value: Math.floor(nearbyEnemy.xp / 4)
                            });
                        }
                        room.enemies = room.enemies.filter(e => e.id !== nearbyEnemy.id);
                    }
                }
            }
        });
        
        // Converter players Map para objeto para enviar
        const playersObj = {};
        room.players.forEach((player, id) => {
            playersObj[id] = player;
        });
        
        // Enviar estado do jogo
        io.to(roomCode).emit('gameState', {
            players: playersObj,
            enemies: room.enemies,
            resources: room.resources.filter(r => !r.depleted),
            buildings: room.buildings,
            orbs: room.orbs,
            wave: room.wave
        });
    });
}, 1000 / 30); // 30 FPS para o servidor

// ============ INICIAR SERVIDOR ============
server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║  🎮 RPG LEGENDS - MIKU EDITION V9     ║');
    console.log('║  ✅ Servidor rodando na porta ' + PORT + '     ║');
    console.log('║  💙 Pronto para jogar!                ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
});
