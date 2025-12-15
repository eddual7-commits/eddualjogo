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

// ============ CONFIGURAÇÕES ============
const CONFIG = {
    MAP_SIZE: 3200,
    TILE_SIZE: 100,
    PLAYER_SPEED: 4,
    ATTACK_COOLDOWN: 400,
    ENEMY_SPAWN_RATE: 4000,
    MAX_ENEMIES: 40,
    WAVE_DURATION: 90000
};

// ============ BIOMAS ============
const BIOMES = {
    forest: {
        name: 'Floresta',
        color: '#1a472a',
        enemies: ['slime', 'goblin', 'wolf'],
        resources: ['tree', 'bush', 'mushroom'],
        dropBonus: { wood: 2, food: 1 }
    },
    desert: {
        name: 'Deserto',
        color: '#c2a060',
        enemies: ['scorpion', 'mummy', 'sandworm'],
        resources: ['cactus', 'fossil', 'oasis'],
        dropBonus: { stone: 2, crystal: 1 }
    },
    snow: {
        name: 'Neve',
        color: '#a8c8d8',
        enemies: ['iceslime', 'yeti', 'frostbat'],
        resources: ['pinetree', 'icepatch', 'snowpile'],
        dropBonus: { crystal: 2, food: 1 }
    },
    volcanic: {
        name: 'Vulcânico',
        color: '#4a1c1c',
        enemies: ['lavaslime', 'demon', 'fireelemental'],
        resources: ['obsidian', 'magmarock', 'ashpile'],
        dropBonus: { stone: 3, crystal: 2 }
    },
    swamp: {
        name: 'Pântano',
        color: '#2d3d2d',
        enemies: ['toad', 'ghost', 'witch'],
        resources: ['deadtree', 'lilypad', 'mudpile'],
        dropBonus: { wood: 1, food: 2 }
    }
};

// ============ STATS DOS INIMIGOS ============
const ENEMY_STATS = {
    slime: { hp: 25, damage: 5, speed: 1.2, xp: 10, attackType: 'melee', color: '#2ECC71' },
    goblin: { hp: 40, damage: 8, speed: 2, xp: 20, attackType: 'melee', color: '#27AE60' },
    wolf: { hp: 35, damage: 10, speed: 2.5, xp: 25, attackType: 'dash', color: '#5D6D7E' },
    scorpion: { hp: 30, damage: 12, speed: 1.8, xp: 15, attackType: 'poison', color: '#D35400' },
    mummy: { hp: 60, damage: 10, speed: 1, xp: 30, attackType: 'curse', color: '#BDC3C7' },
    sandworm: { hp: 80, damage: 15, speed: 0.8, xp: 50, attackType: 'burrow', color: '#E67E22' },
    iceslime: { hp: 30, damage: 6, speed: 1, xp: 12, attackType: 'freeze', color: '#85C1E9' },
    yeti: { hp: 100, damage: 18, speed: 1.2, xp: 60, attackType: 'slam', color: '#ECF0F1' },
    frostbat: { hp: 20, damage: 8, speed: 3, xp: 18, attackType: 'swoop', color: '#AED6F1' },
    lavaslime: { hp: 35, damage: 10, speed: 1.5, xp: 20, attackType: 'burn', color: '#E74C3C' },
    demon: { hp: 90, damage: 20, speed: 1.5, xp: 70, attackType: 'fireball', color: '#C0392B' },
    fireelemental: { hp: 70, damage: 15, speed: 1.8, xp: 55, attackType: 'explosion', color: '#F39C12' },
    toad: { hp: 25, damage: 7, speed: 1.5, xp: 12, attackType: 'tongue', color: '#1E8449' },
    ghost: { hp: 40, damage: 12, speed: 2, xp: 30, attackType: 'phase', color: '#9B59B6' },
    witch: { hp: 50, damage: 15, speed: 1.2, xp: 45, attackType: 'magic', color: '#8E44AD' }
};

// ============ FRASES DOS INIMIGOS ============
const ENEMY_QUOTES = {
    slime: ["Blurp!", "Gosmento~", "*ploft*", "Gelatina!"],
    goblin: ["Hehe! Tesouro!", "Pega ele!", "Meu ouro!", "Grrr!"],
    wolf: ["*Uivo*", "Arrrr!", "*Rosna*", "Caça!"],
    scorpion: ["*Clique clique*", "Veneno!", "Picada!", "*Tss*"],
    demon: ["QUEIME!", "Sua alma!", "INFERNO!", "MORRA!"],
    ghost: ["Buuu~", "Venha...", "Frio...", "Eternidade..."],
    yeti: ["ROAAAAR!", "*Bate no peito*", "GELO!", "ESMAGAR!"],
    witch: ["Hehehe~", "Magia negra!", "Caldeirão!", "Maldição!"],
    mummy: ["...", "Tumba...", "Maldição!", "Eterno..."],
    sandworm: ["*TREMOR*", "AREIA!", "*emerge*"],
    iceslime: ["Gelo~", "*cristaliza*", "Frio!"],
    frostbat: ["*screech*", "Asas!", "*voa*"],
    lavaslime: ["Queima!", "*borbulha*", "Lava!"],
    fireelemental: ["FOGO!", "*crackle*", "CHAMAS!"],
    toad: ["Croac!", "*língua*", "Pântano!"],
    default: ["...", "!", "?"]
};

// ============ CUSTOS DE CONSTRUÇÃO ============
const BUILD_COSTS = {
    wall: { wood: 8, stone: 4, crystal: 0, hp: 150 },
    turret: { wood: 15, stone: 10, crystal: 3, hp: 100 },
    campfire: { wood: 12, stone: 3, crystal: 0, hp: 80 },
    spikes: { wood: 5, stone: 8, crystal: 0, hp: 60 },
    healpad: { wood: 10, stone: 5, crystal: 5, hp: 100 }
};

// ============ CORES DOS PLAYERS ============
const PLAYER_COLORS = [
    { hair: '#39C5BB', accent: '#00D4AA', name: 'Miku' },
    { hair: '#FFB6C1', accent: '#FF69B4', name: 'Sakura' },
    { hair: '#FFD700', accent: '#FFA500', name: 'Rin' },
    { hair: '#9370DB', accent: '#8A2BE2', name: 'Yukari' },
    { hair: '#87CEEB', accent: '#4169E1', name: 'Kaito' },
    { hair: '#98FB98', accent: '#32CD32', name: 'Gumi' },
    { hair: '#FF6347', accent: '#DC143C', name: 'Meiko' },
    { hair: '#20B2AA', accent: '#008B8B', name: 'Luka' }
];

// ============ ARMAZENAMENTO ============
var rooms = {};
var playerColorIndex = 0;

// ============ FUNÇÕES AUXILIARES ============
function generateRoomCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function getBiomeAt(x, y) {
    var biomeSize = CONFIG.MAP_SIZE / 3;
    var bx = Math.floor(x / biomeSize);
    var by = Math.floor(y / biomeSize);

    var biomeMap = [
        ['forest', 'snow', 'forest'],
        ['swamp', 'forest', 'desert'],
        ['volcanic', 'desert', 'volcanic']
    ];

    if (by < 0) by = 0;
    if (by > 2) by = 2;
    if (bx < 0) bx = 0;
    if (bx > 2) bx = 2;

    return biomeMap[by][bx];
}

function getNextPlayerColor() {
    var color = PLAYER_COLORS[playerColorIndex % PLAYER_COLORS.length];
    playerColorIndex++;
    return {
        hair: color.hair,
        accent: color.accent,
        name: color.name
    };
}

function createPlayer(name) {
    var colorData = getNextPlayerColor();

    return {
        name: name || colorData.name,
        x: CONFIG.MAP_SIZE / 2,
        y: CONFIG.MAP_SIZE / 2,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        level: 1,
        xp: 0,
        nextXp: 100,
        wood: 0,
        stone: 0,
        crystal: 0,
        food: 5,
        speed: CONFIG.PLAYER_SPEED,
        damage: 15,
        defense: 0,
        state: 'idle',
        facing: 1,
        animFrame: 0,
        attackCooldown: 0,
        invincible: 0,
        color: colorData,
        kills: 0,
        upgrades: []
    };
}

function generateResources() {
    var resources = [];

    for (var i = 0; i < 150; i++) {
        var x = 100 + Math.random() * (CONFIG.MAP_SIZE - 200);
        var y = 100 + Math.random() * (CONFIG.MAP_SIZE - 200);
        var biome = getBiomeAt(x, y);
        var biomeData = BIOMES[biome];

        var types = biomeData.resources;
        var type = types[Math.floor(Math.random() * types.length)];

        resources.push({
            id: 'res_' + i + '_' + Date.now(),
            type: type,
            biome: biome,
            x: x,
            y: y,
            hp: 40,
            maxHp: 40,
            depleted: false,
            respawnTime: 0
        });
    }

    return resources;
}

function createEnemy(room) {
    var x = 100 + Math.random() * (CONFIG.MAP_SIZE - 200);
    var y = 100 + Math.random() * (CONFIG.MAP_SIZE - 200);
    var biome = getBiomeAt(x, y);
    var biomeData = BIOMES[biome];

    var types = biomeData.enemies;
    var type = types[Math.floor(Math.random() * types.length)];
    var stats = ENEMY_STATS[type];

    if (!stats) return null;

    var waveMultiplier = 1 + (room.wave - 1) * 0.15;
    var isBoss = Math.random() < 0.05 + room.wave * 0.02;

    return {
        id: 'enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: type,
        biome: biome,
        x: x,
        y: y,
        hp: Math.floor(stats.hp * waveMultiplier * (isBoss ? 4 : 1)),
        maxHp: Math.floor(stats.hp * waveMultiplier * (isBoss ? 4 : 1)),
        damage: Math.floor(stats.damage * waveMultiplier * (isBoss ? 1.5 : 1)),
        speed: stats.speed * (isBoss ? 0.8 : 1),
        xp: Math.floor(stats.xp * waveMultiplier * (isBoss ? 5 : 1)),
        attackType: stats.attackType,
        color: stats.color,
        isBoss: isBoss,
        target: null,
        attackCooldown: 0,
        specialCooldown: 0,
        state: 'wander',
        wanderAngle: Math.random() * Math.PI * 2,
        lastSpeak: 0,
        stunned: 0
    };
}

function getResourceDrop(resource) {
    var biomeData = BIOMES[resource.biome];
    var drops = { wood: 0, stone: 0, crystal: 0, food: 0 };

    switch (resource.type) {
        case 'tree':
        case 'pinetree':
        case 'deadtree':
            drops.wood = 4 + Math.floor(Math.random() * 3);
            if (Math.random() < 0.2) drops.food = 1;
            break;
        case 'bush':
        case 'cactus':
            drops.food = 2 + Math.floor(Math.random() * 2);
            drops.wood = 1;
            break;
        case 'fossil':
        case 'obsidian':
        case 'magmarock':
            drops.stone = 3 + Math.floor(Math.random() * 3);
            if (Math.random() < 0.15) drops.crystal = 1;
            break;
        case 'icepatch':
            drops.crystal = 2 + Math.floor(Math.random() * 2);
            break;
        case 'mushroom':
        case 'lilypad':
        case 'oasis':
            drops.food = 3 + Math.floor(Math.random() * 2);
            break;
        case 'snowpile':
        case 'ashpile':
        case 'mudpile':
            drops.stone = 1 + Math.floor(Math.random() * 2);
            break;
        default:
            drops.wood = 2;
            drops.stone = 1;
    }

    if (biomeData && biomeData.dropBonus) {
        for (var key in biomeData.dropBonus) {
            if (drops[key]) {
                drops[key] = Math.floor(drops[key] * (1 + biomeData.dropBonus[key] * 0.2));
            }
        }
    }

    return drops;
}

// ============ SOCKET.IO ============
io.on('connection', function(socket) {
    console.log('🎮 Player conectado:', socket.id);

    // Criar sala
    socket.on('createRoom', function(playerName) {
        var roomCode = generateRoomCode();

        console.log('📍 Criando sala:', roomCode);

        rooms[roomCode] = {
            code: roomCode,
            players: {},
            enemies: [],
            resources: generateResources(),
            buildings: [],
            projectiles: [],
            orbs: [],
            effects: [],
            wave: 1,
            waveTimer: Date.now(),
            enemySpawnTimer: Date.now(),
            gameTime: 0
        };

        rooms[roomCode].players[socket.id] = createPlayer(playerName);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('roomJoined', {
            roomCode: roomCode,
            playerId: socket.id,
            mapSize: CONFIG.MAP_SIZE,
            biomes: BIOMES,
            buildCosts: BUILD_COSTS
        });

        console.log('✅ Sala criada com sucesso:', roomCode);
    });

    // Entrar em sala existente
    socket.on('joinRoom', function(data) {
        var roomCode = data.code.toUpperCase().trim();

        console.log('🚪 Tentando entrar na sala:', roomCode);

        if (rooms[roomCode]) {
            rooms[roomCode].players[socket.id] = createPlayer(data.name);
            socket.join(roomCode);
            socket.roomCode = roomCode;

            socket.emit('roomJoined', {
                roomCode: roomCode,
                playerId: socket.id,
                mapSize: CONFIG.MAP_SIZE,
                biomes: BIOMES,
                buildCosts: BUILD_COSTS
            });

            socket.to(roomCode).emit('playerJoined', {
                id: socket.id,
                name: data.name
            });

            console.log('✅ Player entrou na sala:', roomCode);
        } else {
            socket.emit('roomError', 'Sala não encontrada!');
            console.log('❌ Sala não encontrada:', roomCode);
        }
    });

    // Atualização do player
    socket.on('playerUpdate', function(data) {
        var room = rooms[socket.roomCode];
        if (!room || !room.players[socket.id]) return;

        var player = room.players[socket.id];

        if (typeof data.x === 'number' && typeof data.y === 'number') {
            player.x = Math.max(30, Math.min(CONFIG.MAP_SIZE - 30, data.x));
            player.y = Math.max(30, Math.min(CONFIG.MAP_SIZE - 30, data.y));
        }

        if (data.state) player.state = data.state;
        if (typeof data.facing === 'number') player.facing = data.facing;
        if (typeof data.animFrame === 'number') player.animFrame = data.animFrame;
    });

    // Ataque do player
    socket.on('playerAttack', function(data) {
        var room = rooms[socket.roomCode];
        if (!room || !room.players[socket.id]) return;

        var player = room.players[socket.id];
        if (player.attackCooldown > 0 || player.hp <= 0) return;

        player.attackCooldown = CONFIG.ATTACK_COOLDOWN;
        player.state = 'attack';

        var angle = data.angle || 0;
        var attackRange = 80;
        var attackArc = 0.8;

        // Atacar inimigos
        for (var i = 0; i < room.enemies.length; i++) {
            var enemy = room.enemies[i];
            if (enemy.hp <= 0) continue;

            var dx = enemy.x - player.x;
            var dy = enemy.y - player.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var angleToEnemy = Math.atan2(dy, dx);

            var angleDiff = Math.abs(angle - angleToEnemy);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            if (dist < attackRange && angleDiff < attackArc) {
                var isCrit = Math.random() < 0.15;
                var damage = Math.floor(player.damage * (1 + player.level * 0.08) * (isCrit ? 2 : 1));

                enemy.hp -= damage;
                enemy.stunned = 200;

                var knockback = 15;
                enemy.x += Math.cos(angleToEnemy) * knockback;
                enemy.y += Math.sin(angleToEnemy) * knockback;

                room.effects.push({
                    type: 'hit',
                    x: enemy.x,
                    y: enemy.y,
                    damage: damage,
                    crit: isCrit,
                    life: 30
                });

                if (enemy.hp <= 0) {
                    player.kills++;

                    var orbCount = enemy.isBoss ? 8 : 4;
                    for (var j = 0; j < orbCount; j++) {
                        room.orbs.push({
                            id: 'orb_' + Date.now() + '_' + j,
                            x: enemy.x + (Math.random() - 0.5) * 40,
                            y: enemy.y + (Math.random() - 0.5) * 40,
                            value: Math.floor(enemy.xp / orbCount),
                            life: 600
                        });
                    }

                    if (Math.random() < 0.25) {
                        player.food++;
                    }

                    room.effects.push({
                        type: 'death',
                        x: enemy.x,
                        y: enemy.y,
                        color: enemy.color,
                        life: 40
                    });
                }
            }
        }

        // Atacar recursos
        for (var i = 0; i < room.resources.length; i++) {
            var resource = room.resources[i];
            if (resource.depleted) continue;

            var dist = Math.sqrt(
                Math.pow(resource.x - player.x, 2) + 
                Math.pow(resource.y - player.y, 2)
            );

            if (dist < 70) {
                resource.hp -= 12;

                room.effects.push({
                    type: 'resourceHit',
                    x: resource.x,
                    y: resource.y,
                    life: 15
                });

                if (resource.hp <= 0) {
                    resource.depleted = true;
                    resource.respawnTime = Date.now() + 30000;

                    var drops = getResourceDrop(resource);
                    player.wood += drops.wood;
                    player.stone += drops.stone;
                    player.crystal += drops.crystal;
                    player.food += drops.food;

                    room.effects.push({
                        type: 'resourceDrop',
                        x: resource.x,
                        y: resource.y,
                        drops: drops,
                        life: 40
                    });
                }
            }
        }
    });

    // Construir
    socket.on('build', function(data) {
        var room = rooms[socket.roomCode];
        if (!room || !room.players[socket.id]) return;

        var player = room.players[socket.id];
        var cost = BUILD_COSTS[data.type];

        if (!cost) return;

        if (player.wood >= cost.wood &&
            player.stone >= cost.stone &&
            player.crystal >= cost.crystal) {

            var tooClose = false;
            for (var i = 0; i < room.buildings.length; i++) {
                var b = room.buildings[i];
                var dist = Math.sqrt(Math.pow(b.x - data.x, 2) + Math.pow(b.y - data.y, 2));
                if (dist < 50) {
                    tooClose = true;
                    break;
                }
            }

            if (tooClose) {
                socket.emit('buildError', 'Muito perto de outra construção!');
                return;
            }

            player.wood -= cost.wood;
            player.stone -= cost.stone;
            player.crystal -= cost.crystal;

            room.buildings.push({
                id: 'build_' + Date.now(),
                type: data.type,
                x: data.x || player.x,
                y: data.y || player.y,
                hp: cost.hp,
                maxHp: cost.hp,
                owner: socket.id,
                lastAction: 0
            });

            socket.emit('buildSuccess', data.type);
        } else {
            socket.emit('buildError', 'Recursos insuficientes!');
        }
    });

    // Usar comida
    socket.on('useFood', function() {
        var room = rooms[socket.roomCode];
        if (!room || !room.players[socket.id]) return;

        var player = room.players[socket.id];

        if (player.food > 0 && player.hp < player.maxHp) {
            player.food--;
            player.hp = Math.min(player.maxHp, player.hp + 35);

            room.effects.push({
                type: 'heal',
                x: player.x,
                y: player.y,
                life: 30
            });
        }
    });

    // Escolher upgrade
    socket.on('chooseUpgrade', function(upgrade) {
        var room = rooms[socket.roomCode];
        if (!room || !room.players[socket.id]) return;

        var player = room.players[socket.id];
        player.upgrades.push(upgrade);

        switch (upgrade) {
            case 'damage':
                player.damage += 8;
                break;
            case 'health':
                player.maxHp += 25;
                player.hp = player.maxHp;
                break;
            case 'speed':
                player.speed += 0.8;
                break;
            case 'defense':
                player.defense += 3;
                break;
            case 'lifesteal':
                player.lifesteal = (player.lifesteal || 0) + 0.1;
                break;
            case 'crit':
                player.critChance = (player.critChance || 0.15) + 0.1;
                break;
        }
    });

    // Respawn
    socket.on('respawn', function() {
        var room = rooms[socket.roomCode];
        if (!room || !room.players[socket.id]) return;

        var player = room.players[socket.id];
        player.hp = player.maxHp;
        player.x = CONFIG.MAP_SIZE / 2;
        player.y = CONFIG.MAP_SIZE / 2;
        player.invincible = 3000;

        player.wood = Math.floor(player.wood * 0.5);
        player.stone = Math.floor(player.stone * 0.5);
        player.crystal = Math.floor(player.crystal * 0.3);
    });

    // Desconexão
    socket.on('disconnect', function() {
        console.log('👋 Player desconectado:', socket.id);

        if (socket.roomCode && rooms[socket.roomCode]) {
            delete rooms[socket.roomCode].players[socket.id];

            var newBuildings = [];
            for (var i = 0; i < rooms[socket.roomCode].buildings.length; i++) {
                if (rooms[socket.roomCode].buildings[i].owner !== socket.id) {
                    newBuildings.push(rooms[socket.roomCode].buildings[i]);
                }
            }
            rooms[socket.roomCode].buildings = newBuildings;

            if (Object.keys(rooms[socket.roomCode].players).length === 0) {
                delete rooms[socket.roomCode];
                console.log('🗑️ Sala deletada:', socket.roomCode);
            }
        }
    });
});

// ============ GAME LOOP ============
setInterval(function() {
    var now = Date.now();

    for (var roomCode in rooms) {
        var room = rooms[roomCode];

        room.gameTime += 16;

        // ===== SPAWN DE INIMIGOS =====
        if (now - room.enemySpawnTimer > CONFIG.ENEMY_SPAWN_RATE) {
            room.enemySpawnTimer = now;

            if (room.enemies.length < CONFIG.MAX_ENEMIES) {
                var enemy = createEnemy(room);
                if (enemy) room.enemies.push(enemy);
            }
        }

        // ===== SISTEMA DE WAVES =====
        if (now - room.waveTimer > CONFIG.WAVE_DURATION) {
            room.waveTimer = now;
            room.wave++;

            var spawnCount = 3 + room.wave * 2;
            for (var i = 0; i < spawnCount; i++) {
                (function(index) {
                    setTimeout(function() {
                        if (room.enemies.length < CONFIG.MAX_ENEMIES + 10) {
                            var enemy = createEnemy(room);
                            if (enemy) room.enemies.push(enemy);
                        }
                    }, index * 300);
                })(i);
            }

            io.to(roomCode).emit('waveStart', room.wave);
        }

        // ===== ATUALIZAR PLAYERS =====
        for (var playerId in room.players) {
            var player = room.players[playerId];

            if (player.attackCooldown > 0) player.attackCooldown -= 16;
            if (player.invincible > 0) player.invincible -= 16;

            // Coletar orbs
            var newOrbs = [];
            for (var i = 0; i < room.orbs.length; i++) {
                var orb = room.orbs[i];
                orb.life -= 1;

                if (orb.life <= 0) continue;

                var dist = Math.sqrt(
                    Math.pow(orb.x - player.x, 2) + 
                    Math.pow(orb.y - player.y, 2)
                );

                if (dist < 100) {
                    var angle = Math.atan2(player.y - orb.y, player.x - orb.x);
                    orb.x += Math.cos(angle) * 4;
                    orb.y += Math.sin(angle) * 4;
                }

                if (dist < 25) {
                    player.xp += orb.value;

                    while (player.xp >= player.nextXp) {
                        player.xp -= player.nextXp;
                        player.level++;
                        player.nextXp = Math.floor(player.nextXp * 1.4);
                        player.maxHp += 15;
                        player.hp = player.maxHp;
                        player.damage += 2;

                        io.to(playerId).emit('levelUp', player.level);
                    }
                } else {
                    newOrbs.push(orb);
                }
            }
            room.orbs = newOrbs;
        }

        // ===== ATUALIZAR INIMIGOS =====
        var newEnemies = [];
        for (var i = 0; i < room.enemies.length; i++) {
            var enemy = room.enemies[i];

            if (enemy.hp <= 0) continue;

            if (enemy.attackCooldown > 0) enemy.attackCooldown -= 16;
            if (enemy.specialCooldown > 0) enemy.specialCooldown -= 16;
            if (enemy.stunned > 0) {
                enemy.stunned -= 16;
                newEnemies.push(enemy);
                continue;
            }

            var closestPlayer = null;
            var closestDist = Infinity;

            for (var playerId in room.players) {
                var player = room.players[playerId];
                if (player.hp <= 0) continue;

                var dist = Math.sqrt(
                    Math.pow(player.x - enemy.x, 2) + 
                    Math.pow(player.y - enemy.y, 2)
                );

                if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = { id: playerId, x: player.x, y: player.y };
                }
            }

            if (closestPlayer && closestDist < 400) {
                enemy.state = 'chase';
                enemy.target = closestPlayer.id;

                var angle = Math.atan2(
                    closestPlayer.y - enemy.y,
                    closestPlayer.x - enemy.x
                );

                enemy.x += Math.cos(angle) * enemy.speed;
                enemy.y += Math.sin(angle) * enemy.speed;

                enemy.x = Math.max(30, Math.min(CONFIG.MAP_SIZE - 30, enemy.x));
                enemy.y = Math.max(30, Math.min(CONFIG.MAP_SIZE - 30, enemy.y));

                if (closestDist < 45 && enemy.attackCooldown <= 0) {
                    var targetPlayer = room.players[closestPlayer.id];

                    if (targetPlayer && targetPlayer.invincible <= 0) {
                        var finalDamage = Math.max(1, enemy.damage - targetPlayer.defense);
                        targetPlayer.hp -= finalDamage;
                        enemy.attackCooldown = 1000;

                        room.effects.push({
                            type: 'playerHit',
                            x: targetPlayer.x,
                            y: targetPlayer.y,
                            damage: finalDamage,
                            life: 25
                        });

                        if (targetPlayer.hp <= 0) {
                            io.to(closestPlayer.id).emit('playerDied');
                        }
                    }
                }

                if (enemy.specialCooldown <= 0 && closestDist < 200) {
                    if (enemy.attackType === 'fireball' && closestDist > 80) {
                        room.projectiles.push({
                            id: 'proj_' + Date.now(),
                            type: 'fireball',
                            x: enemy.x,
                            y: enemy.y,
                            vx: Math.cos(angle) * 5,
                            vy: Math.sin(angle) * 5,
                            damage: enemy.damage * 1.5,
                            owner: 'enemy',
                            life: 100
                        });
                        enemy.specialCooldown = 3000;
                    } else if (enemy.attackType === 'dash' && closestDist > 60 && closestDist < 150) {
                        enemy.x += Math.cos(angle) * 40;
                        enemy.y += Math.sin(angle) * 40;
                        enemy.specialCooldown = 2000;
                    }
                }

                if (now - enemy.lastSpeak > 6000 && Math.random() < 0.05) {
                    enemy.lastSpeak = now;
                    var quotes = ENEMY_QUOTES[enemy.type] || ENEMY_QUOTES.default;
                    var quote = quotes[Math.floor(Math.random() * quotes.length)];

                    io.to(roomCode).emit('enemySpeak', {
                        x: enemy.x,
                        y: enemy.y - 50,
                        message: quote
                    });
                }
            } else {
                enemy.state = 'wander';

                if (Math.random() < 0.02) {
                    enemy.wanderAngle = Math.random() * Math.PI * 2;
                }

                enemy.x += Math.cos(enemy.wanderAngle) * enemy.speed * 0.3;
                enemy.y += Math.sin(enemy.wanderAngle) * enemy.speed * 0.3;

                enemy.x = Math.max(100, Math.min(CONFIG.MAP_SIZE - 100, enemy.x));
                enemy.y = Math.max(100, Math.min(CONFIG.MAP_SIZE - 100, enemy.y));
            }

            newEnemies.push(enemy);
        }
        room.enemies = newEnemies;

        // ===== ATUALIZAR PROJÉTEIS =====
        var newProjectiles = [];
        for (var i = 0; i < room.projectiles.length; i++) {
            var proj = room.projectiles[i];

            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.life--;

            if (proj.life <= 0) continue;
            if (proj.x < 0 || proj.x > CONFIG.MAP_SIZE) continue;
            if (proj.y < 0 || proj.y > CONFIG.MAP_SIZE) continue;

            var hitPlayer = false;

            if (proj.owner === 'enemy') {
                for (var playerId in room.players) {
                    var player = room.players[playerId];
                    if (player.hp <= 0 || player.invincible > 0) continue;

                    var dist = Math.sqrt(
                        Math.pow(player.x - proj.x, 2) + 
                        Math.pow(player.y - proj.y, 2)
                    );

                    if (dist < 30) {
                        var damage = Math.max(1, proj.damage - player.defense);
                        player.hp -= damage;

                        room.effects.push({
                            type: 'playerHit',
                            x: player.x,
                            y: player.y,
                            damage: damage,
                            life: 25
                        });

                        if (player.hp <= 0) {
                            io.to(playerId).emit('playerDied');
                        }

                        hitPlayer = true;
                        break;
                    }
                }
            }

            if (!hitPlayer) {
                newProjectiles.push(proj);
            }
        }
        room.projectiles = newProjectiles;

        // ===== ATUALIZAR CONSTRUÇÕES =====
        for (var i = 0; i < room.buildings.length; i++) {
            var building = room.buildings[i];

            if (building.type === 'turret' && now - building.lastAction > 500) {
                var target = null;
                for (var j = 0; j < room.enemies.length; j++) {
                    var e = room.enemies[j];
                    var dist = Math.sqrt(
                        Math.pow(e.x - building.x, 2) + 
                        Math.pow(e.y - building.y, 2)
                    );
                    if (dist < 180) {
                        target = e;
                        break;
                    }
                }

                if (target) {
                    building.lastAction = now;
                    target.hp -= 12;

                    room.effects.push({
                        type: 'turretShot',
                        x: building.x,
                        y: building.y,
                        x2: target.x,
                        y2: target.y,
                        life: 10
                    });

                    if (target.hp <= 0) {
                        var owner = room.players[building.owner];
                        if (owner) {
                            owner.xp += target.xp;
                        }
                    }
                }
            }

            if (building.type === 'healpad' && now - building.lastAction > 2000) {
                var owner = room.players[building.owner];
                if (owner) {
                    var dist = Math.sqrt(
                        Math.pow(owner.x - building.x, 2) + 
                        Math.pow(owner.y - building.y, 2)
                    );
                    if (dist < 60 && owner.hp < owner.maxHp) {
                        building.lastAction = now;
                        owner.hp = Math.min(owner.maxHp, owner.hp + 10);
                    }
                }
            }

            if (building.type === 'spikes') {
                for (var j = 0; j < room.enemies.length; j++) {
                    var enemy = room.enemies[j];
                    var dist = Math.sqrt(
                        Math.pow(enemy.x - building.x, 2) + 
                        Math.pow(enemy.y - building.y, 2)
                    );
                    if (dist < 40 && now - building.lastAction > 500) {
                        building.lastAction = now;
                        enemy.hp -= 8;
                        enemy.speed *= 0.7;

                        (function(e) {
                            setTimeout(function() {
                                if (e) e.speed /= 0.7;
                            }, 1000);
                        })(enemy);
                    }
                }
            }
        }

        // ===== RESPAWN DE RECURSOS =====
        for (var i = 0; i < room.resources.length; i++) {
            var resource = room.resources[i];
            if (resource.depleted && now > resource.respawnTime) {
                resource.depleted = false;
                resource.hp = resource.maxHp;
            }
        }

        // ===== LIMPAR EFEITOS =====
        var newEffects = [];
        for (var i = 0; i < room.effects.length; i++) {
            room.effects[i].life--;
            if (room.effects[i].life > 0) {
                newEffects.push(room.effects[i]);
            }
        }
        room.effects = newEffects;

        // ===== ENVIAR ESTADO DO JOGO =====
        var gameState = {
            players: room.players,
            enemies: room.enemies,
            resources: [],
            buildings: room.buildings,
            projectiles: room.projectiles,
            orbs: room.orbs,
            effects: room.effects,
            wave: room.wave,
            gameTime: room.gameTime
        };

        for (var i = 0; i < room.resources.length; i++) {
            var r = room.resources[i];
            gameState.resources.push({
                id: r.id,
                type: r.type,
                biome: r.biome,
                x: r.x,
                y: r.y,
                hp: r.hp,
                maxHp: r.maxHp,
                depleted: r.depleted
            });
        }

        io.to(roomCode).emit('gameState', gameState);
    }
}, 16);

// ============ INICIAR SERVIDOR ============
server.listen(PORT, function() {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🎮 RPG LEGENDS - MIKU EDITION V9     ║');
    console.log('║   ✨ Servidor rodando na porta ' + PORT + '    ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
});
